# Scout budget separation (2026-09-15)

## Decision

Daily Business Ideas (Scout) is a separate product from the artist-promotion projects (Career OS / "SEO" Supabase, ArtistPortfolio). On 2026-09-14 Scout was wired to a shared DataForSEO budget that lived in Career OS's Supabase database. The owner ruled that coupling wrong on 2026-09-15. Scout now keeps its DataForSEO integration but does its budget accounting and persistence in its own repository.

Paid enrichment stays **disabled**: `SCOUT_DFS_MODE` is unset (dry-run) and Scout has **no monthly allowance** until the owner sets `SCOUT_DFS_MONTHLY_USD_CAP`. Scout was not given the old $2 shared cap as its own.

## Scout's dependencies after the change

| Needed for | Dependency | Owned by Scout? |
|---|---|---|
| Research memo | GitHub Actions, Gemini (`GEMINI_API_KEY`), Telegram notify | yes |
| Evidence data | DataForSEO API (`DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD`) | account is **shared** with other products |
| Spend accounting | the `scout-spend-ledger` branch of this repo, pushed before every paid request (`scripts/lib/spend-ledger.mjs`) | yes |
| Cache, outbox | `evidence/cache/`, `evidence/ledger-outbox.json` in this repo | yes |
| Ledger writes | `git push` to that branch with the workflow's `contents: write` token | yes |

No Supabase URL, anon key, service key or budget token is used anywhere in Scout.

## What Scout enforces, and what it cannot

Enforced for **Scout's own requests**:

- **Monthly allowance** — `SCOUT_DFS_MONTHLY_USD_CAP`. No default; unset = nothing bought. Charged + reserved + uncertain (at estimate) must fit.
- **Per request** — `SCOUT_DFS_MAX_REQUEST_USD`, default $0.10 (estimate = published price × 1.1).
- **Per run** — `SCOUT_DFS_MAX_RUN_USD`, default $0.10.
- **Durable before spending** — a reservation is pushed to GitHub (the ledger branch) and accepted before the paid request is sent; a runner that dies afterwards cannot lose it, and it counts as uncertain once expired.
- **No double-spending across runs** — every ledger change is a fast-forward push built on the tip just read; a run that loses the race re-reads, re-checks the allowance with the other run's reservation, then retries. Plus deterministic hold IDs, the 30/14-day cache, bounded attempts, uncertain requests never re-sent automatically, and a lock file per machine.

**Not** enforceable by Scout:

- **Account-wide spend.** Career OS, ArtistPortfolio, the DataForSEO dashboard or any script using the same login spend outside Scout's ledger and are invisible to it. The allowance limits Scout, not the account. The only hard account-wide limit is the prepaid DataForSEO balance.
- **A shared $2 across products.** No longer claimed. If every product together must stay under $2/month, that needs either one shared service (the design being retired here) or separate DataForSEO accounts/logins with separate balances.
- **Someone rewriting the ledger branch.** A force-push or deletion of `scout-spend-ledger` by a person with write access would erase history (a deleted branch fails closed; a rewritten one does not). GitHub's branch rules can forbid that; none are set today.

## History preserved

Scout's 35 charges recorded in the shared ledger (Career OS `runtime_events`, `type = dataforseo.spend`, `produced_by = scout`, all 2026-09-14, total **$0.23224**) were exported read-only on 2026-09-15 onto the `scout-spend-ledger` branch as `holds/2026-09/<original id>.json` (status `charged`, `imported` block with provenance). They include the +$0.00004 rounding correction. The same 34 purchases also appear in the pilot evidence files under `evidence/pilots/`. Nothing was deleted from the shared database.

Removed from Scout (kept in git history): `scripts/lib/budget.mjs` (Supabase RPC + legacy ledger client), `scripts/lib/ledger.mjs`, `scripts/test/budget-sql.test.mjs`, and `db/dataforseo_budget.sql` — byte-identical to Career OS `supabase/migrations/0024_dataforseo_budget.sql` (sha256 `8bf97bd0…70e6`), which remains the source of those database objects.

## Changes made to the artist projects during the Scout rollout (record)

Verified 2026-09-14/15 unless marked.

