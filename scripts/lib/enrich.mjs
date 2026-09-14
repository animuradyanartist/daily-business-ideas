// Evidence enrichment for Scout's shortlist.
//
// Runs AFTER the scan stage has shortlisted candidates, and never changes what the
// original 6-stage pipeline picks or scores: its output is a separate evidence file
// (evidence/<date>.json + evidence/<date>.md). It recommends research next steps only —
// selection for building stays manual (Telegram favorites + outcomes/).
//
// Flow per run:
//   plan     — a small keyword set per idea (problem / solution / buying intent) + SERP queries
//   gather   — DataForSEO Labs (one batched task) + live SERPs, every paid call behind the
//              shared-ledger budget gate and the cache; free competitor page fetches
//   read     — code-computed demand / commercial readings (no LLM touches the numbers)
//   assess   — an LLM writes the memo from the evidence only; any level it claims without a
//              valid evidence ID is downgraded to "unknown", any URL not in the evidence is removed
//
// Repeated runs are safe: the evidence file is merged (enriched ideas are never redone),
// the cache prevents re-buying unchanged keywords, attempts per idea are bounded, and
// ledger entry IDs are deterministic.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createDataForSeo, ProviderError, projectLabsCost, projectSerpCost, projectAdsCost } from './dataforseo.mjs';
import { createLedger, readBudgetConfig, canAfford, remainingAllowance, spendEntry } from './ledger.mjs';
import { createFileCache, createOutbox, cacheKeys, readJson, writeJsonAtomic } from './cache.mjs';
import { createPageFetcher } from './pages.mjs';
import {
  KEYWORD_GROUPS,
  LEVELS,
  COMPETITION_LEVELS,
  FEASIBILITY_LEVELS,
  normalizePlan,
  summarizeTrend,
  demandReading,
  commercialReading,
  competitorSummary,
  competitorCandidates,
  classifyDomain,
  stripUnverifiedUrls,
  constrainReading,
} from './evidence.mjs';
import { renderEvidenceMarkdown } from './render.mjs';

export const EVIDENCE_DIR = 'evidence';
export const SCHEMA_VERSION = 1;

const round4 = (n) => Number(Number(n).toFixed(4));
const clampInt = (v, d, min, max) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

export function readEnrichConfig(env = process.env) {
  const rawMode = (env.SCOUT_DFS_MODE ?? '').trim();
  return {
    // Paid requests happen ONLY when this is explicitly "live".
    mode: rawMode === 'live' ? 'live' : 'dry-run',
    modeWarning: rawMode && rawMode !== 'live' && rawMode !== 'dry-run' ? `Unknown SCOUT_DFS_MODE "${rawMode}" — treated as dry-run.` : null,
    market: {
      locationName: (env.SCOUT_MARKET_LOCATION ?? '').trim() || 'United States',
      languageCode: (env.SCOUT_MARKET_LANGUAGE ?? '').trim() || 'en',
    },
    maxIdeas: clampInt(env.SCOUT_ENRICH_MAX_IDEAS, 3, 0, 5),
    keywordsPerGroup: clampInt(env.SCOUT_ENRICH_KEYWORDS_PER_GROUP, 3, 1, 5),
    serpsPerIdea: clampInt(env.SCOUT_ENRICH_SERPS_PER_IDEA, 2, 0, 3),
    pagesPerIdea: clampInt(env.SCOUT_ENRICH_PAGES_PER_IDEA, 3, 0, 5),
    serpDepth: 10,
    // Opt-in: price keywords Labs has no record of with the Google Ads endpoint ($0.09/task).
    adsFallback: (env.SCOUT_DFS_ADS_FALLBACK ?? '').trim() === 'live',
    maxAttempts: clampInt(env.SCOUT_ENRICH_MAX_ATTEMPTS, 3, 1, 5),
    // Optional override for the enrichment planner/assessor models (comma-separated, first
    // tried first). Unset = the same Gemini models as the rest of Scout.
    models: (env.SCOUT_ENRICH_MODELS ?? '').split(',').map((m) => m.trim()).filter(Boolean),
    ...readBudgetConfig(env),
  };
}

export function buildDeps(env = process.env, root = '.') {
  return {
    dfs: createDataForSeo({ login: env.DATAFORSEO_LOGIN?.trim(), password: env.DATAFORSEO_PASSWORD?.trim() }),
    ledger: createLedger({
      url: env.LEDGER_SUPABASE_URL?.trim(),
      key: env.LEDGER_SUPABASE_SERVICE_KEY?.trim(),
      projectId: env.LEDGER_PROJECT_ID?.trim(),
    }),
    cache: createFileCache(join(root, EVIDENCE_DIR, 'cache')),
    outbox: createOutbox(join(root, EVIDENCE_DIR, 'ledger-outbox.json')),
    fetchPage: createPageFetcher(),
    now: () => new Date(),
  };
}

