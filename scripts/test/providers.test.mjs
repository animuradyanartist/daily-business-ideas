import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataForSeo, ProviderError, projectLabsCost, projectSerpCost } from '../lib/dataforseo.mjs';

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

