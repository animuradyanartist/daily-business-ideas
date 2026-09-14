// Orchestration tests with FAKE providers. These prove the cost and safety rules; they
// are not, and are never reported as, a live DataForSEO integration test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newRun, gatherEvidence, readEnrichConfig, constrainAssessment, saveRun, loadRun, attachOriginal, memoContext, recomputeReadings } from '../lib/enrich.mjs';
import { normalizeRelevance } from '../lib/relevance.mjs';
import { createFileCache, createOutbox } from '../lib/cache.mjs';
import { ProviderError } from '../lib/dataforseo.mjs';

const market = { locationName: 'United States', languageCode: 'en' };
const plan = (slug) => ({
  slug,
  title: `Idea ${slug}`,
  problem: 'p',
  targetCustomer: 't',
  payer: 'y',
  whyPayerPays: 'w',
  keywords: { problem: [`${slug} problem`], solution: [`${slug} software`], buying: [`${slug} pricing`] },
  serpQueries: [`${slug} software`],
});

function fakeDfs({ fail } = {}) {
  const calls = { labs: 0, serp: 0, balance: 0, support: 0 };
  return {
    calls,
    configured: true,
    async balance() {
      calls.balance++;
      return { balanceUsd: 5 };
    },
    async labsMarketSupport() {
      calls.support++;
      return { supported: true, locationCode: 2840 };
    },
    async keywordOverview(keywords) {
      calls.labs++;
      if (fail) throw fail;
      return {
        cost: 0.0124,
        requested: keywords.length,
        measuredAt: new Date().toISOString(),
        items: keywords.filter((k) => !k.includes('problem')).map((k) => ({ keyword: k, searchVolume: 120, monthlySearches: [], cpcUsd: 9, adCompetitionLevel: 'HIGH' })),
      };
    },
    async serpOrganic(query) {
      calls.serp++;
      return {
        cost: 0.002,
        measuredAt: new Date().toISOString(),
        checkUrl: 'https://www.google.com/search?q=x',
        itemTypes: ['organic'],
        items: [
          { rank: 1, domain: 'vendor.com', url: 'https://vendor.com/', title: `Vendor for ${query}`, description: 'd' },
          { rank: 2, domain: 'reddit.com', url: 'https://reddit.com/r/x/1', title: 'Thread', description: 'I hate this' },
        ],
      };
    },
  };
}

// In-memory model of db/dataforseo_budget.sql: charged + held (reserved/uncertain) count
// against the cap; the same refusal reasons. The real functions are tested in budget-sql.test.mjs.
function fakeBudget({ charged = 0, cap = 2, readFails = false, reserveFails = false, writeFails = false, maxRequest = 0.1 } = {}) {
  const holds = new Map();
  const events = [];
  const state = { writeFails, log: [] };
  const held = () => [...holds.values()].filter((h) => h.status === 'reserved' || h.status === 'uncertain').reduce((s, h) => s + h.estimatedUsd, 0);
  const total = () => charged + events.reduce((s, e) => s + e.cost, 0);
  return {
    backend: 'rpc',
    atomic: true,
    configured: true,
    holds,
    events,
    state,
    async status() {
      if (readFails) throw new Error('budget down');
      return { capUsd: cap, chargedUsd: total(), heldUsd: held() };
    },
    async reserve({ holdId, estimatedUsd, maxTotalUsd }) {
      if (reserveFails) throw new Error('budget down');
      state.log.push('reserve');
      if (estimatedUsd > maxRequest) return { ok: false, reason: 'request_limit' };
      const ceiling = Math.min(cap, maxTotalUsd ?? cap);
      if (total() + held() + estimatedUsd > ceiling + 1e-9) return { ok: false, reason: 'cap', capUsd: cap, ceilingUsd: ceiling, chargedUsd: total(), heldUsd: held() };
      holds.set(holdId, { estimatedUsd, status: 'reserved' });
      return { ok: true };
    },
    async settle({ holdId, actualUsd, payload }) {
      state.log.push('settle');
      if (state.writeFails) throw new Error('write down');
      const h = holds.get(holdId);
      if (h.status === 'charged') return { ok: true, duplicate: true };
      h.status = 'charged';
      events.push({ holdId, cost: actualUsd, payload });
      return { ok: true };
    },
    async markUncertain({ holdId }) {
      if (state.writeFails) throw new Error('write down');
      holds.get(holdId).status = 'uncertain';
      return { ok: true };
    },
    async release({ holdId }) {
      if (state.writeFails) throw new Error('write down');
      holds.get(holdId).status = 'released';
      return { ok: true };
    },
  };
}

