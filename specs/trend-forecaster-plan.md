# Trend Forecaster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a second daily agent (Trend Forecaster) in the same `daily-business-ideas` system that picks 3 near-term trends per day with sources <90 days old, tracks them in `TRENDS_WATCH.md`, and pushes a Telegram message at 12:00 Asia/Yerevan.

**Architecture:** GitHub Actions cron + Gemini 2.5 Pro with Google Search grounding. Mirrors the existing Scout agent (`daily-research.yml` + `daily-research.mjs`). Same secrets, same repo, same Telegram bot. New script and new workflow file. No new infrastructure.

**Tech Stack:** Node 20, GitHub Actions, Gemini 2.5 Pro REST API with `google_search` tool, Telegram Bot API.

---

## File structure

| Path | Action | Purpose |
|---|---|---|
| `TRENDS_WATCH.md` | create | Living portfolio of all flagged trends with status |
| `scripts/trends.mjs` | create | Node script: read context → call Gemini → parse → write files |
| `.github/workflows/trends.yml` | create | Cron at 08:00 UTC, runs script, commits, pushes, sends Telegram |
| `trends/` | created on first run | Holds daily memo files `trends/YYYY-MM-DD.md` |
| `ROADMAP.md` | modify | Replace planned "News editor" row with "Trend Forecaster" |
| `LEARNINGS.md` | written by agent at runtime | "Patterns I noticed today" feeds shared learnings |
| `README.md` | written by agent at runtime | Log entry prepended on each run |

The script and workflow are self-contained units. Each task below produces a complete, working unit that can be reasoned about independently.

---

## Task 1: Create `TRENDS_WATCH.md` skeleton

**Files:**
- Create: `TRENDS_WATCH.md`

- [ ] **Step 1: Create the file with the documented skeleton**

Create `TRENDS_WATCH.md` at the repo root with this exact content:

```markdown
# Trends watch

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
```

- [ ] **Step 2: Commit**

```bash
git add TRENDS_WATCH.md
git commit -m "Add TRENDS_WATCH.md skeleton for the Trend Forecaster"
git push
```

---

## Task 2: Build `scripts/trends.mjs`

**Files:**
- Create: `scripts/trends.mjs`

- [ ] **Step 1: Write the full script**

Create `scripts/trends.mjs` with this exact content:

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/trends.mjs
git commit -m "Add scripts/trends.mjs — Trend Forecaster research script"
git push
```

---

## Task 3: Build `.github/workflows/trends.yml`

**Files:**
- Create: `.github/workflows/trends.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/trends.yml` with this exact content:

```yaml
name: Trend Forecaster

on:
  schedule:
    # 12:00 Asia/Yerevan = 08:00 UTC
    - cron: '0 8 * * *'
  workflow_dispatch: # manual run button

jobs:
  forecast:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run trend research
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: node scripts/trends.mjs

      - name: Commit and push
        id: commit
        run: |
          set -e
          DATE=$(date -u +%Y-%m-%d)
          git config user.name "Trend Forecaster"
          git config user.email "actions@users.noreply.github.com"
          git add -A
          if git diff --cached --quiet; then
            echo "Nothing to commit"
            echo "committed=false" >> $GITHUB_OUTPUT
            exit 0
          fi

          # Pull the first trend name for the commit message
          TOP=$(grep -m1 -oE '## Trend 1:\s*.+' "trends/${DATE}.md" | sed 's/## Trend 1:[[:space:]]*//' | tr -d '\r' || echo "trend forecast")

          git commit -m "trends(${DATE}): ${TOP} +2 more"
          git push

          echo "committed=true" >> $GITHUB_OUTPUT
          echo "top=${TOP}" >> $GITHUB_OUTPUT
          echo "date=${DATE}" >> $GITHUB_OUTPUT

      - name: Notify Telegram
        if: steps.commit.outputs.committed == 'true'
        env:
          TG_BOT_TOKEN: ${{ secrets.TG_BOT_TOKEN }}
          TG_CHAT_ID: ${{ secrets.TG_CHAT_ID }}
        run: |
          DATE="${{ steps.commit.outputs.date }}"
          TOP="${{ steps.commit.outputs.top }}"
          MEMO_URL="https://github.com/${GITHUB_REPOSITORY}/blob/main/trends/${DATE}.md"

          MSG="📈 ${DATE} — daily trend forecast

          3 new trends + 1 status update

          Top: ${TOP}

          Memo: ${MEMO_URL}"

          curl -sS -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TG_CHAT_ID}" \
            --data-urlencode "text=${MSG}"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/trends.yml
