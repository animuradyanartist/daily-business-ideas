<!-- First live assessment run (Actions run 34819067116, gemini-2.5-pro). Kept as an audit record: reviewing it found a validator false positive (an experiment stop criterion removed for saying 'limited interest'), two missed overstatements ('clear search demand' at a 'some' reading) and unaudited removals. Fixed before the run whose results are in MODEL-CHECK.md. -->
# Model check — pilot-10-source-order

_Generated 2026-09-14T07:46:00.015Z by `node scripts/pilot.mjs check`. Automated checks; read the evidence file for the full assessments._

Planner: gemini gemini-2.5-flash → gemini-2.5-pro · runner: github-actions run 34817883522 (1/merge @ ddd9f75)

Keyword relevance is a lexical proxy only — the plans are listed in PREVIEW.md for human review.

Assessor: gemini-2.5-pro → gemini-2.5-flash · runner: github-actions run 34819067116

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
| Validation actually intervened where the model over-claimed (informational) | pass | 4 citation(s) rejected · 3 level/kind downgrade(s) · 4 claim(s) dropped · 4 sentence(s) removed |
| Missing keyword data is stored as unknown (null), never as 0 | pass | 76 keyword(s) without data |
| Forced model failure preserved evidence and allowed resumption | pass | failure step: newly assessed 0, evidence changed 0, error "assessment not written for some ideas (they will be retried): 2026-04-27, 2026-04-28, 2026-04-29: gemini-model-that-does"; resumed: 10/10 assessed |
