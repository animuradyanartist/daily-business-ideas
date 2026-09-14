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
import { createLedger, readBudgetConfig, stableUuid } from './ledger.mjs';
import { createBudgetRpc, createLegacyLedgerBudget, RESERVE_MARGIN } from './budget.mjs';
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
} from './evidence.mjs';
import { renderEvidenceMarkdown } from './render.mjs';
import { evidenceIndex, checkBasis, capProblemLevel, capCompetitionLevel, nameMatchesEvidence, scrubDemandClaims, normText, quoteFound, ABSENCE } from './grounding.mjs';

export const EVIDENCE_DIR = 'evidence';
export const SCHEMA_VERSION = 1;

// Money is kept to 6 decimals: Labs bills $0.00012 per returned item, so 4 decimals would under-record.
const roundUsd = (n) => Number(Number(n).toFixed(6));
const clampInt = (v, d, min, max) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

/** "United States:en; India:en" → [{ locationName, languageCode }]. */
export function parseMarkets(raw, fallback) {
  const list = String(raw ?? '')
    .split(';')
    .map((m) => m.trim())
    .filter(Boolean)
    .map((m) => {
      const i = m.lastIndexOf(':');
      return i > 0 ? { locationName: m.slice(0, i).trim(), languageCode: m.slice(i + 1).trim().toLowerCase() } : null;
    })
    .filter((m) => m && m.locationName && /^[a-z]{2}(-[a-z]{2})?$/.test(m.languageCode));
  return list.length ? list : [fallback];
}

const sameMarket = (a, b) => a && b && a.locationName.toLowerCase() === b.locationName.toLowerCase() && a.languageCode.toLowerCase() === b.languageCode.toLowerCase();

/** The planner proposes where the buyer searches; only markets on the configured allowlist are used. */
export function resolveIdeaMarket(proposed, config) {
  const allowed = config.markets ?? [config.market];
  const p = proposed && typeof proposed === 'object'
    ? { locationName: String(proposed.locationName ?? proposed.location ?? '').trim(), languageCode: String(proposed.languageCode ?? proposed.language ?? '').trim().toLowerCase() }
    : null;
  const match = p && allowed.find((m) => sameMarket(m, p));
  if (match) return { ...match, source: 'planner', reason: typeof proposed.reason === 'string' ? proposed.reason.slice(0, 300) : null };
  return {
    ...allowed[0],
    source: 'default',
    reason: p?.locationName ? `planner proposed ${p.locationName}/${p.languageCode || '?'}, which is not on the allowed market list` : 'planner did not name a market',
  };
}

export function readEnrichConfig(env = process.env) {
  const rawMode = (env.SCOUT_DFS_MODE ?? '').trim();
  const defaultMarket = {
    locationName: (env.SCOUT_MARKET_LOCATION ?? '').trim() || 'United States',
    languageCode: (env.SCOUT_MARKET_LANGUAGE ?? '').trim() || 'en',
  };
  return {
    // Paid requests happen ONLY when this is explicitly "live".
    mode: rawMode === 'live' ? 'live' : 'dry-run',
    modeWarning: rawMode && rawMode !== 'live' && rawMode !== 'dry-run' ? `Unknown SCOUT_DFS_MODE "${rawMode}" — treated as dry-run.` : null,
    market: defaultMarket,
    // Markets a plan may target (first = default). Each distinct market costs its own Labs task.
    markets: parseMarkets(env.SCOUT_MARKETS, defaultMarket),
    maxIdeas: clampInt(env.SCOUT_ENRICH_MAX_IDEAS, 3, 0, 5),
    keywordsPerGroup: clampInt(env.SCOUT_ENRICH_KEYWORDS_PER_GROUP, 3, 1, 5),
    serpsPerIdea: clampInt(env.SCOUT_ENRICH_SERPS_PER_IDEA, 2, 0, 3),
    pagesPerIdea: clampInt(env.SCOUT_ENRICH_PAGES_PER_IDEA, 3, 0, 5),
    serpDepth: 10,
    // Opt-in: price keywords Labs has no record of with the Google Ads endpoint ($0.09/task).
    adsFallback: (env.SCOUT_DFS_ADS_FALLBACK ?? '').trim() === 'live',
    maxAttempts: clampInt(env.SCOUT_ENRICH_MAX_ATTEMPTS, 3, 1, 5),
    // `rpc` (default): the shared atomic budget functions. `legacy-ledger`: pre-migration,
    // non-atomic, explicit opt-in for supervised runs only.
    budgetBackend: (env.SCOUT_BUDGET_BACKEND ?? '').trim() === 'legacy-ledger' ? 'legacy-ledger' : 'rpc',
    // A request that may have been charged without an answer is never re-sent automatically.
    retryUncertain: (env.SCOUT_RETRY_UNCERTAIN ?? '').trim() === '1',
    // Optional override for the enrichment planner/assessor models (comma-separated, first
    // tried first). Unset = the same Gemini models as the rest of Scout.
    models: (env.SCOUT_ENRICH_MODELS ?? '').split(',').map((m) => m.trim()).filter(Boolean),
    ...readBudgetConfig(env),
  };
}

