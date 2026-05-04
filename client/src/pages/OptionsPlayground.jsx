import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../hooks/useApi';
import { fetchStockCached } from '../utils/stockCache';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const OptionsPlayground = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [ticker, setTicker] = useState('AAPL');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [cash, setCash] = useState(null);
  const [positions, setPositions] = useState([]);

  // ── Order modal state ──
  const [orderModal, setOrderModal] = useState(null); // { optionType, strike, premium }
  const [orderQty, setOrderQty] = useState(1);
  const [orderError, setOrderError] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // ── Fetch portfolio cash + open positions ──
  const refreshAccount = async () => {
    if (!currentUser) return;
    try {
      const [pRes, oRes] = await Promise.all([
        apiFetch('/portfolio'),
        apiFetch('/options/positions'),
      ]);
      if (pRes.ok) {
        const p = await pRes.json();
        setCash(p.cash ?? 0);
      }
      if (oRes.ok) {
        const o = await oRes.json();
        setPositions(o.positions || []);
      }
    } catch { /* non-fatal */ }
  };

  useEffect(() => { refreshAccount(); }, [currentUser]);

  const fetchStockData = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchStockCached(ticker.toUpperCase());

      if (!data.tradingData || data.tradingData.length === 0) {
        setError('Failed to fetch real-time market data.');
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
          // Premium roughly proportional to ATM-ness — pure educational sim
          const callPremium = Math.max(0.5, livePrice - strike + 2.5 + (Math.random() * 0.5));
          const putPremium = Math.max(0.5, strike - livePrice + 2.5 + (Math.random() * 0.5));
          return {
            strike,
            callPremium: Number(callPremium.toFixed(2)),
            putPremium: Number(putPremium.toFixed(2)),
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

  // ── Order flow ──
  const openOrder = (optionType, strike, premium) => {
    if (!currentUser) {
      addToast({ type: 'error', title: 'Sign in required', message: 'Please log in to paper trade options.', duration: 4000 });
      return;
    }
    setOrderModal({ optionType, strike, premium });
    setOrderQty(1);
    setOrderError('');
  };

  const submitOrder = async () => {
    if (!orderModal || !stockData) return;
    const qty = parseInt(orderQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setOrderError('Quantity must be a positive whole number.');
      return;
    }
    const totalCost = orderModal.premium * 100 * qty;
    if (cash != null && totalCost > cash) {
      setOrderError(`Insufficient funds. Need ${fmt(totalCost)} but only ${fmt(cash)} available.`);
      return;
    }

    setOrderError('');
    setOrderLoading(true);
    try {
      const res = await apiFetch('/options/buy', {
        method: 'POST',
        body: JSON.stringify({
          ticker: stockData.ticker,
          name: stockData.name,
          optionType: orderModal.optionType,
          strike: orderModal.strike,
          premium: orderModal.premium,
          contracts: qty,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Order failed.');

      addToast({
        type: 'success',
        title: `Bought ${qty} ${orderModal.optionType.toUpperCase()} contract${qty > 1 ? 's' : ''}`,
        message: `${stockData.ticker} $${orderModal.strike} · paid ${fmt(totalCost)}`,
        duration: 5000,
      });
      setOrderModal(null);
      refreshAccount();
    } catch (err) {
      addToast({ type: 'error', title: 'Order Failed', message: err.message || 'Something went wrong.', duration: 5000 });
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '4px' }}>
        <div>
          <h1 className="section-heading" style={{ marginBottom: '4px' }}>Options Playground</h1>
          <p style={{ marginBottom: 0, fontSize: '13px' }}>
            Paper trade real options chains — premiums simulated, P/L based on the live underlying.
          </p>
        </div>
        {currentUser && cash != null && (
          <div className="kpi-card" style={{ padding: '8px 14px', minWidth: '160px' }}>
            <div className="kpi-label">Cash Available</div>
            <div className="kpi-value" style={{ fontSize: '18px' }}>{fmt(cash)}</div>
          </div>
        )}
      </div>

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
              <div className="stat-card">
                <div className="stat-label">Expiry</div>
                <div className="stat-value">~30 days</div>
              </div>
            </div>
          </div>

          {/* Options Chain Table */}
          <div className="options-chain-wrap fade-in-up stagger-2">
            <div className="options-chain-header">
              <h3>Options Chain (Near-the-Money)</h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                1 contract = 100 shares · click to paper trade
              </div>
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
                    <th>Premium</th>
                    <th style={{ borderRight: '1px solid var(--border-subtle)' }}>Action</th>
                    <th>$</th>
                    <th style={{ borderLeft: '1px solid var(--border-subtle)' }}>Premium</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.options.map((opt, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>${opt.callPremium.toFixed(2)}</td>
                      <td className="divider">
                        <button
                          className="btn-trade-call"
                          onClick={() => openOrder('call', opt.strike, opt.callPremium)}
                        >
                          Buy Call
                        </button>
                      </td>
                      <td className="strike-col">${opt.strike}</td>
                      <td className="divider-left" style={{ fontWeight: 600 }}>${opt.putPremium.toFixed(2)}</td>
                      <td>
                        <button
                          className="btn-trade-put"
                          onClick={() => openOrder('put', opt.strike, opt.putPremium)}
                        >
                          Buy Put
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Open positions for this ticker */}
          {positions.filter(p => p.ticker === stockData.ticker).length > 0 && (
            <div className="options-chain-wrap fade-in-up" style={{ marginTop: '16px' }}>
              <div className="options-chain-header">
                <h3>Your Open {stockData.ticker} Contracts</h3>
                <Link to="/portfolio" style={{ fontSize: '12px', color: 'var(--accent)' }}>
                  Manage in Portfolio →
                </Link>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {positions.filter(p => p.ticker === stockData.ticker).map(p => {
                  const cost = p.premium * 100 * p.contracts;
                  const value = p.currentValue * 100 * p.contracts;
                  const pl = value - cost;
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                      <div>
                        <span className={p.optionType === 'call' ? 'price-up' : 'price-down'} style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{p.optionType}</span>
                        {' '}<strong>${p.strike}</strong> · {p.contracts} ct · {p.daysLeft}d left
                      </div>
                      <div className={pl >= 0 ? 'price-up' : 'price-down'} style={{ fontWeight: 600 }}>
                        {pl >= 0 ? '+' : ''}{fmt(pl)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !error && !stockData && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Search for a stock</h3>
          <p>Enter a ticker symbol above to view its simulated options chain</p>
        </div>
      )}

      {/* ── Order Modal ── */}
      {orderModal && stockData && (
        <div className="modal-overlay" onClick={() => setOrderModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Buy to Open
              </div>
              <h3 style={{ margin: '0 0 2px', fontSize: '18px' }}>
                {stockData.ticker}{' '}
                <span className={orderModal.optionType === 'call' ? 'price-up' : 'price-down'}>
                  {orderModal.optionType.toUpperCase()}
                </span>
                {' '}${orderModal.strike}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Underlying: {fmt(stockData.price)} · Expires ~30 days
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label className="modal-label">Contracts (1 ct = 100 shares)</label>
              <input
                type="number"
                className="input-modern"
                value={orderQty}
                onChange={(e) => { setOrderQty(Math.max(1, Math.floor(Number(e.target.value)))); setOrderError(''); }}
                min="1"
                step="1"
              />
            </div>

            <div className="order-summary" style={{ marginBottom: '12px' }}>
              <div className="order-row">
                <span style={{ color: 'var(--text-secondary)' }}>Premium per share</span>
                <span className="price-value">{fmt(orderModal.premium)}</span>
              </div>
              <div className="order-row">
                <span style={{ color: 'var(--text-secondary)' }}>Cost per contract</span>
                <span>{fmt(orderModal.premium * 100)}</span>
              </div>
              <div className="order-row">
                <span style={{ color: 'var(--text-secondary)' }}>Contracts</span>
                <span>{orderQty}</span>
              </div>
              <hr className="order-divider" />
              <div className="order-row">
                <strong>Total Cost</strong>
                <strong className="price-value">{fmt(orderModal.premium * 100 * orderQty)}</strong>
              </div>
              <div className="order-row" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Max loss</span>
                <span>{fmt(orderModal.premium * 100 * orderQty)} (premium)</span>
              </div>
            </div>

            {orderError && <div className="alert-error" style={{ marginBottom: '10px', fontSize: '12px' }}>{orderError}</div>}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-ghost" onClick={() => setOrderModal(null)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                className={orderModal.optionType === 'call' ? 'btn-success' : 'btn-danger'}
                onClick={submitOrder}
                disabled={orderLoading}
                style={{ flex: 1 }}
              >
                {orderLoading ? '...' : `Buy ${orderModal.optionType.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OptionsPlayground;
