// Evidence enrichment on demand — for an existing memo, or to resume pending evidence.
//
//   node scripts/enrich.mjs --date 2026-09-13            # mode from SCOUT_DFS_MODE (default dry-run)
//   node scripts/enrich.mjs --date 2026-09-13 --dry-run  # never makes a paid request
//   node scripts/enrich.mjs --date 2026-09-13 --live     # paid requests, behind the shared budget gate
//   node scripts/enrich.mjs --date 2026-09-13 --plan my-keywords.json   # hand-written keyword plan
//   node scripts/enrich.mjs --date 2026-09-13 --live --retry-uncertain  # re-send requests whose earlier
//                                                                        # outcome was unknown (check the
//                                                                        # DataForSEO dashboard first)
//
// If evidence/<date>.json exists it is resumed (enriched ideas are never redone).
// Otherwise the plan is built from ideas/<date>.md — the memo's own idea — and the memo
// itself is never modified.

import { existsSync, readFileSync } from 'node:fs';
import { createGemini } from './lib/gemini.mjs';
import { normalizePlan } from './lib/evidence.mjs';
import {
  readEnrichConfig,
  buildDeps,
  planIdeas,
  newRun,
  gatherEvidence,
  assessEvidence,
  attachOriginal,
  loadRun,
  saveRun,
  memoContext,
  evidencePaths,
} from './lib/enrich.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const date = value('--date') ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('Usage: node scripts/enrich.mjs --date YYYY-MM-DD [--dry-run | --live]');
  process.exit(1);
}

const env = { ...process.env };
if (flag('--dry-run')) env.SCOUT_DFS_MODE = 'dry-run';
else if (flag('--live')) env.SCOUT_DFS_MODE = 'live';
if (flag('--retry-uncertain')) env.SCOUT_RETRY_UNCERTAIN = '1';

const config = readEnrichConfig(env);
if (config.maxIdeas === 0) {
  console.log('SCOUT_ENRICH_MAX_IDEAS is 0 — enrichment disabled.');
  process.exit(0);
}

const gemini = env.GEMINI_API_KEY ? createGemini(env.GEMINI_API_KEY) : null;
const memoPath = `ideas/${date}.md`;
const memo = existsSync(memoPath) ? readFileSync(memoPath, 'utf8') : null;

let run = loadRun(date);
if (!run) {
  if (!memo) {
    console.error(`No ${memoPath} and no evidence/${date}.json — nothing to enrich.`);
    process.exit(1);
  }
  const ctx = memoContext(memo);
  const planFile = value('--plan');
  let plans;
  if (planFile) {
    // A hand-written plan ({"ideas":[...]}, same shape as the planner's output) goes through
    // the same validation and is recorded as manual, so it is never mistaken for Scout's own.
    plans = normalizePlan(JSON.parse(readFileSync(planFile, 'utf8')), {
      maxIdeas: 1,
      keywordsPerGroup: config.keywordsPerGroup,
      serpsPerIdea: config.serpsPerIdea,
    });
  } else {
    if (!gemini) {
      console.error('GEMINI_API_KEY is required to plan keywords (or pass --plan <file.json>).');
      process.exit(1);
    }
    plans = await planIdeas({ gemini, sourceText: ctx.excerpt, sourceKind: 'memo', config });
  }
  if (!plans.length) {
    console.error('No usable keyword plan.');
    process.exit(1);
  }
  run = newRun({ date, source: { kind: 'memo', memo: memoPath, planner: planFile ? 'manual' : 'gemini' }, config, plans });
  attachOriginal(run, { memoPath, title: ctx.title, score: ctx.score, conviction: ctx.conviction });
}

const deps = buildDeps(env);
if (config.mode === 'live' && !deps.budget.atomic) {
  console.warn('⚠ SCOUT_BUDGET_BACKEND=legacy-ledger: spend is recorded, but reservations are NOT atomic across apps. Supervised use only.');
}
await gatherEvidence({ run, config, deps });
if (gemini) await assessEvidence({ run, gemini, scoutContext: memo ? memoContext(memo).excerpt : '', models: config.models });
else run.assessmentError = 'assessment not written: GEMINI_API_KEY is not set';
saveRun(run);

const p = evidencePaths(date);
console.log(`✓ Wrote ${p.md} and ${p.json}`);
console.log(`  mode: ${config.mode} · provider: ${run.provider.status}${run.provider.reason ? ` — ${run.provider.reason}` : ''}`);
console.log(`  market: ${run.market.locationName}/${run.market.languageCode} · supported: ${run.market.support?.supported}`);
if (run.lastGather?.pendingIdeas === 0) console.log(`  ${run.lastGather.note}`);
else console.log(`  projected: $${run.projection?.totalUsd ?? 0} · spent now: $${run.lastGather?.spentUsd ?? 0} · shared month-to-date before: $${run.budget.monthToDateUsdBefore}`);
for (const i of run.ideas) console.log(`  - ${i.id}: ${i.status}${i.assessment ? ' · assessed' : ''}${i.reason ? ` (${i.reason})` : ''}`);
