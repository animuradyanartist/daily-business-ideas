// Scout's own DataForSEO spend ledger — plain files in THIS repository, committed by the
// workflow. No database, no other product's infrastructure.
//
// Reserve → call → settle, the same protocol as before, now over one JSON file per request:
//
//   evidence/budget/holds/<YYYY-MM>/<holdId>.json
//     status: reserved | charged | released | uncertain
//
// A month's committed spend = charged (provider-reported cost) + reserved + uncertain (at their
// estimate). A reservation is written to disk BEFORE the paid request is sent, so a crash never
// loses a possible charge: a reservation that outlives its expiry is counted as `uncertain`.
// Only `scripts/budget.mjs resolve` (an owner decision after checking the DataForSEO dashboard)
// turns an uncertain request into charged or released.
//
// One file per request means two branches of history never edit the same file, so the
// workflow's rebase-and-retry push cannot conflict on the ledger.
//
// WHAT THIS ENFORCES — for Scout only:
//   - a monthly allowance (SCOUT_DFS_MONTHLY_USD_CAP; unset = no allowance, nothing is bought)
//   - a per-request limit (SCOUT_DFS_MAX_REQUEST_USD, default $0.10)
//   - a per-run limit (SCOUT_DFS_MAX_RUN_USD, default $0.10 — enforced in enrich.mjs)
// Reservations are serialized by a lock file within one machine and by the workflow's
// concurrency group in GitHub Actions; before a live run, `createLedgerSync` refuses to spend
// unless this checkout's ledger matches the remote branch (so a run never decides from stale
// history). It does NOT see or limit anything else that uses the same DataForSEO account.

import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeJsonAtomic } from './cache.mjs';

export const LEDGER_DIR = 'evidence/budget';
export const RESERVE_MARGIN = 1.1; // estimates are published price × 1.1; settle records the provider's cost
export const DEFAULT_MAX_RUN_USD = 0.1;
export const DEFAULT_MAX_REQUEST_USD = 0.1;
const STATUSES = new Set(['reserved', 'charged', 'released', 'uncertain']);

export const roundUsd = (n) => Number(Number(n).toFixed(6)); // 6 decimals: per-item Labs prices have 5

function parseMoney(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Budget settings from the environment. A missing or invalid cap is NOT a default — it is "no allowance". */
export function readBudgetConfig(env = process.env) {
  const rawCap = env.SCOUT_DFS_MONTHLY_USD_CAP;
  const capUsd = parseMoney(rawCap);
  const maxRun = parseMoney(env.SCOUT_DFS_MAX_RUN_USD);
  const maxRequest = parseMoney(env.SCOUT_DFS_MAX_REQUEST_USD);
  return {
    capUsd,
    capError:
      capUsd === null
        ? rawCap === undefined || String(rawCap).trim() === ''
          ? 'SCOUT_DFS_MONTHLY_USD_CAP is not set'
          : 'SCOUT_DFS_MONTHLY_USD_CAP is not a valid non-negative number'
        : null,
    maxRunUsd: maxRun ?? DEFAULT_MAX_RUN_USD,
    maxRequestUsd: maxRequest !== null && maxRequest > 0 ? maxRequest : DEFAULT_MAX_REQUEST_USD,
  };
}

/** Deterministic UUID from a string, so re-sending the same reservation can never count twice. */
export function stableUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const monthOf = (date) => date.toISOString().slice(0, 7);
const SAFE_ID = /^[0-9a-zA-Z-]{8,64}$/;

export class LedgerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LedgerError';
  }
}

