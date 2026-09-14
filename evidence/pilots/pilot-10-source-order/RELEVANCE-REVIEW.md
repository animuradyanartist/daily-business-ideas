# Relevance checks — verification of the final live run

_Reviewed 2026-09-14 by reading the stored judgements, the cited items and Scout's memos. Run: GitHub Actions [34838611190](https://github.com/animuradyanartist/daily-business-ideas/actions/runs/34838611190) (commit `adbc017`, gemini-2.5-pro), relevance judgements and assessments from the already-collected evidence; no DataForSEO request. The rule fixed after that run (weak trait words) was re-applied offline to its stored judgements and raw output; only 2026-04-29 changed. The results before any relevance check are kept in `run.json` → `ideas[].history[0]`; the intermediate live runs' own reports are `MODEL-CHECK-run-34835604116.md` and `MODEL-CHECK-run-34837061249.md`._

## The four ideas whose demand broad keywords inflated (planner-v3 data)

| Idea | Before relevance checks | After | What happened |
|---|---|---|---|
| `2026-04-27` | some — "professional english course" 110/mo | idea-level **unknown** (category low, broader some) | the course keyword is judged broader; no directly relevant keyword returned data |
| `2026-04-30` | substantial — "design template" 1,900/mo | idea-level **low** — "design presentation tips" 40/mo (broader: substantial) | "design template" and "best presentation tools" judged wider, shown separately |
| `2026-05-02` | substantial — "case study template" 1,600/mo | idea-level **low** — "how to write ux case study" 10/mo | "case study template" judged category (a person said broader): either way it is not idea demand |
| `2026-05-04` | substantial — "ai prompts" 12,100/mo | idea-level **unknown**, flagged "≤some?" | the judge wrongly called "how to write ai prompts" (320/mo) direct; the corroboration guard kept it out and flagged it |

## The language-barrier audience mismatch (`2026-04-29`)

Before: problem evidence **strong** from four quoted items. After: **weak**.
- S2.2 r/Journalism "Help! Interviewing someone with a language barrier" — a journalist and a participant: judged unclear/unrelated, not counted.
- S2.6 "UX research and language barriers" (researchers who don't speak their participants' language) and S2.9 "User Research Study: Breaking Language Barriers" — the judge claimed the exact customer (non-native English-speaking UX designer), but neither text mentions non-native speakers or English. Not counted, flagged for a person. S2.6 needed the second fix: it had passed only through the word "speak".
- S2.10 gov.uk "Tips for communicating across a language barrier" — broader audience, same problem area: category, so at most weak.

## Does requiring every customer trait wrongly exclude direct evidence?

- **Items.** Every collected result and page (all 10 ideas) was scanned for text mentioning both a language trait (non-native, ESL, second language, accent, language barrier…) and a role trait (design, UX, freelance, software, research…). Eight items do; none is a non-native designer or professional describing their own English-communication problem — most are about designing *for* non-native users, or academic writing. The rule excluded no such item. "Unknown"/"weak" problem evidence reflects the evidence collected, not the rule. Known limit: a synonym sharing no word with the trait (e.g. "ESL") is flagged "unverified", not counted — a person can confirm it.
- **Keywords.** In run 34837061249 the judge called the idea's own job "category" whenever the search did not name the audience; with a person's labels 6 of 10 v3 ideas would have read low instead of unknown. The prompt was fixed (audience is the searcher dimension). In the final run v3 idea-level demand is low for 7 ideas; where it is still unknown (04-27, 05-04) a person's labels give unknown too. For v2 plans, the two remaining differences stay within unknown/low (04-27: two keywords judged unclear and flagged; 05-05: "low" rests on "ux writing template", 10/mo, which a person would call category).
- **Risky direction.** The looser prompt produced 7 keywords judged direct that a person labelled category or broader. None lifts idea-level demand above "low": the two that would ("how to write ai prompts" 320/mo, "microcopy examples" 110/mo) are caught by the corroboration guard and flagged.

## What still needs a person

The flags listed in `MODEL-CHECK.md` (unclear keywords for 04-27 and 04-28, unverified items for 04-29, the uncorroborated "microcopy examples" for 05-05). Relevance judgements are automated and fallible; the rules make errors fail toward "unknown" or "not counted" and show them, they do not make the judge right.
