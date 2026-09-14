// DataForSEO client for Scout's evidence enrichment. Plain fetch, no dependencies.
//
// The contract is reused, not re-invented: it mirrors the two integrations that were
// already verified against live responses —
//   - Career OS  src/lib/dataforseo/client.ts        (auth, status codes, cost read from the API)
//   - ArtistPortfolio server/seo/dataForSeoClient.ts (Labs keyword_overview + SERP shapes)
// Endpoints and prices re-checked against docs.dataforseo.com / dataforseo.com/pricing
// on 2026-09-14.
//
// COST IS READ, NOT ESTIMATED. Every response carries its own `cost` in USD; that is the
// figure the ledger records. PRICES_USD below exists only to PROJECT a request's cost
// before it is made, so the budget gate can refuse it up front.
//
// RETRIES ARE BOUNDED AND CHARGE-AWARE. Only failures that cannot have been billed are
// retried (rate limit, provider 5xx, DNS/connection refused). A timeout or a dropped
// connection may already have been charged, so it is never retried and is surfaced with
// `chargeUnknown` so the caller records the projected cost conservatively.
//
// SECRETS. Credentials only ever become the Basic-auth header. They are never logged,
// never put in an error message, and never written to evidence files.

const BASE_URL = 'https://api.dataforseo.com/v3';

/** Projection-only prices (USD), checked 2026-09-14. The ledger uses the API's own figure. */
export const PRICES_USD = {
  labsTask: 0.012, // DataForSEO Labs, per task
  labsItem: 0.00012, // DataForSEO Labs, per returned item (projected per requested keyword)
  serpLivePer10: 0.002, // SERP API live mode, per 10 results
  adsLiveTask: 0.09, // Keywords Data · Google Ads search_volume live, per task (≤1000 keywords)
};

export const MAX_LABS_KEYWORDS = 700; // keyword_overview hard limit per task

export function projectLabsCost(keywordCount) {
  if (!keywordCount) return 0;
  return round4(PRICES_USD.labsTask + PRICES_USD.labsItem * keywordCount);
}

export function projectAdsCost(keywordCount) {
  return keywordCount ? PRICES_USD.adsLiveTask : 0;
}

export function projectSerpCost(depth = 10) {
  return round4(PRICES_USD.serpLivePer10 * Math.max(1, Math.ceil(depth / 10)));
}

export class ProviderError extends Error {
  /**
   * kind: not_configured | auth | payment | rate_limit | server | timeout | network | bad_request
   * chargeUnknown: the request may have been billed even though it failed.
   */
  constructor(kind, statusCode, message, { chargeUnknown = false } = {}) {
    super(`DataForSEO ${kind}${statusCode ? ` (${statusCode})` : ''}: ${message}`);
    this.name = 'ProviderError';
    this.kind = kind;
    this.statusCode = statusCode;
    this.chargeUnknown = chargeUnknown;
  }

  /** Errors that make every further call in this run pointless. */
  get fatalForRun() {
    return this.kind === 'auth' || this.kind === 'payment' || this.kind === 'not_configured';
  }
}

const round4 = (n) => Number(Number(n).toFixed(4));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Connection errors raised before the request was sent — these cannot have been billed.
const PRE_SEND_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED']);

function classifyApiStatus(code, message) {
  if (code === 40100 || code === 40101 || code === 40102) return new ProviderError('auth', code, 'authentication failed — check the API login and password');
  if (code === 40200 || code === 40210) return new ProviderError('payment', code, 'account balance is insufficient');
  if (code === 40202) return new ProviderError('rate_limit', code, 'rate limit reached');
  if (code >= 50000) return new ProviderError('server', code, message || 'provider error');
  return new ProviderError('bad_request', code, message || 'request rejected');
}

