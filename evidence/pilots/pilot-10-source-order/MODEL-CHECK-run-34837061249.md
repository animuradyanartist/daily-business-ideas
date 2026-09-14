<!-- Live relevance run 34837061249 (commit 98dc421): relevance judgements + assessment from cached evidence, gemini-2.5-pro. This file is that run's own check output. Review: the four broad-keyword cases no longer set idea-level demand; the r/Journalism 'language barrier' item is no longer counted; but the judge claimed both customer traits for 2026-04-29 S2.9 ('User Research Study: Breaking Language Barriers') although the text mentions neither non-native nor English, which kept problem evidence at moderate. Fixed by requiring a claimed trait to appear in the item text (traitInText), re-applied OFFLINE to this run's stored judgements and raw output — see MODEL-CHECK.md. -->
# Model check — pilot-10-source-order

_Generated 2026-09-14T11:24:45.978Z by `node scripts/pilot.mjs check`. Automated checks; read the evidence file for the full assessments._

Planner: gemini gemini-2.5-flash → gemini-2.5-pro · runner: github-actions run 34817883522 (1/merge @ ddd9f75)

Keyword relevance is a lexical proxy only — the plans are listed in PREVIEW.md for human review.

Assessor: gemini-2.5-pro → gemini-2.5-flash · runner: github-actions run 34837061249

Relevance cases for a person (not counted as idea evidence):
- 2026-04-29: Items with unclear relevance (not counted): S2.2.

| Check | Result | Detail |
|---|---|---|
| Original memos unchanged (sha256 at selection time) | pass | 10 memo(s) identical |
| Every selected idea has a plan | pass | 10/10; failures: {} |
| Planner named a country + language from the allowed list | pass | 2026-04-27: United States/en; 2026-04-28: United States/en; 2026-04-29: United States/en; 2026-04-30: United States/en; 2026-05-01: India/en; 2026-05-02: United States/en; 2026-05-03: United States/en; 2026-05-04: United States/en; 2026-05-05: United States/en; 2026-05-06: United States/en |
| Each plan has problem, solution and buying keywords | pass | 10/10 |
| Keywords use the memo's own vocabulary (≥60% of keywords share a content word with the memo) | pass | 2026-04-27 100% · 2026-04-28 100% · 2026-04-29 100% · 2026-04-30 100% · 2026-05-01 100% · 2026-05-02 100% · 2026-05-03 100% · 2026-05-04 100% · 2026-05-05 100% · 2026-05-06 100% |
| Plans include searchable head terms (≤3-word term in solution and buying groups; problem ≤6 words, others ≤5) | **FAIL** | 8 plan(s) missing a head term (2026-04-27, 2026-04-29, 2026-04-30, 2026-05-01, 2026-05-02, 2026-05-03, 2026-05-04, 2026-05-06); 0 over-long keyword(s) · first live plans (plans-v1.json, same rule): 10 missing a head term, 7 over-long |
| Every idea with evidence has an assessment | pass | 10/10 |
| Stored citations all carry a verbatim quote found in the cited item; non-unknown levels have grounded citations | pass | 0 ungrounded |
| No stored text states search demand the evidence did not measure | pass | 0 violation(s) |
| Volume figures quoted for measured keywords match the measurement | pass | 0 figure(s) checked, 0 mismatch(es) |
| Dollar figures in factual assessment fields match measured CPCs, fetched prices or Scout's memo (proposed experiments excluded) | pass | 0 figure(s) checked |
| Validation actually intervened where the model over-claimed (informational) | pass | 1 citation(s) rejected · 13 level/kind downgrade(s) · 9 claim(s) dropped · 0 sentence(s) removed |
| Missing keyword data is stored as unknown (null), never as 0 | pass | 76 keyword(s) without data |
| Every idea's keywords, search results and pages have current relevance judgements (missing ones count as uncertain) | pass | 10/10 judged; 0 item(s) left without a judgement |
| No stored reading or citation relies on evidence judged unrelated, broader or unjudged; alternatives are typed from the evidence | pass | 10 idea(s) checked |
| Relevance checks intervened / ambiguous cases flagged for a person (informational) | pass | 1 quoted citation(s) removed as not about the customer and problem · 0 "same customer" judgement(s) narrowed to broader (not every defining trait matched) · 1 flag(s) |
| Earlier results preserved (run.json keeps the version before relevance checks) | pass | 10/10 idea(s) keep: Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline) |
| Forced model failure preserved evidence and allowed resumption | pass | failure step: newly assessed 0, newly judged 0, evidence changed 0, error "assessment not written for some ideas (they will be retried): 2026-04-27, 2026-04-28, 2026-04-29: relevance — gemini-mod"; resumed: 10/10 assessed |

_The human review in review.json covers assessment run 34822795160, kept in run.json history; this run (34837061249) has not been reviewed that way._
