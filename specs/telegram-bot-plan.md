# Interactive Telegram Bot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Cloudflare Worker that responds to Telegram bot interactions, providing a 3-button persistent menu (📋 All ideas / 📈 All trends / ⭐ Favorites) with paginated browsing, item preview, and KV-backed favorites.

**Architecture:** Single Cloudflare Worker (free tier) listens for Telegram webhook events. Reads memo data live from the existing `daily-business-ideas` GitHub repo (`raw.githubusercontent.com` for content, GitHub API for listings with 60s KV cache). Stores per-user favorites in Cloudflare KV. Single-user scoped via chat-ID allowlist + webhook secret.

**Tech Stack:** Cloudflare Workers, Cloudflare KV, plain JavaScript (`.mjs`), `wrangler` CLI.

---

## File structure

| Path | Action | Purpose |
|---|---|---|
| `bot/wrangler.toml` | create | Worker config: name, KV binding, env var declarations |
| `bot/package.json` | create | Wrangler as dev dependency, deploy script |
| `bot/.gitignore` | create | Ignore `node_modules`, `.wrangler/`, `.dev.vars` |
| `bot/README.md` | create | Setup + deploy + maintenance instructions |
| `bot/src/index.mjs` | create | Worker entry: webhook router, allowlist check |
| `bot/src/telegram.mjs` | create | Telegram Bot API helpers (sendMessage, editMessage, etc.) |
| `bot/src/github.mjs` | create | GitHub API + raw fetch with KV cache |
| `bot/src/parse.mjs` | create | Pure functions: parseTitle, parseConviction, preview |
| `bot/src/handlers.mjs` | create | All command + callback handlers |
| `bot/test/parse.test.mjs` | create | Unit tests for parse.mjs (pure functions) |

Tests are limited to `parse.mjs` because it's the only set of pure functions in the system. Telegram/GitHub helpers and handlers depend on external services and a Cloudflare Workers runtime — they're verified by the manual end-to-end test in Task 12.

---

## Task 1: User-facing setup (Cloudflare account + wrangler CLI)

This task is **performed by the user**, not the engineer. The remaining tasks assume these are done.

- [ ] **Step 1: Create a free Cloudflare account**

Go to https://dash.cloudflare.com/sign-up. Verify email. No credit card required.

- [ ] **Step 2: Install wrangler CLI globally**

```bash
npm install -g wrangler
```

Verify: `wrangler --version` should print a version like `4.x.x`.

- [ ] **Step 3: Authenticate wrangler with Cloudflare**

```bash
wrangler login
```

A browser opens; click "Allow". Wrangler stores the auth token locally.

- [ ] **Step 4: Confirm to the engineer that setup is done**

The engineer will not run `wrangler` until this user task is complete.

---

## Task 2: Bot project skeleton

**Files:**
- Create: `bot/.gitignore`
- Create: `bot/package.json`
- Create: `bot/wrangler.toml`

- [ ] **Step 1: Create `bot/.gitignore`**

```
node_modules/
.wrangler/
.dev.vars
*.log
```

- [ ] **Step 2: Create `bot/package.json`**

```json
{
  "name": "daily-business-ideas-bot",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "node --test test/"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 3: Create the KV namespace via wrangler**

```bash
cd bot
wrangler kv namespace create BOT_KV
```

Wrangler prints something like:
```
{ binding = "BOT_KV", id = "abc123def456..." }
```

Copy the id value for the next step.

- [ ] **Step 4: Create `bot/wrangler.toml`**

Replace `<KV_ID_FROM_STEP_3>` with the id printed in step 3.

```toml
name = "daily-business-ideas-bot"
main = "src/index.mjs"
compatibility_date = "2026-04-01"

[[kv_namespaces]]
binding = "BOT_KV"
id = "<KV_ID_FROM_STEP_3>"

