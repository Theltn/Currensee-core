// --- Load env FIRST ---
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');


const app = express();

// ---------- Config ----------
const PORT = Number(process.env.PORT || process.env.VITE_PORT) || 4000;

// Allow multiple dev origins (Vite, Live Server) or override via env FRONTEND_ORIGIN
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,             // deployed frontend URL
  process.env.VITE_LOCAL_URL,              // legacy dev value
  'http://localhost:5173',                  // Vite default
  'http://localhost:5174',                  // Vite fallback port
  'http://127.0.0.1:5501',                  // your current Live Server
  'http://127.0.0.1:5173',                  // another common Vite port
].filter(Boolean);

// ---------- Middleware ----------
app.use(express.json());

// CORS must come before helmet so preflight OPTIONS requests are handled first
app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (no origin) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

// If you really want to render views, uncomment and set a view engine:
// app.set('view engine', 'ejs'); // and add views/ folder, etc.

// ---------- Routes ----------
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});
app.get('/', (req, res) => {
  console.log('GET /');
  // res.render('index'); // <- requires a configured view engine
  res.json({ ok: true, message: 'API is up' });
});

const stocksRouter = require('./routes/stocks');
const aiRouter = require('./routes/aiRoute.js');
const portfolioRouter = require('./routes/portfolio');
app.use('/api/ai', aiRouter);
app.use('/stocks', stocksRouter);
app.use('/portfolio', portfolioRouter);

// ---------- MongoDB (optional but recommended) ----------
async function start() {
  try {
    console.log('✅ Express API Proxy starting without local MongoDB state.');

    app.listen(PORT, () => {
      console.log(`🚀 API listening on http://localhost:${PORT}`);
      if (allowedOrigins.length) {
        console.log('🔓 CORS allowed:', allowedOrigins.join(', '));
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

// ---------- Graceful shutdown ----------
process.on('SIGINT', () => {
  process.exit(0);
});

module.exports = app;
