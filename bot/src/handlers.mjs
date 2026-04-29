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
  return idx < 0;
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
    items = favs.map((key) => {
      const [type, date] = key.split(':');
      return {
        name: `${date}.md`,
        path: `${type === 'idea' ? 'ideas' : 'trends'}/${date}.md`,
      };
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
    await renderItem(env, chatId, type, date, parseInt(fromPage, 10) || 1, messageId);
    return;
  }
}
