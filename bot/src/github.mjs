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
    // Rate-limited or repo unreachable — try a stale cache as fallback
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
  return name.replace(/\.md$/, '');
}

export function repoBlobUrl(env, path) {
  return `https://github.com/${env.GITHUB_REPO}/blob/main/${path}`;
}

// --- UTF-8 safe base64 (Workers' btoa/atob only handle latin1) ---
function b64encodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decodeUtf8(b64) {
  const bin = atob((b64 || '').replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Append a real-world outcome to outcomes/<ideaDate>.md via the GitHub contents
// API. Needs env.GITHUB_TOKEN (a fine-grained PAT with contents:write on the
// repo). Newest update goes to the top so the arc of an idea reads top-down.
export async function writeOutcome(env, ideaDate, userText) {
  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not configured');
  }
  const path = `outcomes/${ideaDate}.md`;
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const headers = {
    'User-Agent': 'daily-business-ideas-bot',
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Fetch existing file (if any) for its sha + current content.
  let sha;
  let existing = '';
  const getRes = await fetch(apiUrl, { headers });
  if (getRes.ok) {
    const json = await getRes.json();
    sha = json.sha;
    existing = b64decodeUtf8(json.content);
  } else if (getRes.status !== 404) {
    throw new Error(`outcome read failed: ${getRes.status}`);
  }

  const loggedOn = new Date().toISOString().slice(0, 10);
  const entry = `## ${loggedOn} — logged via Telegram\n${userText.trim()}\n`;

  let merged;
  if (existing) {
    // Insert the new entry right under the title/front-matter header, above the
    // previous newest entry.
    const idx = existing.search(/\n##\s/);
    if (idx >= 0) {
      merged = `${existing.slice(0, idx)}\n\n${entry}\n${existing.slice(idx + 1)}`;
    } else {
      merged = `${existing.replace(/\s*$/, '')}\n\n${entry}`;
    }
  } else {
    merged = `# Outcome — idea ${ideaDate}\n\nidea: ideas/${ideaDate}.md\n\n${entry}`;
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `outcome(${ideaDate}): logged via Telegram bot`,
      content: b64encodeUtf8(merged),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`outcome write failed: ${putRes.status} ${body.slice(0, 200)}`);
  }
}
