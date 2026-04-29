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
