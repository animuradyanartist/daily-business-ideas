# Evidence

Search-demand and competitor evidence for Scout's shortlisted ideas, gathered from DataForSEO and the competitors' own websites. See "Evidence enrichment" in the root README for how it is produced and what it costs.

This folder is **separate from Scout's assessment**. `ideas/<date>.md` keeps its original memo and conviction score; nothing here changes them, and nothing here selects an idea for building.

## Files

- `<date>.md` — the enriched assessment for that day's shortlist, one section per idea.
- `<date>.json` — the same run as data: the keyword plan, every observation with provider, market and retrieval time, the code-computed readings, the constrained assessment, and each paid request with its ledger ID.
- `cache/` — provider answers reused while fresh, so the same fact is never bought twice. Committed on purpose.
- `ledger-outbox.json` — only exists if a budget update (settle / uncertain / release) could not be written; it is replayed before the next purchase.
- `pilots/<name>/` — enrichment pilots on existing ideas (`scripts/pilot.mjs`): selection, keyword plans, dry-run preview, evidence, model checks and a readable comparison (`REPORT.md`). Pilots never modify `ideas/`.

Idea IDs are `<date>:<slug>` and never change once written.

## Reading the evidence

- Evidence IDs: `K` = keyword measurement, `S1.3` = search result (query 1, position 3), `P` = fetched page. Every claimed level in the assessment cites them; a level with no valid citation is shown as `unknown`.
- **Observed** statements are directly shown by a cited item. **Inference** is labelled as such.
- Search volume is searches, not customers. CPC is what advertisers bid, not what customers pay. Google Ads competition is auction pressure, not SEO difficulty. Keyword volumes overlap and are never added up. "No data" means unknown, not zero demand. Low volume alone does not rule out a B2B or emerging idea.
- Status per idea: `enriched`, `partial`, `pending` (will retry), `unavailable` (configuration, balance or unsupported market), `dry-run` (no provider data).
