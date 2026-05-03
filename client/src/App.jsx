import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Footer from './components/Footer';

import Home from './pages/Home';
import Auth from './pages/Auth';
import AuthGuard from './components/AuthGuard';
import { ToastProvider } from './contexts/ToastContext';

import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import OptionsCenter from './pages/OptionsCenter';
import OptionsPlayground from './pages/OptionsPlayground';
import AskAI from './pages/AskAI';
import Watchlist from './pages/Watchlist';

import './index.css';

function App() {
  const location = useLocation();

  return (
    <ToastProvider>
      <ScrollToTop />
      <div className="app-layout">
        <Navbar />

        
        <main className="app-main">
          <div className="page-enter" key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
              <Route path="/portfolio" element={<AuthGuard><Portfolio /></AuthGuard>} />
              <Route path="/options-center" element={<AuthGuard><OptionsCenter /></AuthGuard>} />
              <Route path="/options-playground" element={<AuthGuard><OptionsPlayground /></AuthGuard>} />
              <Route path="/ask" element={<AuthGuard><AskAI /></AuthGuard>} />
              <Route path="/watchlist" element={<AuthGuard><Watchlist /></AuthGuard>} />
            </Routes>
          </div>
        </main>

        <Footer />
      </div>
    </ToastProvider>
  );
}

export default App;
