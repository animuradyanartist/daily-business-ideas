// Relevance of the collected evidence to ONE idea's target customer and problem.
//
// A verbatim quote proves an item says something; it does not prove the item is about the
// idea's customer or problem ("Interviewing someone with a language barrier" is about the
// PARTICIPANT's language, not a non-native researcher). So every keyword and every search
// result / page is judged before it can count:
//
//   keyword  → searcher (includes | excludes | unclear the target customer)
//              topic    (same job or product | the category the idea sells into | a wider market | unclear)
//   item     → customer (same | broader | different | unclear) × problem (same | broader | different | unclear)
//              offering (yes | no | unclear): is it something the customer could use instead?
//
// A model gives those answers with a short reason; CODE derives the class, so the rules are
// auditable and a missing, malformed or "unclear" answer is UNCERTAIN — never counted as
// relevant. The judgements are fallible: ambiguous cases are flagged, not hidden.

import { demandReading } from './evidence.mjs';

export const KEYWORD_CLASSES = ['direct', 'category', 'broader', 'uncertain'];
export const ITEM_CLASSES = ['direct', 'category', 'broader', 'unrelated', 'uncertain'];
export const COMPETITOR_TYPES = ['direct', 'indirect', 'none', 'uncertain'];

const pick = (v, allowed) => (allowed.includes(v) ? v : null);
const reasonOf = (j) => (typeof j?.reason === 'string' ? j.reason.replace(/\s+/g, ' ').trim().slice(0, 300) : '');

/** Class of a keyword from its judgement. Pure. */
export function keywordClass(j) {
  const searcher = pick(j?.searcher, ['includes', 'excludes', 'unclear']);
  const topic = pick(j?.topic, ['same', 'category', 'wider', 'unclear']);
  if (!searcher || !topic || !reasonOf(j) || searcher === 'unclear' || topic === 'unclear') return 'uncertain';
  if (searcher === 'excludes' || topic === 'wider') return 'broader';
  return topic === 'same' ? 'direct' : 'category';
}

/** Problem-evidence class of a search result or page from its judgement. Pure. */
export function itemClass(j) {
  const customer = pick(j?.customer, ['same', 'broader', 'different', 'unclear']);
  const problem = pick(j?.problem, ['same', 'broader', 'different', 'unclear']);
  if (!customer || !problem || !reasonOf(j) || customer === 'unclear' || problem === 'unclear') return 'uncertain';
  if (customer === 'different' || problem === 'different') return 'unrelated';
  if (customer === 'same' && problem === 'same') return 'direct';
  if (customer === 'same' || problem === 'same') return 'category';
  return 'broader';
}

/**
 * Competitor type: a direct competitor offers a way to solve the SAME problem to a customer
 * group that includes the target; an indirect alternative solves a broader or adjacent problem
 * the customer could use instead (free templates, general tools). Pure.
 */
export function competitorType(j) {
  const offering = pick(j?.offering, ['yes', 'no', 'unclear']);
  const cls = itemClass(j);
  if (!offering || offering === 'unclear' || cls === 'uncertain') return 'uncertain';
  if (offering === 'no' || cls === 'unrelated') return 'none';
  if (j.problem === 'same') return 'direct';
  return 'indirect';
}

export function relevancePrompt(bundle) {
  return `You judge whether search evidence is about ONE business idea's target customer and problem. You do not judge whether the idea is good.

For each idea you get its target customer, problem and payer, the keywords that were measured, and the search results and fetched pages that were collected. Answer for EVERY keyword and EVERY item id.

KEYWORDS — {"id": "K1", "searcher": "...", "topic": "...", "reason": "..."}
- searcher: "includes" if people typing it plausibly include the target customer; "excludes" if they are mostly someone else; "unclear".
- topic: "same" = the idea's own job, problem or product (e.g. for a bookkeeping template pack for freelance photographers: "photography business bookkeeping"); "category" = the product category the idea is sold into, not its specific angle ("bookkeeping spreadsheet template"); "wider" = a wider market than the idea sells into ("excel templates", "accounting software", "business course"); "unclear" if you cannot tell.
- A short generic term is almost never "same". Search volume is irrelevant to this judgement — judge the words, not the numbers.

ITEMS (search results S… and pages P…) — {"id": "S1.3", "customer": "...", "problem": "...", "offering": "...", "reason": "..."}
- customer: who the item is about or for. "same" = the idea's target customer; "broader" = a wider group that includes them (all small-business owners, all office workers); "different" = someone else; "unclear".
- problem: "same" = the idea's specific problem; "broader" = a wider or adjacent problem; "different" = another problem; "unclear".
- Watch for look-alikes that share words but not the person: for an idea helping landlords screen tenants, "how tenants can screen a landlord" is customer "different". Generic scheduling pain for all office workers is customer "broader", not "same", for an idea aimed at night-shift nurses.
- offering: "yes" if it is a product, service, template, course or tool someone could use or buy instead; "no" for articles, threads, papers and news that only discuss the topic; "unclear".
- reason: one short sentence naming who the item or keyword is about and what problem, compared with the idea's customer and problem.

Return JSON only: {"ideas":[{"id":"","keywords":[...],"items":[...]}]}

=== IDEAS ===
${JSON.stringify(bundle)}`;
}