git commit -m "Add Trend Forecaster GitHub Actions workflow (cron 08:00 UTC)"
git push
```

---

## Task 4: First manual test

**Files:** none modified — this is a verification task.

- [ ] **Step 1: Trigger the workflow manually**

```bash
gh workflow run trends.yml --repo animuradyanartist/daily-business-ideas
```

- [ ] **Step 2: Wait for completion**

```bash
until [ "$(gh run list --workflow=trends.yml --repo animuradyanartist/daily-business-ideas --limit 1 --json status --jq '.[0].status')" = "completed" ]; do sleep 15; done
gh run list --workflow=trends.yml --repo animuradyanartist/daily-business-ideas --limit 1
```

Expected: status `completed`, conclusion `success`. Run time 1–3 minutes.

- [ ] **Step 3: Verify the memo file was committed**

```bash
gh api repos/animuradyanartist/daily-business-ideas/commits --jq '.[0] | {sha: .sha[0:7], msg: .commit.message}'
```

Expected: a commit with message starting `trends(YYYY-MM-DD):`.

- [ ] **Step 4: Read today's memo**

```bash
DATE=$(date -u +%Y-%m-%d)
gh api repos/animuradyanartist/daily-business-ideas/contents/trends/${DATE}.md --jq '.content' | base64 -d | head -100
```

Expected: a markdown file starting `# Daily trend forecast —`, containing 3 trend sections, each with sources dated within the last 90 days.

- [ ] **Step 5: Verify TRENDS_WATCH.md was updated**

```bash
gh api repos/animuradyanartist/daily-business-ideas/contents/TRENDS_WATCH.md --jq '.content' | base64 -d | head -40
```

Expected: 3 new entries under "🚀 Active — accelerating" (or distributed across status sections per the agent's call), each with a flagged date of today and a link to today's memo.

- [ ] **Step 6: Confirm Telegram delivery**

Check the Telegram bot chat. Expected: a `📈` message with today's date, top trend name, and a link to the memo.

If any step fails, read the workflow logs:

```bash
gh run view --repo animuradyanartist/daily-business-ideas --log-failed
```

---

## Task 5: Update ROADMAP.md to reflect the new agent

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Read the current ROADMAP.md and find the agent table**

```bash
gh api repos/animuradyanartist/daily-business-ideas/contents/ROADMAP.md --jq '.content' | base64 -d | grep -n -A1 'News editor'
```

- [ ] **Step 2: Replace the "News editor" row with "Trend Forecaster"**

Find this row in `ROADMAP.md`:

```
| **News editor** | Morning briefing on launches, funding, trends in the solo-creator economy | Daily 07:30 Asia/Yerevan (03:30 UTC) | `news/` |
```

Replace it with:

```
| **Trend Forecaster** *(live)* | Find 3 near-term trends per day with sources <90 days old; track them in TRENDS_WATCH.md | Daily 12:00 Asia/Yerevan (08:00 UTC) | `trends/` |
```

Also find the rhythm table:

```
| 07:30 | 03:30 | Daily | 📰 News brief |
```

Replace with:

```
| 12:00 | 08:00 | Daily | 📈 Trend forecast |
```

(Adjust the order in the rhythm table so it reads chronologically by Yerevan time.)

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "Update ROADMAP — Trend Forecaster replaces News editor in Phase 4"
git push
```

---

## Self-review checklist

Run these mentally after the plan is written:

- [x] **Spec coverage:** every section of `specs/trend-forecaster.md` maps to at least one task. Identity → Task 2 prompt + Task 3 workflow. Architecture → Task 2 + Task 3. Daily memo format → Task 2 prompt. TRENDS_WATCH.md format → Task 1 + Task 2 update logic. Re-check rule → Task 2 prompt. Telegram message format → Task 3. Failure modes → Task 2 retry logic. Source quality + freshness → Task 2 prompt rules. Cost → no implementation needed (architectural). Integration → Task 5 (ROADMAP update).

- [x] **Placeholder scan:** no TBD, no "implement appropriate error handling", no "similar to Task N". All code is shown in full.

- [x] **Type consistency:** function names (`callGemini`, `extractSection`, `addTrendToSection`, `readSafe`) and signatures match across the script. Workflow output names (`committed`, `top`, `date`) match between the commit step and the notify step.

- [x] **Status flag consistency:** the four status emojis (🚀 ➡️ 📉 ⛔) appear identically in TRENDS_WATCH.md skeleton (Task 1), the prompt's directive format (Task 2), and the script's `addTrendToSection` switch (Task 2).

---

## Definition of done

- `TRENDS_WATCH.md`, `scripts/trends.mjs`, `.github/workflows/trends.yml` all committed.
- One manual workflow run completes successfully.
- A `trends/<today>.md` file exists in the repo with 3 trend sections, each citing 2+ sources dated within the last 90 days.
- `TRENDS_WATCH.md` has at least 3 entries.
- A `📈` Telegram message arrived for the test run.
- `ROADMAP.md` updated to reflect Trend Forecaster as the live Phase-4 agent.
- Tomorrow at 12:00 Asia/Yerevan, the cron fires automatically and produces another memo without intervention.
