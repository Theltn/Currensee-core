import React, { useEffect, useState, useRef } from 'react';

const TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY'];
const CACHE_KEY = 'currensee_ticker_cache';
const CACHE_TTL = 60 * 1000; // 1 minute

const TickerTape = () => {
  const [data, setData] = useState([]);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          setData(parsed.data);
          return;
        }
      } catch (e) { /* ignore bad cache */ }
    }

    // Fetch live prices
    const fetchPrices = async () => {
      const results = [];
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

      for (const ticker of TICKERS) {
        try {
          const res = await fetch(`${backendUrl}/stocks/${ticker}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker }),
          });
          const json = await res.json();
          if (json.tradingData && json.tradingData.length >= 2) {
            const td = json.tradingData;
            const latest = td[td.length - 1].c;
            const prev = td[td.length - 2].c;
            const change = ((latest - prev) / prev) * 100;
            results.push({
              symbol: ticker,
              price: latest,
              change: change,
            });
          }
        } catch (e) {
          // Skip failed tickers
        }
      }

      if (results.length > 0) {
        setData(results);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data: results,
        }));
      }
    };

    fetchPrices();
  }, []);

  if (data.length === 0) return null;

  // Duplicate data for seamless infinite scroll
  const doubled = [...data, ...data];

  return (
    <div className="ticker-tape">
      <div className="ticker-tape-track">
        {doubled.map((item, i) => (
          <span className="ticker-item" key={i}>
            <span className="ticker-item-symbol">{item.symbol}</span>
            <span className="ticker-item-price">${item.price.toFixed(2)}</span>
            <span
              className="ticker-item-change"
              style={{ color: item.change >= 0 ? 'var(--color-gain)' : 'var(--color-loss)' }}
            >
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default TickerTape;
