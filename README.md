# Currensee

A full-stack personal finance & investment platform for paper trading stocks, analyzing options, and learning with an AI-powered financial assistant.

**Team:** Theo Helton, David Pope

---

## Prerequisites

- **Node.js** ≥ 20.15.1
- **npm** ≥ 10.8.2
- A **Firebase** project with Authentication (email/password) and Cloud Firestore enabled
- A **Massive API** key (Polygon-compatible stock data provider)
- An **OpenAI API** key (for the AI assistant feature)

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Theltn/Currensee-core.git
cd Currensee-core
```

### 2. Install dependencies

```bash
# Install root dependencies (Express server + dev tools)
npm install

# Install client dependencies (React + Vite)
cd client && npm install && cd ..
```

### 3. Create a `.env` file

Create a `.env` file in the **project root** (not inside `client/`). Vite reads `VITE_*` variables from this location automatically.

```env
# ── Server ──
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
VITE_LOCAL_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:4000

# ── Stock Data API (Massive / Polygon-compatible) ──
VITE_MASSIVE_API_KEY=your_massive_api_key_here

# ── OpenAI (AI Assistant) ──
OPENAI_API_KEY=your_openai_api_key_here
AI_ENABLED=true
AI_RATE_WINDOW_MS=60000
AI_RATE_MAX=60
AI_MONTHLY_CAP=2000
AI_MAX_OUTPUT_TOKENS=600
AI_SERVER_HARD_MAX=600

# ── Firebase ──
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Note:** The `.env` file contains API keys and must never be committed to git. It is already listed in `.gitignore`.

### 4. Start the application

```bash
npm run dev
```

This single command uses `concurrently` to start both servers simultaneously:

| Service | URL | What it runs |
|---------|-----|-------------|
| **Express API** | `http://localhost:4000` | `nodemon server/server.js` (auto-restarts on changes) |
| **Vite Dev Server** | `http://localhost:5173/Currensee-core/` | React frontend with hot module replacement |

Both servers must be running for the app to work. The frontend calls the backend API for stock data and AI features.

### 5. Open in browser

Navigate to **`http://localhost:5173/Currensee-core/`**

> The `/Currensee-core/` base path is required because the app is configured for GitHub Pages deployment at `https://Theltn.github.io/Currensee-core/`.

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `concurrently server:dev + client:dev` | Start both servers in development mode |
| `npm run server:dev` | `nodemon server/server.js` | Start only the Express API (auto-restart) |
| `npm run server:start` | `node server/server.js` | Start the Express API (no auto-restart) |
| `npm run client:dev` | `cd client && npx vite` | Start only the Vite frontend (HMR) |
| `npm run build` | `cd client && npx vite build` | Production build to `client/dist/` |
| `npm run preview` | `cd client && npx vite preview` | Preview the production build locally |
| `npm test` | `jest` | Run backend test suite |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router 6, Vite 5, Chart.js 4, Vanilla CSS |
| **Backend** | Node.js, Express 5, Helmet, express-rate-limit |
| **Database** | Cloud Firestore (Firebase) |
| **Authentication** | Firebase Auth (email/password), Firebase Admin SDK (server-side token verification) |
| **External APIs** | Massive API (stock market data), OpenAI GPT-4o-mini (AI assistant) |
| **Deployment** | GitHub Pages (frontend), Render (backend API) |

---

## Project Structure

