import { apiFetch } from '../hooks/useApi';

// Client-side cache for /stocks/:ticker responses to spare the Massive API free tier.
// Educational paper trading — minute-level freshness is not needed.

const STORAGE_KEY = 'currensee:stockCache:v1';
const TTL_MS = 30 * 60 * 1000; // 30 minutes

function readMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Quota exceeded or storage disabled — drop oldest entries and retry once
    try {
      const trimmed = Object.entries(map)
        .sort((a, b) => b[1].ts - a[1].ts)
        .slice(0, 10)
        .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch { /* give up silently */ }
  }
}

export function getCachedStock(ticker) {
  const key = String(ticker).toUpperCase();
  const map = readMap();
  const entry = map[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) return null;
  return entry.data;
}

export function setCachedStock(ticker, data) {
  const key = String(ticker).toUpperCase();
  const map = readMap();
  map[key] = { data, ts: Date.now() };
  writeMap(map);
}

/**
 * Fetch /stocks/:ticker with localStorage caching.
 * @param {string} ticker
 * @param {{ force?: boolean }} [opts] — pass { force: true } to bypass cache (e.g. user-triggered refresh)
 */
export async function fetchStockCached(ticker, opts = {}) {
  const upper = String(ticker).trim().toUpperCase();
  if (!opts.force) {
    const cached = getCachedStock(upper);
    if (cached) return cached;
  }

  const res = await apiFetch(`/stocks/${upper}`, {
    method: 'POST',
    body: JSON.stringify({ ticker: upper }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch ${upper}`);
  }
  const data = await res.json();
  if (data?.tradingData?.length > 0) {
    setCachedStock(upper, data);
  }
  return data;
}

export function clearStockCache() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}
