// Daily business-idea research agent — 6-stage senior-analyst pipeline.
// Runs in GitHub Actions. Calls Gemini 2.5 Pro with Google Search grounding,
// falling back to Flash on transient errors.
//
// Instead of one prompt, the agent reasons in layers like a senior business
// builder, each stage grounded in fresh search and feeding the next:
//   1. scan      — cast wide: 10-12 candidate opportunities across markets
//   2. market    — rigorous market-structure analysis of the top 3
//   3. economics — unit economics + moat thesis for the most attractive one
//   4. scope     — honest scope of work to build a first sellable version
//   5. redteam   — a skeptical investor attacks it; rebut or downgrade
//   6. synthesis — the final decision memo + calibrated conviction score
//
// Writes ideas/YYYY-MM-DD.md, a markets/ atlas, plus updates to
// LEARNINGS.md, KILLED.md, MARKET_MAP.md, README.md, SCORES.md.
// The workflow does the git commit + push.

import {
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
} from 'node:fs';
import { join } from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

const readSafe = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

// Idempotency: if today's memo is already committed, do nothing.
if (existsSync(`ideas/${TODAY}.md`)) {
  console.log(`ideas/${TODAY}.md already exists — skipping run.`);
  process.exit(0);
}

const ideaFiles = existsSync('ideas')
  ? readdirSync('ideas')
      .filter((f) => f.endsWith('.md') && f !== '.gitkeep')
      .sort()
  : [];

const cap = (s, n) => (s && s.length > n ? s.slice(0, n) + '\n…(truncated)…' : s);

const recentIdeas = ideaFiles
  .slice(-5)
  .map((f) => `### ${f}\n\n${readSafe(join('ideas', f))}`)
  .join('\n\n---\n\n');

const roadmap = readSafe('ROADMAP.md');
const learnings = readSafe('LEARNINGS.md');
const marketMap = readSafe('MARKET_MAP.md');
const killed = readSafe('KILLED.md');
const marketsIndex = readSafe('markets/INDEX.md');

// ---------- Shared persona + memory context ----------
const SYSTEM = `You are a senior business builder operating at the level of a top-tier operator and early-stage investor combined — someone who has built, sized, and killed dozens of ventures and can see a market's structure, the real opportunity inside it, its economic potential, and the true scope of work to win it.

You do not chase "nice to have" pains or hype. You reason in numbers, cite every material claim, and you are honest about effort and odds. You are builder-agnostic: do NOT pre-narrow the opportunity by who would build it, their skills, capital, or preferred format (software, service, marketplace, physical, B2B, B2C — all fair game). Let the PAIN, the MARKET STRUCTURE, and the ECONOMICS lead.

Hard limits (integrity, not narrowing): nothing illegal, nothing in regulated spaces you can't substantiate (dispensing medical/legal/financial advice), no get-rich-quick framing, no fabricated data, credentials, or sources. Every material claim needs a real, cited source you actually opened via Google Search.

Tone in everything you write: strong businessperson, numbers first, no hype words ("revolutionary", "game-changer", "unlock"), no emojis, sentence-case headers, concrete over abstract. Today is ${TODAY}.`;

const MEMORY = `You are part of a compounding system. Everything you produce today MUST be novel relative to the accumulated knowledge below, and should deepen it.

=== ROADMAP.md (the system's mission) ===
${cap(roadmap, 4000) || '(empty)'}

=== LEARNINGS.md (priors discovered so far) ===
${cap(learnings, 4000) || '(empty)'}

=== MARKET_MAP.md (niches already explored) ===
${cap(marketMap, 4000) || '(empty)'}

=== markets/ atlas index (markets already structurally analyzed) ===
${cap(marketsIndex, 2000) || '(none yet)'}

=== KILLED.md (DO NOT re-pitch these) ===
${cap(killed, 4000) || '(empty)'}

=== Recent idea memos (last 5 — today must be clearly different) ===
${cap(recentIdeas, 8000) || '(no prior memos)'}`;

// ---------- Gemini call with retry + Pro→Flash fallback ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rawCall(model, prompt, { temperature, maxTokens }, attempt = 1) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.ok) return res.json();

  const status = res.status;
  const errBody = await res.text();
  console.error(`${model} returned ${status}: ${errBody.slice(0, 250)}`);

  if ((status === 429 || status >= 500) && attempt < 3) {
    const wait = 2 ** attempt * 1000;
    console.log(`Retrying ${model} in ${wait}ms…`);
    await sleep(wait);
    return rawCall(model, prompt, { temperature, maxTokens }, attempt + 1);
  }
  throw new Error(`${model} failed after ${attempt} attempts: ${status}`);
}

