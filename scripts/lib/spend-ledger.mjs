// Scout's own DataForSEO spend ledger — kept on a dedicated branch of THIS GitHub repository
// (default `scout-spend-ledger`). No database, no other product's infrastructure.
//
// Reserve → call → settle, where every step is a commit PUSHED to GitHub before Scout moves on:
//
//   <ledger branch>:holds/<YYYY-MM>/<holdId>.json      status: reserved | charged | released | uncertain
//
// DURABLE BEFORE SPENDING. `reserve` returns ok only after GitHub has accepted the commit that
// adds the reservation. A runner that dies after that point cannot lose it: the reservation is
// already on GitHub and keeps counting; once past its expiry it counts as `uncertain` until the
// owner resolves it (`scripts/budget.mjs resolve`).
//
// NO DOUBLE-SPENDING OF THE SAME ALLOWANCE. Each change is built on the ledger tip Scout just read
// and pushed as a fast-forward. If any other run pushed first, GitHub rejects the push; Scout then
// re-reads the new tip, re-checks the allowance including the other run's reservation, and tries
// again. Simultaneous runs therefore see each other's reservations before they spend. On one
// machine a lock file in the git directory also serializes processes sharing a checkout.
//
// WHAT THIS ENFORCES — for Scout only:
//   - a monthly allowance (SCOUT_DFS_MONTHLY_USD_CAP; unset = no allowance, nothing is bought)
//   - a per-request limit (SCOUT_DFS_MAX_REQUEST_USD, default $0.10)
//   - a per-run limit (SCOUT_DFS_MAX_RUN_USD, default $0.10 — enforced in enrich.mjs)
// It does NOT see or limit anything else that uses the same DataForSEO account.
// It fails closed: an unreachable GitHub, a missing ledger branch or an unreadable file → nothing bought.

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

export const DEFAULT_LEDGER_BRANCH = 'scout-spend-ledger';
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
    ledgerRemote: (env.SCOUT_LEDGER_REMOTE ?? '').trim() || 'origin',
    ledgerBranch: (env.SCOUT_LEDGER_BRANCH ?? '').trim() || DEFAULT_LEDGER_BRANCH,
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
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export class LedgerError extends Error {
  /** `permanent`: the ledger refused the change (it will never succeed as sent) — not a connection problem. */
  constructor(message, { permanent = false } = {}) {
    super(message);
    this.name = 'LedgerError';
    this.permanent = permanent;
  }
}
const refused = (message) => new LedgerError(message, { permanent: true });
const NETWORK_TIMEOUT_MS = 60_000;
const NETWORK_COMMANDS = new Set(['ls-remote', 'fetch', 'push']);

/** A reservation past its expiry was never settled (crashed run): it counts as uncertain. */
export const effectiveStatus = (hold, at) => (hold.status === 'reserved' && Date.parse(hold.expiresAt) < at.getTime() ? 'uncertain' : hold.status);

