// Pure evidence logic for Scout's enrichment. No I/O; unit-tested in scripts/test/.
//
// The readings here are deliberately qualitative (unknown / low / some / substantial …),
// computed by code from provider observations, each with the basis stated. Rules they
// encode, because each is an easy and expensive mistake:
//   - search volume is searches, not paying customers
//   - CPC is what advertisers bid, not what customers will pay
//   - Google Ads competition is auction pressure, not SEO difficulty
//   - overlapping keyword volumes are never summed into a "market size"
//   - missing data is unknown, never zero demand
//   - low measured volume is not a rejection — B2B and emerging problems often search little

export const KEYWORD_GROUPS = ['problem', 'solution', 'buying'];
export const LEVELS = ['unknown', 'weak', 'moderate', 'strong'];
export const DEMAND_LEVELS = ['unknown', 'low', 'some', 'substantial'];
export const COMPETITION_LEVELS = ['unknown', 'sparse', 'some', 'crowded'];
export const FEASIBILITY_LEVELS = ['unknown', 'hard', 'moderate', 'easy'];

export const MAX_KEYWORD_CHARS = 80;
export const MAX_KEYWORD_WORDS = 10;

const str = (v, max = 400) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export function normalizeKeyword(k) {
  return String(k ?? '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}\s'&+./-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function acceptableKeyword(k) {
  const t = normalizeKeyword(k);
  return t.length >= 3 && t.length <= MAX_KEYWORD_CHARS && t.split(' ').length <= MAX_KEYWORD_WORDS;
}

export function slugify(s, max = 48) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}

/**
 * Validate the planner's JSON into a bounded, de-duplicated research plan.
 * SERP queries must be drawn from the idea's own keywords.
 */
export function normalizePlan(raw, { maxIdeas = 3, keywordsPerGroup = 3, serpsPerIdea = 2 } = {}) {
  const list = Array.isArray(raw?.ideas) ? raw.ideas : [];
  const slugs = new Set();
  const ideas = [];
  for (const it of list) {
    if (ideas.length >= maxIdeas) break;
    const title = str(it?.title, 200);
    if (!title) continue;
    let slug = slugify(it?.slug || title) || slugify(title);
    if (!slug) continue;
    for (let n = 2; slugs.has(slug); n++) slug = `${slugify(it?.slug || title, 44)}-${n}`;

    const seen = new Set();
    const keywords = {};
    for (const g of KEYWORD_GROUPS) {
      keywords[g] = [];
      for (const k of Array.isArray(it?.keywords?.[g]) ? it.keywords[g] : []) {
        if (keywords[g].length >= keywordsPerGroup) break;
        const n = normalizeKeyword(k);
        if (!acceptableKeyword(n) || seen.has(n)) continue;
        seen.add(n);
        keywords[g].push(n);
      }
    }
    if (!seen.size) continue;

    let serpQueries = (Array.isArray(it?.serpQueries) ? it.serpQueries : []).map(normalizeKeyword).filter((q) => seen.has(q));
    if (!serpQueries.length) {
      serpQueries = [keywords.solution[0] ?? keywords.buying[0], keywords.problem[0]].filter(Boolean);
    }
    serpQueries = [...new Set(serpQueries)].slice(0, serpsPerIdea);

    slugs.add(slug);
    ideas.push({
      slug,
      title,
      problem: str(it?.problem, 600),
      targetCustomer: str(it?.targetCustomer, 400),
      payer: str(it?.payer, 400),
      whyPayerPays: str(it?.whyPayerPays, 600),
      // Proposed only; resolved against the configured market allowlist by the orchestrator.
      market:
        it?.market && typeof it.market === 'object'
          ? { location: str(it.market.location ?? it.market.locationName, 80), language: str(it.market.language ?? it.market.languageCode, 10).toLowerCase(), reason: str(it.market.reason, 300) }
          : null,
      keywords,
      serpQueries,
    });
  }
  return ideas;
}

// Keyword databases only hold phrasings people really type, so a plan made only of long,
// idea-specific phrases measures nothing. Category searches (solution, buying) need at least
// one short head term; problem searches are naturally questions, so only their length is bounded.
export const HEAD_TERM_MAX_WORDS = 3;
export const MAX_PROBLEM_WORDS = 6;
export const MAX_CATEGORY_WORDS = 5;
const wordCount = (k) => String(k).split(' ').filter(Boolean).length;

/** Shape problems of one normalized plan: [{ group, issue: 'no_head_term' | 'too_long', keyword?, max? }]. Pure. */
export function planShapeIssues(plan) {
  const issues = [];
  for (const g of ['solution', 'buying']) {
    const list = plan?.keywords?.[g] ?? [];
    if (!list.some((k) => wordCount(k) <= HEAD_TERM_MAX_WORDS)) issues.push({ group: g, issue: 'no_head_term' });
  }
  for (const g of KEYWORD_GROUPS) {
    const max = g === 'problem' ? MAX_PROBLEM_WORDS : MAX_CATEGORY_WORDS;
    for (const k of plan?.keywords?.[g] ?? []) if (wordCount(k) > max) issues.push({ group: g, issue: 'too_long', keyword: k, max });
  }
  return issues;
}

/** Plain-language description of shape issues, for the planner's one repair request. */
export function describeShapeIssues(issues) {
  return issues.map((x) =>
    x.issue === 'no_head_term'
      ? `the ${x.group} group has no keyword of ${HEAD_TERM_MAX_WORDS} words or fewer`
      : `"${x.keyword}" (${x.group}) has more than ${x.max} words`,
  );
}

// ---------- Demand ----------

const monthIndex = (m) => m.year * 12 + (m.month - 1);

/** Direction of a keyword's monthly history. Uses year-over-year when the history allows. */
export function summarizeTrend(monthlySearches) {
  const pts = (monthlySearches ?? []).filter(
    (m) => Number.isInteger(m?.year) && Number.isInteger(m?.month) && typeof m.searchVolume === 'number',
  );
  if (!pts.length) return { direction: 'unknown', changePct: null, basis: 'no monthly history returned' };
  const byIdx = new Map(pts.map((m) => [monthIndex(m), m.searchVolume]));
  const latest = Math.max(...byIdx.keys());
  const recentIdx = [latest, latest - 1, latest - 2];
  if (!recentIdx.every((i) => byIdx.has(i))) {
    return { direction: 'unknown', changePct: null, basis: 'recent months missing from history' };
  }
  let offset = null;
  let basis = null;
  if (recentIdx.every((i) => byIdx.has(i - 12))) {
    offset = 12;
    basis = 'last 3 months vs the same 3 months a year earlier';
  } else if (recentIdx.every((i) => byIdx.has(i - 9))) {
    offset = 9;
    basis = 'last 3 months vs 9 months earlier (seasonality not removed)';
  }
  if (offset === null) return { direction: 'unknown', changePct: null, basis: `only ${pts.length} months of history` };
  const avg = (idx) => idx.reduce((s, i) => s + byIdx.get(i), 0) / idx.length;
  const recent = avg(recentIdx);
  const baseline = avg(recentIdx.map((i) => i - offset));
  // Google volumes are bucketed (10, 20, 30…); below ~50/month a "trend" is rounding noise.
  if (baseline < 50) {
    return { direction: 'unknown', changePct: null, basis: `baseline too small to compare (${Math.round(baseline)} searches/month)` };
  }
  const changePct = Math.round(((recent - baseline) / baseline) * 100);
  const direction = changePct >= 20 ? 'rising' : changePct <= -20 ? 'declining' : 'flat';
  return { direction, changePct, basis };
}

/** A search-demand reading across one idea's keywords. Never sums volumes. */
export function demandReading(rows) {
  const total = rows.length;
  const measured = rows.filter((r) => typeof r.searchVolume === 'number');
  const caveat =
    'Volumes are separate, overlapping keywords and are not added together. Searches are not customers.';
  if (!measured.length) {
    return {
      level: 'unknown',
      measuredCount: 0,
      totalCount: total,
      top: null,
      trends: {},
      note: total
        ? `No search volume was returned for ${total} keyword(s). Unknown is not zero demand. ${caveat}`
        : 'No keywords were measured.',
    };
  }
  const top = measured.reduce((a, r) => (r.searchVolume > a.searchVolume ? r : a));
  const level = top.searchVolume >= 1000 ? 'substantial' : top.searchVolume >= 100 ? 'some' : 'low';
  const trends = {};
  for (const r of measured) {
    const d = r.trend?.direction ?? 'unknown';
    trends[d] = (trends[d] ?? 0) + 1;
  }
  const byGroup = {};
  for (const g of KEYWORD_GROUPS) {
    const inG = measured.filter((r) => r.group === g);
    if (inG.length) {
      const best = inG.reduce((a, r) => (r.searchVolume > a.searchVolume ? r : a));
      byGroup[g] = { keyword: best.keyword, searchVolume: best.searchVolume, id: best.id };
    }
  }
  const lowNote =
    level === 'low'
      ? ' Low measured volume is not evidence of low demand for B2B, regulated or emerging problems, where buyers often do not search.'
      : '';
  const missing = total - measured.length;
  return {
    level,
    measuredCount: measured.length,
    totalCount: total,
    top: { keyword: top.keyword, searchVolume: top.searchVolume, id: top.id },
    byGroup,
    trends,
    note: `Largest single keyword: "${top.keyword}" at ${top.searchVolume}/month.${missing ? ` ${missing} keyword(s) returned no data (unknown, not zero).` : ''}${lowNote} ${caveat}`,
  };
}

/** A fetched page that presents prices as an offer: a pricing/plans page, or prices with a billing unit. */
export function offerPrices(page) {
  const where = `${page.finalUrl ?? page.url ?? ''} ${page.title ?? ''}`;
  const pricingPage = /\/(pricing|plans|price|prices|packages)\b|\bpricing\b|\bplans\b/i.test(where);
  return (page.priceMentions ?? []).filter((m) => pricingPage || m.billingUnit);
}

/** Commercial intent and evidence of payment. Keeps ad signals and priced offers separate. */
export function commercialReading(rows, pages) {
  const commercial = rows.filter((r) => r.group !== 'problem');
  const bidding = commercial.filter((r) => typeof r.cpcUsd === 'number' && r.cpcUsd > 0);
  const contested = commercial.filter((r) => r.adCompetitionLevel === 'MEDIUM' || r.adCompetitionLevel === 'HIGH');
  const fetched = pages.filter((p) => p.status && p.status < 400 && !p.error);
  const priced = fetched.filter((p) => offerPrices(p).length);
  const pricedAll = [...new Set(priced.map((p) => String(p.domain).replace(/^www\./, '')))];
  const pricedPlatforms = pricedAll.filter((d) => classifyDomain(d) === 'platform');
  const pricedDomains = pricedAll.filter((d) => classifyDomain(d) !== 'platform');
  const hasData = rows.some((r) => typeof r.searchVolume === 'number' || typeof r.cpcUsd === 'number') || fetched.length > 0;

  const level =
    pricedDomains.length >= 2 ? 'strong' : pricedDomains.length === 1 || bidding.length || pricedPlatforms.length ? 'moderate' : hasData ? 'weak' : 'unknown';

  const parts = [];
  if (bidding.length) {
    const maxCpc = bidding.reduce((a, r) => (r.cpcUsd > a.cpcUsd ? r : a));
    parts.push(`Advertisers bid on ${bidding.length} commercial keyword(s) (highest CPC $${maxCpc.cpcUsd.toFixed(2)} on "${maxCpc.keyword}"). CPC is an advertiser bid, not a customer's willingness to pay.`);
  } else if (commercial.length) {
    parts.push('No advertiser CPC was returned for the commercial keywords.');
  }
  if (contested.length) parts.push(`${contested.length} keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty.`);
  if (pricedDomains.length) parts.push(`Published offer prices seen on ${pricedDomains.length} ranking site(s): ${pricedDomains.join(', ')}. Prices show what sellers ask, not verified sales, and a ranking site is not necessarily a direct competitor.`);
  if (pricedPlatforms.length) parts.push(`Broad platforms with their own pricing also rank (${pricedPlatforms.join(', ')}); that is not evidence buyers pay for this idea.`);
  if (!pricedAll.length && fetched.length) parts.push('No published offer prices were found on the fetched competitor pages.');
  if (!hasData) parts.push('No commercial data was collected.');

  return {
    level,
    biddingKeywordIds: bidding.map((r) => r.id),
    pricedPageIds: priced.map((p) => p.id),
    pricedDomains,
    pricedPlatforms,
    note: parts.join(' '),
  };
}

// ---------- Competitors ----------

const DOMAIN_CLASSES = [
  // Broad horizontal platforms: they rank for almost any template/tool query and publish their
  // own pricing, which says nothing about whether buyers pay for THIS idea. Kept visible as
  // alternatives, but their prices cannot make commercial evidence "strong".
  ['platform', ['figma.com', 'canva.com', 'notion.com', 'notion.so', 'miro.com', 'adobe.com', 'google.com', 'microsoft.com', 'atlassian.com', 'hubspot.com', 'salesforce.com', 'shopify.com', 'wix.com', 'squarespace.com', 'wordpress.com', 'linkedin.com', 'coursera.org', 'udemy.com', 'grammarly.com', 'openai.com', 'chatgpt.com', 'slack.com', 'zoom.us', 'airtable.com', 'monday.com', 'clickup.com', 'asana.com', 'trello.com', 'framer.com', 'webflow.com', 'uxpin.com', 'grafana.com']],
  ['discussion', ['reddit.com', 'quora.com', 'stackexchange.com', 'stackoverflow.com', 'news.ycombinator.com', 'facebook.com', 'x.com', 'twitter.com', 'indiehackers.com', 'biggerpockets.com', 'contractortalk.com']],
  ['review_directory', ['g2.com', 'capterra.com', 'getapp.com', 'softwareadvice.com', 'trustradius.com', 'trustpilot.com', 'sourceforge.net', 'producthunt.com', 'alternativeto.net', 'yelp.com', 'clutch.co', 'gartner.com', 'saasworthy.com', 'crozdesk.com', 'selecthub.com']],
  ['marketplace', ['amazon.com', 'etsy.com', 'ebay.com', 'apps.apple.com', 'play.google.com', 'apps.shopify.com', 'upwork.com', 'fiverr.com', 'gumroad.com', 'appsumo.com']],
  ['reference_media', ['wikipedia.org', 'youtube.com', 'investopedia.com', 'forbes.com', 'nerdwallet.com', 'indeed.com', 'glassdoor.com', 'pinterest.com', 'tiktok.com', 'instagram.com', 'medium.com', 'hubspot.com', 'nytimes.com', 'wsj.com']],
];

export function classifyDomain(domain) {
  const d = String(domain ?? '').toLowerCase().replace(/^www\./, '');
  if (!d) return 'unknown';
  if (/\.(gov|mil|int)(\.[a-z]{2})?$/.test(d) || d.endsWith('.europa.eu')) return 'government';
  if (/\.edu(\.[a-z]{2})?$/.test(d)) return 'reference_media';
  if (/(^|\.)(forum|forums|community|discuss)\./.test(d) || /forum/.test(d)) return 'discussion';
  if (/^amazon\.[a-z.]+$/.test(d)) return 'marketplace';
  for (const [cls, list] of DOMAIN_CLASSES) {
    if (list.some((x) => d === x || d.endsWith(`.${x}`))) return cls;
  }
  return 'site';
}

/** Aggregate SERP results across queries into domains, most-present first. */
export function aggregateDomains(serps) {
  const map = new Map();
  for (const s of serps) {
    for (const item of s.items ?? []) {
      const domain = String(item.domain ?? '').replace(/^www\./, '');
      if (!domain) continue;
      const cur = map.get(domain) ?? { domain, class: classifyDomain(domain), appearances: 0, bestRank: null, results: [] };
      cur.appearances += 1;
      cur.bestRank = cur.bestRank === null ? item.rank : Math.min(cur.bestRank, item.rank ?? cur.bestRank);
      cur.results.push({ id: item.id, query: s.query, rank: item.rank, url: item.url, title: item.title });
      map.set(domain, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.appearances - a.appearances || (a.bestRank ?? 99) - (b.bestRank ?? 99));
}

/** Code-only competitor facts, available even when no assessment was written. */
export function competitorSummary(serps, pages) {
  const domains = aggregateDomains(serps);
  const vendorLike = domains.filter((d) => d.class === 'site');
  const platforms = domains.filter((d) => d.class === 'platform');
  const priced = [...new Set(pages.filter((p) => !p.error && offerPrices(p).length).map((p) => p.domain))];
  return {
    vendorLikeDomains: vendorLike.map((d) => d.domain),
    platformDomains: platforms.map((d) => d.domain),
    discussionResults: domains.filter((d) => d.class === 'discussion' || d.class === 'review_directory').map((d) => d.domain),
    pricedDomains: priced,
    note: serps.length
      ? `${vendorLike.length} vendor-like or publisher domain(s)${platforms.length ? ` and ${platforms.length} broad platform(s) (${platforms.map((d) => d.domain).join(', ')})` : ''} rank across ${serps.length} quer${serps.length === 1 ? 'y' : 'ies'} (not all are competitors — some are consultants or publishers)${priced.length ? `; published offer prices on ${priced.join(', ')}` : ''}.`
      : 'No search results collected.',
  };
}

/** Which ranking sites to fetch as possible competitors (vendor-like domains only). */
export function competitorCandidates(serps, limit = 3) {
  return aggregateDomains(serps)
    .filter((d) => d.class === 'site' || d.class === 'platform')
    .slice(0, limit)
    .map((d) => ({ domain: d.domain, url: d.results[0].url, appearances: d.appearances, bestRank: d.bestRank }));
}

// ---------- Citations ----------

export function normalizeUrl(u) {
  try {
    const x = new URL(u);
    x.hash = '';
    return `${x.protocol}//${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/+$/, '')}${x.search}`;
  } catch {
    return String(u);
  }
}

/** Replace any URL the evidence set does not contain. Returns the cleaned text and a count. */
export function stripUnverifiedUrls(text, allowedUrls) {
  const allowed = new Set([...allowedUrls].map(normalizeUrl));
  let removed = 0;
  const cleaned = String(text ?? '').replace(/https?:\/\/[^\s)\]>"'`]+/g, (u) => {
    const trimmed = u.replace(/[.,;:!?]+$/, '');
    if (allowed.has(normalizeUrl(trimmed))) return u;
    removed += 1;
    return '[unverified link removed]';
  });
  return { text: cleaned, removed };
}

/** Keep only evidence IDs that exist; a claimed level with no valid basis becomes "unknown". */
export function constrainReading(reading, { levels, validIds }) {
  const level = levels.includes(reading?.level) ? reading.level : 'unknown';
  const basis = (Array.isArray(reading?.basis) ? reading.basis : []).map(String).filter((id) => validIds.has(id));
  return {
    level: level !== 'unknown' && !basis.length ? 'unknown' : level,
    basis: [...new Set(basis)],
    downgraded: level !== 'unknown' && !basis.length,
  };
}