function setup({ env = {}, dfs = fakeDfs(), budget = fakeBudget(), ideas = ['a', 'b'] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'scout-enrich-'));
  const config = readEnrichConfig({ SCOUT_DFS_MODE: 'live', DATAFORSEO_MONTHLY_USD_CAP: '2', ...env });
  const pageCalls = [];
  const deps = {
    dfs,
    budget,
    cache: createFileCache(join(dir, 'cache')),
    outbox: createOutbox(join(dir, 'outbox.json')),
    fetchPage: async (url) => (pageCalls.push(url), { url, retrievedAt: new Date().toISOString(), status: 200, error: null, title: 'Vendor', priceMentions: [{ text: '$49/mo', billingUnit: true, context: '$49/mo' }] }),
    now: () => new Date(),
  };
  const run = newRun({ date: '2026-09-14', source: { kind: 'scan' }, config, plans: ideas.map(plan) });
  return { dir, config, deps, run, dfs, budget, pageCalls };
}

const quiet = { warn() {} };

test('live run: one batched Labs task, SERPs, every charge reserved then settled in the shared budget', async () => {
  const { run, config, deps, dfs, budget } = setup();
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs, 1); // all 6 keywords in one task
  assert.equal(dfs.calls.serp, 2);
  assert.equal(budget.holds.size, 3);
  assert.ok([...budget.holds.values()].every((h) => h.status === 'charged'));
  assert.equal(budget.events.length, 3);
  assert.ok(budget.events.every((e) => e.payload.source === 'scout'));
  assert.equal(run.budget.spentThisRunUsd, 0.0164); // provider-reported costs, not estimates
  assert.ok(run.spend.every((l) => l.status === 'charged' && l.budget === 'recorded'));
  const a = run.ideas[0];
  assert.equal(a.status, 'enriched');
  assert.equal(a.keywords.find((k) => k.group === 'problem').status, 'no_data'); // absent stays unknown
  // Before the evidence is judged for relevance, idea-level readings are unknown — never assumed relevant.
  assert.equal(a.readings.demand.level, 'unknown');
  assert.equal(a.readings.commercial.level, 'unknown');
  a.relevance = normalizeRelevance(
    {
      keywords: a.keywords.map((k) => ({ id: k.id, searcher: 'includes', topic: k.group === 'buying' ? 'category' : 'same', reason: 'test judgement' })),
      items: [...a.serps.flatMap((x) => x.items), ...a.pages].map((i) => ({ id: i.id, customer: 'broader', problem: 'same', offering: i.domain === 'reddit.com' ? 'no' : 'yes', reason: 'test judgement' })),
    },
    a,
  );
  recomputeReadings(run);
  assert.equal(a.readings.demand.level, 'unknown'); // the only measured direct keyword (120/mo) is uncorroborated → not counted, flagged
  assert.equal(a.readings.demand.upTo, 'some');
  assert.equal(a.readings.demand.category.level, 'some'); // the buying keyword, shown separately
  assert.equal(a.readings.commercial.level, 'moderate'); // one priced domain + bids
  assert.deepEqual(a.pages.map((p) => p.id), ['P1', 'P2']); // vendor homepage + /pricing, reddit excluded
});

test('dry run makes zero paid requests and no reservations', async () => {
  const { run, config, deps, dfs, budget } = setup({ env: { SCOUT_DFS_MODE: 'dry-run' } });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs + dfs.calls.serp + dfs.calls.balance, 0);
  assert.equal(budget.holds.size, 0);
  assert.equal(run.provider.status, 'dry-run');
  assert.ok(run.ideas.every((i) => i.status === 'dry-run'));
  assert.equal(run.projection.labsKeywords, 6);
  assert.equal(run.projection.totalUsd, 0.01672);
});

