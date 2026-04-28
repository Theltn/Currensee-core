const axios = require("axios");

// ═══════════════════════════════════════
// In-memory cache to avoid 429 rate limits
// ═══════════════════════════════════════
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes — Massive free tier is ~5 req/min

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// Serialize concurrent requests for the same ticker
const inflightRequests = new Map();

async function dedupedFetch(key, fetchFn) {
  // Return cached data if fresh
  const cached = getCached(key);
  if (cached) return cached;

  // If another request for this key is already in flight, wait for it
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  const promise = fetchFn()
    .then(data => {
      setCache(key, data);
      inflightRequests.delete(key);
      return data;
    })
    .catch(err => {
      inflightRequests.delete(key);
      throw err;
    });

  inflightRequests.set(key, promise);
  return promise;
}

// ═══════════════════════════════════════
// Massive API helpers
// ═══════════════════════════════════════

function getApiKey() {
  return process.env.MASSIVE_API_KEY || process.env.VITE_MASSIVE_API_KEY;
}

async function fetchStockMeta(ticker) {
  const apiKey = getApiKey();
  const url = `https://api.massive.com/v3/reference/tickers/${ticker}?apiKey=${apiKey}`;
  const response = await axios.get(url, { timeout: 10000 });
  const { results } = response.data;

  return {
    ticker: results.ticker,
    name: results.name,
    description: results.description,
    market_cap: results.market_cap,
    logo: results.branding?.icon_url || '',
  };
}

async function fetchStockQuote(ticker) {
  const apiKey = getApiKey();
  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const url = `https://api.massive.com/v2/aggs/ticker/${ticker}/range/1/day/${formatDate(sixMonthsAgo)}/${formatDate(today)}?adjusted=true&sort=asc&limit=200&apiKey=${apiKey}`;
  const response = await axios.get(url, { timeout: 10000 });
  return response.data.results || [];
}

// ═══════════════════════════════════════
// Route handlers
// ═══════════════════════════════════════

const getStockLogo = async (req, res) => {
  const apiKey = getApiKey();
  const ticker = (req.params.ticker || "").trim().toUpperCase();

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required." });
  }
  if (!apiKey) {
    return res.status(500).json({ error: "Logo API key not configured." });
  }

  try {
    const stockMeta = await dedupedFetch(`meta:${ticker}`, () => fetchStockMeta(ticker));
    if (!stockMeta?.logo) {
      return res.status(404).json({ error: "Logo not found for ticker." });
    }

    const logoUrl = new URL(stockMeta.logo);
    logoUrl.searchParams.set("apiKey", apiKey);

    const response = await axios.get(logoUrl.toString(), {
      responseType: "arraybuffer",
      timeout: 10000,
    });

    const contentType = response.headers["content-type"] || "image/png";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(Buffer.from(response.data));
  } catch (error) {
    const status = error.response?.status || 502;
    console.error("Error fetching logo:", error.response?.data || error.message);
    return res.status(status).json({ error: "Failed to fetch logo." });
  }
};

const getStockPrices = async (req, res) => {
  res.json([]); 
};

// Batch endpoint for ticker tape — fetches multiple tickers in one request
// with staggered delays to avoid Massive API rate limits
const getBatchQuotes = async (req, res) => {
  const { tickers } = req.body;
  if (!Array.isArray(tickers) || tickers.length === 0) {
    return res.status(400).json({ error: 'tickers array is required' });
  }

  const results = [];
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  for (const raw of tickers.slice(0, 15)) {
    const t = raw.trim().toUpperCase();
    try {
      // Check if already cached (no upstream call needed)
      const wasCached = !!getCached(`quote:${t}`);
      const tradingData = await dedupedFetch(`quote:${t}`, () => fetchStockQuote(t));
      if (tradingData && tradingData.length >= 2) {
        const latest = tradingData[tradingData.length - 1].c;
        const prev = tradingData[tradingData.length - 2].c;
        results.push({
          symbol: t,
          price: latest,
          change: ((latest - prev) / prev) * 100,
        });
      }
      // Only delay if we actually hit the upstream API
      if (!wasCached) await delay(1200);
    } catch (err) {
      console.warn(`[Batch] Skipping ${t}: ${err.message}`);
      // Delay even on error to avoid hammering the upstream
      await delay(1200);
    }
  }

  res.json(results);
};

const getStock = async (req, res) => {
  const { ticker } = req.body;
  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required." });
  }
  const upperTicker = ticker.trim().toUpperCase();

  try {
    // Use deduped + cached fetch to avoid 429 rate limits
    const [meta, tradingData] = await Promise.all([
      dedupedFetch(`meta:${upperTicker}`, () => fetchStockMeta(upperTicker))
        .catch(err => {
          console.warn(`[API] Meta fetch failed for ${upperTicker}: ${err.response?.status || err.message}`);
          return { ticker: upperTicker, name: upperTicker, description: '', market_cap: null };
        }),
      dedupedFetch(`quote:${upperTicker}`, () => fetchStockQuote(upperTicker))
        .catch(err => {
          console.warn(`[API] Quote fetch failed for ${upperTicker}: ${err.response?.status || err.message}`);
          return [];
        }),
    ]);

    return res.status(200).json({
      ...meta,
      tradingData,
    });
  } catch (err) {
    console.error("Backend Proxy error:", err.message);
    return res.status(502).json({ error: "Failed to resolve downstream API." });
  }
};

module.exports = { getStockPrices, getStock, getStockLogo, getBatchQuotes };