async function generate(label, prompt, { temperature = 0.5, maxTokens = 8192 } = {}) {
  console.log(`[${label}] prompt ${prompt.length} chars — calling gemini-2.5-pro…`);
  let data;
  try {
    data = await rawCall('gemini-2.5-pro', prompt, { temperature, maxTokens });
  } catch (err) {
    console.error(`[${label}] Pro exhausted retries — falling back to Flash.`);
    data = await rawCall('gemini-2.5-flash', prompt, { temperature, maxTokens });
  }
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text || text.length < 80) {
    throw new Error(`[${label}] empty / too-short output (${text.length} chars)`);
  }
  console.log(`[${label}] got ${text.length} chars`);
  return text;
}

// ---------- The pipeline ----------
const scan = await generate(
  'scan',
  `${SYSTEM}

${MEMORY}

STAGE 1 of 6 — DIVERGENT OPPORTUNITY SCAN.
Cast wide. Use Google Search aggressively across: what's selling now (marketplaces, app stores, ProductHunt, IndieHackers), buyer pain (Reddit, Quora, niche forums, complaint threads), trends up (Google Trends, funding news), and a WIDE range of buyer worlds — deliberately rotate beyond creators/designers into local services, trades, e-commerce ops, finance/admin, education, healthcare-adjacent (non-regulated), B2B niches, blue-collar, parents, seniors.

Produce 10-12 candidate opportunities, each from a DIFFERENT industry (no two from the same world). For each, give: a concrete title, the buyer, the pain (one real signal + where to verify it), the market hypothesis (who pays, rough size signal), and why now. Avoid anything in KILLED.md or the recent memos. Rank by raw promise.

End with a section "## Shortlist" naming the 3 strongest candidates to investigate deeply, each with one sentence on why it survived.`,
  { temperature: 0.85, maxTokens: 5000 }
);
await sleep(1500);

const market = await generate(
  'market',
  `${SYSTEM}

${MEMORY}

=== STAGE 1 OUTPUT: SCAN ===
${scan}

STAGE 2 of 6 — MARKET-STRUCTURE ANALYSIS.
For the 3 shortlisted candidates, do rigorous, grounded market-structure analysis. For EACH, cover: TAM / SAM / SOM with the method and sources behind the numbers; growth rate and direction; fragmentation (how concentrated are buyers and suppliers); where the margin pool actually sits in the value chain; who controls distribution / customer access; the incumbents and the structural reason they can't or won't serve this well; regulatory or platform risk. Cite real sources for every material number.

End with "## Most attractive market" — name the single best market and one paragraph on why its STRUCTURE (not just the pain) makes it the place to build.`,
  { temperature: 0.4, maxTokens: 7000 }
);
await sleep(1500);

const economics = await generate(
  'economics',
  `${SYSTEM}

${MEMORY}

=== SCAN ===
${cap(scan, 3000)}

=== STAGE 2 OUTPUT: MARKET STRUCTURE ===
${market}

STAGE 3 of 6 — POTENTIAL: UNIT ECONOMICS + MOAT.
For the most attractive market's opportunity, analyse the economic potential like an investor:
- Pricing power: realistic price point(s) with named comparables and what justifies them.
- Unit economics: gross margin, CAC by the most likely acquisition channel, LTV proxy, payback period — with the assumptions stated.
- Capital intensity and time-to-first-revenue.
- Moat thesis: which durable advantage compounds over time (data, network effects, brand, switching costs, distribution lock-in) and WHY — not just "first mover".
- Expansion path: the beachhead, then the adjacent segments/products it unlocks. Quantify the ceiling.
Be numeric. Cite comparables with real revenue or proxy data.`,
  { temperature: 0.4, maxTokens: 6000 }
);
await sleep(1500);