test('missing cap or unconfigured budget means no spending at all', async () => {
  const unconfigured = { ...fakeBudget(), configured: false };
  for (const variant of [{ env: { DATAFORSEO_MONTHLY_USD_CAP: '' } }, { budget: unconfigured }]) {
    const { run, config, deps, dfs } = setup(variant);
    await gatherEvidence({ run, config, deps, log: quiet });
    assert.equal(dfs.calls.labs + dfs.calls.serp, 0);
    assert.equal(run.provider.status, 'unavailable');
  }
});

test('unreachable budget fails closed and leaves enrichment pending', async () => {
  for (const budget of [fakeBudget({ readFails: true }), fakeBudget({ reserveFails: true })]) {
    const { run, config, deps, dfs } = setup({ budget });
    await gatherEvidence({ run, config, deps, log: quiet });
    assert.equal(dfs.calls.labs + dfs.calls.serp, 0);
    assert.equal(run.provider.status, 'pending');
    assert.ok(run.ideas.every((i) => i.status === 'pending'));
  }
});

test('exhausted shared budget blocks purchases', async () => {
  // cap 2 − reserve 1 − already charged 1.00 (by any app) = nothing left for Scout
  const { run, config, deps, dfs } = setup({ budget: fakeBudget({ charged: 1.0 }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs + dfs.calls.serp, 0);
  assert.match(run.ideas[0].reason, /reservation was refused/);
});

test('each request is reserved on its own estimate', async () => {
  // $0.01 left for Scout: the ~$0.014 keyword reservation is refused, the ~$0.0022 SERPs fit
  const { run, config, deps, dfs, budget } = setup({ budget: fakeBudget({ charged: 0.99 }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs, 0);
  assert.equal(dfs.calls.serp, 2);
  assert.ok(budget.events.every((e) => e.cost === 0.002));
  assert.ok(run.ideas.every((i) => i.status === 'partial'));
  assert.equal(run.ideas[0].readings.demand.level, 'unknown');
});

test('a second run reuses the cache and does not pay again', async () => {
  const first = setup();
  await gatherEvidence({ run: first.run, config: first.config, deps: first.deps, log: quiet });
  const again = newRun({ date: '2026-09-15', source: { kind: 'scan' }, config: first.config, plans: ['a', 'b'].map(plan) });
  const before = { ...first.dfs.calls };
  await gatherEvidence({ run: again, config: first.config, deps: first.deps, log: quiet });
  assert.equal(first.dfs.calls.labs, before.labs);
  assert.equal(first.dfs.calls.serp, before.serp);
  assert.equal(first.budget.holds.size, 3);
  assert.ok(again.ideas.every((i) => i.status === 'enriched'));
});

test('enriched ideas are not redone and attempts are bounded for pending ones', async () => {
  const limited = new ProviderError('rate_limit', 40202, 'rate limit reached');
  const { run, config, deps, dfs, budget } = setup({ dfs: fakeDfs({ fail: limited }), env: { SCOUT_ENRICH_MAX_ATTEMPTS: '2' } });
  for (let i = 0; i < 4; i++) await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs, 2);
  assert.ok(run.ideas.every((i) => i.attempts === 2));
  assert.ok([...budget.holds.values()].every((h) => h.status === 'released')); // provably uncharged → released
});

test('auth failure makes enrichment unavailable and releases the reservation', async () => {
  const { run, config, deps, dfs, budget } = setup({ dfs: fakeDfs({ fail: new ProviderError('auth', 40100, 'bad') }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(run.provider.status, 'unavailable');
  assert.equal(dfs.calls.serp, 0); // no further calls after a fatal error
  assert.equal([...budget.holds.values()][0].status, 'released');
});

test('a possibly-charged timeout stays counted as uncertain and is never re-sent automatically', async () => {
  const timeout = new ProviderError('timeout', null, 'no response within 45s', { chargeUnknown: true });
  const { run, config, deps, dfs, budget } = setup({ dfs: fakeDfs({ fail: timeout }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs, 1);
  const hold = [...budget.holds.values()][0];
  assert.equal(hold.status, 'uncertain'); // still counts against the cap at its estimate
  assert.equal(run.spend[0].status, 'uncertain');
  assert.equal(run.budget.spentThisRunUsd, run.spend[0].estimateUsd);

  // Next run: the provider works again, but the identical request is NOT re-sent.
  const healthy = fakeDfs();
  const next = { ...deps, dfs: healthy };
  await gatherEvidence({ run, config, deps: next, log: quiet });
  assert.equal(healthy.calls.labs, 0);
  assert.match(run.ideas[0].reason, /not re-sent automatically/);

  // Only an explicit opt-in re-sends it.
  const retryConfig = readEnrichConfig({ SCOUT_DFS_MODE: 'live', DATAFORSEO_MONTHLY_USD_CAP: '2', SCOUT_RETRY_UNCERTAIN: '1' });
  await gatherEvidence({ run, config: retryConfig, deps: next, log: quiet });
  assert.equal(healthy.calls.labs, 1);
});

test('a failed budget write keeps the hold counted, goes to the outbox, stops purchases, and replays first next run', async () => {
  const budget = fakeBudget({ writeFails: true });
  const { run, config, deps, dfs } = setup({ budget });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs, 1);
  assert.equal(dfs.calls.serp, 0);
  assert.equal(deps.outbox.list().length, 1);
  assert.equal(deps.outbox.list()[0].op, 'settle');
  assert.equal(run.spend[0].budget, 'outbox');
  assert.equal(run.provider.status, 'pending');
  assert.equal([...budget.holds.values()][0].status, 'reserved'); // never silently dropped from the cap

  // The budget recovers: the stored settle is replayed BEFORE anything new is reserved.
  budget.state.writeFails = false;
  budget.state.log.length = 0;
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(budget.state.log[0], 'settle');
  assert.ok(budget.state.log.indexOf('reserve') > 0);
  assert.equal(deps.outbox.list().length, 0);
  assert.equal(budget.events.filter((e) => e.cost === 0.0124).length, 1); // the replayed charge, recorded once
  assert.ok([...budget.holds.values()].every((h) => h.status === 'charged'));
});

test('refusals from the shared budget: per-request limit and bad token make enrichment unavailable', async () => {
  const { run, config, deps, dfs } = setup({ budget: fakeBudget({ maxRequest: 0.001 }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs + dfs.calls.serp, 0);
  assert.equal(run.provider.status, 'unavailable');
  assert.match(run.provider.reason, /request_limit/);
});

test('saved evidence renders separately and records the untouched original score', async () => {
  const { run, config, deps, dir } = setup({ ideas: ['a'] });
  await gatherEvidence({ run, config, deps, log: quiet });
  const md = '# Idea a for testing\n\n_2026-09-14 · conviction: high · score: 97/100_\n\n## The idea\nText.\n';
  const ctx = memoContext(md);
  attachOriginal(run, { memoPath: 'ideas/2026-09-14.md', title: ctx.title, score: ctx.score, conviction: ctx.conviction });
  saveRun(run, dir);
  assert.ok(existsSync(join(dir, 'evidence', '2026-09-14.md')));
  const out = readFileSync(join(dir, 'evidence', '2026-09-14.md'), 'utf8');
  assert.match(out, /97\/100 high \(unchanged\)/);
  assert.match(out, /not added up/);
  assert.doesNotMatch(out, /total (search )?volume/i);
  assert.equal(loadRun('2026-09-14', dir).ideas[0].status, 'enriched');
});

test('Google Ads fallback is opt-in, batches only the keywords Labs missed, and is budget-gated', async () => {
  const withAds = () => {
    const d = fakeDfs();
    d.calls.ads = 0;
    d.adsSearchVolume = async (keywords) => {
      d.calls.ads++;
      return { cost: 0.09, requested: keywords.length, measuredAt: new Date().toISOString(), items: keywords.map((k) => ({ keyword: k, searchVolume: 30, monthlySearches: [], cpcUsd: 4, adCompetitionLevel: 'LOW' })) };
    };
    return d;
  };

  const off = setup({ dfs: withAds() });
  await gatherEvidence({ run: off.run, config: off.config, deps: off.deps, log: quiet });
  assert.equal(off.dfs.calls.ads, 0);

  const on = setup({ dfs: withAds(), env: { SCOUT_DFS_ADS_FALLBACK: 'live', SCOUT_DFS_MAX_RUN_USD: '0.2' } });
  await gatherEvidence({ run: on.run, config: on.config, deps: on.deps, log: quiet });
  assert.equal(on.dfs.calls.ads, 1); // both ideas' missing "problem" keywords in one task
  const k = on.run.ideas[0].keywords.find((x) => x.group === 'problem');
  assert.equal(k.searchVolume, 30);
  assert.match(k.provider, /Google Ads/);
  assert.equal(on.run.ideas[0].keywords.find((x) => x.group === 'solution').provider.includes('Labs'), true);

  // default per-run limit ($0.10) cannot fit Labs + an Ads task: the fallback is refused, not forced
  const capped = setup({ dfs: withAds(), env: { SCOUT_DFS_ADS_FALLBACK: 'live' } });
  await gatherEvidence({ run: capped.run, config: capped.config, deps: capped.deps, log: quiet });
  assert.equal(capped.dfs.calls.ads, 0);
  assert.match(capped.run.ideas[0].reason, /Google Ads fallback not collected — budget/);
});

test('markets: the planner picks from an allowlist; one Labs task per market; unsupported markets are never bought', async () => {
  const { parseMarkets, resolveIdeaMarket } = await import('../lib/enrich.mjs');
  const cfg = readEnrichConfig({ SCOUT_MARKETS: 'United States:en; India:en; Germany:de', DATAFORSEO_MONTHLY_USD_CAP: '2', SCOUT_DFS_MODE: 'live' });
  assert.deepEqual(parseMarkets('bad; India:EN', cfg.market), [{ locationName: 'India', languageCode: 'en' }]);
  assert.equal(resolveIdeaMarket({ location: 'india', language: 'EN', reason: 'buyers are there' }, cfg).source, 'planner');
  const off = resolveIdeaMarket({ location: 'Brazil', language: 'pt' }, cfg);
  assert.deepEqual([off.locationName, off.source], ['United States', 'default']);
  assert.match(off.reason, /not on the allowed market list/);

  const dfs = fakeDfs();
  const byMarket = [];
  dfs.keywordOverview = async (keywords, m) => {
    dfs.calls.labs++;
    byMarket.push(m.locationName);
    return { cost: 0.0124, requested: keywords.length, measuredAt: new Date().toISOString(), items: [] };
  };
  dfs.labsMarketSupport = async (m) => (m.locationName === 'Germany' ? { supported: false, reason: 'test: not supported' } : { supported: true });
  const plans = [
    { ...plan('a'), market: { location: 'United States', language: 'en' } },
    { ...plan('b'), market: { location: 'India', language: 'en' } },
    { ...plan('c'), market: { location: 'India', language: 'en' } },
    { ...plan('d'), market: { location: 'Germany', language: 'de' } },
  ];
  const { deps } = setup({ dfs });
  const run = newRun({ date: '2026-09-14', source: { kind: 'scan' }, config: cfg, plans });
  await gatherEvidence({ run, config: cfg, deps, log: quiet });
  assert.deepEqual(byMarket.sort(), ['India', 'United States']); // b + c share one task; Germany never bought
  const d = run.ideas.find((i) => i.slug === 'd');
  assert.equal(d.status === 'enriched', false);
  assert.match(d.reason, /not supported by DataForSEO Labs/);
  assert.equal(run.ideas.find((i) => i.slug === 'b').keywords[0].location, 'India');
  assert.equal(run.projection.labsTasks, 2);
});