export function createGitLedger({
  cwd = '.',
  remote = 'origin',
  branch = DEFAULT_LEDGER_BRANCH,
  capUsd,
  maxRequestUsd = DEFAULT_MAX_REQUEST_USD,
  now = () => new Date(),
  maxAttempts = 10,
  lockWaitMs = 240_000,
  staleLockMs = 180_000,
  env = process.env,
} = {}) {
  const localRef = `refs/scout-ledger/${branch}`;
  const gitEnv = {
    ...env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_HTTP_LOW_SPEED_LIMIT: '1000', // abort a stalled HTTPS transfer (bytes/s) …
    GIT_HTTP_LOW_SPEED_TIME: '30', // … after 30 s
    GIT_AUTHOR_NAME: 'Scout spend ledger',
    GIT_AUTHOR_EMAIL: 'actions@users.noreply.github.com',
    GIT_COMMITTER_NAME: 'Scout spend ledger',
    GIT_COMMITTER_EMAIL: 'actions@users.noreply.github.com',
  };

  function git(args, { input, allowFail = false, extraEnv = null, binary = false } = {}) {
    const r = spawnSync('git', args, {
      cwd,
      input,
      env: extraEnv ? { ...gitEnv, ...extraEnv } : gitEnv,
      ...(binary ? {} : { encoding: 'utf8' }),
      maxBuffer: 256 * 1024 * 1024,
      ...(NETWORK_COMMANDS.has(args[0]) ? { timeout: NETWORK_TIMEOUT_MS, killSignal: 'SIGKILL' } : {}),
    });
    if (r.error && allowFail && r.error.code === 'ETIMEDOUT') return { ...r, status: -1, stderr: `timed out after ${NETWORK_TIMEOUT_MS / 1000}s` };
    if (r.error) throw new LedgerError(`git ${args[0]} could not run (${r.error.code ?? r.error.message})`);
    if (r.status !== 0 && !allowFail) {
      const last = String(r.stderr ?? '').trim().split('\n').pop();
      throw new LedgerError(`git ${args[0]} failed${last ? `: ${last}` : ''}`);
    }
    return r;
  }

  function lockPath() {
    const d = git(['rev-parse', '--git-common-dir']).stdout.trim();
    return join(isAbsolute(d) ? d : join(cwd, d), 'scout-spend-ledger.lock');
  }

  // Serializes processes sharing ONE checkout (the fast-forward push protects everything else).
  // The lock file holds an owner token: only its owner removes it, and a lock is considered
  // abandoned once it has not been refreshed for `staleLockMs`.
  const token = `${process.pid}-${randomBytes(8).toString('hex')}`;
  let heldLock = null;
  const touchLock = () => {
    if (heldLock) {
      try {
        const t = new Date();
        utimesSync(heldLock, t, t);
      } catch {
        /* ignore */
      }
    }
  };

  async function withLock(fn) {
    const path = lockPath();
    const started = Date.now();
    for (;;) {
      try {
        writeFileSync(path, token, { flag: 'wx' });
        break;
      } catch (err) {
        if (err.code !== 'EEXIST') throw new LedgerError(`ledger lock failed (${err.code})`);
        try {
          if (Date.now() - statSync(path).mtimeMs > staleLockMs) {
            const stale = readFileSync(path, 'utf8');
            // Re-check just before removing, so a lock another waiter already replaced is left alone.
            if (readFileSync(path, 'utf8') === stale) rmSync(path, { force: true });
          }
        } catch {
          /* lock vanished — retry */
        }
        if (Date.now() - started > lockWaitMs) throw new LedgerError('spend ledger is locked by another Scout process');
        await new Promise((r) => setTimeout(r, 25 + Math.random() * 50));
      }
    }
    heldLock = path;
    try {
      return fn();
    } finally {
      heldLock = null;
      try {
        if (readFileSync(path, 'utf8') === token) rmSync(path, { force: true });
      } catch {
        /* already gone */
      }
    }
  }

  /** The ledger branch's current tip on GitHub (fetched now). Missing branch or no connection → throws. */
  function fetchTip() {
    touchLock();
    const ls = git(['ls-remote', '--heads', remote, `refs/heads/${branch}`], { allowFail: true });
    if (ls.status !== 0) throw new LedgerError(`could not reach ${remote} to read the spend ledger`);
    if (!ls.stdout.trim()) throw new LedgerError(`spend ledger branch "${branch}" was not found on ${remote}`);
    const f = git(['fetch', '--quiet', '--no-tags', remote, `+refs/heads/${branch}:${localRef}`], { allowFail: true });
    if (f.status !== 0) throw new LedgerError(`could not fetch the spend ledger from ${remote}`);
    return git(['rev-parse', '--verify', `${localRef}^{commit}`]).stdout.trim();
  }

  function parseHold(buf, path) {
    let h;
    try {
      h = JSON.parse(buf.toString('utf8'));
    } catch {
      throw new LedgerError(`ledger file is unreadable: ${path}`);
    }
    if (!h || !STATUSES.has(h.status) || typeof h.estimatedUsd !== 'number' || !Number.isFinite(h.estimatedUsd)) {
      throw new LedgerError(`ledger file is malformed: ${path}`);
    }
    return h;
  }

  /** Every hold of a month at `tip`. Throws on any unreadable file: an unknown ledger never reads as zero. */
  function holdsAt(tip, month) {
    const ls = git(['ls-tree', '-r', '-z', tip, '--', `holds/${month}/`]);
    const entries = ls.stdout
      .split('\0')
      .filter(Boolean)
      .map((line) => {
        const tab = line.indexOf('\t');
        return { oid: line.slice(0, tab).split(' ')[2], path: line.slice(tab + 1) };
      })
      .filter((e) => e.path.endsWith('.json'));
    if (!entries.length) return [];
    const out = git(['cat-file', '--batch'], { input: entries.map((e) => e.oid).join('\n') + '\n', binary: true }).stdout;
    const holds = [];
    let pos = 0;
    for (const e of entries) {
      const nl = out.indexOf(0x0a, pos);
      const size = Number(out.subarray(pos, nl).toString('utf8').split(' ')[2]);
      holds.push(parseHold(out.subarray(nl + 1, nl + 1 + size), e.path));
      pos = nl + 1 + size + 1;
    }
    return holds;
  }

  function findHold(tip, id) {
    if (!SAFE_ID.test(String(id))) return null;
    const names = git(['ls-tree', '-r', '--name-only', '-z', tip, '--', 'holds/']).stdout.split('\0');
    const path = names.find((p) => p.endsWith(`/${id}.json`));
    if (!path) return null;
    return { path, hold: parseHold(git(['cat-file', 'blob', `${tip}:${path}`], { binary: true }).stdout, path) };
  }

  function totals(holds, at) {
    let charged = 0;
    let held = 0;
    let open = 0;
    let uncertain = 0;
    for (const h of holds) {
      const s = effectiveStatus(h, at);
      if (s === 'charged') charged += h.actualUsd ?? h.estimatedUsd;
      else if (s === 'reserved' || s === 'uncertain') {
        held += h.estimatedUsd;
        if (s === 'reserved') open++;
        else uncertain++;
      }
    }
    return { chargedUsd: roundUsd(charged), heldUsd: roundUsd(held), openHolds: open, uncertainHolds: uncertain };
  }

  /** Commit one file on top of `tip` and push it as a fast-forward. false = someone else pushed first. */
  function commitAndPush(tip, path, hold, message) {
    const blob = git(['hash-object', '-w', '--stdin'], { input: JSON.stringify(hold, null, 2) + '\n' }).stdout.trim();
    const index = join(tmpdir(), `scout-ledger-index-${process.pid}-${randomBytes(6).toString('hex')}`);
    try {
      const idx = { GIT_INDEX_FILE: index };
      git(['read-tree', tip], { extraEnv: idx });
      git(['update-index', '--add', '--cacheinfo', `100644,${blob},${path}`], { extraEnv: idx });
      const tree = git(['write-tree'], { extraEnv: idx }).stdout.trim();
      const commit = git(['commit-tree', tree, '-p', tip, '-m', message]).stdout.trim();
      const push = git(['push', '--porcelain', remote, `${commit}:refs/heads/${branch}`], { allowFail: true });
      if (push.status === 0) {
        git(['update-ref', localRef, commit]);
        return true;
      }
      const said = `${push.stdout}\n${push.stderr}`;
      // Lost the race (someone else moved the branch first, or updated it at the same instant):
      // re-read and decide again. Any other refusal — a hook, branch protection, missing
      // permission — is not a race and fails immediately.
      const refusal = said.split('\n').find((l) => l.startsWith('!')) ?? said;
      if (/non-fast-forward|fetch first|stale info|cannot lock ref|failed to update ref|incorrect old value|reference already exists/i.test(refusal)) return false;
      if (!said.split('\n').some((l) => l.startsWith('!'))) {
        // No refusal line: the connection failed or timed out, and GitHub may still have applied
        // the push. If our commit is on the branch now, it is recorded — treat it as pushed.
        try {
          const tip = fetchTip();
          if (git(['merge-base', '--is-ancestor', commit, tip], { allowFail: true }).status === 0) return true;
        } catch {
          /* still unreachable — report the original failure */
        }
      }
      throw new LedgerError(`could not push the spend ledger to ${remote} (${said.trim().split('\n').pop()})`);
    } finally {
      rmSync(index, { force: true });
    }
  }

  /**
   * Read the tip, decide, push; on a lost race re-read and decide again. `decide(tip, at)` returns
   * { result } (nothing to write) or { result, write: { path, hold, message } }.
   */
  function mutate(decide) {
    return withLock(() => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const tip = fetchTip();
        const out = decide(tip, now());
        if (!out.write) return out.result;
        if (commitAndPush(tip, out.write.path, out.write.hold, out.write.message)) return out.result;
        sleepSync(50 + Math.floor(Math.random() * 150 * attempt));
      }
      throw new LedgerError(`the spend ledger kept changing on ${remote}; nothing was recorded after ${maxAttempts} attempts`);
    });
  }

  const note = (prev, add) => [prev, add ? String(add).slice(0, 300) : null].filter(Boolean).join('; ') || null;
  const holdPath = (h) => `holds/${h.month}/${h.id}.json`;

  return {
    backend: 'git-ledger',
    configured: capUsd !== null && capUsd !== undefined,
    capUsd,
    maxRequestUsd,
    remote,
    branch,

    async status() {
      return withLock(() => {
        const at = now();
        const month = monthOf(at);
        const t = totals(holdsAt(fetchTip(), month), at);
        return { month, capUsd, maxRequestUsd, ...t, remainingUsd: capUsd == null ? 0 : Math.max(0, roundUsd(capUsd - t.chargedUsd - t.heldUsd)) };
      });
    },

    /** ok: true only once GitHub holds the reservation. */
    async reserve({ holdId, estimatedUsd, endpoint, requestKey = null, maxTotalUsd = null, runId = null, ttlSeconds = 900, allowUncertainRepeat = false }) {
      if (capUsd === null || capUsd === undefined) return { ok: false, reason: 'not_configured' };
      if (!SAFE_ID.test(String(holdId)) || !endpoint || !(estimatedUsd > 0)) return { ok: false, reason: 'invalid_request' };
      if (estimatedUsd > maxRequestUsd + 1e-9) return { ok: false, reason: 'request_limit', maxRequestUsd };
      return mutate((tip, at) => {
        const existing = findHold(tip, holdId);
        if (existing) return { result: { ok: effectiveStatus(existing.hold, at) === 'reserved', duplicate: true, status: effectiveStatus(existing.hold, at) } };
        const month = monthOf(at);
        const holds = holdsAt(tip, month);
        // The same request may already have been charged without an answer (including by a run that
        // crashed after reserving): never re-send it automatically.
        if (requestKey && !allowUncertainRepeat) {
          const previous = monthOf(new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - 1, 1)));
          const doubt = [...holds, ...holdsAt(tip, previous)].find((h) => h.requestKey === requestKey && effectiveStatus(h, at) === 'uncertain');
          if (doubt) return { result: { ok: false, reason: 'uncertain_repeat', holdId: doubt.id, since: doubt.createdAt } };
        }
        const t = totals(holds, at);
        const ceiling = roundUsd(Math.min(capUsd, maxTotalUsd ?? capUsd));
        const detail = { month, capUsd, ceilingUsd: ceiling, chargedUsd: t.chargedUsd, heldUsd: t.heldUsd };
        if (t.chargedUsd + t.heldUsd + estimatedUsd > ceiling + 1e-9) {
          return { result: { ok: false, reason: 'cap', ...detail, remainingUsd: Math.max(0, roundUsd(ceiling - t.chargedUsd - t.heldUsd)) } };
        }
        const ttl = Math.max(60, Math.min(ttlSeconds ?? 900, 3600));
        const hold = {
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
        };
        return {
          result: { ok: true, reason: null, holdId, ...detail, heldUsd: roundUsd(t.heldUsd + estimatedUsd) },
          write: { path: holdPath(hold), hold, message: `reserve ${holdId} ~$${hold.estimatedUsd} ${endpoint}` },
        };
      });
    },

    // Throw on refusal so enrich.mjs routes the update to the outbox and stops buying.
    async settle({ holdId, actualUsd, payload }) {
      if (!(actualUsd >= 0)) throw new LedgerError('settle: invalid actual cost');
      return mutate((tip, at) => {
        const f = findHold(tip, holdId);
        if (!f) throw refused('settle refused (unknown_hold)');
        if (f.hold.status === 'charged') return { result: { ok: true, duplicate: true } };
        if (f.hold.status === 'released') throw refused('settle refused (hold_released)');
        const hold = { ...f.hold, status: 'charged', actualUsd: roundUsd(actualUsd), settledAt: at.toISOString(), payload: payload ?? null };
        return { result: { ok: true, overEstimate: actualUsd > f.hold.estimatedUsd }, write: { path: f.path, hold, message: `charge ${holdId} $${hold.actualUsd}` } };
      });
    },

    async markUncertain({ holdId, note: why }) {
      return mutate((tip) => {
        const f = findHold(tip, holdId);
        if (!f) throw refused('mark uncertain refused (unknown_hold)');
        if (f.hold.status === 'uncertain' || f.hold.status === 'charged') return { result: { ok: true, duplicate: true, status: f.hold.status } };
        if (f.hold.status === 'released') throw refused('mark uncertain refused (hold_released)');
        const hold = { ...f.hold, status: 'uncertain', note: note(f.hold.note, why) };
        return { result: { ok: true }, write: { path: f.path, hold, message: `uncertain ${holdId}` } };
      });
    },

    /**
     * Only for requests that provably were not charged — called by the run that made the reservation
     * (directly, or replayed from its outbox later, possibly past expiry). An uncertain, charged or
     * owner-resolved request is not releasable here.
     */
    async release({ holdId, note: why }) {
      return mutate((tip, at) => {
        const f = findHold(tip, holdId);
        if (!f) throw refused('release refused (unknown_hold)');
        if (f.hold.status === 'released') return { result: { ok: true, duplicate: true } };
        if (f.hold.status !== 'reserved') throw refused(`release refused (not_releasable: ${f.hold.status})`);
        const hold = { ...f.hold, status: 'released', settledAt: at.toISOString(), note: note(f.hold.note, why) };
        return { result: { ok: true }, write: { path: f.path, hold, message: `release ${holdId}` } };
      });
    },

    /** Owner-only: record the real outcome of an uncertain (or stuck reserved) request. */
    async resolve({ holdId, outcome, actualUsd = null, note: why }) {
      return mutate((tip, at) => {
        const f = findHold(tip, holdId);
        if (!f) return { result: { ok: false, reason: 'unknown_hold' } };
        if (f.hold.status !== 'uncertain' && f.hold.status !== 'reserved') return { result: { ok: false, reason: 'already_settled', status: f.hold.status } };
        let hold;
        if (outcome === 'released') hold = { ...f.hold, status: 'released', settledAt: at.toISOString(), note: note(f.hold.note, `owner: ${why ?? 'released'}`) };
        else if (outcome === 'charged' && actualUsd !== null && actualUsd >= 0) hold = { ...f.hold, status: 'charged', actualUsd: roundUsd(actualUsd), settledAt: at.toISOString(), note: note(f.hold.note, `owner: ${why ?? 'charged'}`) };
        else return { result: { ok: false, reason: 'invalid_request' } };
        return { result: { ok: true, outcome }, write: { path: f.path, hold, message: `owner resolve ${holdId} → ${outcome}` } };
      });
    },

    /** A month's holds as they are on GitHub now, with their effective status. */
    async list(month = monthOf(now())) {
      return withLock(() => {
        const at = now();
        return holdsAt(fetchTip(), month)
          .map((h) => ({ ...h, effectiveStatus: effectiveStatus(h, at) }))
          .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      });
    },
  };
}
