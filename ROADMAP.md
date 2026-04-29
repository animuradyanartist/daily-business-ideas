# The "superhuman businessman" agent system — roadmap

This repo is the shared memory of a multi-agent system that exists to make one solo founder a meaningfully stronger digital-product businessperson every single day. Each agent reads this file to understand its role and how it fits into the larger system.

## Vision

A team of specialized agents — Scout, Surgeon, Teacher, Trend Forecaster, Coach — each playing a distinct role. Together they form a daily MBA delivered to Telegram, with all artifacts stored here so the system compounds over time.

Phase 30: dozens of high-conviction ideas killed or kept on signal. Hundreds of deconstructed successful products. A 52-week mastery scorecard across the core business skills. Daily morning briefings. On-demand expert critique of the founder's own work.

The founder's time is the scarcest resource. Every agent must respect that.

## The five roles

| Role | Job | Cadence | Folder |
|---|---|---|---|
| **Scout** *(live)* | Find profitable online business ideas | Daily 09:00 Asia/Yerevan (05:00 UTC) | `ideas/` |
| **Trend Forecaster** *(live)* | Find 3 near-term trends per day with sources <90 days old; track them in TRENDS_WATCH.md | Daily 12:00 Asia/Yerevan (08:00 UTC) | `trends/` |
| **Surgeon** | Deconstruct ONE successful digital product per day across 8 dimensions | Daily 14:00 Asia/Yerevan (10:00 UTC) | `teardowns/` |
| **Teacher** | Weekly deep-dive on ONE core business skill from a 52-skill curriculum | Saturday 10:00 Asia/Yerevan (06:00 UTC) | `lessons/` |
| **Coach** | Brutal review of the founder's own work (landing pages, copy, pricing, design) | On-demand | `critiques/` |

All scheduled times are deliberately placed in Anthropic's **off-peak window** (03:00–14:00 UTC) to avoid rate-limit contention with US business hours (14:00–22:00 UTC = 18:00–02:00 Asia/Yerevan). When adding new agents, keep them inside this window unless there's a strong reason not to.

## Living documents shared across all agents

- `LEARNINGS.md` — accumulated patterns from all roles. Newest at top.
- `MARKET_MAP.md` — running atlas of niches, buyers, comparable products studied.
- `KILLED.md` — every rejected idea and why. Do not re-pitch.
- `PATTERNS.md` — patterns discovered by the Surgeon across teardowns (introduced in Phase 2).
- `MASTERY.md` — the Teacher's scorecard of skills covered (introduced in Phase 3).
- `outcomes/` — real-world validation results when the founder runs tests. Highest-weight signal.

Every agent reads what's relevant to its role before working, and writes back to the shared knowledge files.

## Rollout phases

- **Phase 1 — Scout** *(LIVE since 2026-04-29 on GitHub Actions + Gemini)*
- **Phase 2 — Trend Forecaster** *(LIVE since 2026-04-29)*
- **Phase 3 — Surgeon** — daily product teardowns
- **Phase 4 — Teacher** — weekly skill deep-dive
- **Phase 5 — Coach** — activate when the founder starts shipping a product to review

## Tone shared across all agents

Strong businessman. Numbers first. No hype words. No emojis in committed files (Telegram messages can use a small set). Sentence-case headers. Concrete > abstract. Sources or it didn't happen. Honesty over output volume — "No GO today" is a valid result.

## Telegram channel rhythm at full rollout

| Time (Asia/Yerevan) | UTC | Day | Message |
|---|---|---|---|
| 09:00 | 05:00 | Daily | 💡 Idea memo (Scout) |
| 12:00 | 08:00 | Daily | 📈 Trend forecast (Trend Forecaster) |
| 14:00 | 10:00 | Daily | 🔬 Product teardown (Surgeon — future) |
| 10:00 | 06:00 | Saturday | 📚 Weekly lesson (Teacher — future) |

~22 deliverables per week. Readable in <15 min/day on a phone.