export const evidencePaths = (date, root = '.') => ({
  json: join(root, EVIDENCE_DIR, `${date}.json`),
  md: join(root, EVIDENCE_DIR, `${date}.md`),
});

export function loadRun(date, root = '.') {
  const run = readJson(evidencePaths(date, root).json, null);
  return run && run.schema === SCHEMA_VERSION ? run : null;
}

/**
 * Readings are pure functions of the stored observations, so they are recomputed on every
 * save: an evidence file always reflects the current reading rules without re-buying data.
 */
export function recomputeReadings(run) {
  for (const idea of run.ideas) {
    const collected = (idea.keywords ?? []).filter((k) => k.status !== 'not_collected');
    for (const k of collected) {
      if (k.monthlySearches) {
        k.monthlySearches = [...k.monthlySearches].sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month)).slice(0, 24);
        k.trend = summarizeTrend(k.monthlySearches);
      }
    }
    idea.readings = {
      demand: demandReading(collected),
      commercial: commercialReading(collected, idea.pages ?? []),
      competitors: competitorSummary(idea.serps ?? [], idea.pages ?? []),
    };
  }
  return run;
}

export function saveRun(run, root = '.') {
  recomputeReadings(run);
  const p = evidencePaths(run.date, root);
  writeJsonAtomic(p.json, run);
  writeFileSync(p.md, renderEvidenceMarkdown(run));
}

// ---------- Plan ----------

export function planPrompt({ sourceText, sourceKind, count, config }) {
  const { locationName, languageCode } = config.market;
  const what =
    sourceKind === 'memo'
      ? 'The text below is ONE finished Scout idea memo. Produce exactly 1 idea: the memo\'s idea.'
      : `The text below is Scout's opportunity scan. Produce the ${count} candidates named in its "Shortlist" section, in that order.`;
  return `You prepare search-evidence research plans for business ideas. You do not judge the ideas.

${what}

For each idea return:
- title: the idea's title as written.
- slug: short kebab-case id (max 6 words).
- problem: the specific problem, one sentence.
- targetCustomer: who has the problem, concretely.
- payer: who would pay (may differ from the person with the problem).
- whyPayerPays: one sentence — the payer's reason to spend money.
- keywords: phrases a real person in ${locationName} would type into Google in language "${languageCode}". Lowercase, 2–6 words, no invented product or brand names, no quotes.
  - problem: ${config.keywordsPerGroup} searches describing the pain or job ("how to …", "… requirements", "… penalty").
  - solution: ${config.keywordsPerGroup} searches for the category of solution ("… software", "… template", "… service").
  - buying: ${config.keywordsPerGroup} searches with buying intent ("… pricing", "best … for …", "… cost", "hire …").
- serpQueries: ${config.serpsPerIdea} queries copied exactly from the keywords above — first the clearest solution or buying query, then the clearest problem query.

Do not bias toward software, AI, art or digital products; use whatever the idea actually is (service, physical product, marketplace, B2B, local…).

Return JSON only: {"ideas":[{"title":"","slug":"","problem":"","targetCustomer":"","payer":"","whyPayerPays":"","keywords":{"problem":[],"solution":[],"buying":[]},"serpQueries":[]}]}

=== SOURCE ===
${sourceText}`;
}

export async function planIdeas({ gemini, sourceText, sourceKind, config }) {
  const count = sourceKind === 'memo' ? 1 : config.maxIdeas;
  const raw = await gemini.generateJson(
    'enrich-plan',
    planPrompt({ sourceText: sourceText.slice(0, 14000), sourceKind, count, config }),
    { temperature: 0.2, maxTokens: 8192, models: config.models.length ? config.models : ['gemini-2.5-flash', 'gemini-2.5-pro'] },
  );
  return normalizePlan(raw, { maxIdeas: count, keywordsPerGroup: config.keywordsPerGroup, serpsPerIdea: config.serpsPerIdea });
}

export function newRun({ date, source, config, plans, now = new Date() }) {
  return {
    schema: SCHEMA_VERSION,
    date,
    source, // { kind: 'scan' | 'memo', memo: 'ideas/<date>.md', excerpt }
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    attempts: 0,
    mode: config.mode,
    market: { ...config.market },
    original: null, // Scout's own assessment, filled once the memo exists
    ideas: plans.map((p) => ({
      id: `${date}:${p.slug}`,
      slug: p.slug,
      title: p.title,
      plan: p,
      status: 'planned',
      attempts: 0,
      keywords: [],
      serps: [],
      pages: [],
    })),
    spend: [],
    provider: {},
    budget: {},
  };
}

