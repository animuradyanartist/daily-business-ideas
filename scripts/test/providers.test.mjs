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

// --- DataForSEO status codes (docs.dataforseo.com/v3/appendix/errors) ----------------------

const US = { locationName: 'United States', languageCode: 'en' };
/** A client whose every response is one task with this status; counts the calls. */
function taskStatus(code, { cost = 0, message = 'x', topLevel = false } = {}) {
  const state = { calls: 0 };
  const body = topLevel ? { status_code: code, status_message: message, cost, tasks: [] } : { status_code: 20000, cost, tasks: [{ status_code: code, status_message: message, result: null }] };
  state.dfs = createDataForSeo({ login: 'a', password: 'b', maxAttempts: 3, sleep: noSleep, fetchImpl: async () => (state.calls++, json(body)) });
  return state;
}

test('40100 not authorized stops the run, is not retried, and says to check the credentials', async () => {
  for (const topLevel of [false, true]) {
    const s = taskStatus(40100, { message: 'You are not authorized to access this resource', topLevel });
    const err = await s.dfs.serpOrganic('q', US).catch((e) => e);
    assert.equal(err.kind, 'auth');
    assert.equal(err.fatalForRun, true);
    assert.match(err.message, /login and password/);
    assert.equal(s.calls, 1);
  }
});

test('40104 unverified account and 40207 IP not whitelisted are account problems that stop the run', async () => {
  for (const [code, text] of [[40104, /not verified/], [40207, /not whitelisted/]]) {
    const s = taskStatus(code);
    const err = await s.dfs.keywordOverview(['a b'], US).catch((e) => e);
    assert.equal(err.kind, 'account', `code ${code}`);
    assert.equal(err.fatalForRun, true);
    assert.match(err.message, text);
    assert.doesNotMatch(err.message, /login and password/);
    assert.equal(s.calls, 1);
  }
});

test('40101 Internal SE Server Error that was billed: fails that request only, carries the cost, never re-sent', async () => {
  // The production incident (run 34952940829): task-level 40101, billed $0.002, logged as an auth failure.
  const s = taskStatus(40101, { cost: 0.002, message: 'Internal SE Server Error.' });
  const err = await s.dfs.serpOrganic('kitchen hood log', US).catch((e) => e);
  assert.ok(err instanceof ProviderError);
  assert.equal(err.kind, 'task_failed');
  assert.equal(err.statusCode, 40101);
  assert.equal(err.fatalForRun, false);
  assert.equal(err.cost, 0.002);
  assert.equal(err.billed, true);
  assert.equal(err.chargeUnknown, false);
  assert.doesNotMatch(err.message, /auth|login|password/i);
  assert.equal(s.calls, 1);
});

test('40103 task execution failed that was billed is not retried either', async () => {
  const s = taskStatus(40103, { cost: 0.0124, message: 'Task execution failed, please try to resubmit.' });
  const err = await s.dfs.keywordOverview(['a b'], US).catch((e) => e);
  assert.equal(err.kind, 'task_failed');
  assert.equal(err.fatalForRun, false);
  assert.equal(err.cost, 0.0124);
  assert.equal(s.calls, 1);
});

test('40101 / 40103 that reported no charge are retried a bounded number of times, and a retry can succeed', async () => {
  for (const code of [40101, 40103]) {
    const s = taskStatus(code, { cost: 0 });
    const err = await s.dfs.serpOrganic('q', US).catch((e) => e);
    assert.equal(err.kind, 'task_failed');
    assert.equal(err.fatalForRun, false);
    assert.equal(err.billed, false);
    assert.equal(s.calls, 3);
  }
  let calls = 0;
  const dfs = createDataForSeo({
    login: 'a',
    password: 'b',
    sleep: noSleep,
    fetchImpl: async () => (++calls === 1
      ? json({ status_code: 20000, cost: 0, tasks: [{ status_code: 40101, status_message: 'Internal SE Server Error.' }] })
      : json({ status_code: 20000, cost: 0.002, tasks: [{ status_code: 20000, result: [{ items: [{ type: 'organic', url: 'https://v.com/', domain: 'v.com', rank_absolute: 1 }] }] }] })),
  });
  const r = await dfs.serpOrganic('q', US);
  assert.equal(calls, 2);
  assert.equal(r.cost, 0.002);
  assert.equal(r.items.length, 1);
});

test('40102 No Search Results is an empty answer at the reported cost, not an error', async () => {
  const serp = taskStatus(40102, { cost: 0.002, message: 'No Search Results.' });
  const r = await serp.dfs.serpOrganic('very rare query', US);
  assert.deepEqual(r.items, []);
  assert.deepEqual(r.itemTypes, []);
  assert.equal(r.cost, 0.002);
  assert.equal(serp.calls, 1);

  const labs = taskStatus(40102, { cost: 0.01212, message: 'No Search Results.' });
  const k = await labs.dfs.keywordOverview(['nobody searches this'], US);
  assert.deepEqual(k.items, []); // callers keep each keyword as "no data", never zero
  assert.equal(k.cost, 0.01212);

  const ads = taskStatus(40102, { cost: 0.09, topLevel: true });
  const a = await ads.dfs.adsSearchVolume(['nobody searches this'], US);
  assert.deepEqual(a.items, []);
  assert.equal(a.cost, 0.09);

  // A free lookup has no "empty answer": it stays an error, so a market is never cached as unsupported.
  const free = taskStatus(40102);
  const err = await free.dfs.labsMarketSupport(US).catch((e) => e);
  assert.ok(err instanceof ProviderError);
  assert.equal(err.fatalForRun, false);
});

test('40209 too many simultaneous queries is a rate limit: retried a bounded number of times, never fatal', async () => {
  const s = taskStatus(40209, { message: 'Too many simultaneous queries.' });
  const err = await s.dfs.serpOrganic('q', US).catch((e) => e);
  assert.equal(err.kind, 'rate_limit');
  assert.equal(err.fatalForRun, false);
  assert.equal(s.calls, 3);
});

test('a billed status error of any retryable kind is never re-sent', async () => {
  for (const code of [40202, 50000]) {
    const s = taskStatus(code, { cost: 0.002 });
    const err = await s.dfs.serpOrganic('q', US).catch((e) => e);
    assert.equal(err.cost, 0.002);
    assert.equal(s.calls, 1, `code ${code}`);
  }
});

