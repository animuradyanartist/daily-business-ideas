// The shared DataForSEO budget, as seen by Scout: reserve → call → settle | uncertain | release.
//
// DEFAULT BACKEND — `rpc`: the Postgres functions in db/dataforseo_budget.sql, called through
// Supabase's REST RPC endpoint with the project's public anon key plus Scout's own client
// token. No service-role key. Reservations are atomic across every app that uses them.
//
// LEGACY BACKEND — `legacy-ledger` (explicit opt-in only): the pre-migration path that reads and
// appends `dataforseo.spend` rows with a service key. It is NOT atomic across processes —
// kept only so a supervised, single-operator run can still be accounted for before the budget
// functions are applied. Never used by the GitHub workflow.

import { remainingAllowance } from './ledger.mjs';

// Projections are already upper bounds at current prices (Labs bills per RETURNED item ≤ requested;
// SERP and Google Ads are flat per task), so the margin only absorbs a price change. Settle records
// the provider-reported cost.
export const RESERVE_MARGIN = 1.1;

export class BudgetUnavailable extends Error {
  constructor(message) {
    super(message);
    this.name = 'BudgetUnavailable';
  }
}

export function createBudgetRpc({ url, anonKey, token, fetchImpl = fetch, timeoutMs = 15_000 } = {}) {
  const configured = Boolean(url && anonKey && token);
  const base = url ? url.replace(/\/+$/, '') : '';

  async function rpc(fn, args) {
    if (!configured) throw new BudgetUnavailable('shared budget not configured');
    let res;
    try {
      res = await fetchImpl(`${base}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new BudgetUnavailable(`budget service unreachable (${fn})`);
    }
    if (res.status === 404) throw new BudgetUnavailable('budget functions are not installed on the database');
    if (!res.ok) throw new BudgetUnavailable(`budget service error (HTTP ${res.status}, ${fn})`);
    try {
      return await res.json();
    } catch {
      throw new BudgetUnavailable(`budget service returned invalid JSON (${fn})`);
    }
  }

  const must = async (fn, args) => {
    const r = await rpc(fn, args);
    if (!r?.ok) throw new BudgetUnavailable(`${fn} refused (${r?.reason ?? 'unknown'})`);
    return r;
  };

  return {
    backend: 'rpc',
    atomic: true,
    configured,
    async status() {
      const r = await rpc('dataforseo_budget_status', { p_token: token });
      if (!r?.ok) throw new BudgetUnavailable(`budget status refused (${r?.reason ?? 'unknown'})`);
      return { capUsd: Number(r.cap_usd), chargedUsd: Number(r.charged_usd), heldUsd: Number(r.held_usd), uncertainHolds: r.uncertain_holds };
    },
    async reserve({ holdId, estimatedUsd, endpoint, requestKey, maxTotalUsd, ttlSeconds = 900 }) {
      const r = await rpc('dataforseo_budget_reserve', {
        p_token: token,
        p_hold_id: holdId,
        p_estimated_usd: estimatedUsd,
        p_endpoint: endpoint,
        p_request_key: requestKey,
        p_max_total_usd: maxTotalUsd,
        p_ttl_seconds: ttlSeconds,
      });
      return {
        ok: Boolean(r?.ok),
        reason: r?.reason ?? null,
        capUsd: r?.cap_usd != null ? Number(r.cap_usd) : null,
        ceilingUsd: r?.ceiling_usd != null ? Number(r.ceiling_usd) : null,
        chargedUsd: r?.charged_usd != null ? Number(r.charged_usd) : null,
        heldUsd: r?.held_usd != null ? Number(r.held_usd) : null,
      };
    },
    settle: ({ holdId, actualUsd, payload }) => must('dataforseo_budget_settle', { p_token: token, p_hold_id: holdId, p_actual_usd: actualUsd, p_payload: payload ?? {} }),
    markUncertain: ({ holdId, note }) => must('dataforseo_budget_mark_uncertain', { p_token: token, p_hold_id: holdId, p_note: note ?? null }),
    release: ({ holdId, note }) => must('dataforseo_budget_release', { p_token: token, p_hold_id: holdId, p_note: note ?? null }),
  };
}

/**
 * Pre-migration adapter over the append-only ledger. Same interface, weaker guarantee:
 * a reservation is an in-process check of (recorded spend + this process's open holds).
 */
export function createLegacyLedgerBudget({ ledger, capUsd, now = () => new Date() }) {
  const holds = new Map();
  const held = () => [...holds.values()].reduce((s, h) => s + h.estimatedUsd, 0);
  return {
    backend: 'legacy-ledger',
    atomic: false,
    configured: Boolean(ledger?.configured && capUsd !== null && capUsd !== undefined),
    async status() {
      const mtd = await ledger.monthToDateUsd(now());
      return { capUsd, chargedUsd: mtd, heldUsd: held(), uncertainHolds: null };
    },
    async reserve({ holdId, estimatedUsd, endpoint, maxTotalUsd }) {
      const mtd = await ledger.monthToDateUsd(now());
      const ceiling = Math.min(capUsd, maxTotalUsd ?? capUsd);
      const remaining = remainingAllowance({ capUsd: ceiling, reserveUsd: 0, maxRunUsd: Infinity, monthToDateUsd: mtd, spentThisRunUsd: held() });
      if (estimatedUsd > remaining + 1e-9) return { ok: false, reason: 'cap', capUsd, ceilingUsd: ceiling, chargedUsd: mtd, heldUsd: held() };
      holds.set(holdId, { estimatedUsd, endpoint });
      return { ok: true, reason: null, capUsd, ceilingUsd: ceiling, chargedUsd: mtd, heldUsd: held() };
    },
    async settle({ holdId, actualUsd, payload }) {
      const at = now().toISOString();
      await ledger.record({ id: holdId, occurredAt: at, payload: { ...(payload ?? {}), cost: Number(Number(actualUsd).toFixed(6)), holdId } });
      holds.delete(holdId);
      return { ok: true };
    },
    // Without a hold table, "maybe charged" is recorded as charged at the estimate.
    async markUncertain({ holdId, note }) {
      const h = holds.get(holdId);
      const at = now().toISOString();
      await ledger.record({ id: holdId, occurredAt: at, payload: { cost: h?.estimatedUsd ?? 0, holdId, estimated: true, uncertain: true, note: note ?? null, endpoint: h?.endpoint, source: 'scout' } });
      holds.delete(holdId);
      return { ok: true };
    },
    async release({ holdId }) {
      holds.delete(holdId);
      return { ok: true };
    },
  };
}
