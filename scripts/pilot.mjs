// Evidence-enrichment pilot on existing Scout ideas.
//
//   node scripts/pilot.mjs select  --pilot <dir> [--count 10]   choose ideas (explicit queue, else source order)
//   node scripts/pilot.mjs select  --pilot <dir> --from <dir> [--measure keywords-only]   same ideas as another pilot (planner comparison)
//   node scripts/pilot.mjs plan    --pilot <dir>                keyword plans via Scout's Gemini config (GEMINI_API_KEY)
//   node scripts/pilot.mjs preview --pilot <dir>                dry run: requests, cache reuse, geography, estimated cost
//   node scripts/pilot.mjs gather  --pilot <dir> --live         paid DataForSEO requests, behind the budget gate
//   node scripts/pilot.mjs assess  --pilot <dir> [--expect-failure]
//   node scripts/pilot.mjs check   --pilot <dir>                verification report (plans, grounding, unknowns, memos untouched)
//   node scripts/pilot.mjs report  --pilot <dir>                readable per-idea comparison
//   node scripts/pilot.mjs compare --pilot <dir>                planner comparison against the pilot's baseline (keywords-only pilots)
//
// Never writes to ideas/ or outcomes/, and never touches the bot's favorites (manual selection).
// Every step writes only inside the pilot directory (plus the shared evidence cache on gather).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createGemini } from './lib/gemini.mjs';
import { readJson, writeJsonAtomic } from './lib/cache.mjs';
import {
  readEnrichConfig,
  buildDeps,
  planIdeas,
  newRun,
  gatherEvidence,
  assessEvidence,
  memoContext,
  saveRunAt,
  evidenceFingerprint,
  collectPages,
  constrainAssessment,
} from './lib/enrich.mjs';
import { checkBasis, evidenceIndex, scrubDemandClaims, figureAfterKeyword, normText } from './lib/grounding.mjs';
import { planShapeIssues, HEAD_TERM_MAX_WORDS, demandReading } from './lib/evidence.mjs';

const [cmd, ...args] = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};

const pilotDir = value('--pilot') ?? 'evidence/pilots/pilot-10-source-order';
if (!/^evidence\/pilots\/[a-z0-9-]+$/.test(pilotDir)) {
  console.error('--pilot must look like evidence/pilots/<name>');
  process.exit(1);
}
const P = {
  pilot: join(pilotDir, 'pilot.json'),
  plans: join(pilotDir, 'plans.json'),
  preview: join(pilotDir, 'preview.json'),
  previewMd: join(pilotDir, 'PREVIEW.md'),
  run: join(pilotDir, 'run.json'),
  runMd: join(pilotDir, 'evidence.md'),
  check: join(pilotDir, 'MODEL-CHECK.md'),
  report: join(pilotDir, 'REPORT.md'),
  review: join(pilotDir, 'review.json'),
};
const rootRel = relative(pilotDir, '.') || '.';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const readText = (p) => readFileSync(p, 'utf8');
const money = (n) => (typeof n === 'number' ? `$${n.toFixed(5)}` : 'n/a');
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();

function need(path, hint) {
  if (!existsSync(path)) {
    console.error(`Missing ${path} — run \`${hint}\` first.`);
    process.exit(1);
  }
  return readJson(path, null);
}

function section(md, heading) {
  const m = md.match(new RegExp(`##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i'));
  return m ? m[1].trim() : '';
}

// ---------- select ----------
if (cmd === 'select') {
  const count = Number(value('--count') ?? 10);
  const queueCandidates = ['pilot/queue.json', 'PILOT_QUEUE.md', 'evidence/pilots/queue.json', 'outcomes/pilot-queue.md'];
  const queue = queueCandidates.find((p) => existsSync(p));
  const outcomeFiles = existsSync('outcomes') ? readdirSync('outcomes').filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md') : [];
  let files;
  let rule;
  const from = value('--from');
  if (from) {
    if (!/^evidence\/pilots\/[a-z0-9-]+$/.test(from) || from === pilotDir) {
      console.error('--from must be another evidence/pilots/<name>');
      process.exit(1);
    }
    const src = need(join(from, 'pilot.json'), `node scripts/pilot.mjs select --pilot ${from}`);
    const changed = src.ideas.filter((i) => sha(readText(i.memo)) !== i.memoSha256).map((i) => i.id);
    if (changed.length) {
      console.error(`Memos changed since ${from} selected them: ${changed.join(', ')}`);
      process.exit(1);
    }
    files = src.ideas.map((i) => i.memo.replace(/^ideas\//, ''));
    rule = `The same ${files.length} ideas as ${from} (memo SHA-256s re-verified), so plans can be compared on identical inputs — not a new selection. That pilot's rule: ${src.selectionRule}`;
  } else if (queue) {
    console.error(`An explicit pilot queue exists at ${queue}; implement reading it before selecting.`);
    process.exit(1);
  } else {
    files = readdirSync('ideas').filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort().slice(0, count);
    rule = `No explicit pilot queue exists, so the first ${count} memos in Scout's original source order were selected: ideas/YYYY-MM-DD.md sorted by file name (the date Scout produced them), oldest first. Non-daily memos (e.g. ideas/2026-06-03-pattern-break.md) are not part of the daily source order.`;
  }
  const ideas = files.map((f) => {
    const md = readText(join('ideas', f));
    const ctx = memoContext(md);
    return { id: f.replace(/\.md$/, ''), memo: `ideas/${f}`, title: ctx.title, originalConviction: ctx.conviction, originalScore: ctx.score, memoSha256: sha(md) };
  });
  const previous = ['2026-09-13', '2026-09-11', '2026-08-21'];
  const pilot = {
    id: pilotDir.split('/').pop(),
    createdAt: new Date().toISOString(),
    selectionRule: rule,
    queueChecked: [
      ...queueCandidates.map((p) => `${p}: not present`),
      `outcomes/: ${outcomeFiles.length} outcome file(s) (not a queue)`,
      'Telegram bot favorites (manual selection, Cloudflare KV): not read and not changed',
    ],
    measure: value('--measure') === 'keywords-only' ? 'keywords-only' : 'full',
    baseline: from ?? null,
    previousPilot: {
      dir: 'evidence/pilots/pilot-3-manual-plans',
      ids: previous,
      overlapWithThisPilot: previous.filter((id) => ideas.some((i) => i.id === id)),
      note: 'Hand-written keyword plans, live data gathered 2026-09-14 ($0.1392 recorded in the shared ledger). Kept separately and unchanged.',
    },
    ideas,
  };
  mkdirSync(pilotDir, { recursive: true });
  writeJsonAtomic(P.pilot, pilot);
  console.log(`✓ ${P.pilot}: ${ideas.map((i) => i.id).join(', ')}`);
  process.exit(0);
}

const pilot = need(P.pilot, `node scripts/pilot.mjs select --pilot ${pilotDir}`);
const config = readEnrichConfig();
const models = config.models.length ? config.models : undefined;

function runner() {
  return process.env.GITHUB_RUN_ID
    ? { kind: 'github-actions', runId: process.env.GITHUB_RUN_ID, sha: process.env.GITHUB_SHA, ref: process.env.GITHUB_REF_NAME, workflow: process.env.GITHUB_WORKFLOW }
    : { kind: 'local' };
}

function buildRun(plans) {
  const planned = pilot.ideas.filter((i) => plans.plans[i.id]);
  // Resolve markets against the allowlist the plans were made with, not whatever this shell has.
  const planConfig = { ...config, markets: plans.config?.markets?.length ? plans.config.markets : config.markets };
  // A keywords-only pilot measures search demand for its plans and buys no search result pages.
  const keywordsOnly = pilot.measure === 'keywords-only';
  const run = newRun({ date: pilot.id, source: { kind: 'pilot', planner: plans.planner }, config: planConfig, plans: planned.map((i) => (keywordsOnly ? { ...plans.plans[i.id], serpQueries: [] } : plans.plans[i.id])) });
  run.measure = keywordsOnly ? 'keywords-only' : 'full';
  run.ideas.forEach((idea, k) => {
    const src = planned[k];
    idea.id = src.id; // Scout's stable idea id
    idea.original = { memo: src.memo, title: src.title, conviction: src.originalConviction, score: src.originalScore };
  });
  return run;
}

// ---------- plan ----------
if (cmd === 'plan') {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set — planning needs Scout\'s Gemini configuration.');
    process.exit(1);
  }
  const gemini = createGemini(process.env.GEMINI_API_KEY);
  const out = { generatedAt: new Date().toISOString(), runner: runner(), planner: { kind: 'gemini', models: models ?? ['gemini-2.5-flash', 'gemini-2.5-pro'] }, config: { markets: config.markets, keywordsPerGroup: config.keywordsPerGroup, serpsPerIdea: config.serpsPerIdea }, plans: {}, failures: {} };
  for (const i of pilot.ideas) {
    try {
      const [plan] = await planIdeas({ gemini, sourceText: memoContext(readText(i.memo)).excerpt, sourceKind: 'memo', config });
      if (plan) out.plans[i.id] = plan;
      else out.failures[i.id] = 'planner returned no usable plan';
    } catch (err) {
      out.failures[i.id] = err.message;
    }
    console.log(`[plan] ${i.id}: ${out.plans[i.id] ? `${Object.values(out.plans[i.id].keywords).flat().length} keywords, market ${out.plans[i.id].market?.location}/${out.plans[i.id].market?.language}` : `FAILED — ${out.failures[i.id]}`}`);
  }
  writeJsonAtomic(P.plans, out);
  console.log(`✓ ${P.plans}: ${Object.keys(out.plans).length} planned, ${Object.keys(out.failures).length} failed`);
  process.exit(Object.keys(out.plans).length ? 0 : 1);
}

