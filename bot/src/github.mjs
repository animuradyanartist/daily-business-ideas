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
