const axios = require("axios");

// Utility: Fetch stock metadata from Polygon
async function fetchPolygonStockMeta(ticker) {
  const apiKey = process.env.POLYGON_API_KEY || process.env.VITE_POLYGON_API_KEY;
  const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${apiKey}`;
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
  const apiKey = process.env.POLYGON_API_KEY || process.env.VITE_POLYGON_API_KEY;
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
  
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${pastDate}/${formattedDate}?adjusted=true&sort=asc&limit=200&apiKey=${apiKey}`;
  const response = await axios.get(url);
  return response.data.results || [];
}

const getStockLogo = async (req, res) => {
  const apiKey = process.env.POLYGON_API_KEY || process.env.VITE_POLYGON_API_KEY;
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

// POST /api/stocks — proxys the polygon logic without syncing into local DB
const getStock = async (req, res) => {
  const { ticker } = req.body;

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required." });
  }
  const upperTicker = ticker.trim().toUpperCase();

  try {
    const meta = await fetchPolygonStockMeta(upperTicker);
    let tradingData = [];
    
    try {
      tradingData = await fetchPolygonQuote(upperTicker);
    } catch (err) {
      console.warn("Polygon trading data fetch failed (non-blocking):", err.message);
    }

    return res.status(200).json({
      ...meta,
      tradingData
    });
  } catch (err) {
    console.error("Polygon API error:", err.response?.data || err.message);
    return res.status(502).json({ error: "Failed to fetch data from Polygon API." });
  }
};

module.exports = { getStockPrices, getStock, getStockLogo };