// ---------- preview ----------
if (cmd === 'preview') {
  const plans = need(P.plans, `node scripts/pilot.mjs plan --pilot ${pilotDir}`);
  const previewConfig = { ...config, mode: 'dry-run' };
  const run = buildRun(plans);
  const deps = buildDeps({ ...process.env, SCOUT_DFS_MODE: 'dry-run' });
  await gatherEvidence({ run, config: previewConfig, deps });
  writeJsonAtomic(P.preview, run);
  const pr = run.projection;
  const lines = [
    `# Pilot preview — ${pilot.id} (dry run, no paid requests)`,
    '',
    `_Generated ${run.updatedAt}. Nothing was bought. Estimates use the published prices; the gate reserves each request at ×1.1 and records the provider-reported cost._`,
    '',
    `- Selection: ${pilot.selectionRule}`,
    `- Budget backend: ${deps.budget.backend}${deps.budget.atomic ? '' : ' (not atomic across apps — supervised use only)'}; shared cap ${money(config.capUsd)}, Scout reserve ${money(config.reserveUsd)}, per-run limit ${money(config.maxRunUsd)}`,
    `- Shared DataForSEO spend this month before the run: ${run.budget.sharedBefore ? `${money(run.budget.sharedBefore.chargedUsd)} charged + ${money(run.budget.sharedBefore.heldUsd)} held` : 'not read (budget not configured for this preview)'}`,
    `- Paid requests planned: ${pr.labsTasks} Labs keyword task(s) for ${pr.labsKeywords} keyword(s) + ${pr.serpQueries} live search result page(s)`,
    `- Reused from cache: ${pr.keywordsFromCache} keyword measurement(s), ${pr.serpsFromCache} search result page(s)`,
    `- Estimated additional cost: ${money(pr.totalUsd)} (${money(pr.labsUsd)} keywords + ${money(pr.serpUsd)} search results); reserved at ${money(pr.reservedUsd)}${pr.reservedUsd > config.maxRunUsd ? ` — EXCEEDS the ${money(config.maxRunUsd)} per-run limit: the last requests would be refused, not split into another run` : ` — within the ${money(config.maxRunUsd)} per-run limit`}`,
    `- Google Ads fallback: ${config.adsFallback ? 'ON' : 'off (default)'}`,
    '',
    '## Geography',
    '| Market | Ideas | Keywords to buy | Labs support |',
    '|---|---|---|---|',
    ...pr.markets.map((m) => `| ${m.location} · ${m.language} | ${m.ideas} | ${m.keywordsToBuy} | ${run.marketSupport?.[`${m.location.toLowerCase()}|${m.language.toLowerCase()}`]?.supported ?? 'not checked'} |`),
    '',
    '## Per idea',
    '| Idea id | Title | Market (source) | Keywords (problem / solution / buying) | SERP queries |',
    '|---|---|---|---|---|',
    ...run.ideas.map((i) => `| \`${i.id}\` | ${esc(i.title)} | ${i.market.locationName} · ${i.market.languageCode} (${i.market.source}${i.market.reason ? `: ${esc(i.market.reason)}` : ''}) | ${['problem', 'solution', 'buying'].map((g) => i.plan.keywords[g].map(esc).join(', ')).join(' / ')} | ${i.plan.serpQueries.map(esc).join('; ')} |`),
    '',
    Object.keys(plans.failures ?? {}).length ? `Not planned: ${Object.entries(plans.failures).map(([k, v]) => `${k} (${v})`).join('; ')}` : 'All selected ideas were planned.',
  ];
  writeFileSync(P.previewMd, lines.join('\n') + '\n');
  console.log(`✓ ${P.previewMd}: ${pr.labsTasks} Labs task(s), ${pr.labsKeywords} keywords, ${pr.serpQueries} SERPs, est ${money(pr.totalUsd)} (reserved ${money(pr.reservedUsd)})`);
  process.exit(0);
}

