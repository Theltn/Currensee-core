import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-brand-name">Currensee</div>
          <p>Your personal finance platform. Paper trade stocks, analyze options, and get AI-powered insights.</p>
        </div>

        <div className="footer-col">
          <h4>Platform</h4>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/portfolio">Portfolio</Link>
          <Link to="/options-center">Options Hub</Link>
          <Link to="/ask">Ask AI</Link>
        </div>

        <div className="footer-col">
          <h4>Learn</h4>
          <Link to="/options-center">Options Basics</Link>
          <Link to="/options-playground">Playground</Link>
          <Link to="/ask">AI Tutor</Link>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <a href="#" onClick={e => e.preventDefault()}>Terms</a>
          <a href="#" onClick={e => e.preventDefault()}>Privacy</a>
          <a href="#" onClick={e => e.preventDefault()}>Disclosures</a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Currensee. All rights reserved.</span>
        <span>Data may be delayed or simulated. Not financial advice.</span>
      </div>
    </footer>
  );
};

export default Footer;