const isDone = (idea, config) =>
  idea.status === 'enriched' && !(config?.adsFallback && idea.keywords.some((k) => k.status === 'no_data' && !k.adsChecked));

/** Changes only when the collected evidence itself changes (not on a no-op resume). */
export function evidenceFingerprint(idea) {
  const shape = {
    k: idea.keywords.map((k) => [k.id, k.status, k.searchVolume, k.cpcUsd ?? null, k.retrievedAt ?? null]),
    s: idea.serps.map((s) => [s.id, s.retrievedAt, s.items.map((i) => i.url)]),
    p: idea.pages.map((p) => [p.id, p.url, p.status ?? null, p.error ?? null, p.retrievedAt]),
  };
  return createHash('sha256').update(JSON.stringify(shape)).digest('hex').slice(0, 16);
}

// ---------- Gather ----------

export async function gatherEvidence({ run, config, deps, log = console }) {
  const now = deps.now ?? (() => new Date());
  const market = run.market;
  const todo = run.ideas.filter((i) => !isDone(i, config) && (config.mode !== 'live' || (i.attempts ?? 0) < config.maxAttempts));
  run.updatedAt = now().toISOString();
  run.mode = config.mode;
  if (!todo.length) {
    run.lastGather = { at: now().toISOString(), mode: config.mode, pendingIdeas: 0, spentUsd: 0, note: 'nothing pending — no requests made' };
    return run;
  }

  run.attempts = (run.attempts ?? 0) + 1;
  const attemptId = `${run.date}-a${run.attempts}-${now().getTime()}`;
  const warnings = [];
  if (config.modeWarning) warnings.push(config.modeWarning);
  const budget = {
    capUsd: config.capUsd,
    reserveUsd: config.reserveUsd,
    maxRunUsd: config.maxRunUsd,
    monthToDateUsd: null,
    spentThisRunUsd: 0,
  };
  let block = null; // once set, no paid request is made for the rest of this run

  const setBlock = (status, reason) => {
    if (!block) block = { status, reason };
    if (!warnings.includes(reason)) warnings.push(reason);
  };
  const handleErr = (err, what) => {
    const reason = `${what}: ${err?.message ?? 'failed'}`;
    if (err instanceof ProviderError && err.fatalForRun) setBlock('unavailable', reason);
    else if (err instanceof ProviderError && err.kind === 'bad_request') warnings.push(reason);
    else setBlock('pending', reason);
    log.warn?.(`[enrich] ${reason}`);
  };

  // Configuration gates, most fundamental first.
  if (config.mode !== 'live') setBlock('dry-run', 'Dry run: no paid requests were made (SCOUT_DFS_MODE is not "live").');
  if (!deps.dfs.configured) setBlock('unavailable', 'DataForSEO credentials are not configured.');
  if (config.capUsd === null) setBlock('unavailable', `${config.capError}, so there is no spending allowance.`);
  if (!deps.ledger.configured) setBlock('unavailable', 'The shared spend ledger is not configured, so spend could not be counted against the shared allowance.');

  if (config.mode === 'live' && deps.ledger.configured) {
    const pending = deps.outbox.list();
    if (pending.length) {
      const left = [];
      for (const e of pending) {
        try {
          await deps.ledger.record(e);
        } catch {
          left.push(e);
        }
      }
      deps.outbox.replace(left);
      if (left.length) setBlock('pending', `${left.length} earlier charge(s) are still missing from the shared ledger; no purchases until they are recorded.`);
    }
  }

  if (deps.ledger.configured) {
    try {
      budget.monthToDateUsd = await deps.ledger.monthToDateUsd(now());
    } catch {
      setBlock('pending', 'The shared spend ledger could not be read, so nothing was bought.');
    }
  }

  if (!block) {
    try {
      const b = await deps.dfs.balance();
      if (b.balanceUsd !== null && b.balanceUsd < 0.1) setBlock('unavailable', `DataForSEO balance is $${b.balanceUsd.toFixed(2)}, too low to complete a request.`);
    } catch (err) {
      handleErr(err, 'balance check');
    }
  }

  // Free support check (also runs in dry-run when credentials exist).
  const marketKey = cacheKeys.market(market);
  let support = deps.cache.get('market', marketKey);
  if (!support && deps.dfs.configured) {
    try {
      const s = await deps.dfs.labsMarketSupport(market);
      deps.cache.set('market', marketKey, s);
      support = deps.cache.get('market', marketKey);
    } catch (err) {
      if (err instanceof ProviderError && err.fatalForRun) handleErr(err, 'market support check');
      else warnings.push(`market support check: ${err?.message ?? 'failed'}`);
    }
  }
  run.market.support = support
    ? { supported: support.supported, reason: support.reason ?? null, locationCode: support.locationCode ?? null, checkedAt: support.fetchedAt }
    : { supported: null, reason: 'not checked', checkedAt: null };
  if (support && support.supported === false) setBlock('unavailable', `Market not supported by DataForSEO Labs: ${support.reason}.`);

  const skips = new Map(); // idea id → reasons

  async function recordCharge({ endpoint, cacheKey, costUsd, estimated, requested, measured, measuredAt }) {
    budget.spentThisRunUsd = round4(budget.spentThisRunUsd + costUsd);
    const entry = spendEntry({
      runId: attemptId,
      cacheKey: createHash('sha256').update(cacheKey).digest('hex').slice(0, 24),
      endpoint,
      costUsd,
      estimated,
      requested,
      measured,
      market,
      measuredAt,
      capUsd: config.capUsd,
    });
    const line = { at: measuredAt, endpoint, costUsd: round4(costUsd), estimated: Boolean(estimated), requested, ledgerId: entry.id, ledger: 'recorded' };
    try {
      await deps.ledger.record(entry);
    } catch {
      deps.outbox.add(entry);
      line.ledger = 'outbox';
      setBlock('pending', 'A charge could not be written to the shared ledger; it was saved to evidence/ledger-outbox.json and further purchases stopped.');
    }
    run.spend.push(line);
  }

  async function paid({ endpoint, cacheKey, projected, requested, exec }) {
    if (block) return { skipped: block.reason };
    const gate = canAfford(projected, budget);
    if (!gate.ok) {
      return {
        skipped: `budget: this request (~$${projected.toFixed(4)}) exceeds Scout's remaining allowance ($${gate.remainingUsd.toFixed(4)}; shared cap $${budget.capUsd}, reserve $${budget.reserveUsd}, month-to-date $${budget.monthToDateUsd}, per-run limit $${budget.maxRunUsd})`,
      };
    }
    let res;
    try {
      res = await exec();
    } catch (err) {
      const reported = typeof err?.cost === 'number' && err.cost > 0 ? err.cost : 0;
      if (err?.chargeUnknown || reported) {
        await recordCharge({
          endpoint,
          cacheKey,
          costUsd: reported || projected,
          estimated: !reported,
          requested,
          measured: 0,
          measuredAt: now().toISOString(),
        });
      }
      handleErr(err, endpoint);
      return { error: err?.message ?? 'failed' };
    }
    await recordCharge({
      endpoint,
      cacheKey,
      costUsd: res.cost ?? projected,
      estimated: res.cost === null,
      requested,
      measured: res.measured,
      measuredAt: res.measuredAt,
    });
    return { res };
  }

  // 1) Keywords — one Labs task for every uncached keyword across the shortlist.
  const kwKey = (k) => cacheKeys.keyword(market, k);
  const planned = (idea) => KEYWORD_GROUPS.flatMap((g) => idea.plan.keywords[g].map((keyword) => ({ keyword, group: g })));
  const needed = [...new Set(todo.flatMap((i) => planned(i).map((r) => r.keyword)).filter((k) => !deps.cache.get('keywords', kwKey(k))))];
  const serpNeeded = todo.flatMap((i) => i.plan.serpQueries).filter((q) => !deps.cache.get('serp', cacheKeys.serp(market, q, config.serpDepth)));
  run.projection = {
    labsKeywords: needed.length,
    labsUsd: projectLabsCost(needed.length),
    serpQueries: serpNeeded.length,
    serpUsd: round4(serpNeeded.length * projectSerpCost(config.serpDepth)),
  };
  run.projection.totalUsd = round4(run.projection.labsUsd + run.projection.serpUsd);

  if (needed.length) {
    const endpoint = 'dataforseo_labs/google/keyword_overview/live';
    const out = await paid({
      endpoint,
      cacheKey: `labs|${needed.join(',')}`,
      projected: projectLabsCost(needed.length),
      requested: needed.length,
      exec: async () => {
        const r = await deps.dfs.keywordOverview(needed, market);
        return { ...r, measured: r.items.filter((i) => i.searchVolume !== null).length };
      },
    });
    if (out.res) {
      const byKw = new Map(out.res.items.map((i) => [i.keyword, i]));
      for (const k of needed) {
        const it = byKw.get(k);
        deps.cache.set('keywords', kwKey(k), it ? { returned: true, data: it } : { returned: false, data: null }, out.res.measuredAt);
      }
      deps.cache.save(); // paid data is persisted before anything else can fail
    } else {
      for (const i of todo) skips.set(i.id, [...(skips.get(i.id) ?? []), `keywords not collected — ${out.skipped ?? out.error}`]);
    }
  }

  // 1b) Optional Google Ads fallback — ONE task for every keyword Labs had no figure for.
  const adsKey = (k) => cacheKeys.ads(market, k);
  const labsMissed = (k) => {
    const c = deps.cache.get('keywords', kwKey(k));
    return c && (!c.returned || c.data?.searchVolume === null);
  };
  if (config.adsFallback) {
    const adsNeeded = [...new Set(todo.flatMap((i) => planned(i).map((r) => r.keyword)))].filter((k) => labsMissed(k) && !deps.cache.get('ads', adsKey(k)));
    run.projection.adsKeywords = adsNeeded.length;
    run.projection.adsUsd = projectAdsCost(adsNeeded.length);
    run.projection.totalUsd = round4(run.projection.totalUsd + run.projection.adsUsd);
    if (adsNeeded.length) {
      const out = await paid({
        endpoint: 'keywords_data/google_ads/search_volume/live',
        cacheKey: `ads|${adsNeeded.join(',')}`,
        projected: projectAdsCost(adsNeeded.length),
        requested: adsNeeded.length,
        exec: async () => {
          const r = await deps.dfs.adsSearchVolume(adsNeeded, market);
          return { ...r, measured: r.items.filter((i) => i.searchVolume !== null).length };
        },
      });
      if (out.res) {
        const byKw = new Map(out.res.items.map((i) => [i.keyword, i]));
        for (const k of adsNeeded) {
          const it = byKw.get(k);
          deps.cache.set('ads', adsKey(k), it ? { returned: true, data: it } : { returned: false, data: null }, out.res.measuredAt);
        }
        deps.cache.save();
      } else {
        for (const i of todo) skips.set(i.id, [...(skips.get(i.id) ?? []), `Google Ads fallback not collected — ${out.skipped ?? out.error}`]);
      }
    }
  }

  for (const idea of todo) {
    idea.keywords = planned(idea).map((r, idx) => {
      const id = `K${idx + 1}`;
      const base = { id, keyword: r.keyword, group: r.group };
      const labs = deps.cache.get('keywords', kwKey(r.keyword));
      const ads = deps.cache.get('ads', adsKey(r.keyword));
      const labsHasFigure = labs?.returned && labs.data.searchVolume !== null;
      const adsHasFigure = ads?.returned && ads.data.searchVolume !== null;
      const c = labsHasFigure ? labs : adsHasFigure ? ads : labs;
      if (!c) return { ...base, status: 'not_collected', searchVolume: null };
      const provenance = {
        provider: c === ads ? 'DataForSEO Google Ads · search_volume' : 'DataForSEO Labs · keyword_overview',
        location: market.locationName,
        language: market.languageCode,
        retrievedAt: c.fetchedAt,
        adsChecked: Boolean(ads),
      };
      if (!c.returned) return { ...base, status: 'no_data', searchVolume: null, ...provenance };
      return {
        ...base,
        status: c.data.searchVolume === null ? 'no_data' : 'measured',
        searchVolume: c.data.searchVolume,
        cpcUsd: c.data.cpcUsd,
        adCompetition: c.data.adCompetition,
        adCompetitionLevel: c.data.adCompetitionLevel,
        mainIntent: c.data.mainIntent,
        providerTrendYearlyPct: c.data.providerTrendYearlyPct,
        providerUpdatedAt: c.data.providerUpdatedAt,
        monthlySearches: c.data.monthlySearches,
        trend: summarizeTrend(c.data.monthlySearches),
        ...provenance,
      };
    });
  }

  // 2) SERPs — who actually shows up for the idea's queries.
  for (const idea of todo) {
    const serps = [];
    for (const [qi, query] of idea.plan.serpQueries.entries()) {
      const key = cacheKeys.serp(market, query, config.serpDepth);
      let c = deps.cache.get('serp', key);
      if (!c) {
        const out = await paid({
          endpoint: 'serp/google/organic/live/regular',
          cacheKey: key,
          projected: projectSerpCost(config.serpDepth),
          requested: 1,
          exec: async () => {
            const r = await deps.dfs.serpOrganic(query, { ...market, depth: config.serpDepth });
            return { ...r, measured: r.items.length };
          },
        });
        if (out.res) {
          deps.cache.set('serp', key, { data: { checkUrl: out.res.checkUrl, itemTypes: out.res.itemTypes, items: out.res.items } }, out.res.measuredAt);
          deps.cache.save();
          c = deps.cache.get('serp', key);
        } else {
          skips.set(idea.id, [...(skips.get(idea.id) ?? []), `search results for "${query}" not collected — ${out.skipped ?? out.error}`]);
        }
      }
      if (c) {
        const sid = `S${qi + 1}`;
        serps.push({
          id: sid,
          query,
          provider: 'DataForSEO SERP · google organic live',
          location: market.locationName,
          language: market.languageCode,
          retrievedAt: c.fetchedAt,
          checkUrl: c.data.checkUrl,
          items: c.data.items.map((it) => ({ ...it, id: `${sid}.${it.rank}`, class: classifyDomain(it.domain) })),
        });
      }
    }
    idea.serps = serps;
  }

  // 3) Competitor pages — free fetches of vendor-like ranking sites (homepage + /pricing).
  for (const idea of todo) {
    const candidates = competitorCandidates(idea.serps, config.pagesPerIdea);
    const urls = [];
    for (const cand of candidates) {
      urls.push({ domain: cand.domain, url: cand.url });
      try {
        const pricing = new URL('/pricing', cand.url).href;
        if (pricing !== cand.url) urls.push({ domain: cand.domain, url: pricing });
      } catch {
        /* skip malformed */
      }
    }
    const pages = await Promise.all(
      urls.map(async ({ domain, url }) => {
        const key = cacheKeys.page(url);
        const cached = deps.cache.get('pages', key);
        if (cached) return { domain, ...cached.data, retrievedAt: cached.fetchedAt };
        const p = await deps.fetchPage(url);
        // Cache real answers (including robots refusals); retry transient failures next run.
        if (p.status || p.error === 'robots.txt disallows this path') deps.cache.set('pages', key, { data: p }, p.retrievedAt);
        return { domain, ...p };
      }),
    );
    idea.pages = pages.map((p, i) => ({ id: `P${i + 1}`, ...p }));
  }

  // 4) Status + code-computed readings.
  for (const idea of todo) {
    const collectedKw = idea.keywords.filter((k) => k.status !== 'not_collected');
    const wantSerps = idea.plan.serpQueries.length;
    const anyData = collectedKw.length > 0 || idea.serps.length > 0;
    const adsPending = config.adsFallback && idea.keywords.some((k) => k.status === 'no_data' && !k.adsChecked);
    const complete = collectedKw.length === idea.keywords.length && idea.serps.length === wantSerps && !adsPending;
    const prevStatus = idea.status;
    idea.status = complete && anyData ? 'enriched' : anyData ? 'partial' : block?.status === 'dry-run' ? 'dry-run' : block?.status === 'unavailable' ? 'unavailable' : 'pending';
    idea.reason = complete ? null : block && !anyData ? block.reason : [...new Set(skips.get(idea.id) ?? [])].join('; ') || block?.reason || null;
    if (config.mode === 'live' && !(block && ['dry-run', 'unavailable'].includes(block.status) && !anyData)) {
      idea.attempts = (idea.attempts ?? 0) + 1;
    }
    idea.readings = {
      demand: demandReading(collectedKw),
      commercial: commercialReading(collectedKw, idea.pages),
      competitors: competitorSummary(idea.serps, idea.pages),
    };
    const fp = evidenceFingerprint(idea);
    if (fp !== idea.evidenceFingerprint || prevStatus !== idea.status) {
      idea.evidenceFingerprint = fp;
      idea.evidenceUpdatedAt = now().toISOString();
    }
  }

  run.provider = { status: block ? block.status : 'live', reason: block?.reason ?? null, warnings };
  run.lastGather = { at: now().toISOString(), mode: config.mode, pendingIdeas: todo.length, spentUsd: budget.spentThisRunUsd, note: null };
  run.budget = {
    capUsd: budget.capUsd,
    reserveUsd: budget.reserveUsd,
    maxRunUsd: budget.maxRunUsd,
    monthToDateUsdBefore: budget.monthToDateUsd,
    spentThisRunUsd: budget.spentThisRunUsd,
    remainingForScoutUsd: remainingAllowance(budget),
  };
  deps.cache.save();
  return run;
}