// ---------- gather ----------
if (cmd === 'gather') {
  if (!flag('--live')) {
    console.error('gather buys data; pass --live (use `preview` for a dry run).');
    process.exit(1);
  }
  const plans = need(P.plans, `node scripts/pilot.mjs plan --pilot ${pilotDir}`);
  const run = readJson(P.run, null) ?? buildRun(plans);
  const liveConfig = { ...config, mode: 'live' };
  const deps = buildDeps({ ...process.env, SCOUT_DFS_MODE: 'live' });
  if (!deps.budget.atomic) console.warn('⚠ legacy-ledger budget backend: spend is recorded, reservations are not atomic across apps.');
  await gatherEvidence({ run, config: liveConfig, deps });
  saveRunAt(run, { json: P.run, md: P.runMd, rootRel });
  const charged = run.spend.filter((l) => l.status === 'charged').reduce((s, l) => s + l.costUsd, 0);
  console.log(`✓ ${P.run}: provider ${run.provider.status}${run.provider.reason ? ` — ${run.provider.reason}` : ''}`);
  console.log(`  spent now ${money(run.lastGather.spentUsd)} · charged in this pilot so far ${money(charged)} · statuses: ${run.ideas.map((i) => `${i.id}=${i.status}`).join(', ')}`);
  process.exit(0);
}

// ---------- pages (free) ----------
// Re-fetch competitor pages that were refused or failed, e.g. after a robots.txt parser fix.
// No DataForSEO request; successful page answers stay cached.
if (cmd === 'pages') {
  const run = need(P.run, `node scripts/pilot.mjs gather --pilot ${pilotDir} --live`);
  const deps = buildDeps({ ...process.env, SCOUT_DFS_MODE: 'dry-run' });
  let before = 0;
  let after = 0;
  for (const idea of run.ideas) {
    before += idea.pages.filter((p) => !p.error).length;
    idea.pages = await collectPages(idea, config, deps, { refresh: true });
    after += idea.pages.filter((p) => !p.error).length;
    const fp = evidenceFingerprint(idea);
    if (fp !== idea.evidenceFingerprint) {
      idea.evidenceFingerprint = fp;
      idea.evidenceUpdatedAt = new Date().toISOString();
    }
  }
  run.pagesRefreshedAt = new Date().toISOString();
  saveRunAt(run, { json: P.run, md: P.runMd, rootRel });
  console.log(`✓ pages readable: ${before} → ${after}`);
  process.exit(0);
}

// ---------- assess ----------
if (cmd === 'assess') {
  if (pilot.measure === 'keywords-only') {
    console.error('This pilot measures keywords only (no search results or pages), so there is nothing to assess.');
    process.exit(1);
  }
  const run = need(P.run, `node scripts/pilot.mjs gather --pilot ${pilotDir} --live`);
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set — assessment needs Scout\'s Gemini configuration.');
    process.exit(1);
  }
  if (flag('--reassess')) {
    // Start from unassessed evidence (e.g. after validator changes). Evidence itself is untouched.
    for (const i of run.ideas) delete i.assessment;
    delete run.assessmentError;
    saveRunAt(run, { json: P.run, md: P.runMd, rootRel });
  }
  const before = Object.fromEntries(run.ideas.map((i) => [i.id, { fp: evidenceFingerprint(i), assessed: Boolean(i.assessment) }]));
  const gemini = createGemini(process.env.GEMINI_API_KEY);
  const memoOf = new Map(pilot.ideas.map((i) => [i.id, memoContext(readText(i.memo)).excerpt]));
  await assessEvidence({ run, gemini, originalFor: (idea) => memoOf.get(idea.id) ?? '', models: config.models });
  run.assessmentRunner = runner();
  run.assessmentModels = config.models.length ? config.models : ['gemini-2.5-pro', 'gemini-2.5-flash'];
  saveRunAt(run, { json: P.run, md: P.runMd, rootRel });

  if (flag('--expect-failure')) {
    // The forced-failure check: nothing new assessed, evidence identical, error recorded, file saved.
    const newlyAssessed = run.ideas.filter((i) => !before[i.id].assessed && i.assessment).length;
    const changed = run.ideas.filter((i) => evidenceFingerprint(i) !== before[i.id].fp).length;
    const saved = readJson(P.run, null);
    const ok = newlyAssessed === 0 && changed === 0 && Boolean(run.assessmentError) && saved?.ideas?.length === run.ideas.length;
    console.log(`[expect-failure] newly assessed ${newlyAssessed} (want 0) · evidence changed ${changed} (want 0) · error recorded ${Boolean(run.assessmentError)} · saved ${saved?.ideas?.length}/${run.ideas.length}`);
    writeJsonAtomic(join(pilotDir, 'failure-check.json'), { at: new Date().toISOString(), runner: runner(), newlyAssessed, evidenceChanged: changed, assessmentError: run.assessmentError ?? null, ok });
    process.exit(ok ? 0 : 1);
  }
  const assessed = run.ideas.filter((i) => i.assessment).length;
  console.log(`✓ assessed ${assessed}/${run.ideas.filter((i) => ['enriched', 'partial'].includes(i.status)).length}${run.assessmentError ? ` · ${run.assessmentError}` : ''}`);
  process.exit(0);
}

// ---------- revalidate (offline) ----------
// Re-apply the current validators to the stored raw model output — no model call.
if (cmd === 'revalidate') {
  const run = need(P.run, `node scripts/pilot.mjs assess --pilot ${pilotDir}`);
  const memoOf = new Map(pilot.ideas.map((i) => [i.id, memoContext(readText(i.memo)).excerpt]));
  let n = 0;
  for (const idea of run.ideas) {
    if (!idea.assessmentRaw || !idea.assessment) continue;
    const { assessedAt, evidenceUpdatedAt } = idea.assessment;
    idea.assessment = { ...constrainAssessment(idea.assessmentRaw, idea, { original: memoOf.get(idea.id) ?? '' }), assessedAt, evidenceUpdatedAt, revalidatedAt: new Date().toISOString() };
    n++;
  }
  saveRunAt(run, { json: P.run, md: P.runMd, rootRel });
  console.log(`✓ revalidated ${n} assessment(s) from stored model output`);
  process.exit(0);
}

