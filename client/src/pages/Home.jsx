import React, { useEffect, useRef, useState } from 'react';
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
      const color = isPositive ? '#00d2ff' : '#ef4444';
      const bgColor = isPositive ? 'rgba(0, 210, 255, 0.1)' : 'rgba(239, 68, 68, 0.1)';

      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: `${ticker} Price`,
            data: prices,
            borderColor: color,
            backgroundColor: bgColor,
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [data, ticker]);

  return (
    <div className="card-glass" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>{ticker}</h3>
        {loading ? (
          <span style={{ color: 'var(--color-text-muted)' }}>Loading...</span>
        ) : data && !data.error && data.tradingData ? (
          <span style={{ fontWeight: 'bold', color: data.tradingData[data.tradingData.length - 1].c >= data.tradingData[0].c ? 'var(--color-brand-primary)' : 'var(--color-accent-danger)' }}>
            ${data.tradingData[data.tradingData.length - 1].c.toFixed(2)}
          </span>
        ) : null}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {data && data.error ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            API limit or data unavailable
          </div>
        ) : (
          <canvas ref={chartRef}></canvas>
        )}
      </div>
    </div>
  );
};

const Home = () => {
  const featuredTickers = ['CLSK', 'GOOG', 'META', 'UNH'];

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1600px', margin: '0 auto' }}>
      
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3.5rem', margin: '0 0 16px 0', background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
          Welcome to Currensee
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem' }}>
          Your personal finance platform migrated seamlessly to React and Vite. Experience flawless paper trading with Massive API.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', paddingLeft: '10px', borderLeft: '4px solid var(--color-brand-primary)' }}>
          Live Market Trends
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {featuredTickers.map(t => <StockChartCard key={t} ticker={t} />)}
        </div>
      </section>
      
    </div>
  );
};

export default Home;