// ---------- Assess ----------

export function assessPrompt(bundle) {
  return `You write evidence-bound assessments of business opportunities for a solo founder. You are NOT deciding what to build; you describe what the evidence shows and what the cheapest next test is.

Hard rules:
- Use ONLY the evidence in the JSON below. Each evidence item has an id (K = keyword measurement, S = search result, P = fetched page). Cite ids in "basis" arrays.
- Separate observation from inference. "observed" = directly stated by a cited item. Anything else is "inference".
- Search volume is searches, not customers. CPC is an advertiser bid, not willingness to pay. Google Ads competition is not SEO difficulty. Never add keyword volumes together into a market size. Missing data is unknown, not zero.
- Low search volume alone is not a reason to stop: B2B, regulated and emerging problems often have little search.
- No numeric confidence scores or probabilities. Use only the allowed level words.
- Do not include any URL that is not in the evidence.
- "scoutContext" and "plan" are Scout's own earlier reasoning — unverified. You may use them to describe the idea, never as evidence.

For each idea return:
{
 "id": "<idea id>",
 "opportunity": "2 sentences: what the opportunity is.",
 "whoPays": "who pays and why, 1-2 sentences, marked as inference unless an item shows it",
 "problemEvidence": {"level": "unknown|weak|moderate|strong", "basis": ["S1.3"], "observed": "what cited items show about people having this problem", "inference": "what you infer, clearly"},
 "competition": {"level": "unknown|sparse|some|crowded", "basis": ["S1.1","P2"],
   "alternatives": [{"name": "", "what": "what they offer, from the page", "basis": ["P1"]}],
   "strengths": [{"text": "", "basis": ["P1"], "kind": "observed|inference"}],
   "gaps": [{"text": "", "basis": [], "kind": "observed|inference"}]},
 "feasibility": {"level": "unknown|hard|moderate|easy", "note": "how feasible a SMALL first experiment is (not the full product)"},
 "unproven": ["the most important things the evidence does NOT establish"],
 "nextExperiment": {"what": "the cheapest useful test, concrete", "cost": "rough cash + time", "duration": ""},
 "continueIf": "a measurable result that justifies continuing",
 "stopIf": "a measurable result that justifies stopping"
}

Return JSON only: {"ideas":[ ... ]}

=== EVIDENCE ===
${JSON.stringify(bundle)}`;
}

