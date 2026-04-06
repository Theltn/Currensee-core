import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Firebase doesn't strictly need username for basic auth but we can capture it
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = new URLSearchParams(location.search).get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Here we could also set the displayName in Firebase utilizing updateProfile
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <section style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(0, 179, 179, .18), rgba(61, 168, 245, .14))', borderRadius: '16px', border: '1px solid #1d2a36', marginBottom: '24px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '32px' }}>Join Currensee</h1>
        <p style={{ margin: 0, color: '#b8c7cc' }}>Log in or sign up to access your Portfolio, Trading Dashboard, and personalized insights.</p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button onClick={() => setIsLogin(true)} style={{ background: isLogin ? 'linear-gradient(135deg, #3ec7a7, #3da8f5)' : '#12161d', color: 'white', border: isLogin ? 'none' : '1px solid #1d2a36', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Login</button>
          <button onClick={() => setIsLogin(false)} style={{ background: !isLogin ? 'linear-gradient(135deg, #57d69a, #7ff0c0)' : '#12161d', color: !isLogin ? '#042217' : 'white', border: !isLogin ? 'none' : '1px solid #1d2a36', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Create account</button>
        </div>
      </section>

      {error && <div style={{ padding: '12px', background: 'rgba(255, 95, 115, 0.2)', border: '1px solid #ff5f73', borderRadius: '8px', color: '#ff5f73', marginBottom: '16px' }}>{error}</div>}

      <div style={{ background: '#12161d', border: '1px solid #1d2a36', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #1d2a36', paddingBottom: '12px', color: '#b8c7cc' }}>{isLogin ? 'Log In' : 'Sign Up'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {!isLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>Username:</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f141a', border: '1px solid #1d2a36', color: 'white' }} />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '6px' }}>Email:</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f141a', border: '1px solid #1d2a36', color: 'white' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px' }}>Password:</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f141a', border: '1px solid #1d2a36', color: 'white' }} />
          </div>

          <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #57d69a, #7ff0c0)', color: '#042217', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
            {loading ? 'Processing...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
