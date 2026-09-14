// The shared DataForSEO spend ledger and Scout's budget gate.
//
// ONE ALLOWANCE, NOT TWO. Career OS already enforces a monthly DataForSEO ceiling
// (`DATAFORSEO_MONTHLY_USD_CAP`) by summing `dataforseo.spend` rows in its Supabase
// `runtime_events` table for the current UTC month before every purchase
// (src/lib/jobs/marketDemandSync.ts). Scout reads and writes that SAME ledger with the
// SAME event type and payload shape, so whichever app spends first, the other sees it.
// Scout rows are tagged `produced_by: "scout"` and inserted already `processed`, so the
// Career OS orchestrator never treats them as work.
//
// FAILS CLOSED:
//   - no cap configured      → no paid requests (Scout never assumes a default allowance)
//   - ledger not configured  → no paid requests (spend could not be counted)
//   - ledger unreadable      → no paid requests
//   - ledger write fails     → the charge goes to a local outbox, further paid requests
//                              stop, and the outbox is flushed before the next purchase
//
// Scout additionally leaves `reserveUsd` of the shared cap untouched for Career OS's own
// monthly jobs. That makes Scout's share SMALLER than the cap; it never adds allowance.

import { createHash } from 'node:crypto';

export const SPEND_EVENT = 'dataforseo.spend';
export const DEFAULT_RESERVE_USD = 1.0;
export const DEFAULT_MAX_RUN_USD = 0.1;

const roundUsd = (n) => Number(Number(n).toFixed(6)); // 6 decimals: per-item Labs prices have 5

function parseMoney(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Budget settings from the environment. A missing or invalid cap is NOT a default — it is "no allowance". */
export function readBudgetConfig(env = process.env) {
  const capUsd = parseMoney(env.DATAFORSEO_MONTHLY_USD_CAP);
  const reserve = parseMoney(env.SCOUT_DFS_RESERVE_USD);
  const maxRun = parseMoney(env.SCOUT_DFS_MAX_RUN_USD);
  return {
    capUsd,
    capError:
      capUsd === null
        ? env.DATAFORSEO_MONTHLY_USD_CAP === undefined || String(env.DATAFORSEO_MONTHLY_USD_CAP).trim() === ''
          ? 'DATAFORSEO_MONTHLY_USD_CAP is not set'
          : 'DATAFORSEO_MONTHLY_USD_CAP is not a valid non-negative number'
        : null,
    reserveUsd: reserve ?? DEFAULT_RESERVE_USD,
    maxRunUsd: maxRun ?? DEFAULT_MAX_RUN_USD,
  };
}

/**
 * How much Scout may still spend right now. Pure.
 * Scout's ceiling = min(shared cap − reserve − month-to-date, per-run limit − spent this run).
 */
export function remainingAllowance({ capUsd, reserveUsd, maxRunUsd, monthToDateUsd, spentThisRunUsd = 0 }) {
  if (capUsd === null || capUsd === undefined || monthToDateUsd === null || monthToDateUsd === undefined) return 0;
  const monthly = capUsd - reserveUsd - monthToDateUsd - spentThisRunUsd;
  const perRun = maxRunUsd - spentThisRunUsd;
  return Math.max(0, roundUsd(Math.min(monthly, perRun)));
}

export function canAfford(projectedUsd, budget) {
  const remaining = remainingAllowance(budget);
  return { ok: projectedUsd <= remaining + 1e-9, remainingUsd: remaining };
}

function monthBounds(now) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Deterministic UUID from a string, so re-sending the same charge can never double-count it. */
export function stableUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function createLedger({ url, key, projectId, fetchImpl = fetch, timeoutMs = 15_000 } = {}) {
  const configured = Boolean(url && key && projectId);
  const base = url ? url.replace(/\/+$/, '') : '';
  const headers = () => ({ apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' });

  return {
    configured,

    /** USD recorded this UTC month by every app sharing the ledger. Throws if unreadable. */
    async monthToDateUsd(now = new Date()) {
      if (!configured) throw new Error('ledger not configured');
      const { start, end } = monthBounds(now);
      const qs = new URLSearchParams({
        select: 'payload,occurred_at',
        project_id: `eq.${projectId}`,
        type: `eq.${SPEND_EVENT}`,
        limit: '5000',
      });
      qs.append('occurred_at', `gte.${start}`);
      qs.append('occurred_at', `lt.${end}`);
      const res = await fetchImpl(`${base}/rest/v1/runtime_events?${qs}`, {
        headers: headers(),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`ledger read failed (HTTP ${res.status})`);
      const rows = await res.json();
      if (!Array.isArray(rows)) throw new Error('ledger read returned an unexpected shape');
      let total = 0;
      for (const r of rows) {
        const c = r?.payload?.cost;
        if (typeof c === 'number' && Number.isFinite(c)) total += c;
      }
      return roundUsd(total);
    },

    /** Append one charge. Idempotent on `entry.id`: a duplicate insert counts as recorded. */
    async record(entry) {
      if (!configured) throw new Error('ledger not configured');
      const res = await fetchImpl(`${base}/rest/v1/runtime_events`, {
        method: 'POST',
        headers: { ...headers(), prefer: 'return=minimal' },
        body: JSON.stringify({
          id: entry.id,
          project_id: projectId,
          type: SPEND_EVENT,
          payload: entry.payload,
          produced_by: 'scout',
          occurred_at: entry.occurredAt,
          processed: true,
          processed_at: entry.occurredAt,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok || res.status === 409) return { recorded: true, duplicate: res.status === 409 };
      throw new Error(`ledger write failed (HTTP ${res.status})`);
    },
  };
}

/**
 * Build a ledger entry compatible with Career OS's payload
 * ({cost, requested, measured, endpoint, location, language, measuredAt}) plus Scout provenance.
 */
export function spendEntry({ runId, cacheKey, endpoint, costUsd, estimated, requested, measured, market, measuredAt, capUsd }) {
  return {
    id: stableUuid(`scout|${runId}|${cacheKey}`),
    occurredAt: measuredAt,
    payload: {
      cost: roundUsd(costUsd),
      requested,
      measured,
      endpoint,
      location: market.locationName,
      language: market.languageCode,
      measuredAt,
      source: 'scout',
      runId,
      estimated: Boolean(estimated),
      capUsd,
    },
  };
}
