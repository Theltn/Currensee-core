import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div>
      <section style={{ padding: '60px 20px', textAlign: 'center', background: 'linear-gradient(to bottom, #070d14, #03070b)' }}>
        <h1 style={{ fontSize: '3rem', margin: '0 0 16px 0' }}>Welcome to Currensee (React)</h1>
        <p style={{ color: '#6a819c', maxWidth: '600px', margin: '0 auto', lineHeight: '1.5' }}>
          Your personal finance platform migrated fully to React and Vite. We are actively porting all components into this modern architecture.
        </p>
      </section>
    </div>
  );
};

export default Home;
