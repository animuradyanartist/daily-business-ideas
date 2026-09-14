// Preload for the offline pipeline test: replaces global fetch with canned Gemini,
// DataForSEO, Supabase-ledger and website responses, and logs every call to FAKE_NET_LOG.
// FAKE DATA ONLY — used to prove the daily pipeline's wiring, never as live evidence.
import { appendFileSync } from 'node:fs';

const log = (entry) => process.env.FAKE_NET_LOG && appendFileSync(process.env.FAKE_NET_LOG, JSON.stringify(entry) + '\n');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const gem = (text) => json({ candidates: [{ content: { parts: [{ text }] } }] });

const SCAN = `## Candidates
1. Lien waiver tracker for subcontractors — pain signal on forums.
2. Keg tracking for small breweries — pain signal on r/TheBrewery.
3. Pesticide application log — pain signal on extension forums.

## Shortlist
1. Lien waiver tracker for subcontractors — strongest wallet signal.
2. Keg tracking for small breweries — clear replacement cost.
3. Pesticide application log — regulatory trigger.`;

const PLAN = {
  ideas: [
    ['Lien waiver tracker for subcontractors', 'lien waiver'],
    ['Keg tracking for small breweries', 'keg tracking'],
    ['Pesticide application log', 'pesticide application record'],
  ].map(([title, stem]) => ({
    title,
    slug: title,
    problem: `${title} problem`,
    targetCustomer: 'small operators',
    payer: 'the owner',
    whyPayerPays: 'avoid losses',
    keywords: { problem: [`how to manage ${stem}`], solution: [`${stem} software`], buying: [`${stem} software pricing`] },
    serpQueries: [`${stem} software`, `how to manage ${stem}`],
  })),
};

const MEMO = `# Lien waiver tracker for subcontractors

_2026-01-01 · conviction: medium · score: 71/100_

## The idea
A tracker.

## Who pays and why
Subcontractors.

## Conviction score
**Total: 71/100 → conviction: medium**

## Candidates I considered and killed today
- Keg tracking — thinner wallet proof

## What I learned today
- Fake learning for the offline test.

## Market map update
(new niche)
## Lien waivers
- Buyer: subs
- Last researched: 2026-01-01
- Status: open

## Market atlas entry
slug: lien-waivers
market: Lien waiver software
- TAM/SAM/SOM: fake
`;

// Fake relevance judge: "… pricing" keywords are the category, "… software" the idea's own job, others
// wider; reddit threads are the same customer and problem, vendor pages direct competitors.
function relevanceFrom(prompt) {
  const { ideas } = JSON.parse(prompt.slice(prompt.indexOf('=== IDEAS ===') + 13));
  return {
    ideas: ideas.map((i) => ({
      id: i.id,
      keywords: i.keywords.map((k) => ({ id: k.id, searcher: 'includes', topic: /pricing/.test(k.keyword) ? 'category' : /software/.test(k.keyword) ? 'same' : 'wider', reason: 'fake judgement' })),
      items: i.items.map((it) => ({ id: it.id, customer: /reddit/.test(it.domain) ? 'same' : 'broader', problem: 'same', offering: /reddit/.test(it.domain) ? 'no' : 'yes', reason: 'fake judgement' })),
    })),
  };
}

