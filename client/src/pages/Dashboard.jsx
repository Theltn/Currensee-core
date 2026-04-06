import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const Dashboard = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [cashBalance, setCashBalance] = useState(10000.00);
  const [search, setSearch] = useState('');
  const [stock, setStock] = useState({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 150.00,
    change: 2.50,
    open: 148.00,
    volume: '54M',
    high: 151.00,
    low: 147.00
  });

  const [orderType, setOrderType] = useState('market');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      
      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Stock Price',
            data: [140, 145, 142, 148, 146, 150],
            borderColor: '#00d4aa',
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { color: '#2d3748' }, ticks: { color: '#a0aec0' } },
            y: { grid: { color: '#2d3748' }, ticks: { color: '#a0aec0' } }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, []);

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        
        {/* Left Column - Search and Chart */}
        <div className="col-lg-8">
          <div style={{ background: '#1a1f2e', borderRadius: '8px', padding: '20px', border: '1px solid #2d3748', marginBottom: '20px' }}>
            <h5 style={{ color: 'white' }}><i className="fas fa-search"></i> Stock Search</h5>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search for stocks (e.g., AAPL, GOOGL, TSLA...)" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: '#2d3748', border: '1px solid #4a5568', color: 'white' }}
            />
          </div>

          <div style={{ background: '#1a1f2e', borderRadius: '8px', padding: '20px', border: '1px solid #2d3748', height: '400px' }}>
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Right Column - Trading Panel */}
        <div className="col-lg-4">
          <div style={{ background: '#1a1f2e', borderRadius: '8px', padding: '20px', border: '1px solid #2d3748', height: '100%' }}>
            
            <div style={{ background: '#0f1419', borderRadius: '6px', padding: '15px', marginBottom: '20px', borderLeft: '4px solid #00d4aa' }}>
              <h4 style={{ color: 'white' }}>{stock.symbol}</h4>
              <h3 style={{ color: '#00d4aa' }}>${stock.price}</h3>
              <p style={{ color: '#00d4aa' }}>+{stock.change}</p>
              
              <div className="row mt-2" style={{ color: '#a0aec0', fontSize: '0.9em' }}>
                <div className="col-6">Open: <span style={{ color: 'white' }}>${stock.open}</span></div>
                <div className="col-6">Volume: <span style={{ color: 'white' }}>{stock.volume}</span></div>
                <div className="col-6">High: <span style={{ color: 'white' }}>${stock.high}</span></div>
                <div className="col-6">Low: <span style={{ color: 'white' }}>${stock.low}</span></div>
              </div>
            </div>

            <div style={{ background: '#0f1419', borderRadius: '6px', padding: '15px', marginBottom: '20px' }}>
              <h6 style={{ color: 'white' }}>Account Balance</h6>
              <h5 style={{ color: 'white' }}>${cashBalance.toFixed(2)}</h5>
            </div>

            <div className="mb-3">
              <label style={{ color: '#a0aec0' }}>Order Type</label>
              <select className="form-control" value={orderType} onChange={(e) => setOrderType(e.target.value)} style={{ background: '#2d3748', color: 'white', border: '1px solid #4a5568' }}>
                <option value="market">Market Order</option>
                <option value="limit">Limit Order</option>
              </select>
            </div>

            <div className="mb-3">
              <label style={{ color: '#a0aec0' }}>Quantity</label>
              <input type="number" className="form-control" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min="1" style={{ background: '#2d3748', color: 'white', border: '1px solid #4a5568' }} />
            </div>

            <div style={{ background: '#0f1419', borderRadius: '6px', padding: '15px', marginTop: '15px', color: 'white' }}>
              <div className="d-flex justify-content-between"><span>Price per share:</span><span>${stock.price}</span></div>
              <div className="d-flex justify-content-between"><span>Quantity:</span><span>{quantity}</span></div>
              <hr style={{ borderColor: '#2d3748' }} />
              <div className="d-flex justify-content-between"><strong style={{ color: 'white' }}>Total Cost:</strong><strong style={{ color: 'white' }}>${(stock.price * quantity).toFixed(2)}</strong></div>
            </div>

            <div className="mt-3" style={{ display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, background: '#00d4aa', color: '#001012', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold' }}><i className="fas fa-arrow-up"></i> BUY</button>
              <button style={{ flex: 1, background: '#ff4757', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold' }}><i className="fas fa-arrow-down"></i> SELL</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
