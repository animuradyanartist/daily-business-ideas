// Scout's own spend ledger (scripts/lib/spend-ledger.mjs): files in the repo, no database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRepoLedger, createLedgerSync, readBudgetConfig, stableUuid, LEDGER_DIR } from '../lib/spend-ledger.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const tmp = (p) => mkdtempSync(join(tmpdir(), p));
const id = (n) => stableUuid(`test|${n}`);
const at = (iso) => () => new Date(iso);

test('config: no allowance unless SCOUT_DFS_MONTHLY_USD_CAP is set; the old shared-cap variable is ignored', () => {
  assert.equal(readBudgetConfig({}).capUsd, null);
  assert.match(readBudgetConfig({}).capError, /SCOUT_DFS_MONTHLY_USD_CAP is not set/);
  assert.equal(readBudgetConfig({ DATAFORSEO_MONTHLY_USD_CAP: '2' }).capUsd, null); // never inherits another product's cap
  assert.equal(readBudgetConfig({ SCOUT_DFS_MONTHLY_USD_CAP: 'lots' }).capUsd, null);
  const c = readBudgetConfig({ SCOUT_DFS_MONTHLY_USD_CAP: '0.5' });
  assert.deepEqual([c.capUsd, c.maxRunUsd, c.maxRequestUsd], [0.5, 0.1, 0.1]);
  assert.equal(readBudgetConfig({ SCOUT_DFS_MONTHLY_USD_CAP: '1', SCOUT_DFS_MAX_REQUEST_USD: '0' }).maxRequestUsd, 0.1);
  assert.equal(stableUuid('a'), stableUuid('a'));
  assert.match(stableUuid('a'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('reserve → settle: cap, per-request limit, idempotency and persistence', async () => {
  const dir = tmp('ledger-');
  const now = at('2026-09-15T08:00:00Z');
  const l = createRepoLedger({ dir, capUsd: 0.1, maxRequestUsd: 0.05, now });
  assert.equal(l.configured, true);
  assert.equal(createRepoLedger({ dir, capUsd: null }).configured, false);
  assert.equal((await createRepoLedger({ dir, capUsd: null }).reserve({ holdId: id(0), estimatedUsd: 0.01, endpoint: 'e' })).reason, 'not_configured');

  assert.equal((await l.reserve({ holdId: id(1), estimatedUsd: 0.06, endpoint: 'e' })).reason, 'request_limit');
  assert.equal((await l.reserve({ holdId: 'x', estimatedUsd: 0.01, endpoint: 'e' })).reason, 'invalid_request');
  const r1 = await l.reserve({ holdId: id(2), estimatedUsd: 0.05, endpoint: 'labs', requestKey: 'k', runId: 'run-1' });
  assert.deepEqual([r1.ok, r1.heldUsd], [true, 0.05]);
  assert.equal((await l.reserve({ holdId: id(2), estimatedUsd: 0.05, endpoint: 'labs' })).duplicate, true); // never reserved twice
  assert.equal((await l.reserve({ holdId: id(3), estimatedUsd: 0.05, endpoint: 'serp' })).ok, true);
  const refused = await l.reserve({ holdId: id(4), estimatedUsd: 0.001, endpoint: 'serp' });
  assert.deepEqual([refused.ok, refused.reason, refused.remainingUsd], [false, 'cap', 0]);
  assert.equal((await l.reserve({ holdId: id(5), estimatedUsd: 0.001, endpoint: 'serp', maxTotalUsd: 0.05 })).reason, 'cap'); // caller may only lower

  assert.equal((await l.settle({ holdId: id(2), actualUsd: 0.0124, payload: { source: 'scout' } })).ok, true);
  assert.equal((await l.settle({ holdId: id(2), actualUsd: 0.0124 })).duplicate, true);
  assert.equal((await l.release({ holdId: id(3), note: 'refused before send' })).ok, true);
  await assert.rejects(() => l.settle({ holdId: id(3), actualUsd: 0.01 }), /hold_released/);
  await assert.rejects(() => l.settle({ holdId: id(99), actualUsd: 0.01 }), /unknown_hold/);

  // A new instance (next run) reads the same files.
  const s = await createRepoLedger({ dir, capUsd: 0.1, now }).status();
  assert.deepEqual([s.month, s.chargedUsd, s.heldUsd, s.remainingUsd], ['2026-09', 0.0124, 0, 0.0876]);
  const file = JSON.parse(readFileSync(join(dir, 'holds', '2026-09', `${id(2)}.json`), 'utf8'));
  assert.deepEqual([file.status, file.estimatedUsd, file.actualUsd, file.runId, file.client], ['charged', 0.05, 0.0124, 'run-1', 'scout']);
});

test('uncertain requests keep counting; only the owner resolver changes them', async () => {
  const dir = tmp('ledger-');
  const l = createRepoLedger({ dir, capUsd: 0.1, now: at('2026-09-15T08:00:00Z') });
  await l.reserve({ holdId: id(1), estimatedUsd: 0.09, endpoint: 'ads' });
  assert.equal((await l.markUncertain({ holdId: id(1), note: 'connection dropped' })).ok, true);
  assert.equal((await l.markUncertain({ holdId: id(1) })).duplicate, true);
  await assert.rejects(() => l.release({ holdId: id(1) }), /not_releasable/);
  assert.equal((await l.reserve({ holdId: id(2), estimatedUsd: 0.02, endpoint: 'serp' })).reason, 'cap');
  assert.equal((await l.resolve({ holdId: id(1), outcome: 'charged', actualUsd: 0.09, note: 'seen in dashboard' })).ok, true);
  assert.equal((await l.resolve({ holdId: id(1), outcome: 'released' })).reason, 'already_settled');
  assert.equal((await l.status()).chargedUsd, 0.09);
});

test('months are separate; history from earlier months never blocks the new month', async () => {
  const dir = tmp('ledger-');
  const sep = createRepoLedger({ dir, capUsd: 0.05, now: at('2026-09-30T23:59:00Z') });
  await sep.reserve({ holdId: id(1), estimatedUsd: 0.05, endpoint: 'labs' });
  await sep.settle({ holdId: id(1), actualUsd: 0.05 });
  const oct = createRepoLedger({ dir, capUsd: 0.05, now: at('2026-10-01T00:01:00Z') });
  assert.equal((await oct.reserve({ holdId: id(2), estimatedUsd: 0.05, endpoint: 'labs' })).ok, true);
  assert.deepEqual(readdirSync(join(dir, 'holds')).sort(), ['2026-09', '2026-10']);
});

test('an unreadable ledger file fails closed instead of reading as zero spend', async () => {
  const dir = tmp('ledger-');
  mkdirSync(join(dir, 'holds', '2026-09'), { recursive: true });
  writeFileSync(join(dir, 'holds', '2026-09', `${id(1)}.json`), '{truncated');
  const l = createRepoLedger({ dir, capUsd: 2, now: at('2026-09-15T08:00:00Z') });
  await assert.rejects(() => l.status(), /unreadable/);
  await assert.rejects(() => l.reserve({ holdId: id(2), estimatedUsd: 0.01, endpoint: 'e' }), /unreadable/);
});

test('concurrent reservations from separate processes never exceed the allowance', { timeout: 60_000 }, async () => {
  const dir = tmp('ledger-race-');
  const worker = join(tmp('ledger-worker-'), 'w.mjs');
  writeFileSync(
    worker,
    `import { createRepoLedger, stableUuid } from ${JSON.stringify(join(here, '..', 'lib', 'spend-ledger.mjs'))};
     const l = createRepoLedger({ dir: process.argv[2], capUsd: 0.1, maxRequestUsd: 0.1, lockWaitMs: 30000 });
     const r = await l.reserve({ holdId: stableUuid('race|' + process.argv[3]), estimatedUsd: 0.03, endpoint: 'serp' });
     console.log(r.ok ? 'ok' : r.reason);`,
  );
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      new Promise((resolve) => {
        const p = spawn(process.execPath, [worker, dir, String(i)]);
        let out = '';
        p.stdout.on('data', (d) => (out += d));
        p.on('close', () => resolve(out.trim()));
      }),
    ),
  );
  assert.equal(results.filter((r) => r === 'ok').length, 3); // 3 × $0.03 fits $0.10; a 4th would not
  assert.equal(results.filter((r) => r === 'cap').length, 9);
  const month = new Date().toISOString().slice(0, 7);
  assert.equal(readdirSync(join(dir, 'holds', month)).length, 3);
});

test('ledger sync: live spending needs a checkout whose ledger matches the remote branch', async () => {
  const git = (cwd, ...args) => {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  const root = tmp('ledger-git-');
  const origin = join(root, 'origin.git');
  git(root, 'init', '--bare', '-b', 'main', origin);
  const clone = (name) => {
    const d = join(root, name);
    git(root, 'clone', '-q', origin, d);
    git(d, 'config', 'user.email', 't@example.com');
    git(d, 'config', 'user.name', 't');
    return d;
  };
  const a = clone('a');
  git(a, 'checkout', '-q', '-b', 'main');
  mkdirSync(join(a, LEDGER_DIR, 'holds', '2026-09'), { recursive: true });
  writeFileSync(join(a, LEDGER_DIR, 'holds', '2026-09', 'seed.json'), '{}\n');
  git(a, 'add', '-A');
  git(a, 'commit', '-qm', 'seed');
  git(a, 'push', '-q', 'origin', 'main');
  const b = clone('b');

  assert.deepEqual(await createLedgerSync({ cwd: b }).check(), { ok: true, reason: null, branch: 'main' });

  // Another run (checkout a) records spend and pushes it: b is now stale.
  writeFileSync(join(a, LEDGER_DIR, 'holds', '2026-09', 'charge.json'), '{}\n');
  git(a, 'add', '-A');
  git(a, 'commit', '-qm', 'spend');
  git(a, 'push', '-q', 'origin', 'main');
  const stale = await createLedgerSync({ cwd: b }).check();
  assert.equal(stale.ok, false);
  assert.match(stale.reason, /differs from origin\/main/);
  git(b, 'pull', '-q', 'origin', 'main');
  assert.equal((await createLedgerSync({ cwd: b }).check()).ok, true);

  // Uncommitted ledger history from an earlier local run must be pushed first.
  writeFileSync(join(b, LEDGER_DIR, 'holds', '2026-09', 'local.json'), '{}\n');
  assert.match((await createLedgerSync({ cwd: b }).check()).reason, /uncommitted changes/);

  // Not a git checkout at all.
  assert.match((await createLedgerSync({ cwd: tmp('not-git-') }).check()).reason, /not a git checkout/);
});
