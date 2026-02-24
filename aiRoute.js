// aiRoute.js
const express = require('express');
const router = express.Router();

// Node 18+ has global fetch; otherwise lazy-load node-fetch
const doFetch = (typeof fetch === 'function')
  ? fetch
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

function currentMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

let monthKey = currentMonthKey();
let monthlyCount = 0;

// Optional: simple IP rate limit (60/min by default)
const RATE_WINDOW_MS = Number(process.env.AI_RATE_WINDOW_MS || 60_000);
const RATE_MAX       = Number(process.env.AI_RATE_MAX || 60);
const ipBucket = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  let b = ipBucket.get(ip);
  if (!b || now >= b.resetAt) { b = { count: 0, resetAt: now + RATE_WINDOW_MS }; ipBucket.set(ip, b); }
  if (b.count >= RATE_MAX) return res.status(429).json({ error: 'Too many requests' });
  b.count += 1; next();
}

function aiControls(req, res, next) {
  if ((process.env.AI_ENABLED || 'true').toLowerCase() === 'false') {
    return res.status(503).json({ error: 'AI temporarily disabled' });
  }
  const cap = Number(process.env.AI_MONTHLY_CAP || 2000);
  const mk = currentMonthKey();
  if (mk !== monthKey) { monthKey = mk; monthlyCount = 0; }
  if (monthlyCount >= cap) return res.status(429).json({ error: 'Monthly AI quota reached' });
  monthlyCount += 1;
  next();
}

// Health for quick verification
router.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    enabled: (process.env.AI_ENABLED || 'true').toLowerCase() !== 'false',
    month: monthKey,
    used_this_month: monthlyCount
  });
});

// Main ask endpoint
router.post('/ask', rateLimit, aiControls, async (req, res) => {
  try {
    const question = (req.body?.question || '').trim();
    if (!question) return res.status(400).json({ error: 'Ask a real question.' });

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

    // === caps (env + optional per-request) ===
    const serverCap = Number(process.env.AI_MAX_OUTPUT_TOKENS || 320);     // raise your default here
    const hardMax   = Number(process.env.AI_SERVER_HARD_MAX || serverCap); // optional extra guard
    const reqMax    = Number(req.body?.maxTokens);
    const MAX_OUT   = Math.min(
      Number.isFinite(reqMax) && reqMax > 0 ? reqMax : serverCap,
      hardMax
    );
    console.log('[AI] max_output_tokens =', MAX_OUT);

    // Short, safe system prompt
    const system = `You are "An Investor (AI)". Be clear and educational about stocks and options.
Avoid financial advice; provide general information and learning guidance only.`;

    // Use Responses API with instructions + input
    const r = await doFetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        instructions: system,     // system message
        input: question,          // user question
        max_output_tokens: MAX_OUT,
        temperature: 0.3
      })
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: 'Upstream error', detail: text });
    }

    const json = await r.json();
    const answer =
      (json.output_text && String(json.output_text).trim()) ||
      json.output?.[0]?.content?.[0]?.text ||
      '(no answer)';

    res.set('Cache-Control', 'no-store');
    res.json({ answer });
  } catch (e) {
    console.error('AI route error:', e);
    res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;
