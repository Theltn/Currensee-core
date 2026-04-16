import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '../contexts/ToastContext';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = new URLSearchParams(location.search).get('redirect') || '/';

  // Password strength
  const getStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    
    if (score <= 1) return { level: 20, label: 'Weak', color: 'var(--color-loss)' };
    if (score <= 2) return { level: 40, label: 'Fair', color: 'var(--color-warning)' };
    if (score <= 3) return { level: 60, label: 'Good', color: 'var(--color-warning)' };
    if (score <= 4) return { level: 80, label: 'Strong', color: 'var(--color-gain)' };
    return { level: 100, label: 'Very Strong', color: 'var(--color-gain)' };
  };

  const strength = getStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        addToast({ type: 'success', title: 'Welcome back!', message: 'Successfully logged in.' });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        addToast({ type: 'success', title: 'Account created!', message: 'Welcome to Currensee.' });
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
    <div className="auth-wrapper scale-in">
      <div className="auth-hero">
        <h1>Welcome to Currensee</h1>
        <p>Sign in to access your portfolio, trading dashboard, and AI-powered insights.</p>
        <div className="auth-toggle">
          <button
            onClick={() => setIsLogin(true)}
            className={`auth-toggle-btn ${isLogin ? 'auth-toggle-btn--active' : 'auth-toggle-btn--inactive'}`}
          >
            Log In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`auth-toggle-btn ${!isLogin ? 'auth-toggle-btn--active' : 'auth-toggle-btn--inactive'}`}
          >
            Sign Up
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="auth-form-card">
        <h3>{isLogin ? 'Log In' : 'Create Account'}</h3>
        <form onSubmit={handleSubmit} className="auth-form">
          
          {!isLogin && (
            <div className="auth-field">
              <label>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="input-modern" placeholder="Choose a username" />
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-modern" placeholder="your@email.com" />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-modern" placeholder={isLogin ? 'Enter password' : 'Create a password'} />
            {!isLogin && password && (
              <>
                <div className="password-strength">
                  <div
                    className="password-strength-fill"
                    style={{ width: `${strength.level}%`, background: strength.color }}
                  />
                </div>
                <div className="password-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </div>
              </>
            )}
          </div>

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