const scope = await generate(
  'scope',
  `${SYSTEM}

${MEMORY}

=== MARKET STRUCTURE ===
${cap(market, 3000)}

=== ECONOMICS + MOAT ===
${economics}

STAGE 4 of 6 — SCOPE OF WORK.
Define honestly what it takes to build a first sellable version and win the beachhead:
- MVP cut: what is in, what is explicitly out for v1, and why.
- Critical path and the 4-8 milestones from zero to first paying customer, with rough durations.
- What must be TRUE for this to work (the load-bearing assumptions).
- Resources required: skills, capital, and realistic calendar time.
- The cheapest, fastest validation test that would de-risk the biggest assumption first, with exact GO / REFINE / PAUSE thresholds.
Be honest about the lift. Do not pretend a big opportunity is trivial; do not inflate a small one.`,
  { temperature: 0.4, maxTokens: 5000 }
);
await sleep(1500);

const redteam = await generate(
  'redteam',
  `${SYSTEM}

=== MARKET STRUCTURE ===
${cap(market, 2500)}

=== ECONOMICS + MOAT ===
${cap(economics, 2500)}

=== SCOPE OF WORK ===
${cap(scope, 2500)}

STAGE 5 of 6 — ADVERSARIAL RED-TEAM.
You are now a skeptical senior investor who has seen 1000 pitches and funded few. Attack this opportunity as hard as you fairly can. Cover at least: where the market is smaller or slower than claimed; whether the pain is a painkiller or merely a vitamin; where the moat is actually fake or easily copied; where the timing is wrong; the strongest competitive response; and the single most likely way the founder fails. For EACH attack, give the strongest honest rebuttal, or concede it if it stands.

End with "## Verdict": does the opportunity survive, what the surviving weaknesses do to conviction, and an honest score using this rubric — pain intensity & frequency /30, wallet proof / market value /30, gap & defensible wedge /15, novelty /15, evidence quality /10. State it as "Total: NN/100". Be a harsh grader: a solid idea is 60-75; reserve 82+ for opportunities strong on every dimension.`,
  { temperature: 0.5, maxTokens: 5000 }
);
await sleep(1500);

