import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataForSeo, ProviderError, projectLabsCost, projectSerpCost } from '../lib/dataforseo.mjs';
import { createLedger, readBudgetConfig, remainingAllowance, canAfford, stableUuid, spendEntry } from '../lib/ledger.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const noSleep = async () => {};

test('projected prices follow the published rates', () => {
  assert.equal(projectLabsCost(0), 0);
  assert.equal(projectLabsCost(25), 0.015);
  assert.equal(projectSerpCost(10), 0.002);
  assert.equal(projectSerpCost(20), 0.004);
});

test('unconfigured client refuses without calling the network', async () => {
  let calls = 0;
  const dfs = createDataForSeo({ fetchImpl: async () => (calls++, json({})) });
  assert.equal(dfs.configured, false);
  await assert.rejects(() => dfs.keywordOverview(['a b'], { locationName: 'United States', languageCode: 'en' }), (e) => e.kind === 'not_configured');
  assert.equal(calls, 0);
});

test('auth failure is not retried and never leaks credentials', async () => {
  let calls = 0;
  const dfs = createDataForSeo({ login: 'me@example.com', password: 'secret-pass', fetchImpl: async () => (calls++, new Response('', { status: 401 })), sleep: noSleep });
  const err = await dfs.keywordOverview(['a b'], { locationName: 'United States', languageCode: 'en' }).catch((e) => e);
  assert.ok(err instanceof ProviderError);
  assert.equal(err.kind, 'auth');
  assert.equal(err.fatalForRun, true);
  assert.equal(calls, 1);
  assert.ok(!err.message.includes('secret-pass') && !err.message.includes('me@example.com'));
});

test('rate limits retry a bounded number of times', async () => {
  let calls = 0;
  const dfs = createDataForSeo({ login: 'a', password: 'b', maxAttempts: 3, sleep: noSleep, fetchImpl: async () => (calls++, json({ status_code: 40202, status_message: 'Rate limit' })) });
  const err = await dfs.serpOrganic('q', { locationName: 'United States', languageCode: 'en' }).catch((e) => e);
  assert.equal(err.kind, 'rate_limit');
  assert.equal(calls, 3);
});

test('a timeout on a paid request is never retried and is flagged chargeUnknown', async () => {
  let calls = 0;
  const dfs = createDataForSeo({
    login: 'a',
    password: 'b',
    sleep: noSleep,
    fetchImpl: async () => {
      calls++;
      const e = new Error('timeout');
      e.name = 'TimeoutError';
      throw e;
    },
  });
  const err = await dfs.serpOrganic('q', { locationName: 'United States', languageCode: 'en' }).catch((e) => e);
  assert.equal(err.kind, 'timeout');
  assert.equal(err.chargeUnknown, true);
  assert.equal(calls, 1);
});

test('insufficient funds maps to payment and stops the run', async () => {
  const dfs = createDataForSeo({ login: 'a', password: 'b', sleep: noSleep, fetchImpl: async () => json({ status_code: 20000, cost: 0, tasks: [{ status_code: 40210, status_message: 'Insufficient funds' }] }) });
  const err = await dfs.keywordOverview(['a b'], { locationName: 'United States', languageCode: 'en' }).catch((e) => e);
  assert.equal(err.kind, 'payment');
  assert.equal(err.fatalForRun, true);
});

test('keywordOverview keeps missing volume as null and reads cost from the API', async () => {
  let body;
  const dfs = createDataForSeo({
    login: 'a',
    password: 'b',
    fetchImpl: async (_url, init) => {
      body = JSON.parse(init.body);
      return json({
        status_code: 20000,
        cost: 0.01236,
        tasks: [{ status_code: 20000, result: [{ items: [
          { keyword: 'x software', keyword_info: { search_volume: 320, cpc: 14.2, competition: 0.6, competition_level: 'HIGH', monthly_searches: [{ year: 2026, month: 8, search_volume: 300 }] }, search_intent_info: { main_intent: 'commercial' } },
          { keyword: 'x rare', keyword_info: { search_volume: null } },
        ] }] }],
      });
    },
  });
  const r = await dfs.keywordOverview(['x software', 'x rare', 'x software'], { locationName: 'United States', languageCode: 'en' });
  assert.deepEqual(body[0].keywords, ['x software', 'x rare']);
  assert.equal(body[0].location_name, 'United States');
  assert.equal(r.cost, 0.01236);
  assert.equal(r.items[0].adCompetitionLevel, 'HIGH');
  assert.equal(r.items[1].searchVolume, null);
});