export function relevanceBundle(idea) {
  return {
    id: idea.id,
    title: idea.title,
    targetCustomer: idea.plan?.targetCustomer ?? '',
    problem: idea.plan?.problem ?? '',
    payer: idea.plan?.payer ?? '',
    keywords: (idea.keywords ?? []).filter((k) => k.status !== 'not_collected').map((k) => ({ id: k.id, keyword: k.keyword, group: k.group })),
    items: [
      ...(idea.serps ?? []).flatMap((s) => (s.items ?? []).map((i) => ({ id: i.id, query: s.query, domain: i.domain, title: i.title, snippet: i.description }))),
      ...(idea.pages ?? []).filter((p) => !p.error).map((p) => ({ id: p.id, domain: p.domain, title: p.title, description: p.description })),
    ],
  };
}

/** Keep only well-formed judgements for ids that exist; everything else stays unjudged (uncertain). Pure. */
export function normalizeRelevance(raw, idea, { at, models } = {}) {
  const bundle = relevanceBundle(idea);
  const kwIds = new Set(bundle.keywords.map((k) => k.id));
  const itemIds = new Set(bundle.items.map((i) => i.id));
  const keywords = {};
  const items = {};
  for (const j of Array.isArray(raw?.keywords) ? raw.keywords : []) {
    const id = String(j?.id ?? '');
    if (kwIds.has(id) && !keywords[id]) keywords[id] = { searcher: j.searcher ?? null, topic: j.topic ?? null, reason: reasonOf(j) };
  }
  for (const j of Array.isArray(raw?.items) ? raw.items : []) {
    const id = String(j?.id ?? '');
    if (itemIds.has(id) && !items[id]) items[id] = { customer: j.customer ?? null, problem: j.problem ?? null, offering: j.offering ?? null, reason: reasonOf(j) };
  }
  return {
    at: at ?? null,
    models: models ?? null,
    evidenceUpdatedAt: idea.evidenceUpdatedAt ?? null,
    keywords,
    items,
    missing: [...[...kwIds].filter((id) => !keywords[id]), ...[...itemIds].filter((id) => !items[id])],
  };
}

/** Class lookups for one idea; an idea without a stored judgement is entirely uncertain. */
export function relevanceOf(idea) {
  const rel = idea?.relevance ?? null;
  return {
    classified: Boolean(rel),
    keyword: (id) => keywordClass(rel?.keywords?.[id]),
    item: (id) => itemClass(rel?.items?.[id]),
    competitor: (id) => competitorType(rel?.items?.[id]),
    reason: (id) => rel?.keywords?.[id]?.reason ?? rel?.items?.[id]?.reason ?? '',
  };
}

const bucket = (v) => (v >= 1000 ? 2 : v >= 100 ? 1 : 0);
const LEVEL = ['low', 'some', 'substantial'];

/**
 * Search demand split by relevance. Idea-level demand uses DIRECT keywords only; category and
 * broader demand are reported next to it, never instead of it.
 *
 * Corroboration guard (deterministic, because the classifier can be wrong): a level above "low"
 * that rests on ONE direct keyword, with no other direct keyword in the same volume band, is not
 * confirmed. The confirmed level is computed without that keyword (unknown if nothing else was
 * measured), and the case is flagged with the level it would reach if the keyword is truly direct.
 */