function evidenceBundle(idea, scoutContext) {
  return {
    id: idea.id,
    title: idea.title,
    plan: { problem: idea.plan.problem, targetCustomer: idea.plan.targetCustomer, payer: idea.plan.payer, whyPayerPays: idea.plan.whyPayerPays },
    scoutContext,
    readings: idea.readings,
    keywords: idea.keywords
      .filter((k) => k.status !== 'not_collected')
      .map((k) => ({ id: k.id, keyword: k.keyword, group: k.group, searchVolume: k.searchVolume, trend: k.trend?.direction ?? 'unknown', cpcUsd: k.cpcUsd ?? null, adCompetitionLevel: k.adCompetitionLevel ?? null })),
    searchResults: idea.serps.map((s) => ({
      query: s.query,
      items: s.items.map((i) => ({ id: i.id, rank: i.rank, domain: i.domain, siteType: i.class, title: i.title, snippet: i.description, url: i.url })),
    })),
    pages: idea.pages
      .filter((p) => !p.error)
      .map((p) => ({ id: p.id, domain: p.domain, url: p.finalUrl ?? p.url, title: p.title, description: p.description, prices: (p.priceMentions ?? []).map((m) => m.context), freeTrial: p.mentionsFreeTrial, contactSales: p.mentionsContactSales })),
  };
}

