// Orchestration tests with FAKE providers. These prove the cost and safety rules; they
// are not, and are never reported as, a live DataForSEO integration test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newRun, gatherEvidence, readEnrichConfig, constrainAssessment, saveRun, loadRun, attachOriginal, memoContext } from '../lib/enrich.mjs';
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

function fakeLedger({ mtd = 0, readFails = false, writeFails = false } = {}) {
  const rows = [];
  return {
    rows,
    configured: true,
    async monthToDateUsd() {
      if (readFails) throw new Error('down');
      return mtd + rows.reduce((s, r) => s + r.payload.cost, 0);
    },
    async record(e) {
      if (writeFails) throw new Error('write down');
      rows.push(e);
      return { recorded: true };
    },
  };
}

function setup({ env = {}, dfs = fakeDfs(), ledger = fakeLedger(), ideas = ['a', 'b'] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'scout-enrich-'));
  const config = readEnrichConfig({ SCOUT_DFS_MODE: 'live', DATAFORSEO_MONTHLY_USD_CAP: '2', ...env });
  const pageCalls = [];
  const deps = {
    dfs,
    ledger,
    cache: createFileCache(join(dir, 'cache')),
    outbox: createOutbox(join(dir, 'outbox.json')),
    fetchPage: async (url) => (pageCalls.push(url), { url, retrievedAt: new Date().toISOString(), status: 200, error: null, title: 'Vendor', priceMentions: [{ text: '$49/mo', billingUnit: true, context: '$49/mo' }] }),
    now: () => new Date(),
  };
  const run = newRun({ date: '2026-09-14', source: { kind: 'scan' }, config, plans: ideas.map(plan) });
  return { dir, config, deps, run, dfs, ledger, pageCalls };
}

const quiet = { warn() {} };

test('live run: one batched Labs task, SERPs, spend recorded in the shared ledger, readings computed', async () => {
  const { run, config, deps, dfs, ledger } = setup();
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs, 1); // all 6 keywords in one task
  assert.equal(dfs.calls.serp, 2);
  assert.equal(ledger.rows.length, 3);
  assert.ok(ledger.rows.every((r) => r.payload.source === 'scout'));
  assert.equal(run.budget.spentThisRunUsd, 0.0164);
  const a = run.ideas[0];
  assert.equal(a.status, 'enriched');
  assert.equal(a.keywords.find((k) => k.group === 'problem').status, 'no_data'); // absent stays unknown
  assert.equal(a.readings.demand.level, 'some');
  assert.equal(a.readings.commercial.level, 'moderate'); // one priced domain + bids
  assert.deepEqual(a.pages.map((p) => p.id), ['P1', 'P2']); // vendor homepage + /pricing, reddit excluded
});

test('dry run makes zero paid requests and writes nothing to the ledger', async () => {
  const { run, config, deps, dfs, ledger } = setup({ env: { SCOUT_DFS_MODE: 'dry-run' } });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs + dfs.calls.serp + dfs.calls.balance, 0);
  assert.equal(ledger.rows.length, 0);
  assert.equal(run.provider.status, 'dry-run');
  assert.ok(run.ideas.every((i) => i.status === 'dry-run'));
  assert.equal(run.projection.labsKeywords, 6);
  assert.equal(run.projection.totalUsd, 0.0167);
});

test('missing cap or ledger means no spending at all', async () => {
  for (const variant of [{ env: { DATAFORSEO_MONTHLY_USD_CAP: '' } }, { ledger: { configured: false, async monthToDateUsd() { throw new Error('x'); } } }]) {
    const { run, config, deps, dfs } = setup(variant);
    await gatherEvidence({ run, config, deps, log: quiet });
    assert.equal(dfs.calls.labs + dfs.calls.serp, 0);
    assert.equal(run.provider.status, 'unavailable');
  }
});

