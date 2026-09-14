# Model check — pilot-10-source-order

_Generated 2026-09-14T10:15:46.517Z by `node scripts/pilot.mjs check`. Automated checks; read the evidence file for the full assessments._

Planner: gemini gemini-2.5-flash → gemini-2.5-pro · runner: github-actions run 34817883522 (1/merge @ ddd9f75)

Keyword relevance is a lexical proxy only — the plans are listed in PREVIEW.md for human review.

Assessor: gemini-2.5-pro → gemini-2.5-flash · runner: github-actions run 34822795160

Validators re-applied offline to the stored raw model output of that run at 2026-09-14T10:13:24.729Z (no new model call).

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
| Volume figures quoted for measured keywords match the measurement | pass | 2 figure(s) checked, 0 mismatch(es) |
| Dollar figures in factual assessment fields match measured CPCs, fetched prices or Scout's memo (proposed experiments excluded) | pass | 0 figure(s) checked |
| Validation actually intervened where the model over-claimed (informational) | pass | 0 citation(s) rejected · 10 level/kind downgrade(s) · 6 claim(s) dropped · 0 sentence(s) removed |
| Missing keyword data is stored as unknown (null), never as 0 | pass | 76 keyword(s) without data |
| Forced model failure preserved evidence and allowed resumption | pass | failure step: newly assessed 0, evidence changed 0, error "assessment not written for some ideas (they will be retried): 2026-04-27, 2026-04-28, 2026-04-29: gemini-model-that-does"; resumed: 10/10 assessed |

## Human review of live assessment run 34822795160

_Reviewed 2026-09-14. Every rejected, downgraded, dropped and removed item of the live run was compared with the cited evidence items and with Scout's memo; every surviving change statement, level and gap was then read for over-claims the validators do not catch. The live run used the validators at `d8745ee`; the fixes below were re-applied offline to that run's stored raw model output (no new model call)._

**Validator false positives in the live run (fixed):** 3
- `2026-04-28` removed sentence: "While the keyword \"linkedin content for non native\" has no search volume data, search results confirm …" → "no search volume data" now counts as describing the measurement ("has no search volume" is still a zero claim and still removed)
- `2026-04-29` removed sentence: "The keyword \"user interview language barrier\" has no search volume data." → same as above
- `2026-04-28` strength "Specialized tools exist that not only provide templates but also use AI …" downgraded observed → inference → "not only … but also" is no longer read as an absence claim

**Over-claims the live run's validators missed (rules added):** 2 pattern(s)
- a change marked "supports" for a validated / proven / profitable market, resting only on offerings existing (mostly free) (`2026-04-29`, `2026-05-01`, `2026-05-02`, `2026-05-04`, `2026-05-06`) → supporting a payment or validated-market claim now needs at least one cited published price; otherwise the effect becomes untested
- a change marked "supports" where Scout's claim is that something is absent ("lacks linguistic support", "but not the persuasive words", "does not communicate logic") (`2026-04-30`, `2026-05-02`, `2026-05-03`) → such a claim cannot be supported by quoted items; the effect becomes untested. A first, broader version of this rule also caught "the design is not clear" (a problem description) — narrowed before committing, and pinned by a test

**Every intervention after the fixes, checked against the evidence:** 16 correct

| Idea | Intervention | Verdict | Why |
|---|---|---|---|
| `2026-04-27` | alternative "Free Content Blogs" dropped | correct | a category, not a named alternative; the quotes (S1.3, S1.4, S1.6) name Simon & Simon / Berlitz / Preply articles, not the name given |
| `2026-04-27` | change "Real pain in their words" dropped | correct | a label in the memo, not a claim |
| `2026-04-29` | change "The market for productized UX templates is validated." supports → untested | correct | cites a 50/mo keyword and free NN/g / Notion template listings; no price |
| `2026-04-30` | change "lacks linguistic support" supports → untested | correct | rests on one page description (P1) not mentioning scripts |
| `2026-05-01` | change "The \"Productized Template\" Market is Validated" supports → untested | correct | cites template listicles and a Notion bundle; no price |
| `2026-05-01` | change "non-native English-speaking freelance designers struggle with confidence" dropped | correct | the memo says "… to manage the entire client lifecycle with confidence"; "struggle" was inserted |
| `2026-05-01` | change "lacks the crucial linguistic scaffolding" dropped | correct | the memo says "adds the crucial linguistic scaffolding" — the misquote inverts the meaning |
| `2026-05-02` | change "The \"Artifact\" Market is Validated" supports → untested | correct | cites free Figma / Adobe / Canva templates; no price |
| `2026-05-02` | change "they provide the visual container but not the persuasive words" supports → untested | correct | rests on descriptions not mentioning scripts |
| `2026-05-02` | change "designers struggle to write compelling, clear, and persuasive narratives" dropped | correct | not in the memo |
| `2026-05-03` | competition crowded → some | correct | the cited items cover two vendor domains (uxpin.com, brandyhq.com); the collected results show five, but the level must rest on what is cited |
| `2026-05-03` | change "Figma's Dev Mode... does not communicate logic, intent, or behavior." supports → untested | correct | S2.6 says handoff needs behaviour documented; it says nothing about Dev Mode |
| `2026-05-04` | change "The \"Prompt Pack\" Market is Proven and Profitable." supports → untested | correct | cites free prompt sites; the model itself wrote "Profitability is not directly evidenced" |
| `2026-05-05` | change "The market for design \"process\" kits is validated." supports → untested | correct | cites keyword rows only |
| `2026-05-06` | change "The \"Productized Process\" Market is Proven." supports → untested | correct | cites free Miro / Figma / Notion templates; no price |
| `2026-05-06` | change "Non-native English-speaking designers struggle to confidently participate …" dropped | correct | the memo says "… to confidently participate in and lead design critiques"; "struggle" was inserted |

**Not caught by any validator (read these assessments as noted):**
- `2026-04-29`: Problem evidence "strong" is grounded but likely off-topic: the cited items ("Interviewing someone with a language barrier", "Tips for communicating across a language barrier") are about researchers interviewing participants who speak another language, not about non-native researchers moderating in English. The change statement repeats this ("strongly validating its existence").
- `2026-05-03`: Problem evidence "strong" is general design-handoff pain; nothing cited is about the idea's non-native-speaker angle.
- `2026-04-27`: Change "a swipe file is a learning artifact you keep" → supports: the finding (competitors are free blog posts or subscriptions) does not bear on that claim; the "gap for a one-time purchase" is inference. Problem evidence also cites an academic-publishing item (S2.2) that is not about async workplace communication.
- `2026-05-06`: Change about the wedge → supports rests on no search result showing a linguistic scaffold (absence in the finding); read it as inference.
- All ideas: Gaps are correctly labelled inference, but most say competitors "do not appear to" offer the non-native angle — a statement about what was not seen in 2 queries, not market research.

