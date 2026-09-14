// Shared DataForSEO budget — tested against a REAL Postgres (the functions in
// db/dataforseo_budget.sql). Concurrency is exercised with many separate psql sessions
// racing at once, plus a negative control (a naive read-then-insert reservation) that
// must overspend under the same race — proving the test can detect the failure.
//
// Needs BUDGET_TEST_PSQL, e.g.
//   BUDGET_TEST_PSQL="docker exec -i scout-budget-pg psql -U postgres"      (local)
//   BUDGET_TEST_PSQL="psql postgresql://postgres:postgres@localhost:5432/postgres"  (CI)
// Skipped (reported as skipped, never as passed) when it is not set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PSQL = process.env.BUDGET_TEST_PSQL?.trim().split(/\s+/);
const skip = PSQL ? false : 'BUDGET_TEST_PSQL is not set — real-Postgres budget tests not run';
const SQL_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'dataforseo_budget.sql');

const PROJECT = '11111111-1111-4111-8111-111111111111';
const OTHER_PROJECT = '22222222-2222-4222-8222-222222222222';
const TOKEN_SCOUT = 'scout-test-token-'.padEnd(48, 'x');
const TOKEN_COS = 'career-os-test-token-'.padEnd(48, 'y');
const TOKEN_OTHER = 'other-project-test-token-'.padEnd(48, 'z');
const sha = (t) => createHash('sha256').update(t).digest('hex');

function psql(sql, { db = 'budget_test' } = {}) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = PSQL;
    const p = spawn(cmd, [...args, '-d', db, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(err || `psql exit ${code}`))));
    p.stdin.end(sql);
  });
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rpc = async (fn, ...args) => JSON.parse(await psql(`select ${fn}(${args.map((a) => (a === null ? 'null' : typeof a === 'number' ? a : q(a))).join(', ')});`));
const reserve = (token, amount, { id = randomUUID(), max = null, ttl = 900 } = {}) =>
  rpc('dataforseo_budget_reserve', token, id, amount, 'test/endpoint', 'k', max, ttl).then((r) => ({ ...r, id }));

async function scalar(sql) {
  return psql(sql);
}

// Start every racer, parked on an advisory lock, then release them at the same instant.
async function race(n, sqlFor) {
  const barrier = psql('select pg_advisory_lock(4242); select pg_sleep(4); select pg_advisory_unlock(4242);');
  await new Promise((r) => setTimeout(r, 400));
  const racers = Array.from({ length: n }, (_, i) =>
    psql(`select pg_advisory_lock_shared(4242); select pg_advisory_unlock_shared(4242); ${sqlFor(i)}`),
  );
  const results = await Promise.all(racers);
  await barrier;
  return results.map((out) => out.split('\n').filter(Boolean).at(-1));
}