test('unreadable ledger fails closed and leaves enrichment pending', async () => {
  const { run, config, deps, dfs } = setup({ ledger: fakeLedger({ readFails: true }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs + dfs.calls.serp, 0);
  assert.equal(run.provider.status, 'pending');
  assert.ok(run.ideas.every((i) => i.status === 'pending'));
});

test('exhausted shared budget blocks purchases', async () => {
  // cap 2 − reserve 1 − month-to-date 1.00 = nothing left for Scout
  const { run, config, deps, dfs } = setup({ ledger: fakeLedger({ mtd: 1.0 }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs + dfs.calls.serp, 0);
  assert.match(run.ideas[0].reason, /budget/);
});

test('each request is gated on its own projected cost', async () => {
  // $0.01 left: the ~$0.0127 keyword batch is refused, the $0.002 SERPs still fit
  const { run, config, deps, dfs, ledger } = setup({ ledger: fakeLedger({ mtd: 0.99 }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs, 0);
  assert.equal(dfs.calls.serp, 2);
  assert.ok(ledger.rows.every((r) => r.payload.cost === 0.002));
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
  assert.equal(first.ledger.rows.length, 3);
  assert.ok(again.ideas.every((i) => i.status === 'enriched'));
});

test('enriched ideas are not redone and attempts are bounded for pending ones', async () => {
  const auth = new ProviderError('rate_limit', 40202, 'rate limit reached');
  const { run, config, deps, dfs } = setup({ dfs: fakeDfs({ fail: auth }), env: { SCOUT_ENRICH_MAX_ATTEMPTS: '2' } });
  for (let i = 0; i < 4; i++) await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs, 2);
  assert.ok(run.ideas.every((i) => i.attempts === 2));
});

test('auth failure makes enrichment unavailable without throwing', async () => {
  const { run, config, deps, dfs } = setup({ dfs: fakeDfs({ fail: new ProviderError('auth', 40100, 'bad') }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(run.provider.status, 'unavailable');
  assert.equal(dfs.calls.serp, 0); // no further calls after a fatal error
});

test('ledger write failure moves the charge to the outbox and stops further purchases', async () => {
  const { run, config, deps, dfs } = setup({ ledger: fakeLedger({ writeFails: true }) });
  await gatherEvidence({ run, config, deps, log: quiet });
  assert.equal(dfs.calls.labs, 1);
  assert.equal(dfs.calls.serp, 0);
  assert.equal(deps.outbox.list().length, 1);
  assert.equal(run.spend[0].ledger, 'outbox');
  assert.equal(run.provider.status, 'pending');
});

test('constrainAssessment strips invented links and unsupported levels', () => {
  const idea = {
    keywords: [{ id: 'K1', status: 'measured' }],
    serps: [{ id: 'S1', checkUrl: null, items: [{ id: 'S1.1', url: 'https://vendor.com/' }] }],
    pages: [{ id: 'P1', url: 'https://vendor.com/pricing', error: null }],
  };
  const out = constrainAssessment(
    {
      opportunity: 'See https://invented.example/report and https://vendor.com/pricing',
      problemEvidence: { level: 'strong', basis: ['S7.7'], observed: 'lots', inference: 'maybe' },
      competition: { level: 'crowded', basis: ['S1.1'], alternatives: [{ name: 'Vendor', what: 'x', basis: ['P1'] }, { name: 'Ghost', what: 'y', basis: [] }], gaps: [{ text: 'no mobile app', basis: [], kind: 'observed' }] },
      feasibility: { level: 'certain' },
    },
    idea,
  );
  assert.equal(out.removedLinks, 1);
  assert.equal(out.problemEvidence.level, 'unknown');
  assert.equal(out.problemEvidence.observed, '');
  assert.equal(out.competition.level, 'crowded');
  assert.deepEqual(out.competition.alternatives.map((a) => a.name), ['Vendor']);
  assert.equal(out.competition.gaps[0].kind, 'inference');
  assert.equal(out.feasibility.level, 'unknown');
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
