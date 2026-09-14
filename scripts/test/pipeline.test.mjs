// Offline end-to-end test of the DAILY pipeline wiring: runs the real
// scripts/daily-research.mjs in a temp copy with every network call faked
// (fixtures/fake-network.mjs). Proves integration order, separation of the original
// assessment, idempotency and cost gating — NOT a live provider test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const scripts = join(here, '..');
const TODAY = new Date().toISOString().slice(0, 10);

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'scout-pipeline-'));
  cpSync(scripts, join(dir, 'scripts'), { recursive: true, filter: (p) => !p.includes(`${join('scripts', 'test')}`) });
  mkdirSync(join(dir, 'ideas'));
  return dir;
}

function runDaily(dir, env) {
  const netLog = join(dir, `net-${process.hrtime.bigint()}.log`);
  const r = spawnSync(process.execPath, ['--import', join(here, 'fixtures', 'fake-network.mjs'), 'scripts/daily-research.mjs'], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      GEMINI_API_KEY: 'fake',
      DATAFORSEO_LOGIN: 'fake',
      DATAFORSEO_PASSWORD: 'fake',
      DATAFORSEO_MONTHLY_USD_CAP: '2',
      DATAFORSEO_BUDGET_URL: 'https://budget.fake',
      DATAFORSEO_BUDGET_ANON_KEY: 'fake-anon',
      DATAFORSEO_BUDGET_TOKEN: 'fake-client-token-0123456789abcdef',
      FAKE_NET_LOG: netLog,
      ...env,
    },
  });
  const calls = existsSync(netLog) ? readFileSync(netLog, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { ...r, calls };
}

const paidCalls = (calls) => calls.filter((c) => c.url.startsWith('https://api.dataforseo.com') && c.method === 'POST');

test('live mode: enrichment runs after the scan, stays separate, and a re-run pays nothing', { timeout: 120_000 }, () => {
  const dir = sandbox();
  const first = runDaily(dir, { SCOUT_DFS_MODE: 'live' });
  assert.equal(first.status, 0, first.stderr);

  const memo = readFileSync(join(dir, 'ideas', `${TODAY}.md`), 'utf8');
  assert.match(memo, new RegExp(`_${TODAY} · conviction: medium · score: 71/100_`)); // original score untouched
  assert.match(memo, /## Evidence enrichment\nSeparate from the score above/);
  assert.match(readFileSync(join(dir, 'SCORES.md'), 'utf8'), /\| 71 \| medium \|/);

  const run = JSON.parse(readFileSync(join(dir, 'evidence', `${TODAY}.json`), 'utf8'));
  assert.equal(run.ideas.length, 3);
  assert.ok(run.ideas.every((i) => i.status === 'enriched' && i.assessment));
  assert.equal(run.ideas.filter((i) => i.matchesOriginalPick).length, 1);
  // Relevance is judged in the daily run before assessing; idea-level demand counts direct keywords only.
  const i0 = run.ideas[0];
  assert.ok(i0.relevance && i0.relevance.evidenceUpdatedAt === i0.evidenceUpdatedAt);
  assert.equal(i0.readings.demand.scope, 'direct keywords only');
  assert.equal(i0.readings.demand.category.level, 'some'); // "… pricing" judged category, 140/mo
  assert.equal(i0.readings.demand.level, 'unknown'); // the one direct keyword with data is uncorroborated → flagged, not counted
  assert.equal(i0.readings.demand.upTo, 'some');
  const a = run.ideas[0].assessment;
  assert.match(a.opportunity, /\[unverified link removed\]/);
  assert.equal(a.competition.gaps[0].kind, 'inference'); // "observed" without evidence is relabelled
  assert.equal(a.problemEvidence.level, 'moderate'); // grounded by a verbatim quote
  assert.deepEqual(a.problemEvidence.basis.map((b) => b.id), ['S1.1']);
  assert.ok(a.validation.rejectedCitations.some((r) => r.reason === 'no quote'));
  assert.equal(a.competition.alternatives[0].name, 'Vendor');
  assert.ok(!('confidence' in a));

  const paid = paidCalls(first.calls);
  assert.equal(paid.filter((c) => c.url.includes('keyword_overview')).length, 1); // one batch for the whole shortlist
  assert.equal(paid.filter((c) => c.url.includes('/serp/')).length, 6);
  const rpcCalls = first.calls.filter((c) => c.url.includes('budget.fake'));
  const reserves = rpcCalls.filter((c) => c.url.endsWith('dataforseo_budget_reserve'));
  const settles = rpcCalls.filter((c) => c.url.endsWith('dataforseo_budget_settle'));
  assert.equal(reserves.length, 7);
  assert.equal(settles.length, 7);
  assert.ok(settles.every((c) => reserves.some((r) => r.body.p_hold_id === c.body.p_hold_id) && c.body.p_payload.source === 'scout'));
  // every paid request was preceded by its reservation
  for (const [i, c] of first.calls.entries()) {
    if (c.method === 'POST' && c.url.includes('api.dataforseo.com')) assert.ok(first.calls.slice(0, i).some((x) => x.url.endsWith('dataforseo_budget_reserve')));
  }
  const scanIdx = first.calls.findIndex((c) => c.url.includes('generativelanguage'));
  const firstPaid = first.calls.findIndex((c) => c.method === 'POST' && c.url.includes('dataforseo'));
  assert.ok(firstPaid > scanIdx);

  const evidenceMd = readFileSync(join(dir, 'evidence', `${TODAY}.md`), 'utf8');
  assert.match(evidenceMd, /71\/100 medium \(unchanged\)/);
  assert.match(evidenceMd, /Search demand for this idea \(directly relevant keywords only\)/);
  assert.match(evidenceMd, /\| Relevance to this idea \|/);
  assert.match(evidenceMd, /direct competitor — same problem/);

  // Re-run the same day: memo exists → no research, nothing pending → no provider calls.
  const second = runDaily(dir, { SCOUT_DFS_MODE: 'live' });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.calls.length, 0);
  assert.equal(readFileSync(join(dir, 'ideas', `${TODAY}.md`), 'utf8'), memo);
});

test('dry-run mode (the default): full daily run with zero paid requests', { timeout: 120_000 }, () => {
  const dir = sandbox();
  const r = runDaily(dir, { SCOUT_DFS_MODE: '' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(paidCalls(r.calls).length, 0);
  assert.equal(r.calls.filter((c) => c.url.endsWith('dataforseo_budget_reserve')).length, 0);
  const run = JSON.parse(readFileSync(join(dir, 'evidence', `${TODAY}.json`), 'utf8'));
  assert.ok(run.ideas.every((i) => i.status === 'dry-run'));
  assert.ok(run.projection.totalUsd > 0);
  assert.ok(existsSync(join(dir, 'ideas', `${TODAY}.md`)));
});

test('provider unavailable: research still completes, enrichment marked unavailable', { timeout: 120_000 }, () => {
  const dir = sandbox();
  const r = runDaily(dir, { SCOUT_DFS_MODE: 'live', DATAFORSEO_LOGIN: '', DATAFORSEO_PASSWORD: '' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(dir, 'ideas', `${TODAY}.md`)));
  const run = JSON.parse(readFileSync(join(dir, 'evidence', `${TODAY}.json`), 'utf8'));
  assert.equal(run.provider.status, 'unavailable');
  assert.ok(run.ideas.every((i) => i.status === 'unavailable'));
});