/** The human review of a live assessment run (review.json), rendered into MODEL-CHECK.md and REPORT.md. */
function reviewLines(review, { full = false } = {}) {
  const out = [
    `## Human review of live assessment run ${review.liveRun}`,
    '',
    `_Reviewed ${review.reviewedAt}. ${review.method} The live run used the validators at \`${review.liveRunValidators}\`; the fixes below were re-applied offline to that run's stored raw model output (no new model call)._`,
    '',
    `**Validator false positives in the live run (fixed):** ${review.liveRunFalsePositives.length}`,
    ...review.liveRunFalsePositives.map((x) => `- \`${x.idea}\` ${esc(x.item)} → ${esc(x.fix)}`),
    '',
    `**Over-claims the live run's validators missed (rules added):** ${review.liveRunMisses.length} pattern(s)`,
    ...review.liveRunMisses.map((x) => `- ${esc(x.pattern)} (${x.ideas.map((i) => `\`${i}\``).join(', ')}) → ${esc(x.fix)}`),
    '',
  ];
  if (full) {
    const counts = review.interventionsReviewed.reduce((m, x) => ({ ...m, [x.verdict]: (m[x.verdict] ?? 0) + 1 }), {});
    out.push(
      `**Every intervention after the fixes, checked against the evidence:** ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`,
      '',
      '| Idea | Intervention | Verdict | Why |',
      '|---|---|---|---|',
      ...review.interventionsReviewed.map((x) => `| \`${x.idea}\` | ${esc(x.item)} | ${x.verdict} | ${esc(x.note)} |`),
      '',
    );
  }
  out.push('**Not caught by any validator (read these assessments as noted):**', ...review.residual.map((x) => `- ${x.idea === 'all' ? 'All ideas' : `\`${x.idea}\``}: ${esc(x.note)}`), '');
  return out;
}

const VOCAB_STOP = new Set(['the', 'for', 'and', 'kit', 'non', 'native', 'with', 'your', 'how', 'best', 'free', 'template', 'templates', 'guide', 'examples', 'pricing', 'cost', 'buy']);
/** Lexical proxy for relevance: share of a plan's keywords that use a content word from the idea's memo. */
function memoVocabulary(id, plan) {
  const memo = readText(pilot.ideas.find((i) => i.id === id).memo).toLowerCase();
  const kws = Object.values(plan.keywords).flat();
  const grounded = kws.filter((k) => k.split(' ').some((w) => w.length >= 4 && !VOCAB_STOP.has(w) && memo.includes(w)));
  return { share: grounded.length / kws.length, off: kws.filter((k) => !grounded.includes(k)) };
}

// ---------- check ----------
if (cmd === 'check') {
  const plans = readJson(P.plans, null);
  const run = readJson(P.run, null);
  const lines = [`# Model check — ${pilot.id}`, '', `_Generated ${new Date().toISOString()} by \`node scripts/pilot.mjs check\`. Automated checks; read the evidence file for the full assessments._`, ''];
  const results = [];
  const record = (name, pass, detail) => results.push({ name, pass, detail });

  // Original memos untouched.
  const changedMemos = pilot.ideas.filter((i) => sha(readText(i.memo)) !== i.memoSha256).map((i) => i.id);
  record('Original memos unchanged (sha256 at selection time)', changedMemos.length === 0, changedMemos.length ? `changed: ${changedMemos.join(', ')}` : `${pilot.ideas.length} memo(s) identical`);

  if (plans) {
    lines.push(`Planner: ${plans.planner?.kind} ${plans.planner?.models?.join(' → ') ?? ''} · runner: ${plans.runner?.kind}${plans.runner?.runId ? ` run ${plans.runner.runId} (${plans.runner.ref} @ ${String(plans.runner.sha).slice(0, 7)})` : ''}`, '');
    const planned = Object.entries(plans.plans);
    record('Every selected idea has a plan', planned.length === pilot.ideas.length, `${planned.length}/${pilot.ideas.length}; failures: ${JSON.stringify(plans.failures ?? {})}`);
    const allowed = (plans.config?.markets ?? []).map((m) => `${m.locationName}|${m.languageCode}`.toLowerCase());
    const offList = planned.filter(([, p]) => !allowed.includes(`${p.market?.location}|${p.market?.language}`.toLowerCase()));
    record('Planner named a country + language from the allowed list', offList.length === 0, offList.length ? `off-list: ${offList.map(([id, p]) => `${id} → ${p.market?.location}/${p.market?.language}`).join('; ')}` : planned.map(([id, p]) => `${id}: ${p.market.location}/${p.market.language}`).join('; '));
    const groupsOk = planned.filter(([, p]) => ['problem', 'solution', 'buying'].every((g) => p.keywords[g].length > 0));
    record('Each plan has problem, solution and buying keywords', groupsOk.length === planned.length, `${groupsOk.length}/${planned.length}`);
    const relevance = planned.map(([id, p]) => ({ id, ...memoVocabulary(id, p) }));
    const weak = relevance.filter((r) => r.share < 0.6);
    record('Keywords use the memo\'s own vocabulary (≥60% of keywords share a content word with the memo)', weak.length === 0, relevance.map((r) => `${r.id} ${Math.round(r.share * 100)}%${r.off.length ? ` (not in memo: ${r.off.slice(0, 3).join('; ')})` : ''}`).join(' · '));
    // Problem searches are naturally questions ("how to write a design case study"), so head terms
    // are required only where people search by category (solution, buying).
    // The same rule the planner enforces (scripts/lib/evidence.mjs planShapeIssues), checked independently here.
    const headTermCheck = (list) => {
      const issues = list.map(([id, p]) => [id, planShapeIssues(p)]);
      const tooLong = issues.flatMap(([id, xs]) => xs.filter((x) => x.issue === 'too_long').map((x) => `${id}: ${x.keyword}`));
      const noHead = issues.filter(([, xs]) => xs.some((x) => x.issue === 'no_head_term'));
      return { tooLong, noHead };
    };
    const hc = headTermCheck(planned);
    const v1 = readJson(join(pilotDir, 'plans-v1.json'), null);
    const hc1 = v1 ? headTermCheck(Object.entries(v1.plans)) : null;
    record(
      'Plans include searchable head terms (≤3-word term in solution and buying groups; problem ≤6 words, others ≤5)',
      hc.tooLong.length === 0 && hc.noHead.length === 0,
      `${hc.noHead.length} plan(s) missing a head term${hc.noHead.length ? ` (${hc.noHead.map(([id]) => id).join(', ')})` : ''}; ${hc.tooLong.length} over-long keyword(s)${hc.tooLong.length ? `: ${hc.tooLong.join('; ')}` : ''}${hc1 ? ` · first live plans (plans-v1.json, same rule): ${hc1.noHead.length} missing a head term, ${hc1.tooLong.length} over-long` : ''}`,
    );
    const planned0 = planned.filter(([, p]) => p.planning);
    if (planned0.length) {
      const drafts = planned0.filter(([, p]) => p.planning.draftIssues.some((x) => x.issue === 'no_head_term'));
      const repaired = planned0.filter(([, p]) => p.planning.repaired);
      lines.push(`Planner drafts (before the one repair request): ${drafts.length} of ${planned0.length} missing a head term; repaired ${repaired.length}${planned0.some(([, p]) => p.planning.repairOutcome) ? ` · not repaired: ${planned0.filter(([, p]) => p.planning.repairOutcome).map(([id, p]) => `${id} (${p.planning.repairOutcome})`).join('; ')}` : ''}.`, '');
    }
    lines.push('Keyword relevance is a lexical proxy only — the plans are listed in PREVIEW.md for human review.', '');
  } else {
    record('Plans exist', false, 'plans.json missing');
  }

  if (run && pilot.measure === 'keywords-only') {
    const unknownKeywords = run.ideas.flatMap((i) => i.keywords.filter((k) => k.status !== 'measured'));
    record('Every planned keyword was collected (measured or no data)', run.ideas.every((i) => i.keywords.length && i.keywords.every((k) => k.status !== 'not_collected')), run.ideas.map((i) => `${i.id} ${i.status}`).join(' · '));
    record('Missing keyword data is stored as unknown (null), never as 0', unknownKeywords.every((k) => k.searchVolume === null), `${unknownKeywords.length} keyword(s) without data`);
    record('No search result pages were bought (keywords-only pilot)', run.ideas.every((i) => !i.serps.length) && !run.spend.some((l) => l.endpoint.startsWith('serp/')), `${run.spend.filter((l) => l.endpoint.startsWith('serp/')).length} SERP request(s)`);
  } else if (run) {
    const eligible = run.ideas.filter((i) => ['enriched', 'partial'].includes(i.status));
    const assessed = eligible.filter((i) => i.assessment);
    record('Every idea with evidence has an assessment', assessed.length === eligible.length && eligible.length > 0, `${assessed.length}/${eligible.length}${run.assessmentError ? ` · ${run.assessmentError}` : ''}`);
    if (run.assessmentRunner) lines.push(`Assessor: ${run.assessmentModels?.join(' → ')} · runner: ${run.assessmentRunner.kind}${run.assessmentRunner.runId ? ` run ${run.assessmentRunner.runId}` : ''}`, '');
    const revalidated = run.ideas.map((i) => i.assessment?.revalidatedAt).filter(Boolean);
    if (revalidated.length) lines.push(`Validators re-applied offline to the stored raw model output of that run at ${revalidated.sort().at(-1)} (no new model call).`, '');

    let ungrounded = 0;
    let unknownViolations = 0;
    let rejected = 0;
    let downgraded = 0;
    let dropped = 0;
    let scrubbed = 0;
    let figuresChecked = 0;
    let figureMismatches = 0;
    for (const idea of assessed) {
      const a = idea.assessment;
      const index = evidenceIndex(idea);
      const bases = [a.problemEvidence.basis, a.competition.basis, ...a.competition.alternatives.map((x) => x.basis), ...a.competition.strengths.map((x) => x.basis), ...a.competition.gaps.map((x) => x.basis), ...(a.changes ?? []).map((c) => c.basis)];
      for (const b of bases) ungrounded += checkBasis(b, index).rejected.length; // re-check stored citations
      if (a.problemEvidence.level !== 'unknown' && !a.problemEvidence.basis.some((b) => b.kind !== 'K')) ungrounded += 1;
      if (a.competition.level !== 'unknown' && a.competition.level !== 'sparse' && !a.competition.basis.length) ungrounded += 1;
      const texts = [a.opportunity, a.whoPays, a.problemEvidence.observed, a.problemEvidence.inference, a.feasibility.note, a.nextExperiment.what, a.continueIf, a.stopIf, ...a.unproven, ...(a.changes ?? []).map((c) => c.finding), ...a.competition.strengths.map((s) => s.text), ...a.competition.gaps.map((s) => s.text)];
      for (const t of texts) unknownViolations += scrubDemandClaims(t, idea).removed;
      for (const t of texts) {
        const n = normText(t);
        for (const k of idea.keywords.filter((x) => x.status === 'measured')) {
          const said = figureAfterKeyword(n, normText(k.keyword));
          if (said !== null) {
            figuresChecked++;
            if (said !== k.searchVolume) figureMismatches++;
          }
        }
      }
      rejected += a.validation?.rejectedCitations?.length ?? 0;
      downgraded += a.validation?.downgraded?.length ?? 0;
      dropped += a.validation?.dropped?.length ?? 0;
      scrubbed += a.validation?.scrubbedSentences ?? 0;
    }
    record('Stored citations all carry a verbatim quote found in the cited item; non-unknown levels have grounded citations', ungrounded === 0, `${ungrounded} ungrounded`);
    record('No stored text states search demand the evidence did not measure', unknownViolations === 0, `${unknownViolations} violation(s)`);
    record('Volume figures quoted for measured keywords match the measurement', figureMismatches === 0, `${figuresChecked} figure(s) checked, ${figureMismatches} mismatch(es)`);
    // Dollar figures: a CPC must equal a measured CPC; any other $ amount must appear in a fetched page or Scout's memo.
    let dollarsChecked = 0;
    const dollarMisses = [];
    for (const idea of assessed) {
      const a = idea.assessment;
      const memo = readText(pilot.ideas.find((x) => x.id === idea.id).memo);
      const cpcs = new Set(idea.keywords.filter((k) => typeof k.cpcUsd === 'number').map((k) => k.cpcUsd.toFixed(2)));
      const pageText = idea.pages.filter((p) => !p.error).map((p) => `${p.title ?? ''} ${p.description ?? ''} ${(p.priceMentions ?? []).map((m) => m.context).join(' ')}`).join(' ');
      // Factual fields only: a proposed experiment may name its own price or budget.
      const texts = [a.opportunity, a.whoPays, a.problemEvidence.observed, a.problemEvidence.inference, ...a.unproven, ...(a.changes ?? []).map((c) => c.finding), ...a.competition.strengths.map((s) => s.text), ...a.competition.alternatives.map((x) => x.what)];
      for (const t of texts) {
        for (const m of String(t).matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)) {
          const context = String(t).slice(Math.max(0, m.index - 40), m.index + m[0].length + 40);
          const value = Number(m[1].replace(/,/g, ''));
          const near = String(t).slice(m.index + m[0].length, m.index + m[0].length + 12);
          if (/\bcpc\b/i.test(context)) {
            dollarsChecked++;
            if (!cpcs.has(value.toFixed(2))) dollarMisses.push(`${idea.id}: ${m[0]} CPC not measured`);
          } else if (!/budget|spend|cost:|cash|ads?\b/i.test(context) && !/^\s*(-|to|–)/.test(near)) {
            dollarsChecked++;
            const plain = String(value);
            if (!pageText.includes(plain) && !memo.includes(`$${m[1]}`) && !memo.includes(`$${plain}`)) dollarMisses.push(`${idea.id}: ${m[0]} not in pages or memo`);
          }
        }
      }
    }
    record('Dollar figures in factual assessment fields match measured CPCs, fetched prices or Scout\'s memo (proposed experiments excluded)', dollarMisses.length === 0, `${dollarsChecked} figure(s) checked${dollarMisses.length ? `; unmatched: ${dollarMisses.join('; ')}` : ''}`);
    record('Validation actually intervened where the model over-claimed (informational)', true, `${rejected} citation(s) rejected · ${downgraded} level/kind downgrade(s) · ${dropped} claim(s) dropped · ${scrubbed} sentence(s) removed`);
    const removedAudit = assessed.flatMap((i) => (i.assessment.validation?.removedSentences ?? []).map((s) => `${i.id}: "${s}"`));
    if (removedAudit.length) lines.push('Removed sentences (for review):', ...removedAudit.map((s) => `- ${esc(s)}`), '');
    const unknownKeywords = run.ideas.flatMap((i) => i.keywords.filter((k) => k.status !== 'measured'));
    record('Missing keyword data is stored as unknown (null), never as 0', unknownKeywords.every((k) => k.searchVolume === null), `${unknownKeywords.length} keyword(s) without data`);
    const fc = readJson(join(pilotDir, 'failure-check.json'), null);
    record('Forced model failure preserved evidence and allowed resumption', Boolean(fc?.ok) && assessed.length === eligible.length, fc ? `failure step: newly assessed ${fc.newlyAssessed}, evidence changed ${fc.evidenceChanged}, error "${String(fc.assessmentError).slice(0, 120)}"; resumed: ${assessed.length}/${eligible.length} assessed` : 'failure-check.json missing');
  }

  lines.push('| Check | Result | Detail |', '|---|---|---|', ...results.map((r) => `| ${esc(r.name)} | ${r.pass ? 'pass' : '**FAIL**'} | ${esc(r.detail)} |`));
  const review = readJson(P.review, null);
  if (review?.liveRun) lines.push('', ...reviewLines(review, { full: true }));
  writeFileSync(P.check, lines.join('\n') + '\n');
  for (const r of results) console.log(`${r.pass ? '✓' : '✗'} ${r.name} — ${r.detail}`);
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

