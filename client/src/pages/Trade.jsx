import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { apiFetch } from '../hooks/useApi';
import { fetchStockCached } from '../utils/stockCache';
import { useToast } from '../contexts/ToastContext';
import SparklineChart from '../components/SparklineChart';

const Trade = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { addToast } = useToast();

  // ── Stock / chart state ──
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stock, setStock] = useState(null);
  const [chartData, setChartData] = useState(null);

  // ── Trade state ──
  const [cashBalance, setCashBalance] = useState(null);
  const [orderType, setOrderType] = useState('market');
  const [quantity, setQuantity] = useState(1);
  const [tradeError, setTradeError] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);

  // ── Watchlist state ──
  const [watchlist, setWatchlist] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [editingTicker, setEditingTicker] = useState(null);
  const [editAbove, setEditAbove] = useState('');
  const [editBelow, setEditBelow] = useState('');
  const firedAlerts = useRef(new Set());

  // ── Comparison state ──
  const COMPARE_COLORS = ['#f7931a', '#7b61ff', '#00bcd4'];
  const [compareList, setCompareList] = useState([]); // [{ ticker, prices, labels }]
  const [compareTicker, setCompareTicker] = useState('');
  const [compareError, setCompareError] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);

  // ── Load cash balance ──
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/portfolio');
        if (res.ok) {
          const data = await res.json();
          setCashBalance(data.cash);
        }
      } catch (e) {}
    })();
  }, []);

  // ── Core: load a stock by ticker ──
  const loadStock = useCallback(async (ticker) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchStockCached(ticker);

      if (!data.tradingData || data.tradingData.length === 0) {
        setError('No data found for this ticker.');
        setStock(null);
        setChartData(null);
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
      setQuantity(1);
      setTradeError('');
      setCompareList([]);
      setCompareError('');
    } catch {
      setError('Failed to fetch stock data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    const ticker = search.trim().toUpperCase();
    if (!ticker) { setError('Please enter a ticker symbol.'); return; }
    if (!/^[A-Z]{1,5}$/.test(ticker)) { setError('Ticker must be 1-5 letters (e.g. AAPL, TSLA).'); return; }
    loadStock(ticker);
  }, [search, loadStock]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleWatchlistClick = (ticker) => {
    setSearch(ticker);
    loadStock(ticker);
  };

  // ── Comparison: add / remove ──
  const handleAddCompare = async (e) => {
    e.preventDefault();
    const ticker = compareTicker.trim().toUpperCase();
    if (!ticker) return;
    if (!/^[A-Z]{1,5}$/.test(ticker)) { setCompareError('Invalid ticker.'); return; }
    if (ticker === stock?.symbol) { setCompareError('Already the primary stock.'); return; }
    if (compareList.some(c => c.ticker === ticker)) { setCompareError(`${ticker} already added.`); return; }

    setCompareError('');
    setCompareLoading(true);
    try {
      const data = await fetchStockCached(ticker);
      if (!data.tradingData || data.tradingData.length === 0) {
        setCompareError(`No data found for ${ticker}.`);
        return;
      }
      setCompareList(prev => [...prev, {
        ticker,
        prices: data.tradingData.map(d => d.c),
        labels: data.tradingData.map(d => new Date(d.t).toLocaleDateString()),
      }]);
      setCompareTicker('');
    } catch {
      setCompareError('Failed to fetch data.');
    } finally {
      setCompareLoading(false);
    }
  };

  const removeCompare = (ticker) => setCompareList(prev => prev.filter(c => c.ticker !== ticker));

  // ── Chart rendering ──
  useEffect(() => {
    if (!chartData || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const isCompare = compareList.length > 0;

    const normalize = (prices) => prices.map(p => ((p - prices[0]) / prices[0]) * 100);

    let labels, datasets;

    if (isCompare) {
      const minLen = Math.min(chartData.prices.length, ...compareList.map(c => c.prices.length));
      labels = chartData.labels.slice(-minLen);
      const lineStyle = { backgroundColor: 'transparent', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0, pointHoverRadius: 4 };

      datasets = [
        { label: stock?.symbol || 'Primary', data: normalize(chartData.prices.slice(-minLen)), borderColor: '#2962ff', ...lineStyle },
        ...compareList.map((c, i) => ({
          label: c.ticker, data: normalize(c.prices.slice(-minLen)), borderColor: COMPARE_COLORS[i], ...lineStyle,
        })),
      ];
    } else {
      const isPositive = chartData.prices[chartData.prices.length - 1] >= chartData.prices[0];
      const color = isPositive ? '#26a69a' : '#ef5350';
      labels = chartData.labels;
      datasets = [{ label: 'Price', data: chartData.prices, borderColor: color, backgroundColor: 'transparent', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: color }];
    }

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: isCompare,
            position: 'top',
            labels: { color: '#848e9c', padding: 14, font: { size: 11 }, boxWidth: 16, boxHeight: 2, useBorderRadius: true, borderRadius: 1 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => isCompare
                ? `${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}%`
                : `$${ctx.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            ticks: { color: '#5d6673', font: { size: 10 }, maxTicksLimit: 8 },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            ticks: {
              color: '#5d6673',
              font: { size: 10 },
              callback: (val) => isCompare ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : `$${val.toFixed(2)}`,
            },
            border: { display: false },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });

    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [chartData, compareList, stock?.symbol]);

  // ── Execute trade ──
  const handleTrade = async (type) => {
    if (!stock) return;
    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setTradeError('Quantity must be a positive whole number.');
      return;
    }
    if (type === 'BUY' && cashBalance !== null && stock.price * qty > cashBalance) {
      setTradeError(`Insufficient funds. Need $${(stock.price * qty).toFixed(2)} but only $${cashBalance.toFixed(2)} available.`);
      return;
    }

    setTradeError('');
    setTradeLoading(true);
    try {
      const res = await apiFetch('/portfolio/trade', {
        method: 'POST',
        body: JSON.stringify({
          ticker: stock.symbol,
          name: stock.name,
          type,
          shares: quantity,
          pricePerShare: stock.price,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Trade failed.');

      addToast({
        type: 'success',
        title: `${type} Order Filled`,
        message: `${quantity} share${quantity > 1 ? 's' : ''} of ${stock.symbol} at $${stock.price.toFixed(2)}`,
        duration: 5000,
      });
      setCashBalance(result.cash);
    } catch (err) {
      addToast({ type: 'error', title: 'Trade Failed', message: err.message || 'Something went wrong.', duration: 5000 });
    } finally {
      setTradeLoading(false);
    }
  };

  // ── Watchlist: fetch ──
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await apiFetch('/watchlist');
      if (!res.ok) throw new Error('Failed to load watchlist');
      const data = await res.json();
      setWatchlist(data.watchlist || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message, duration: 4000 });
    } finally {
      setWatchlistLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  // ── Watchlist: fetch prices ──
  const fetchPrices = useCallback(async (tickers) => {
    if (tickers.length === 0) return;
    setPricesLoading(true);
    const newPriceData = {};
    for (const ticker of tickers) {
      try {
        const data = await fetchStockCached(ticker);
        if (data.tradingData && data.tradingData.length > 0) {
          const td = data.tradingData;
          const latest = td[td.length - 1];
          const prev = td.length >= 2 ? td[td.length - 2] : latest;
          const change = prev.c > 0 ? ((latest.c - prev.c) / prev.c) * 100 : 0;
          newPriceData[ticker] = {
            price: latest.c,
            change,
            name: data.name || ticker,
            history: td.map(d => d.c),
          };
        }
      } catch {
        // silently skip
      }
    }
    setPriceData(prev => ({ ...prev, ...newPriceData }));
    setPricesLoading(false);
  }, []);

  useEffect(() => {
    const tickers = watchlist.map(w => w.ticker);
    if (tickers.length > 0) fetchPrices(tickers);
  }, [watchlist, fetchPrices]);

  // ── Watchlist: price alerts ──
  const checkAlerts = useCallback(() => {
    watchlist.forEach(item => {
      const pd = priceData[item.ticker];
      if (!pd) return;
      if (item.alertAbove && pd.price >= item.alertAbove) {
        const key = `${item.ticker}-above-${item.alertAbove}`;
        if (!firedAlerts.current.has(key)) {
          firedAlerts.current.add(key);
          addToast({ type: 'success', title: `🔔 ${item.ticker} Alert`, message: `Price hit $${pd.price.toFixed(2)} — above your $${item.alertAbove.toFixed(2)} target`, duration: 8000 });
        }
      }
      if (item.alertBelow && pd.price <= item.alertBelow) {
        const key = `${item.ticker}-below-${item.alertBelow}`;
        if (!firedAlerts.current.has(key)) {
          firedAlerts.current.add(key);
          addToast({ type: 'error', title: `🔔 ${item.ticker} Alert`, message: `Price dropped to $${pd.price.toFixed(2)} — below your $${item.alertBelow.toFixed(2)} floor`, duration: 8000 });
        }
      }
    });
  }, [watchlist, priceData, addToast]);

  useEffect(() => { checkAlerts(); }, [checkAlerts]);

  useEffect(() => {
    if (watchlist.length === 0) return;
    const interval = setInterval(() => fetchPrices(watchlist.map(w => w.ticker)), 60000);
    return () => clearInterval(interval);
  }, [watchlist, fetchPrices]);

  // ── Watchlist: add (from sidebar form) ──
  const handleAdd = async (e) => {
    e.preventDefault();
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) { setAddError('Enter a ticker symbol.'); return; }
    if (!/^[A-Z]{1,5}$/.test(ticker)) { setAddError('Ticker must be 1-5 letters.'); return; }
    setAddError('');
    setAddLoading(true);
    try {
      const res = await apiFetch('/watchlist', { method: 'POST', body: JSON.stringify({ ticker }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      addToast({ type: 'success', title: 'Added', message: `${ticker} added to watchlist`, duration: 3000 });
      setNewTicker('');
      fetchWatchlist();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // ── Watchlist: add/remove from trade panel ──
  const handleToggleWatch = async () => {
    if (!stock) return;
    if (isWatched) {
      try {
        const res = await apiFetch(`/watchlist/${stock.symbol}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to remove');
        addToast({ type: 'success', title: 'Removed', message: `${stock.symbol} removed from watchlist`, duration: 3000 });
        setWatchlist(prev => prev.filter(w => w.ticker !== stock.symbol));
      } catch (err) {
        addToast({ type: 'error', title: 'Error', message: err.message, duration: 4000 });
      }
    } else {
      setAddLoading(true);
      try {
        const res = await apiFetch('/watchlist', { method: 'POST', body: JSON.stringify({ ticker: stock.symbol }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add');
        addToast({ type: 'success', title: 'Watching', message: `${stock.symbol} added to watchlist`, duration: 3000 });
        fetchWatchlist();
      } catch (err) {
        addToast({ type: 'error', title: 'Error', message: err.message, duration: 4000 });
      } finally {
        setAddLoading(false);
      }
    }
  };

  // ── Watchlist: remove from sidebar ──
  const handleRemove = async (ticker) => {
    try {
      const res = await apiFetch(`/watchlist/${ticker}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      addToast({ type: 'success', title: 'Removed', message: `${ticker} removed`, duration: 3000 });
      setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
      for (const key of firedAlerts.current) {
        if (key.startsWith(ticker)) firedAlerts.current.delete(key);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message, duration: 4000 });
    }
  };

  // ── Watchlist: edit alerts ──
  const openEditModal = (item) => {
    setEditingTicker(item.ticker);
    setEditAbove(item.alertAbove ? String(item.alertAbove) : '');
    setEditBelow(item.alertBelow ? String(item.alertBelow) : '');
  };

  const handleEditSave = async () => {
    if (!editingTicker) return;
    try {
      const body = {
        alertAbove: editAbove ? parseFloat(editAbove) : null,
        alertBelow: editBelow ? parseFloat(editBelow) : null,
      };
      const res = await apiFetch(`/watchlist/${editingTicker}`, { method: 'PUT', body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update alerts');
      }
      addToast({ type: 'success', title: 'Updated', message: `${editingTicker} alerts updated`, duration: 3000 });
      for (const key of firedAlerts.current) {
        if (key.startsWith(editingTicker)) firedAlerts.current.delete(key);
      }
      setEditingTicker(null);
      fetchWatchlist();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message, duration: 4000 });
    }
  };

  // ── Helpers ──
  const fmtVol = (v) => {
    if (!v) return '—';
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toString();
  };

  const fmt = (n) => n != null ? `$${n.toFixed(2)}` : '—';
  const priceClass = (change) => change >= 0 ? 'price-up' : 'price-down';
  const isWatched = stock && watchlist.some(w => w.ticker === stock.symbol);

  return (
    <div className="page-container">
      <div className="trade-grid">

        {/* ── Left: Search + Chart ── */}
        <div className="trade-left fade-in-up">
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
              {loading ? 'Loading...' : 'Search'}
            </button>
          </div>

          {/* Compare bar — visible once a primary stock is loaded */}
          {stock && (
            <div className="compare-bar">
              <span className="compare-label">Compare:</span>

              {compareList.map((c, i) => (
                <span key={c.ticker} className="compare-chip" style={{ borderColor: COMPARE_COLORS[i], color: COMPARE_COLORS[i] }}>
                  <span className="compare-chip-dot" style={{ background: COMPARE_COLORS[i] }} />
                  {c.ticker}
                  <button className="compare-chip-remove" onClick={() => removeCompare(c.ticker)}>×</button>
                </span>
              ))}

              {compareList.length < 3 && (
                <form onSubmit={handleAddCompare} className="compare-input-wrap">
                  <input
                    type="text"
                    className="input-modern"
                    placeholder="Add ticker…"
                    value={compareTicker}
                    onChange={(e) => { setCompareTicker(e.target.value.toUpperCase()); setCompareError(''); }}
                    maxLength={5}
                    style={{ width: '110px', padding: '6px 10px', fontSize: '12px' }}
                  />
                  <button type="submit" className="btn-ghost" disabled={compareLoading} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    {compareLoading ? '…' : '+ Add'}
                  </button>
                </form>
              )}

              {compareList.length > 0 && (
                <button className="btn-ghost" onClick={() => setCompareList([])} style={{ padding: '4px 10px', fontSize: '11px' }}>
                  Clear all
                </button>
              )}

              {compareError && <span style={{ fontSize: '12px', color: 'var(--color-loss)' }}>{compareError}</span>}
            </div>
          )}

          {error && <div className="alert-error">{error}</div>}

          <div className="dashboard-chart-area">
            {loading ? (
              <div className="skeleton" style={{ height: '100%', borderRadius: 'var(--radius-md)' }} />
            ) : !stock && !loading ? (
              <div className="chart-error">Search for a ticker or click a watchlist item to view its chart</div>
            ) : null}
            <canvas ref={chartRef} />
          </div>
        </div>

        {/* ── Right: Trade Panel + Watchlist ── */}
        <div className="trade-right">

          {/* Trading Panel */}
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
                      <div className={`price-value ${priceClass(stock.change)}`} style={{ fontSize: '22px' }}>
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

                  <button
                    className={isWatched ? 'btn-ghost' : 'btn-outline-accent'}
                    style={{ marginTop: '10px', width: '100%', padding: '7px', fontSize: '12px' }}
                    onClick={handleToggleWatch}
                    disabled={addLoading}
                  >
                    {isWatched ? '★ Watching' : '☆ Add to Watchlist'}
                  </button>
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
                  <input
                    type="number"
                    className="input-modern"
                    value={quantity}
                    onChange={(e) => { setQuantity(Math.max(1, Math.floor(Number(e.target.value)))); setTradeError(''); }}
                    min="1"
                    step="1"
                  />
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
                  {tradeError && <div className="alert-error" style={{ marginBottom: '8px', fontSize: '13px' }}>{tradeError}</div>}
                  <button className="btn-success" onClick={() => handleTrade('BUY')} disabled={tradeLoading}>
                    {tradeLoading ? '...' : 'Buy'}
                  </button>
                  <button className="btn-danger" onClick={() => handleTrade('SELL')} disabled={tradeLoading}>
                    {tradeLoading ? '...' : 'Sell'}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <div className="empty-state-icon" style={{ fontSize: '32px' }}>📊</div>
                <h3 style={{ fontSize: '14px' }}>No Stock Selected</h3>
                <p style={{ fontSize: '12px' }}>Search a ticker or click a watchlist item</p>
              </div>
            )}
          </div>

          {/* Watchlist Panel */}
          <div className="watchlist-panel fade-in-up stagger-3">
            <div className="watchlist-panel-header">
              <span>Watchlist</span>
              {pricesLoading && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Refreshing...</span>}
            </div>

            <form onSubmit={handleAdd} className="watchlist-compact-add">
              <input
                type="text"
                className="input-modern"
                placeholder="Add ticker..."
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                maxLength={5}
                style={{ flex: 1, minWidth: 0 }}
              />
              <button type="submit" className="btn-primary" disabled={addLoading} style={{ flexShrink: 0, padding: '9px 14px', fontSize: '12px' }}>
                {addLoading ? '...' : '+ Add'}
              </button>
            </form>
            {addError && <div style={{ padding: '0 12px 8px', fontSize: '12px', color: 'var(--color-loss)' }}>{addError}</div>}

            {watchlistLoading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '52px', borderRadius: 'var(--radius-md)' }} />)}
              </div>
            ) : watchlist.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No stocks watched yet
              </div>
            ) : (
              <div className="watchlist-compact-list">
                {watchlist.map((item) => {
                  const pd = priceData[item.ticker];
                  const isActive = stock?.symbol === item.ticker;
                  return (
                    <div
                      key={item.ticker}
                      className={`watchlist-compact-item${isActive ? ' watchlist-compact-item--active' : ''}`}
                      onClick={() => handleWatchlistClick(item.ticker)}
                    >
                      <div className="watchlist-compact-info">
                        <div className="watchlist-compact-ticker">{item.ticker}</div>
                        <div className="watchlist-compact-name">{pd?.name || item.ticker}</div>
                        {(item.alertAbove || item.alertBelow) && (
                          <div className="watchlist-alert-badges" style={{ marginTop: '3px' }}>
                            {item.alertAbove && <span className="watchlist-alert-badge watchlist-alert-badge--above">↑ {fmt(item.alertAbove)}</span>}
                            {item.alertBelow && <span className="watchlist-alert-badge watchlist-alert-badge--below">↓ {fmt(item.alertBelow)}</span>}
                          </div>
                        )}
                      </div>

                      <div className="watchlist-compact-sparkline">
                        {pd?.history ? (
                          <SparklineChart data={pd.history} width={72} height={30} />
                        ) : (
                          <div className="skeleton" style={{ width: '72px', height: '30px', borderRadius: '4px' }} />
                        )}
                      </div>

                      <div className="watchlist-compact-right">
                        <div className="watchlist-compact-price">{pd ? fmt(pd.price) : '—'}</div>
                        {pd && (
                          <div className={`watchlist-compact-change ${pd.change >= 0 ? 'price-up' : 'price-down'}`}>
                            {pd.change >= 0 ? '+' : ''}{pd.change.toFixed(2)}%
                          </div>
                        )}
                      </div>

                      <div className="watchlist-compact-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="watchlist-btn-icon" title="Edit alerts" onClick={() => openEditModal(item)}>🔔</button>
                        <button className="watchlist-btn-icon watchlist-btn-remove" title="Remove" onClick={() => handleRemove(item.ticker)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Alert Modal ── */}
      {editingTicker && (
        <div className="modal-overlay" onClick={() => setEditingTicker(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>
              Edit Alerts — <span style={{ color: 'var(--accent)' }}>{editingTicker}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="modal-label">Alert when price goes above</label>
                <input type="number" className="input-modern" placeholder="e.g. 200" value={editAbove} onChange={(e) => setEditAbove(e.target.value)} min="0" step="0.01" />
              </div>
              <div>
                <label className="modal-label">Alert when price drops below</label>
                <input type="number" className="input-modern" placeholder="e.g. 150" value={editBelow} onChange={(e) => setEditBelow(e.target.value)} min="0" step="0.01" />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button className="btn-primary" onClick={handleEditSave} style={{ flex: 1 }}>Save</button>
                <button className="btn-ghost" onClick={() => setEditingTicker(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trade;
