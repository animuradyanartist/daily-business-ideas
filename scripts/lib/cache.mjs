// File-backed evidence cache, committed to the repo by the workflow so it survives
// between GitHub Actions runs.
//
// Its only job is "never pay twice for the same fact". Entries are keyed on the provider
// question (endpoint + market + normalized query), not on the idea, so the same keyword
// researched for two different ideas — or re-researched on a retry — is served free
// while fresh. TTLs follow how fast each fact actually changes: Google volume is a
// monthly figure, rankings and pricing pages move faster.
//
// A keyword the provider returned NO data for is cached too ("absent"), so an unmeasured
// keyword is not bought again every day. Absent is stored as absent, never as zero.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const TTL_DAYS = {
  keywords: 30, // Labs keyword_overview — monthly data
  ads: 30, // Google Ads search_volume fallback — monthly data
  serp: 14, // live organic results
  pages: 14, // competitor pages
  market: 30, // Labs locations_and_languages support check
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  renameSync(tmp, path);
}

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

export function createFileCache(dir, { now = () => new Date() } = {}) {
  const buckets = {};
  const dirty = new Set();

  function bucket(name) {
    if (!buckets[name]) buckets[name] = readJson(join(dir, `${name}.json`), { version: 1, entries: {} });
    return buckets[name];
  }

  return {
    /** Fresh entry or null. */
    get(name, key) {
      const e = bucket(name).entries[key];
      if (!e) return null;
      const age = now().getTime() - Date.parse(e.fetchedAt);
      if (!Number.isFinite(age) || age >= (TTL_DAYS[name] ?? 7) * DAY_MS) return null;
      return e;
    },

    set(name, key, value, fetchedAt = now().toISOString()) {
      bucket(name).entries[key] = { fetchedAt, ...value };
      dirty.add(name);
    },

    /** Write changed buckets, dropping entries far past their TTL so the repo stays small. */
    save() {
      for (const name of dirty) {
        const b = bucket(name);
        const limit = (TTL_DAYS[name] ?? 7) * 3 * DAY_MS;
        for (const [k, e] of Object.entries(b.entries)) {
          if (now().getTime() - Date.parse(e.fetchedAt) > limit) delete b.entries[k];
        }
        writeJsonAtomic(join(dir, `${name}.json`), b);
      }
      dirty.clear();
    },
  };
}

/** Charges that were paid but could not be written to the shared ledger yet. */
export function createOutbox(path) {
  return {
    list() {
      return readJson(path, { entries: [] }).entries ?? [];
    },
    add(entry) {
      const cur = this.list();
      if (!cur.some((e) => e.id === entry.id)) cur.push(entry);
      writeJsonAtomic(path, { entries: cur });
    },
    replace(entries) {
      writeJsonAtomic(path, { entries });
    },
  };
}

export const cacheKeys = {
  ads: (market, keyword) => `ads|${market.locationName.toLowerCase()}|${market.languageCode.toLowerCase()}|${keyword}`,
  keyword: (market, keyword) => `labs|${market.locationName.toLowerCase()}|${market.languageCode.toLowerCase()}|${keyword}`,
  serp: (market, query, depth) => `serp|${market.locationName.toLowerCase()}|${market.languageCode.toLowerCase()}|d${depth}|${query}`,
  market: (market) => `${market.locationName.toLowerCase()}|${market.languageCode.toLowerCase()}`,
  page: (url) => `page|${url}`,
};
