import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { apiFetch } from '../hooks/useApi';
import { getPortfolio, executeTrade } from '../services/portfolioService';
import { useToast } from '../contexts/ToastContext';

const Dashboard = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);

  const [stock, setStock] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [cashBalance, setCashBalance] = useState(null);

  const [orderType, setOrderType] = useState('market');
  const [quantity, setQuantity] = useState(1);

  // ── Load user cash balance on mount ──
  useEffect(() => {
    (async () => {
      try {
        const data = await getPortfolio();
        setCashBalance(data.cash);
      } catch (e) { /* not logged in or first time */ }
    })();
  }, []);

  // ── Search for a stock ──
  const handleSearch = useCallback(async () => {
    const ticker = search.trim().toUpperCase();
    if (!ticker) return;

    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(`/stocks/${ticker}`, {
        method: 'POST',
        body: JSON.stringify({ ticker }),
      });

      const data = await res.json();

      if (!data.tradingData || data.tradingData.length === 0) {
        setError('No data found for this ticker.');
        setStock(null);
        setChartData(null);
        setLoading(false);
        return;
      }

      const td = data.tradingData;
      const latest = td[td.length - 1];
      const prev = td.length >= 2 ? td[td.length - 2] : latest;
      const change = latest.c - prev.c;
      const changePct = prev.c > 0 ? ((change / prev.c) * 100).toFixed(2) : '0.00';

      setStock({
        symbol: data.ticker || ticker,
        name: data.name || ticker,
        price: latest.c,
        change,
        changePct,
        open: latest.o,
        high: latest.h,
        low: latest.l,
        volume: latest.v,
      });

      setChartData({
        labels: td.map(d => new Date(d.t).toLocaleDateString()),
        prices: td.map(d => d.c),
      });
    } catch (err) {
      setError('Failed to fetch stock data.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ── Render chart when data changes ──
  useEffect(() => {
    if (!chartData || !chartRef.current) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const isPositive = chartData.prices[chartData.prices.length - 1] >= chartData.prices[0];
    const color = isPositive ? '#26a69a' : '#ef5350';

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Price',
          data: chartData.prices,
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            ticks: { color: '#5d6673', font: { size: 10 }, maxTicksLimit: 8 },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            ticks: { color: '#5d6673', font: { size: 10 } },
            border: { display: false },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [chartData]);

  // ── Execute Trade ──
  const handleTrade = async (type) => {
    if (!stock) return;
    setTradeLoading(true);

    try {
      const result = await executeTrade({
        ticker: stock.symbol,
        name: stock.name,
        type,
        shares: quantity,
        pricePerShare: stock.price,
      });

      addToast({
        type: 'success',
        title: `${type} Order Filled`,
        message: `${quantity} share${quantity > 1 ? 's' : ''} of ${stock.symbol} at $${stock.price.toFixed(2)}`,
        duration: 5000,
      });
      setCashBalance(result.cash);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Trade Failed',
        message: err.message || 'Something went wrong.',
        duration: 5000,
      });
    } finally {
      setTradeLoading(false);
    }
  };

  // ── Format helpers ──
  const fmtVol = (v) => {
    if (!v) return '—';
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toString();
  };

  const priceClass = (change) => change >= 0 ? 'price-up' : 'price-down';

  return (
    <div className="page-container">
      <h1 className="section-heading" style={{ marginBottom: '16px' }}>Trading Dashboard</h1>

      <div className="dashboard-grid">

        {/* Left Column — Search + Chart */}
        <div className="fade-in-up">
          <div className="dashboard-search-bar">
            <input
              type="text"
              className="input-modern"
              placeholder="Search ticker (e.g. AAPL, GOOGL, TSLA)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button className="btn-primary" style={{ flexShrink: 0 }} onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <div className="dashboard-chart-area">
            {loading ? (
              <div className="skeleton" style={{ height: '100%', borderRadius: 'var(--radius-md)' }} />
            ) : !stock && !loading ? (
              <div className="chart-error">Search for a ticker to view its chart</div>
            ) : null}
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Right Column — Trading Panel */}
        <div className="trading-panel fade-in-up stagger-2">

          {stock ? (
            <>
              <div className="stock-info-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontSize: '18px' }}>{stock.symbol}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stock.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`price-value ${priceClass(stock.change)}`} style={{ fontSize: '24px' }}>
                      ${stock.price.toFixed(2)}
                    </div>
                    <div className={priceClass(stock.change)} style={{ fontSize: '12px' }}>
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePct}%)
                    </div>
                  </div>
                </div>

                <div className="stock-meta-grid">
                  <div>Open: <span>${stock.open.toFixed(2)}</span></div>
                  <div>Volume: <span>{fmtVol(stock.volume)}</span></div>
                  <div>High: <span>${stock.high.toFixed(2)}</span></div>
                  <div>Low: <span>${stock.low.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="kpi-card" style={{ padding: '12px 14px' }}>
                <div className="kpi-label">Cash Balance</div>
                <div className="kpi-value" style={{ fontSize: '20px' }}>
                  {cashBalance !== null ? `$${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>Order Type</label>
                <select className="select-modern" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                  <option value="market">Market Order</option>
                  <option value="limit">Limit Order</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>Quantity</label>
                <input type="number" className="input-modern" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} min="1" />
              </div>

              <div className="order-summary">
                <div className="order-row">
                  <span style={{ color: 'var(--text-secondary)' }}>Price per share</span>
                  <span className="price-value">${stock.price.toFixed(2)}</span>
                </div>
                <div className="order-row">
                  <span style={{ color: 'var(--text-secondary)' }}>Quantity</span>
                  <span>{quantity}</span>
                </div>
                <hr className="order-divider" />
                <div className="order-row">
                  <strong>Estimated Total</strong>
                  <strong className="price-value">${(stock.price * quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="trade-actions">
                <button className="btn-success" onClick={() => handleTrade('BUY')} disabled={tradeLoading}>
                  {tradeLoading ? '...' : 'Buy'}
                </button>
                <button className="btn-danger" onClick={() => handleTrade('SELL')} disabled={tradeLoading}>
                  {tradeLoading ? '...' : 'Sell'}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">📊</div>
              <h3>No Stock Selected</h3>
              <p>Search for a ticker to view details and place trades</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