export function createDataForSeo({
  login,
  password,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  timeoutMs = 45_000,
  maxAttempts = 3,
} = {}) {
  const configured = Boolean(login && password);

  async function once(path, body) {
    if (!configured) throw new ProviderError('not_configured', null, 'DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are not set');
    const auth = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
    let res;
    try {
      res = await fetchImpl(`${BASE_URL}${path}`, {
        method: body === null ? 'GET' : 'POST',
        headers: { authorization: auth, 'content-type': 'application/json' },
        body: body === null ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const code = err?.cause?.code || err?.code;
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        throw new ProviderError('timeout', null, `no response within ${timeoutMs / 1000}s`, { chargeUnknown: body !== null });
      }
      if (PRE_SEND_CODES.has(code)) throw new ProviderError('network', null, `connection failed (${code})`);
      throw new ProviderError('network', null, 'connection dropped', { chargeUnknown: body !== null });
    }
    if (res.status === 401) throw new ProviderError('auth', 40100, 'authentication failed — check the API login and password');
    if (res.status === 402) throw new ProviderError('payment', 40200, 'account balance is insufficient');
    if (res.status === 429) throw new ProviderError('rate_limit', 429, 'rate limit reached');
    if (res.status >= 500) throw new ProviderError('server', res.status, 'provider returned a server error');
    let json;
    try {
      json = await res.json();
    } catch {
      throw new ProviderError('server', res.status, 'response was not JSON');
    }
    if (json?.status_code !== 20000) throw classifyApiStatus(json?.status_code, json?.status_message);
    const task = json.tasks?.[0];
    if (task && task.status_code !== 20000) {
      const err = classifyApiStatus(task.status_code, task.status_message);
      err.cost = num(json.cost);
      throw err;
    }
    return json;
  }

  async function call(path, body) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await once(path, body);
      } catch (err) {
        const retryable =
          err instanceof ProviderError &&
          !err.chargeUnknown &&
          (err.kind === 'rate_limit' || err.kind === 'server' || err.kind === 'network');
        if (!retryable || attempt >= maxAttempts) throw err;
        await sleep(2 ** attempt * 1000);
      }
    }
  }

  return {
    configured,

    /** FREE. Account balance — checked before spending, as Career OS does. */
    async balance() {
      const json = await call('/appendix/user_data', null);
      const r = json.tasks?.[0]?.result?.[0];
      return { balanceUsd: num(r?.money?.balance) };
    },

    /** FREE. Is this country + language supported by DataForSEO Labs (Google)? */
    async labsMarketSupport({ locationName, languageCode }) {
      const json = await call('/dataforseo_labs/locations_and_languages', null);
      const rows = json.tasks?.[0]?.result ?? [];
      const loc = rows.find(
        (r) => String(r.location_name ?? '').toLowerCase() === String(locationName).toLowerCase(),
      );
      if (!loc) return { supported: false, reason: `location "${locationName}" is not listed by DataForSEO Labs` };
      const lang = (loc.available_languages ?? []).find(
        (l) => String(l.language_code ?? '').toLowerCase() === String(languageCode).toLowerCase(),
      );
      if (!lang) return { supported: false, locationCode: loc.location_code, reason: `language "${languageCode}" is not available for ${loc.location_name}` };
      const sources = lang.available_sources ?? [];
      if (sources.length && !sources.includes('google')) {
        return { supported: false, locationCode: loc.location_code, reason: `Google data is not available for ${loc.location_name} / ${languageCode}` };
      }
      return { supported: true, locationCode: loc.location_code, keywordsInDatabase: num(lang.keywords) };
    },

    /**
     * PAID. Volume, monthly history, CPC and ad competition for up to 700 keywords in ONE
     * task. A keyword the API has no record of is simply absent from the result — callers
     * must keep it as "no data", never as zero.
     */
    async keywordOverview(keywords, { locationName, languageCode }) {
      const clean = [...new Set(keywords)].slice(0, MAX_LABS_KEYWORDS);
      const measuredAt = new Date().toISOString();
      const json = await call('/dataforseo_labs/google/keyword_overview/live', [
        { keywords: clean, location_name: locationName, language_code: languageCode },
      ]);
      const items = json.tasks?.[0]?.result?.[0]?.items ?? [];
      return {
        cost: num(json.cost),
        requested: clean.length,
        measuredAt,
        items: items.map((it) => {
          const ki = it.keyword_info ?? {};
          return {
            keyword: String(it.keyword ?? '').trim().toLowerCase(),
            searchVolume: num(ki.search_volume),
            // Labs can return years of history; the last 24 months cover trend + YoY.
            monthlySearches: (ki.monthly_searches ?? [])
              .map((m) => ({ year: num(m?.year), month: num(m?.month), searchVolume: num(m?.search_volume) }))
              .filter((m) => m.year && m.month)
              .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month))
              .slice(0, 24),
            cpcUsd: num(ki.cpc),
            // Google Ads auction competition — NOT organic ranking difficulty.
            adCompetition: num(ki.competition),
            adCompetitionLevel: typeof ki.competition_level === 'string' ? ki.competition_level : null,
            providerTrendYearlyPct: num(ki.search_volume_trend?.yearly),
            mainIntent: it.search_intent_info?.main_intent ?? null,
            providerUpdatedAt: ki.last_updated_time ?? null,
          };
        }).filter((r) => r.keyword),
      };
    },

    /**
     * PAID (opt-in fallback). Google Ads search volume for up to 1000 keywords in ONE task —
     * the endpoint Career OS uses (src/lib/dataforseo/client.ts). Covers long-tail keywords
     * the Labs database has no record of, at roughly 7x the price of a Labs task.
     */
    async adsSearchVolume(keywords, { locationName, languageCode }) {
      const clean = [...new Set(keywords)].slice(0, 1000);
      const measuredAt = new Date().toISOString();
      const json = await call('/keywords_data/google_ads/search_volume/live', [
        { keywords: clean, location_name: locationName, language_code: languageCode },
      ]);
      const items = json.tasks?.[0]?.result ?? [];
      return {
        cost: num(json.cost),
        requested: clean.length,
        measuredAt,
        items: items.map((r) => ({
          keyword: String(r.keyword ?? '').trim().toLowerCase(),
          searchVolume: num(r.search_volume),
          monthlySearches: (r.monthly_searches ?? [])
            .map((m) => ({ year: num(m?.year), month: num(m?.month), searchVolume: num(m?.search_volume) }))
            .filter((m) => m.year && m.month)
            .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month))
            .slice(0, 24),
          cpcUsd: num(r.cpc),
          adCompetition: num(r.competition_index) === null ? null : num(r.competition_index) / 100,
          adCompetitionLevel: typeof r.competition === 'string' ? r.competition : null,
          providerTrendYearlyPct: null,
          mainIntent: null,
          providerUpdatedAt: null,
        })).filter((r) => r.keyword),
      };
    },

    /** PAID. Top organic results for one query — who actually shows up. */
    async serpOrganic(keyword, { locationName, languageCode, depth = 10 }) {
      const measuredAt = new Date().toISOString();
      const json = await call('/serp/google/organic/live/regular', [
        { keyword, location_name: locationName, language_code: languageCode, depth },
      ]);
      const result = json.tasks?.[0]?.result?.[0] ?? {};
      return {
        cost: num(json.cost),
        measuredAt,
        checkUrl: typeof result.check_url === 'string' ? result.check_url : null,
        itemTypes: result.item_types ?? [],
        items: (result.items ?? [])
          .filter((i) => i?.type === 'organic' && i.url)
          .map((i) => ({
            rank: num(i.rank_absolute),
            domain: String(i.domain ?? '').toLowerCase(),
            url: i.url,
            title: i.title ?? null,
            description: i.description ?? null,
          })),
      };
    },
  };
}
