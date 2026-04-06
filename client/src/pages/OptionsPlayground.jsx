import React, { useState } from 'react';

const OptionsPlayground = () => {
  const [ticker, setTicker] = useState('AAPL');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStockData = () => {
    if (!ticker.trim()) return;
    setLoading(true);
    setError(null);

    // Simulated fetch based on legacy optionsPlayground.html mock
    setTimeout(() => {
      const increment = ticker === 'AAPL' ? 5 : 2.5;
      const base = ticker === 'AAPL' ? 175.43 : Math.random() * 300 + 50;
      
      setStockData({
        ticker: ticker.toUpperCase(),
        name: ticker.toUpperCase() === 'AAPL' ? 'Apple Inc.' : `${ticker.toUpperCase()} Corporation`,
        price: base,
        marketCap: 3000000000000,
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
      setLoading(false);
    }, 800);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      fetchStockData();
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', color: '#c9d1d9' }}>
      
      {/* Search Bar */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            onKeyPress={handleSearch}
            placeholder="Enter ticker symbol (e.g. AAPL)"
            style={{ flex: 1, background: '#21262d', border: '1px solid #30363d', color: '#c9d1d9', padding: '10px 14px', borderRadius: '6px' }}
          />
          <button 
            onClick={handleSearch}
            style={{ background: '#238636', color: 'white', border: '1px solid #2ea043', padding: '10px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
          >
            Search
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading options data...</div>
      )}

      {error && (
        <div style={{ background: '#da3633', color: 'white', padding: '14px', borderRadius: '6px', marginBottom: '24px' }}>{error}</div>
      )}

      {!loading && !error && stockData && (
        <>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 16px', color: 'white' }}>{stockData.name} ({stockData.ticker})</h2>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ background: 'rgba(48, 54, 61, 0.5)', padding: '16px', borderRadius: '8px', flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#8b949e' }}>Current Price</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3fb950' }}>${stockData.price.toFixed(2)}</div>
              </div>
              <div style={{ background: 'rgba(48, 54, 61, 0.5)', padding: '16px', borderRadius: '8px', flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#8b949e' }}>Market Cap</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c9d1d9' }}>$3.0T</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', background: 'rgba(48, 54, 61, 0.5)', borderBottom: '1px solid #30363d' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Options Chain (Near-the-Money)</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#21262d', color: '#8b949e', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th colSpan={2} style={{ padding: '12px', borderBottom: '1px solid #30363d', borderRight: '1px solid #30363d', color: '#3fb950' }}>Calls</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #30363d', color: 'white' }}>Strike</th>
                    <th colSpan={2} style={{ padding: '12px', borderBottom: '1px solid #30363d', borderLeft: '1px solid #30363d', color: '#f85149' }}>Puts</th>
                  </tr>
                  <tr style={{ background: '#161b22', color: '#8b949e', fontSize: '12px' }}>
                    <th style={{ padding: '10px', borderBottom: '1px solid #30363d' }}>Opt Price</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #30363d', borderRight: '1px solid #30363d' }}>Action</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #30363d', color: 'white' }}>$</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #30363d', borderLeft: '1px solid #30363d' }}>Opt Price</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #30363d' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.options.map((opt, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #30363d' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>${opt.callRef}</td>
                      <td style={{ padding: '12px', borderRight: '1px solid #30363d' }}>
                        <button style={{ background: '#238636', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>Buy Call</button>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: 'white', background: 'rgba(9, 105, 218, 0.1)' }}>${opt.strike}</td>
                      <td style={{ padding: '12px', borderLeft: '1px solid #30363d', fontWeight: 'bold' }}>${opt.putRef}</td>
                      <td style={{ padding: '12px' }}>
                        <button style={{ background: '#da3633', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>Buy Put</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default OptionsPlayground;