export function ideaEvidenceIds(idea) {
  const ids = new Set(idea.keywords.filter((k) => k.status !== 'not_collected').map((k) => k.id));
  for (const s of idea.serps) for (const i of s.items) ids.add(i.id);
  for (const p of idea.pages) if (!p.error) ids.add(p.id);
  return ids;
}

export function ideaEvidenceUrls(idea) {
  const urls = new Set();
  for (const s of idea.serps) {
    for (const i of s.items) urls.add(i.url);
    if (s.checkUrl) urls.add(s.checkUrl);
  }
  for (const p of idea.pages) {
    urls.add(p.url);
    if (p.finalUrl) urls.add(p.finalUrl);
  }
  return urls;
}

/** Validate one model assessment against the idea's evidence. Pure. */
export function constrainAssessment(a, idea) {
  const validIds = ideaEvidenceIds(idea);
  const urls = ideaEvidenceUrls(idea);
  let removedLinks = 0;
  const clean = (t, max = 1200) => {
    const r = stripUnverifiedUrls(String(t ?? '').slice(0, max), urls);
    removedLinks += r.removed;
    return r.text.trim();
  };
  const ids = (arr) => [...new Set((Array.isArray(arr) ? arr : []).map(String).filter((x) => validIds.has(x)))];
  const downgraded = [];

  const pe = constrainReading(a?.problemEvidence, { levels: LEVELS, validIds });
  if (pe.downgraded) downgraded.push('problem evidence');
  const comp = constrainReading(a?.competition, { levels: COMPETITION_LEVELS, validIds });
  if (comp.downgraded) downgraded.push('competition');

  const claims = (arr) =>
    (Array.isArray(arr) ? arr : []).slice(0, 5).map((c) => {
      const basis = ids(c?.basis);
      return { text: clean(c?.text, 400), basis, kind: c?.kind === 'observed' && basis.length ? 'observed' : 'inference' };
    }).filter((c) => c.text);

  return {
    opportunity: clean(a?.opportunity, 600),
    whoPays: clean(a?.whoPays, 600),
    problemEvidence: { level: pe.level, basis: pe.basis, observed: pe.basis.length ? clean(a?.problemEvidence?.observed) : '', inference: clean(a?.problemEvidence?.inference) },
    competition: {
      level: comp.level,
      basis: comp.basis,
      alternatives: (Array.isArray(a?.competition?.alternatives) ? a.competition.alternatives : [])
        .slice(0, 6)
        .map((x) => ({ name: clean(x?.name, 120), what: clean(x?.what, 300), basis: ids(x?.basis) }))
        .filter((x) => x.name && x.basis.length),
      strengths: claims(a?.competition?.strengths),
      gaps: claims(a?.competition?.gaps),
    },
    feasibility: { level: FEASIBILITY_LEVELS.includes(a?.feasibility?.level) ? a.feasibility.level : 'unknown', note: clean(a?.feasibility?.note, 500) },
    unproven: (Array.isArray(a?.unproven) ? a.unproven : []).slice(0, 6).map((x) => clean(x, 300)).filter(Boolean),
    nextExperiment: { what: clean(a?.nextExperiment?.what, 600), cost: clean(a?.nextExperiment?.cost, 200), duration: clean(a?.nextExperiment?.duration, 120) },
    continueIf: clean(a?.continueIf, 400),
    stopIf: clean(a?.stopIf, 400),
    removedLinks,
    downgraded,
  };
}

