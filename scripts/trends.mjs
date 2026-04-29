// Daily trend-forecaster agent.
// Runs in GitHub Actions. Calls Gemini 2.5 Pro with Google Search grounding,
// time-filtered to the last 90 days for freshness.
// Writes trends/YYYY-MM-DD.md plus updates TRENDS_WATCH.md, LEARNINGS.md, README.md.
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

// 90 days ago in YYYY-MM-DD form, used as the freshness floor
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const readSafe = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

// Pull last 5 trend memos for continuity
const trendFiles = existsSync('trends')
  ? readdirSync('trends')
      .filter((f) => f.endsWith('.md') && f !== '.gitkeep')
      .sort()
  : [];
const recentTrends = trendFiles
  .slice(-5)
  .map((f) => `### ${f}\n\n${readSafe(join('trends', f))}`)
  .join('\n\n---\n\n');

const roadmap = readSafe('ROADMAP.md');
const trendsWatch = readSafe('TRENDS_WATCH.md');
const learnings = readSafe('LEARNINGS.md');

// ---------- Prompt ----------
const prompt = `You are a ruthless trend forecaster. Your job is to find 3 NEAR-TERM trends per day (3–6 month horizon), each backed by 2+ FRESH sources, plus 1 status update on a previously tracked trend. Source freshness is non-negotiable — your training data is older than today's market, so you MUST use Google Search exclusively for live signals.

Today is ${TODAY}.

The founder you serve:
- Solo creator, product/UX designer, Canva/Figma fluent
- English-learning content background
- ~10 hours/week to build
- Has shipped digital products on Gumroad ($29 / $39 price points validated)
- Distribution: Reddit, Facebook groups, TikTok, IG Reels, DM outreach
- Hard limits: no team, no VC, no inventory, no physical product, no regulated industries

Scope: WIDE NET. Tech, consumer, business, cultural, lifestyle. Anything observable that's rising and likely to peak in the next 3–6 months.

## CRITICAL freshness rules (non-negotiable)

- Every source must be dated within the last 90 days (after ${ninetyDaysAgo}).
- Sources from the last 30 days are strongly preferred.
- Sources from 91–180 days old are only acceptable as supporting context, never as primary trend evidence.
- Sources older than 180 days do NOT count toward the 2-source minimum.
- Each source citation must show its publication date inline: \`[title](url) (YYYY-MM-DD)\`.
- DO NOT use your training data for any factual claim. Use Google Search for everything. Append \`after:${ninetyDaysAgo}\` to your search queries.
- If a candidate trend can only find sources from 2024–2025 or older, KILL it and find a fresher one.

## Source quality

Acceptable sources: real news articles, blog posts (IH/Substack), social-media posts (Twitter/X, Reddit, TikTok with view counts), platform data (Google Trends URLs, ProductHunt pages, IndieHackers product pages), funding announcements (Crunchbase, TechCrunch, press releases), academic papers.

Not acceptable as primary source: marketing copy from the company being analyzed, Wikipedia for trend claims, AI-generated content without a primary source.

## Compounding context — read carefully

=== ROADMAP.md ===
${roadmap || '(empty)'}

=== TRENDS_WATCH.md (the running portfolio) ===
${trendsWatch || '(empty — first run, no prior trends)'}

=== LEARNINGS.md ===
${learnings || '(empty)'}

=== Recent trend memos (last 5) ===
${recentTrends || '(no prior memos)'}

---

## Your task

1. Find 3 NEW trends today. Each must:
   - Be observable in the last 90 days (rising signal).
   - Have a 3–6 month forecast horizon (about to peak, not already mainstream).
   - Pass the source bar: 2+ fresh sources with visible dates.
   - Be NOVEL relative to TRENDS_WATCH.md (don't re-pitch what's already tracked).

2. Pick 1 prior trend from TRENDS_WATCH.md to RE-CHECK. Priority order:
   a) Any trend not checked in >14 days
   b) Among accelerating trends, the one not checked in the longest
   c) Round-robin through the rest
   d) If a trend has been >30 days without a check, force-mark it plateauing or fading with explanation

   If TRENDS_WATCH.md is empty, skip the status update and note: "First run — no prior trends to re-check yet."

3. Output the memo as markdown with EXACTLY this structure:

# Daily trend forecast — ${TODAY}

3 new trends · 1 status update · forecast horizon: 3–6 months

---

## Trend 1: <concrete trend name>

**What's happening** — 2–3 sentences. The observable change.

**Why now** — 2–3 sentences. Cause. With inline source links + dates.

**Forecast (3–6 months)** — one paragraph. Where this goes.

**Who rides this** — what kinds of businesses / products benefit.

**Confidence:** high | medium | low — one-line reasoning.

**Sources:**
- [<source title>](<url>) (YYYY-MM-DD)
- [<source title>](<url>) (YYYY-MM-DD)

## Trend 2: <name>
(same structure)

## Trend 3: <name>
(same structure)

---

## Status update: <prior trend name>

**Originally flagged:** YYYY-MM-DD

**Current status:** 🚀 accelerating · ➡️ plateauing · 📉 fading · ⛔ killed

**What changed** — 2–3 sentences. New sources required.

**Sources:**
- [<title>](<url>) (YYYY-MM-DD)

---

## Patterns I noticed today

2–3 cross-trend observations. Format: "- <pattern>"

---

## TRENDS_WATCH update directives

For each of the 3 new trends, output one line in this exact format (the script will parse these to update TRENDS_WATCH.md):

NEW: <status emoji> | <trend name> | <one-line description>

Where <status emoji> is one of 🚀 ➡️ 📉 ⛔ (default 🚀 for new trends; only use others if early signals already look mid-cycle).

For the status update target, output one line:

UPDATE: <new status emoji> | <trend name>

If status is now 📉 or ⛔, append " | <reason>".

If you skipped the status update (first run), output:

UPDATE: SKIP

---

## Sources

Bulleted list of every URL opened today. Minimum 8.

---

Tone: strong businessman, numbers first, no hype words ("revolutionary", "unlock", "game-changer"), no emojis except the status flags above. Sentence-case headers. Concrete > abstract. No claim without a source.

If fewer than 3 candidates pass the freshness + source bar, output a "No GO today — insufficient fresh sources" memo with reasoning instead.

Begin.`;

