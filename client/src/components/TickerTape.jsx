import React, { useState } from 'react';

const SCROLL_COPIES = 4; // enough copies for seamless loop on any screen

// ─── STATIC FALLBACK DATA ───────────────────────────────────────────
// Live API calls are DISABLED to preserve Massive API quota for
// trading dashboard searches. Re-enable by restoring the fetch logic.
const STATIC_DATA = [
  { symbol: 'AAPL',  price: 213.25, change:  0.74 },
  { symbol: 'GOOGL', price: 176.82, change:  1.12 },
  { symbol: 'MSFT',  price: 430.16, change: -0.38 },
  { symbol: 'AMZN',  price: 191.70, change:  0.55 },
  { symbol: 'TSLA',  price: 172.43, change: -1.25 },
  { symbol: 'META',  price: 510.92, change:  0.89 },
  { symbol: 'NVDA',  price: 875.30, change:  2.31 },
  { symbol: 'SPY',   price: 538.60, change:  0.42 },
  { symbol: 'INTC',  price:  31.05, change: -0.67 },
  { symbol: 'NFLX',  price: 628.14, change:  1.53 },
];

const TickerTape = () => {
  const [data] = useState(STATIC_DATA);

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
