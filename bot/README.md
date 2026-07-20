# Bot — Interactive Telegram interface

A Cloudflare Worker that gives the founder a 3-button persistent menu in Telegram for browsing all ideas, trends, and favorites stored in this repo. From any idea you can also tap **📊 Log outcome** and reply with what actually happened — the bot writes it to `outcomes/<date>.md`, which the research agent reads as its highest-weight prior.

## Architecture

See `../specs/telegram-bot.md` for the full design.

```
Telegram → Cloudflare Worker → GitHub raw / API
                ↓
           Cloudflare KV (favorites, list cache)
```

## One-time setup

1. Create a Cloudflare account at https://dash.cloudflare.com (free).
2. Install wrangler: `npm install -g wrangler`.
3. Authenticate: `wrangler login`.
4. From this folder: `npm install`.
5. Create the KV namespace: `wrangler kv namespace create BOT_KV` and put the printed id in `wrangler.toml`.
6. Set secrets:
   - `echo "$TG_BOT_TOKEN" | wrangler secret put TG_BOT_TOKEN` — read it from your
     local `.env` (copy `.env.example` and fill it in) rather than pasting the
     literal token into a shell, where it lands in your history. `BOT_TOKEN` is
     still accepted as a legacy fallback, but `TG_BOT_TOKEN` is preferred.
   - `echo "<random-secret>" | wrangler secret put WEBHOOK_SECRET`
   - `echo "<github-pat>" | wrangler secret put GITHUB_TOKEN` — a **fine-grained personal access token** scoped to just this repo with **Contents: Read and write**. Powers the "📊 Log outcome" button (writes `outcomes/<date>.md`). Without it, browsing still works but logging an outcome will fail gracefully.
7. Deploy: `npm run deploy`.
8. Set the Telegram webhook:
   ```
   curl -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/setWebhook" \
     -d "url=<WORKER_URL>/?secret=<WEBHOOK_SECRET>"
   ```

## Day-to-day

- Edit code in `src/`. Run `npm run deploy` to push changes.
- View live logs: `wrangler tail`.
- Run unit tests: `npm test` (covers `parse.mjs`).

## Files

- `src/index.mjs` — Worker entry, webhook routing, allowlist check
- `src/handlers.mjs` — All command + callback logic
- `src/telegram.mjs` — Telegram Bot API wrappers
- `src/github.mjs` — GitHub list (cached) + raw fetch + outcome write (contents API)
- `src/parse.mjs` — Pure parsers (title, conviction, preview)
- `test/parse.test.mjs` — Unit tests for parse.mjs
- `wrangler.toml` — Worker config + KV binding

## Cost

$0/month on Cloudflare's free tier at this scale (~50 requests/day, ~5 KV writes/day).
