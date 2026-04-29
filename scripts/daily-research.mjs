// Daily business-idea research agent.
// Runs in GitHub Actions. Calls Gemini 2.5 Pro with Google Search grounding.
// Writes ideas/YYYY-MM-DD.md plus updates to LEARNINGS.md, KILLED.md, MARKET_MAP.md, README.md.
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

const ideaFiles = existsSync('ideas')
  ? readdirSync('ideas')
      .filter((f) => f.endsWith('.md') && f !== '.gitkeep')
      .sort()
  : [];

// Pull recent context — last 5 memos + the three living docs + roadmap
const recentIdeas = ideaFiles
  .slice(-5)
  .map((f) => `### ${f}\n\n${readSafe(join('ideas', f))}`)
  .join('\n\n---\n\n');

const roadmap = readSafe('ROADMAP.md');
const learnings = readSafe('LEARNINGS.md');
const marketMap = readSafe('MARKET_MAP.md');
const killed = readSafe('KILLED.md');

// ---------- Prompt ----------
const prompt = `You are a ruthless solo-founder business researcher. Your job is to find ONE high-conviction, profitable online business idea today and write a decision-quality memo.

Today is ${TODAY}.

The founder you work for:
- Solo creator, product/UX designer with Canva and Figma fluency
- English-learning content experience
- ~10 hours/week to build
- 4-week build-then-validate sprints
- Validated $29 / $39 Gumroad price points
- Distribution: Reddit, Facebook groups, TikTok, IG Reels, DM outreach
- Hard limits: no team, no VC, no inventory, no physical product, no regulated industries (medical/legal/financial), no get-rich-quick framings, no fabricated credentials

Use Google Search aggressively. Open at least 8 distinct sources across: what's selling now (Gumroad / ProductHunt / IndieHackers), buyer pain (Reddit / Quora / Twitter complaints), trends up (Google Trends, TikTok hashtags, funding news), and designer-edge categories (Pinterest templates, Etsy digitals, Notion templates marketplace). Cite all sources.

You are part of a compounding system. Today's idea MUST be novel relative to everything below.

=== ROADMAP.md ===
${roadmap || '(empty)'}

=== LEARNINGS.md (priors) ===
${learnings || '(empty)'}

=== MARKET_MAP.md (niches already explored) ===
${marketMap || '(empty)'}

=== KILLED.md (DO NOT re-pitch) ===
${killed || '(empty)'}

=== Recent idea memos (last 5) ===
${recentIdeas || '(no prior memos)'}

---

Generate 4–6 candidate ideas internally. Kill all but one against these 7 gates:
1. Specific buyer findable in <30 min online
2. Already paying for something nearby (proof of wallet)
3. v1 ships in 4 weeks at ~10 hrs/week
4. Founder's design/English-content skills are real assets
5. 14-day cheap validation test exists
6. Realistic year-1 revenue ≥ $5,000 with a believable path to $25k+
7. Genuinely novel relative to LEARNINGS / MARKET_MAP / KILLED

If nothing passes all 7, output a "No GO today" memo explaining what failed and what signal would change tomorrow.

Output the memo as markdown using EXACTLY this structure (no preamble, start at "# "):

# <One-line idea title — concrete, not generic>

_${TODAY} · conviction: high | medium | low_

## The idea
One paragraph: what it is, what the buyer gets, what it costs.

## Who pays and why
Specific buyer. Quote pain language from 2+ real people with source links. Name the exact community / platform / search query where they live.

## Why now
The trend / gap / shift in 2026 specifically. With 2+ sources.

## Size of opportunity
Napkin math: TAM, 2+ comparables with revenue or proxy data, realistic year-1 revenue range, path to $25k+ ARR, ceiling.

## Competitive landscape
Top 3 closest competitors. What they do right. What they leave on the table that this idea exploits.

## Validation plan (14 days, < $50)
Free lead magnet, landing page, distribution channels, exact GO / REFINE / PAUSE thresholds.

## 4-week build plan (10 hrs/week)
Week 1 / 2 / 3 / 4 deliverables with hour estimates.

## Risks and kill criteria
Top 3 ways this fails. Exact metric or signal that says "stop now."

## Candidates I considered and killed today
3–5 other candidates, one line each, with reason. Format: "- <idea> — <reason>"

## What I learned today
2–4 concrete patterns this run revealed about markets, buyers, pricing, distribution, or research itself. Format: "- <pattern>"

## Why this beats yesterday's idea
One paragraph contrasting against the most recent prior idea. Day 1 = "First idea — baseline."

## Sources
Bulleted list of every URL you opened. Minimum 8.

## Market map update
Either "(new niche)" followed by a section like:
## <Niche name>
- Buyer: <one-line>
- Where they gather: <links/communities>
- Comparable products + revenue: <bullets with sources>
- Price range: <$X–$Y>
- Last researched: ${TODAY}
- Status: open
…OR "(updated existing: <name>)" followed by 2–3 lines of new comparables / data.

Tone: Strong businessman. Numbers first. No hype words ("revolutionary", "game-changer", "unlock"). No emojis. Sentence-case headers. Concrete > abstract. No claim without a source.

Begin.`;

