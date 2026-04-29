# Bot — Interactive Telegram interface

A Cloudflare Worker that gives the founder a 3-button persistent menu in Telegram for browsing all ideas, trends, and favorites stored in this repo.

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
   - `echo "<bot-token>" | wrangler secret put BOT_TOKEN`
   - `echo "<random-secret>" | wrangler secret put WEBHOOK_SECRET`
7. Deploy: `npm run deploy`.
8. Set the Telegram webhook:
   ```
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
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
- `src/github.mjs` — GitHub list (cached) + raw fetch
- `src/parse.mjs` — Pure parsers (title, conviction, preview)
- `test/parse.test.mjs` — Unit tests for parse.mjs
- `wrangler.toml` — Worker config + KV binding

## Cost

$0/month on Cloudflare's free tier at this scale (~50 requests/day, ~5 KV writes/day).
