import React, { useState } from 'react';

const OptionsCenter = () => {
  const [calc, setCalc] = useState({
    stockPrice: 150,
    strikePrice: 155,
    premium: 2.50,
    type: 'call'
  });

  const handleCalcChange = (e) => {
    setCalc({
      ...calc,
      [e.target.name]: parseFloat(e.target.value) || 0
    });
  };

  const handleTypeChange = (e) => setCalc({ ...calc, type: e.target.value });

  const breakeven = calc.type === 'call' 
    ? calc.strikePrice + calc.premium 
    : calc.strikePrice - calc.premium;

  const currentITM = calc.type === 'call'
    ? Math.max(0, calc.stockPrice - calc.strikePrice)
    : Math.max(0, calc.strikePrice - calc.stockPrice);

  const timeValue = Math.max(0, calc.premium - currentITM);

  const maxLoss = calc.premium * 100;
  const maxProfit = calc.type === 'call' ? 'Unlimited' : `$${((calc.strikePrice - calc.premium) * 100).toFixed(0)}`;

  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    { 
      q: "What is the difference between a Call and a Put?", 
      a: "A Call option gives you the right to buy 100 shares at the strike price before expiration. You profit when the stock goes up. A Put option gives you the right to sell 100 shares at the strike price. You profit when the stock goes down." 
    },
    { 
      q: "What does 'In the Money' (ITM) mean?", 
      a: "A Call is ITM when the stock price is above the strike price (it has intrinsic value). A Put is ITM when the stock price is below the strike. ITM options are more expensive because they have built-in value." 
    },
    { 
      q: "Can I lose more than I invested?", 
      a: "If you buy options (long calls/puts), your maximum loss is the premium you paid. However, if you sell (write) naked options, your losses can be theoretically unlimited for calls, or substantial for puts." 
    },
    {
      q: "What happens when an option expires?",
      a: "If the option is ITM at expiration, it's typically auto-exercised. If it's out of the money (OTM), it expires worthless and you lose the premium paid. Most traders close positions before expiration."
    },
    {
      q: "How does time decay (Theta) affect my position?",
      a: "Time decay erodes the value of options as expiration approaches — this accelerates in the final 30 days. Option buyers lose value to theta, while option sellers profit from it. This is why timing matters."
    }
  ];

  return (
    <div className="page-container page-container--narrow" style={{ display: 'grid', gap: '20px' }}>
      
      {/* Hero Banner */}
      <div className="hero-banner fade-in-up">
        <h1>Options Knowledge Hub</h1>
        <p>
          Everything you need to understand options: from calls and puts, to premium pricing, Greeks, and risk assessment.
        </p>
        <div className="tags-row">
          {['Calls', 'Puts', 'Volatility', 'Greeks', 'Risk', 'Strategies'].map(tag => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid-auto">
        <div className="card-flat fade-in-up stagger-1">
          <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>What is an Option?</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>A derivative contract granting the right, but not the obligation, to buy or sell the underlying asset at a specified strike price on or before a specified date.</p>
        </div>
        <div className="card-flat fade-in-up stagger-2">
          <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>American vs. European</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>American-style options can be exercised any time before expiration. European-style can only be exercised on the expiration date itself.</p>
        </div>
        <div className="card-flat fade-in-up stagger-3">
          <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>Intrinsic vs Extrinsic Value</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>Premium = Intrinsic (built-in profit if exercised now) + Extrinsic (time value based on probability of moving deeper ITM before expiration).</p>
        </div>
      </div>

      {/* The Greeks */}
      <section className="section-panel fade-in-up">
        <h2 style={{ marginTop: 0, fontSize: '18px' }}>The Greeks</h2>
        <div className="grid-4" style={{ marginTop: '14px' }}>
          <div className="greek-card">
            <h4 style={{ color: 'var(--accent)' }}>Delta (Δ)</h4>
            <p>Expected price change per $1 move in the underlying. Approximates the probability of expiring ITM.</p>
          </div>
          <div className="greek-card">
            <h4 style={{ color: '#7b61ff' }}>Gamma (Γ)</h4>
            <p>Rate of change in Delta. Highest for ATM options, indicating extreme price sensitivity near the money.</p>
          </div>
          <div className="greek-card">
            <h4 style={{ color: 'var(--color-loss)' }}>Theta (Θ)</h4>
            <p>Time decay — how much value bleeds daily. Accelerates significantly in the final 30 days before expiry.</p>
          </div>
          <div className="greek-card">
            <h4 style={{ color: 'var(--color-warning)' }}>Vega (V)</h4>
            <p>Sensitivity to implied volatility. Premiums surge before earnings, Fed announcements, and major events.</p>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="section-panel fade-in-up">
        <h2 style={{ marginTop: 0, fontSize: '18px' }}>Strategy Calculator</h2>
        <div className="calculator-grid">
          <div className="calculator-field">
            <label>Stock Price ($)</label>
            <input type="number" name="stockPrice" value={calc.stockPrice} onChange={handleCalcChange} className="input-modern" />
          </div>
          <div className="calculator-field">
            <label>Strike Price ($)</label>
            <input type="number" name="strikePrice" value={calc.strikePrice} onChange={handleCalcChange} className="input-modern" />
          </div>
          <div className="calculator-field">
            <label>Premium Paid ($)</label>
            <input type="number" name="premium" value={calc.premium} onChange={handleCalcChange} className="input-modern" />
          </div>
          <div className="calculator-field">
            <label>Option Type</label>
            <select value={calc.type} onChange={handleTypeChange} className="select-modern">
              <option value="call">Long Call</option>
              <option value="put">Long Put</option>
            </select>
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: '18px' }}>
          <div className="result-card">
            <div className="result-label">Breakeven</div>
            <div className="result-value">${breakeven.toFixed(2)}</div>
          </div>
          <div className="result-card">
            <div className="result-label">Intrinsic Value</div>
            <div className="result-value">${currentITM.toFixed(2)}</div>
          </div>
          <div className="result-card">
            <div className="result-label">Time Value</div>
            <div className="result-value">${timeValue.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: '12px' }}>
          <div className="result-card">
            <div className="result-label">Max Loss (per contract)</div>
            <div className="result-value" style={{ color: 'var(--color-loss)', fontSize: '18px' }}>${maxLoss.toFixed(0)}</div>
          </div>
          <div className="result-card">
            <div className="result-label">Max Profit</div>
            <div className="result-value" style={{ color: 'var(--color-gain)', fontSize: '18px' }}>{maxProfit}</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-panel fade-in-up">
        <h2 style={{ marginTop: 0, fontSize: '18px' }}>Frequently Asked Questions</h2>
        <div className="faq-container">
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <button onClick={() => toggleFaq(i)} className="faq-question">
                {faq.q}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{openFaq === i ? '▲' : '▼'}</span>
              </button>
              {openFaq === i && (
                <div className="faq-answer">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default OptionsCenter;