export function buildDeps(env = process.env, root = '.') {
  const config = readEnrichConfig(env);
  const budget =
    config.budgetBackend === 'legacy-ledger'
      ? createLegacyLedgerBudget({
          ledger: createLedger({
            url: env.LEDGER_SUPABASE_URL?.trim(),
            key: env.LEDGER_SUPABASE_SERVICE_KEY?.trim(),
            projectId: env.LEDGER_PROJECT_ID?.trim(),
          }),
          capUsd: config.capUsd,
        })
      : createBudgetRpc({
          url: env.DATAFORSEO_BUDGET_URL?.trim(),
          anonKey: env.DATAFORSEO_BUDGET_ANON_KEY?.trim(),
          token: env.DATAFORSEO_BUDGET_TOKEN?.trim(),
        });
  return {
    dfs: createDataForSeo({ login: env.DATAFORSEO_LOGIN?.trim(), password: env.DATAFORSEO_PASSWORD?.trim() }),
    budget,
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
  saveRunAt(run, evidencePaths(run.date, root));
}

/** Save to explicit paths (pilots); `rootRel` is the relative path from the markdown file to the repo root. */
export function saveRunAt(run, { json, md, rootRel = '..' }) {
  recomputeReadings(run);
  writeJsonAtomic(json, run);
  writeFileSync(md, renderEvidenceMarkdown(run, { rootRel }));
}

// ---------- Plan ----------

export function planPrompt({ sourceText, sourceKind, count, config }) {
  const allowed = (config.markets ?? [config.market]).map((m) => `${m.locationName} (language "${m.languageCode}")`).join('; ');
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
- market: {"location": "", "language": "", "reason": ""} — the ONE country and language where the paying buyer most plausibly searches for this, chosen ONLY from: ${allowed}. If none clearly fits, use the first. Say why in one sentence.
- keywords: phrases a real person in that market would type into Google in that language. Lowercase, no quotes.
  Write them the way people actually search, NOT the way the idea is pitched: prefer short, common phrasing (2–4 words), and make at least one keyword in every group a 2–3 word head term. Never put the idea's product name, format words from its pitch ("swipe file", "kit", "starter pack") or stacked qualifiers ("… for non-native tech designers pricing") into a keyword unless people really search that way.
  - problem: ${config.keywordsPerGroup} searches describing the pain or job ("how to …", "… requirements", "… penalty").
  - solution: ${config.keywordsPerGroup} searches for the category of solution ("… template", "… software", "… course", "… service").
  - buying: ${config.keywordsPerGroup} searches with buying intent ("… pricing", "best … for …", "… cost", "hire …").
- serpQueries: ${config.serpsPerIdea} queries copied exactly from the keywords above — first the category query most likely to show EXISTING PAID alternatives (a solution or buying head term), then the problem query most likely to show people describing the problem in their own words.

Do not bias toward software, AI, art or digital products; use whatever the idea actually is (service, physical product, marketplace, B2B, local…).

Return JSON only: {"ideas":[{"title":"","slug":"","problem":"","targetCustomer":"","payer":"","whyPayerPays":"","market":{"location":"","language":"","reason":""},"keywords":{"problem":[],"solution":[],"buying":[]},"serpQueries":[]}]}

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
      market: resolveIdeaMarket(p.market, config),
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
    backend: deps.budget.backend,
    atomic: deps.budget.atomic,
    capUsd: config.capUsd,
    reserveUsd: config.reserveUsd,
    maxRunUsd: config.maxRunUsd,
    sharedBefore: null, // { chargedUsd, heldUsd } across every app, before this attempt
    committedThisRunUsd: 0, // open holds + charges of this attempt (per-run limit)
    spentThisRunUsd: 0, // provider-reported charges + uncertain holds at their estimate
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
  if (!deps.budget.configured) setBlock('unavailable', 'The shared DataForSEO budget is not configured, so spend could not be reserved against the shared allowance.');
  if (config.mode === 'live' && !deps.budget.atomic) {
    warnings.push('Budget backend is legacy-ledger: reservations are not atomic across apps (pre-migration, supervised use only).');
  }

  // Budget updates that failed last time are replayed before anything new is bought.
  if (config.mode === 'live' && deps.budget.configured) {
    const pending = deps.outbox.list();
    if (pending.length) {
      const left = [];
      for (const e of pending) {
        try {
          if (e.op === 'settle') await deps.budget.settle(e);
          else if (e.op === 'uncertain') await deps.budget.markUncertain(e);
          else if (e.op === 'release') await deps.budget.release(e);
          else throw new Error('unknown outbox entry');
        } catch {
          left.push(e);
        }
      }
      deps.outbox.replace(left);
      if (left.length) setBlock('pending', `${left.length} earlier budget update(s) are still unrecorded; no purchases until they are written.`);
    }
  }

  if (deps.budget.configured) {
    try {
      budget.sharedBefore = await deps.budget.status();
    } catch (err) {
      setBlock('pending', `The shared budget could not be read (${err.message}), so nothing was bought.`);
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

  // Free support check per distinct market (also runs in dry-run when credentials exist).
  const marketOf = (idea) => (idea.market?.locationName ? idea.market : market);
  const supportFor = new Map();
  for (const m of [market, ...todo.map(marketOf)]) {
    const key = cacheKeys.market(m);
    if (supportFor.has(key)) continue;
    let support = deps.cache.get('market', key);
    if (!support && deps.dfs.configured) {
      try {
        const s = await deps.dfs.labsMarketSupport(m);
        deps.cache.set('market', key, s);
        support = deps.cache.get('market', key);
      } catch (err) {
        if (err instanceof ProviderError && err.fatalForRun) handleErr(err, 'market support check');
        else warnings.push(`market support check (${m.locationName}): ${err?.message ?? 'failed'}`);
      }
    }
    supportFor.set(key, support
      ? { supported: support.supported, reason: support.reason ?? null, locationCode: support.locationCode ?? null, checkedAt: support.fetchedAt }
      : { supported: null, reason: 'not checked', checkedAt: null });
  }
  run.market.support = supportFor.get(cacheKeys.market(market));
  run.marketSupport = Object.fromEntries(supportFor);
  const unsupported = (idea) => supportFor.get(cacheKeys.market(marketOf(idea)))?.supported === false;

  const skips = new Map(); // idea id → reasons

  const scoutCeiling = config.capUsd === null ? null : roundUsd(config.capUsd - config.reserveUsd);

  // A failed budget write never loses a charge: the hold stays counted on the server and the
  // update is replayed from the outbox before the next purchase.
  async function budgetOp(op, args, line) {
    try {
      if (op === 'settle') await deps.budget.settle(args);
      else if (op === 'uncertain') await deps.budget.markUncertain(args);
      else await deps.budget.release(args);
      line.budget = 'recorded';
    } catch (err) {
      deps.outbox.add({ op, ...args, at: now().toISOString() });
      line.budget = 'outbox';
      setBlock('pending', `A budget update (${op}) could not be written (${err.message}); it was saved to evidence/ledger-outbox.json and further purchases stopped.`);
    }
  }

  async function paid({ endpoint, cacheKey, projected, requested, exec, market: mkt = market }) {
    if (block) return { skipped: block.reason };
    const requestKey = createHash('sha256').update(cacheKey).digest('hex').slice(0, 24);
    const doubt = deps.cache.get('uncertain', requestKey);
    if (doubt && !config.retryUncertain) {
      return {
        skipped: `an identical earlier request (${String(doubt.fetchedAt).slice(0, 10)}) may have been charged without an answer; it is not re-sent automatically (check the DataForSEO dashboard, then run with SCOUT_RETRY_UNCERTAIN=1)`,
      };
    }
    const estimate = roundUsd(projected * RESERVE_MARGIN);
    if (budget.committedThisRunUsd + estimate > config.maxRunUsd + 1e-9) {
      return { skipped: `budget: this request (~$${estimate.toFixed(4)} reserved) would exceed Scout's per-run limit of $${config.maxRunUsd}` };
    }

    const holdId = stableUuid(`scout|${attemptId}|${requestKey}`);
    let r;
    try {
      r = await deps.budget.reserve({ holdId, estimatedUsd: estimate, endpoint, requestKey, maxTotalUsd: scoutCeiling });
    } catch (err) {
      setBlock('pending', `The shared budget could not be reached (${err.message}), so nothing was bought.`);
      return { skipped: block.reason };
    }
    if (!r.ok) {
      if (r.reason === 'unauthorized' || r.reason === 'not_configured' || r.reason === 'request_limit') {
        setBlock('unavailable', `The shared budget refused the reservation (${r.reason}).`);
        return { skipped: block.reason };
      }
      if (r.reason === 'cap') {
        return {
          skipped: `budget: a ~$${estimate.toFixed(4)} reservation was refused — shared cap $${r.capUsd}, Scout's ceiling $${r.ceilingUsd} (cap − $${config.reserveUsd} reserve), already charged $${r.chargedUsd}, held by in-flight or uncertain requests $${r.heldUsd}`,
        };
      }
      return { skipped: `budget: reservation refused (${r.reason})` };
    }

    budget.committedThisRunUsd = roundUsd(budget.committedThisRunUsd + estimate);
    const line = { at: now().toISOString(), endpoint, requested, holdId, estimateUsd: estimate, costUsd: null, status: 'reserved', budget: 'pending' };
    run.spend.push(line);
    const settlePayload = (extra) => ({
      endpoint,
      requested,
      location: mkt.locationName,
      language: mkt.languageCode,
      source: 'scout',
      runId: attemptId,
      ...extra,
    });

    let res;
    try {
      res = await exec();
    } catch (err) {
      const reported = typeof err?.cost === 'number' && err.cost > 0 ? err.cost : 0;
      if (reported) {
        line.status = 'charged';
        line.costUsd = roundUsd(reported);
        budget.committedThisRunUsd = roundUsd(budget.committedThisRunUsd - estimate + reported);
        budget.spentThisRunUsd = roundUsd(budget.spentThisRunUsd + reported);
        await budgetOp('settle', { holdId, actualUsd: reported, payload: settlePayload({ measured: 0, error: err.message }) }, line);
      } else if (err?.chargeUnknown) {
        // May have been charged: stays counted at its estimate, is never retried automatically.
        line.status = 'uncertain';
        budget.spentThisRunUsd = roundUsd(budget.spentThisRunUsd + estimate);
        deps.cache.set('uncertain', requestKey, { data: { holdId, endpoint, reason: err.message } });
        deps.cache.save();
        await budgetOp('uncertain', { holdId, note: err.message }, line);
      } else {
        line.status = 'released';
        budget.committedThisRunUsd = roundUsd(budget.committedThisRunUsd - estimate);
        await budgetOp('release', { holdId, note: err.message }, line);
      }
      handleErr(err, endpoint);
      return { error: err?.message ?? 'failed' };
    }

    const actual = res.cost ?? estimate;
    line.status = 'charged';
    line.costUsd = roundUsd(actual);
    line.costEstimated = res.cost === null;
    budget.committedThisRunUsd = roundUsd(budget.committedThisRunUsd - estimate + actual);
    budget.spentThisRunUsd = roundUsd(budget.spentThisRunUsd + actual);
    await budgetOp('settle', { holdId, actualUsd: actual, payload: settlePayload({ measured: res.measured, measuredAt: res.measuredAt, estimated: res.cost === null }) }, line);
    return { res };
  }

  // 1) Keywords — one Labs task per market for every uncached keyword across the shortlist.
  const kwKey = (m, k) => cacheKeys.keyword(m, k);
  const adsKey = (m, k) => cacheKeys.ads(m, k);
  const planned = (idea) => KEYWORD_GROUPS.flatMap((g) => idea.plan.keywords[g].map((keyword) => ({ keyword, group: g })));
  const buyable = todo.filter((i) => {
    if (!unsupported(i)) return true;
    skips.set(i.id, [...(skips.get(i.id) ?? []), `market ${marketOf(i).locationName}/${marketOf(i).languageCode} is not supported by DataForSEO Labs`]);
    return false;
  });
  const groups = new Map(); // market key → { market, ideas, needed }
  for (const idea of buyable) {
    const m = marketOf(idea);
    const g = groups.get(cacheKeys.market(m)) ?? { market: m, ideas: [], needed: [] };
    g.ideas.push(idea);
    for (const r of planned(idea)) if (!deps.cache.get('keywords', kwKey(m, r.keyword)) && !g.needed.includes(r.keyword)) g.needed.push(r.keyword);
    groups.set(cacheKeys.market(m), g);
  }
  const serpNeeded = buyable.flatMap((i) => i.plan.serpQueries.map((q) => [marketOf(i), q])).filter(([m, q]) => !deps.cache.get('serp', cacheKeys.serp(m, q, config.serpDepth)));
  const labsNeeded = [...groups.values()].filter((g) => g.needed.length);
  const plannedKeywordCount = buyable.reduce((n, i) => n + planned(i).length, 0);
  run.projection = {
    labsTasks: labsNeeded.length,
    labsKeywords: labsNeeded.reduce((n, g) => n + g.needed.length, 0),
    keywordsFromCache: plannedKeywordCount - labsNeeded.reduce((n, g) => n + g.needed.length, 0),
    labsUsd: roundUsd(labsNeeded.reduce((n, g) => n + projectLabsCost(g.needed.length), 0)),
    serpQueries: serpNeeded.length,
    serpsFromCache: buyable.reduce((n, i) => n + i.plan.serpQueries.length, 0) - serpNeeded.length,
    serpUsd: roundUsd(serpNeeded.length * projectSerpCost(config.serpDepth)),
    markets: [...groups.values()].map((g) => ({ location: g.market.locationName, language: g.market.languageCode, ideas: g.ideas.length, keywordsToBuy: g.needed.length })),
  };
  run.projection.totalUsd = roundUsd(run.projection.labsUsd + run.projection.serpUsd);
  run.projection.reservedUsd = roundUsd(run.projection.totalUsd * RESERVE_MARGIN);

  for (const g of labsNeeded) {
    const out = await paid({
      endpoint: 'dataforseo_labs/google/keyword_overview/live',
      cacheKey: `labs|${cacheKeys.market(g.market)}|${g.needed.join(',')}`,
      projected: projectLabsCost(g.needed.length),
      requested: g.needed.length,
      market: g.market,
      exec: async () => {
        const r = await deps.dfs.keywordOverview(g.needed, g.market);
        return { ...r, measured: r.items.filter((i) => i.searchVolume !== null).length };
      },
    });
    if (out.res) {
      const byKw = new Map(out.res.items.map((i) => [i.keyword, i]));
      for (const k of g.needed) {
        const it = byKw.get(k);
        deps.cache.set('keywords', kwKey(g.market, k), it ? { returned: true, data: it } : { returned: false, data: null }, out.res.measuredAt);
      }
      deps.cache.save(); // paid data is persisted before anything else can fail
    } else {
      for (const i of g.ideas) skips.set(i.id, [...(skips.get(i.id) ?? []), `keywords not collected — ${out.skipped ?? out.error}`]);
    }
  }

  // 1b) Optional Google Ads fallback — ONE task per market for every keyword Labs had no figure for.
  const labsMissed = (m, k) => {
    const c = deps.cache.get('keywords', kwKey(m, k));
    return c && (!c.returned || c.data?.searchVolume === null);
  };
  if (config.adsFallback) {
    let adsKeywords = 0;
    let adsUsd = 0;
    for (const g of groups.values()) {
      const adsNeeded = [...new Set(g.ideas.flatMap((i) => planned(i).map((r) => r.keyword)))].filter((k) => labsMissed(g.market, k) && !deps.cache.get('ads', adsKey(g.market, k)));
      adsKeywords += adsNeeded.length;
      adsUsd += projectAdsCost(adsNeeded.length);
      if (!adsNeeded.length) continue;
      const out = await paid({
        endpoint: 'keywords_data/google_ads/search_volume/live',
        cacheKey: `ads|${cacheKeys.market(g.market)}|${adsNeeded.join(',')}`,
        projected: projectAdsCost(adsNeeded.length),
        requested: adsNeeded.length,
        market: g.market,
        exec: async () => {
          const r = await deps.dfs.adsSearchVolume(adsNeeded, g.market);
          return { ...r, measured: r.items.filter((i) => i.searchVolume !== null).length };
        },
      });
      if (out.res) {
        const byKw = new Map(out.res.items.map((i) => [i.keyword, i]));
        for (const k of adsNeeded) {
          const it = byKw.get(k);
          deps.cache.set('ads', adsKey(g.market, k), it ? { returned: true, data: it } : { returned: false, data: null }, out.res.measuredAt);
        }
        deps.cache.save();
      } else {
        for (const i of g.ideas) skips.set(i.id, [...(skips.get(i.id) ?? []), `Google Ads fallback not collected — ${out.skipped ?? out.error}`]);
      }
    }
    run.projection.adsKeywords = adsKeywords;
    run.projection.adsUsd = roundUsd(adsUsd);
    run.projection.totalUsd = roundUsd(run.projection.totalUsd + run.projection.adsUsd);
  }

  for (const idea of todo) {
    const m = marketOf(idea);
    idea.keywords = planned(idea).map((r, idx) => {
      const id = `K${idx + 1}`;
      const base = { id, keyword: r.keyword, group: r.group };
      const labs = deps.cache.get('keywords', kwKey(m, r.keyword));
      const ads = deps.cache.get('ads', adsKey(m, r.keyword));
      const labsHasFigure = labs?.returned && labs.data.searchVolume !== null;
      const adsHasFigure = ads?.returned && ads.data.searchVolume !== null;
      const c = labsHasFigure ? labs : adsHasFigure ? ads : labs;
      if (!c) return { ...base, status: 'not_collected', searchVolume: null };
      const provenance = {
        provider: c === ads ? 'DataForSEO Google Ads · search_volume' : 'DataForSEO Labs · keyword_overview',
        location: m.locationName,
        language: m.languageCode,
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
    const m = marketOf(idea);
    for (const [qi, query] of idea.plan.serpQueries.entries()) {
      const key = cacheKeys.serp(m, query, config.serpDepth);
      let c = deps.cache.get('serp', key);
      if (!c && !unsupported(idea)) {
        const out = await paid({
          endpoint: 'serp/google/organic/live/regular',
          cacheKey: key,
          projected: projectSerpCost(config.serpDepth),
          requested: 1,
          market: m,
          exec: async () => {
            const r = await deps.dfs.serpOrganic(query, { ...m, depth: config.serpDepth });
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
          location: m.locationName,
          language: m.languageCode,
          retrievedAt: c.fetchedAt,
          checkUrl: c.data.checkUrl,
          items: c.data.items.map((it) => ({ ...it, id: `${sid}.${it.rank}`, class: classifyDomain(it.domain) })),
        });
      }
    }
    idea.serps = serps;
  }

  // 3) Competitor pages — free fetches of vendor-like ranking sites (homepage + /pricing).
  for (const idea of todo) idea.pages = await collectPages(idea, config, deps);

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
    backend: budget.backend,
    atomic: budget.atomic,
    capUsd: budget.capUsd,
    reserveUsd: budget.reserveUsd,
    maxRunUsd: budget.maxRunUsd,
    sharedBefore: budget.sharedBefore,
    monthToDateUsdBefore: budget.sharedBefore ? roundUsd(budget.sharedBefore.chargedUsd + budget.sharedBefore.heldUsd) : null,
    spentThisRunUsd: budget.spentThisRunUsd,
  };
  deps.cache.save();
  return run;
}

/**
 * Free page observations for an idea's vendor-like ranking sites. `refresh` re-fetches pages
 * that were previously refused or failed (successful answers stay cached).
 */
export async function collectPages(idea, config, deps, { refresh = false } = {}) {
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
      if (cached && !(refresh && cached.data?.error)) return { domain, ...cached.data, retrievedAt: cached.fetchedAt };
      const p = await deps.fetchPage(url);
      // Cache real answers (including robots refusals); retry transient failures next run.
      if (p.status || p.error === 'robots.txt disallows this path') deps.cache.set('pages', key, { data: p }, p.retrievedAt);
      return { domain, ...p };
    }),
  );
  deps.cache.save();
  return pages.map((p, i) => ({ id: `P${i + 1}`, ...p }));
}

// ---------- Assess ----------

export function assessPrompt(bundle) {
  return `You write evidence-bound assessments of business opportunities for a solo founder. You are NOT deciding what to build; you describe what the evidence shows and what the cheapest next test is.

Hard rules:
- Use ONLY the evidence in the JSON below. Evidence ids: K = keyword measurement, S = search result, P = fetched page.
- EVERY citation is an object {"id": "S1.3", "quote": "..."} where quote is words copied EXACTLY (verbatim, 3+ words) from that item's title, snippet, description or price text. A citation whose quote is not found in the cited item is discarded, and a level resting only on discarded citations becomes "unknown". A valid id without a matching quote proves nothing.
- Problem evidence must come from search results or pages where people or publishers describe the problem — a keyword row (K) is search demand, not problem evidence.
- Separate observation from inference. "observed" = directly shown by a quoted item. A claim that something is ABSENT (a competitor lacks X, nobody offers Y) is always "inference".
- Search volume is searches, not customers. CPC is an advertiser bid, not willingness to pay. Google Ads competition is not SEO difficulty. Never add keyword volumes together. A keyword with searchVolume null has NO data: do not give it a figure and do not call it zero or low demand.
- Low search volume alone is not a reason to stop: B2B, regulated and emerging problems often have little search.
- No numeric confidence scores or probabilities. Use only the allowed level words.
- Do not include any URL that is not in the evidence.
- "original" is Scout's own earlier memo for the idea — unverified reasoning. Use it to describe the idea and to state what changed; never as evidence.

For each idea return:
{
 "id": "<idea id>",
 "opportunity": "2 sentences: what the opportunity is.",
 "whoPays": "who pays and why, 1-2 sentences, marked as inference unless an item shows it",
 "problemEvidence": {"level": "unknown|weak|moderate|strong", "basis": [{"id": "S1.3", "quote": "exact words"}], "observed": "what the quoted items show", "inference": "what you infer, clearly"},
 "competition": {"level": "unknown|sparse|some|crowded", "basis": [{"id": "P1", "quote": "exact words"}],
   "alternatives": [{"name": "", "what": "what they offer, from the page", "basis": [{"id": "P1", "quote": "exact words"}]}],
   "strengths": [{"text": "", "basis": [{"id": "P1", "quote": "exact words"}], "kind": "observed|inference"}],
   "gaps": [{"text": "", "basis": [], "kind": "observed|inference"}]},
 "changes": [{"original": "a short phrase copied EXACTLY from the original memo", "finding": "what the new evidence shows about it", "basis": [{"id": "K2", "quote": "exact words"}], "effect": "supports|weakens|contradicts|untested"}],
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

function evidenceBundle(idea, original) {
  return {
    id: idea.id,
    title: idea.title,
    market: idea.market ? { location: idea.market.locationName, language: idea.market.languageCode } : undefined,
    plan: { problem: idea.plan.problem, targetCustomer: idea.plan.targetCustomer, payer: idea.plan.payer, whyPayerPays: idea.plan.whyPayerPays },
    original,
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
  return new Set(evidenceIndex(idea).keys());
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

/**
 * Validate one model assessment against the idea's evidence. Pure.
 * Everything that is not supported by a verbatim quote from the cited item is downgraded,
 * relabelled as inference, or removed — and each such decision is recorded in `validation`.
 */
export function constrainAssessment(a, idea, { original = '' } = {}) {
  const index = evidenceIndex(idea);
  const urls = ideaEvidenceUrls(idea);
  const originalNorm = normText(original);
  const validation = { removedLinks: 0, scrubbedSentences: 0, removedSentences: [], rejectedCitations: [], downgraded: [], dropped: [] };

  const clean = (t, max = 1200) => {
    const r = stripUnverifiedUrls(String(t ?? '').slice(0, max), urls);
    validation.removedLinks += r.removed;
    const d = scrubDemandClaims(r.text, idea);
    validation.scrubbedSentences += d.removed;
    validation.removedSentences.push(...d.removedSentences);
    return d.text.trim();
  };
  const cited = (basis, what) => {
    const r = checkBasis(basis, index);
    for (const x of r.rejected) validation.rejectedCitations.push({ claim: what, ...x });
    return r.supported;
  };
  const claimed = (x, levels) => (levels.includes(x) ? x : 'unknown');

  const peBasis = cited(a?.problemEvidence?.basis, 'problem evidence');
  const peClaimed = claimed(a?.problemEvidence?.level, LEVELS);
  const pe = capProblemLevel(peClaimed, peBasis);
  if (pe.level !== peClaimed) validation.downgraded.push(`problem evidence ${peClaimed} → ${pe.level}: ${pe.why}`);
  const peSources = peBasis.filter((b) => b.kind !== 'K');

  const compBasis = cited(a?.competition?.basis, 'competition');
  const compClaimed = claimed(a?.competition?.level, COMPETITION_LEVELS);
  const comp = capCompetitionLevel(compClaimed, compBasis, idea.readings?.competitors);
  if (comp.level !== compClaimed) validation.downgraded.push(`competition ${compClaimed} → ${comp.level}: ${comp.why}`);

  const claims = (arr, what) =>
    (Array.isArray(arr) ? arr : []).slice(0, 5).map((c) => {
      const text = clean(c?.text, 400);
      const basis = cited(c?.basis, what);
      const observed = c?.kind === 'observed' && basis.length > 0 && !ABSENCE.test(text);
      if (c?.kind === 'observed' && !observed) validation.downgraded.push(`${what} "${text.slice(0, 60)}" observed → inference`);
      return { text, basis, kind: observed ? 'observed' : 'inference' };
    }).filter((c) => c.text);

  const alternatives = [];
  for (const x of (Array.isArray(a?.competition?.alternatives) ? a.competition.alternatives : []).slice(0, 6)) {
    const name = clean(x?.name, 120);
    const basis = cited(x?.basis, `alternative ${name}`);
    if (name && basis.length && nameMatchesEvidence(name, basis, index)) alternatives.push({ name, what: clean(x?.what, 300), basis });
    else if (name) validation.dropped.push(`alternative "${name}": no quoted evidence naming it`);
  }

  // Headings ("## Competitive landscape") and labels ("Real pain in their words:") are verbatim
  // but are not claims, so a change "against" them says nothing.
  const bare = (t) => normText(t).replace(/[*_`"'‘’“”:.]/g, '').replace(/\s+/g, ' ').trim();
  const headings = new Set(String(original).split('\n').filter((l) => /^\s*#{1,6}\s/.test(l)).map((l) => bare(l.replace(/^\s*#{1,6}\s+/, ''))));
  const labels = new Set([...String(original).matchAll(/(?:^|\n|\*\*)\s*([^\n:*]{3,60}):/g)].map((m) => bare(m[1])));
  const changes = [];
  for (const c of (Array.isArray(a?.changes) ? a.changes : []).slice(0, 6)) {
    const quoteOriginal = normText(c?.original);
    if (!quoteOriginal || !quoteFound(originalNorm, quoteOriginal).found) {
      validation.dropped.push(`change: original text "${String(c?.original ?? '').slice(0, 60)}" is not in Scout's memo`);
      continue;
    }
    if (headings.has(bare(quoteOriginal)) || labels.has(bare(quoteOriginal))) {
      validation.dropped.push(`change: "${String(c.original).slice(0, 60)}" is a heading or label in Scout's memo, not a claim`);
      continue;
    }
    const basis = cited(c?.basis, 'change');
    const effectClaimed = ['supports', 'weakens', 'contradicts', 'untested'].includes(c?.effect) ? c.effect : 'untested';
    // A keyword the provider returned NO figure for is unknown: it cannot support or weaken anything.
    const measuredIds = new Set(idea.keywords.filter((k) => k.status === 'measured').map((k) => k.id));
    const informative = basis.filter((b) => b.kind !== 'K' || measuredIds.has(b.id));
    const finding = clean(c?.finding, 500);
    let effect = effectClaimed;
    let why = null;
    if (effect !== 'untested' && !informative.length) {
      effect = 'untested';
      why = basis.length ? 'cites only keywords with no data (unknown, not evidence)' : 'no quoted evidence';
    } else if (effect !== 'untested' && /\b(market|validated|proven|profitable|pay|paid|revenue|sales|willing)\b/i.test(quoteOriginal) && informative.every((b) => b.kind === 'K')) {
      effect = 'untested';
      why = 'a claim about payment or a validated market cannot rest on search volume';
    } else if (effect === 'contradicts' && ABSENCE.test(finding)) {
      effect = 'weakens';
      why = 'the finding relies on something not being seen, which cannot contradict a claim';
    }
    if (effect !== effectClaimed) validation.downgraded.push(`change "${quoteOriginal.slice(0, 50)}" ${effectClaimed} → ${effect}: ${why}`);
    changes.push({ original: String(c.original).trim(), finding, basis, effect });
  }

  return {
    opportunity: clean(a?.opportunity, 600),
    whoPays: clean(a?.whoPays, 600),
    problemEvidence: {
      level: pe.level,
      basis: peBasis,
      observed: peSources.length ? clean(a?.problemEvidence?.observed) : '',
      inference: clean(a?.problemEvidence?.inference),
    },
    competition: {
      level: comp.level,
      basis: compBasis,
      alternatives,
      strengths: claims(a?.competition?.strengths, 'strength'),
      gaps: claims(a?.competition?.gaps, 'gap'),
    },
    changes,
    feasibility: { level: FEASIBILITY_LEVELS.includes(a?.feasibility?.level) ? a.feasibility.level : 'unknown', note: clean(a?.feasibility?.note, 500) },
    unproven: (Array.isArray(a?.unproven) ? a.unproven : []).slice(0, 6).map((x) => clean(x, 300)).filter(Boolean),
    nextExperiment: { what: clean(a?.nextExperiment?.what, 600), cost: clean(a?.nextExperiment?.cost, 200), duration: clean(a?.nextExperiment?.duration, 120) },
    continueIf: clean(a?.continueIf, 400),
    stopIf: clean(a?.stopIf, 400),
    removedLinks: validation.removedLinks,
    downgraded: validation.downgraded,
    validation,
  };
}

/**
 * Assess ideas whose evidence is new or changed, a few per model call. Each batch is applied
 * as soon as it returns, so a failed or truncated call loses only that batch — the evidence is
 * untouched and the next run retries exactly the unassessed ideas.
 */
export async function assessEvidence({ run, gemini, scoutContext = '', originalFor = null, models = [], batchSize = 3, now = () => new Date() }) {
  const targets = run.ideas.filter(
    (i) => (i.status === 'enriched' || i.status === 'partial') && (!i.assessment || i.assessment.evidenceUpdatedAt !== i.evidenceUpdatedAt),
  );
  if (!targets.length) return run;
  const originalOf = (idea) => String(originalFor ? originalFor(idea) : scoutContext).slice(0, 6000);
  const errors = [];
  for (let at = 0; at < targets.length; at += batchSize) {
    const batch = targets.slice(at, at + batchSize);
    let raw;
    try {
      raw = await gemini.generateJson('enrich-assess', assessPrompt({ ideas: batch.map((i) => evidenceBundle(i, originalOf(i))) }), {
        temperature: 0.2,
        maxTokens: 32768,
        ...(models.length ? { models } : {}),
      });
    } catch (err) {
      errors.push(`${batch.map((i) => i.id).join(', ')}: ${err.message}`);
      continue;
    }
    const byId = new Map((Array.isArray(raw?.ideas) ? raw.ideas : []).map((a) => [String(a?.id), a]));
    for (const idea of batch) {
      const a = byId.get(idea.id);
      if (!a) {
        errors.push(`${idea.id}: the model returned no assessment for it`);
        continue;
      }
      // The raw model output is kept so validators can be re-applied offline and audited.
      idea.assessmentRaw = a;
      idea.assessment = { ...constrainAssessment(a, idea, { original: originalOf(idea) }), assessedAt: now().toISOString(), evidenceUpdatedAt: idea.evidenceUpdatedAt };
    }
  }
  if (errors.length) run.assessmentError = `assessment not written for some ideas (they will be retried): ${errors.join(' | ')}`.slice(0, 1500);
  else delete run.assessmentError;
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
  const parts = ['The idea', 'Who pays and why', 'Why now', 'Size of opportunity', 'Competitive landscape', 'Validation plan']
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
