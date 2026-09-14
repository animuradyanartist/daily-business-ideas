import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePlan,
  summarizeTrend,
  demandReading,
  commercialReading,
  offerPrices,
  classifyDomain,
  competitorCandidates,
  stripUnverifiedUrls,
  constrainReading,
  LEVELS,
} from '../lib/evidence.mjs';
import { extractPageSignals, robotsAllows } from '../lib/pages.mjs';

test('normalizePlan bounds, de-duplicates and keeps SERP queries inside the keyword set', () => {
  const ideas = normalizePlan(
    {
      ideas: [
        {
          title: 'Lien waiver tracker',
          slug: 'lien waiver tracker',
          keywords: {
            problem: ['How to track lien waivers?', 'how to track lien waivers', 'lien waiver deadline', 'x'],
            solution: ['lien waiver software', 'lien waiver template', 'lien waiver app', 'fourth one'],
            buying: ['lien waiver software pricing'],
          },
          serpQueries: ['not a keyword', 'lien waiver software'],
        },
        { title: 'No keywords', keywords: {} },
        { title: 'Lien waiver tracker', keywords: { problem: ['another problem here'] } },
      ],
    },
    { maxIdeas: 3, keywordsPerGroup: 3, serpsPerIdea: 2 },
  );
  assert.equal(ideas.length, 2);
  assert.equal(ideas[0].slug, 'lien-waiver-tracker');
  assert.equal(ideas[1].slug, 'lien-waiver-tracker-2');
  assert.deepEqual(ideas[0].keywords.problem, ['how to track lien waivers', 'lien waiver deadline']);
  assert.equal(ideas[0].keywords.solution.length, 3);
  assert.deepEqual(ideas[0].serpQueries, ['lien waiver software']);
  // fallback when the model gives no valid query: first solution + first problem
  assert.deepEqual(ideas[1].serpQueries, ['another problem here']);
});

test('summarizeTrend uses year-over-year when possible and refuses tiny baselines', () => {
  const months = [];
  for (let i = 0; i < 15; i++) {
    const d = new Date(Date.UTC(2026, 7 - i, 1));
    months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, searchVolume: i < 3 ? 200 : 100 });
  }
  // bucketed volumes around 10/month are noise, not a trend
  assert.equal(summarizeTrend(months.map((m, i) => ({ ...m, searchVolume: i < 3 ? 20 : 10 }))).direction, 'unknown');
  const t = summarizeTrend(months);
  assert.equal(t.direction, 'rising');
  assert.equal(t.changePct, 100);
  assert.match(t.basis, /a year earlier/);

  const tiny = months.map((m) => ({ ...m, searchVolume: 3 }));
  assert.equal(summarizeTrend(tiny).direction, 'unknown');
  assert.equal(summarizeTrend([]).direction, 'unknown');
});

test('demandReading never sums volumes, keeps null as unknown and does not reject low volume', () => {
  const rows = [
    { id: 'K1', keyword: 'a', group: 'problem', searchVolume: 40 },
    { id: 'K2', keyword: 'b', group: 'solution', searchVolume: 70 },
    { id: 'K3', keyword: 'c', group: 'buying', searchVolume: null },
  ];
  const r = demandReading(rows);
  assert.equal(r.level, 'low');
  assert.equal(r.top.searchVolume, 70); // the largest single keyword, not 110
  assert.ok(!('totalVolume' in r));
  assert.match(r.note, /not added together/);
  assert.match(r.note, /not evidence of low demand/);
  assert.match(r.note, /unknown, not zero/);

  const none = demandReading([{ id: 'K1', keyword: 'a', group: 'problem', searchVolume: null }]);
  assert.equal(none.level, 'unknown');
  assert.match(none.note, /Unknown is not zero demand/);
});

