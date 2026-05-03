import React, { useEffect, useState, useRef, useCallback } from 'react';
import { apiFetch } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import SparklineChart from '../components/SparklineChart';

const Watchlist = () => {
  const { addToast } = useToast();

  const [watchlist, setWatchlist] = useState([]);
  const [priceData, setPriceData] = useState({});   // { AAPL: { price, change, history[] } }
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);

  // Add-ticker form state
  const [newTicker, setNewTicker] = useState('');
  const [alertAbove, setAlertAbove] = useState('');
  const [alertBelow, setAlertBelow] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit-alert modal state
  const [editingTicker, setEditingTicker] = useState(null);
  const [editAbove, setEditAbove] = useState('');
  const [editBelow, setEditBelow] = useState('');

  // Track which alerts have already fired this session to avoid spam
  const firedAlerts = useRef(new Set());

  // ── Fetch watchlist from backend ──
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await apiFetch('/watchlist');
      if (!res.ok) throw new Error('Failed to load watchlist');
      const data = await res.json();
      setWatchlist(data.watchlist || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message, duration: 4000 });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // ── Fetch prices for all tickers on the watchlist ──
  const fetchPrices = useCallback(async (tickers) => {
    if (tickers.length === 0) return;
    setPricesLoading(true);

    const newPriceData = {};
    for (const ticker of tickers) {
      try {
        const res = await apiFetch(`/stocks/${ticker}`, {
          method: 'POST',
          body: JSON.stringify({ ticker }),
        });
        const data = await res.json();
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
      } catch (err) {
        console.warn(`[Watchlist] Price fetch failed for ${ticker}:`, err.message);
      }
    }

    setPriceData(prev => ({ ...prev, ...newPriceData }));
    setPricesLoading(false);
  }, []);

  // ── Check alert thresholds and fire toasts ──
  const checkAlerts = useCallback(() => {
    watchlist.forEach(item => {
      const pd = priceData[item.ticker];
      if (!pd) return;

      if (item.alertAbove && pd.price >= item.alertAbove) {
        const key = `${item.ticker}-above-${item.alertAbove}`;
        if (!firedAlerts.current.has(key)) {
          firedAlerts.current.add(key);
          addToast({
            type: 'success',
            title: `🔔 ${item.ticker} Alert`,
            message: `Price hit $${pd.price.toFixed(2)} — above your $${item.alertAbove.toFixed(2)} target`,
            duration: 8000,
          });
        }
      }

      if (item.alertBelow && pd.price <= item.alertBelow) {
        const key = `${item.ticker}-below-${item.alertBelow}`;
        if (!firedAlerts.current.has(key)) {
          firedAlerts.current.add(key);
          addToast({
            type: 'error',
            title: `🔔 ${item.ticker} Alert`,
            message: `Price dropped to $${pd.price.toFixed(2)} — below your $${item.alertBelow.toFixed(2)} floor`,
            duration: 8000,
          });
        }
      }
    });
  }, [watchlist, priceData, addToast]);

  // ── Initial load ──
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // ── Fetch prices when watchlist changes ──
  useEffect(() => {
    const tickers = watchlist.map(w => w.ticker);
    if (tickers.length > 0) fetchPrices(tickers);
  }, [watchlist, fetchPrices]);

  // ── Check alerts whenever prices update ──
  useEffect(() => {
    checkAlerts();
  }, [checkAlerts]);

  // ── Poll for price updates every 60s ──
  useEffect(() => {
    if (watchlist.length === 0) return;
    const interval = setInterval(() => {
      fetchPrices(watchlist.map(w => w.ticker));
    }, 60000);
    return () => clearInterval(interval);
  }, [watchlist, fetchPrices]);

  // ── Add ticker ──
  const handleAdd = async (e) => {
    e.preventDefault();
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) { setAddError('Enter a ticker symbol.'); return; }
    if (!/^[A-Z]{1,5}$/.test(ticker)) { setAddError('Ticker must be 1-5 letters.'); return; }

    setAddError('');
    setAddLoading(true);

    try {
      const body = { ticker };
      if (alertAbove) body.alertAbove = parseFloat(alertAbove);
      if (alertBelow) body.alertBelow = parseFloat(alertBelow);

      const res = await apiFetch('/watchlist', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');

      addToast({ type: 'success', title: 'Added', message: `${ticker} added to watchlist`, duration: 3000 });
      setNewTicker('');
      setAlertAbove('');
      setAlertBelow('');
      fetchWatchlist();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // ── Remove ticker ──
  const handleRemove = async (ticker) => {
    try {
      const res = await apiFetch(`/watchlist/${ticker}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove');
      }
      addToast({ type: 'success', title: 'Removed', message: `${ticker} removed`, duration: 3000 });
      setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
      // Clear fired alerts for this ticker
      for (const key of firedAlerts.current) {
        if (key.startsWith(ticker)) firedAlerts.current.delete(key);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message, duration: 4000 });
    }
  };

  // ── Update alert thresholds ──
  const handleEditSave = async () => {
    if (!editingTicker) return;

    try {
      const body = {
        alertAbove: editAbove ? parseFloat(editAbove) : null,
        alertBelow: editBelow ? parseFloat(editBelow) : null,
      };

      const res = await apiFetch(`/watchlist/${editingTicker}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update alerts');
      }

      addToast({ type: 'success', title: 'Updated', message: `${editingTicker} alerts updated`, duration: 3000 });
      // Clear previously fired alerts for this ticker so new thresholds can fire
      for (const key of firedAlerts.current) {
        if (key.startsWith(editingTicker)) firedAlerts.current.delete(key);
      }
      setEditingTicker(null);
      fetchWatchlist();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message, duration: 4000 });
    }
  };

  const openEditModal = (item) => {
    setEditingTicker(item.ticker);
    setEditAbove(item.alertAbove ? String(item.alertAbove) : '');
    setEditBelow(item.alertBelow ? String(item.alertBelow) : '');
  };

  const fmt = (n) => n != null ? `$${n.toFixed(2)}` : '—';

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="section-heading" style={{ marginBottom: '16px' }}>Watchlist</h1>
        <div className="watchlist-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton skeleton-card" style={{ height: '160px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="section-heading" style={{ marginBottom: '16px' }}>Watchlist</h1>

      {/* ── Add Ticker Bar ── */}
      <form onSubmit={handleAdd} className="watchlist-add-bar fade-in-up">
        <div className="watchlist-add-fields">
          <input
            type="text"
            className="input-modern"
            placeholder="Ticker (e.g. AAPL)"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            maxLength={5}
            style={{ flex: '1 1 140px', minWidth: '100px' }}
          />
          <input
            type="number"
            className="input-modern"
            placeholder="Alert above $"
            value={alertAbove}
            onChange={(e) => setAlertAbove(e.target.value)}
            min="0"
            step="0.01"
            style={{ flex: '0 1 130px', minWidth: '100px' }}
          />
          <input
            type="number"
            className="input-modern"
            placeholder="Alert below $"
            value={alertBelow}
            onChange={(e) => setAlertBelow(e.target.value)}
            min="0"
            step="0.01"
            style={{ flex: '0 1 130px', minWidth: '100px' }}
          />
          <button type="submit" className="btn-primary" disabled={addLoading} style={{ flexShrink: 0 }}>
            {addLoading ? 'Adding...' : '+ Add'}
          </button>
        </div>
        {addError && <div className="alert-error" style={{ marginTop: '8px', fontSize: '13px' }}>{addError}</div>}
      </form>

      {/* ── Watchlist Cards ── */}
      {watchlist.length === 0 ? (
        <div className="empty-state fade-in-up" style={{ marginTop: '40px' }}>
          <div className="empty-state-icon">👀</div>
          <h3>Your watchlist is empty</h3>
          <p>Add tickers above to start tracking stocks you&apos;re interested in.</p>
        </div>
      ) : (
        <div className="watchlist-grid">
          {watchlist.map((item, i) => {
            const pd = priceData[item.ticker];
            const hasAlerts = item.alertAbove || item.alertBelow;

            return (
              <div key={item.ticker} className={`watchlist-card fade-in-up stagger-${Math.min(i + 1, 6)}`}>
                {/* Header */}
                <div className="watchlist-card-header">
                  <div>
                    <div className="watchlist-card-ticker">{item.ticker}</div>
                    <div className="watchlist-card-name">{pd?.name || '...'}</div>
                  </div>
                  <div className="watchlist-card-actions">
                    <button
                      className="watchlist-btn-icon"
                      title="Edit alerts"
                      onClick={() => openEditModal(item)}
                    >
                      🔔
                    </button>
                    <button
                      className="watchlist-btn-icon watchlist-btn-remove"
                      title="Remove from watchlist"
                      onClick={() => handleRemove(item.ticker)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="watchlist-card-chart">
                  {pricesLoading && !pd ? (
                    <div className="skeleton" style={{ width: '100%', height: '48px', borderRadius: '4px' }} />
                  ) : (
                    <SparklineChart
                      data={pd?.history || []}
                      width={200}
                      height={48}
                    />
                  )}
                </div>

                {/* Price Row */}
                <div className="watchlist-card-price-row">
                  <div className="watchlist-card-price">
                    {pd ? fmt(pd.price) : '—'}
                  </div>
                  {pd && (
                    <div className={`watchlist-card-change ${pd.change >= 0 ? 'price-up' : 'price-down'}`}>
                      {pd.change >= 0 ? '+' : ''}{pd.change.toFixed(2)}%
                    </div>
                  )}
                </div>

                {/* Alert Badges */}
                {hasAlerts && (
                  <div className="watchlist-alert-badges">
                    {item.alertAbove && (
                      <span className="watchlist-alert-badge watchlist-alert-badge--above">
                        ↑ {fmt(item.alertAbove)}
                      </span>
                    )}
                    {item.alertBelow && (
                      <span className="watchlist-alert-badge watchlist-alert-badge--below">
                        ↓ {fmt(item.alertBelow)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
                <input
                  type="number"
                  className="input-modern"
                  placeholder="e.g. 200"
                  value={editAbove}
                  onChange={(e) => setEditAbove(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="modal-label">Alert when price drops below</label>
                <input
                  type="number"
                  className="input-modern"
                  placeholder="e.g. 150"
                  value={editBelow}
                  onChange={(e) => setEditBelow(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button className="btn-primary" onClick={handleEditSave} style={{ flex: 1 }}>
                  Save
                </button>
                <button className="btn-ghost" onClick={() => setEditingTicker(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