test('budget config fails closed without a cap and never invents one', () => {
  assert.equal(readBudgetConfig({}).capUsd, null);
  assert.match(readBudgetConfig({}).capError, /not set/);
  assert.equal(readBudgetConfig({ DATAFORSEO_MONTHLY_USD_CAP: 'lots' }).capUsd, null);
  const c = readBudgetConfig({ DATAFORSEO_MONTHLY_USD_CAP: '2' });
  assert.deepEqual([c.capUsd, c.reserveUsd, c.maxRunUsd], [2, 1, 0.1]);
});

test('remaining allowance respects cap, reserve, month-to-date and per-run limit', () => {
  const b = { capUsd: 2, reserveUsd: 1, maxRunUsd: 0.1, monthToDateUsd: 0.95, spentThisRunUsd: 0 };
  assert.equal(remainingAllowance(b), 0.05);
  assert.equal(canAfford(0.06, b).ok, false);
  assert.equal(remainingAllowance({ ...b, monthToDateUsd: 0 }), 0.1);
  assert.equal(remainingAllowance({ ...b, monthToDateUsd: 0, spentThisRunUsd: 0.09 }), 0.01);
  assert.equal(remainingAllowance({ ...b, monthToDateUsd: null }), 0); // unreadable ledger → nothing
  assert.equal(remainingAllowance({ ...b, capUsd: null, monthToDateUsd: 0 }), 0);
});

