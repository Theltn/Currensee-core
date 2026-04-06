import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      
      <main style={{ flex: '1' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<div style={{padding: '20px'}}><h2>Dashboard (WIP)</h2></div>} />
          <Route path="/portfolio" element={<div style={{padding: '20px'}}><h2>Portfolio (WIP)</h2></div>} />
          <Route path="/options" element={<div style={{padding: '20px'}}><h2>Options Hub (WIP)</h2></div>} />
          <Route path="/ask" element={<div style={{padding: '20px'}}><h2>Ask AI (WIP)</h2></div>} />
          <Route path="/auth" element={<div style={{padding: '20px'}}><h2>Authentication (WIP)</h2></div>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
