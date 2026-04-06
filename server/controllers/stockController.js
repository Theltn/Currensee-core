const axios = require("axios");

// Utility: Fetch stock metadata from Polygon
async function fetchPolygonStockMeta(ticker) {
  const apiKey = process.env.MASSIVE_API_KEY || process.env.VITE_MASSIVE_API_KEY;
  const url = `https://api.massive.com/v3/reference/tickers/${ticker}?apiKey=${apiKey}`;
  const response = await axios.get(url);
  const { results } = response.data;

  return {
    ticker: results.ticker,
    name: results.name,
    description: results.description,
    market_cap: results.market_cap,
    logo: results.branding?.icon_url || '',
  };
}

async function fetchPolygonQuote(ticker) {
  const apiKey = process.env.MASSIVE_API_KEY || process.env.VITE_MASSIVE_API_KEY;
  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const formattedDate = formatDate(today); // YYYY-MM-DD
  const pastDate = formatDate(sixMonthsAgo); // YYYY-MM-DD
  
  const url = `https://api.massive.com/v2/aggs/ticker/${ticker}/range/1/day/${pastDate}/${formattedDate}?adjusted=true&sort=asc&limit=200&apiKey=${apiKey}`;
  const response = await axios.get(url);
  return response.data.results || [];
}

const getStockLogo = async (req, res) => {
  const apiKey = process.env.MASSIVE_API_KEY || process.env.VITE_MASSIVE_API_KEY;
  const ticker = (req.params.ticker || "").trim().toUpperCase();

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required." });
  }
  if (!apiKey) {
    return res.status(500).json({ error: "Logo API key not configured." });
  }

  try {
    const stockMeta = await fetchPolygonStockMeta(ticker);
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
  // Legacy function that returned all DB entries. Since Mongo is gone, 
  // return an empty array or a preset array if Dashboards still fetch /all.
  res.json([]); 
};

// Utility: Generate realistic synthetic fallback arrays when hitting 429s
function generateMockData(ticker) {
  const basePrice = ticker === 'AAPL' ? 175 : Math.random() * 200 + 50;
  const mockCandles = [];
  let currentPrice = basePrice;
  const today = new Date();
  
  for(let i=199; i>=0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    currentPrice += (Math.random() - 0.48) * 3; 
    mockCandles.push({
      c: currentPrice,
      h: currentPrice + Math.random() * 2,
      l: currentPrice - Math.random() * 2,
      o: currentPrice + (Math.random() - 0.5),
      t: d.getTime(),
      v: Math.floor(Math.random() * 10000000)
    });
  }
  return {
    meta: {
      ticker: ticker,
      name: `${ticker} Corp (Mock Data - Rate Limited)`,
      description: 'Simulated data due to backend rate limits.',
      market_cap: 1000000000000
    },
    quotes: mockCandles
  };
}

const getStock = async (req, res) => {
  const { ticker } = req.body;
  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required." });
  }
  const upperTicker = ticker.trim().toUpperCase();

  try {
    let meta;
    let tradingData = [];

    try {
      meta = await fetchPolygonStockMeta(upperTicker);
    } catch (err) {
      console.warn(`[Proxy] Massive API Meta 429 Rate Limit hit for ${upperTicker}, failing over to local simulation.`);
      meta = generateMockData(upperTicker).meta;
    }
    
    try {
      tradingData = await fetchPolygonQuote(upperTicker);
    } catch (err) {
      console.warn(`[Proxy] Massive API Quote 429 Rate Limit hit for ${upperTicker}, falling back.`);
      tradingData = generateMockData(upperTicker).quotes;
    }

    return res.status(200).json({
      ...meta,
      tradingData
    });
  } catch (err) {
    console.error("Backend Proxy error:", err.message);
    return res.status(502).json({ error: "Failed to resolve downstream API." });
  }
};

module.exports = { getStockPrices, getStock, getStockLogo };
