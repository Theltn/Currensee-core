import React, { useEffect, useState, useRef } from 'react';

const TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'INTC', 'NFLX'];
const CACHE_KEY = 'currensee_ticker_cache_v3';
const CACHE_TTL = 60 * 1000; // 1 minute
const SCROLL_COPIES = 4; // enough copies for seamless loop on any screen

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

    // Fetch all prices in one batch request
    const fetchPrices = async () => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
      try {
        const res = await fetch(`${backendUrl}/stocks/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: TICKERS }),
        });
        if (!res.ok) return;
        const results = await res.json();

        if (results.length > 0) {
          setData(results);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: results,
          }));
        }
      } catch (e) {
        console.warn('TickerTape fetch failed:', e.message);
      }
    };

    fetchPrices();
  }, []);

  if (data.length === 0) return null;

  // Create multiple copies for seamless infinite scroll
  const items = Array.from({ length: SCROLL_COPIES }, () => data).flat();

  return (
    <div className="ticker-tape">
      <div className="ticker-tape-track" style={{ '--copies': SCROLL_COPIES }}>
        {items.map((item, i) => (
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
