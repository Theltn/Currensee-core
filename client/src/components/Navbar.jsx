import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Navbar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Scroll-aware shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/options-center', label: 'Options Hub' },
    { to: '/options-playground', label: 'Playground' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/ask', label: 'Ask AI' },
  ];

  const isActive = (path) => location.pathname === path;

  // Get user initial for avatar
  const userInitial = currentUser?.email?.[0]?.toUpperCase() || '?';

  return (
    <>
      <header className={`topbar${scrolled ? ' scrolled' : ''}`} role="banner">
        <div className="topbar-inner">
          
          <Link to="/" className="topbar-logo">
            <img src={`${import.meta.env.BASE_URL}CurrenseeLogo.png`} alt="Currensee" />
            <span className="topbar-logo-text">Currensee</span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`pill${isActive(item.to) ? ' active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="topbar-right">
            {currentUser ? (
              <>
                <div className="user-avatar" title={currentUser.email}>
                  {userInitial}
                </div>
                <button onClick={handleLogout} className="btn-ghost" style={{ padding: '7px 14px', fontSize: '12px' }}>
                  Log out
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-primary">
                Sign In
              </Link>
            )}

            <button
              className={`hamburger${mobileOpen ? ' open' : ''}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile drawer */}
      <nav className={`mobile-nav${mobileOpen ? ' open' : ''}`} aria-label="Mobile navigation">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`pill${isActive(item.to) ? ' active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
        {currentUser ? (
          <button onClick={handleLogout} className="btn-ghost" style={{ marginTop: '8px' }}>
            Log out
          </button>
        ) : (
          <Link to="/auth" className="btn-primary" style={{ marginTop: '8px', textAlign: 'center' }}>
            Sign In
          </Link>
        )}
      </nav>
    </>
  );
};

export default Navbar;
