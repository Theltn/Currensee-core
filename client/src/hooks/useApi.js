import { auth } from '../firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

/**
 * Authenticated fetch wrapper. Attaches the Firebase ID token.
 * @param {string} path — e.g. '/portfolio' or '/portfolio/trade'
 * @param {object} options — standard fetch options (method, body, etc.)
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  let token = '';
  if (auth.currentUser) {
    token = await auth.currentUser.getIdToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BACKEND}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return res;
}