export async function assessEvidence({ run, gemini, scoutContext = '', models = [], now = () => new Date() }) {
  const targets = run.ideas.filter(
    (i) => (i.status === 'enriched' || i.status === 'partial') && (!i.assessment || i.assessment.evidenceUpdatedAt !== i.evidenceUpdatedAt),
  );
  if (!targets.length) return run;
  const bundle = { ideas: targets.map((i) => evidenceBundle(i, scoutContext.slice(0, 3000))) };
  let raw;
  try {
    raw = await gemini.generateJson('enrich-assess', assessPrompt(bundle), {
      temperature: 0.2,
      maxTokens: 16384,
      ...(models.length ? { models } : {}),
    });
  } catch (err) {
    run.assessmentError = `assessment not written: ${err.message}`;
    return run;
  }
  const byId = new Map((Array.isArray(raw?.ideas) ? raw.ideas : []).map((a) => [String(a?.id), a]));
  for (const idea of targets) {
    const a = byId.get(idea.id);
    if (!a) continue;
    idea.assessment = { ...constrainAssessment(a, idea), assessedAt: now().toISOString(), evidenceUpdatedAt: idea.evidenceUpdatedAt };
  }
  delete run.assessmentError;
  return run;
}

// ---------- Link to Scout's original memo ----------

