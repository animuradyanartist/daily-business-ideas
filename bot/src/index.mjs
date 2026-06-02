// Cloudflare Worker entry point.
// Verifies webhook secret, enforces single-user allowlist, dispatches to handlers.

import { handleStart, handleMenuTap, handleCallback, handleText } from './handlers.mjs';
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

    const chatId =
      update.message?.chat?.id ??
      update.callback_query?.message?.chat?.id ??
      null;

    if (chatId === null) {
      return new Response('OK');
    }

    if (String(chatId) !== env.ALLOWED_CHAT_ID) {
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
          await env.BOT_KV.delete(`pending_outcome:${chatId}`);
          await handleStart(env, chatId);
        } else if (
          text === '📋 All ideas' ||
          text === '📈 All trends' ||
          text === '⭐ Favorites'
        ) {
          // A menu tap cancels any half-finished outcome prompt.
          await env.BOT_KV.delete(`pending_outcome:${chatId}`);
          await handleMenuTap(env, chatId, text);
        } else {
          // Free text: consume it as a pending outcome if one is awaiting,
          // otherwise fall back to the welcome/menu.
          const consumed = await handleText(env, chatId, text);
          if (!consumed) {
            await handleStart(env, chatId);
          }
        }
      }
    } catch (err) {
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