```
Currensee-core/
├── .env                        # Environment variables (not committed)
├── .gitignore
├── Dockerfile
├── package.json                # Root — server deps + scripts
├── README.md
│
├── client/                     # Frontend (React + Vite SPA)
│   ├── package.json            # Client deps (React, Firebase, Chart.js)
│   ├── vite.config.js
│   ├── index.html
│   ├── public/                 # Static assets (logo, favicon)
│   └── src/
│       ├── main.jsx            # Entry point — BrowserRouter + AuthProvider
│       ├── App.jsx             # Root layout, route definitions, ToastProvider
│       ├── firebase.js         # Firebase client SDK init (Auth + Firestore)
│       ├── index.css           # CSS import chain
│       ├── contexts/           # AuthContext, ToastContext
│       ├── components/         # Navbar, Footer, AuthGuard, TickerTape
│       ├── hooks/              # useApi (authenticated fetch wrapper)
│       ├── services/           # portfolioService (Firestore CRUD)
│       ├── pages/              # Home, Auth, Dashboard, Portfolio, OptionsCenter,
│       │                       #   OptionsPlayground, AskAI
│       └── styles/             # tokens, base, animations, topbar, components, pages
│
├── server/                     # Backend (Express API)
│   ├── server.js               # App bootstrap, middleware, route mounting
│   ├── firebase-admin.js       # Firebase Admin SDK init (token verification)
│   ├── middleware/
│   │   └── authToken.js        # requireAuth — verifies Firebase ID tokens
│   ├── routes/
│   │   ├── stocks.js           # /stocks/* routes
│   │   ├── portfolio.js        # /portfolio/* routes
│   │   └── aiRoute.js          # /api/ai/* routes
│   ├── controllers/
│   │   ├── stockController.js  # Massive API proxy + in-memory cache
│   │   └── portfolioController.js
│   ├── services/
│   ├── validators/
│   └── tests/
│
├── scripts/                    # Build/deploy helper scripts
├── docs/                       # Project documentation & proposals
└── .github/workflows/          # GitHub Actions (Pages deployment)
```

---

## Environment Variables Reference

All variables live in the root `.env` file. Vite automatically exposes `VITE_*` prefixed vars to the client bundle.

| Variable | Used By | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | Server | No | Express port (default: `4000`) |
| `FRONTEND_ORIGIN` | Server | Yes | CORS allowed origin |
| `VITE_BACKEND_URL` | Client | Yes | Express API URL the frontend calls |
| `VITE_MASSIVE_API_KEY` | Server | Yes | Massive API key for stock data |
| `OPENAI_API_KEY` | Server | Yes | OpenAI API key for AI assistant |
| `AI_ENABLED` | Server | No | Kill switch — set `false` to disable AI (default: `true`) |
| `AI_RATE_MAX` | Server | No | Max AI requests per minute per IP (default: `60`) |
| `AI_MONTHLY_CAP` | Server | No | Server-wide monthly AI request cap (default: `2000`) |
| `AI_MAX_OUTPUT_TOKENS` | Server | No | Max tokens per AI response (default: `600`) |
| `VITE_FIREBASE_API_KEY` | Client | Yes | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Both | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client | Yes | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Client | Yes | Firebase app ID |

---

## Firebase Setup

If setting up a new Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Authentication** → Sign-in method → **Email/Password**
3. Enable **Cloud Firestore** → Create database in production mode
4. Go to Project Settings → General → scroll to "Your apps" → Add a **Web app**
5. Copy the Firebase config values into your `.env` file
6. **Firestore Security Rules** — ensure users can only read/write their own data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Deployment

### Production Split

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | GitHub Pages | Static files from `client/dist/` via GitHub Actions |
| Backend API | Render | Node.js Express server |
| Database | Firebase | Cloud Firestore (managed by Google) |

### GitHub Pages

The repo is configured for GitHub Pages deployment at:
`https://Theltn.github.io/Currensee-core/`

- **Source:** Settings → Pages → Source → GitHub Actions
- **Workflow:** `.github/workflows/deploy-pages.yml`
- **Required GitHub variable:** `VITE_BACKEND_URL=https://<your-render-service>.onrender.com`

### Render Backend

Set all server-side environment variables (`PORT`, `OPENAI_API_KEY`, `VITE_MASSIVE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `FRONTEND_ORIGIN`) in Render's dashboard.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `CORS blocked` | Ensure `FRONTEND_ORIGIN` in `.env` matches your frontend URL exactly |
| `Firebase Auth Error` | Verify all `VITE_FIREBASE_*` vars are set and match your Firebase project |
| Stock data returns empty | Check `VITE_MASSIVE_API_KEY` is valid; free tier has ~5 req/min limit |
| AI returns 503 | Check `AI_ENABLED=true` and `OPENAI_API_KEY` is set |
| Page shows blank at `/` | Make sure you're visiting `/Currensee-core/` (base path required) |
| `Cannot find module` errors | Run `npm install` in both root and `client/` directories |
