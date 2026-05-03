const admin = require('../firebase-admin');
const axios = require('axios');

const db = admin.firestore();

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

function getApiKey() {
  return process.env.MASSIVE_API_KEY || process.env.VITE_MASSIVE_API_KEY;
}

/**
 * Verify a ticker is a real, tradable stock by checking the Massive API.
 * Returns { valid: true, name } or { valid: false, reason }.
 */
async function verifyTicker(ticker) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { valid: false, reason: 'Stock API is not configured. Cannot verify ticker.' };
  }

  try {
    const url = `https://api.massive.com/v3/reference/tickers/${ticker}?apiKey=${apiKey}`;
    const response = await axios.get(url, { timeout: 10000 });
    const { results } = response.data;

    if (!results || !results.ticker) {
      return { valid: false, reason: `"${ticker}" is not a recognized stock ticker.` };
    }

    return { valid: true, name: results.name || ticker };
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) {
      return { valid: false, reason: `"${ticker}" is not a recognized stock ticker.` };
    }
    if (status === 429) {
      return { valid: false, reason: 'Rate limit reached — please wait a moment and try again.' };
    }
    console.warn(`[Watchlist] Ticker verification failed for ${ticker}:`, err.message);
    return { valid: false, reason: `Could not verify "${ticker}". Please try again shortly.` };
  }
}

// ═══════════════════════════════════════
// GET /watchlist
// ═══════════════════════════════════════

const getWatchlist = async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('watchlist')
      .orderBy('addedAt', 'desc')
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ watchlist: items });
  } catch (err) {
    console.error('[Watchlist] getWatchlist error:', err.message);
    return res.status(500).json({ error: 'Failed to load watchlist.' });
  }
};

// ═══════════════════════════════════════
// POST /watchlist
// ═══════════════════════════════════════

const addToWatchlist = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { ticker, alertAbove, alertBelow } = req.body;

    if (!ticker || typeof ticker !== 'string') {
      return res.status(400).json({ error: 'ticker is required.' });
    }

    const upperTicker = ticker.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(upperTicker)) {
      return res.status(400).json({ error: 'Ticker must be 1-5 letters.' });
    }

    // Check if already on watchlist
    const docRef = db
      .collection('users')
      .doc(uid)
      .collection('watchlist')
      .doc(upperTicker);

    const existing = await docRef.get();
    if (existing.exists) {
      return res.status(409).json({ error: `${upperTicker} is already on your watchlist.` });
    }

    // ── Verify ticker is a real stock ──
    const verification = await verifyTicker(upperTicker);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.reason });
    }

    const data = {
      ticker: upperTicker,
      name: verification.name,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Optional alert thresholds
    if (alertAbove != null) {
      const val = parseFloat(alertAbove);
      if (Number.isFinite(val) && val > 0) data.alertAbove = val;
    }
    if (alertBelow != null) {
      const val = parseFloat(alertBelow);
      if (Number.isFinite(val) && val > 0) data.alertBelow = val;
    }

    await docRef.set(data);

    return res.status(201).json({
      message: `${upperTicker} added to watchlist.`,
      item: { id: upperTicker, ...data, addedAt: new Date() },
    });
  } catch (err) {
    console.error('[Watchlist] addToWatchlist error:', err.message);
    return res.status(500).json({ error: 'Failed to add to watchlist.' });
  }
};

// ═══════════════════════════════════════
// PUT /watchlist/:ticker
// ═══════════════════════════════════════

const updateWatchlistItem = async (req, res) => {
  try {
    const uid = req.user.uid;
    const upperTicker = (req.params.ticker || '').trim().toUpperCase();

    if (!upperTicker) {
      return res.status(400).json({ error: 'ticker param is required.' });
    }

    const docRef = db
      .collection('users')
      .doc(uid)
      .collection('watchlist')
      .doc(upperTicker);

    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: `${upperTicker} is not on your watchlist.` });
    }

    const updates = {};
    const { alertAbove, alertBelow } = req.body;

    // Allow setting to null to clear alerts
    if (alertAbove !== undefined) {
      if (alertAbove === null || alertAbove === '') {
        updates.alertAbove = admin.firestore.FieldValue.delete();
      } else {
        const val = parseFloat(alertAbove);
        if (Number.isFinite(val) && val > 0) updates.alertAbove = val;
      }
    }
    if (alertBelow !== undefined) {
      if (alertBelow === null || alertBelow === '') {
        updates.alertBelow = admin.firestore.FieldValue.delete();
      } else {
        const val = parseFloat(alertBelow);
        if (Number.isFinite(val) && val > 0) updates.alertBelow = val;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await docRef.update(updates);

    return res.json({ message: `${upperTicker} alerts updated.` });
  } catch (err) {
    console.error('[Watchlist] updateWatchlistItem error:', err.message);
    return res.status(500).json({ error: 'Failed to update watchlist item.' });
  }
};

// ═══════════════════════════════════════
// DELETE /watchlist/:ticker
// ═══════════════════════════════════════

const removeFromWatchlist = async (req, res) => {
  try {
    const uid = req.user.uid;
    const upperTicker = (req.params.ticker || '').trim().toUpperCase();

    if (!upperTicker) {
      return res.status(400).json({ error: 'ticker param is required.' });
    }

    const docRef = db
      .collection('users')
      .doc(uid)
      .collection('watchlist')
      .doc(upperTicker);

    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: `${upperTicker} is not on your watchlist.` });
    }

    await docRef.delete();

    return res.json({ message: `${upperTicker} removed from watchlist.` });
  } catch (err) {
    console.error('[Watchlist] removeFromWatchlist error:', err.message);
    return res.status(500).json({ error: 'Failed to remove from watchlist.' });
  }
};

module.exports = { getWatchlist, addToWatchlist, updateWatchlistItem, removeFromWatchlist };
