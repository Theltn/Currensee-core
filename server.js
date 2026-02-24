// --- Load env FIRST ---
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb'); // optional if you use Mongo

const app = express();

// ---------- Config ----------
const PORT = Number(process.env.PORT || process.env.VITE_PORT) || 4000;

// Allow multiple dev origins (Vite, Live Server) or override via env FRONTEND_ORIGIN
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,             // deployed frontend URL
  process.env.VITE_LOCAL_URL,              // legacy dev value
  'http://localhost:5173',                  // Vite default
  'http://127.0.0.1:5501',                  // your current Live Server
  'http://127.0.0.1:5173',                  // another common Vite port
].filter(Boolean);

// ---------- Middleware ----------
app.use(express.json());
app.use(cookieParser());
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
const usersRouter = require('./routes/users');
const commentsRouter = require('./routes/comments');

const aiRouter = require('./aiRoute.js');   // or './aiRoute.js'
app.use('/api/ai', aiRouter);          
app.use('/stocks', stocksRouter);
app.use('/users', usersRouter);
app.use('/comments', commentsRouter);

// ---------- MongoDB (optional but recommended) ----------
const uri = (
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.VITE_MONGO_URI ||
  ''
).trim();
let mongoClient;

/**
 * Start server after DB is (optionally) ready.
 * If no MONGODB_URI is set, we still start the API (routes that use DB should handle absence).
 */
async function start() {
  try {
    if (uri) {
      mongoClient = new MongoClient(uri);
      await mongoClient.connect();
      console.log('✅ MongoDB connected');
      // You can pass db to routers if needed:
      // const db = mongoClient.db(process.env.DB_NAME || 'mydb');
      // app.set('db', db);
    } else {
      console.warn('⚠️  MONGODB_URI not set; starting API without DB connection.');
    }

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

start();

// ---------- Graceful shutdown ----------
process.on('SIGINT', async () => {
  try { if (mongoClient) await mongoClient.close(); } catch {}
  process.exit(0);
});