[vars]
GITHUB_REPO = "animuradyanartist/daily-business-ideas"
ALLOWED_CHAT_ID = "1010175368"
# BOT_TOKEN and WEBHOOK_SECRET are set as secrets, not vars
```

- [ ] **Step 5: Install dependencies**

```bash
cd bot && npm install
```

- [ ] **Step 6: Commit**

```bash
git add bot/.gitignore bot/package.json bot/wrangler.toml
git commit -m "Bot scaffold: package.json, wrangler.toml, KV namespace"
git push
```

---

## Task 3: `parse.mjs` with TDD

**Files:**
- Create: `bot/src/parse.mjs`
- Create: `bot/test/parse.test.mjs`

This is the only module with unit tests. Pure functions, easy to test.

- [ ] **Step 1: Write the failing tests**

Create `bot/test/parse.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIdeaTitle,
  parseTrendTitle,
  parseConviction,
  preview,
} from '../src/parse.mjs';

test('parseIdeaTitle extracts first H1', () => {
  const md = `# UX Research Kit for Non-Native Designers\n\n_2026-04-29 · conviction: high_\n\nMore content.`;
  assert.equal(parseIdeaTitle(md), 'UX Research Kit for Non-Native Designers');
});

test('parseIdeaTitle returns fallback for missing H1', () => {
  assert.equal(parseIdeaTitle('no headings here'), 'Untitled');
});

test('parseTrendTitle extracts first "## Trend 1:" name', () => {
  const md = `# Daily trend forecast — 2026-04-29\n\n## Trend 1: Short-Form Video Workflows\n\nbody...`;
  assert.equal(parseTrendTitle(md), 'Short-Form Video Workflows');
});

test('parseTrendTitle returns fallback when no Trend 1 heading', () => {
  assert.equal(parseTrendTitle('# Daily trend forecast\n\nno trend headings'), 'Untitled');
});

test('parseConviction returns high/medium/low', () => {
  assert.equal(parseConviction('_2026-04-29 · conviction: high_'), 'high');
  assert.equal(parseConviction('_2026-04-29 · conviction: medium_'), 'medium');
  assert.equal(parseConviction('_2026-04-29 · conviction: low_'), 'low');
});

test('parseConviction returns null when missing', () => {
  assert.equal(parseConviction('no conviction line'), null);
});

test('preview returns first N chars without leading markdown noise', () => {
  const md = `# Title\n\n_2026-04-29 · conviction: high_\n\n## The idea\nA swipe file of plug-and-play questions.`;
  const out = preview(md, 100);
  assert.match(out, /A swipe file/);
  assert.ok(out.length <= 100);
});