function assessFrom(prompt) {
  const evidence = JSON.parse(prompt.slice(prompt.indexOf('=== EVIDENCE ===') + 16));
  return {
    ideas: evidence.ideas.map((i) => {
      const s = i.searchResults[0]?.items[0];
      const p = i.pages[0];
      return {
        id: i.id,
        opportunity: `Opportunity for ${i.title}. Source: https://invented.example/report`,
        whoPays: 'Owners (inference).',
        // One grounded citation and one bare id — the pipeline must keep the first and reject the second.
        problemEvidence: { level: 'moderate', basis: s ? [{ id: s.id, quote: s.url }, s.id] : [], observed: 'A ranking thread describes the pain.', inference: 'Likely recurring.' },
        competition: { level: 'some', basis: p ? [{ id: p.id, quote: 'Vendor pricing' }] : [], alternatives: p ? [{ name: 'Vendor', what: 'Tracking tool', basis: [{ id: p.id, quote: 'Vendor pricing' }] }] : [], strengths: [], gaps: [{ text: 'No mobile app', basis: [], kind: 'observed' }] },
        feasibility: { level: 'easy', note: 'Landing page + 20 calls.' },
        unproven: ['Willingness to pay'],
        nextExperiment: { what: 'Call 20 owners', cost: '$0 + 10h', duration: '1 week' },
        continueIf: '5 of 20 agree to a paid pilot',
        stopIf: 'fewer than 2 of 20 see it as a top-3 problem',
        confidence: '87%',
      };
    }),
  };
}

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const method = init.method ?? 'GET';
  const body = init.body ? JSON.parse(init.body) : null;
  log({ url: url.replace(/key=[^&]+/, 'key=REDACTED'), method, body: url.includes('budget.fake') ? body : undefined });

  if (url.includes('generativelanguage.googleapis.com')) {
    const prompt = body.contents[0].parts[0].text;
    if (prompt.includes('STAGE 1 of 6')) return gem(SCAN);
    if (prompt.includes('You prepare search-evidence research plans')) return gem(JSON.stringify(PLAN));
    if (prompt.includes('You judge whether search evidence is about ONE business idea')) return gem(JSON.stringify(relevanceFrom(prompt)));
    if (prompt.includes('You write evidence-bound assessments')) return gem(JSON.stringify(assessFrom(prompt)));
    if (prompt.includes('Synthesise the FINAL decision memo')) return gem(MEMO);
    return gem('Fake stage output for the offline pipeline test. '.repeat(4));
  }

  if (url.startsWith('https://api.dataforseo.com/v3/')) {
    const path = url.slice('https://api.dataforseo.com/v3'.length);
    if (path === '/appendix/user_data') return json({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ money: { balance: 10 } }] }] });
    if (path === '/dataforseo_labs/locations_and_languages') {
      return json({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ location_name: 'United States', location_code: 2840, available_languages: [{ language_code: 'en', available_sources: ['google'], keywords: 1 }] }] }] });
    }
    if (path.includes('keyword_overview')) {
      const items = body[0].keywords.filter((k) => !k.startsWith('how to')).map((k) => ({ keyword: k, keyword_info: { search_volume: 140, cpc: 11.5, competition_level: 'MEDIUM', monthly_searches: [] } }));
      return json({ status_code: 20000, cost: 0.0131, tasks: [{ status_code: 20000, result: [{ items }] }] });
    }
    if (path.includes('/serp/')) {
      const slug = body[0].keyword.split(' ')[0];
      return json({ status_code: 20000, cost: 0.002, tasks: [{ status_code: 20000, result: [{ check_url: 'https://www.google.com/search?q=x', items: [
        { type: 'organic', rank_absolute: 1, domain: 'www.reddit.com', url: `https://www.reddit.com/r/x/${slug}`, title: 'Thread' },
        { type: 'organic', rank_absolute: 2, domain: `${slug}-vendor.test`, url: `https://${slug}-vendor.test/`, title: 'Vendor' },
      ] }] }] });
    }
  }

  // Fake shared budget (db/dataforseo_budget.sql over Supabase RPC): everything fits.
  if (url.startsWith('https://budget.fake/rest/v1/rpc/')) {
    const fn = url.split('/').pop();
    if (fn === 'dataforseo_budget_status') return json({ ok: true, cap_usd: 2, charged_usd: 0, held_usd: 0, uncertain_holds: 0 });
    if (fn === 'dataforseo_budget_reserve') return json({ ok: true, hold_id: body.p_hold_id, cap_usd: 2, ceiling_usd: 1, charged_usd: 0, held_usd: body.p_estimated_usd });
    return json({ ok: true, hold_id: body.p_hold_id });
  }

  if (url.includes('-vendor.test')) {
    if (url.endsWith('/robots.txt')) return new Response('', { status: 404 });
    return new Response('<title>Vendor pricing</title><p>$59/mo per user</p>', { status: 200, headers: { 'content-type': 'text/html' } });
  }

  throw new TypeError(`offline test: unexpected network call to ${url}`);
};
