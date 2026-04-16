import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Chart from 'chart.js/auto';

const StockChartCard = ({ ticker }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/stocks/${ticker}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker }),
        });
        const json = await response.json();
        if (json.tradingData && json.tradingData.length > 0) {
          setData(json);
        } else {
          setData({ error: true });
        }
      } catch (err) {
        setData({ error: true });
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, [ticker]);

  useEffect(() => {
    if (data && !data.error && chartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();

      const labels = data.tradingData.map(d => new Date(d.t).toLocaleDateString());
      const prices = data.tradingData.map(d => d.c);
      
      const isPositive = prices[prices.length - 1] >= prices[0];
      const color = isPositive ? '#26a69a' : '#ef5350';

      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: `${ticker}`,
            data: prices,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: color,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: {
              grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
              ticks: { color: '#5d6673', font: { size: 10 }, maxTicksLimit: 4 },
              border: { display: false },
            }
          },
          interaction: { intersect: false, mode: 'index' },
        }
      });
    }

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [data, ticker]);

  const latestPrice = data && !data.error && data.tradingData 
    ? data.tradingData[data.tradingData.length - 1].c : null;
  const isUp = data && !data.error && data.tradingData 
    ? data.tradingData[data.tradingData.length - 1].c >= data.tradingData[0].c : true;

  return (
    <div className="card-flat" style={{ height: '240px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-bright)' }}>{ticker}</span>
        {loading ? (
          <div className="skeleton skeleton-text" style={{ width: '60px', height: '14px', marginBottom: 0 }} />
        ) : latestPrice ? (
          <span className={isUp ? 'price-up' : 'price-down'} style={{ fontSize: '14px' }}>
            ${latestPrice.toFixed(2)}
          </span>
        ) : null}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div className="skeleton" style={{ height: '100%', borderRadius: 'var(--radius-md)' }} />
        ) : data && data.error ? (
          <div className="chart-error">Unavailable</div>
        ) : (
          <canvas ref={chartRef}></canvas>
        )}
      </div>
    </div>
  );
};

// Animated counter hook
const useCountUp = (target, duration = 1500) => {
  const [value, setValue] = useState(0);
  const startTime = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === 0) return;
    startTime.current = performance.now();
    
    const animate = (now) => {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
};

const StatItem = ({ target, suffix = '', label }) => {
  const count = useCountUp(target);
  return (
    <div className="stat-item fade-in-up">
      <div className="stat-number">{count.toLocaleString()}{suffix}</div>
      <div className="stat-desc">{label}</div>
    </div>
  );
};

const Home = () => {
  const { currentUser } = useAuth();
  const featuredTickers = ['AAPL', 'GOOGL', 'TSLA', 'NVDA'];

  return (
    <div className="page-container">
      
      {/* Hero */}
      <section className="hero-section fade-in">
        <h1 className="hero-title">
          Trade Smarter with <span className="accent-text">Currensee</span>
        </h1>
        <p className="hero-subtitle">
          Paper trade stocks, analyze options chains, and get AI-powered market insights — all in one platform.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {currentUser ? (
            <Link to="/dashboard" className="btn-primary" style={{ padding: '11px 28px', fontSize: '14px' }}>
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth" className="btn-primary" style={{ padding: '11px 28px', fontSize: '14px' }}>
                Get Started
              </Link>
              <Link to="/options-center" className="btn-outline-accent" style={{ padding: '11px 28px', fontSize: '14px' }}>
                Learn Options
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Stats */}
      <div className="home-section">
        <div className="stats-row">
          <StatItem target={100000} suffix="" label="Starting Capital" />
          <StatItem target={8} suffix="+" label="Live Markets" />
          <StatItem target={5} suffix="" label="Options Greeks" />
          <StatItem target={24} suffix="/7" label="AI Assistant" />
        </div>
      </div>

      {/* Feature Cards */}
      <div className="home-section">
        <div className="feature-cards">
          <Link to="/dashboard" className="feature-card fade-in-up stagger-1">
            <div className="feature-card-icon">📈</div>
            <h3>Trading Dashboard</h3>
            <p>Search any stock, view live charts, and execute paper trades with real-time market data.</p>
          </Link>
          <Link to="/options-center" className="feature-card fade-in-up stagger-2">
            <div className="feature-card-icon">⚡</div>
            <h3>Options Center</h3>
            <p>Learn options fundamentals, calculate breakevens, and explore the Greeks in an interactive playground.</p>
          </Link>
          <Link to="/ask" className="feature-card fade-in-up stagger-3">
            <div className="feature-card-icon">🤖</div>
            <h3>AI Market Tutor</h3>
            <p>Ask questions about trading strategies, risk management, and market mechanics — powered by AI.</p>
          </Link>
        </div>
      </div>

      {/* Live Charts */}
      <div className="home-section">
        <h2 className="section-heading">
          <span className="pulse-dot" />
          Live Market Trends
        </h2>
        <div className="grid-auto">
          {featuredTickers.map(t => <StockChartCard key={t} ticker={t} />)}
        </div>
      </div>
      
    </div>
  );
};

export default Home;
