import { db } from '../firebase';
import { auth } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

const STARTING_CASH = 100000;

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

function getUid() {
  if (!auth.currentUser) throw new Error('Not authenticated');
  return auth.currentUser.uid;
}

async function ensureUserDoc() {
  const uid = getUid();
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const init = { cash: STARTING_CASH, createdAt: serverTimestamp() };
    await setDoc(userRef, init);
    return { cash: STARTING_CASH };
  }

  return snap.data();
}

// ═══════════════════════════════════════
// Portfolio Service
// ═══════════════════════════════════════

export async function getPortfolio() {
  const uid = getUid();
  const userData = await ensureUserDoc();

  const holdingsSnap = await getDocs(collection(db, 'users', uid, 'holdings'));
  const holdings = holdingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    cash: userData.cash,
    holdings,
  };
}

export async function executeTrade({ ticker, name, type, shares, pricePerShare }) {
  const uid = getUid();
  const userData = await ensureUserDoc();

  const upperTicker = ticker.trim().toUpperCase();
  const tradeType = type.trim().toUpperCase();
  const qty = parseInt(shares, 10);
  const price = parseFloat(pricePerShare);
  const total = parseFloat((price * qty).toFixed(2));

  const userRef = doc(db, 'users', uid);
  const holdingRef = doc(db, 'users', uid, 'holdings', upperTicker);
  const holdingSnap = await getDoc(holdingRef);
  const currentHolding = holdingSnap.exists() ? holdingSnap.data() : null;

  const batch = writeBatch(db);

  if (tradeType === 'BUY') {
    if (userData.cash < total) {
      throw new Error(`Insufficient funds. Need $${total.toFixed(2)} but only $${userData.cash.toFixed(2)} available.`);
    }

    const newCash = parseFloat((userData.cash - total).toFixed(2));
    const existingShares = currentHolding ? currentHolding.shares : 0;
    const existingCost = currentHolding ? currentHolding.avgCost * existingShares : 0;
    const newTotalShares = existingShares + qty;
    const newAvgCost = parseFloat(((existingCost + total) / newTotalShares).toFixed(4));

    batch.update(userRef, { cash: newCash });
    batch.set(holdingRef, {
      ticker: upperTicker,
      name: name || upperTicker,
      shares: newTotalShares,
      avgCost: newAvgCost,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Transaction log
    const txRef = doc(collection(db, 'users', uid, 'transactions'));
    batch.set(txRef, {
      ticker: upperTicker,
      type: 'BUY',
      shares: qty,
      pricePerShare: price,
      total,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    return {
      message: `Bought ${qty} shares of ${upperTicker} at $${price.toFixed(2)}`,
      cash: newCash,
      holding: { ticker: upperTicker, shares: newTotalShares, avgCost: newAvgCost },
    };

  } else {
    // SELL
    if (!currentHolding || currentHolding.shares < qty) {
      const owned = currentHolding ? currentHolding.shares : 0;
      throw new Error(`Insufficient shares. Own ${owned} shares of ${upperTicker} but trying to sell ${qty}.`);
    }

    const newCash = parseFloat((userData.cash + total).toFixed(2));
    const newTotalShares = currentHolding.shares - qty;

    batch.update(userRef, { cash: newCash });

    if (newTotalShares === 0) {
      batch.delete(holdingRef);
    } else {
      batch.update(holdingRef, {
        shares: newTotalShares,
        updatedAt: serverTimestamp(),
      });
    }

    const txRef = doc(collection(db, 'users', uid, 'transactions'));
    batch.set(txRef, {
      ticker: upperTicker,
      type: 'SELL',
      shares: qty,
      pricePerShare: price,
      total,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    return {
      message: `Sold ${qty} shares of ${upperTicker} at $${price.toFixed(2)}`,
      cash: newCash,
      holding: newTotalShares > 0
        ? { ticker: upperTicker, shares: newTotalShares, avgCost: currentHolding.avgCost }
        : null,
    };
  }
}