// ---------- Call Gemini ----------
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${API_KEY}`;

const body = {
  contents: [{ parts: [{ text: prompt }] }],
  tools: [{ google_search: {} }],
  generationConfig: {
    temperature: 0.6,
    maxOutputTokens: 16384,
  },
};

console.log(`[${TODAY}] Calling Gemini 2.5 Pro with Google Search…`);
console.log(`Prompt length: ${prompt.length} chars`);

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const t = await res.text();
  console.error(`Gemini error ${res.status}:`, t);
  process.exit(1);
}

const data = await res.json();
const memo =
  data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';

if (!memo || memo.length < 500) {
  console.error('Gemini returned empty / too-short response.');
  console.error(JSON.stringify(data, null, 2).slice(0, 2000));
  process.exit(1);
}

console.log(`Got memo: ${memo.length} chars`);

// ---------- Parse memo for structured updates ----------
const firstHeadingLine =
  memo.split('\n').find((l) => l.trim().startsWith('# ')) || '';
const fullTitle = firstHeadingLine.replace(/^#\s+/, '').trim();
// Strip trailing markdown/punctuation if any
const titleClean = fullTitle.replace(/\s+$/, '').replace(/[.\s]+$/, '');

const convictionMatch = memo.match(/conviction:\s*(high|medium|low)/i);
const conviction = convictionMatch ? convictionMatch[1].toLowerCase() : 'medium';

function extractSection(text, heading) {
  const re = new RegExp(
    `##\\s+${heading}[\\s\\S]*?(?=\\n##\\s|\\n#\\s|$)`,
    'i'
  );
  const m = text.match(re);
  if (!m) return '';
  return m[0]
    .replace(/^##\s+[^\n]*\n/, '')
    .trim();
}

const learningsToday = extractSection(memo, 'What I learned today');
const killedToday = extractSection(memo, 'Candidates I considered and killed today');
const marketMapUpdate = extractSection(memo, 'Market map update');

// ---------- Write today's memo ----------
mkdirSync('ideas', { recursive: true });
writeFileSync(`ideas/${TODAY}.md`, memo.endsWith('\n') ? memo : memo + '\n');

// ---------- Update LEARNINGS.md ----------
{
  const header = `# Learnings

Hard-won patterns this agent has discovered. Newest at the top.
`;
  const existing = readSafe('LEARNINGS.md');
  // strip the existing header if present
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
    // Prepend the new niche block
    const block = marketMapUpdate.replace(/^\(new niche\)\s*\n*/i, '').trim();
    const next =
      `${header}\n${block}\n\n${trimmedExisting}`.trimEnd() + '\n';
    writeFileSync('MARKET_MAP.md', next);
  } else if (marketMapUpdate && marketMapUpdate.toLowerCase().startsWith('(updated existing')) {
    // Append the update note at the top of the body
    const note = `\n_(${TODAY} update)_ ${marketMapUpdate.trim()}\n`;
    const next = `${header}${note}\n${trimmedExisting}`.trimEnd() + '\n';
    writeFileSync('MARKET_MAP.md', next);
  } else if (!existing) {
    // First run — at least write the header so future runs have it
    writeFileSync('MARKET_MAP.md', header);
  }
}

// ---------- Update README.md log ----------
{
  const existing = readSafe('README.md');
  const logTitle = titleClean || `idea ${TODAY}`;
  const logEntry = `- ${TODAY} — ${logTitle} — ${conviction}`;

  if (/##\s+Log/i.test(existing)) {
    // Insert today's entry right after the "## Log" heading
    const updated = existing.replace(
      /(##\s+Log[^\n]*\n+)/i,
      `$1${logEntry}\n`
    );
    writeFileSync('README.md', updated);
  } else {
    // Append a Log section if missing
    writeFileSync('README.md', existing.trimEnd() + `\n\n## Log\n\n${logEntry}\n`);
  }
}

console.log(`✓ Wrote ideas/${TODAY}.md (${memo.length} chars)`);
console.log(`✓ Title: ${titleClean}`);
console.log(`✓ Conviction: ${conviction}`);
console.log('✓ Updated LEARNINGS.md, KILLED.md, MARKET_MAP.md, README.md');
