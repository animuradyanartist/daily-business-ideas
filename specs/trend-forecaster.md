# Trend Forecaster — design spec

_2026-04-29_

A second daily agent in the same `daily-business-ideas` system. Picks 3 near-term trends per day with a 3–6 month forecast horizon, tracks them over time as a compounding portfolio.

## Goals

**Phase 1 (this spec):** Standalone trend forecasting agent. Daily 12:00 Yerevan delivery to Telegram + commit to repo. Maintains its own portfolio file `TRENDS_WATCH.md`.

**Phase 2 (future, separate spec):** Wire `TRENDS_WATCH.md` into Scout's prompt so accelerating trends become inputs to daily idea generation. Not implemented in this round — only the file format must be future-compatible.

## Non-goals

- No image / chart generation. Plain markdown only.
- No social-media posting. Output is repo + Telegram.
- No trend-based ideation in this phase (that's Scout's job; Phase 2 connects them).
- No real-time alerts on breaking trends. Daily cadence is sufficient.

## Identity

| Field | Value |
|---|---|
| Agent name | Trend Forecaster |
| Mission | Find 3 trends per day with 3–6 month horizon. Track them. Source every claim. |
| Schedule | Daily 12:00 Asia/Yerevan = 08:00 UTC, cron `0 8 * * *` |
| Output folder | `trends/` |
| Living tracker | `TRENDS_WATCH.md` at repo root |
| Telegram emoji | 📈 |

## Architecture

Mirrors the Scout agent (`daily-research.yml` + `daily-research.mjs`). No new infrastructure.

| Component | Path |
|---|---|
| GitHub Actions workflow | `.github/workflows/trends.yml` |
| Node.js script | `scripts/trends.mjs` |
| LLM | Gemini 2.5 Pro with Google Search grounding, fallback to Gemini 2.5 Flash on 503 / 429 |
| Secrets | `GEMINI_API_KEY`, `TG_BOT_TOKEN`, `TG_CHAT_ID` (already in repo) |