test('commercialReading separates advertiser bids from published prices', () => {
  const rows = [
    { id: 'K1', keyword: 'x software', group: 'solution', searchVolume: 300, cpcUsd: 12.5, adCompetitionLevel: 'HIGH' },
    { id: 'K2', keyword: 'how x', group: 'problem', searchVolume: 900, cpcUsd: 40 },
  ];
  const bidsOnly = commercialReading(rows, []);
  assert.equal(bidsOnly.level, 'moderate');
  assert.deepEqual(bidsOnly.biddingKeywordIds, ['K1']); // problem keywords are not commercial intent
  assert.match(bidsOnly.note, /not a customer's willingness to pay/);
  assert.match(bidsOnly.note, /not SEO difficulty/);

  const pages = [
    { id: 'P1', domain: 'a.com', url: 'https://a.com/', status: 200, error: null, priceMentions: [{ text: '$49/mo', billingUnit: true }] },
    { id: 'P2', domain: 'b.com', url: 'https://b.com/pricing', status: 200, error: null, priceMentions: [{ text: '$1,200', billingUnit: false }] },
  ];
  assert.equal(commercialReading(rows, pages).level, 'strong');
  assert.equal(commercialReading([], []).level, 'unknown');

  // Numbers quoted in an article are not offer prices (the pilot's "$80,000" CPA blog post).
  const article = [{ id: 'P1', domain: 'cpa.com', url: 'https://cpa.com/learning-center/sbir-102', title: 'SBIR accounting basics', status: 200, error: null, priceMentions: [{ text: '$80,000', billingUnit: false }] }];
  assert.equal(commercialReading([], article).level, 'weak');
  assert.deepEqual(offerPrices(article[0]), []);
});

test('classifyDomain and competitorCandidates keep discussion and directories out of the competitor list', () => {
  assert.equal(classifyDomain('www.reddit.com'), 'discussion');
  assert.equal(classifyDomain('g2.com'), 'review_directory');
  assert.equal(classifyDomain('amazon.co.uk'), 'marketplace');
  assert.equal(classifyDomain('osha.gov'), 'government');
  assert.equal(classifyDomain('contractorforum.example'), 'discussion');
  assert.equal(classifyDomain('levelset.com'), 'site');

  const serps = [
    { query: 'q1', items: [{ id: 'S1.1', rank: 1, domain: 'reddit.com', url: 'https://reddit.com/r/x' }, { id: 'S1.2', rank: 2, domain: 'vendor-a.com', url: 'https://vendor-a.com/' }] },
    { query: 'q2', items: [{ id: 'S2.1', rank: 1, domain: 'vendor-b.com', url: 'https://vendor-b.com/x' }, { id: 'S2.4', rank: 4, domain: 'vendor-a.com', url: 'https://vendor-a.com/y' }] },
  ];
  const c = competitorCandidates(serps, 3);
  assert.deepEqual(c.map((x) => x.domain), ['vendor-a.com', 'vendor-b.com']);
});

test('stripUnverifiedUrls removes links that are not in the evidence', () => {
  const r = stripUnverifiedUrls('See https://www.vendor-a.com/pricing/. And https://made-up.com/x', ['https://vendor-a.com/pricing']);
  assert.equal(r.removed, 1);
  assert.match(r.text, /vendor-a\.com\/pricing/);
  assert.match(r.text, /\[unverified link removed\]/);
});

test('constrainReading downgrades a claimed level without valid evidence ids', () => {
  const valid = new Set(['S1.1']);
  assert.deepEqual(constrainReading({ level: 'strong', basis: ['S9.9'] }, { levels: LEVELS, validIds: valid }), { level: 'unknown', basis: [], downgraded: true });
  assert.equal(constrainReading({ level: 'moderate', basis: ['S1.1'] }, { levels: LEVELS, validIds: valid }).level, 'moderate');
  assert.equal(constrainReading({ level: '87%', basis: ['S1.1'] }, { levels: LEVELS, validIds: valid }).level, 'unknown');
});

test('extractPageSignals reads title, prices and sales-model wording', () => {
  const s = extractPageSignals(`<html><head><title>Acme &amp; Co — Pricing</title><meta name="description" content="Plans for teams"></head>
    <body><script>var p="$1000";</script><h2>Starter</h2><p>$49/mo per user</p><p>Pro $1,299 per year</p><a>Start free trial</a><a>Contact sales</a></body></html>`);
  assert.equal(s.title, 'Acme & Co — Pricing');
  assert.equal(s.description, 'Plans for teams');
  assert.deepEqual(s.priceMentions.map((m) => [m.text, m.billingUnit]), [['$49/mo', true], ['$1,299 per year', true]]);
  const prose = extractPageSignals('<p>A market worth $1.9 billion, and a $295,000 award.</p>');
  assert.deepEqual(prose.priceMentions.map((m) => [m.text, m.billingUnit]), [['$295,000', false]]);
  assert.equal(s.mentionsFreeTrial, true);
  assert.equal(s.mentionsContactSales, true);
});

test('robotsAllows honours the * group with longest-match allow', () => {
  const txt = 'User-agent: Googlebot\nDisallow:\n\nUser-agent: *\nDisallow: /pricing\nAllow: /pricing/public\n';
  assert.equal(robotsAllows(txt, '/'), true);
  assert.equal(robotsAllows(txt, '/pricing'), false);
  assert.equal(robotsAllows(txt, '/pricing/public'), true);
  assert.equal(robotsAllows(null, '/pricing'), true);
});

test('page fetcher refuses private and metadata addresses without a network call', async () => {
  const { createPageFetcher } = await import('../lib/pages.mjs');
  let calls = 0;
  const fetchPage = createPageFetcher({ fetchImpl: async () => (calls++, new Response('')) });
  for (const url of ['http://169.254.169.254/latest/meta-data', 'http://172.20.0.1/', 'http://[::1]/', 'http://printer.local/', 'file:///etc/passwd']) {
    const r = await fetchPage(url);
    assert.equal(r.error, 'not a public web URL', url);
  }
  assert.equal(calls, 0);
});
