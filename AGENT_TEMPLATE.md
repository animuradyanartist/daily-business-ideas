# Agent template — how to add a new agent to this system

This repo runs a multi-agent system. Each agent is a GitHub Actions cron job + a Node.js script that calls Gemini 2.5 Pro and commits its output here. To add a new role (Surgeon, Teacher, News editor, anything else), use the template below.

## Architecture (don't reinvent it)

- GitHub Actions cron — free, runs in cloud, doesn't need your computer on
- Gemini 2.5 Pro with Google Search grounding — free tier, ~25 requests/day per model
- Fallback to Gemini 2.5 Flash on 503 / 429 errors
- Inline Telegram notification at the end of each workflow (not via chained workflow — GitHub's default token doesn't fire chained workflows)

Repo secrets already configured: `GEMINI_API_KEY`, `TG_BOT_TOKEN`, `TG_CHAT_ID`.

The Scout agent is the reference implementation:
- `.github/workflows/daily-research.yml`
- `scripts/daily-research.mjs`

## Prompt to paste into a new Claude session

When you want to add a new agent, paste the block below into Claude with the placeholders filled in. Claude will read the existing Scout files, clone the pattern, and ship the new agent.

```
I have a daily research agent already running on GitHub Actions + Gemini 2.5 Pro. It commits to https://github.com/animuradyanartist/daily-business-ideas and sends Telegram messages.

I want to add a NEW agent of the same architecture. Here's the agent I want:

ROLE: [Surgeon / Teacher / News editor / something else]
MISSION: [one sentence — what it does each run]
SCHEDULE: [e.g., "daily 12:00 Asia/Yerevan = 08:00 UTC" or "every Saturday 10:00 Yerevan = 06:00 UTC"]
OUTPUT FOLDER: [e.g., teardowns/ or lessons/ or news/]
TELEGRAM EMOJI: [🔬 or 📚 or 📰]

The architecture I want you to clone (don't reinvent it):

1. The existing repo `animuradyanartist/daily-business-ideas` already has:
   - GEMINI_API_KEY, TG_BOT_TOKEN, TG_CHAT_ID as repo secrets
   - A working Scout agent at .github/workflows/daily-research.yml + scripts/daily-research.mjs
   - Telegram bot: token 8280669278:AAGw0FpOuS0wUDo5ORerazuOY1ZLsBK2xSU, chat ID 1010175368

2. For the new agent, do exactly this:
   a. Read scripts/daily-research.mjs and .github/workflows/daily-research.yml from the repo to understand the pattern.
   b. Create a NEW script at scripts/<role>.mjs that follows the SAME structure but with a different prompt for Gemini and writes to the specified output folder.
   c. Create a NEW workflow at .github/workflows/<role>.yml with a different cron and different Telegram emoji prefix.
   d. The new agent must:
      - Read accumulated knowledge files in the same order as Scout (ROADMAP.md, LEARNINGS.md, KILLED.md, MARKET_MAP.md, plus any role-specific docs)
      - Call Gemini 2.5 Pro with Google Search, fallback to Flash on 503/429 (use the same retry helper as Scout)
      - Write its output to the role's folder + update the relevant living docs (e.g., Surgeon updates PATTERNS.md, Teacher updates MASTERY.md)
      - Commit + push from inside the workflow
      - Send a Telegram message inline (not via chained workflow)
   e. Test by manually triggering the new workflow via `gh workflow run <role>.yml --repo animuradyanartist/daily-business-ideas`. Wait for completion. Verify the commit landed and Telegram delivered.

3. The founder profile to bake into the prompt (same as Scout):
   - Solo creator, product/UX designer, Canva/Figma fluent
   - English-learning content experience
   - ~10 hrs/week to build
   - 4-week build-then-validate sprints
   - Validated $29 / $39 Gumroad price points
   - Distribution: Reddit, Facebook groups, TikTok, IG Reels, DM outreach

4. Tone: strong businessman, numbers first, no hype words, no emojis in committed files, sentence-case headers, concrete > abstract, no claim without a source.

5. Schedule the cron between 03:00–14:00 UTC (07:00–18:00 Asia/Yerevan) to keep all agents in the same window.

Build it now. Report back the new workflow URL and the test run result.
```

## The three agents the ROADMAP already plans

Pick one and fill in the placeholders above.

### Surgeon (recommended next)
- **ROLE:** Surgeon
- **MISSION:** Deconstruct ONE successful digital product per day across 8 dimensions (positioning, buyer profile, pricing, hook copy, page structure, distribution, retention, public revenue) and update PATTERNS.md
- **SCHEDULE:** daily 12:00 Asia/Yerevan = 08:00 UTC (cron `0 8 * * *`)
- **OUTPUT FOLDER:** `teardowns/`
- **TELEGRAM EMOJI:** 🔬

### Teacher
- **ROLE:** Teacher
- **MISSION:** Weekly deep-dive on ONE core business skill (52-skill curriculum: positioning, copy, pricing, funnels, SEO, paid ads, retention, etc.) — 1500-word lesson with frameworks, real examples (cited), and a 1-week practice exercise. Update MASTERY.md scorecard.
- **SCHEDULE:** every Saturday 10:00 Asia/Yerevan = 06:00 UTC (cron `0 6 * * 6`)
- **OUTPUT FOLDER:** `lessons/`
- **TELEGRAM EMOJI:** 📚

### News editor
- **ROLE:** News editor
- **MISSION:** Daily morning briefing — scan ProductHunt, IndieHackers, Hacker News, relevant subreddits, recent funding announcements. Filter to 3–5 items relevant to a solo digital-product founder. Tight, scannable.
- **SCHEDULE:** daily 07:30 Asia/Yerevan = 03:30 UTC (cron `30 3 * * *`)
- **OUTPUT FOLDER:** `news/`
- **TELEGRAM EMOJI:** 📰

## Cost reality check

Each new agent = one extra Gemini call per run. Free tier covers 25 Pro calls/day per project, plus Flash as backup. With Scout + Surgeon + News + Teacher all live, that's ~3 Pro calls/day on weekdays + 1 Saturday = well within free tier.

If you ever exceed the limits: each call costs roughly $0.02 on Gemini 2.5 Pro paid tier. Even at full system rollout that's ~$2/month. Effectively still free.

## Failure modes to know about

- **Gemini high demand:** Pro returns 503 sometimes. Script retries 3× with exponential backoff, then falls back to Flash. Both failing = Telegram alert + run fails.
- **Push fails:** workflow exits with the error. No silent failures.
- **Out of free tier on Pro:** Flash kicks in automatically. You'll see slightly shorter / less polished memos but the system stays alive.

## How to manually trigger any agent

```bash
gh workflow run <workflow-name>.yml --repo animuradyanartist/daily-business-ideas
# e.g., gh workflow run daily-research.yml
```

Or in the browser: https://github.com/animuradyanartist/daily-business-ideas/actions → click the workflow → "Run workflow" button.

Don't trigger the same agent twice in one day — you'll get duplicate output for that date.
