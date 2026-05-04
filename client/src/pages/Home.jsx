import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchStockCached } from '../utils/stockCache';
import Chart from 'chart.js/auto';

// ─── Live market mini-card ────────────────────────────────────────────────────
const MarketCard = ({ ticker }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const json = await fetchStockCached(ticker);
        setData(json.tradingData?.length > 0 ? json : { error: true });
      } catch {
        setData({ error: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [ticker]);

  useEffect(() => {
    if (!data || data.error || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const prices = data.tradingData.map(d => d.c);
    const labels = data.tradingData.map(d => new Date(d.t).toLocaleDateString());
    const isUp = prices[prices.length - 1] >= prices[0];
    const color = isUp ? '#26a69a' : '#ef5350';

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: prices,
          borderColor: color,
          backgroundColor: isUp ? 'rgba(38,166,154,0.08)' : 'rgba(239,83,80,0.08)',
          borderWidth: 1.5,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: { duration: 800 },
      },
    });

    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [data]);

  const prices = data?.tradingData;
  const latest = prices?.[prices.length - 1]?.c;
  const first = prices?.[0]?.c;
  const changePct = latest && first ? ((latest - first) / first) * 100 : null;
  const isUp = changePct === null ? true : changePct >= 0;

  return (
    <div className="market-card fade-in-up">
      <div className="market-card-top">
        <div>
          <div className="market-card-ticker">{ticker}</div>
          <div className="market-card-name">
            {loading ? '—' : (data?.name || ticker)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {loading ? (
            <div className="skeleton" style={{ width: 64, height: 32, borderRadius: 6 }} />
          ) : latest ? (
            <>
              <div className="market-card-price">${latest.toFixed(2)}</div>
              {changePct !== null && (
                <div className={`market-card-change ${isUp ? 'price-up' : 'price-down'}`}>
                  {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
                </div>
              )}
            </>
          ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Unavailable</span>}
        </div>
      </div>
      <div className="market-card-chart">
        {loading ? (
          <div className="skeleton" style={{ height: '100%', borderRadius: 4 }} />
        ) : data?.error ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', paddingTop: 20 }}>No data</div>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>
    </div>
  );
};

// ─── Animated counter ─────────────────────────────────────────────────────────
const useCountUp = (target, duration = 1500) => {
  const [value, setValue] = useState(0);
  const startTime = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    startTime.current = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
};

const StatItem = ({ target, prefix = '', suffix = '', label }) => {
  const count = useCountUp(target);
  return (
    <div className="stat-item fade-in-up">
      <div className="stat-number">{prefix}{count.toLocaleString()}{suffix}</div>
      <div className="stat-desc">{label}</div>
    </div>
  );
};

// ─── Home ─────────────────────────────────────────────────────────────────────
const Home = () => {
  const { currentUser } = useAuth();

  return (
    <div className="page-container">

      {/* ── Hero ── */}
      <section className="hero-section hero-gradient fade-in">
        <div className="hero-badge">
          <span className="pulse-dot" />
          Risk-Free Paper Trading
        </div>

        <h1 className="hero-title">
          Learn.{' '}
          <span className="accent-text">Trade.</span>
          {' '}Analyze.
        </h1>

        <p className="hero-subtitle">
          Paper trade real stocks with live market data, master options chains,
          and get AI-powered market insights — without risking a cent.
        </p>

        <div className="hero-ctas">
          {currentUser ? (
            <>
              <Link to="/trade" className="btn-primary" style={{ padding: '12px 32px', fontSize: '14px' }}>
                Continue Trading →
              </Link>
              <Link to="/portfolio" className="btn-ghost" style={{ padding: '12px 28px', fontSize: '14px' }}>
                View Portfolio
              </Link>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn-primary" style={{ padding: '12px 32px', fontSize: '14px' }}>
                Get Started Free →
              </Link>
              <Link to="/options-center" className="btn-ghost" style={{ padding: '12px 28px', fontSize: '14px' }}>
                Explore Options
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="home-section">
        <div className="stats-row">
          <StatItem prefix="$" target={100000} label="Starting Capital" />
          <StatItem target={6} suffix=" mo" label="Price History" />
          <StatItem target={5} label="Options Greeks" />
          <StatItem target={0} suffix=" risk" label="Paper Trading" />
        </div>
      </div>

      {/* ── Feature Cards ── */}
      <div className="home-section">
        <h2 className="section-heading">Everything in one platform</h2>
        <div className="feature-cards">
          <Link to="/trade" className="feature-card feature-card--blue fade-in-up stagger-1">
            <h3>Trade</h3>
            <p>Search any stock, compare tickers on the same chart, execute paper trades, and monitor your watchlist — all in one unified view.</p>
          </Link>
          <Link to="/portfolio" className="feature-card feature-card--green fade-in-up stagger-2">
            <h3>Portfolio</h3>
            <p>Track holdings, P&L, and allocation with live prices. Visualize with allocation charts and heatmaps, and quick-trade positions inline.</p>
          </Link>
          <Link to="/options-center" className="feature-card feature-card--purple fade-in-up stagger-3">
            <h3>Options Hub</h3>
            <p>Learn calls, puts, and the Greeks with interactive calculators. Simulate real options chains in a risk-free playground.</p>
          </Link>
          <Link to="/ask" className="feature-card feature-card--orange fade-in-up stagger-4">
            <h3>Ask AI</h3>
            <p>Ask anything about trading strategy, risk management, or market mechanics — powered by GPT-4o-mini with financial context.</p>
          </Link>
        </div>
      </div>

      {/* ── Live Market Trends ── */}
      <div className="home-section">
        <h2 className="section-heading">
          <span className="pulse-dot" />
          Live Market Trends
        </h2>
        <div className="grid-auto">
          {['AAPL', 'GOOGL', 'TSLA', 'NVDA'].map(t => (
            <MarketCard key={t} ticker={t} />
          ))}
        </div>
      </div>

    </div>
  );
};

export default Home;
