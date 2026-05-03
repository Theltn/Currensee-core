/**
 * Seed script: Creates demo account and populates portfolio + watchlist
 * 
 * Usage: node server/seed-demo.js
 * 
 * Demo credentials:
 *   Email:    demo@currensee.com
 *   Password: demo123
 */

require('dotenv').config();
const admin = require('./firebase-admin');

const db = admin.firestore();
const STARTING_CASH = 100000;

// 15 diversified stocks with realistic buy prices and share counts
const PORTFOLIO_STOCKS = [
  { ticker: 'AAPL', name: 'Apple Inc.', shares: 25, avgCost: 198.50 },
  { ticker: 'MSFT', name: 'Microsoft Corp', shares: 15, avgCost: 395.00 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', shares: 12, avgCost: 168.25 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', shares: 18, avgCost: 185.30 },
  { ticker: 'NVDA', name: 'Nvidia Corp', shares: 20, avgCost: 135.60 },
  { ticker: 'TSLA', name: 'Tesla Inc.', shares: 10, avgCost: 245.00 },
  { ticker: 'META', name: 'Meta Platforms Inc.', shares: 8, avgCost: 480.00 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', shares: 14, avgCost: 195.75 },
  { ticker: 'V', name: 'Visa Inc.', shares: 10, avgCost: 278.40 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', shares: 12, avgCost: 155.80 },
  { ticker: 'WMT', name: 'Walmart Inc.', shares: 15, avgCost: 165.20 },
  { ticker: 'DIS', name: 'The Walt Disney Co.', shares: 20, avgCost: 112.50 },
  { ticker: 'NFLX', name: 'Netflix Inc.', shares: 5, avgCost: 610.00 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', shares: 22, avgCost: 155.40 },
  { ticker: 'INTC', name: 'Intel Corp', shares: 40, avgCost: 30.50 },
];

const WATCHLIST_TICKERS = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF', alertAbove: 560, alertBelow: 520 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', alertAbove: 500, alertBelow: 450 },
  { ticker: 'BA', name: 'Boeing Co.', alertAbove: 200, alertBelow: 160 },
  { ticker: 'COST', name: 'Costco Wholesale', alertAbove: 900, alertBelow: 800 },
  { ticker: 'CRM', name: 'Salesforce Inc.', alertAbove: 300, alertBelow: 250 },
];

async function findDemoUser() {
  // Look up the demo user by email using Firebase Auth
  try {
    const userRecord = await admin.auth().getUserByEmail('demo@currensee.com');
    console.log(`✅ Found demo user: ${userRecord.uid}`);
    return userRecord.uid;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      // Create the user via Firebase Admin
      const userRecord = await admin.auth().createUser({
        email: 'demo@currensee.com',
        password: 'demo123',
        displayName: 'Demo User',
      });
      console.log(`✅ Created demo user: ${userRecord.uid}`);
      return userRecord.uid;
    }
    throw err;
  }
}

async function seedPortfolio(uid) {
  const userRef = db.collection('users').doc(uid);

  // Calculate total investment cost
  let totalInvested = 0;
  for (const s of PORTFOLIO_STOCKS) {
    totalInvested += s.shares * s.avgCost;
  }
  const remainingCash = parseFloat((STARTING_CASH - totalInvested).toFixed(2));

  console.log(`💰 Total invested: $${totalInvested.toFixed(2)}`);
  console.log(`💵 Remaining cash: $${remainingCash.toFixed(2)}`);

  if (remainingCash < 0) {
    console.error('❌ Portfolio cost exceeds starting cash! Adjust stock amounts.');
    process.exit(1);
  }

  // Set user cash
  await userRef.set({ cash: remainingCash, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  // Delete existing holdings and transactions
  const holdingsSnap = await userRef.collection('holdings').get();
  const txnSnap = await userRef.collection('transactions').get();
  const watchlistSnap = await userRef.collection('watchlist').get();

  const deleteBatch = db.batch();
  holdingsSnap.docs.forEach(d => deleteBatch.delete(d.ref));
  txnSnap.docs.forEach(d => deleteBatch.delete(d.ref));
  watchlistSnap.docs.forEach(d => deleteBatch.delete(d.ref));
  await deleteBatch.commit();
  console.log(`🗑️  Cleared existing holdings (${holdingsSnap.size}), transactions (${txnSnap.size}), watchlist (${watchlistSnap.size})`);

  // Insert holdings + transactions in batches
  let batch = db.batch();
  let opCount = 0;

  for (const stock of PORTFOLIO_STOCKS) {
    const holdingRef = userRef.collection('holdings').doc(stock.ticker);
    batch.set(holdingRef, {
      ticker: stock.ticker,
      name: stock.name,
      shares: stock.shares,
      avgCost: stock.avgCost,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    opCount++;

    // Create a buy transaction for history
    const txnRef = userRef.collection('transactions').doc();
    batch.set(txnRef, {
      ticker: stock.ticker,
      type: 'BUY',
      shares: stock.shares,
      pricePerShare: stock.avgCost,
      total: parseFloat((stock.shares * stock.avgCost).toFixed(2)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    opCount++;

    // Firestore batch limit is 500
    if (opCount >= 490) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  // Insert watchlist items
  for (const w of WATCHLIST_TICKERS) {
    const watchRef = userRef.collection('watchlist').doc(w.ticker);
    const data = {
      ticker: w.ticker,
      name: w.name,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (w.alertAbove) data.alertAbove = w.alertAbove;
    if (w.alertBelow) data.alertBelow = w.alertBelow;
    batch.set(watchRef, data);
    opCount++;
  }

  await batch.commit();
  console.log(`📊 Seeded ${PORTFOLIO_STOCKS.length} holdings with buy transactions`);
  console.log(`👀 Seeded ${WATCHLIST_TICKERS.length} watchlist items`);
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Currensee Demo Account Seed Script');
  console.log('═══════════════════════════════════════\n');

  try {
    const uid = await findDemoUser();
    await seedPortfolio(uid);

    console.log('\n✅ Demo account ready!');
    console.log('   Email:    demo@currensee.com');
    console.log('   Password: demo123');
    console.log('═══════════════════════════════════════');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