const synthesis = await generate(
  'synthesis',
  `${SYSTEM}

${MEMORY}

You have completed a full analyst dossier on the best opportunity found today. Synthesise the FINAL decision memo. Reconcile the conviction score with the red-team verdict — do NOT inflate past what the red-team supports. If the red-team killed it and nothing else clears the bar, write a "No GO today" memo instead, explaining what failed and what signal would change tomorrow.

=== SCAN ===
${cap(scan, 3000)}

=== MARKET STRUCTURE ===
${cap(market, 4000)}

=== ECONOMICS + MOAT ===
${cap(economics, 4000)}

=== SCOPE OF WORK ===
${cap(scope, 3000)}

=== RED-TEAM VERDICT ===
${cap(redteam, 3000)}

Output the memo as markdown using EXACTLY this structure (no preamble, start at "# "):

# <One-line idea title — concrete, not generic>

_${TODAY} · conviction: <high|medium|low> · score: <NN>/100_

## The idea
One paragraph: what it is, what the buyer gets, what it costs.

## Who pays and why
Specific buyer. Quote pain language from 2+ real people with source links. Name the exact community / platform / search query where they live.

## Why now
The trend / gap / shift in 2026 specifically. With 2+ sources.

## Market structure
The structural picture from the analysis: TAM/SAM/SOM with method, growth, fragmentation, where the margin pool sits, who controls distribution, and why incumbents leave this open. Numbers with sources.

## Size of opportunity
Napkin math tied to the structure above: realistic revenue range, 2+ comparables with revenue or proxy data, and the ceiling. Scale to the actual market.

## Unit economics and moat
Pricing, gross margin, CAC/LTV proxy, payback, capital intensity, time-to-first-revenue. Then the moat thesis: the defensibility that compounds and the expansion path. Numbers with comparables.

## Competitive landscape
Top 3 closest competitors. What they do right. What they leave on the table that this idea exploits.

## Conviction score
A markdown table with columns: Dimension | Score | Max | Justification. One row each for Pain intensity & frequency /30, Wallet proof / market value /30, Gap & defensible wedge /15, Novelty vs. prior memos /15, Evidence quality /10. Then a final bold line exactly: **Total: <NN>/100 → conviction: <high|medium|low>**. The band MUST follow the thresholds (82+ high, 65-81 medium, below 65 low) and MUST reconcile with the red-team verdict. Do not inflate.

## Scope of work
The realistic build: MVP cut (in/out), critical-path milestones with rough durations, the load-bearing assumptions, and resources required (skills, capital, time). Be honest about the lift.

## Validation plan
The cheapest, fastest test that de-risks the biggest assumption first. Concrete steps, where to run it, and exact GO / REFINE / PAUSE thresholds.

## Sales playbook
Be specific, not generic. Cover all six:
1. **Pricing strategy** — launch price, sustained price, tier structure, when to raise, what justifies each tier.
2. **Top 3 sales channels** — three specific channels with the EXACT first move on each (hook line, day/time, asset to share).
3. **Hook copy** — the actual landing-page headline + sub-headline (pragmatic, no hype). Write 2 versions to A/B test.
4. **Pre-launch → launch → sustained** — 3-5 concrete actions per phase, dated relative to "Day 0 = launch day".
5. **Top 2 buyer objections** + a 1-sentence founder-voice rebuttal each.
6. **Social proof strategy** — what evidence to collect and what to show first.

## Red-team and rebuttal
The 2-3 strongest attacks from the red-team and how this opportunity answers them (or where it concedes). Honest.

## Risks and kill criteria
Top 3 ways this fails. Exact metric or signal that says "stop now."

## Candidates I considered and killed today
3-5 other candidates from the scan, one line each, with reason. Format: "- <idea> — <reason>"

## What I learned today
2-4 concrete, NON-OBVIOUS patterns this run revealed about markets, economics, distribution, or research itself — not restatements of yesterday's learnings. Format: "- <pattern>"

## Why this beats yesterday's idea
One paragraph contrasting against the most recent prior idea. Day 1 = "First idea — baseline."

## Sources
Bulleted list of every URL opened across all stages. Minimum 10.

## Market map update
Either "(new niche)" followed by:
## <Niche name>
- Buyer: <one-line>
- Where they gather: <links/communities>
- Comparable products + revenue: <bullets with sources>
- Price range: <$X–$Y>
- Last researched: ${TODAY}
- Status: open
…OR "(updated existing: <name>)" followed by 2-3 lines of new comparables / data.

## Market atlas entry
A structured teardown of the winning market for the markets/ atlas. Use EXACTLY this shape:
slug: <kebab-case-market-slug>
market: <market name>
- TAM/SAM/SOM: <with method + sources>
- Growth: <rate + direction + source>
- Fragmentation: <buyer/supplier concentration>
- Margin pool: <where the money sits in the chain>
- Distribution control: <who owns customer access>
- Incumbents and inertia: <who, and why they leave this open>
- Regulatory / platform risk: <one line>
- Key sources: <2-4 URLs>

Begin.`,
  { temperature: 0.5, maxTokens: 16384 }
);

let memo = synthesis;

if (!memo || memo.length < 500) {
  console.error('Synthesis returned empty / too-short response.');
  process.exit(1);
}

console.log(`Got memo: ${memo.length} chars`);

// ---------- Parse memo for structured updates ----------
const firstHeadingLine =
  memo.split('\n').find((l) => l.trim().startsWith('# ')) || '';
