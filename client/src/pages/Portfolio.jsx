import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

// Simple mock for initial placeholder, but we map fetch to the robust Node backend in the future
const Portfolio = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  const [data, setData] = useState({
    account: { equity: 0, cash: 0, totalPL: 0 },
    holdings: [],
  });

  const [loading, setLoading] = useState(true);

  // Fallback / Initial State for development simulation matching portfolio.html logic
  useEffect(() => {
    // We would fetch this from /users/getPositions
    setTimeout(() => {
      setData({
        account: { equity: 15450.00, cash: 450.00, totalPL: 5450.00 },
        holdings: [
          { ticker: 'AAPL', name: 'Apple Inc.', shares: 50, avgCost: 150, currentPrice: 175, mv: 8750, totPL: 1250, alloc: 58.33 },
          { ticker: 'GOOGL', name: 'Alphabet', shares: 20, avgCost: 2800, currentPrice: 2900, mv: 5800, totPL: 2000, alloc: 38.66 },
          { ticker: 'TSLA', name: 'Tesla', shares: 2, avgCost: 200, currentPrice: 225, mv: 450, totPL: 50, alloc: 3.01 }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    if (!loading && chartRef.current && data.holdings.length > 0) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const labels = data.holdings.map(h => h.ticker);
      const allocData = data.holdings.map(h => h.alloc);

      chartInstance.current = new Chart(chartRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: allocData,
            borderWidth: 0,
            hoverOffset: 4,
            backgroundColor: [
              'rgba(0,179,179,.8)', 'rgba(61,168,245,.8)', 'rgba(62,199,167,.8)',
              'rgba(0,179,179,.55)', 'rgba(61,168,245,.55)'
            ]
          }]
        },
        options: {
          plugins: { legend: { display: true, position: 'bottom', labels: { color: '#b8c7cc' } } },
          cutout: '62%',
        }
      });
    }

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [loading, data]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div style={{ maxWidth: '1380px', margin: '22px auto 40px', padding: '0 20px', color: '#e6f0f2' }}>
      
      {/* Summary KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '14px' }}>
        <div style={{ gridColumn: 'span 3', background: '#0f141a', border: '1px solid #1d2a36', borderRadius: '16px', padding: '14px', boxShadow: '0 10px 30px rgba(0, 0, 0, .45)' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.08em', color: '#b8c7cc' }}>Net Account Value</h4>
          <div style={{ fontSize: '26px', fontWeight: '800' }}>{loading ? '—' : fmt(data.account.equity)}</div>
          <div style={{ fontSize: '12px', color: '#b8c7cc' }}>
            Total P/L: <span style={{ color: data.account.totalPL >= 0 ? '#57d69a' : '#ff5f73' }}>{loading ? '—' : fmt(data.account.totalPL)}</span>
          </div>
        </div>

        <div style={{ gridColumn: 'span 3', background: '#0f141a', border: '1px solid #1d2a36', borderRadius: '16px', padding: '14px', boxShadow: '0 10px 30px rgba(0, 0, 0, .45)' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.08em', color: '#b8c7cc' }}>Cash</h4>
          <div style={{ fontSize: '26px', fontWeight: '800' }}>{loading ? '—' : fmt(data.account.cash)}</div>
        </div>

        <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', background: '#12161d', border: '1px solid #1d2a36', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, .45)', overflow: 'hidden' }}>
          <h3 style={{ margin: 0, fontSize: '16px', padding: '14px 16px', borderBottom: '1px solid #1d2a36', color: '#b8c7cc' }}>Allocation</h3>
          <div style={{ padding: '10px 14px 14px', display: 'flex', justifyContent: 'center' }}>
             <div style={{ height: '120px', width: '240px' }}>
                <canvas ref={chartRef}></canvas>
             </div>
          </div>
        </div>
      </div>

      {/* Main Holdings Grid */}
      <div style={{ marginTop: '14px' }}>
        <div style={{ background: '#12161d', border: '1px solid #1d2a36', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, .45)', overflow: 'hidden' }}>
          <h3 style={{ margin: 0, fontSize: '16px', padding: '14px 16px', borderBottom: '1px solid #1d2a36', color: '#b8c7cc' }}>Holdings</h3>
          <div style={{ padding: '10px 14px 14px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0d131a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.06em', color: '#b8c7cc' }}>
                  <th style={{ padding: '10px', borderBottom: '1px solid #1d2a36' }}>Ticker</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #1d2a36' }}>Name</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #1d2a36', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #1d2a36', textAlign: 'right' }}>Avg Cost</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #1d2a36', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #1d2a36', textAlign: 'right' }}>Market Value</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #1d2a36', textAlign: 'right' }}>Total P/L</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #1d2a36', textAlign: 'right' }}>Alloc %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#b8c7cc', padding: '20px' }}>Loading Portfolio...</td>
                    </tr>
                ) : data.holdings.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#b8c7cc', padding: '20px' }}>No positions found</td>
                    </tr>
                ) : (
                  data.holdings.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1d2a36', whiteSpace: 'nowrap' }}>
                      <td style={{ padding: '10px' }}><strong>{h.ticker}</strong></td>
                      <td style={{ padding: '10px' }}>{h.name}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{h.shares}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(h.avgCost)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(h.currentPrice)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(h.mv)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: h.totPL >= 0 ? '#57d69a' : '#ff5f73' }}>
                        {h.totPL >= 0 ? '+' : '-'}{fmt(Math.abs(h.totPL))}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{h.alloc.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                {data.holdings.length > 0 && !loading && (
                  <tr style={{ background: '#0d131a' }}>
                    <th colSpan="5" style={{ padding: '10px', textAlign: 'right' }}>Totals</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>{fmt(data.holdings.reduce((sum, h) => sum + h.mv, 0))}</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: data.account.totalPL >= 0 ? '#57d69a' : '#ff5f73' }}>
                        {data.account.totalPL >= 0 ? '+' : '-'}{fmt(Math.abs(data.account.totalPL))}
                    </th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>100%</th>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Portfolio;