The script:
1. Reads accumulated context (`ROADMAP.md`, `TRENDS_WATCH.md`, last 5 entries from `trends/`, `LEARNINGS.md`).
2. Builds the prompt with the founder profile, source-quality rules, and accumulated context.
3. Calls Gemini 2.5 Pro. Retries 3× with backoff on 5xx/429. Falls back to Flash if Pro is exhausted.
4. Parses the response: 3 trend blocks, 1 status update, patterns, sources.
5. Writes `trends/YYYY-MM-DD.md`.
6. Updates `TRENDS_WATCH.md`: prepends 3 new entries to "🚀 Active — accelerating" by default; the agent may classify a new trend directly as plateauing if signals already look mid-cycle. Also moves the re-checked trend between sections based on its new status.
7. Updates `LEARNINGS.md` (prepends today's "Patterns I noticed today" bullets).
8. Updates `README.md` log with a 1-line entry: `- YYYY-MM-DD — trend forecast — [topic 1], [topic 2], [topic 3]`.

The workflow:
1. Checks out the repo.
2. Runs the script with `GEMINI_API_KEY`.
3. Commits all changes as "Trend Forecaster <actions@users.noreply.github.com>" with message `trends(YYYY-MM-DD): <topic 1> · <topic 2> · <topic 3>`.
4. Pushes to `main`.
5. Sends inline Telegram message (NOT via chained workflow — GitHub default token doesn't fire chained workflows).

## Daily memo format

Saved to `trends/YYYY-MM-DD.md`:

```markdown
# Daily trend forecast — YYYY-MM-DD

3 new trends · 1 status update · forecast horizon: 3–6 months

---

## Trend 1: <concrete trend name>

**What's happening** — 2–3 sentences. The observable change.

**Why now** — 2–3 sentences. Cause. 2+ inline source links.

**Forecast (3–6 months)** — one paragraph. Where this goes.

**Who rides this** — what kinds of businesses / products benefit.

**Confidence:** high | medium | low — one-line reasoning.

**Sources:**
- <link 1>
- <link 2>
- ...

## Trend 2: <name>
(same structure)

## Trend 3: <name>
(same structure)

---

## Status update: <prior trend name>

**Originally flagged:** YYYY-MM-DD (link to that day's memo)

**Current status:** 🚀 accelerating · ➡️ plateauing · 📉 fading · ⛔ killed

**What changed** — 2–3 sentences. New sources required.

**Sources:**
- <link>
- <link>

---

## Patterns I noticed today

2–3 cross-trend observations. These feed LEARNINGS.md.

---

## Sources

Bulleted list of every URL opened today. Minimum 8 across all four sections.
```

**Hard rules baked into the Gemini prompt:**
- Every factual claim must have an inline source link.
- Minimum 2 sources per trend.
- If a candidate trend has fewer than 2 quality sources, kill it and find another.
- If fewer than 3 candidates pass the source bar, write "No GO today — insufficient sources" with reasoning.

**Length target:** 600–800 words total. Deep but compact.

## TRENDS_WATCH.md format

```markdown
# Trends watch

Every trend the Trend Forecaster has flagged. Updated daily.

Status legend: 🚀 accelerating · ➡️ plateauing · 📉 fading · ⛔ killed

## 🚀 Active — accelerating

- **<Trend name>** · flagged YYYY-MM-DD · last checked YYYY-MM-DD · [origin memo](trends/YYYY-MM-DD.md) · [latest update](trends/YYYY-MM-DD.md)
- ...

## ➡️ Active — plateauing

- **<Trend name>** · flagged YYYY-MM-DD · last checked YYYY-MM-DD · [memo](trends/YYYY-MM-DD.md)
- ...

## 📉 Fading

- **<Trend name>** · flagged YYYY-MM-DD · faded YYYY-MM-DD · reason: <one line> · [memo](trends/YYYY-MM-DD.md)
- ...

## ⛔ Killed

- **<Trend name>** · flagged YYYY-MM-DD · killed YYYY-MM-DD · reason: <one line> · [memo](trends/YYYY-MM-DD.md)
- ...
```

## Re-check selection rule

How the agent picks which prior trend to update each day, in priority order:

1. Any trend not checked in **>14 days** — prevents stale entries.
2. Among 🚀 accelerating trends, the one not checked in the longest.
3. Round-robin through everything else.
4. If a trend has been **>30 days** without a check, the agent must force-mark it as plateauing or fading, with explanation.

If `TRENDS_WATCH.md` is empty (day 1), the agent skips the status-update section and writes only 3 new trends + a note: "First run — no prior trends to re-check yet."

## Telegram message format

Plain text, no `parse_mode` (avoid Markdown parse failures).

```
📈 YYYY-MM-DD — daily trend forecast

3 new + 1 update

Top trend: <trend 1 name>

Memo: https://github.com/animuradyanartist/daily-business-ideas/blob/main/trends/YYYY-MM-DD.md
```

On a "No GO today" run:
```
🔍 YYYY-MM-DD — no go today
Researched candidates, none had 2+ quality sources. Reasoning logged.

Memo: https://github.com/animuradyanartist/daily-business-ideas/blob/main/trends/YYYY-MM-DD.md
```

## Failure modes and recovery

- **Gemini 503 / high demand:** script retries 3× with exponential backoff, then falls back to Gemini 2.5 Flash. Both failing = workflow exits non-zero. (No "Run interrupted" file; instead the workflow's own failure surfaces in GitHub Actions UI. Future improvement: send a Telegram failure alert.)
- **Gemini returns malformed memo (missing sections):** script logs warning and writes whatever was returned plus a `<!-- parsing notes -->` block at the end. Prefers shipping imperfect output over silence.
- **Push fails (e.g., another commit pushed first):** script does `git pull --rebase` once and retries.
- **`TRENDS_WATCH.md` doesn't exist:** script creates it with the correct skeleton.
- **No prior trends in tracker (day 1):** memo skips the status-update section as documented above.

## Source quality definition

A "source" must be one of:
- A real article (news, blog, IH/Substack post)
- A real social-media post (Twitter/X, Reddit thread, TikTok with view count)
- A platform data page (Google Trends URL, ProductHunt page, IndieHackers product page)
- A funding announcement (Crunchbase, TechCrunch, official press release)
- An academic paper or research report

Not acceptable as the only source:
- Marketing copy from the company being analyzed (it's biased)
- Wikipedia for trend claims (lagging indicator; can be used for definitions only)
- AI-generated content without a primary source

## Cost

$0/month. Adds 1 Gemini Pro call/day to the existing project. Free tier covers ~25 Pro calls/day; current total usage will be 2/day (Scout + Trend Forecaster). 12× headroom.

## Integration with the broader system

- `LEARNINGS.md` is shared with Scout. Trend patterns surface there → influence Scout's idea generation passively from day 1.
- `TRENDS_WATCH.md` is read-only for Scout in Phase 1.
- Phase 2 (separate spec): update Scout's prompt to read `TRENDS_WATCH.md` and bias toward 🚀 accelerating trends when generating ideas.
- `ROADMAP.md` should be updated to reflect this agent: replace the "News editor" entry with "Trend Forecaster" (same slot but sharper mission).

## Out of scope for this spec

- Phase 2 wiring into Scout (separate spec when ready)
- Cross-platform posting (Instagram, Pinterest)
- Image / video generation
- Notifications via channels other than Telegram
- Multi-region scheduling
- Trend backtesting / accuracy scoring
