const chartInstances = {}; // Global storage

//  From Chart JS core repo ---->
//  This uses the Chart.js financial plugin to draw candlestick charts.

//  Data format required by the candlestick controller:
//    Each data point must be an object with:
//      {
//        x: <timestamp in ms OR Date object>,  // horizontal axis (time)
//        o: <number>,                          // open price
//        h: <number>,                          // high price
//        l: <number>,                          // low price
//        c: <number>                           // close price
//      }
//  Example:
//    { x: 1713139200000, o: 161.57, h: 162.05, l: 157.64, c: 158.68 }

function showChart(ticker, tradingData) {
  console.log("tradingData", tradingData);
  if (!tradingData) return;

  const canvas = document.getElementById(`${ticker}-chart`);
  if (!canvas) {
    console.warn(`Canvas element not found for ticker: ${ticker}`);
    return;
  }

  const ctx = canvas.getContext("2d");

  // Destroy any existing chart for this ticker
  if (chartInstances[ticker]) {
    chartInstances[ticker].destroy();
  }

  // Expect:
  // tradingData {
  //  0: {
  // v :20753778        trading volume
  // vw : 193.7755      volume Weighted average price 
  // o : 195.42         open price
  // c : 193.17         close price
  // h : 197.62         highest price
  // l : 191.6          lowest price
  // t : 1736485200000  time in unix
  // n : 236744         # of transactions
  //    }
  //  }
  function formatDate (unixTime) {
    const date = new Date(unixTime);  // ms → Date object
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // months are 0-based
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const candles = tradingData.map((d) => ({
    x: new Date(formatDate(d.t)).getTime(),                    // <-- numeric timestamp (ms)
    o: d.o,
    h: d.h,
    l: d.l,
    c: d.c,
  }));

  //  just some quick guardrails/logging ya heard
  if (!candles.length) {
    console.warn(`[candles] No rows for ${ticker}`, tradingData);
    return;
  }
  if (candles.some(b => [b.x,b.o,b.h,b.l,b.c].some(v => Number.isNaN(v)))) {
    console.error('[candles] NaN in OHLC data:', candles.slice(0,3));
    return;
  }
  console.log(`[candles] ${ticker}: ${candles.length} bars`, candles[0], candles[candles.length-1]);

  chartInstances[ticker] = new Chart(ctx, {
    type: "candlestick",
    data: {
      datasets: [{
        label: `${ticker} Candles`,
        data: candles,
        color:       { up: "#26a69a", down: "#ef5350", unchanged: "#999999" },
        borderColor: { up: "#26a69a", down: "#ef5350", unchanged: "#999999" },
        wickColor:   { up: "#26a69a", down: "#ef5350", unchanged: "#999999" },
        borderWidth: 1,
      }],
    },
    options: {
      parsing: false,        // might not need this idk
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: "index", intersect: false },
      },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "day",
          displayFormats: { day: "MMM d" }
        },
        bounds: "data",
        ticks: {
          autoSkip: false,       // let us decide which ones to show
          maxRotation: 0,
          callback: (value, index, ticks) => {
            const last = ticks.length - 1;
            if (last <= 4) {
              // 5 or fewer ticks total — show them all
              return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
            }
            // Pick exactly 5 anchor indices: 0, 25%, 50%, 75%, last
            const anchors = new Set([
              0,
              Math.round(last * 0.25),
              Math.round(last * 0.50),
              Math.round(last * 0.75),
              last
            ]);
            return anchors.has(index)
              ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : ""; // hide other labels
          }
        }
      },
        y: {
          beginAtZero: false,
          position: "right",
          title: { display: true, text: "Price (USD)" },
        },
      },
    },
  });
}

window.showChart = showChart;
