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

  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    { q: "What is the difference between a Call and a Put?", a: "A Call gives you the right to buy... A Put gives you the right to sell..." },
    { q: "What does 'In the Money' (ITM) mean?", a: "An option is ITM if it has intrinsic value..." },
    { q: "Can I lose more than I invested?", a: "If you buy options, your max loss is the premium paid. If you short (sell) options, your losses can theoretically be unlimited." }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '28px auto', padding: '0 20px 60px', display: 'grid', gridTemplateColumns: '1fr', gap: '22px' }}>
      
      <div style={{ background: 'linear-gradient(135deg, rgba(0, 179, 179, .18), rgba(61, 168, 245, .14))', border: '1px solid #1d2a36', borderRadius: '22px', padding: '26px', boxShadow: '0 10px 30px rgba(0, 0, 0, .45)' }}>
        <h1 style={{ margin: '0 0 10px', fontSize: '34px' }}>Options Knowledge Hub</h1>
        <p style={{ margin: 0, color: '#b8c7cc', maxWidth: '70ch' }}>
          Everything you need to level up your options literacy: from what calls and puts are, to how premium is priced, how to assess risk, and how to pick strikes intelligently.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          {['Calls', 'Puts', 'Volatility', 'Greeks', 'Risk'].map(tag => (
            <span key={tag} style={{ fontSize: '12px', padding: '6px 10px', border: '1px solid #1d2a36', borderRadius: '999px', color: '#b8c7cc', background: 'rgba(15, 20, 26, .55)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#0f141a', border: '1px solid #1d2a36', borderRadius: '16px', padding: '18px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>What is an Option?</h3>
          <p style={{ margin: 0, color: '#b8c7cc' }}>An option is a contract granting the right, not the obligation, to buy or sell an asset at a specific price.</p>
        </div>
        <div style={{ background: '#0f141a', border: '1px solid #1d2a36', borderRadius: '16px', padding: '18px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>American vs. European</h3>
          <p style={{ margin: 0, color: '#b8c7cc' }}>American-style options can be exercised anytime; European-style only at expiration.</p>
        </div>
      </div>

      <section style={{ background: '#12161d', border: '1px solid #1d2a36', borderRadius: '16px', padding: '22px' }}>
        <h2 style={{ marginTop: 0, fontSize: '24px' }}>Quick Strategy Calculator</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#b8c7cc' }}>Current Stock Price ($)</label>
            <input type="number" name="stockPrice" value={calc.stockPrice} onChange={handleCalcChange} style={{ background: '#0f141a', border: '1px solid #1d2a36', color: '#e6f0f2', padding: '10px 12px', borderRadius: '10px' }} />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#b8c7cc' }}>Strike Price ($)</label>
            <input type="number" name="strikePrice" value={calc.strikePrice} onChange={handleCalcChange} style={{ background: '#0f141a', border: '1px solid #1d2a36', color: '#e6f0f2', padding: '10px 12px', borderRadius: '10px' }} />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#b8c7cc' }}>Option Premium Paid ($)</label>
            <input type="number" name="premium" value={calc.premium} onChange={handleCalcChange} style={{ background: '#0f141a', border: '1px solid #1d2a36', color: '#e6f0f2', padding: '10px 12px', borderRadius: '10px' }} />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#b8c7cc' }}>Option Type</label>
            <select value={calc.type} onChange={handleTypeChange} style={{ background: '#0f141a', border: '1px solid #1d2a36', color: '#e6f0f2', padding: '10px 12px', borderRadius: '10px' }}>
              <option value="call">Long Call</option>
              <option value="put">Long Put</option>
            </select>
          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '22px' }}>
          <div style={{ background: '#0f141a', border: '1px solid #1d2a36', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#b8c7cc' }}>Breakeven Price</div>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>${breakeven.toFixed(2)}</div>
          </div>
          <div style={{ background: '#0f141a', border: '1px solid #1d2a36', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#b8c7cc' }}>Intrinsic Value</div>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>${currentITM.toFixed(2)}</div>
          </div>
          <div style={{ background: '#0f141a', border: '1px solid #1d2a36', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#b8c7cc' }}>Time Value</div>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>${timeValue.toFixed(2)}</div>
          </div>
        </div>
      </section>

      <section style={{ background: '#12161d', border: '1px solid #1d2a36', borderRadius: '16px', padding: '22px' }}>
        <h2 style={{ marginTop: 0, fontSize: '24px' }}>Frequently Asked Questions</h2>
        <div style={{ border: '1px solid #1d2a36', borderRadius: '16px', overflow: 'hidden' }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderTop: i !== 0 ? '1px solid #1d2a36' : 'none' }}>
              <button 
                onClick={() => toggleFaq(i)}
                style={{ width: '100%', textAlign: 'left', background: '#0c1016', color: 'white', border: 'none', padding: '16px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                {faq.q}
                <span>{openFaq === i ? '▲' : '▼'}</span>
              </button>
              {openFaq === i && (
                <div style={{ background: '#0d131a', padding: '16px', color: '#b8c7cc' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default OptionsCenter;
