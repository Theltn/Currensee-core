import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <header className="topbar" role="banner" style={{ background: '#0b1117', color: 'white', borderBottom: '1px solid #1a2430' }}>
      <div className="topbar-inner" style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', justifyContent: 'space-between' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/CurrenseeLogo.png" alt="Currensee Logo" style={{ height: '40px', width: 'auto' }} />
          <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Currensee</span>
        </div>

        <nav className="row" aria-label="Primary" style={{ display: 'flex', gap: '10px' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
          <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }} className="pill">Trading Dashboard</Link>
          <Link to="/options" style={{ color: 'white', textDecoration: 'none' }} className="pill">Options Hub</Link>
          <Link to="/portfolio" style={{ color: 'white', textDecoration: 'none' }} className="pill">Portfolio</Link>
          <Link to="/ask" style={{ color: 'white', textDecoration: 'none' }} className="pill">Ask Currensee</Link>
        </nav>

        <div className="right-rail" style={{ display: 'flex', gap: '10px' }}>
            {/* Auth buttons will change when Firebase is added */}
            <Link to="/auth" className="ai-btn ai-btn-primary" style={{ padding: '8px 16px', background: '#00b3b3', color: 'black', borderRadius: '8px', textDecoration: 'none' }}>Log In / Sign up</Link>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