const memoSection = (md, heading) => {
  const m = md.match(new RegExp(`##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i'));
  return m ? m[1].trim() : '';
};

/** Title, score and the decision-relevant sections of a finished memo. */
export function memoContext(md) {
  const title = (md.match(/^#\s+(.+)$/m)?.[1] ?? '').trim();
  const score = md.match(/score:\s*(\d{1,3})\s*\/\s*100/i)?.[1];
  const conviction = md.match(/conviction:\s*(high|medium|low)/i)?.[1]?.toLowerCase() ?? null;
  const parts = ['The idea', 'Who pays and why', 'Competitive landscape', 'Validation plan']
    .map((h) => [h, memoSection(md, h)])
    .filter(([, body]) => body)
    .map(([h, body]) => `## ${h}\n${body.slice(0, 3000)}`);
  return { title, score: score ? Number(score) : null, conviction, excerpt: `# ${title}\n\n${parts.join('\n\n')}` };
}

/** One-line status summary for the pointer section in the daily memo. */
export function statusSummary(run) {
  const counts = {};
  for (const i of run.ideas) counts[i.status] = (counts[i.status] ?? 0) + 1;
  return Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(', ');
}

const tokens = (s) => new Set(String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length > 3));

/** Record Scout's own verdict next to (never inside) the enrichment. */
export function attachOriginal(run, { memoPath, title, score, conviction }) {
  run.original = { memo: memoPath, title, score, conviction };
  const t = tokens(title);
  for (const idea of run.ideas) {
    const it = tokens(idea.title);
    const overlap = [...t].filter((w) => it.has(w)).length;
    idea.matchesOriginalPick = t.size && it.size ? overlap / Math.min(t.size, it.size) >= 0.5 : null;
  }
  return run;
}
