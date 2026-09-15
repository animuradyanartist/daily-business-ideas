// Scout's own spend ledger (scripts/lib/spend-ledger.mjs): a branch of the GitHub repo.
// The "GitHub" here is a local bare repository; every clone stands for a separate runner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGitLedger, readBudgetConfig, stableUuid } from '../lib/spend-ledger.mjs';
import { ledgerRemote, git } from './fixtures/ledger-remote.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const LIB = JSON.stringify(join(here, '..', 'lib', 'spend-ledger.mjs'));
const id = (n) => stableUuid(`test|${n}`);
const at = (iso) => () => new Date(iso);
const ledgerAt = (cwd, opts) => createGitLedger({ cwd, ...opts });

function worker(source) {
  const file = join(mkdtempSync(join(tmpdir(), 'scout-ledger-worker-')), 'w.mjs');
  writeFileSync(file, source);
  return file;
}
const runNode = (file, args) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, [file, ...args]);
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code, signal) => resolve({ code, signal, out: out.trim(), err: err.trim() }));
  });

test('config: no allowance unless SCOUT_DFS_MONTHLY_USD_CAP is set; the old shared-cap variable is ignored', () => {
  assert.equal(readBudgetConfig({}).capUsd, null);
  assert.match(readBudgetConfig({}).capError, /SCOUT_DFS_MONTHLY_USD_CAP is not set/);
  assert.equal(readBudgetConfig({ DATAFORSEO_MONTHLY_USD_CAP: '2' }).capUsd, null); // never inherits another product's cap
  assert.equal(readBudgetConfig({ SCOUT_DFS_MONTHLY_USD_CAP: 'lots' }).capUsd, null);
  const c = readBudgetConfig({ SCOUT_DFS_MONTHLY_USD_CAP: '0.5' });
  assert.deepEqual([c.capUsd, c.maxRunUsd, c.maxRequestUsd, c.ledgerRemote, c.ledgerBranch], [0.5, 0.1, 0.1, 'origin', 'scout-spend-ledger']);
  assert.equal(readBudgetConfig({ SCOUT_DFS_MONTHLY_USD_CAP: '1', SCOUT_DFS_MAX_REQUEST_USD: '0' }).maxRequestUsd, 0.1);
  assert.match(stableUuid('a'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('a reservation is on GitHub (the remote) before reserve() returns ok — not only in the local checkout', async () => {
  const r = ledgerRemote();
  const runner = r.clone();
  const l = ledgerAt(runner, { capUsd: 0.1, now: at('2026-09-15T08:00:00Z') });
  const res = await l.reserve({ holdId: id(1), estimatedUsd: 0.0143, endpoint: 'dataforseo_labs/google/keyword_overview/live', runId: 'run-1' });
  assert.equal(res.ok, true);
  const onRemote = r.files()[`holds/2026-09/${id(1)}.json`];
  assert.deepEqual([onRemote.status, onRemote.estimatedUsd, onRemote.runId, onRemote.client], ['reserved', 0.0143, 'run-1', 'scout']);
  assert.equal(git(runner, 'status', '--porcelain'), ''); // nothing written to the working tree
});

test('reserve → settle: cap, per-request limit, idempotency, and another runner sees it all', async () => {
  const r = ledgerRemote();
  const now = at('2026-09-15T08:00:00Z');
  const a = ledgerAt(r.clone(), { capUsd: 0.1, maxRequestUsd: 0.05, now });
  assert.equal(ledgerAt(r.clone(), { capUsd: null }).configured, false);
  assert.equal((await ledgerAt(r.clone(), { capUsd: null }).reserve({ holdId: id(0), estimatedUsd: 0.01, endpoint: 'e' })).reason, 'not_configured');
  assert.equal((await a.reserve({ holdId: id(1), estimatedUsd: 0.06, endpoint: 'e' })).reason, 'request_limit');
  assert.equal((await a.reserve({ holdId: 'x', estimatedUsd: 0.01, endpoint: 'e' })).reason, 'invalid_request');
  assert.equal((await a.reserve({ holdId: id(2), estimatedUsd: 0.05, endpoint: 'labs' })).ok, true);
  assert.equal((await a.reserve({ holdId: id(2), estimatedUsd: 0.05, endpoint: 'labs' })).duplicate, true); // never reserved twice

  const b = ledgerAt(r.clone(), { capUsd: 0.1, maxRequestUsd: 0.05, now }); // a different runner
  assert.equal((await b.reserve({ holdId: id(3), estimatedUsd: 0.05, endpoint: 'serp' })).ok, true);
  const refused = await a.reserve({ holdId: id(4), estimatedUsd: 0.001, endpoint: 'serp' });
  assert.deepEqual([refused.ok, refused.reason, refused.heldUsd], [false, 'cap', 0.1]);
  assert.equal((await b.reserve({ holdId: id(5), estimatedUsd: 0.001, endpoint: 'serp', maxTotalUsd: 0.05 })).reason, 'cap'); // caller may only lower

  assert.equal((await a.settle({ holdId: id(2), actualUsd: 0.0124, payload: { source: 'scout' } })).ok, true);
  assert.equal((await b.settle({ holdId: id(2), actualUsd: 0.0124 })).duplicate, true);
  assert.equal((await b.release({ holdId: id(3), note: 'refused before send' })).ok, true);
  await assert.rejects(() => a.settle({ holdId: id(3), actualUsd: 0.01 }), /hold_released/);
  await assert.rejects(() => a.settle({ holdId: id(99), actualUsd: 0.01 }), /unknown_hold/);
  const s = await ledgerAt(r.clone(), { capUsd: 0.1, now }).status();
  assert.deepEqual([s.month, s.chargedUsd, s.heldUsd, s.remainingUsd], ['2026-09', 0.0124, 0, 0.0876]);
  assert.equal(r.files()[`holds/2026-09/${id(2)}.json`].actualUsd, 0.0124);
});

test('fails closed: unreachable remote, missing ledger branch, or an unreadable ledger file → nothing recorded', async () => {
  const r = ledgerRemote();
  const offline = r.clone();
  git(offline, 'remote', 'set-url', 'origin', join(r.root, 'does-not-exist.git'));
  await assert.rejects(() => ledgerAt(offline, { capUsd: 1 }).reserve({ holdId: id(1), estimatedUsd: 0.01, endpoint: 'e' }), /could not reach origin/);

  await assert.rejects(() => ledgerAt(r.clone(), { capUsd: 1, branch: 'no-such-branch' }).reserve({ holdId: id(1), estimatedUsd: 0.01, endpoint: 'e' }), /was not found/);

  const bad = ledgerRemote({ seed: { [`holds/2026-09/${id(9)}.json`]: '{truncated' } });
  const l = ledgerAt(bad.clone(), { capUsd: 2, now: at('2026-09-15T08:00:00Z') });
  await assert.rejects(() => l.status(), /unreadable/);
  await assert.rejects(() => l.reserve({ holdId: id(2), estimatedUsd: 0.01, endpoint: 'e' }), /unreadable/);
  assert.equal(git(bad.origin, 'ls-tree', '-r', '--name-only', bad.branch, 'holds').split('\n').length, 1); // nothing added
});

test('crashed runner: a reservation pushed before the process dies is kept, counted, and becomes uncertain', { timeout: 60_000 }, async () => {
  const r = ledgerRemote();
  const crash = worker(`import { createGitLedger } from ${LIB};
    const l = createGitLedger({ cwd: process.argv[2], capUsd: 0.05, now: () => new Date('2026-09-20T10:00:00Z') });
    const res = await l.reserve({ holdId: process.argv[3], estimatedUsd: 0.04, endpoint: 'serp/google/organic/live/regular', requestKey: 'serp-q1' });
    if (res.ok) process.kill(process.pid, 'SIGKILL'); // dies after reserving, before the paid request settles
    console.log('not reserved', JSON.stringify(res));`);
  const died = await runNode(crash, [r.clone(), id(1)]);
  assert.equal(died.signal, 'SIGKILL', died.out + died.err);
  assert.equal(r.files()[`holds/2026-09/${id(1)}.json`].status, 'reserved'); // survived the crash on GitHub

  // Another runner, 20 minutes later: the stale reservation counts as uncertain and blocks the allowance…
  const later = ledgerAt(r.clone(), { capUsd: 0.05, now: at('2026-09-20T10:20:00Z') });
  const refused = await later.reserve({ holdId: id(2), estimatedUsd: 0.02, endpoint: 'serp' });
  assert.deepEqual([refused.ok, refused.reason, refused.heldUsd], [false, 'cap', 0.04]);
  assert.equal((await later.list('2026-09'))[0].effectiveStatus, 'uncertain');
  // …and the identical request is not sent again automatically (it may have been charged).
  const repeat = await ledgerAt(r.clone(), { capUsd: 1, now: at('2026-09-20T10:20:00Z') }).reserve({ holdId: id(3), estimatedUsd: 0.04, endpoint: 'serp', requestKey: 'serp-q1' });
  assert.deepEqual([repeat.ok, repeat.reason, repeat.holdId], [false, 'uncertain_repeat', id(1)]);
  const optIn = await ledgerAt(r.clone(), { capUsd: 1, now: at('2026-09-20T10:20:00Z') }).reserve({ holdId: id(3), estimatedUsd: 0.04, endpoint: 'serp', requestKey: 'serp-q1', allowUncertainRepeat: true });
  assert.equal(optIn.ok, true);
  await ledgerAt(r.clone(), { capUsd: 1 }).release({ holdId: id(3), note: 'test cleanup' });
  // Only the owner resolves it.
  assert.equal((await later.resolve({ holdId: id(1), outcome: 'charged', actualUsd: 0.002, note: 'seen in dashboard' })).ok, true);
  assert.equal((await later.reserve({ holdId: id(2), estimatedUsd: 0.02, endpoint: 'serp' })).ok, true);
});

test('simultaneous runners never spend the same remaining allowance', { timeout: 120_000 }, async () => {
  const r = ledgerRemote();
  const racer = worker(`import { createGitLedger, stableUuid } from ${LIB};
    const l = createGitLedger({ cwd: process.argv[2], capUsd: 0.1, maxAttempts: 40 });
    const res = await l.reserve({ holdId: stableUuid('race|' + process.argv[3]), estimatedUsd: 0.03, endpoint: 'serp' });
    console.log(res.ok ? 'ok' : res.reason);`);
  // 8 separate runners (own clones) + 4 processes sharing one clone, all at once.
  const shared = r.clone();
  const jobs = [...Array.from({ length: 8 }, (_, i) => runNode(racer, [r.clone(), `sep-${i}`])), ...Array.from({ length: 4 }, (_, i) => runNode(racer, [shared, `shared-${i}`]))];
  const results = await Promise.all(jobs);
  const outcomes = results.map((x) => x.out || x.err);
  assert.equal(outcomes.filter((o) => o === 'ok').length, 3, outcomes.join(' | ')); // 3 × $0.03 fits $0.10; a 4th would not
  assert.equal(outcomes.filter((o) => o === 'cap').length, 9, outcomes.join(' | '));
  const month = new Date().toISOString().slice(0, 7);
  assert.equal(Object.keys(r.files()).filter((p) => p.startsWith(`holds/${month}/`)).length, 3);
});

test('a lost push race is re-checked against the other runner\'s reservation, not retried blindly', async () => {
  const r = ledgerRemote();
  const other = worker(`import { createGitLedger } from ${LIB};
    const l = createGitLedger({ cwd: process.argv[2], capUsd: 0.1, now: () => new Date('2026-09-15T08:00:00Z') });
    console.log(JSON.stringify(await l.reserve({ holdId: process.argv[3], estimatedUsd: 0.08, endpoint: 'labs' })));`);
  const otherClone = r.clone();
  let calls = 0;
  // Runner A reads the tip, then — before A pushes — runner B pushes an $0.08 reservation.
  const a = ledgerAt(r.clone(), {
    capUsd: 0.1,
    now: () => {
      if (calls++ === 0) {
        const b = spawnSync(process.execPath, [other, otherClone, id(1)], { encoding: 'utf8' });
        assert.equal(JSON.parse(b.stdout).ok, true, b.stderr);
      }
      return new Date('2026-09-15T08:00:00Z');
    },
  });
  const res = await a.reserve({ holdId: id(2), estimatedUsd: 0.03, endpoint: 'serp' });
  assert.equal(calls, 2); // decided twice: the first push was rejected
  assert.deepEqual([res.ok, res.reason, res.heldUsd], [false, 'cap', 0.08]);
  assert.deepEqual(Object.keys(r.files()), [`holds/2026-09/${id(1)}.json`]);
});

test('uncertain requests keep counting; months are separate', async () => {
  const r = ledgerRemote();
  const l = ledgerAt(r.clone(), { capUsd: 0.1, now: at('2026-09-30T23:59:00Z') });
  await l.reserve({ holdId: id(1), estimatedUsd: 0.09, endpoint: 'ads' });
  assert.equal((await l.markUncertain({ holdId: id(1), note: 'connection dropped' })).ok, true);
  assert.equal((await l.markUncertain({ holdId: id(1) })).duplicate, true);
  await assert.rejects(() => l.release({ holdId: id(1) }), /not_releasable/);
  assert.equal((await l.reserve({ holdId: id(2), estimatedUsd: 0.02, endpoint: 'serp' })).reason, 'cap');
  const oct = ledgerAt(r.clone(), { capUsd: 0.1, now: at('2026-10-01T00:01:00Z') });
  assert.equal((await oct.reserve({ holdId: id(3), estimatedUsd: 0.02, endpoint: 'serp' })).ok, true);
  assert.deepEqual(Object.keys(r.files()).sort(), [`holds/2026-09/${id(1)}.json`, `holds/2026-10/${id(3)}.json`]);
});

test('replayed updates: a release after expiry still records the unbilled request; refusals are marked permanent', async () => {
  const r = ledgerRemote();
  const t0 = ledgerAt(r.clone(), { capUsd: 0.1, now: at('2026-09-20T10:00:00Z') });
  await t0.reserve({ holdId: id(1), estimatedUsd: 0.05, endpoint: 'labs' });
  await t0.reserve({ holdId: id(2), estimatedUsd: 0.05, endpoint: 'serp' });
  const nextDay = ledgerAt(r.clone(), { capUsd: 0.1, now: at('2026-09-21T09:00:00Z') });
  assert.equal((await nextDay.release({ holdId: id(1), note: 'replayed from outbox: provider refused before billing' })).ok, true);
  assert.equal((await nextDay.status()).heldUsd, 0.05);
  await nextDay.resolve({ holdId: id(2), outcome: 'released', note: 'not in dashboard' });
  const late = await nextDay.settle({ holdId: id(2), actualUsd: 0.002 }).catch((e) => e);
  assert.deepEqual([late.permanent, /hold_released/.test(late.message)], [true, true]);
  const unknown = await nextDay.release({ holdId: id(9) }).catch((e) => e);
  assert.equal(unknown.permanent, true);
  const offline = r.clone();
  git(offline, 'remote', 'set-url', 'origin', join(r.root, 'gone.git'));
  const transport = await ledgerAt(offline, { capUsd: 0.1 }).release({ holdId: id(1) }).catch((e) => e);
  assert.equal(transport.permanent, false); // a connection problem stays in the outbox
});