export function createRepoLedger({ dir, capUsd, maxRequestUsd = DEFAULT_MAX_REQUEST_USD, now = () => new Date(), lockWaitMs = 10_000, staleLockMs = 120_000 } = {}) {
  const holdsRoot = join(dir, 'holds');
  const lockPath = join(dir, '.lock');
  const pathFor = (month, id) => join(holdsRoot, month, `${id}.json`);

  function readHold(path) {
    let h;
    try {
      h = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      throw new LedgerError(`ledger file is unreadable: ${path}`);
    }
    if (!h || !STATUSES.has(h.status) || typeof h.estimatedUsd !== 'number' || !Number.isFinite(h.estimatedUsd)) {
      throw new LedgerError(`ledger file is malformed: ${path}`);
    }
    return h;
  }

  /** Every hold of a month. Throws on any unreadable file: an unknown ledger never reads as zero. */
  function holdsOf(month) {
    const d = join(holdsRoot, month);
    if (!existsSync(d)) return [];
    return readdirSync(d)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ path: join(d, f), hold: readHold(join(d, f)) }));
  }

  function findHold(id) {
    if (!SAFE_ID.test(String(id))) return null;
    if (!existsSync(holdsRoot)) return null;
    for (const month of readdirSync(holdsRoot)) {
      const p = pathFor(month, id);
      if (existsSync(p)) return { path: p, hold: readHold(p) };
    }
    return null;
  }

  function totals(month) {
    let charged = 0;
    let held = 0;
    let open = 0;
    let uncertain = 0;
    for (const { hold: h } of holdsOf(month)) {
      if (h.status === 'charged') charged += h.actualUsd ?? h.estimatedUsd;
      else if (h.status === 'reserved' || h.status === 'uncertain') {
        held += h.estimatedUsd;
        if (h.status === 'reserved') open++;
        else uncertain++;
      }
    }
    return { chargedUsd: roundUsd(charged), heldUsd: roundUsd(held), openHolds: open, uncertainHolds: uncertain };
  }

  async function withLock(fn) {
    mkdirSync(dir, { recursive: true });
    const started = Date.now();
    for (;;) {
      try {
        closeSync(openSync(lockPath, 'wx'));
        break;
      } catch (err) {
        if (err.code !== 'EEXIST') throw new LedgerError(`ledger lock failed (${err.code})`);
        try {
          if (Date.now() - statSync(lockPath).mtimeMs > staleLockMs) rmSync(lockPath, { force: true });
        } catch {
          /* lock vanished — retry */
        }
        if (Date.now() - started > lockWaitMs) throw new LedgerError('ledger is locked by another Scout process');
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    try {
      return fn();
    } finally {
      rmSync(lockPath, { force: true });
    }
  }

  const write = (path, hold) => writeJsonAtomic(path, hold);
  const note = (prev, add) => [prev, add ? String(add).slice(0, 300) : null].filter(Boolean).join('; ') || null;

  return {
    backend: 'repo-ledger',
    configured: capUsd !== null && capUsd !== undefined,
    capUsd,
    maxRequestUsd,

    async status() {
      const month = monthOf(now());
      const t = totals(month);
      return { month, capUsd, maxRequestUsd, ...t, remainingUsd: capUsd == null ? 0 : Math.max(0, roundUsd(capUsd - t.chargedUsd - t.heldUsd)) };
    },

    async reserve({ holdId, estimatedUsd, endpoint, requestKey = null, maxTotalUsd = null, runId = null, ttlSeconds = 900 }) {
      if (capUsd === null || capUsd === undefined) return { ok: false, reason: 'not_configured' };
      if (!SAFE_ID.test(String(holdId)) || !endpoint || !(estimatedUsd > 0)) return { ok: false, reason: 'invalid_request' };
      if (estimatedUsd > maxRequestUsd + 1e-9) return { ok: false, reason: 'request_limit', maxRequestUsd };
      return withLock(() => {
        const at = now();
        const month = monthOf(at);
        const existing = findHold(holdId);
        if (existing) return { ok: existing.hold.status === 'reserved', duplicate: true, status: existing.hold.status };

        // A reservation that was never settled (crashed run) keeps counting, as uncertain.
        for (const { path, hold } of holdsOf(month)) {
          if (hold.status === 'reserved' && Date.parse(hold.expiresAt) < at.getTime()) {
            write(path, { ...hold, status: 'uncertain', note: note(hold.note, 'expired without settlement') });
          }
        }
        const t = totals(month);
        const ceiling = roundUsd(Math.min(capUsd, maxTotalUsd ?? capUsd));
        const detail = { month, capUsd, ceilingUsd: ceiling, chargedUsd: t.chargedUsd, heldUsd: t.heldUsd };
        if (t.chargedUsd + t.heldUsd + estimatedUsd > ceiling + 1e-9) {
          return { ok: false, reason: 'cap', ...detail, remainingUsd: Math.max(0, roundUsd(ceiling - t.chargedUsd - t.heldUsd)) };
        }
        const ttl = Math.max(60, Math.min(ttlSeconds ?? 900, 3600));
        write(pathFor(month, holdId), {
          id: holdId,
          month,
          client: 'scout',
          status: 'reserved',
          estimatedUsd: roundUsd(estimatedUsd),
          actualUsd: null,
          endpoint,
          requestKey,
          runId,
          createdAt: at.toISOString(),
          expiresAt: new Date(at.getTime() + ttl * 1000).toISOString(),
          settledAt: null,
          note: null,
          payload: null,
        });
        return { ok: true, reason: null, holdId, ...detail, heldUsd: roundUsd(t.heldUsd + estimatedUsd) };
      });
    },

    // Throw on refusal so enrich.mjs routes the update to the outbox and stops buying.
    async settle({ holdId, actualUsd, payload }) {
      if (!(actualUsd >= 0)) throw new LedgerError('settle: invalid actual cost');
      return withLock(() => {
        const f = findHold(holdId);
        if (!f) throw new LedgerError('settle refused (unknown_hold)');
        if (f.hold.status === 'charged') return { ok: true, duplicate: true };
        if (f.hold.status === 'released') throw new LedgerError('settle refused (hold_released)');
        write(f.path, { ...f.hold, status: 'charged', actualUsd: roundUsd(actualUsd), settledAt: now().toISOString(), payload: payload ?? null });
        return { ok: true, overEstimate: actualUsd > f.hold.estimatedUsd };
      });
    },

    async markUncertain({ holdId, note: why }) {
      return withLock(() => {
        const f = findHold(holdId);
        if (!f) throw new LedgerError('mark uncertain refused (unknown_hold)');
        if (f.hold.status === 'uncertain' || f.hold.status === 'charged') return { ok: true, duplicate: true, status: f.hold.status };
        if (f.hold.status === 'released') throw new LedgerError('mark uncertain refused (hold_released)');
        write(f.path, { ...f.hold, status: 'uncertain', note: note(f.hold.note, why) });
        return { ok: true };
      });
    },

    /** Only for requests that provably were not charged. An uncertain request is not releasable here. */
    async release({ holdId, note: why }) {
      return withLock(() => {
        const f = findHold(holdId);
        if (!f) throw new LedgerError('release refused (unknown_hold)');
        if (f.hold.status === 'released') return { ok: true, duplicate: true };
        if (f.hold.status !== 'reserved') throw new LedgerError(`release refused (not_releasable: ${f.hold.status})`);
        write(f.path, { ...f.hold, status: 'released', settledAt: now().toISOString(), note: note(f.hold.note, why) });
        return { ok: true };
      });
    },

    /** Owner-only: record the real outcome of an uncertain (or stuck reserved) request. */
    async resolve({ holdId, outcome, actualUsd = null, note: why }) {
      return withLock(() => {
        const f = findHold(holdId);
        if (!f) return { ok: false, reason: 'unknown_hold' };
        if (f.hold.status !== 'uncertain' && f.hold.status !== 'reserved') return { ok: false, reason: 'already_settled', status: f.hold.status };
        const at = now().toISOString();
        if (outcome === 'released') {
          write(f.path, { ...f.hold, status: 'released', settledAt: at, note: note(f.hold.note, `owner: ${why ?? 'released'}`) });
        } else if (outcome === 'charged' && actualUsd !== null && actualUsd >= 0) {
          write(f.path, { ...f.hold, status: 'charged', actualUsd: roundUsd(actualUsd), settledAt: at, note: note(f.hold.note, `owner: ${why ?? 'charged'}`) });
        } else {
          return { ok: false, reason: 'invalid_request' };
        }
        return { ok: true, outcome };
      });
    },

    /** All holds, newest month first (for `scripts/budget.mjs status`). */
    list(month = monthOf(now())) {
      return holdsOf(month).map((x) => x.hold).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    },
  };
}

/**
 * Before a live run: this checkout's ledger must equal the remote branch's ledger and carry no
 * uncommitted history, otherwise another run's spend could be invisible here. Fails closed.
 */
export function createLedgerSync({ cwd = '.', relDir = LEDGER_DIR, env = process.env, run = (args) => spawnSync('git', args, { cwd, encoding: 'utf8' }) } = {}) {
  return {
    async check() {
      const git = (...args) => run(args);
      const inRepo = git('rev-parse', '--is-inside-work-tree');
      if (inRepo.status !== 0) return { ok: false, reason: 'not a git checkout, so the spend ledger cannot be confirmed current' };
      let branch = (git('rev-parse', '--abbrev-ref', 'HEAD').stdout ?? '').trim();
      if (!branch || branch === 'HEAD') branch = (env.GITHUB_REF_NAME ?? '').trim();
      if (!branch) return { ok: false, reason: 'detached checkout without a branch name, so the spend ledger cannot be confirmed current' };
      const dirty = git('status', '--porcelain', '--', relDir);
      if (dirty.status !== 0) return { ok: false, reason: 'could not read the spend ledger state' };
      if (dirty.stdout.trim()) return { ok: false, reason: `${relDir} has uncommitted changes from an earlier run — commit and push them first` };
      const fetched = git('fetch', '--quiet', 'origin', branch);
      if (fetched.status !== 0) return { ok: false, reason: `could not fetch origin/${branch} to confirm the spend ledger is current` };
      const diff = git('diff', '--quiet', 'HEAD', 'FETCH_HEAD', '--', relDir);
      if (diff.status === 1) return { ok: false, reason: `${relDir} differs from origin/${branch} — pull (or push this checkout's ledger) first` };
      if (diff.status !== 0) return { ok: false, reason: 'could not compare the spend ledger with the remote branch' };
      return { ok: true, reason: null, branch };
    },
  };
}
