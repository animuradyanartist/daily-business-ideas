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

// Idempotency check: if today's memo is already committed, do nothing.
// This lets a backup cron run safely without producing duplicates.
if (existsSync(`ideas/${TODAY}.md`)) {
  console.log(`ideas/${TODAY}.md already exists — skipping run.`);
  process.exit(0);
}

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
const prompt = `You are a ruthless business-opportunity researcher. Your job is to find the ONE most compelling business opportunity today — judged on TWO things only — and write a decision-quality memo.

The two things that matter:
1. REAL PAIN — a problem that is acute, frequent, and genuinely felt by real people (not a "nice to have"). You must prove it with the buyers' own words.
2. MARKET VALUE — solving it is worth real money: people already spend to relieve this pain, or clearly would, and the addressable market is meaningful.

Today is ${TODAY}.

Do NOT narrow by who would build it, what skills they have, company size, capital, business model, or product format. Any industry, any format (software, service, marketplace, physical, B2B, B2C, etc.) is fair game. Let the PAIN and the MARKET lead — surface the best opportunity you can find, wherever it is.

Only hard limits (integrity, not narrowing): nothing illegal, nothing in clearly regulated spaces you can't substantiate (e.g. dispensing medical/legal/financial advice), no get-rich-quick framings, no fabricated data or credentials. Every claim needs a source.

Use Google Search aggressively. Open at least 8 distinct sources across: what's selling now (Gumroad / ProductHunt / IndieHackers / Etsy / App stores), buyer pain (Reddit / Quora / Twitter complaints / niche forums), trends up (Google Trends, TikTok hashtags, funding news), and a WIDE range of buyer worlds — deliberately rotate beyond creators/designers: small local services, trades, e-commerce ops, finance/admin, healthcare-adjacent (non-regulated), education, hobbies, B2B niches, blue-collar work, parents, seniors, etc. Cite all sources.

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

Generate 4–6 candidate opportunities internally, drawn from DIFFERENT industries and buyer worlds (do not generate 4–6 variations of the same niche). Kill all but one against these gates — the first two are the real bar, the rest are sanity checks:
1. REAL PAIN — the problem is acute and frequent, evidenced by ≥2 real people describing it in their own words, with source links. "How intense is this pain?" must have a strong answer.
2. MARKET VALUE — clear proof of wallet: people already pay for partial/adjacent solutions, OR there is obvious willingness to pay. Estimate the size of the money on the table.
3. Identifiable buyer — you can name exactly who has this pain and where they are.
4. Real gap — current alternatives leave the pain badly solved or unsolved; there is a credible wedge to win.
5. Substantiated — every key claim is backed by a cited source, not a guess.
6. Meaningful upside — a believable path to a real business, not a tiny one-off.
7. Genuinely novel relative to LEARNINGS / MARKET_MAP / KILLED — not a near-duplicate of a past idea. DIVERSITY MANDATE: if the last 5 memos share a theme, industry, or buyer type, deliberately break the pattern. Over any 5 runs, span ≥3 unrelated industries.

If nothing clears gates 1 and 2 convincingly, output a "No GO today" memo explaining what failed and what signal would change tomorrow.

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
Napkin math: TAM, 2+ comparables with revenue or proxy data, the money currently spent on this pain, a realistic revenue range, and the ceiling. Scale it to the actual market — don't assume a tiny solo product.

## Competitive landscape
Top 3 closest competitors. What they do right. What they leave on the table that this idea exploits.

## Validation plan
The cheapest, fastest test that would prove the pain is real and people will pay. Concrete steps, where to run it, and exact GO / REFINE / PAUSE thresholds. Scale the test to the opportunity.

## Path to v1
The realistic route to a first sellable version: scope, key milestones, what it takes (time, skills, capital) and roughly how long. Be honest about the lift — don't pretend a big opportunity is trivial.

## Sales playbook
How to actually sell this once built. Be specific, not generic. Cover all six:

1. **Pricing strategy** — launch price, sustained price, any tier structure, when to raise prices, what justifies each tier.
2. **Top 3 sales channels** — pick three specific channels (e.g., "r/Entrepreneur Wednesday post", "DM 30 new Preply tutors", "TikTok hashtag #onlineteacher") and write the EXACT first move on each. Include hook line, day/time to post, what asset to share.
3. **Hook copy** — the actual landing-page headline and sub-headline (pragmatic, no hype). Write 2 versions to A/B test.
4. **Pre-launch → launch → sustained** sequence — 3–5 concrete actions per phase. Pre-launch builds waitlist; launch converts; sustained keeps revenue trickling. Name dates relative to "Day 0 = launch day".
5. **Top 2 buyer objections** and a 1-sentence rebuttal for each. Write the rebuttal as the founder would actually say it.
6. **Social proof strategy** — what evidence to collect (screenshots, quotes, before/after), what to show on the sales page first, what to add over time.

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

  // Retry on transient errors (429 rate limit, 5xx server)
  if ((status === 429 || status >= 500) && attempt < 3) {
    const wait = 2 ** attempt * 1000; // 2s, 4s
    console.log(`Retrying ${model} in ${wait}ms…`);
    await sleep(wait);
    return callGemini(model, attempt + 1);
  }

  // Out of retries — caller decides whether to fall back
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
