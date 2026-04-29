# Interactive Telegram Bot — design spec

_2026-04-29_

Add an interactive layer to the existing Telegram bot. Currently the bot is send-only (the GitHub Actions workflows curl messages out). This spec adds a bidirectional layer: the user gets a persistent menu in Telegram with three actions — browse all ideas, browse all trends, see favorites — with a per-item favorite button.

## Goals

- 3-item persistent menu visible at the bottom of the Telegram chat: `📋 All ideas`, `📈 All trends`, `⭐ Favorites`.
- Tap any menu item → paginated inline-keyboard list of memos (10 per page).
- Tap any memo → preview + buttons (`⭐ Add/Remove favorite`, `📖 Read full on GitHub`, `◀️ Back to list`).
- Favorites stored per-user in Cloudflare KV.
- Single-user scoped (only the founder's chat_id is allowed).
- $0/month, no Mac dependency, runs entirely on Cloudflare's free tier.

## Non-goals

- Multi-user support. The bot is scoped to chat_id `1010175368`.
- Search across memos. Out of scope for v1.
- Editing or deleting memos from Telegram. Read-only.
- Mini Web App / Telegram WebApp. Plain inline keyboards only.
- Push notifications beyond the existing daily ones (already handled by GitHub Actions).
- Sharing memos to other Telegram users.

## Architecture

```
┌──────────────┐  webhook   ┌────────────────────┐   GitHub API/raw   ┌──────────────────┐
│ Telegram bot │ ─── tap ─▶ │ Cloudflare Worker  │ ───── read ──────▶ │ daily-business-  │
│ (existing)   │ ◀── reply ─│ (free tier)        │ ◀── ideas/trends ──│ ideas repo       │
└──────────────┘            │  ┌──────────────┐  │                    └──────────────────┘
                            │  │ Cloudflare   │  │  stores: favorites, list cache,
                            │  │ KV           │  │  pagination state
                            │  └──────────────┘  │
                            └────────────────────┘
```

**New components:**
- 1 Cloudflare account (free)
- 1 Worker (single TypeScript or JavaScript file)
- 1 KV namespace
- Telegram webhook configured to point at the Worker URL

**Reused:**
- Existing Telegram bot (token `8280669278:...`)
- Existing `daily-business-ideas` GitHub repo as the data source
- Existing chat_id (`1010175368`) — the only allowed user

## Menu structure

Three buttons in a `ReplyKeyboardMarkup`, persistent at the bottom of the chat:

| Button | Tap action |
|---|---|
| `📋 All ideas` | Show paginated list of every file in `ideas/` (newest first) |
| `📈 All trends` | Show paginated list of every file in `trends/` (newest first) |
| `⭐ Favorites` | Show paginated list of items the user has favorited |

The keyboard is set up via `setMyCommands` and `ReplyKeyboardMarkup` on `/start`.

## List view

Each list message renders as:

```
📋 All ideas (47 total)
Showing 1–10 of 47

[⭐ 2026-04-29 · UX Research Kit for Non-Native Designers · high]
[2026-04-28 · LinkedIn-Native Carousel Pack · high]
[2026-04-27 · Async English Swipe File · high]
... up to 10 buttons ...

[◀️ Prev] [Next ▶️]
[🏠 Menu]
```

Implementation:
- Each item button uses `callback_data` like `view:idea:2026-04-29` or `view:trend:2026-04-29`.
- A leading `⭐` is prepended to the label if the item is in the user's favorites.
- Pagination buttons use `callback_data` like `page:ideas:2` or `page:trends:1` or `page:favs:3`.
- "🏠 Menu" sends `callback_data` `menu`.
- The bot edits the existing message instead of sending a new one when paginating (cleaner chat).
- Pagination state (which list, which page) is encoded in the `callback_data` itself, not stored server-side. KV's `nav:<chat_id>:<message_id>` is unused — we keep it simple.

## Item view

After tapping a memo button, the bot edits the message to show:

```
💡 UX Research Kit for Non-Native Designers
2026-04-29 · high conviction

The idea: A swipe file of 50 plug-and-play research interview questions for non-native English speaking UX designers...

(short preview, ~500 chars from the memo)

[⭐ Add to favorites]   ← or [★ Remove from favorites] if already favorited
[📖 Read full memo on GitHub]
[◀️ Back to list]
```

- The first 500 chars of the memo are extracted as the preview.
- The conviction is parsed from the memo's second line (`_<DATE> · conviction: high_`).
- "Read full memo on GitHub" is a URL button that opens the GitHub blob URL.
- Favorite toggle uses `callback_data` `fav:idea:2026-04-29` (toggles state in KV).
- "Back to list" returns to the page the user came from. The page number is encoded in `callback_data` for the back button (e.g., `page:ideas:2`).

For trend memos, the title is the first `## Trend 1: ...` line, and the body preview is the first 500 chars of the same trend.

## Favorites

**Storage:** single KV key per user.
- Key: `favorites:1010175368`
- Value: JSON array of strings, each `<type>:<date>`. Example: `["idea:2026-04-29","trend:2026-04-29","idea:2026-04-27"]`.

**Operations:**
- Read: `GET favorites:1010175368` — one KV read per `⭐ Favorites` tap.
- Toggle: read array, add or remove the entry, write back. One KV read + one KV write per tap.

**Empty state:** `⭐ Favorites` with no favorites shows: "No favorites yet. Tap any item and add it with the ⭐ button." with `[🏠 Menu]`.

## Data sourcing from GitHub

| Action | Endpoint | Caching |
|---|---|---|
| List files in `ideas/` | `GET https://api.github.com/repos/animuradyanartist/daily-business-ideas/contents/ideas` | KV: `cache:ideas-list`, TTL 60 s |
| List files in `trends/` | `GET https://api.github.com/repos/animuradyanartist/daily-business-ideas/contents/trends` | KV: `cache:trends-list`, TTL 60 s |
| Read a memo file | `GET https://raw.githubusercontent.com/animuradyanartist/daily-business-ideas/main/<path>` | Cloudflare edge cache, TTL 60 s |

**Why this works:**
- `raw.githubusercontent.com` has no rate limit. Free unlimited reads.
- The contents-listing API has a 60 req/hour unauthenticated limit. With 60-second cache, we make at most ~60 req/hour even under heavy use → stays under the limit.
- Each list cache holds: array of `{ name, sha, size, download_url }` per file. Small JSON, ~5 KB per cache entry.

**For each memo file in the list cache, the bot extracts these display fields:**
- Date: parsed from filename `YYYY-MM-DD.md`
- Title: parsed from the first H1 line (or first `## Trend 1:` for trend files)
- Conviction (ideas only): parsed from the line `_<DATE> · conviction: high_`

These are computed lazily on first display and stored alongside the listing in KV cache.

## Telegram interaction details

### `/start` command
Sets the persistent `ReplyKeyboardMarkup` and replies:
> "Hi Ani. The menu's at the bottom — tap any of the three buttons to browse ideas, trends, or favorites."

### Persistent keyboard
```
{
  "keyboard": [
    [{"text": "📋 All ideas"}],
    [{"text": "📈 All trends"}],
    [{"text": "⭐ Favorites"}]
  ],
  "resize_keyboard": true,
  "is_persistent": true
}
```

### Text messages
If the user types `📋 All ideas`, `📈 All trends`, or `⭐ Favorites` (the keyboard sends these as text), the bot opens that list as page 1.

If the user types anything else, the bot replies: "Tap one of the buttons below."

### Inline button taps (callback queries)
Single switch on `callback_data` prefix:

| Prefix | Action |
|---|---|
| `view:<type>:<date>` | Show item view |
| `fav:<type>:<date>` | Toggle favorite, refresh button label |
| `page:<list>:<n>` | Show page `n` of list (`ideas`/`trends`/`favs`) |
| `menu` | Reply with menu help text |

After handling each callback, the bot calls `answerCallbackQuery` to dismiss the loading indicator.

## Failure modes

| Scenario | Behavior |
|---|---|
| GitHub list API rate-limited | Use cached value past TTL. Footer: "Showing cached data — refreshes in <X>s". |
| GitHub raw unreachable | Reply: "Can't reach the repo right now. Try again in a minute." |
| Memo file referenced by callback no longer exists | Reply: "This memo no longer exists. [🏠 Menu]" |
| KV read fails | Treat user as having no favorites; do not crash. |
| KV write fails on favorite toggle | Reply: "Couldn't save favorite. Try again." |
| User types unrecognized text | Reply: "Tap one of the buttons below." |
| Worker timeout (10s on free tier) | Cloudflare returns 5xx. Telegram retries the webhook automatically. All operations are idempotent, so retries are safe. |
| User blocks the bot | Outbound `sendMessage` returns 403; Worker silently no-ops. |

## Security

- **Webhook secret:** The webhook URL includes a secret query parameter `?secret=<random-token>`. Worker rejects any request without this exact secret. Generated once during setup, stored as Worker env var. Prevents random scanners hitting the URL.
- **Allowlist:** Worker compares incoming `chat.id` to a hardcoded allowlist (`[1010175368]`). Anyone else gets: "This is a private bot." Bot ignores their further messages.
- **No dynamic code execution:** All branching is on fixed `callback_data` prefixes. No `eval`, no shell, no untrusted input is interpolated into URLs or commands.
- **Bot token storage:** stored as a Cloudflare Worker secret (encrypted at rest, never in code).

## Cost analysis

| Resource | Free tier | Expected usage | Headroom |
|---|---|---|---|
| Cloudflare Workers requests | 100k/day | ~50/day | 2000× |
| Cloudflare KV reads | 100k/day | ~50/day | 2000× |
| Cloudflare KV writes | 1k/day | ~5/day | 200× |
| Cloudflare KV storage | 1 GB | <100 KB | 10000× |
| GitHub API (unauthenticated) | 60/hour | ~5/hour with caching | 12× |

Total cost: $0/month forever at this scale.

## Out of scope (for explicit clarity)

- Search / filter on the lists (could add later)
- Sharing memos via Telegram inline mode
- Adding or editing memos from Telegram
- Multi-user / multi-tenant support
- A web admin UI
- Notifications beyond the existing daily Telegram pings
- Synchronizing favorites with a different store (Notion, Obsidian, etc.)
- Mini Web App / Telegram WebApp
- Voice / audio interactions
- Localization (responses are English only)
