import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { apiFetch } from '../hooks/useApi';
import { getPortfolio } from '../services/portfolioService';

const Portfolio = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [cash, setCash] = useState(0);
  const [holdings, setHoldings] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── 1. Fetch portfolio from Firestore ──
  useEffect(() => {
    (async () => {
      try {
        const data = await getPortfolio();
        setCash(data.cash);
        setHoldings(data.holdings || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── 2. Fetch live prices for each holding ──
  useEffect(() => {
    if (holdings.length === 0) return;

    const fetchPrices = async () => {
      const prices = {};
      for (const h of holdings) {
        try {
          const res = await apiFetch(`/stocks/${h.ticker}`, {
            method: 'POST',
            body: JSON.stringify({ ticker: h.ticker }),
          });
          const data = await res.json();
          if (data.tradingData && data.tradingData.length > 0) {
            prices[h.ticker] = data.tradingData[data.tradingData.length - 1].c;
          }
        } catch (e) {
          // fall back to avgCost
        }
      }
      setLivePrices(prices);
    };

    fetchPrices();
  }, [holdings]);

  // ── 3. Enrich holdings with live prices ──
  const enriched = holdings.map(h => {
    const currentPrice = livePrices[h.ticker] || h.avgCost;
    const mv = currentPrice * h.shares;
    const costBasis = h.avgCost * h.shares;
    const totPL = mv - costBasis;
    return { ...h, currentPrice, mv, costBasis, totPL };
  });

  const totalMV = enriched.reduce((s, h) => s + h.mv, 0);
  const totalPL = enriched.reduce((s, h) => s + h.totPL, 0);
  const equity = cash + totalMV;

  const withAlloc = enriched.map(h => ({
    ...h,
    alloc: totalMV > 0 ? (h.mv / totalMV) * 100 : 0,
  }));

  // ── 4. Doughnut chart ──
  useEffect(() => {
    if (withAlloc.length === 0 || !chartRef.current) return;

    if (chartInstance.current) chartInstance.current.destroy();

    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: withAlloc.map(h => h.ticker),
        datasets: [{
          data: withAlloc.map(h => h.alloc),
          borderWidth: 0,
          hoverOffset: 4,
          backgroundColor: [
            '#2962ff',
            '#26a69a',
            '#ef5350',
            '#f7931a',
            '#7b61ff',
            '#00bcd4',
            '#ff7043',
          ],
        }],
      },
      options: {
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: '#848e9c', padding: 10, font: { size: 11 } },
          },
        },
        cutout: '68%',
      },
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [withAlloc.length, livePrices]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (loading) {
    return (
      <div className="page-container page-container--narrow">
        <h1 className="section-heading" style={{ marginBottom: '16px' }}>Portfolio</h1>
        <div className="portfolio-kpi-grid">
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" style={{ height: '200px' }} />
        </div>
        <div className="skeleton" style={{ height: '300px', marginTop: '16px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container page-container--narrow">
        <div className="alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-container page-container--narrow">
      <h1 className="section-heading" style={{ marginBottom: '16px' }}>Portfolio</h1>

      {/* KPI Row */}
      <div className="portfolio-kpi-grid">
        <div className="kpi-card fade-in-up stagger-1">
          <div className="kpi-label">Net Account Value</div>
          <div className="kpi-value">{fmt(equity)}</div>
          <div className="kpi-sub">
            Total P/L:{' '}
            <span className={totalPL >= 0 ? 'price-up' : 'price-down'}>
              {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
            </span>
          </div>
        </div>

        <div className="kpi-card fade-in-up stagger-2">
          <div className="kpi-label">Cash Available</div>
          <div className="kpi-value">{fmt(cash)}</div>
        </div>

        <div className="allocation-card fade-in-up stagger-3">
          <div className="allocation-card-header">Allocation</div>
          <div className="allocation-chart-wrap">
            {withAlloc.length > 0 ? (
              <div style={{ height: '130px', width: '260px' }}>
                <canvas ref={chartRef}></canvas>
              </div>
            ) : (
              <div style={{ padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No holdings yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="holdings-card fade-in-up stagger-4">
        <div className="holdings-card-header">Holdings</div>
        <div className="holdings-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Name</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Avg Cost</th>
                <th className="text-right">Price</th>
                <th className="text-right">Market Value</th>
                <th className="text-right">Total P/L</th>
                <th className="text-right">Alloc %</th>
              </tr>
            </thead>
            <tbody>
              {withAlloc.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <div className="empty-state-icon">💼</div>
                      <h3>No positions yet</h3>
                      <p>Start by buying stocks from the Trading Dashboard</p>
                      <Link to="/dashboard" className="btn-primary" style={{ marginTop: '4px' }}>
                        Go to Dashboard
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                withAlloc.map((h, i) => (
                  <tr key={i}>
                    <td><strong>{h.ticker}</strong></td>
                    <td>{h.name}</td>
                    <td className="text-right">{h.shares}</td>
                    <td className="text-right">{fmt(h.avgCost)}</td>
                    <td className="text-right">{fmt(h.currentPrice)}</td>
                    <td className="text-right">{fmt(h.mv)}</td>
                    <td className={`text-right ${h.totPL >= 0 ? 'price-up' : 'price-down'}`}>
                      {h.totPL >= 0 ? '+' : ''}{fmt(h.totPL)}
                    </td>
                    <td className="text-right">{h.alloc.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
            {withAlloc.length > 0 && (
              <tfoot>
                <tr>
                  <th colSpan="5" className="text-right">Totals</th>
                  <th className="text-right">{fmt(totalMV)}</th>
                  <th className={`text-right ${totalPL >= 0 ? 'price-up' : 'price-down'}`}>
                    {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
                  </th>
                  <th className="text-right">100%</th>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