const fullTitle = firstHeadingLine.replace(/^#\s+/, '').trim();
const titleClean = fullTitle.replace(/\s+$/, '').replace(/[.\s]+$/, '');

// ---------- Conviction score: parse the number, derive the band in code ----------
// The model self-scores, but the BAND is recomputed here from the number so the
// thresholds are enforced regardless of how the model labels it. A "No GO" memo
// has no score and stays at conviction low / score 0.
function bandFromScore(score) {
  if (score >= 82) return 'high';
  if (score >= 65) return 'medium';
  return 'low';
}

const isNoGo = /no\s*go\s*today/i.test(memo.slice(0, 400));

const totalLineMatch = memo.match(/total:\s*(\d{1,3})\s*\/\s*100/i);
const anyPer100Match = memo.match(/\b(\d{1,3})\s*\/\s*100\b/);
const metaScoreMatch = memo.match(/score:\s*(\d{1,3})/i);
const rawScore =
  totalLineMatch?.[1] ?? anyPer100Match?.[1] ?? metaScoreMatch?.[1] ?? null;

let score = rawScore === null ? null : Math.max(0, Math.min(100, parseInt(rawScore, 10)));
if (isNoGo) score = 0;

const conviction = score === null ? 'medium' : bandFromScore(score);

// Rewrite the metadata line so the displayed band + score are the enforced ones,
// not whatever the model wrote before it finished its analysis.
{
  const scoreText = score === null ? '—' : `${score}/100`;
  const newMeta = `_${TODAY} · conviction: ${conviction} · score: ${scoreText}_`;
  if (/_[^\n]*conviction:[^\n]*_/i.test(memo)) {
    memo = memo.replace(/_[^\n]*conviction:[^\n]*_/i, newMeta);
  }
}

function extractSection(text, heading) {
  const re = new RegExp(`##\\s+${heading}[\\s\\S]*?(?=\\n##\\s|\\n#\\s|$)`, 'i');
  const m = text.match(re);
  if (!m) return '';
  return m[0].replace(/^##\s+[^\n]*\n/, '').trim();
}

const learningsToday = extractSection(memo, 'What I learned today');
const killedToday = extractSection(memo, 'Candidates I considered and killed today');
const marketMapUpdate = extractSection(memo, 'Market map update');
const atlasEntry = extractSection(memo, 'Market atlas entry');

// ---------- Write today's memo ----------
mkdirSync('ideas', { recursive: true });
writeFileSync(`ideas/${TODAY}.md`, memo.endsWith('\n') ? memo : memo + '\n');

// ---------- Update LEARNINGS.md ----------
{
  const header = `# Learnings

Hard-won patterns this agent has discovered. Newest at the top.
`;
  const existing = readSafe('LEARNINGS.md');
  const body = existing
    .replace(/^#\s+Learnings[\s\S]*?(?=\n##\s|$)/, '')
    .trimStart();
  const next =
    `${header}\n## ${TODAY}\n${learningsToday || '- (no learnings extracted)'}\n\n${body}`.trimEnd() +
    '\n';
  writeFileSync('LEARNINGS.md', next);
}

// ---------- Update KILLED.md ----------
{
  const header = `# Killed ideas

Do not re-pitch these without a fundamentally new signal.
`;
  const existing = readSafe('KILLED.md');
  const body = existing
    .replace(/^#\s+Killed[\s\S]*?(?=\n##\s|$)/, '')
    .trimStart();
  const next =
    `${header}\n## ${TODAY}\n${killedToday || '- (no candidates killed)'}\n\n${body}`.trimEnd() +
    '\n';
  writeFileSync('KILLED.md', next);
}

// ---------- Update MARKET_MAP.md ----------
{
  const header = `# Market map

Niches, buyers, and comparable products this agent has studied. Updated incrementally.
`;
  const existing = readSafe('MARKET_MAP.md');
  const trimmedExisting = existing
    .replace(/^#\s+Market map[\s\S]*?(?=\n##\s|$)/, '')
    .trimStart();

  if (marketMapUpdate && marketMapUpdate.toLowerCase().startsWith('(new niche)')) {
    const block = marketMapUpdate.replace(/^\(new niche\)\s*\n*/i, '').trim();
    const next = `${header}\n${block}\n\n${trimmedExisting}`.trimEnd() + '\n';
    writeFileSync('MARKET_MAP.md', next);
  } else if (marketMapUpdate && marketMapUpdate.toLowerCase().startsWith('(updated existing')) {
    const note = `\n_(${TODAY} update)_ ${marketMapUpdate.trim()}\n`;
    const next = `${header}${note}\n${trimmedExisting}`.trimEnd() + '\n';
    writeFileSync('MARKET_MAP.md', next);
  } else if (!existing) {
    writeFileSync('MARKET_MAP.md', header);
  }
}

// ---------- Update markets/ atlas (structural market teardowns) ----------
if (atlasEntry && !isNoGo) {
  const slugMatch = atlasEntry.match(/slug:\s*(.+)/i);
  const nameMatch = atlasEntry.match(/market:\s*(.+)/i);
  const slug = slugMatch
    ? slugMatch[1]
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)
    : '';
  const marketName = (nameMatch ? nameMatch[1] : slug).trim();

  if (slug) {
    mkdirSync('markets', { recursive: true });

    // Strip the slug/market lines from the body we store as the revision.
    const revisionBody = atlasEntry
      .replace(/^\s*slug:.*$/im, '')
      .replace(/^\s*market:.*$/im, '')
      .trim();

    const file = `markets/${slug}.md`;
    const revision = `## ${TODAY} revision — idea: ${titleClean || 'n/a'} (score: ${score ?? 'n/a'})\n${revisionBody}\n`;
    if (existsSync(file)) {
      const prior = readSafe(file);
      // Insert the new revision right after the title block.
      const updated = prior.replace(
        /(^#\s+Market:[^\n]*\n(?:slug:[^\n]*\n)?)/i,
        `$1\n${revision}\n---\n\n`
      );
      writeFileSync(
        file,
        /^#\s+Market:/i.test(prior)
          ? updated
          : `# Market: ${marketName}\nslug: ${slug}\n\n${revision}\n---\n\n${prior}`
      );
    } else {
      writeFileSync(file, `# Market: ${marketName}\nslug: ${slug}\n\n${revision}`);
    }

    // Maintain markets/INDEX.md (one row per market, newest update first).
    const idxHeader = `# Markets atlas index

Structural teardowns of markets this agent has analyzed. Newest update first.

| Market | Slug | Last updated | Last score | Last idea |
|---|---|---|---|---|`;
    const idxExisting = readSafe('markets/INDEX.md');
    const idxRowRe =
      /^\|\s*(.+?)\s*\|\s*([a-z0-9-]+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/gim;
    const idxRows = [];
    let im;
    while ((im = idxRowRe.exec(idxExisting)) !== null) {
      if (im[2] === slug) continue; // replace this market's row
      idxRows.push({
        market: im[1],
        slug: im[2],
        updated: im[3],
        score: im[4],
        idea: im[5],
      });
    }
    idxRows.push({
      market: marketName.replace(/\|/g, '\\|'),
      slug,
      updated: TODAY,
      score: String(score ?? 'n/a'),
      idea: (titleClean || 'n/a').replace(/\|/g, '\\|'),
    });
    idxRows.sort((a, b) => b.updated.localeCompare(a.updated));
    const idxBody = idxRows
      .map((r) => `| ${r.market} | ${r.slug} | ${r.updated} | ${r.score} | ${r.idea} |`)
      .join('\n');
    writeFileSync('markets/INDEX.md', `${idxHeader}\n${idxBody}\n`);
    console.log(`✓ Updated markets/${slug}.md + markets/INDEX.md`);
  }
}

// ---------- Update README.md log ----------
{
  const existing = readSafe('README.md');
  const logTitle = titleClean || `idea ${TODAY}`;
  const scoreTag = score === null ? conviction : `${score}/100 ${conviction}`;
  const logEntry = `- ${TODAY} — ${logTitle} — ${scoreTag}`;

  if (/##\s+Log/i.test(existing)) {
    const updated = existing.replace(/(##\s+Log[^\n]*\n+)/i, `$1${logEntry}\n`);
    writeFileSync('README.md', updated);
  } else {
    writeFileSync('README.md', existing.trimEnd() + `\n\n## Log\n\n${logEntry}\n`);
  }
}

// ---------- Update SCORES.md leaderboard (ranked by score, highest first) ----------
{
  const header = `# Conviction leaderboard

Every scored idea, ranked highest-conviction first. Score is the agent's calibrated
0–100 self-assessment (82+ = high, 65–81 = medium, below 65 = low). "No GO" days are 0.

| Score | Conviction | Date | Idea |
|---|---|---|---|`;

  const existing = readSafe('SCORES.md');
  const rowRe = /^\|\s*(\d{1,3})\s*\|\s*([a-z]+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|$/gim;
  const rows = [];
  let m;
  while ((m = rowRe.exec(existing)) !== null) {
    if (m[3] === TODAY) continue;
    rows.push({ score: parseInt(m[1], 10), band: m[2], date: m[3], idea: m[4] });
  }
  const safeTitle = (titleClean || `idea ${TODAY}`).replace(/\|/g, '\\|');
  rows.push({ score: score ?? 0, band: conviction, date: TODAY, idea: safeTitle });
  rows.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));

  const body = rows
    .map((r) => `| ${r.score} | ${r.band} | ${r.date} | ${r.idea} |`)
    .join('\n');
  writeFileSync('SCORES.md', `${header}\n${body}\n`);
}

console.log(`✓ Wrote ideas/${TODAY}.md (${memo.length} chars)`);
console.log(`✓ Title: ${titleClean}`);
console.log(`✓ Conviction: ${conviction} (score: ${score === null ? 'n/a' : score})`);
console.log('✓ Updated LEARNINGS.md, KILLED.md, MARKET_MAP.md, README.md, SCORES.md, markets/');