test('real Postgres budget functions', { skip, timeout: 180_000 }, async (t) => {
  await psql('drop database if exists budget_test;', { db: 'postgres' });
  await psql('create database budget_test;', { db: 'postgres' });
  await psql(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
    end $$;
    create table projects (id uuid primary key);
    -- mirrors supabase/migrations/0015_runtime.sql
    create table runtime_events (
      id uuid primary key default gen_random_uuid(),
      project_id uuid not null references projects(id) on delete cascade,
      type text not null,
      payload jsonb not null default '{}'::jsonb,
      produced_by text not null default 'runtime',
      occurred_at timestamptz not null default now(),
      processed boolean not null default false,
      processed_at timestamptz
    );
    grant usage on schema public to anon, authenticated, service_role;
  `);
  const migration = readFileSync(SQL_FILE, 'utf8');
  await psql(migration);
  await psql(migration); // idempotent: applying twice must not fail

  async function reset() {
    await psql(`
      delete from dataforseo_budget_holds; delete from dataforseo_budget_clients; delete from dataforseo_budget_settings;
      delete from runtime_events; delete from projects;
      insert into projects values ('${PROJECT}'), ('${OTHER_PROJECT}');
      insert into dataforseo_budget_settings values ('${PROJECT}', 2.00), ('${OTHER_PROJECT}', 2.00);
      insert into dataforseo_budget_clients (client_id, project_id, token_sha256, max_request_usd) values
        ('scout', '${PROJECT}', '${sha(TOKEN_SCOUT)}', 0.10),
        ('career-os', '${PROJECT}', '${sha(TOKEN_COS)}', 0.10),
        ('other', '${OTHER_PROJECT}', '${sha(TOKEN_OTHER)}', 0.10);
    `);
  }
  const legacySpend = (usd, when = 'now()') =>
    psql(`insert into runtime_events (project_id, type, payload, produced_by, occurred_at) values ('${PROJECT}', 'dataforseo.spend', jsonb_build_object('cost', ${usd}), 'market-demand', ${when});`);

  await t.test('reserve → settle writes exactly one spend event with the actual cost', async () => {
    await reset();
    const r = await reserve(TOKEN_SCOUT, 0.02);
    assert.equal(r.ok, true);
    const s1 = await rpc('dataforseo_budget_settle', TOKEN_SCOUT, r.id, 0.0162, JSON.stringify({ requested: 9 }));
    const s2 = await rpc('dataforseo_budget_settle', TOKEN_SCOUT, r.id, 0.0162, '{}');
    assert.equal(s1.ok, true);
    assert.equal(s2.duplicate, true);
    const ev = JSON.parse(await scalar(`select json_agg(json_build_object('cost', payload->'cost', 'by', produced_by, 'processed', processed)) from runtime_events`));
    assert.deepEqual(ev, [{ cost: 0.0162, by: 'scout', processed: true }]);
    const st = await rpc('dataforseo_budget_status', TOKEN_COS);
    assert.equal(Number(st.charged_usd), 0.0162);
    assert.equal(Number(st.held_usd), 0);
  });

  await t.test('the cap counts legacy spend rows, open holds and uncertain holds', async () => {
    await reset();
    await legacySpend(1.8);
    const a = await reserve(TOKEN_SCOUT, 0.1);
    assert.equal(a.ok, true);
    await rpc('dataforseo_budget_mark_uncertain', TOKEN_SCOUT, a.id, 'timeout');
    const b = await reserve(TOKEN_COS, 0.09);
    assert.equal(b.ok, true); // 1.8 + 0.1 uncertain + 0.09 = 1.99
    const c = await reserve(TOKEN_COS, 0.02);
    assert.equal(c.ok, false);
    assert.equal(c.reason, 'cap');
    // a previous month's spend does not count this month
    await reset();
    await legacySpend(1.99, "date_trunc('month', now()) - interval '1 day'");
    assert.equal((await reserve(TOKEN_SCOUT, 0.1)).ok, true);
  });

  await t.test('concurrent reservations from two apps cannot exceed the cap', async () => {
    await reset();
    await legacySpend(0.02);
    // 40 sessions × $0.09 race; each holds its transaction open briefly after reserving.
    const results = (
      await race(40, (i) => `begin; select dataforseo_budget_reserve(${q(i % 2 ? TOKEN_SCOUT : TOKEN_COS)}, ${q(randomUUID())}, 0.09, 'race', null, null, 900)::text; select pg_sleep(0.02); commit;`)
    ).map((l) => JSON.parse(l));
    const accepted = results.filter((r) => r.ok).length;
    const held = Number(await scalar(`select coalesce(sum(estimated_usd), 0) from dataforseo_budget_holds where status = 'reserved'`));
    assert.equal(accepted, 22); // floor((2.00 - 0.02) / 0.09)
    assert.ok(0.02 + held <= 2.0, `committed ${0.02 + held} > cap`);
  });

  await t.test('negative control: a naive read-then-insert reservation overspends under the same race', async () => {
    await reset();
    await psql(`
      create or replace function naive_reserve(p_amount numeric) returns boolean language plpgsql as $$
      declare total numeric;
      begin
        select coalesce(sum(estimated_usd), 0) into total from dataforseo_budget_holds where status = 'reserved';
        perform pg_sleep(0.05);
        if total + p_amount > 2.00 then return false; end if;
        insert into dataforseo_budget_holds (id, project_id, client_id, budget_month, status, estimated_usd, endpoint, expires_at)
        values (gen_random_uuid(), '${PROJECT}', 'scout', date_trunc('month', now())::date, 'reserved', p_amount, 'naive', now() + interval '1 hour');
        return true;
      end $$;`);
    const accepted = (await race(40, () => 'select naive_reserve(0.09);')).filter((r) => r === 't').length;
    assert.ok(accepted >= 30, `naive version accepted ${accepted} of 40 — expected clear overspend`);
    console.log(`negative control: naive reservation accepted ${accepted}/40 ($${(accepted * 0.09).toFixed(2)} against a $2.00 cap)`);
    await psql('drop function naive_reserve(numeric);');
  });

  await t.test('a crashed caller\'s expired hold becomes uncertain and keeps counting', async () => {
    await reset();
    await legacySpend(1.9);
    const a = await reserve(TOKEN_SCOUT, 0.08, { ttl: 60 });
    await psql(`update dataforseo_budget_holds set expires_at = now() - interval '1 second' where id = ${q(a.id)};`);
    const b = await reserve(TOKEN_COS, 0.05);
    assert.equal(b.ok, false); // 1.9 + 0.08 still counted
    assert.equal(await scalar(`select status from dataforseo_budget_holds where id = ${q(a.id)}`), 'uncertain');
    // clients cannot release an uncertain hold; only the owner-side resolver can
    const rel = await rpc('dataforseo_budget_release', TOKEN_SCOUT, a.id, 'try');
    assert.equal(rel.reason, 'not_releasable');
    const late = await rpc('dataforseo_budget_settle', TOKEN_SCOUT, a.id, 0.0162, '{}');
    assert.equal(late.ok, true); // the real cost arrived: counted at actual from now on
    assert.equal((await reserve(TOKEN_COS, 0.05)).ok, true);
  });

  await t.test('release only frees a provably-uncharged reservation; settle after release is refused', async () => {
    await reset();
    const a = await reserve(TOKEN_SCOUT, 0.09);
    assert.equal((await rpc('dataforseo_budget_release', TOKEN_SCOUT, a.id, 'refused before send')).ok, true);
    assert.equal((await rpc('dataforseo_budget_settle', TOKEN_SCOUT, a.id, 0.09, '{}')).reason, 'hold_released');
    assert.equal(Number((await rpc('dataforseo_budget_status', TOKEN_SCOUT)).held_usd), 0);
  });

  await t.test('duplicate reservation ids never double-reserve; foreign ids conflict', async () => {
    await reset();
    const id = randomUUID();
    const a = await reserve(TOKEN_SCOUT, 0.05, { id });
    const b = await reserve(TOKEN_SCOUT, 0.05, { id });
    assert.equal(a.ok, true);
    assert.equal(b.duplicate, true);
    assert.equal(await scalar(`select count(*) from dataforseo_budget_holds`), '1');
    assert.equal((await reserve(TOKEN_COS, 0.05, { id })).reason, 'hold_id_conflict');
  });

  await t.test('access: token checks, per-request limit, ceilings can only be lowered, tables closed to anon', async () => {
    await reset();
    assert.equal((await reserve('wrong-token'.padEnd(48, 'q'), 0.01)).reason, 'unauthorized');
    assert.equal((await reserve('short', 0.01)).reason, 'unauthorized');
    assert.equal((await reserve(TOKEN_SCOUT, 0.11)).reason, 'request_limit');
    const a = await reserve(TOKEN_SCOUT, 0.05);
    assert.equal((await rpc('dataforseo_budget_settle', TOKEN_COS, a.id, 0.05, '{}')).reason, 'unknown_hold'); // not its hold
    assert.equal((await rpc('dataforseo_budget_settle', TOKEN_OTHER, a.id, 0.05, '{}')).reason, 'unknown_hold');
    await legacySpend(1.0);
    assert.equal((await reserve(TOKEN_SCOUT, 0.06, { max: 1.05 })).reason, 'cap'); // lowered ceiling (cap − reserve)
    const raised = await reserve(TOKEN_SCOUT, 0.06, { max: 50 });
    assert.equal(raised.ok, true);
    assert.equal(Number(raised.ceiling_usd), 2); // cannot raise above the cap
    await assert.rejects(() => psql('set role anon; select * from dataforseo_budget_holds;'), /permission denied/);
    await assert.rejects(() => psql('set role anon; select dataforseo_budget_admin_resolve(gen_random_uuid(), \'released\');'), /permission denied/);
    const viaAnon = await psql(`set role anon; select dataforseo_budget_status(${q(TOKEN_SCOUT)})->>'ok';`);
    assert.equal(viaAnon, 'true');
  });

  await t.test('owner-side resolver settles an uncertain hold into one spend event', async () => {
    await reset();
    const a = await reserve(TOKEN_SCOUT, 0.09);
    await rpc('dataforseo_budget_mark_uncertain', TOKEN_SCOUT, a.id, 'connection dropped');
    const r = JSON.parse(await psql(`select dataforseo_budget_admin_resolve(${q(a.id)}, 'charged', 0.09, 'seen in dashboard');`));
    assert.equal(r.ok, true);
    assert.equal(await scalar(`select count(*) from runtime_events where id = ${q(a.id)}`), '1');
  });
});