test('preview ends mid-sentence with ellipsis if truncated', () => {
  const longBody = '## The idea\n' + 'word '.repeat(200);
  const out = preview(longBody, 50);
  assert.ok(out.endsWith('…') || out.endsWith('...'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd bot && npm test
```

Expected: errors because `../src/parse.mjs` doesn't exist yet.

- [ ] **Step 3: Implement `bot/src/parse.mjs`**

```javascript
// Pure functions for parsing memo files.

export function parseIdeaTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

export function parseTrendTitle(md) {
  const m = md.match(/^##\s+Trend 1:\s*(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

export function parseConviction(md) {
  const m = md.match(/conviction:\s*(high|medium|low)/i);
  return m ? m[1].toLowerCase() : null;
}

export function preview(md, max = 500) {
  // Strip the first H1 line and any leading metadata block until the first body paragraph
  const lines = md.split('\n');
  // Skip H1, the conviction line, and headings until we hit body text
  let body = [];
  let inBody = false;
  for (const line of lines) {
    if (!inBody) {
      // Skip until we find a non-heading, non-metadata, non-empty line
      const trimmed = line.trim();
      if (
        trimmed === '' ||
        trimmed.startsWith('#') ||
        /^_.*conviction.*_$/.test(trimmed) ||
        trimmed === '---'
      ) {
        continue;
      }
      inBody = true;
    }
    body.push(line);
  }
  let text = body.join(' ').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd bot && npm test
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add bot/src/parse.mjs bot/test/parse.test.mjs
git commit -m "Bot: parse.mjs with unit tests for title, conviction, preview"
git push
```

---

## Task 4: `telegram.mjs` (Telegram API helpers)

**Files:**
- Create: `bot/src/telegram.mjs`

- [ ] **Step 1: Write the file**

```javascript
// Telegram Bot API helpers. Each call returns the parsed JSON response.

const TELEGRAM_BASE = 'https://api.telegram.org';

async function tgCall(token, method, body) {
  const res = await fetch(`${TELEGRAM_BASE}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function sendMessage(token, chatId, text, replyMarkup = null) {
  const body = { chat_id: chatId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return tgCall(token, 'sendMessage', body);
}

export function editMessageText(token, chatId, messageId, text, replyMarkup = null) {
  const body = { chat_id: chatId, message_id: messageId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return tgCall(token, 'editMessageText', body);
}

export function answerCallbackQuery(token, callbackQueryId, text = null) {
  const body = { callback_query_id: callbackQueryId };
  if (text) body.text = text;
  return tgCall(token, 'answerCallbackQuery', body);
}

export function persistentKeyboard() {
  return {
    keyboard: [
      [{ text: '📋 All ideas' }],
      [{ text: '📈 All trends' }],
      [{ text: '⭐ Favorites' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

export function inlineKeyboard(rows) {
  return { inline_keyboard: rows };
}
```

- [ ] **Step 2: Commit**

```bash
git add bot/src/telegram.mjs
git commit -m "Bot: Telegram API helpers"
git push
```

---

## Task 5: `github.mjs` (GitHub list + raw fetch with KV cache)

**Files:**
- Create: `bot/src/github.mjs`

- [ ] **Step 1: Write the file**

```javascript
// GitHub data access for the bot.
// - listFiles: GitHub contents API with 60s KV cache (handles unauth rate limit)
// - fetchRaw: raw.githubusercontent.com (no rate limit)

const CACHE_TTL_S = 60;

export async function listFiles(env, folder) {
  const cacheKey = `cache:${folder}-list`;
  const cached = await env.BOT_KV.get(cacheKey, { type: 'json' });
  if (cached) {
    return cached;
  }

  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${folder}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'daily-business-ideas-bot',
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    // Rate-limited or repo unreachable — try a stale cache
    const stale = await env.BOT_KV.get(cacheKey, { type: 'json' });
    if (stale) return stale;
    throw new Error(`GitHub list failed: ${res.status}`);
  }

  const items = await res.json();
  const onlyMd = items
    .filter((f) => f.type === 'file' && f.name.endsWith('.md') && f.name !== '.gitkeep')
    .map((f) => ({ name: f.name, path: f.path }))
    .sort((a, b) => b.name.localeCompare(a.name)); // newest first

  await env.BOT_KV.put(cacheKey, JSON.stringify(onlyMd), { expirationTtl: CACHE_TTL_S });
  return onlyMd;
}

export async function fetchRaw(env, path) {
  const url = `https://raw.githubusercontent.com/${env.GITHUB_REPO}/main/${path}`;
  const res = await fetch(url, {
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) {
    throw new Error(`raw fetch failed: ${res.status} for ${path}`);
  }
  return res.text();
}

export function dateFromFilename(name) {
  // 2026-04-29.md → 2026-04-29
  return name.replace(/\.md$/, '');
}

export function repoBlobUrl(env, path) {
  return `https://github.com/${env.GITHUB_REPO}/blob/main/${path}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add bot/src/github.mjs
git commit -m "Bot: GitHub list + raw fetch with KV cache"
git push
```

---

## Task 6: `handlers.mjs` (commands + callbacks)

**Files:**
- Create: `bot/src/handlers.mjs`

- [ ] **Step 1: Write the file**

```javascript
// All bot logic lives here. Imports thin wrappers from telegram.mjs and github.mjs.

import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  persistentKeyboard,
  inlineKeyboard,
} from './telegram.mjs';
import { listFiles, fetchRaw, dateFromFilename, repoBlobUrl } from './github.mjs';
import {
  parseIdeaTitle,
  parseTrendTitle,
  parseConviction,
  preview,
} from './parse.mjs';

const PAGE_SIZE = 10;

// --- Favorites helpers ---

async function getFavs(env, chatId) {
  const raw = await env.BOT_KV.get(`favorites:${chatId}`, { type: 'json' });
  return raw || [];
}

async function setFavs(env, chatId, favs) {
  await env.BOT_KV.put(`favorites:${chatId}`, JSON.stringify(favs));
}

async function isFav(env, chatId, key) {
  const favs = await getFavs(env, chatId);
  return favs.includes(key);
}

async function toggleFav(env, chatId, key) {
  const favs = await getFavs(env, chatId);
  const idx = favs.indexOf(key);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.unshift(key);
  }
  await setFavs(env, chatId, favs);
  return idx < 0; // true if now favorited
}

// --- /start ---

export async function handleStart(env, chatId) {
  await sendMessage(
    env.BOT_TOKEN,
    chatId,
    "Hi Ani. The menu's at the bottom — tap any button to browse ideas, trends, or favorites.",
    persistentKeyboard()
  );
}

// --- List rendering ---

async function renderList(env, chatId, listType, page, edit = null) {
  let items;
  if (listType === 'ideas') {
    items = await listFiles(env, 'ideas');
  } else if (listType === 'trends') {
    items = await listFiles(env, 'trends');
  } else if (listType === 'favs') {
    const favs = await getFavs(env, chatId);
    // Convert "type:date" entries into pseudo-file items
    items = favs.map((key) => {
      const [type, date] = key.split(':');
      return { name: `${date}.md`, path: `${type === 'idea' ? 'ideas' : 'trends'}/${date}.md`, _favKey: key };
    });
  }

  const total = items.length;
  if (total === 0) {
    const msg =
      listType === 'favs'
        ? 'No favorites yet. Tap any item and add it with the ⭐ button.'
        : `No ${listType} yet — first one arrives soon.`;
    const markup = inlineKeyboard([[{ text: '🏠 Menu', callback_data: 'menu' }]]);
    if (edit) {
      await editMessageText(env.BOT_TOKEN, chatId, edit, msg, markup);
    } else {
      await sendMessage(env.BOT_TOKEN, chatId, msg, markup);
    }
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const slice = items.slice(start, start + PAGE_SIZE);

  // Fetch each memo to build labels (parallel)
  const labels = await Promise.all(
    slice.map(async (item) => {
      const isTrend = item.path.startsWith('trends/');
      const date = dateFromFilename(item.name);
      const memo = await fetchRaw(env, item.path);
      const title = isTrend ? parseTrendTitle(memo) : parseIdeaTitle(memo);
      const conv = isTrend ? null : parseConviction(memo);
      const type = isTrend ? 'trend' : 'idea';
      const key = `${type}:${date}`;
      const favored = await isFav(env, chatId, key);
      const star = favored ? '⭐ ' : '';
      const convStr = conv ? ` · ${conv}` : '';
      const label = `${star}${date} · ${title.slice(0, 60)}${convStr}`;
      return { label, callback: `view:${type}:${date}:${safePage}` };
    })
  );

  const itemRows = labels.map((l) => [{ text: l.label, callback_data: l.callback }]);
  const navRow = [];
  if (safePage > 1) navRow.push({ text: '◀️ Prev', callback_data: `page:${listType}:${safePage - 1}` });
  if (safePage < totalPages) navRow.push({ text: 'Next ▶️', callback_data: `page:${listType}:${safePage + 1}` });
  const rows = [...itemRows];
  if (navRow.length > 0) rows.push(navRow);
  rows.push([{ text: '🏠 Menu', callback_data: 'menu' }]);

  const headerEmoji = listType === 'ideas' ? '📋' : listType === 'trends' ? '📈' : '⭐';
  const headerName = listType === 'ideas' ? 'All ideas' : listType === 'trends' ? 'All trends' : 'Favorites';
  const text = `${headerEmoji} ${headerName} (${total} total)\nShowing ${start + 1}–${Math.min(
    start + PAGE_SIZE,
    total
  )} of ${total}`;

  const markup = inlineKeyboard(rows);
  if (edit) {
    await editMessageText(env.BOT_TOKEN, chatId, edit, text, markup);
  } else {
    await sendMessage(env.BOT_TOKEN, chatId, text, markup);
  }
}

// --- Menu tap (text from persistent keyboard) ---

export async function handleMenuTap(env, chatId, text) {
  if (text === '📋 All ideas') return renderList(env, chatId, 'ideas', 1);
  if (text === '📈 All trends') return renderList(env, chatId, 'trends', 1);
  if (text === '⭐ Favorites') return renderList(env, chatId, 'favs', 1);
  // Fallback for unrecognized text
  await sendMessage(
    env.BOT_TOKEN,
    chatId,
    'Tap one of the buttons below.',
    persistentKeyboard()
  );
}

// --- Item view ---

async function renderItem(env, chatId, type, date, fromPage, messageId) {
  const folder = type === 'idea' ? 'ideas' : 'trends';
  const path = `${folder}/${date}.md`;
  let memo;
  try {
    memo = await fetchRaw(env, path);
  } catch {
    await editMessageText(
      env.BOT_TOKEN,
      chatId,
      messageId,
      'This memo no longer exists.',
      inlineKeyboard([[{ text: '🏠 Menu', callback_data: 'menu' }]])
    );
    return;
  }

  const title = type === 'idea' ? parseIdeaTitle(memo) : parseTrendTitle(memo);
  const emoji = type === 'idea' ? '💡' : '📈';
  const conv = type === 'idea' ? parseConviction(memo) : null;
  const convLine = conv ? ` · ${conv} conviction` : '';
  const previewText = preview(memo, 500);

  const text = `${emoji} ${title}\n${date}${convLine}\n\n${previewText}`;

  const key = `${type}:${date}`;
  const favored = await isFav(env, chatId, key);
  const favLabel = favored ? '★ Remove from favorites' : '⭐ Add to favorites';
  const listType = type === 'idea' ? 'ideas' : 'trends';

  const markup = inlineKeyboard([
    [{ text: favLabel, callback_data: `fav:${type}:${date}:${fromPage}` }],
    [{ text: '📖 Read full memo on GitHub', url: repoBlobUrl(env, path) }],
    [{ text: '◀️ Back to list', callback_data: `page:${listType}:${fromPage}` }],
  ]);

  await editMessageText(env.BOT_TOKEN, chatId, messageId, text, markup);
}

// --- Callback dispatch ---

export async function handleCallback(env, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data || '';

  await answerCallbackQuery(env.BOT_TOKEN, callbackQuery.id);

  if (data === 'menu') {
    await editMessageText(
      env.BOT_TOKEN,
      chatId,
      messageId,
      'Tap one of the buttons at the bottom of the chat to browse.',
      inlineKeyboard([])
    );
    return;
  }

  if (data.startsWith('page:')) {
    const [, listType, pageStr] = data.split(':');
    const page = parseInt(pageStr, 10) || 1;
    await renderList(env, chatId, listType, page, messageId);
    return;
  }

  if (data.startsWith('view:')) {
    const [, type, date, fromPage] = data.split(':');
    await renderItem(env, chatId, type, date, parseInt(fromPage, 10) || 1, messageId);
    return;
  }

  if (data.startsWith('fav:')) {
    const [, type, date, fromPage] = data.split(':');
    const key = `${type}:${date}`;
    await toggleFav(env, chatId, key);
    // Re-render the item so the button label flips
    await renderItem(env, chatId, type, date, parseInt(fromPage, 10) || 1, messageId);
    return;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add bot/src/handlers.mjs
git commit -m "Bot: handlers.mjs — commands, list, item, favorite"
git push
```

---

## Task 7: `index.mjs` (Worker entry, webhook router)

**Files:**
- Create: `bot/src/index.mjs`

- [ ] **Step 1: Write the file**

```javascript
// Cloudflare Worker entry point.
// Verifies webhook secret, enforces single-user allowlist, dispatches to handlers.

import { handleStart, handleMenuTap, handleCallback } from './handlers.mjs';
import { sendMessage } from './telegram.mjs';

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Not found', { status: 404 });
    }

    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== env.WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response('Bad request', { status: 400 });
    }

    // Identify the chat from either a message or a callback query
    const chatId =
      update.message?.chat?.id ??
      update.callback_query?.message?.chat?.id ??
      null;

    if (chatId === null) {
      return new Response('OK');
    }

    if (String(chatId) !== env.ALLOWED_CHAT_ID) {
      // Anyone else who messages the bot gets a polite refusal
      try {
        await sendMessage(env.BOT_TOKEN, chatId, 'This is a private bot.');
      } catch {
        /* ignore */
      }
      return new Response('OK');
    }

    try {
      if (update.callback_query) {
        await handleCallback(env, update.callback_query);
      } else if (update.message) {
        const text = update.message.text || '';
        if (text === '/start') {
          await handleStart(env, chatId);
        } else if (
          text === '📋 All ideas' ||
          text === '📈 All trends' ||
          text === '⭐ Favorites'
        ) {
          await handleMenuTap(env, chatId, text);
        } else {
          await handleStart(env, chatId);
        }
      }
    } catch (err) {
      // Log and surface a generic error to the user
      console.error('Handler error:', err);
      try {
        await sendMessage(env.BOT_TOKEN, chatId, 'Something went wrong. Try again.');
      } catch {
        /* ignore */
      }
    }

    return new Response('OK');
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add bot/src/index.mjs
git commit -m "Bot: index.mjs — Worker entry + webhook router"
git push
```

---

## Task 8: Set Worker secrets

**Files:** none modified.

- [ ] **Step 1: Generate a webhook secret**

```bash
WEBHOOK_SECRET=$(openssl rand -hex 24)
echo "Save this for later: $WEBHOOK_SECRET"
```

Save the printed value somewhere (1Password, notes app). Used in Task 9.

- [ ] **Step 2: Set the bot token secret**

```bash
cd bot
echo "8280669278:AAGw0FpOuS0wUDo5ORerazuOY1ZLsBK2xSU" | wrangler secret put BOT_TOKEN
```

Wrangler prompts to confirm; it stores the value encrypted.

- [ ] **Step 3: Set the webhook secret**

```bash
cd bot
echo "$WEBHOOK_SECRET" | wrangler secret put WEBHOOK_SECRET
```

(Use the value from step 1.)

- [ ] **Step 4: Verify secrets are set**

```bash
cd bot && wrangler secret list
```

Expected output includes `BOT_TOKEN` and `WEBHOOK_SECRET`.

---

## Task 9: Deploy the Worker

**Files:** none modified.

- [ ] **Step 1: Deploy**

```bash
cd bot && wrangler deploy
```

Wrangler prints something like:
```
Published daily-business-ideas-bot
  https://daily-business-ideas-bot.<your-account>.workers.dev
```

Copy the URL.

- [ ] **Step 2: Configure the Telegram webhook**

Replace `<WORKER_URL>` and `<WEBHOOK_SECRET>` with the values from step 1 here and step 1 of Task 8.

```bash
curl -sS -X POST "https://api.telegram.org/bot8280669278:AAGw0FpOuS0wUDo5ORerazuOY1ZLsBK2xSU/setWebhook" \
  -d "url=<WORKER_URL>/?secret=<WEBHOOK_SECRET>"
```

Expected response: `{"ok":true,"result":true,"description":"Webhook was set"}`.

- [ ] **Step 3: Verify the webhook is active**

```bash
curl -sS "https://api.telegram.org/bot8280669278:AAGw0FpOuS0wUDo5ORerazuOY1ZLsBK2xSU/getWebhookInfo"
```

Expected: `"url"` contains the Worker URL with the `?secret=...` parameter.

---

## Task 10: First end-to-end test

**Files:** none.

- [ ] **Step 1: Send `/start` to the bot**

Open the @ani_daily_ideas_bot chat in Telegram. Send `/start`.

Expected: greeting text + 3 buttons appear at the bottom of the chat.

- [ ] **Step 2: Tap `📋 All ideas`**

Expected: a message titled `📋 All ideas (N total)` with up to 10 idea buttons + a `🏠 Menu` button. If there are >10 ideas, also `Next ▶️`.

- [ ] **Step 3: Tap any idea button**

Expected: the message edits to show the idea title, date, conviction, ~500-char preview, and three buttons:
- `⭐ Add to favorites`
- `📖 Read full memo on GitHub`
- `◀️ Back to list`

- [ ] **Step 4: Tap `⭐ Add to favorites`**

Expected: the button label flips to `★ Remove from favorites`. The message preview stays the same.

- [ ] **Step 5: Tap `◀️ Back to list`**

Expected: the message returns to the ideas list. The favorited item now has a `⭐` prefix in its label.

- [ ] **Step 6: Tap `🏠 Menu` then `⭐ Favorites`**

Expected: a list with exactly one item — the one you just favorited.

- [ ] **Step 7: Repeat for `📈 All trends`**

Same flow. Verify trends list, item view, favorite toggle work.

- [ ] **Step 8: Verify failure modes**

Try sending arbitrary text (e.g., "hello"). Expected: bot replies with the menu/help.

If anything fails: check `wrangler tail` for live logs.

```bash
cd bot && wrangler tail
```

Then trigger the failing action again to see logs.

---

## Task 11: Bot README

**Files:**
- Create: `bot/README.md`

- [ ] **Step 1: Write the README**

```markdown
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
5. Create the KV namespace: `wrangler kv namespace create BOT_KV` and put the id in `wrangler.toml`.
6. Set secrets:
   - `echo "<bot-token>" | wrangler secret put BOT_TOKEN`
   - `echo "<random-secret>" | wrangler secret put WEBHOOK_SECRET`
7. Deploy: `npm run deploy`.
8. Set the webhook:
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
```

- [ ] **Step 2: Commit**

```bash
git add bot/README.md
git commit -m "Bot: README with setup + run instructions"
git push
```

---

## Task 12: Update root README to mention the bot

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the current README**

```bash
cat README.md
```

Look for the section that lists the system's parts (top of the file).

- [ ] **Step 2: Add a `Bot` section just above the `## Log` heading**

Insert this block before `## Log`:

```markdown
## Bot

The interactive Telegram interface lives in [`bot/`](bot/). It gives a 3-button menu (📋 ideas / 📈 trends / ⭐ favorites) for browsing this repo's memos directly from Telegram. Runs on Cloudflare Workers, free.

```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "README: link to bot/ folder"
git push
```

---

## Self-review checklist

- [x] **Spec coverage:**
  - 3-button persistent menu → Task 6 (`persistentKeyboard()`) + Task 7 (handler routing)
  - Paginated list → Task 6 (`renderList`)
  - Item view with preview → Task 6 (`renderItem`) + Task 3 (`preview`)
  - Favorite toggle → Task 6 (`toggleFav`)
  - Cloudflare KV storage → Task 2 (namespace) + Task 6 (read/write)
  - GitHub data sourcing with caching → Task 5 (`listFiles`, `fetchRaw`)
  - Webhook secret → Task 7 (header check) + Task 8 (set secret) + Task 9 (set on Telegram side)
  - Single-user allowlist → Task 7 (chat ID check)
  - Failure modes (rate limit, missing memo, etc.) → Task 5 (cache fallback) + Task 6 (try/catch on `fetchRaw`)
  - $0/month → Task 2 (free-tier services) + Task 11 (README)

- [x] **Placeholder scan:** No "TBD", "TODO", or "implement appropriate". All code shown in full.

- [x] **Type/name consistency:**
  - `BOT_TOKEN`, `WEBHOOK_SECRET`, `ALLOWED_CHAT_ID`, `GITHUB_REPO`, `BOT_KV` — same names everywhere.
  - Callback prefixes `view:`, `fav:`, `page:`, `menu` — consistent across `handlers.mjs` and the spec.
  - Function names `parseIdeaTitle`, `parseTrendTitle`, `parseConviction`, `preview`, `listFiles`, `fetchRaw`, `toggleFav` — all defined and referenced consistently.
  - KV keys `favorites:<chat_id>`, `cache:ideas-list`, `cache:trends-list` — match spec.

---

## Definition of done

- All files in `bot/` exist and are committed.
- `wrangler deploy` succeeded; Worker is live at `https://daily-business-ideas-bot.<account>.workers.dev`.
- Telegram webhook is set and `getWebhookInfo` confirms the URL.
- Sending `/start` in Telegram shows the persistent 3-button menu.
- Tapping each menu button opens a list.
- Tapping an item shows its preview + favorite toggle + GitHub link.
- Favoriting an item persists across taps and shows in the `⭐ Favorites` list.
- `npm test` in `bot/` passes (8 unit tests for `parse.mjs`).
- Both root `README.md` and `bot/README.md` reference the bot.