**Career OS — `animuradyanartist/art-seo-auditor`**
- PR #102 merged as `e1e6ae1` ("shared atomic DataForSEO budget — migration 0024 + reservations on every spend path"). Deployed: Netlify production `e1e6ae1` ready 2026-09-14 12:44 UTC; Render `career-os-worker` deployment success 2026-09-14 12:43 UTC.
- Its DataForSEO purchase paths now require `DATAFORSEO_BUDGET_TOKEN` plus the budget functions. Netlify/Render had no DataForSEO credentials when checked on 2026-09-14, so no deployed path buys.
- Local `~/Desktop/art-seo-auditor/.env.local`: `DATAFORSEO_BUDGET_TOKEN` line appended 2026-09-15, file permissions tightened to 600.

**ArtistPortfolio — `animuradyanartist/ArtistPortfolio`**
- PR #102 merged as `fba0d5c` ("reserve every DataForSEO cache miss in the shared budget"). **Not deployed**: animuradyan.com `/api/health` reported `builtAt 2026-09-11T10:38:29Z` on 2026-09-15. The undeployed diff is 3 files in `server/seo/`. Replit secrets were not changed.

**"SEO" Supabase project `nuggycbluhxzlsmflvkp` (Career OS database)**
- Migration 0024 applied 2026-09-14. It added tables `dataforseo_budget_settings`, `dataforseo_budget_clients`, `dataforseo_budget_holds` and functions `dataforseo_budget_{status,reserve,settle,mark_uncertain,release,admin_resolve}`, `dataforseo_budget__client`, `dataforseo_budget__committed`.
- Rows: one settings row (cap $2.00, project `789578db-…`); three client rows `scout`, `career-os`, `artist-portfolio` (SHA-256 only, `max_request_usd` 0.10, enabled); no holds.
- 20 `runtime_events` rows `produced_by = 'reconciliation'` (Aug $0.03816, Sep $0.35312), dated from DataForSEO's task list, attributed by **inference** to artist-portfolio. The 2026-09-08 `ai_keyword_data` caller is still unidentified.
- 2026-09-15: the owner terminated one PostgREST connection stuck "idle in transaction" since 2026-09-13 (pid 727742) and sent a schema reload. No data changed. The API's schema cache is **still stale** (the budget functions and tables return PGRST202/PGRST205), so the shared budget is not usable over the API.
- Local file `~/.config/dataforseo-budget/tokens.env` (mode 600) holds the three client tokens.

**Scout GitHub settings**
- Set on 2026-09-14/15, removed on 2026-09-15: secrets `DATAFORSEO_BUDGET_ANON_KEY`, `DATAFORSEO_BUDGET_TOKEN`; variable `DATAFORSEO_BUDGET_URL`.
- Kept: secrets `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` (the shared account's API login); variable `SCOUT_DFS_MAX_RUN_USD=0.10`.
- Variable `DATAFORSEO_MONTHLY_USD_CAP=2` is no longer read by Scout; delete it after this change is on `main`.

## Narrow cleanup plan (owner decisions; nothing here is done automatically)

Scout needs none of these to work. Order is least to most consequential.

1. **Scout repo:** delete the unused variable `DATAFORSEO_MONTHLY_USD_CAP` (`gh variable delete DATAFORSEO_MONTHLY_USD_CAP`).
2. **Disable Scout's token in the shared budget** (reversible, touches one row, keeps all history):
   `update dataforseo_budget_clients set enabled = false where client_id = 'scout';`
   Then delete the `SCOUT_DATAFORSEO_BUDGET_TOKEN` line from `~/.config/dataforseo-budget/tokens.env`.
3. **Keep** Scout's 35 `runtime_events` rows and the reconciliation rows. They are the artist ledger's record of what the shared DataForSEO account was charged. Deleting them would make the account's history disagree with the provider balance. If the artist projects' $2 cap should not count Scout's $0.23224, change the cap or the counting rule in Career OS, not the history.
4. **Do not revert** Career OS #102 or ArtistPortfolio #102 and **do not drop** the 0024 objects. Merged Career OS code depends on them. Whether the two artist apps keep a shared budget between themselves is an artist-project decision. If they keep it, the PostgREST cache still needs a project restart at a convenient time. If they drop it, write a Career OS migration and code change for that, reviewed on its own.
5. **If a hard account-wide separation is wanted:** give Scout its own DataForSEO login and balance, replace Scout's two DataForSEO secrets, and leave the artist projects on the current account.
