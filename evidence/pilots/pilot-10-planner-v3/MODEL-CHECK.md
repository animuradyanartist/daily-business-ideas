# Model check — pilot-10-planner-v3

_Generated 2026-09-14T11:29:20.380Z by `node scripts/pilot.mjs check`. Automated checks; read the evidence file for the full assessments._

Planner: gemini gemini-2.5-flash → gemini-2.5-pro · runner: github-actions run 34832567254 (1/merge @ 94f542c)

Planner drafts (before the one repair request): 0 of 10 missing a head term; repaired 0.

Keyword relevance is a lexical proxy only — the plans are listed in PREVIEW.md for human review.

| Check | Result | Detail |
|---|---|---|
| Original memos unchanged (sha256 at selection time) | pass | 10 memo(s) identical |
| Every selected idea has a plan | pass | 10/10; failures: {} |
| Planner named a country + language from the allowed list | pass | 2026-04-27: United States/en; 2026-04-28: United States/en; 2026-04-29: United States/en; 2026-04-30: United States/en; 2026-05-01: United States/en; 2026-05-02: United States/en; 2026-05-03: United States/en; 2026-05-04: United States/en; 2026-05-05: India/en; 2026-05-06: United States/en |
| Each plan has problem, solution and buying keywords | pass | 10/10 |
| Keywords use the memo's own vocabulary (≥60% of keywords share a content word with the memo) | pass | 2026-04-27 100% · 2026-04-28 100% · 2026-04-29 100% · 2026-04-30 100% · 2026-05-01 100% · 2026-05-02 100% · 2026-05-03 100% · 2026-05-04 100% · 2026-05-05 100% · 2026-05-06 100% |
| Plans include searchable head terms (≤3-word term in solution and buying groups; problem ≤6 words, others ≤5) | pass | 0 plan(s) missing a head term; 0 over-long keyword(s) |
| Every planned keyword was collected (measured or no data) | pass | 2026-04-27 enriched · 2026-04-28 enriched · 2026-04-29 enriched · 2026-04-30 enriched · 2026-05-01 enriched · 2026-05-02 enriched · 2026-05-03 enriched · 2026-05-04 enriched · 2026-05-05 enriched · 2026-05-06 enriched |
| Missing keyword data is stored as unknown (null), never as 0 | pass | 61 keyword(s) without data |
| No search result pages were bought (keywords-only pilot) | pass | 0 SERP request(s) |
| Every idea's keywords have relevance judgements (missing ones count as uncertain) | pass | 10/10 judged; 0 keyword(s) left without a judgement |
| Idea-level demand is set only by directly relevant keywords | pass | 10 idea(s) checked |
