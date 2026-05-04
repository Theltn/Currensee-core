const admin = require('../firebase-admin');
const { fetchStockQuote, dedupedFetch } = require('./stockController');

const db = admin.firestore();

const CONTRACT_MULTIPLIER = 100;       // 1 contract = 100 shares
const DEFAULT_DAYS_TO_EXPIRY = 30;     // educational simplification

// ═══════════════════════════════════════
// Pricing model (simplified Black-Scholes-lite)
//   currentValue = intrinsic + remainingTimeValue
//   remainingTimeValue = originalTimeValue * sqrt(daysLeft / totalDays)
// ═══════════════════════════════════════

function computeIntrinsic(optionType, strike, underlying) {
  if (optionType === 'call') return Math.max(0, underlying - strike);
  return Math.max(0, strike - underlying);
}

function computeCurrentValue(pos, currentUnderlying, nowMs) {
  const expiryMs = pos.expiryMs;
  const purchasedMs = pos.purchasedMs;
  const totalMs = expiryMs - purchasedMs;
  const remainingMs = Math.max(0, expiryMs - nowMs);

  const intrinsic = computeIntrinsic(pos.optionType, pos.strike, currentUnderlying);

  if (remainingMs <= 0) {
    // expired — only intrinsic remains
    return Number(intrinsic.toFixed(4));
  }

  const intrinsicAtPurchase = computeIntrinsic(pos.optionType, pos.strike, pos.underlyingAtPurchase);
  const originalTimeValue = Math.max(0, pos.premium - intrinsicAtPurchase);
  const decay = Math.sqrt(remainingMs / totalMs);
  const remainingTimeValue = originalTimeValue * decay;

  return Number((intrinsic + remainingTimeValue).toFixed(4));
}

async function getLastPrice(ticker) {
  const tradingData = await dedupedFetch(`quote:${ticker}`, () => fetchStockQuote(ticker));
  if (!tradingData || tradingData.length === 0) return null;
  return tradingData[tradingData.length - 1].c;
}

// ═══════════════════════════════════════
// POST /options/buy
// ═══════════════════════════════════════

const buyOption = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { ticker, name, optionType, strike, premium, contracts } = req.body;

    if (!ticker || !optionType || strike == null || premium == null || !contracts) {
      return res.status(400).json({ error: 'Missing required fields: ticker, optionType, strike, premium, contracts' });
    }
    const upperTicker = String(ticker).trim().toUpperCase();
    const type = String(optionType).trim().toLowerCase();
    if (!['call', 'put'].includes(type)) {
      return res.status(400).json({ error: 'optionType must be "call" or "put"' });
    }
    const strikeNum = parseFloat(strike);
    const premiumNum = parseFloat(premium);
    const qty = parseInt(contracts, 10);
    if (!Number.isFinite(strikeNum) || strikeNum <= 0) return res.status(400).json({ error: 'strike must be positive' });
    if (!Number.isFinite(premiumNum) || premiumNum <= 0) return res.status(400).json({ error: 'premium must be positive' });
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'contracts must be a positive integer' });

    const totalCost = parseFloat((premiumNum * CONTRACT_MULTIPLIER * qty).toFixed(2));

    // Live underlying price (anchors the time-decay model)
    let underlyingAtPurchase;
    try {
      underlyingAtPurchase = await getLastPrice(upperTicker);
    } catch (e) {
      return res.status(502).json({ error: 'Could not fetch live underlying price.' });
    }
    if (!underlyingAtPurchase) {
      return res.status(502).json({ error: 'No price data available for this ticker.' });
    }

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const cash = userSnap.exists ? (userSnap.data().cash ?? 0) : 0;

    if (cash < totalCost) {
      return res.status(400).json({
        error: `Insufficient funds. Need $${totalCost.toFixed(2)} but only $${cash.toFixed(2)} available.`,
      });
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + DEFAULT_DAYS_TO_EXPIRY * 24 * 60 * 60 * 1000);

    const positionRef = userRef.collection('optionPositions').doc();
    const transactionRef = userRef.collection('transactions').doc();

    const batch = db.batch();
    batch.update(userRef, { cash: parseFloat((cash - totalCost).toFixed(2)) });
    batch.set(positionRef, {
      ticker: upperTicker,
      name: name || upperTicker,
      optionType: type,
      strike: strikeNum,
      premium: premiumNum,
      contracts: qty,
      underlyingAtPurchase,
      purchasedAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(expiry),
      status: 'open',
    });
    batch.create(transactionRef, {
      kind: 'OPTION_BUY',
      ticker: upperTicker,
      type: 'BUY',
      optionType: type,
      strike: strikeNum,
      contracts: qty,
      pricePerShare: premiumNum,
      total: totalCost,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return res.json({
      message: `Bought ${qty} ${type.toUpperCase()} contract(s) of ${upperTicker} at $${premiumNum.toFixed(2)} premium`,
      positionId: positionRef.id,
      cost: totalCost,
    });
  } catch (err) {
    console.error('[Options] buyOption error:', err.message);
    return res.status(500).json({ error: 'Failed to buy option.' });
  }
};

