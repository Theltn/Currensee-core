import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Navbar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbar-inner">
        
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src={`${import.meta.env.BASE_URL}CurrenseeLogo.png`} alt="Currensee Logo" style={{ height: '40px', width: 'auto', borderRadius: '4px' }} />
          <span style={{ fontWeight: '700', fontSize: '22px', letterSpacing: '-0.5px', background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Currensee
          </span>
        </Link>

        <nav className="nav-links" aria-label="Primary" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/" className="pill" style={{border: 'none', background: 'transparent'}}>Home</Link>
          <Link to="/dashboard" className="pill">Trading Dashboard</Link>
          <Link to="/options-center" className="pill">Options Hub</Link>
          <Link to="/options-playground" className="pill">Options Playground</Link>
          <Link to="/portfolio" className="pill">Portfolio</Link>
          <Link to="/ask" className="pill">Ask Currensee</Link>
        </nav>

        <div className="right-rail" style={{ display: 'flex', gap: '12px' }}>
            {currentUser ? (
               <button onClick={handleLogout} className="btn-primary" style={{ background: '#ff5f73', boxShadow: '0 4px 15px rgba(255, 95, 115, 0.3)' }}>
                 Log out
               </button>
            ) : (
               <Link to="/auth" className="btn-primary">
                 Log In / Sign up
               </Link>
            )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