// ---------- Call Gemini with retry + fallback ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(model, attempt = 1) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 16384,
    },
  };

  console.log(`[${TODAY}] Calling ${model} (attempt ${attempt})…`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    return res.json();
  }

  const status = res.status;
  const errBody = await res.text();
  console.error(`${model} returned ${status}: ${errBody.slice(0, 300)}`);

  if ((status === 429 || status >= 500) && attempt < 3) {
    const wait = 2 ** attempt * 1000;
    console.log(`Retrying ${model} in ${wait}ms…`);
    await sleep(wait);
    return callGemini(model, attempt + 1);
  }

  throw new Error(`${model} failed after ${attempt} attempts: ${status}`);
}

console.log(`Prompt length: ${prompt.length} chars`);

let data;
try {
  data = await callGemini('gemini-2.5-pro');
} catch (err) {
  console.error('Pro exhausted retries. Falling back to Flash.');
  try {
    data = await callGemini('gemini-2.5-flash');
  } catch (err2) {
    console.error('Both Pro and Flash failed. Aborting.');
    process.exit(1);
  }
}

const memo =
  data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';

if (!memo || memo.length < 500) {
  console.error('Gemini returned empty / too-short response.');
  console.error(JSON.stringify(data, null, 2).slice(0, 2000));
  process.exit(1);
}

console.log(`Got memo: ${memo.length} chars`);

