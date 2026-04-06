import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Auth from './pages/Auth';
import AuthGuard from './components/AuthGuard';

import Dashboard from './pages/Dashboard';

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
          <Route path="/portfolio" element={<AuthGuard><div style={{padding: '20px'}}><h2>Portfolio (WIP)</h2></div></AuthGuard>} />
          <Route path="/options" element={<AuthGuard><div style={{padding: '20px'}}><h2>Options Hub (WIP)</h2></div></AuthGuard>} />
          <Route path="/ask" element={<AuthGuard><div style={{padding: '20px'}}><h2>Ask AI (WIP)</h2></div></AuthGuard>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