// ═══════════════════════════════════════
// GET /options/positions
// ═══════════════════════════════════════

const listPositions = async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await db.collection('users').doc(uid).collection('optionPositions')
      .where('status', '==', 'open')
      .get();

    const nowMs = Date.now();
    const tickers = [...new Set(snap.docs.map(d => d.data().ticker))];
    const priceMap = {};
    await Promise.all(tickers.map(async (t) => {
      try { priceMap[t] = await getLastPrice(t); } catch { priceMap[t] = null; }
    }));

    const positions = snap.docs.map(d => {
      const data = d.data();
      const purchasedMs = data.purchasedAt?.toMillis?.() ?? 0;
      const expiryMs = data.expiresAt?.toMillis?.() ?? 0;
      const pos = {
        id: d.id,
        ticker: data.ticker,
        name: data.name || data.ticker,
        optionType: data.optionType,
        strike: data.strike,
        premium: data.premium,
        contracts: data.contracts,
        underlyingAtPurchase: data.underlyingAtPurchase,
        purchasedMs,
        expiryMs,
      };
      const currentUnderlying = priceMap[data.ticker] ?? data.underlyingAtPurchase;
      const currentValue = computeCurrentValue(pos, currentUnderlying, nowMs);
      const daysLeft = Math.max(0, Math.ceil((expiryMs - nowMs) / (24 * 60 * 60 * 1000)));

      return {
        id: d.id,
        ticker: data.ticker,
        name: data.name || data.ticker,
        optionType: data.optionType,
        strike: data.strike,
        premium: data.premium,
        contracts: data.contracts,
        underlyingAtPurchase: data.underlyingAtPurchase,
        currentUnderlying,
        currentValue,
        daysLeft,
        purchasedAt: data.purchasedAt?.toDate?.()?.toISOString?.() ?? null,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    return res.json({ positions });
  } catch (err) {
    console.error('[Options] listPositions error:', err.message);
    return res.status(500).json({ error: 'Failed to load option positions.' });
  }
};

// ═══════════════════════════════════════
// POST /options/close/:id
// ═══════════════════════════════════════

const closePosition = async (req, res) => {
  try {
    const uid = req.user.uid;
    const positionId = req.params.id;
    if (!positionId) return res.status(400).json({ error: 'Position id required.' });

    const userRef = db.collection('users').doc(uid);
    const positionRef = userRef.collection('optionPositions').doc(positionId);
    const positionSnap = await positionRef.get();
    if (!positionSnap.exists) return res.status(404).json({ error: 'Position not found.' });

    const data = positionSnap.data();
    if (data.status !== 'open') return res.status(400).json({ error: 'Position is already closed.' });

    let currentUnderlying;
    try {
      currentUnderlying = await getLastPrice(data.ticker);
    } catch {
      currentUnderlying = data.underlyingAtPurchase;
    }
    if (!currentUnderlying) currentUnderlying = data.underlyingAtPurchase;

    const purchasedMs = data.purchasedAt?.toMillis?.() ?? 0;
    const expiryMs = data.expiresAt?.toMillis?.() ?? 0;
    const currentValue = computeCurrentValue(
      { ...data, purchasedMs, expiryMs },
      currentUnderlying,
      Date.now()
    );

    const proceeds = parseFloat((currentValue * CONTRACT_MULTIPLIER * data.contracts).toFixed(2));
    const cost = parseFloat((data.premium * CONTRACT_MULTIPLIER * data.contracts).toFixed(2));
    const pl = parseFloat((proceeds - cost).toFixed(2));

    const userSnap = await userRef.get();
    const cash = userSnap.exists ? (userSnap.data().cash ?? 0) : 0;
    const newCash = parseFloat((cash + proceeds).toFixed(2));

    const batch = db.batch();
    batch.update(userRef, { cash: newCash });
    batch.update(positionRef, {
      status: 'closed',
      closedAt: admin.firestore.FieldValue.serverTimestamp(),
      closeValue: currentValue,
      closeProceeds: proceeds,
    });
    batch.create(userRef.collection('transactions').doc(), {
      kind: 'OPTION_CLOSE',
      ticker: data.ticker,
      type: 'SELL',
      optionType: data.optionType,
      strike: data.strike,
      contracts: data.contracts,
      pricePerShare: currentValue,
      total: proceeds,
      pl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return res.json({
      message: `Closed ${data.contracts} ${data.optionType.toUpperCase()} contract(s) of ${data.ticker}`,
      proceeds,
      pl,
      cash: newCash,
    });
  } catch (err) {
    console.error('[Options] closePosition error:', err.message);
    return res.status(500).json({ error: 'Failed to close position.' });
  }
};

module.exports = { buyOption, listPositions, closePosition };