// ---------- compare (planner) ----------
if (cmd === 'compare') {
  if (!pilot.baseline) {
    console.error('This pilot has no baseline; create it with `select --from <pilot>`.');
    process.exit(1);
  }
  const plans = need(P.plans, `node scripts/pilot.mjs plan --pilot ${pilotDir}`);
  const run = readJson(P.run, null);
  const base = { plans: need(join(pilot.baseline, 'plans.json'), 'baseline plans'), run: readJson(join(pilot.baseline, 'run.json'), null), v1: readJson(join(pilot.baseline, 'plans-v1.json'), null) };
  const ids = pilot.ideas.map((i) => i.id);
  const words = (k) => k.split(' ').length;
  const shape = (planOf) => {
    const rows = ids.map((id) => [id, planOf(id)]).filter(([, p]) => p);
    const issues = rows.map(([id, p]) => [id, planShapeIssues(p)]);
    const vocab = rows.map(([id, p]) => memoVocabulary(id, p).share);
    return {
      plans: rows.length,
      noHead: issues.filter(([, xs]) => xs.some((x) => x.issue === 'no_head_term')).map(([id]) => id),
      tooLong: issues.reduce((n, [, xs]) => n + xs.filter((x) => x.issue === 'too_long').length, 0),
      headTerms: rows.reduce((n, [, p]) => n + [...p.keywords.solution, ...p.keywords.buying].filter((k) => words(k) <= HEAD_TERM_MAX_WORDS).length, 0),
      vocabMin: vocab.length ? Math.min(...vocab) : null,
    };
  };
  const measure = (r) => {
    if (!r) return null;
    const kws = r.ideas.flatMap((i) => i.keywords.map((k) => ({ ...k, idea: i.id })));
    const measured = kws.filter((k) => k.status === 'measured');
    const head = kws.filter((k) => ['solution', 'buying'].includes(k.group) && words(k.keyword) <= HEAD_TERM_MAX_WORDS);
    return {
      keywords: kws.length,
      measured: measured.length,
      ideasWithData: r.ideas.filter((i) => i.keywords.some((k) => k.status === 'measured')).length,
      ideasWithCategoryData: r.ideas.filter((i) => i.keywords.some((k) => k.status === 'measured' && k.group !== 'problem')).length,
      headTerms: head.length,
      headMeasured: head.filter((k) => k.status === 'measured').length,
      byIdea: Object.fromEntries(r.ideas.map((i) => {
        const m = i.keywords.filter((k) => k.status === 'measured').sort((a, b) => b.searchVolume - a.searchVolume);
        return [i.id, { measured: m.length, of: i.keywords.length, top: m[0] ? `${m[0].keyword} (${m[0].searchVolume}/mo)` : 'none', demand: i.readings?.demand?.level ?? 'unknown', list: i.keywords }];
      })),
    };
  };
  const draftOf = (id) => {
    const p = plans.plans[id];
    return p ? { ...p, keywords: p.planning?.draftKeywords ?? p.keywords } : null;
  };
  const versions = [
    ...(base.v1 ? [{ label: 'v1 — first live plans (not gathered)', s: shape((id) => base.v1.plans[id]), m: null }] : []),
    { label: `v2 — baseline plans (${base.plans.runner?.runId ? `run ${base.plans.runner.runId}` : 'baseline'}), gathered live`, s: shape((id) => base.plans.plans[id]), m: measure(base.run) },
    { label: `v3 drafts — new prompt, before the repair request (${plans.runner?.runId ? `run ${plans.runner.runId}` : plans.runner?.kind})`, s: shape(draftOf), m: null },
    { label: 'v3 final — after at most one repair request', s: shape((id) => plans.plans[id]), m: measure(run) },
  ];
  const pct = (a, b) => (b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : 'n/a');
  const v2 = versions.find((v) => v.label.startsWith('v2')).m;
  const v3 = versions.at(-1).m;
  const shared = run && base.run ? run.ideas.reduce((n, i) => n + i.keywords.filter((k) => base.run.ideas.find((b) => b.id === i.id)?.keywords.some((bk) => bk.keyword === k.keyword)).length, 0) : null;
  const kwList = (list) => ['problem', 'solution', 'buying'].map((g) => `${g}: ${list.filter((k) => k.group === g).map((k) => `${esc(k.keyword)} [${k.status === 'measured' ? k.searchVolume : '–'}]`).join(', ')}`).join('<br>');
  const spent = run ? run.spend.filter((l) => l.status === 'charged').reduce((s, l) => s + l.costUsd, 0) : null;
  const preview = readJson(P.preview, null);
  const out = [
    `# Planner comparison — ${pilot.id}`,
    '',
    `_Generated ${new Date().toISOString()} by \`node scripts/pilot.mjs compare\`. Same ${ids.length} ideas as \`${pilot.baseline}\`; limits unchanged (3 keywords per group, one Labs task per market, SERPs not bought in this comparison)._`,
    '',
    '## Keyword shape (no data needed)',
    '| Version | Plans | Missing a head term | Over-long keywords | ≤3-word solution/buying terms | Lowest memo-vocabulary share |',
    '|---|---|---|---|---|---|',
    ...versions.map((v) => `| ${esc(v.label)} | ${v.s.plans} | ${v.s.noHead.length}${v.s.noHead.length ? ` (${v.s.noHead.join(', ')})` : ''} | ${v.s.tooLong} | ${v.s.headTerms} | ${v.s.vocabMin === null ? 'n/a' : `${Math.round(v.s.vocabMin * 100)}%`} |`),
    '',
    '## Search data coverage (DataForSEO Labs · keyword_overview, same markets)',
    '| Version | Keywords with data | Ideas with any data | Ideas with solution/buying data | Head terms with data |',
    '|---|---|---|---|---|',
    ...versions.filter((v) => v.m).map((v) => `| ${esc(v.label)} | ${pct(v.m.measured, v.m.keywords)} | ${v.m.ideasWithData}/${ids.length} | ${v.m.ideasWithCategoryData}/${ids.length} | ${pct(v.m.headMeasured, v.m.headTerms)} |`),
    ...(v3 ? [] : ['', '_v3 has not been gathered yet: run `preview`, then `gather --live`._']),
    '',
    `Cost of this comparison: estimated ${preview ? money(preview.projection.totalUsd) : 'n/a'} before buying; actual provider-reported ${spent === null ? 'n/a (not gathered)' : money(spent)}${shared !== null ? `; ${shared} of the v3 keywords were already measured for v2 (reused from cache, not re-bought)` : ''}.`,
    '',
    '## Per idea',
    '| Idea | v2: with data · largest · demand | v3: with data · largest · demand | v3 keywords [monthly searches, – = no data] |',
    '|---|---|---|---|',
    ...ids.map((id) => {
      const a = v2?.byIdea[id];
      const b = v3?.byIdea[id];
      const cell = (x) => (x ? `${x.measured}/${x.of} · ${esc(x.top)} · ${x.demand}` : 'n/a');
      return `| \`${id}\` | ${cell(a)} | ${cell(b)} | ${b ? kwList(b.list) : kwList(Object.entries(plans.plans[id]?.keywords ?? {}).flatMap(([g, ks]) => ks.map((k) => ({ keyword: k, group: g, status: 'not_collected' }))))} |`;
    }),
    '',
    'Reading this honestly: more keywords with data is only better if the keywords still describe the idea. Broad head terms measure the category the idea sells into, or a wider market, not its niche angle (non-native speakers).',
  ];
  const review = readJson(P.review, null);
  if (review?.judgements) {
    const judge = (id, k) => review.judgements?.[id]?.[k.keyword] ?? 'not judged';
    const tally = (m) => {
      if (!m) return null;
      const t = { 'on-idea': 0, category: 0, broader: 0, 'not judged': 0, ideasRelevant: 0, levelFromBroader: 0 };
      for (const id of ids) {
        const measured = m.byIdea[id].list.filter((k) => k.status === 'measured');
        for (const k of measured) t[judge(id, k)]++;
        if (measured.some((k) => ['on-idea', 'category'].includes(judge(id, k)))) t.ideasRelevant++;
        const top = [...measured].sort((a, b) => b.searchVolume - a.searchVolume)[0];
        if (top && judge(id, top) === 'broader') t.levelFromBroader++;
      }
      return t;
    };
    const rows = versions.filter((v) => v.m).map((v) => [v.label, tally(v.m), v.m]);
    out.push(
      '',
      `## Human review of the measured keywords (${review.reviewedAt})`,
      '',
      `_${esc(review.method)}_`,
      '',
      '| Version | Measured: on-idea / category / broader | Ideas with on-idea or category data | Ideas whose demand level is set by a broader keyword |',
      '|---|---|---|---|',
      ...rows.map(([label, t]) => `| ${esc(label)} | ${t['on-idea']} / ${t.category} / ${t.broader}${t['not judged'] ? ` (+${t['not judged']} not judged)` : ''} | ${t.ideasRelevant}/${ids.length} | ${t.levelFromBroader}/${ids.length} |`),
      '',
      '| Idea | v3 demand level as computed | v3 level from on-idea + category keywords only |',
      '|---|---|---|',
      ...ids.map((id) => {
        const list = v3?.byIdea[id]?.list ?? [];
        const narrow = demandReading(list.filter((k) => k.status !== 'measured' || judge(id, k) !== 'broader'));
        const top = narrow.top ? ` (${esc(narrow.top.keyword ?? '')}${narrow.top.searchVolume != null ? `, ${narrow.top.searchVolume}/mo` : ''})` : '';
        return `| \`${id}\` | ${v3?.byIdea[id]?.demand ?? 'n/a'} · ${esc(v3?.byIdea[id]?.top ?? '')} | ${narrow.level}${top} |`;
      }),
      '',
      '**Findings**',
      ...review.findings.map((f) => `- ${esc(f)}`),
      '',
      `**Recommendation:** ${esc(review.recommendation)}`,
    );
  }
  writeFileSync(join(pilotDir, 'PLANNER-COMPARISON.md'), out.join('\n') + '\n');
  console.log(`✓ ${join(pilotDir, 'PLANNER-COMPARISON.md')}`);
  process.exit(0);
}

