import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '../contexts/ToastContext';

// ── Human-readable Firebase error messages ──
const FIREBASE_ERRORS = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

function friendlyError(err) {
  const code = err?.code || '';
  return FIREBASE_ERRORS[code] || err.message?.replace('Firebase:', '').trim() || 'Something went wrong.';
}

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
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

  // ── Client-side validation ──
  const validate = () => {
    const errs = {};

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errs.email = 'Email is required.';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    // Password length
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    // Username (sign-up only)
    if (!isLogin && !username.trim()) {
      errs.username = 'Username is required.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        addToast({ type: 'success', title: 'Welcome back!', message: 'Successfully logged in.' });
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        addToast({ type: 'success', title: 'Account created!', message: 'Welcome to Currensee.' });
      }
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // Disable submit when required fields are empty
  const isSubmitDisabled = loading || !email.trim() || !password || (!isLogin && !username.trim());

  return (
    <div className="auth-wrapper scale-in">
      <div className="auth-hero">
        <h1>Welcome to Currensee</h1>
        <p>Sign in to access your portfolio, trading dashboard, and AI-powered insights.</p>
        <div className="auth-toggle">
          <button
            onClick={() => { setIsLogin(true); setError(''); setFieldErrors({}); }}
            className={`auth-toggle-btn ${isLogin ? 'auth-toggle-btn--active' : 'auth-toggle-btn--inactive'}`}
          >
            Log In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); setFieldErrors({}); }}
            className={`auth-toggle-btn ${!isLogin ? 'auth-toggle-btn--active' : 'auth-toggle-btn--inactive'}`}
          >
            Sign Up
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="auth-form-card">
        <h3>{isLogin ? 'Log In' : 'Create Account'}</h3>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          
          {!isLogin && (
            <div className="auth-field">
              <label>Username</label>
              <input type="text" value={username} onChange={e => { setUsername(e.target.value); setFieldErrors(f => ({ ...f, username: '' })); }} className={`input-modern ${fieldErrors.username ? 'input-error' : ''}`} placeholder="Choose a username" />
              {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: '' })); }} className={`input-modern ${fieldErrors.email ? 'input-error' : ''}`} placeholder="your@email.com" />
            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: '' })); }} className={`input-modern ${fieldErrors.password ? 'input-error' : ''}`} placeholder={isLogin ? 'Enter password' : 'Create a password (min 6 chars)'} />
            {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
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

          <button type="submit" disabled={isSubmitDisabled} className="auth-submit">
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
