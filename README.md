# Scout spend ledger

Scout's own DataForSEO spend ledger — written only by `scripts/lib/spend-ledger.mjs` on `main`.
One file per paid request: `holds/<YYYY-MM>/<id>.json`, status `reserved` → `charged` / `released` / `uncertain`.
Each reservation is pushed here BEFORE the paid request is sent; every change is a fast-forward push.

Do not force-push, rewrite or delete this branch: it is the only record of what Scout has spent.
Read it with `node scripts/budget.mjs status`; resolve an uncertain request with `node scripts/budget.mjs resolve`.
It covers Scout only — other users of the same DataForSEO account are not recorded here.

`holds/2026-09/` starts with Scout's 35 charges ($0.23224, 2026-09-14) exported read-only from the shared
ledger it used before 2026-09-15, with their original IDs (see `specs/scout-budget-separation.md` on `main`).