test('ledger sums this month across every producer and treats duplicate inserts as recorded', async () => {
  const seen = [];
  const ledger = createLedger({
    url: 'https://x.supabase.co/',
    key: 'k',
    projectId: 'p1',
    fetchImpl: async (url, init = {}) => {
      seen.push({ url: String(url), init });
      if (!init.method) return json([{ payload: { cost: 0.09 } }, { payload: { cost: 0.0156 } }, { payload: {} }]);
      return new Response('', { status: 409 });
    },
  });
  assert.equal(await ledger.monthToDateUsd(new Date('2026-09-14T10:00:00Z')), 0.1056);
  const q = decodeURIComponent(seen[0].url);
  assert.match(q, /type=eq\.dataforseo\.spend/);
  assert.match(q, /occurred_at=gte\.2026-09-01T00:00:00\.000Z/);
  assert.match(q, /occurred_at=lt\.2026-10-01T00:00:00\.000Z/);
  const entry = spendEntry({ runId: 'r', cacheKey: 'k', endpoint: 'e', costUsd: 0.002, estimated: false, requested: 1, measured: 10, market: { locationName: 'United States', languageCode: 'en' }, measuredAt: '2026-09-14T10:00:00Z', capUsd: 2 });
  assert.deepEqual(await ledger.record(entry), { recorded: true, duplicate: true });
  const sent = JSON.parse(seen[1].init.body);
  assert.equal(sent.produced_by, 'scout');
  assert.equal(sent.processed, true);
  assert.equal(sent.payload.cost, 0.002);
  assert.equal(stableUuid('a'), stableUuid('a'));
  assert.match(stableUuid('a'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('an unreadable ledger throws instead of reporting zero spend', async () => {
  const ledger = createLedger({ url: 'https://x', key: 'k', projectId: 'p', fetchImpl: async () => new Response('', { status: 500 }) });
  await assert.rejects(() => ledger.monthToDateUsd());
});

test('HTTP 5xx or an unreadable body on a paid request is chargeUnknown and never retried', async () => {
  for (const make of [() => new Response('bad gateway', { status: 502 }), () => new Response('{truncated', { status: 200 })]) {
    let calls = 0;
    const dfs = createDataForSeo({ login: 'a', password: 'b', sleep: noSleep, fetchImpl: async () => (calls++, make()) });
    const err = await dfs.serpOrganic('q', { locationName: 'United States', languageCode: 'en' }).catch((e) => e);
    assert.equal(err.chargeUnknown, true);
    assert.equal(calls, 1);
  }
  // A DataForSEO error status in the body is not billed and may be retried (bounded).
  let calls = 0;
  const dfs = createDataForSeo({ login: 'a', password: 'b', sleep: noSleep, fetchImpl: async () => (calls++, json({ status_code: 50000, status_message: 'Internal Error' })) });
  const err = await dfs.serpOrganic('q', { locationName: 'United States', languageCode: 'en' }).catch((e) => e);
  assert.equal(err.chargeUnknown, false);
  assert.equal(calls, 3);
});

test('budget RPC client: anon key + client token only, refusals surface, missing functions fail closed', async () => {
  const { createBudgetRpc, BudgetUnavailable } = await import('../lib/budget.mjs');
  const seen = [];
  const rpc = createBudgetRpc({
    url: 'https://x.supabase.co/',
    anonKey: 'anon-key',
    token: 't'.repeat(40),
    fetchImpl: async (url, init) => {
      seen.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
      if (String(url).endsWith('dataforseo_budget_reserve')) return json({ ok: false, reason: 'cap', cap_usd: 2, ceiling_usd: 1, charged_usd: 0.98, held_usd: 0.03 });
      if (String(url).endsWith('dataforseo_budget_settle')) return json({ ok: false, reason: 'hold_released' });
      return new Response('', { status: 404 });
    },
  });
  const r = await rpc.reserve({ holdId: 'h1', estimatedUsd: 0.02, endpoint: 'e', requestKey: 'k', maxTotalUsd: 1 });
  assert.deepEqual([r.ok, r.reason, r.ceilingUsd, r.heldUsd], [false, 'cap', 1, 0.03]);
  assert.equal(seen[0].url, 'https://x.supabase.co/rest/v1/rpc/dataforseo_budget_reserve');
  assert.equal(seen[0].headers.apikey, 'anon-key');
  assert.equal(seen[0].body.p_max_total_usd, 1);
  await assert.rejects(() => rpc.settle({ holdId: 'h1', actualUsd: 0.01 }), (e) => e instanceof BudgetUnavailable && /hold_released/.test(e.message));
  await assert.rejects(() => rpc.status(), /not installed/);
  assert.equal(createBudgetRpc({ url: 'https://x', anonKey: 'a' }).configured, false);
});

test('legacy ledger adapter is explicit about being non-atomic and records uncertain requests at their estimate', async () => {
  const { createLegacyLedgerBudget } = await import('../lib/budget.mjs');
  const rows = [];
  const ledger = { configured: true, monthToDateUsd: async () => 0.9 + rows.reduce((s, r) => s + r.payload.cost, 0), record: async (e) => rows.push(e) };
  const b = createLegacyLedgerBudget({ ledger, capUsd: 2 });
  assert.equal(b.atomic, false);
  assert.equal((await b.reserve({ holdId: 'h1', estimatedUsd: 0.05, endpoint: 'e', maxTotalUsd: 1 })).ok, true);
  assert.equal((await b.reserve({ holdId: 'h2', estimatedUsd: 0.06, endpoint: 'e', maxTotalUsd: 1 })).reason, 'cap'); // 0.9 + 0.05 held + 0.06 > 1
  await b.markUncertain({ holdId: 'h1', note: 'timeout' });
  assert.deepEqual([rows[0].id, rows[0].payload.cost, rows[0].payload.uncertain], ['h1', 0.05, true]);
});
