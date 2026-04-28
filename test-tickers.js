const axios = require('axios');
const TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'SNDK', 'INTC', 'NFLX'];

async function run() {
  for (const ticker of TICKERS) {
    try {
      const res = await axios.post(`http://localhost:4000/stocks/${ticker}`, { ticker });
      console.log(`${ticker}: SUCCESS (${res.data.tradingData?.length} quotes)`);
    } catch (err) {
      console.log(`${ticker}: FAILED (${err.response?.status} - ${err.message})`);
    }
  }
}
run();
