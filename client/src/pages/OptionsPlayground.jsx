import React, { useState } from 'react';
import { auth } from '../firebase';

const OptionsPlayground = () => {
  const [ticker, setTicker] = useState('AAPL');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStockData = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    setError(null);

    try {
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/stocks/${ticker.toUpperCase()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticker: ticker.toUpperCase() })
      });
      const data = await res.json();

      if (data.error || !data.tradingData || data.tradingData.length === 0) {
        setError(data.error || 'Failed to fetch real-time market data.');
        setLoading(false);
        return;
      }

      const livePrice = data.tradingData[data.tradingData.length - 1].c;
      const increment = livePrice > 100 ? 5 : 2.5;
      const base = livePrice;
      
      setStockData({
        ticker: ticker.toUpperCase(),
        name: data.name || `${ticker.toUpperCase()} Corporation`,
        price: livePrice,
        marketCap: data.market_cap || "N/A",
        increment,
        options: [-2, -1, 0, 1, 2].map(i => {
          const strike = Math.round(base / increment) * increment + (i * increment);
          return {
            strike: strike,
            callRef: (Math.max(0.5, 3 - i * 0.5) + Math.random()).toFixed(2),
            putRef: (Math.max(0.5, 3 + i * 0.5) + Math.random()).toFixed(2),
          };
        })
      });
    } catch (err) {
      setError('Network error while querying backend proxy.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      fetchStockData();
    }
  };

  return (
    <div className="page-container">
      <h1 className="section-heading" style={{ marginBottom: '4px' }}>Options Playground</h1>
      <p style={{ marginBottom: 'var(--space-lg)', fontSize: '13px' }}>
        Search a ticker to view simulated near-the-money options chain with live prices.
      </p>
      
      {/* Search Bar */}
      <div className="options-search-bar fade-in-up">
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Enter ticker (e.g. AAPL)"
            className="input-modern"
          />
          <button onClick={handleSearch} className="btn-primary" style={{ flexShrink: 0 }}>
            Search
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: '250px', borderRadius: 'var(--radius-lg)' }} />
        </div>
      )}

      {error && (
        <div className="alert-error">{error}</div>
      )}

      {!loading && !error && stockData && (
        <>
          {/* Stock Overview */}
          <div className="stock-overview fade-in-up">
            <h2 style={{ margin: '0 0 14px', fontSize: '18px' }}>{stockData.name} ({stockData.ticker})</h2>
            <div className="stock-overview-stats">
              <div className="stat-card">
                <div className="stat-label">Current Price</div>
                <div className="stat-value price-up">${stockData.price.toFixed(2)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Strike Increment</div>
                <div className="stat-value">${stockData.increment.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* Options Chain Table */}
          <div className="options-chain-wrap fade-in-up stagger-2">
            <div className="options-chain-header">
              <h3>Options Chain (Near-the-Money)</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="options-table">
                <thead>
                  <tr>
                    <th colSpan={2} className="call-header" style={{ borderRight: '1px solid var(--border-subtle)' }}>Calls</th>
                    <th>Strike</th>
                    <th colSpan={2} className="put-header" style={{ borderLeft: '1px solid var(--border-subtle)' }}>Puts</th>
                  </tr>
                  <tr>
                    <th>Opt Price</th>
                    <th style={{ borderRight: '1px solid var(--border-subtle)' }}>Action</th>
                    <th>$</th>
                    <th style={{ borderLeft: '1px solid var(--border-subtle)' }}>Opt Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.options.map((opt, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>${opt.callRef}</td>
                      <td className="divider">
                        <button className="btn-trade-call">Buy Call</button>
                      </td>
                      <td className="strike-col">${opt.strike}</td>
                      <td className="divider-left" style={{ fontWeight: 600 }}>${opt.putRef}</td>
                      <td>
                        <button className="btn-trade-put">Buy Put</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !error && !stockData && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Search for a stock</h3>
          <p>Enter a ticker symbol above to view its simulated options chain</p>
        </div>
      )}

    </div>
  );
};

export default OptionsPlayground;
