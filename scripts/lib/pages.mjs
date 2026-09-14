// Competitor page observations — free, direct fetches of pages that DataForSEO's SERP
// showed ranking for the idea's queries.
//
// What is recorded is what the page SAYS (title, description, visible price strings,
// "free trial" / "contact sales" wording), with the URL, HTTP status and retrieval time.
// Whether a domain is really a competitor, and what its gaps are, is an inference made
// later and labelled as such. robots.txt is respected; nothing behind a login is read.

// Loopback, link-local (incl. cloud metadata) and private ranges are never fetched.
const PRIVATE_HOST = /^(localhost|0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[::1?\]|\[f[cd]|\[fe80)|\.local$|\.internal$/i;
const USER_AGENT = 'ScoutResearchBot/1.0 (+https://github.com/animuradyanartist/daily-business-ideas)';
const MAX_BYTES = 400_000;

const PRICE_RE =
  /(?:US\$|\$|€|£)\s?\d{1,3}(?:[,.]\d{3})*(?:\.\d{1,2})?(?:\s?(?:\/|per|a)\s?(?:mo(?:nth)?|yr|year|user|seat|license|location|employee|report|filing|unit))?/gi;
// "$1.9 billion", "$80k" — magnitudes in prose, not prices.
const MAGNITUDE_AFTER = /^\s?(?:k\b|m\b|bn\b|million|billion|trillion)/i;

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** Pure: pull observable signals out of raw HTML. */
export function extractPageSignals(html) {
  const src = String(html ?? '');
  const title = decodeEntities((src.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim()).slice(0, 200) || null;
  const desc =
    src.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    src.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ??
    null;
  const text = decodeEntities(
    src
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');

  const priceMentions = [];
  const seen = new Set();
  for (const m of text.matchAll(PRICE_RE)) {
    const raw = m[0].trim();
    const at = m.index ?? 0;
    if (MAGNITUDE_AFTER.test(text.slice(at + m[0].length, at + m[0].length + 12))) continue;
    if (seen.has(raw) || priceMentions.length >= 8) continue;
    seen.add(raw);
    priceMentions.push({
      text: raw,
      // A billing unit ("/mo", "per user") marks an offer price rather than a number in prose.
      billingUnit: /(?:\/|per|a)\s?[a-z]+$/i.test(raw),
      context: text.slice(Math.max(0, at - 60), at + raw.length + 60).trim(),
    });
  }

  return {
    title,
    description: desc ? decodeEntities(desc).trim().slice(0, 300) : null,
    priceMentions,
    mentionsFreeTrial: /free\s+trial|try\s+(it\s+)?free|start\s+free/i.test(text),
    mentionsContactSales: /contact\s+sales|request\s+a\s+demo|book\s+a\s+demo|get\s+a\s+quote|request\s+pricing/i.test(text),
    mentionsPricing: /\bpricing\b|\bplans?\b/i.test(text),
  };
}

/** Pure: is `path` allowed for any user-agent by this robots.txt? Conservative, `*` group only. */
export function robotsAllows(robotsTxt, path) {
  if (!robotsTxt) return true;
  const lines = String(robotsTxt).split(/\r?\n/);
  let inStar = false;
  const disallow = [];
  const allow = [];
  for (const line of lines) {
    const l = line.replace(/#.*/, '').trim();
    if (!l) continue;
    const [field, ...rest] = l.split(':');
    const value = rest.join(':').trim();
    const f = field.trim().toLowerCase();
    if (f === 'user-agent') inStar = value === '*';
    else if (inStar && f === 'disallow' && value) disallow.push(value);
    else if (inStar && f === 'allow' && value) allow.push(value);
  }
  const longest = (rules) => rules.filter((r) => path.startsWith(r.replace(/\*.*$/, ''))).reduce((a, r) => Math.max(a, r.length), -1);
  const d = longest(disallow);
  return d < 0 || longest(allow) >= d;
}

async function readCapped(res) {
  const reader = res.body?.getReader?.();
  if (!reader) return (await res.text()).slice(0, MAX_BYTES);
  const chunks = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8').slice(0, MAX_BYTES);
}

export function createPageFetcher({ fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const robotsCache = new Map();

  async function robotsFor(origin) {
    if (robotsCache.has(origin)) return robotsCache.get(origin);
    let txt = null;
    try {
      const res = await fetchImpl(`${origin}/robots.txt`, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) txt = (await readCapped(res)).slice(0, 50_000);
    } catch {
      txt = null;
    }
    robotsCache.set(origin, txt);
    return txt;
  }

  return async function fetchPage(url) {
    const retrievedAt = new Date().toISOString();
    let u;
    try {
      u = new URL(url);
    } catch {
      return { url, retrievedAt, status: null, error: 'invalid URL' };
    }
    if (!/^https?:$/.test(u.protocol) || PRIVATE_HOST.test(u.hostname)) {
      return { url, retrievedAt, status: null, error: 'not a public web URL' };
    }
    if (!robotsAllows(await robotsFor(u.origin), u.pathname || '/')) {
      return { url, retrievedAt, status: null, error: 'robots.txt disallows this path' };
    }
    try {
      const res = await fetchImpl(u.href, {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.includes('html')) {
        return { url, finalUrl: res.url || u.href, retrievedAt, status: res.status, error: res.ok ? `not HTML (${type || 'unknown type'})` : `HTTP ${res.status}` };
      }
      const signals = extractPageSignals(await readCapped(res));
      return { url, finalUrl: res.url || u.href, retrievedAt, status: res.status, error: null, ...signals };
    } catch (err) {
      return { url, retrievedAt, status: null, error: err?.name === 'TimeoutError' ? 'timed out' : 'fetch failed' };
    }
  };
}
