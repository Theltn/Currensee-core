import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { apiFetch } from '../hooks/useApi';
import { fetchStockCached } from '../utils/stockCache';
import { useToast } from '../contexts/ToastContext';
import PortfolioHeatmap from '../components/PortfolioHeatmap';

const Portfolio = () => {
  const dailyChartRef = useRef(null);
  const dailyChartInstance = useRef(null);
  const { addToast } = useToast();

  const [cash, setCash] = useState(0);
  const [holdings, setHoldings] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'heatmap'

  // ── Filter / sort state ──
  const [filter, setFilter] = useState('all'); // 'all' | 'winners' | 'losers'
  const [sortKey, setSortKey] = useState('alloc');
  const [sortDir, setSortDir] = useState('desc');

  // ── Daily P&L state ──
  const [priceHistories, setPriceHistories] = useState({}); // { ticker: [c0, c1, ...] }
  const [dateLabels, setDateLabels] = useState([]);
  const [dailyPLData, setDailyPLData] = useState([]); // [{ label, pl }]

  // ── Quick-trade modal state ──
  const [tradeModal, setTradeModal] = useState(null); // { ticker, name, currentPrice }
  const [modalQty, setModalQty] = useState(1);
  const [modalTradeError, setModalTradeError] = useState('');
  const [modalTradeLoading, setModalTradeLoading] = useState(false);

  // ── Transactions / option positions ──
  const [transactions, setTransactions] = useState([]);
  const [optionPositions, setOptionPositions] = useState([]);
  const [closingPosId, setClosingPosId] = useState(null);

  // ── 1. Fetch portfolio ──
  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await apiFetch('/portfolio');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      setCash(data.cash);
      setHoldings(data.holdings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  // ── Fetch transactions ──
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await apiFetch('/portfolio/transactions');
      if (!res.ok) return;
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch { /* non-fatal */ }
  }, []);

  // ── Fetch option positions ──
  const fetchOptionPositions = useCallback(async () => {
    try {
      const res = await apiFetch('/options/positions');
      if (!res.ok) return;
      const data = await res.json();
      setOptionPositions(data.positions || []);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchOptionPositions();
  }, [fetchTransactions, fetchOptionPositions]);

  // ── 2. Fetch live prices + full history for each holding ──
  useEffect(() => {
    if (holdings.length === 0) return;

    const fetchPrices = async () => {
      const prices = {};
      const histories = {};
      let labels = [];

      for (const h of holdings) {
        try {
          const data = await fetchStockCached(h.ticker);
          if (data.tradingData && data.tradingData.length > 0) {
            const td = data.tradingData;
            prices[h.ticker] = td[td.length - 1].c;
            histories[h.ticker] = td.map(d => d.c);
            if (labels.length === 0) {
              labels = td.map(d => new Date(d.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            }
          }
        } catch (e) {
          // fall back to avgCost
        }
      }

      setLivePrices(prices);
      setPriceHistories(histories);
      if (labels.length > 0) setDateLabels(labels);
    };

    fetchPrices();
  }, [holdings]);

  // ── 3. Compute daily P&L from full price histories ──
  useEffect(() => {
    if (holdings.length === 0 || Object.keys(priceHistories).length === 0 || dateLabels.length === 0) return;

    const minLen = Math.min(
      dateLabels.length,
      ...holdings.map(h => priceHistories[h.ticker]?.length ?? Infinity).filter(n => n !== Infinity)
    );
    if (minLen < 2) return;

    // Portfolio market value at each day (current holdings only)
    const dailyValues = Array.from({ length: minLen }, (_, d) =>
      holdings.reduce((sum, h) => {
        const p = priceHistories[h.ticker]?.[d];
        return sum + (p !== undefined ? p * h.shares : 0);
      }, 0)
    );

    // Day-over-day change
    const pl = [];
    for (let d = 1; d < dailyValues.length; d++) {
      pl.push({ label: dateLabels[d], pl: dailyValues[d] - dailyValues[d - 1] });
    }
    setDailyPLData(pl);
  }, [holdings, priceHistories, dateLabels]);

  // ── 4. Enrich holdings with live prices ──
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

  // Top holding for KPI card
  const topHolding = withAlloc.length > 0
    ? withAlloc.reduce((top, h) => (h.alloc > top.alloc ? h : top), withAlloc[0])
    : null;

  // ── Apply filter + sort to drive the table / heatmap ──
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Sensible default direction per metric
      const numericDescDefault = ['mv', 'totPL', 'alloc', 'shares', 'avgCost', 'currentPrice'];
      setSortDir(numericDescDefault.includes(key) ? 'desc' : 'asc');
    }
  };

  const filtered = withAlloc.filter(h => {
    if (filter === 'winners') return h.totPL > 0;
    if (filter === 'losers') return h.totPL < 0;
    return true;
  });

  const displayHoldings = [...filtered].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    const aNum = Number(aVal) || 0;
    const bNum = Number(bVal) || 0;
    return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
  });

  const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── 6. Daily P&L bar chart ──
  useEffect(() => {
    if (dailyPLData.length === 0 || !dailyChartRef.current) return;
    if (dailyChartInstance.current) dailyChartInstance.current.destroy();

    const display = dailyPLData.slice(-60); // last 60 trading days
    const colors = display.map(d => d.pl >= 0 ? 'rgba(38,166,154,0.75)' : 'rgba(239,83,80,0.75)');
    const borders = display.map(d => d.pl >= 0 ? '#26a69a' : '#ef5350');

    dailyChartInstance.current = new Chart(dailyChartRef.current, {
      type: 'bar',
      data: {
        labels: display.map(d => d.label),
        datasets: [{
          data: display.map(d => d.pl),
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                return ` ${v >= 0 ? '+' : ''}$${v.toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#5d6673', font: { size: 10 }, maxTicksLimit: 12 },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: {
              color: '#5d6673',
              font: { size: 10 },
              callback: (v) => `$${v >= 0 ? '+' : ''}${v.toFixed(0)}`,
            },
            border: { display: false },
          },
        },
      },
    });

    return () => { if (dailyChartInstance.current) dailyChartInstance.current.destroy(); };
  }, [dailyPLData]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const todayPL = dailyPLData.length > 0 ? dailyPLData[dailyPLData.length - 1].pl : null;

  // ── Derived KPI metrics ──
  const costBasis = enriched.reduce((s, h) => s + h.costBasis, 0);
  const totalPLPct = costBasis > 0 ? (totalPL / costBasis) * 100 : 0;
  const cashPct = equity > 0 ? (cash / equity) * 100 : 100;
  const deployedPct = 100 - cashPct;
  const prevEquity = todayPL !== null ? equity - todayPL : equity;
  const todayPLPct = prevEquity > 0 && todayPL !== null ? (todayPL / prevEquity) * 100 : null;

  // ── Quick-trade modal handlers ──
  const openTradeModal = (h) => {
    setTradeModal({ ticker: h.ticker, name: h.name, currentPrice: h.currentPrice });
    setModalQty(1);
    setModalTradeError('');
  };

  const handleModalTrade = async (type) => {
    if (!tradeModal) return;
    const qty = parseInt(modalQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setModalTradeError('Quantity must be a positive whole number.');
      return;
    }
    if (type === 'BUY' && tradeModal.currentPrice * qty > cash) {
      setModalTradeError(`Insufficient funds. Need ${fmt(tradeModal.currentPrice * qty)} but only ${fmt(cash)} available.`);
      return;
    }

    setModalTradeError('');
    setModalTradeLoading(true);
    try {
      const res = await apiFetch('/portfolio/trade', {
        method: 'POST',
        body: JSON.stringify({
          ticker: tradeModal.ticker,
          name: tradeModal.name,
          type,
          shares: modalQty,
          pricePerShare: tradeModal.currentPrice,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Trade failed.');

      addToast({
        type: 'success',
        title: `${type} Order Filled`,
        message: `${modalQty} share${modalQty > 1 ? 's' : ''} of ${tradeModal.ticker} at ${fmt(tradeModal.currentPrice)}`,
        duration: 5000,
      });
      setTradeModal(null);
      fetchPortfolio();
      fetchTransactions();
    } catch (err) {
      addToast({ type: 'error', title: 'Trade Failed', message: err.message || 'Something went wrong.', duration: 5000 });
    } finally {
      setModalTradeLoading(false);
    }
  };

  // ── Close option position ──
  const handleCloseOption = async (pos) => {
    setClosingPosId(pos.id);
    try {
      const res = await apiFetch(`/options/close/${pos.id}`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Close failed.');
      addToast({
        type: 'success',
        title: 'Position Closed',
        message: `${pos.ticker} ${pos.optionType.toUpperCase()} $${pos.strike} · ${result.pl >= 0 ? '+' : ''}${fmt(result.pl)}`,
        duration: 5000,
      });
      fetchPortfolio();
      fetchOptionPositions();
    } catch (err) {
      addToast({ type: 'error', title: 'Close Failed', message: err.message || 'Something went wrong.', duration: 5000 });
    } finally {
      setClosingPosId(null);
    }
  };

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
        {/* Net Account Value */}
        <div className={`kpi-card kpi-card--v2 fade-in-up stagger-1 ${totalPL >= 0 ? 'kpi-card--gain' : 'kpi-card--loss'}`}>
          <div className="kpi-card-top">
            <div className="kpi-label">Net Account Value</div>
            {costBasis > 0 && (
              <div className={`kpi-pill ${totalPL >= 0 ? 'kpi-pill--up' : 'kpi-pill--down'}`}>
                {totalPL >= 0 ? '▲' : '▼'} {Math.abs(totalPLPct).toFixed(2)}%
              </div>
            )}
          </div>
          <div className="kpi-value-xl">{fmt(equity)}</div>
          <div className="kpi-card-foot">
            <span className="kpi-foot-label">Total P/L</span>
            <span className={totalPL >= 0 ? 'price-up' : 'price-down'} style={{ fontWeight: 600 }}>
              {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
            </span>
          </div>
        </div>

        {/* Cash Available */}
        <div className="kpi-card kpi-card--v2 fade-in-up stagger-2">
          <div className="kpi-card-top">
            <div className="kpi-label">Cash Available</div>
            <div className="kpi-pill kpi-pill--neutral">
              {cashPct.toFixed(0)}% reserve
            </div>
          </div>
          <div className="kpi-value-xl">{fmt(cash)}</div>
          <div className="kpi-progress">
            <div className="kpi-progress-fill" style={{ width: `${Math.min(100, deployedPct)}%` }} />
          </div>
          <div className="kpi-card-foot">
            <span className="kpi-foot-label">Deployed</span>
            <span style={{ fontWeight: 600 }}>{fmt(totalMV)} · {deployedPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Today's P/L */}
        <div className={`kpi-card kpi-card--v2 fade-in-up stagger-3 ${todayPL == null ? 'kpi-card--neutral' : todayPL >= 0 ? 'kpi-card--gain' : 'kpi-card--loss'}`}>
          <div className="kpi-card-top">
            <div className="kpi-label">Today&apos;s P/L</div>
            {todayPL !== null && todayPLPct !== null && (
              <div className={`kpi-pill ${todayPL >= 0 ? 'kpi-pill--up' : 'kpi-pill--down'}`}>
                {todayPL >= 0 ? '▲' : '▼'} {Math.abs(todayPLPct).toFixed(2)}%
              </div>
            )}
          </div>
          {todayPL !== null ? (
            <>
              <div className={`kpi-value-xl ${todayPL >= 0 ? 'price-up' : 'price-down'}`}>
                {todayPL >= 0 ? '+' : ''}{fmt(todayPL)}
              </div>
              <div className="kpi-card-foot">
                <span className="kpi-foot-label">vs yesterday&apos;s close</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  {dailyPLData.length} days tracked
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="kpi-value-xl" style={{ color: 'var(--text-muted)' }}>—</div>
              <div className="kpi-card-foot">
                <span className="kpi-foot-label">No price history yet</span>
                <span></span>
              </div>
            </>
          )}
        </div>

        {/* Top Holding */}
        <div className="kpi-card kpi-card--v2 fade-in-up stagger-4">
          <div className="kpi-card-top">
            <div className="kpi-label">Top Holding</div>
            {topHolding && (
              <div className="kpi-pill kpi-pill--accent">
                {topHolding.alloc.toFixed(1)}%
              </div>
            )}
          </div>
          {topHolding ? (
            <>
              <div className="kpi-value-xl" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {topHolding.ticker}
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: 0 }}>
                  {fmt(topHolding.mv)}
                </span>
              </div>
              <div className="kpi-progress">
                <div className="kpi-progress-fill" style={{ width: `${Math.min(100, topHolding.alloc)}%` }} />
              </div>
              <div className="kpi-card-foot">
                <span className="kpi-foot-label">{topHolding.shares} sh · {withAlloc.length} positions</span>
                <span className={topHolding.totPL >= 0 ? 'price-up' : 'price-down'} style={{ fontWeight: 600 }}>
                  {topHolding.totPL >= 0 ? '+' : ''}{fmt(topHolding.totPL)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="kpi-value-xl" style={{ color: 'var(--text-muted)' }}>—</div>
              <div className="kpi-card-foot">
                <span className="kpi-foot-label">No positions yet</span>
                <span></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Holdings Section */}
      <div className="holdings-card fade-in-up stagger-4">
        <div className="holdings-header-row">
          <div className="holdings-card-header">Holdings</div>
          {withAlloc.length > 0 && (
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'table' ? 'view-toggle-btn--active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'heatmap' ? 'view-toggle-btn--active' : ''}`}
                onClick={() => setViewMode('heatmap')}
              >
                Heatmap
              </button>
            </div>
          )}
        </div>

        {/* Filter pills */}
        {withAlloc.length > 0 && (
          <div className="holdings-filter-bar">
            <div className="filter-pills">
              <button
                className={`filter-pill ${filter === 'all' ? 'filter-pill--active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All <span className="filter-pill-count">{withAlloc.length}</span>
              </button>
              <button
                className={`filter-pill ${filter === 'winners' ? 'filter-pill--active' : ''}`}
                onClick={() => setFilter('winners')}
              >
                Winners <span className="filter-pill-count">{withAlloc.filter(h => h.totPL > 0).length}</span>
              </button>
              <button
                className={`filter-pill ${filter === 'losers' ? 'filter-pill--active' : ''}`}
                onClick={() => setFilter('losers')}
              >
                Losers <span className="filter-pill-count">{withAlloc.filter(h => h.totPL < 0).length}</span>
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Sorted by <strong style={{ color: 'var(--text-secondary)' }}>{
                ({ ticker: 'Ticker', shares: 'Qty', avgCost: 'Avg Cost', currentPrice: 'Price', mv: 'Market Value', totPL: 'P/L', alloc: 'Allocation' })[sortKey] || sortKey
              }</strong> · {sortDir === 'asc' ? 'ascending' : 'descending'}
            </div>
          </div>
        )}

        {viewMode === 'table' ? (
          <div className="holdings-table-wrap">
            <table className="data-table data-table--sortable">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('ticker')}>Ticker{sortArrow('ticker')}</th>
                  <th>Name</th>
                  <th className="text-right sortable" onClick={() => handleSort('shares')}>Qty{sortArrow('shares')}</th>
                  <th className="text-right sortable" onClick={() => handleSort('avgCost')}>Avg Cost{sortArrow('avgCost')}</th>
                  <th className="text-right sortable" onClick={() => handleSort('currentPrice')}>Price{sortArrow('currentPrice')}</th>
                  <th className="text-right sortable" onClick={() => handleSort('mv')}>Market Value{sortArrow('mv')}</th>
                  <th className="text-right sortable" onClick={() => handleSort('totPL')}>Total P/L{sortArrow('totPL')}</th>
                  <th className="sortable" onClick={() => handleSort('alloc')} style={{ minWidth: '140px' }}>Allocation{sortArrow('alloc')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {withAlloc.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className="empty-state" style={{ padding: '40px 20px' }}>
                        <div className="empty-state-icon">💼</div>
                        <h3>No positions yet</h3>
                        <p>Start by buying stocks from the Trade page</p>
                        <Link to="/trade" className="btn-primary" style={{ marginTop: '4px' }}>
                          Go to Trade
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : displayHoldings.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className="empty-state" style={{ padding: '32px 20px' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No positions match this filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayHoldings.map((h, i) => (
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
                      <td>
                        <div className="alloc-cell">
                          <div className="alloc-bar">
                            <div className="alloc-bar-fill" style={{ width: `${Math.min(100, h.alloc)}%` }} />
                          </div>
                          <span className="alloc-pct">{h.alloc.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          className="btn-ghost"
                          style={{ padding: '4px 10px', fontSize: '11px', minHeight: 'unset' }}
                          onClick={() => openTradeModal(h)}
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {withAlloc.length > 0 && displayHoldings.length > 0 && (
                <tfoot>
                  <tr>
                    <th colSpan="5" className="text-right">
                      {filter === 'all' ? 'Totals' : `${filter[0].toUpperCase()}${filter.slice(1)} subtotal`}
                    </th>
                    <th className="text-right">{fmt(displayHoldings.reduce((s, h) => s + h.mv, 0))}</th>
                    <th className={`text-right ${displayHoldings.reduce((s, h) => s + h.totPL, 0) >= 0 ? 'price-up' : 'price-down'}`}>
                      {displayHoldings.reduce((s, h) => s + h.totPL, 0) >= 0 ? '+' : ''}{fmt(displayHoldings.reduce((s, h) => s + h.totPL, 0))}
                    </th>
                    <th>{displayHoldings.reduce((s, h) => s + h.alloc, 0).toFixed(1)}%</th>
                    <th></th>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <PortfolioHeatmap holdings={displayHoldings} />
        )}
      </div>

      {/* ── Daily P&L Chart ── */}
      {dailyPLData.length > 1 && (
        <div className="daily-perf-card fade-in-up">
          <div className="holdings-header-row">
            <div className="holdings-card-header">Daily P/L</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Based on current holdings · last {Math.min(dailyPLData.length, 60)} trading days
            </div>
          </div>
          <div style={{ height: '180px', padding: '12px 16px 16px' }}>
            <canvas ref={dailyChartRef} />
          </div>
        </div>
      )}

      {/* ── Options Positions ── */}
      {optionPositions.length > 0 && (
        <div className="holdings-card fade-in-up" style={{ marginTop: '16px' }}>
          <div className="holdings-header-row">
            <div className="holdings-card-header">Open Options Positions</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {optionPositions.length} contract{optionPositions.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="holdings-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Type</th>
                  <th className="text-right">Strike</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Premium Paid</th>
                  <th className="text-right">Current Value</th>
                  <th className="text-right">P/L</th>
                  <th className="text-right">Days Left</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {optionPositions.map(p => {
                  const cost = p.premium * 100 * p.contracts;
                  const value = p.currentValue * 100 * p.contracts;
                  const pl = value - cost;
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.ticker}</strong></td>
                      <td>
                        <span className={p.optionType === 'call' ? 'price-up' : 'price-down'} style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>
                          {p.optionType}
                        </span>
                      </td>
                      <td className="text-right">${p.strike.toFixed(2)}</td>
                      <td className="text-right">{p.contracts}</td>
                      <td className="text-right">{fmt(cost)}</td>
                      <td className="text-right">{fmt(value)}</td>
                      <td className={`text-right ${pl >= 0 ? 'price-up' : 'price-down'}`}>
                        {pl >= 0 ? '+' : ''}{fmt(pl)}
                      </td>
                      <td className="text-right" style={{ color: p.daysLeft <= 3 ? 'var(--color-warning)' : 'var(--text-secondary)' }}>
                        {p.daysLeft}d
                      </td>
                      <td className="text-right">
                        <button
                          className="btn-ghost"
                          style={{ padding: '4px 10px', fontSize: '11px', minHeight: 'unset' }}
                          onClick={() => handleCloseOption(p)}
                          disabled={closingPosId === p.id}
                        >
                          {closingPosId === p.id ? '...' : 'Close'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Transaction History ── */}
      {transactions.length > 0 && (
        <div className="holdings-card fade-in-up" style={{ marginTop: '16px' }}>
          <div className="holdings-header-row">
            <div className="holdings-card-header">Recent Activity</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Last {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="holdings-table-wrap" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Ticker</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => {
                  const ts = t.createdAt?._seconds
                    ? new Date(t.createdAt._seconds * 1000)
                    : t.createdAt?.seconds
                      ? new Date(t.createdAt.seconds * 1000)
                      : null;
                  const dateStr = ts
                    ? ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
                      ' · ' + ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : '—';
                  const isOption = t.kind === 'OPTION_BUY' || t.kind === 'OPTION_CLOSE';
                  const label = t.kind === 'OPTION_BUY'
                    ? `BUY ${t.optionType?.toUpperCase()} $${t.strike}`
                    : t.kind === 'OPTION_CLOSE'
                      ? `CLOSE ${t.optionType?.toUpperCase()} $${t.strike}`
                      : t.type;
                  const isBuy = t.type === 'BUY' || t.kind === 'OPTION_BUY';
                  return (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{dateStr}</td>
                      <td>
                        <span className={isBuy ? 'price-up' : 'price-down'} style={{ fontWeight: 600, fontSize: '11px' }}>
                          {label}
                        </span>
                      </td>
                      <td><strong>{t.ticker}</strong></td>
                      <td className="text-right">{isOption ? `${t.contracts} ct` : t.shares}</td>
                      <td className="text-right">{fmt(t.pricePerShare)}</td>
                      <td className={`text-right ${isBuy ? 'price-down' : 'price-up'}`}>
                        {isBuy ? '−' : '+'}{fmt(t.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Quick-Trade Modal ── */}
      {tradeModal && (
        <div className="modal-overlay" onClick={() => setTradeModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '16px' }}>{tradeModal.ticker}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tradeModal.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price-value" style={{ fontSize: '18px' }}>{fmt(tradeModal.currentPrice)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>per share</div>
              </div>
            </div>

            <div className="kpi-card" style={{ padding: '10px 12px', marginBottom: '12px' }}>
              <div className="kpi-label">Cash Available</div>
              <div className="kpi-value" style={{ fontSize: '18px' }}>{fmt(cash)}</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label className="modal-label">Quantity</label>
              <input
                type="number"
                className="input-modern"
                value={modalQty}
                onChange={(e) => { setModalQty(Math.max(1, Math.floor(Number(e.target.value)))); setModalTradeError(''); }}
                min="1"
                step="1"
              />
            </div>

            <div className="order-summary" style={{ marginBottom: '12px' }}>
              <div className="order-row">
                <span style={{ color: 'var(--text-secondary)' }}>Price per share</span>
                <span className="price-value">{fmt(tradeModal.currentPrice)}</span>
              </div>
              <div className="order-row">
                <span style={{ color: 'var(--text-secondary)' }}>Quantity</span>
                <span>{modalQty}</span>
              </div>
              <hr className="order-divider" />
              <div className="order-row">
                <strong>Estimated Total</strong>
                <strong className="price-value">{fmt(tradeModal.currentPrice * modalQty)}</strong>
              </div>
            </div>

            {modalTradeError && <div className="alert-error" style={{ marginBottom: '10px', fontSize: '12px' }}>{modalTradeError}</div>}

            <div className="trade-actions" style={{ marginBottom: '8px' }}>
              <button className="btn-success" onClick={() => handleModalTrade('BUY')} disabled={modalTradeLoading}>
                {modalTradeLoading ? '...' : 'Buy'}
              </button>
              <button className="btn-danger" onClick={() => handleModalTrade('SELL')} disabled={modalTradeLoading}>
                {modalTradeLoading ? '...' : 'Sell'}
              </button>
            </div>
            <button className="btn-ghost" onClick={() => setTradeModal(null)} style={{ width: '100%' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;