// ---------- Parse memo ----------
function extractSection(text, heading) {
  const re = new RegExp(
    `##\\s+${heading}[\\s\\S]*?(?=\\n##\\s|\\n#\\s|$)`,
    'i'
  );
  const m = text.match(re);
  return m ? m[0].replace(/^##\s+[^\n]*\n/, '').trim() : '';
}

const patternsToday = extractSection(memo, "Patterns I noticed today");
const watchDirectives = extractSection(memo, "TRENDS_WATCH update directives");

// Parse the directive lines
const newTrendLines = (watchDirectives.match(/^NEW:\s*.+$/gm) || []).map((l) =>
  l.replace(/^NEW:\s*/, '').trim()
);
const updateLine = (watchDirectives.match(/^UPDATE:\s*.+$/m) || [])[0]?.replace(/^UPDATE:\s*/, '').trim();

// Pull a quick top-trend label for the Telegram message
const firstTrendMatch = memo.match(/##\s+Trend 1:\s*([^\n]+)/i);
const firstTrendTitle = firstTrendMatch ? firstTrendMatch[1].trim() : 'untitled';

// ---------- Write today's memo ----------
mkdirSync('trends', { recursive: true });
writeFileSync(`trends/${TODAY}.md`, memo.endsWith('\n') ? memo : memo + '\n');

// ---------- Update TRENDS_WATCH.md ----------
{
  let watch = readSafe('TRENDS_WATCH.md');
  if (!watch) {
    watch = `# Trends watch

Every trend the Trend Forecaster has flagged. Updated daily.

Status legend: 🚀 accelerating · ➡️ plateauing · 📉 fading · ⛔ killed

## 🚀 Active — accelerating

_(empty — first run will populate)_

## ➡️ Active — plateauing

_(empty)_

## 📉 Fading

_(empty)_

## ⛔ Killed

_(empty)_
`;
  }

  // Helper to add a new trend entry under its status section, removing the "_(empty)_" placeholder
  function addTrendToSection(text, sectionHeading, entry) {
    const sectionRe = new RegExp(
      `(##\\s+${sectionHeading}\\s*\\n+)([\\s\\S]*?)(?=\\n##\\s|$)`,
      'i'
    );
    return text.replace(sectionRe, (full, heading, body) => {
      const cleaned = body.replace(/_\(empty[^)]*\)_\s*\n*/g, '').trimEnd();
      const newBody = (cleaned ? cleaned + '\n' : '') + entry + '\n\n';
      return heading + newBody;
    });
  }

  const memoLink = `[origin memo](trends/${TODAY}.md)`;

  for (const line of newTrendLines) {
    // Format: <emoji> | <name> | <description>
    const parts = line.split('|').map((s) => s.trim());
    if (parts.length < 2) continue;
    const emoji = parts[0];
    const name = parts[1];
    const desc = parts[2] || '';

    const entry = `- **${name}** · ${desc} · flagged ${TODAY} · last checked ${TODAY} · ${memoLink}`;

    let section;
    if (emoji.includes('🚀')) section = '🚀 Active — accelerating';
    else if (emoji.includes('➡️')) section = '➡️ Active — plateauing';
    else if (emoji.includes('📉')) section = '📉 Fading';
    else if (emoji.includes('⛔')) section = '⛔ Killed';
    else section = '🚀 Active — accelerating';

    watch = addTrendToSection(watch, section, entry);
  }

  // Apply UPDATE directive — for now just append a note to the memo about the new status.
  // Moving entries between sections is a manual concern for v1; we record but don't auto-move.
  // Future improvement: parse and relocate the trend's existing line.
  if (updateLine && updateLine !== 'SKIP') {
    console.log(`Status update directive: ${updateLine}`);
    // Append a small audit log at the bottom for traceability
    watch = watch.trimEnd() + `\n\n<!-- ${TODAY} status-update directive: ${updateLine} -->\n`;
  }

  writeFileSync('TRENDS_WATCH.md', watch.trimEnd() + '\n');
}

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
    `${header}\n## ${TODAY} (trends)\n${patternsToday || '- (no patterns extracted)'}\n\n${body}`.trimEnd() +
    '\n';
  writeFileSync('LEARNINGS.md', next);
}

// ---------- Update README.md log ----------
{
  const existing = readSafe('README.md');
  const logEntry = `- ${TODAY} — trend forecast — ${firstTrendTitle} +2 more`;

  if (/##\s+Log/i.test(existing)) {
    const updated = existing.replace(
      /(##\s+Log[^\n]*\n+)/i,
      `$1${logEntry}\n`
    );
    writeFileSync('README.md', updated);
  } else {
    writeFileSync('README.md', existing.trimEnd() + `\n\n## Log\n\n${logEntry}\n`);
  }
}

console.log(`✓ Wrote trends/${TODAY}.md (${memo.length} chars)`);
console.log(`✓ First trend: ${firstTrendTitle}`);
console.log(`✓ Updated TRENDS_WATCH.md, LEARNINGS.md, README.md`);
