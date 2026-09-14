// Grounding checks for model-written assessments. Pure; unit-tested in scripts/test/.
//
// A valid evidence ID is not proof. A citation only supports a claim when it carries a
// verbatim quote that actually appears in the cited item, and the item is the right KIND of
// evidence for the claim:
//   - problem evidence cannot rest on keyword rows (a search volume is not someone describing a problem)
//   - "strong" needs two independent domains; "crowded" needs three vendor-like domains
//   - "sparse" competition is contradicted when the collected results show several vendors
//   - a claim that something is ABSENT ("no mobile app") cannot be observed from a quote → inference
//   - statements about search demand the evidence did not measure are removed, not softened

const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"'(])/;

export function normText(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’´`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Is `quote` verbatim in `hay`? Quotes may elide with "..." / "…": then every fragment must
 * appear, in order. At least `minChars` letters/digits must be quoted in total, and each
 * fragment must be long enough (8+) to be meaningful.
 */
export function quoteFound(hay, quote, { minChars = 12 } = {}) {
  const q = normText(quote).replace(/^["'“”]+|["'“”]+$/g, '');
  const fragments = q.split(/\.{3}|…/).map((f) => f.trim()).filter(Boolean);
  const letters = (f) => f.replace(/[^\p{L}\p{N}]/gu, '').length;
  if (!fragments.length || fragments.reduce((n, f) => n + letters(f), 0) < minChars) return { found: false, reason: 'quote too short to check' };
  if (fragments.length > 1 && fragments.some((f) => letters(f) < 8)) return { found: false, reason: 'quote too short to check' };
  let at = 0;
  for (const f of fragments) {
    const i = hay.indexOf(f, at);
    if (i < 0) return { found: false, reason: 'quote not found in the cited item' };
    at = i + f.length;
  }
  return { found: true, reason: null };
}

/** id → { id, kind: 'K'|'S'|'P', domain, cls, text } for everything the model may cite. */
export function evidenceIndex(idea) {
  const index = new Map();
  for (const k of idea.keywords ?? []) {
    if (k.status === 'not_collected') continue;
    index.set(k.id, {
      id: k.id,
      kind: 'K',
      domain: null,
      cls: 'keyword',
      text: normText(`${k.keyword} ${typeof k.searchVolume === 'number' ? `${k.searchVolume} searches/month` : 'no data'}`),
    });
  }
  for (const s of idea.serps ?? []) {
    for (const i of s.items ?? []) {
      index.set(i.id, { id: i.id, kind: 'S', domain: i.domain?.replace(/^www\./, '') ?? null, cls: i.class, text: normText(`${i.title ?? ''} ${i.description ?? ''} ${i.url ?? ''} ${i.domain ?? ''}`) });
    }
  }
  for (const p of idea.pages ?? []) {
    if (p.error) continue;
    index.set(p.id, {
      id: p.id,
      kind: 'P',
      domain: p.domain?.replace(/^www\./, '') ?? null,
      cls: 'page',
      text: normText(`${p.title ?? ''} ${p.description ?? ''} ${(p.priceMentions ?? []).map((m) => m.context).join(' ')} ${p.finalUrl ?? p.url ?? ''} ${p.domain ?? ''}`),
    });
  }
  return index;
}

/**
 * Split citations into supported ones (known id + verbatim quote found in that item) and
 * rejected ones with the reason.
 */
export function checkBasis(basis, index, { minQuoteChars = 12 } = {}) {
  const supported = [];
  const rejected = [];
  for (const b of Array.isArray(basis) ? basis : []) {
    const id = typeof b === 'string' ? b : String(b?.id ?? '');
    const quote = typeof b === 'object' && b ? normText(b.quote) : '';
    const item = index.get(id);
    if (!item) rejected.push({ id, reason: 'unknown evidence id' });
    else if (!quote) rejected.push({ id, reason: 'no quote' });
    else {
      const q = quoteFound(item.text, quote, { minChars: minQuoteChars });
      if (!q.found) rejected.push({ id, reason: q.reason });
      else if (!supported.some((s) => s.id === id)) supported.push({ id, quote: b.quote, domain: item.domain, kind: item.kind, cls: item.cls });
    }
  }
  return { supported, rejected };
}

const distinctDomains = (items) => new Set(items.map((s) => s.domain).filter(Boolean)).size;

/** Problem evidence: people describing the problem — search results or pages, never keyword rows. */
export function capProblemLevel(level, supported) {
  const sources = supported.filter((s) => s.kind !== 'K');
  const domains = distinctDomains(sources);
  if (!['weak', 'moderate', 'strong'].includes(level)) return { level: 'unknown', why: null };
  if (!sources.length) return { level: 'unknown', why: supported.length ? 'only keyword rows were cited' : 'no citation was supported by a verbatim quote' };
  if (level === 'strong' && domains < 2) return { level: 'moderate', why: 'strong needs two independent domains' };
  return { level, why: null };
}

/** Competition: vendor-like results/pages count; "sparse" must not contradict what was collected. */
export function capCompetitionLevel(level, supported, competitors) {
  const vendorish = supported.filter((s) => s.kind === 'P' || ['site', 'platform', 'review_directory', 'marketplace'].includes(s.cls));
  const domains = distinctDomains(vendorish);
  const seenVendors = competitors?.vendorLikeDomains?.length ?? 0;
  if (level === 'sparse') {
    if (seenVendors > 2) return { level: 'unknown', why: `"sparse" contradicts ${seenVendors} vendor-like domains in the collected results`, contradiction: true };
    return { level: 'sparse', why: null };
  }
  if (!['some', 'crowded'].includes(level)) return { level: 'unknown', why: null };
  if (!domains) return { level: 'unknown', why: 'no competitor citation was supported by a verbatim quote' };
  if (level === 'crowded' && domains < 3) return { level: 'some', why: 'crowded needs three distinct vendor-like domains' };
  return { level, why: null };
}

export const ABSENCE = /\b(no|not|lacks?|lacking|missing|without|absent|doesn'?t|don'?t|none|never|fails? to|unable)\b/i;

const STOP = new Set(['the', 'and', 'for', 'app', 'software', 'tool', 'tools', 'inc', 'llc', 'ltd', 'com', 'www', 'online', 'platform']);
/** An alternative's name must appear in what it cites (quote, domain or item text). */
export function nameMatchesEvidence(name, supported, index) {
  const tokens = normText(name).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 3 && !STOP.has(t));
  if (!tokens.length) return false;
  return supported.some((s) => {
    const hay = `${normText(s.quote)} ${s.domain ?? ''} ${index.get(s.id)?.text ?? ''}`;
    return tokens.some((t) => hay.includes(t));
  });
}

/**
 * Remove sentences that claim more about search demand than was measured:
 *   - a figure or "no/zero searches" for a keyword with no data
 *   - a figure for a measured keyword that differs from the measurement
 *   - about SEARCH: "low / no demand" when demand was not measured; "no demand" when it was merely low;
 *     "strong / clear / high … demand" when the measured reading is below "substantial"
 * Rules about levels apply only to sentences that talk about search (search, keyword, Google,
 * SEO, volume), so experiment criteria like "…indicating limited interest" are left alone.
 * Every removed sentence is returned for audit.
 */
export function scrubDemandClaims(text, idea) {
  const keywords = (idea.keywords ?? []).map((k) => ({ ...k, n: normText(k.keyword) }));
  const level = idea.readings?.demand?.level ?? 'unknown';
  let removed = 0;
  const removedSentences = [];
  const volumeFigure = /(\d[\d,.]*)\s*(k\b)?\s*(monthly searches|searches|search volume|\/\s?mo\b|per month|a month|\/month)/i;
  const out = String(text ?? '')
    .split(SENTENCE_SPLIT)
    .map((sentence) => {
      const n = normText(sentence);
      const mentioned = keywords.filter((k) => k.n && n.includes(k.n));
      let bad = false;
      for (const k of mentioned) {
        const fig = n.match(volumeFigure);
        if (k.status !== 'measured') {
          if (fig || /\b(zero|no|nobody|no one)\b.{0,20}\bsearch/i.test(n)) bad = true;
        } else if (fig) {
          const said = Number(fig[1].replace(/[,]/g, '')) * (fig[2] ? 1000 : 1);
          if (Number.isFinite(said) && said !== k.searchVolume) bad = true;
        }
      }
      const aboutSearch = /\b(search|searches|searching|keywords?|google|seo|search volume)\b/i.test(n) || mentioned.length > 0;
      if (aboutSearch) {
        if (level === 'unknown' && /\b(low|little|weak|no|zero|minimal|limited|negligible)\s+(search\s+)?(demand|volume|interest)\b/i.test(n)) bad = true;
        if (level !== 'unknown' && /\b(no|zero)\s+(search\s+)?demand\b|nobody searches|no one searches/i.test(n)) bad = true;
        if (level !== 'substantial' && /\b(strong|clear|high|large|significant|substantial|huge|massive|big|proven)\s+(search\s+)?(demand|interest|volume)\b/i.test(n)) bad = true;
      }
      if (!bad) return sentence;
      removed += 1;
      removedSentences.push(sentence.trim());
      return '[removed: a statement about search demand that the collected evidence does not show]';
    })
    .join(' ');
  return { text: out, removed, removedSentences };
}