// ---------- report ----------
if (cmd === 'report') {
  const run = need(P.run, `node scripts/pilot.mjs gather --pilot ${pilotDir} --live`);
  const preview = readJson(P.preview, null);
  const previous = readJson('evidence/pilots/pilot-3-manual-plans/spend.json', null);
  const charged = run.spend.filter((l) => l.status === 'charged');
  const uncertain = run.spend.filter((l) => l.status === 'uncertain');
  const out = [
    `# Evidence pilot — ${run.ideas.length} existing Scout ideas`,
    '',
    '_Research comparison only. Scout\'s original memos and scores are unchanged, nothing here selects an idea for building, and the bot\'s manual favorites were not touched._',
    '',
    '## Selection',
    `- Rule: ${pilot.selectionRule}`,
    `- Checked for an explicit queue: ${pilot.queueChecked.join('; ')}`,
    `- Stable ids: ${pilot.ideas.map((i) => `\`${i.id}\``).join(', ')}`,
    `- Earlier 3-idea pilot (${pilot.previousPilot.ids.join(', ')}): overlap with this pilot — ${pilot.previousPilot.overlapWithThisPilot.length ? pilot.previousPilot.overlapWithThisPilot.join(', ') : 'none'}; kept separately in \`${pilot.previousPilot.dir}\`.`,
    '',
    '## Spend (kept separate)',
    '| | USD | Source |',
    '|---|---|---|',
    `| Previous pilot (3 ideas, 2026-09-14) | ${previous ? money(previous.chargedUsd) : '$0.1392'} | shared ledger rows produced by scout before this pilot |`,
    `| This pilot — estimated before buying | ${preview ? money(preview.projection.totalUsd) : 'n/a'} | dry-run preview (published prices, before cache) |`,
    `| This pilot — actual, provider-reported | ${money(charged.reduce((s, l) => s + l.costUsd, 0))} | ${charged.length} charged request(s) |`,
    `| This pilot — outcome unknown (held at estimate) | ${money(uncertain.reduce((s, l) => s + l.estimateUsd, 0))} | ${uncertain.length} request(s) |`,
    '',
    `Budget backend for this pilot: ${run.budget?.backend ?? 'n/a'}${run.budget?.atomic === false ? ' (not atomic: the reservation functions are awaiting review, so spend was recorded in the existing ledger)' : ''}. Shared cap ${money(run.budget?.capUsd)}, Scout reserve ${money(run.budget?.reserveUsd)}, per-run limit ${money(run.budget?.maxRunUsd)}. Google Ads fallback: off.`,
    '',
    '## Assessments — provenance',
    `- Written by ${run.assessmentModels?.join(' → ') ?? 'n/a'} in ${run.assessmentRunner?.runId ? `GitHub Actions run ${run.assessmentRunner.runId}` : run.assessmentRunner?.kind ?? 'n/a'}${(() => { const r = run.ideas.map((i) => i.assessment?.revalidatedAt).filter(Boolean).sort().at(-1); return r ? `; validators re-applied offline to that run's stored model output at ${r}` : ''; })()}.`,
    '- Every citation below carries a verbatim quote found in the cited item; that proves a claim is grounded, not that it is on-topic.',
    '',
  ];
  const review = readJson(P.review, null);
  if (review && review.liveRun === run.assessmentRunner?.runId) out.push(...reviewLines(review));
  run.ideas.forEach((idea, n) => {
    const src = pilot.ideas.find((i) => i.id === idea.id);
    const memo = readText(src.memo);
    const a = idea.assessment;
    const r = idea.readings ?? {};
    const measured = idea.keywords.filter((k) => k.status === 'measured');
    const clip = (s, max = 420) => (s.length > max ? `${s.slice(0, max).replace(/\s+\S*$/, '')}…` : s);
    out.push(`---`, '', `## ${n + 1}. ${idea.title}`, `\`${idea.id}\` · [${src.memo}](${rootRel}/${src.memo}) · status: ${idea.status}${idea.reason ? ` — ${esc(idea.reason)}` : ''}`, '');
    out.push('**Original assessment (Scout, unchanged)**', '');
    out.push(`- Conviction: ${src.originalConviction ?? 'n/a'}${src.originalScore != null ? ` · score ${src.originalScore}/100` : ' · no numeric score in this memo format'}`);
    const who = section(memo, 'Who pays and why');
    const size = section(memo, 'Size of opportunity');
    if (who) out.push(`- Who pays (Scout): ${esc(clip(who))}`);
    if (size) out.push(`- Size claim (Scout): ${esc(clip(size))}`);
    out.push('', `**New search and competitor evidence** — ${idea.market?.locationName ?? run.market.locationName} · ${idea.market?.languageCode ?? run.market.languageCode}${idea.market?.source === 'planner' && idea.market.reason ? ` (planner: ${esc(idea.market.reason)})` : ''}`, '');
    out.push(`- Search demand: **${r.demand?.level ?? 'unknown'}** — ${esc(r.demand?.note ?? 'not measured')}`);
    if (measured.length) out.push(`- Measured keywords: ${measured.map((k) => `"${esc(k.keyword)}" ${k.searchVolume}/mo${typeof k.cpcUsd === 'number' ? `, CPC $${k.cpcUsd.toFixed(2)}` : ''}`).join('; ')}; no data for ${idea.keywords.length - measured.length} of ${idea.keywords.length}`);
    out.push(`- Commercial intent and payment: **${r.commercial?.level ?? 'unknown'}** — ${esc(r.commercial?.note ?? '')}`);
    out.push(`- Competitors: ${esc(r.competitors?.note ?? 'not collected')}`);
    if (a) {
      out.push(`- Problem evidence (assessed, quote-checked): **${a.problemEvidence.level}**${a.problemEvidence.observed ? ` — ${esc(a.problemEvidence.observed)}` : ''}${a.problemEvidence.basis.length ? ` (${a.problemEvidence.basis.map((b) => b.id).join(', ')})` : ''}`);
      if (a.competition.alternatives.length) out.push(`- Alternatives: ${a.competition.alternatives.map((x) => `${esc(x.name)} — ${esc(x.what)} (${x.basis.map((b) => b.id).join(', ')})`).join('; ')}`);
    }
    out.push('', '**What changed and why**', '');
    if (a?.changes?.length) for (const c of a.changes) out.push(`- ${c.effect}: Scout said "${esc(c.original)}" → ${esc(c.finding)}${c.basis.length ? ` (${c.basis.map((b) => b.id).join(', ')})` : ''}`);
    else out.push('- No change statement survived validation (each must quote the memo and, to claim an effect, cite quoted evidence).');
    out.push('', '**Remaining uncertainty**', '');
    const unknowns = idea.keywords.length - measured.length;
    for (const u of a?.unproven ?? []) out.push(`- ${esc(u)}`);
    if (unknowns) out.push(`- ${unknowns} of ${idea.keywords.length} planned keywords returned no search data (unknown, not zero).`);
    if (a?.validation && (a.validation.rejectedCitations.length || a.validation.downgraded.length || a.validation.dropped.length)) out.push(`- The assessment's own over-claims were cut: ${a.validation.rejectedCitations.length} citation(s) without a matching quote, ${a.validation.downgraded.length} downgrade(s), ${a.validation.dropped.length} dropped claim(s).`);
    if (!a) out.push('- Not assessed yet.');
    for (const x of (review && review.liveRun === run.assessmentRunner?.runId ? review.residual : []).filter((x) => x.idea === idea.id)) out.push(`- Reviewer note: ${esc(x.note)}`);
    out.push('', `**Cheapest useful validation experiment:** ${a?.nextExperiment?.what ? `${esc(a.nextExperiment.what)}${a.nextExperiment.cost ? ` _(cost: ${esc(a.nextExperiment.cost)}${a.nextExperiment.duration ? `, ${esc(a.nextExperiment.duration)}` : ''})_` : ''}` : 'not assessed yet'}`, '');
    out.push(`**Continue if:** ${esc(a?.continueIf || 'not assessed yet')}`, '', `**Stop if:** ${esc(a?.stopIf || 'not assessed yet')}`, '');
  });
  writeFileSync(P.report, out.join('\n') + '\n');
  console.log(`✓ ${P.report}`);
  process.exit(0);
}

console.error('Usage: node scripts/pilot.mjs <select|plan|preview|gather|pages|assess|revalidate|check|report|compare> --pilot evidence/pilots/<name>');
process.exit(1);
