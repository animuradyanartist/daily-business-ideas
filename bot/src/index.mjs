// Cloudflare Worker entry point.
// Verifies webhook secret, enforces single-user allowlist, dispatches to handlers.

import { handleStart, handleMenuTap, handleCallback, handleText } from './handlers.mjs';
import { sendMessage } from './telegram.mjs';

// Resolve the bot token from the Worker's secret bindings. TG_BOT_TOKEN is the
// preferred name (it matches the GitHub Actions secret); BOT_TOKEN is the
// legacy binding kept so the deployed Worker keeps running until the secret is
// renamed. Note: Workers have no `process.env` — secrets arrive via `env`.
function resolveBotToken(env) {
  return env.TG_BOT_TOKEN || env.BOT_TOKEN || null;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Not found', { status: 404 });
    }

    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== env.WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Fail loudly on missing config rather than silently posting to an invalid
    // Telegram URL. Checked after the secret so probes learn nothing.
    const botToken = resolveBotToken(env);
    if (!botToken) {
      console.error('No bot token configured (TG_BOT_TOKEN or BOT_TOKEN) — refusing to handle update.');
      return new Response('Server misconfigured', { status: 500 });
    }
    // Downstream handlers read env.BOT_TOKEN; hand them the resolved value.
    env = { ...env, BOT_TOKEN: botToken };

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
