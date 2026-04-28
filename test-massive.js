const axios = require('axios');
const TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'SNDK', 'INTC', 'NFLX'];
const apiKey = 'cWNyTamRcMNh1O2op75kEBXO7lBJ2wdD'; // From your .env

async function run() {
  for (const t of TICKERS) {
    try {
      await axios.get(`https://api.massive.com/v3/reference/tickers/${t}?apiKey=${apiKey}`);
      console.log(t, 'success');
    } catch (e) {
      console.log(t, e.response?.status, e.response?.data);
    }
  }
}
run();
