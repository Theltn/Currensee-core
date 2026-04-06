import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Auth from './pages/Auth';
import AuthGuard from './components/AuthGuard';

import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import OptionsCenter from './pages/OptionsCenter';
import OptionsPlayground from './pages/OptionsPlayground';
import AskAI from './pages/AskAI';

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      
      <main style={{ flex: '1' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/portfolio" element={<AuthGuard><Portfolio /></AuthGuard>} />
          <Route path="/options-center" element={<AuthGuard><OptionsCenter /></AuthGuard>} />
          <Route path="/options-playground" element={<AuthGuard><OptionsPlayground /></AuthGuard>} />
          <Route path="/ask" element={<AuthGuard><AskAI /></AuthGuard>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
