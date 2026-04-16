const admin = require('../firebase-admin');

const db = admin.firestore();
const STARTING_CASH = 100000;

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

async function ensureUserDoc(uid) {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();

  if (!snap.exists) {
    const init = {
      cash: STARTING_CASH,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(init);
    return { ...init, createdAt: new Date() };
  }

  return snap.data();
}

async function getHoldings(uid) {
  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('holdings')
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═══════════════════════════════════════
// GET /portfolio
// ═══════════════════════════════════════

const getPortfolio = async (req, res) => {
  try {
    const uid = req.user.uid;
    const userData = await ensureUserDoc(uid);
    const holdings = await getHoldings(uid);

    return res.json({
      cash: userData.cash,
      holdings,
    });
  } catch (err) {
    console.error('[Portfolio] getPortfolio error:', err.message);
    return res.status(500).json({ error: 'Failed to load portfolio.' });
  }
};

// ═══════════════════════════════════════
// POST /portfolio/trade
// ═══════════════════════════════════════

const executeTrade = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { ticker, name, type, shares, pricePerShare } = req.body;

    // ── Validation ──
    if (!ticker || !type || !shares || !pricePerShare) {
      return res.status(400).json({ error: 'Missing required fields: ticker, type, shares, pricePerShare' });
    }

    const upperTicker = ticker.trim().toUpperCase();
    const tradeType = type.trim().toUpperCase();

    if (!['BUY', 'SELL'].includes(tradeType)) {
      return res.status(400).json({ error: 'type must be BUY or SELL' });
    }

    const qty = parseInt(shares, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'shares must be a positive integer' });
    }

    const price = parseFloat(pricePerShare);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'pricePerShare must be a positive number' });
    }

    const total = parseFloat((price * qty).toFixed(2));

    // ── Load current state ──
    const userRef = db.collection('users').doc(uid);
    const userData = await ensureUserDoc(uid);
    const holdingRef = userRef.collection('holdings').doc(upperTicker);
    const holdingSnap = await holdingRef.get();
    const currentHolding = holdingSnap.exists ? holdingSnap.data() : null;

    // ── Execute ──
    if (tradeType === 'BUY') {
      if (userData.cash < total) {
        return res.status(400).json({
          error: `Insufficient funds. Need $${total.toFixed(2)} but only $${userData.cash.toFixed(2)} available.`,
        });
      }

      const newCash = parseFloat((userData.cash - total).toFixed(2));
      const existingShares = currentHolding ? currentHolding.shares : 0;
      const existingCost = currentHolding ? currentHolding.avgCost * existingShares : 0;
      const newTotalShares = existingShares + qty;
      const newAvgCost = parseFloat(((existingCost + total) / newTotalShares).toFixed(4));

      // Atomic batch write
      const batch = db.batch();
      batch.update(userRef, { cash: newCash });
      batch.set(holdingRef, {
        ticker: upperTicker,
        name: name || upperTicker,
        shares: newTotalShares,
        avgCost: newAvgCost,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      batch.create(userRef.collection('transactions').doc(), {
        ticker: upperTicker,
        type: 'BUY',
        shares: qty,
        pricePerShare: price,
        total,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();

      return res.json({
        message: `Bought ${qty} shares of ${upperTicker} at $${price.toFixed(2)}`,
        cash: newCash,
        holding: { ticker: upperTicker, shares: newTotalShares, avgCost: newAvgCost },
      });

    } else {
      // SELL
      if (!currentHolding || currentHolding.shares < qty) {
        const owned = currentHolding ? currentHolding.shares : 0;
        return res.status(400).json({
          error: `Insufficient shares. Own ${owned} shares of ${upperTicker} but trying to sell ${qty}.`,
        });
      }

      const newCash = parseFloat((userData.cash + total).toFixed(2));
      const newTotalShares = currentHolding.shares - qty;

      const batch = db.batch();
      batch.update(userRef, { cash: newCash });

      if (newTotalShares === 0) {
        batch.delete(holdingRef);
      } else {
        batch.update(holdingRef, {
          shares: newTotalShares,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      batch.create(userRef.collection('transactions').doc(), {
        ticker: upperTicker,
        type: 'SELL',
        shares: qty,
        pricePerShare: price,
        total,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();

      return res.json({
        message: `Sold ${qty} shares of ${upperTicker} at $${price.toFixed(2)}`,
        cash: newCash,
        holding: newTotalShares > 0
          ? { ticker: upperTicker, shares: newTotalShares, avgCost: currentHolding.avgCost }
          : null,
      });
    }
  } catch (err) {
    console.error('[Portfolio] executeTrade error:', err.message);
    return res.status(500).json({ error: 'Trade execution failed.' });
  }
};

// ═══════════════════════════════════════
// GET /portfolio/transactions
// ═══════════════════════════════════════

const getTransactions = async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ transactions: txns });
  } catch (err) {
    console.error('[Portfolio] getTransactions error:', err.message);
    return res.status(500).json({ error: 'Failed to load transactions.' });
  }
};

module.exports = { getPortfolio, executeTrade, getTransactions };