export function relevanceDemand(rows, idea) {
  const rel = relevanceOf(idea);
  const collected = rows.filter((r) => r.status !== 'not_collected');
  const by = (cls) => collected.filter((r) => rel.keyword(r.id) === cls);
  const measured = (list) => list.filter((r) => typeof r.searchVolume === 'number');
  const direct = by('direct');
  const flags = [];

  let level = 'unknown';
  let upTo = null;
  let basis = null;
  let confirmedTop = null;
  if (!rel.classified) {
    basis = 'Keywords have not been judged for relevance yet, so idea-level demand is unknown.';
  } else {
    const dm = measured(direct).sort((a, b) => b.searchVolume - a.searchVolume);
    if (!dm.length) {
      basis = direct.length ? `None of the ${direct.length} directly relevant keyword(s) returned data (unknown, not zero).` : 'No keyword was judged directly relevant to the idea, so idea-level demand is unknown.';
    } else {
      const [top, second] = dm;
      const topBand = bucket(top.searchVolume);
      if (topBand >= 1 && !(second && bucket(second.searchVolume) >= topBand)) {
        const rest = dm.slice(1);
        level = rest.length ? LEVEL[bucket(rest[0].searchVolume)] : 'unknown';
        upTo = LEVEL[topBand];
        flags.push({ id: top.id, kind: 'uncorroborated', text: `"${top.keyword}" (${top.searchVolume}/mo) alone would put idea-level demand at "${upTo}"; no other directly relevant keyword is in that band, so it is not counted until a person confirms it is about this idea.` });
        confirmedTop = rest[0] ?? null;
        basis = rest.length ? `Largest confirmed directly relevant keyword: "${rest[0].keyword}" at ${rest[0].searchVolume}/month.` : 'The only directly relevant keyword with data is unconfirmed (see flags).';
      } else {
        level = LEVEL[topBand];
        confirmedTop = top;
        basis = `Largest directly relevant keyword: "${top.keyword}" at ${top.searchVolume}/month${second ? `; next "${second.keyword}" at ${second.searchVolume}/month` : ''}.`;
      }
    }
  }
  for (const r of by('uncertain')) flags.push({ id: r.id, kind: 'uncertain', text: `"${r.keyword}": relevance ${idea?.relevance?.keywords?.[r.id] ? 'unclear' : 'not judged'} — not counted.` });

  const side = (list) => {
    const d = demandReading(list);
    return { level: d.level, measuredCount: d.measuredCount, totalCount: d.totalCount, top: d.top };
  };
  const category = side(by('category'));
  const broader = side(by('broader'));
  const lowNote = level === 'low' ? ' Low measured volume is not evidence of low demand for B2B, regulated or emerging problems.' : '';
  return {
    level,
    scope: 'direct keywords only',
    upTo,
    classified: rel.classified,
    measuredCount: measured(direct).length,
    totalCount: direct.length,
    top: confirmedTop ? { keyword: confirmedTop.keyword, searchVolume: confirmedTop.searchVolume, id: confirmedTop.id } : null,
    category,
    broader,
    uncertainCount: by('uncertain').length,
    flags,
    note: `Idea-level demand (directly relevant keywords only): ${level}${upTo ? ` (up to "${upTo}" if a flagged keyword is confirmed)` : ''}. ${basis}${lowNote} Category-level: ${category.level}${category.top ? ` ("${category.top.keyword}" ${category.top.searchVolume}/mo)` : ''}; broader market: ${broader.level}${broader.top ? ` ("${broader.top.keyword}" ${broader.top.searchVolume}/mo)` : ''} — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.`,
  };
}

/**
 * Ask the model for relevance judgements for ideas whose evidence has no current judgement.
 * Applied per batch as soon as it returns; a failed batch leaves those ideas unjudged (and so
 * unassessed) for the next run. Returns the errors.
 */
export async function classifyRelevance({ run, gemini, models = [], batchSize = 3, now = () => new Date(), ideas = null }) {
  const targets = (ideas ?? run.ideas).filter((i) => (i.status === 'enriched' || i.status === 'partial') && (!i.relevance || i.relevance.evidenceUpdatedAt !== i.evidenceUpdatedAt));
  const errors = [];
  for (let at = 0; at < targets.length; at += batchSize) {
    const batch = targets.slice(at, at + batchSize);
    let raw;
    try {
      raw = await gemini.generateJson('enrich-relevance', relevancePrompt({ ideas: batch.map(relevanceBundle) }), {
        temperature: 0.1,
        maxTokens: 32768,
        ...(models.length ? { models } : {}),
      });
    } catch (err) {
      errors.push(`${batch.map((i) => i.id).join(', ')}: relevance — ${err.message}`);
      continue;
    }
    const byId = new Map((Array.isArray(raw?.ideas) ? raw.ideas : []).map((x) => [String(x?.id), x]));
    for (const idea of batch) {
      const x = byId.get(idea.id);
      if (!x) {
        errors.push(`${idea.id}: the model returned no relevance judgements for it`);
        continue;
      }
      idea.relevance = normalizeRelevance(x, idea, { at: now().toISOString(), models: models.length ? models : null });
    }
  }
  return errors;
}
