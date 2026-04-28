# Currensee — Final Requirements Implementation Plan

> **Objective:** Close every gap between the current codebase and the [FINAL SYSTEM REQ.txt](file:///Users/theoh/Documents/Development/Investor%20App/FINAL%20SYSTEM%20REQ.txt) rubric (100 pts). Phases are ordered by priority — complete each phase before starting the next.

---

## Current State Summary

| Area | Status | Notes |
|------|--------|-------|
| **Auth (Register/Login/Logout)** | ✅ Working | Firebase Auth — email/password sign-up, sign-in, `signOut()` in Navbar |
| **Protected Routes (Frontend)** | ✅ Working | `AuthGuard` redirects unauthenticated users |
| **Protected Routes (Backend)** | ⚠️ Partial | `requireAuth` middleware exists, but some routes (stock search) are unprotected by design; portfolio routes are protected |
| **Paper Trading (Buy/Sell)** | ✅ Working | Full buy/sell flow with atomic Firestore WriteBatch |
| **Portfolio View** | ✅ Working | Holdings table, allocation doughnut, KPI cards, live prices |
| **Stock Market Data** | ✅ Working | Search, 6-mo chart, meta/quote caching, ticker tape |
| **AI Assistant** | ✅ Working | GPT-4o-mini via OpenAI Responses API, rate-limited |
| **Options Education** | ✅ Working | Knowledge Hub + Strategy Calculator + FAQ |
| **Options Playground** | ✅ Working | Simulated near-the-money options chain |
| **Comments & Community** | ❌ **Missing** | Proposed MVP — no implementation exists |
| **Data Persistence** | ✅ Confirmed | Firestore accepted as "MongoDB or similar" — no migration needed |
| **Form Validation** | ⚠️ Partial | Auth has password strength; trading has basic checks; no comprehensive client-side validation with helpful error messages |
| **Responsive Design** | ⚠️ Partial | Mobile navbar exists; pages need audit for smaller screens |
| **README** | ❌ **Incomplete** | Missing: abstract, team names, video link, test credentials, MVP list, API documentation |
| **Backend Authorization** | ⚠️ Gap | Rubric: "server must also reject that request" — the `portfolioService.js` writes directly to Firestore from the client, bypassing the server entirely. Portfolio CRUD exists on server side but the Dashboard calls the *client-side* service. |

---

## Critical Gaps to Address (Rubric Risk)

> [!CAUTION]
> **These 4 issues could cause major point loss if not addressed:**

1. **Comments & Community MVP** — Listed in the approved proposal but **zero code exists**. This is a promised MVP and will directly cost points.

2. **Backend-Enforced Authorization** — The rubric explicitly states: *"If a user is not permitted to perform an action, the server must also reject that request."* Currently, portfolio trades go through the **client-side** `portfolioService.js` directly to Firestore, not through the Express server. The server-side `portfolioController.js` exists but the Dashboard doesn't call it. All data mutations must go through the backend.

3. **README / API Documentation** — The rubric allocates 10 points for documentation. The current README is minimal — missing abstract, team names, test credentials, MVP checklist, and **comprehensive API documentation** (paths, methods, request/response examples, error codes).

---

## Open Questions

> [!IMPORTANT]
> **Decide these before starting implementation:**

1. ~~**MongoDB vs Firestore:**~~ ✅ **Resolved** — Firestore is accepted.

2. **Test Credentials:** What email/password should be documented in the README for graders? Create a dedicated test account (e.g., `grader@currensee.com` / `Currensee2024!`)?

3. **Demo Video:** Has the demo video been recorded? What's the hosting link (YouTube, Loom)?

4. **Deployment:** Is the Render backend still active? Is the GitHub Pages frontend current? Graders need to be able to run the project.

5. **Username field:** The Sign Up form collects `username` but it's never stored or used. Should usernames be persisted and displayed in comments?

---

## Proposed Changes — 5 Phases

---

### Phase 1: Route All Data Mutations Through the Backend

> The rubric requires server-enforced authorization. All data writes must go through Express → verified token → Firestore (server-side Admin SDK).

#### [MODIFY] [Dashboard.jsx](file:///Users/theoh/Documents/Development/Investor%20App/client/src/pages/Dashboard.jsx)
- Replace `executeTrade()` from `portfolioService.js` with `apiFetch('/portfolio/trade', { ... })`
- Replace `getPortfolio()` from `portfolioService.js` with `apiFetch('/portfolio')`

#### [MODIFY] [Portfolio.jsx](file:///Users/theoh/Documents/Development/Investor%20App/client/src/pages/Portfolio.jsx)
- Replace `getPortfolio()` from `portfolioService.js` with `apiFetch('/portfolio')`

#### [MODIFY] [portfolioController.js](file:///Users/theoh/Documents/Development/Investor%20App/server/controllers/portfolioController.js)
- Ensure `req.user.uid` is used for ALL database lookups (enforces users can only access their own data)
- Add authorization check: users can only trade/view their own portfolio

#### Verify
- Unauthenticated requests to `/portfolio` return 401
- User A cannot access User B's portfolio
- Trades without valid token are rejected
- All data persists after page refresh and server restart

**Acceptance:** Zero direct Firestore/MongoDB writes from the client (auth excepted). Every mutation goes: Client → Express → Auth middleware → Controller → Database.

---

### Phase 2: Comments & Community MVP

> This is a **promised MVP** from the proposal. Missing it will cost significant points under "Completed ALL MVPs" (35 pts).

#### [NEW] [server/controllers/commentController.js](file:///Users/theoh/Documents/Development/Investor%20App/server/controllers/commentController.js)
- `createComment(req, res)` — Create a comment linked to a ticker + user
- `getComments(req, res)` — Get all comments for a ticker (paginated)
- `updateComment(req, res)` — Edit comment (only by owner — `req.user.uid === comment.userId`)
- `deleteComment(req, res)` — Delete comment (only by owner)
- Store: `{ _id, ticker, userId, userEmail, text, createdAt, updatedAt }`

#### [NEW] [server/routes/comments.js](file:///Users/theoh/Documents/Development/Investor%20App/server/routes/comments.js)
```
POST   /comments/          → createComment    (requireAuth)
GET    /comments/:ticker   → getComments      (public or requireAuth)
PATCH  /comments/:id       → updateComment    (requireAuth + owner check)
DELETE /comments/:id       → deleteComment    (requireAuth + owner check)
```

#### [MODIFY] [server.js](file:///Users/theoh/Documents/Development/Investor%20App/server/server.js)
- Mount comments router: `app.use('/comments', commentsRouter)`

#### [NEW] [client/src/pages/StockComments.jsx](file:///Users/theoh/Documents/Development/Investor%20App/client/src/pages/StockComments.jsx) *(or integrate into Dashboard)*
- Comment list with user email/name, timestamp, text
- "Add Comment" form (textarea + submit)
- Edit/Delete buttons visible only for own comments
- Inline edit mode

#### [MODIFY] [Dashboard.jsx](file:///Users/theoh/Documents/Development/Investor%20App/client/src/pages/Dashboard.jsx)
- Add a "Comments" section below the chart when a stock is selected
- Fetch comments via `apiFetch('/comments/AAPL')`
- Allow posting, editing, deleting comments for the viewed ticker

#### Server-side authorization enforcement
- `updateComment`: Verify `req.user.uid === comment.userId` before allowing edit
- `deleteComment`: Verify `req.user.uid === comment.userId` before allowing delete
- Return 403 Forbidden if unauthorized

**Acceptance:** User can post comments on any stock page, edit/delete their own, see others' comments. Server rejects edit/delete attempts on comments owned by other users. Comments persist across refresh/restart.

---

### Phase 3: Form Validation & Error Handling

> Rubric: "required fields are validated, invalid input is handled appropriately, helpful error messages are provided" (10 pts)

#### [MODIFY] [Auth.jsx](file:///Users/theoh/Documents/Development/Investor%20App/client/src/pages/Auth.jsx)
- Add email format validation before submit
- Add minimum password length requirement (6+ chars) with inline error
- Show descriptive errors for Firebase auth codes:
  - `auth/email-already-in-use` → "An account with this email already exists"
  - `auth/wrong-password` → "Incorrect password"
  - `auth/user-not-found` → "No account found with this email"
  - `auth/weak-password` → "Password must be at least 6 characters"
- Disable submit while fields are empty

#### [MODIFY] [Dashboard.jsx](file:///Users/theoh/Documents/Development/Investor%20App/client/src/pages/Dashboard.jsx)
- Validate quantity is a positive integer before trade
- Validate ticker is non-empty before search
- Show clear error if trade fails (insufficient funds, insufficient shares)
- Show error if stock not found

#### [NEW] [server/validators/tradeValidator.js](file:///Users/theoh/Documents/Development/Investor%20App/server/validators/tradeValidator.js)
- Validate request body for `/portfolio/trade`: ticker, type, shares (positive int), pricePerShare (positive float)
- Return 400 with specific error messages

#### [NEW] [server/validators/commentValidator.js](file:///Users/theoh/Documents/Development/Investor%20App/server/validators/commentValidator.js)
- Validate comment text: non-empty, max length (500 chars)
- Validate ticker format

#### [MODIFY] [AskAI.jsx](file:///Users/theoh/Documents/Development/Investor%20App/client/src/pages/AskAI.jsx)
- **Fix auth issue**: Currently does NOT send the Firebase token in the `Authorization` header — only uses `credentials: 'include'`. The `/api/ai/ask` route requires `requireAuth`. This means **Ask AI is broken for authenticated users** unless cookies happen to work.
- Use `apiFetch()` instead of raw `fetch()` to ensure the Bearer token is sent.

**Acceptance:** Every form shows specific, helpful errors. Server rejects malformed input with 400 status codes. No blank submissions cause crashes.

---

### Phase 4: Responsive Design Audit & Polish

> Rubric: "the interface functions on both laptop and mobile screen sizes" (10 pts)

#### [MODIFY] [styles/pages.css](file:///Users/theoh/Documents/Development/Investor%20App/client/src/styles/pages.css)
- Dashboard: Stack search + chart above trading panel on mobile (`flex-direction: column`)
- Portfolio: Make holdings table horizontally scrollable on small screens
- Options Center: Stack calculator grid on mobile
- Options Playground: Make options chain table scrollable
- AskAI: Ensure chat container takes full width on mobile

#### [MODIFY] [styles/components.css](file:///Users/theoh/Documents/Development/Investor%20App/client/src/styles/components.css)
- Ensure buttons, inputs, and cards scale properly
- Test and fix any text overflow issues

#### [MODIFY] [styles/topbar.css](file:///Users/theoh/Documents/Development/Investor%20App/client/src/styles/topbar.css)
- Verify hamburger menu works correctly on all mobile breakpoints
- Ensure mobile drawer doesn't clip or overlap content

#### Testing
- Test at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1024px, 1440px
- Verify no horizontal scroll on any page
- Verify all interactive elements are tappable (min 44px touch targets)

**Acceptance:** All pages render without layout breaks on screens from 375px to 1440px+. No horizontal scrolling. All workflows completable on mobile.

---

### Phase 5: README & Documentation Overhaul

> Rubric: 10 points for documentation — "the README is complete and accurate and **must include API documentation**"

#### [MODIFY] [README.md](file:///Users/theoh/Documents/Development/Investor%20App/README.md) — Complete rewrite with ALL required sections:

```markdown
# Currensee — Full-Stack Personal Finance & Investment Platform

## Abstract (200 words)
[Reuse/update from proposal — describe the problem, solution, target audience]

## Team Members
- Theo Helton
- David Pope

## Demo Video
[Link to YouTube/Loom — must be accessible without requesting permission]

## Technologies Used
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Chart.js, CSS3 |
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas (or Firestore) |
| Authentication | Firebase Auth (email/password) |
| External APIs | Massive API (stock data), OpenAI GPT-4o-mini |

## Setup & Run Instructions
[Step-by-step: clone, npm install, .env setup, run dev]

## Configuration Notes
[.env variables required, API keys needed]

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Test User | grader@currensee.com | Currensee2024! |

## Completed MVPs
- [x] User Authentication (Register, Login, Logout)
- [x] Stock Market Data (Search, Charts, Ticker Tape)
- [x] Paper Trading (Buy/Sell with virtual $100K)
- [x] Portfolio Management (Holdings, Allocation, P/L)
- [x] Comments & Community
- [x] AI Financial Assistant
- [x] Options Education Hub
- [x] Options Playground

## Stretch Features
- [list any extras]

## REST API Documentation
[Full documentation for EVERY endpoint — see format below]
```

#### API Documentation Format (for each endpoint):
```markdown
### POST /stocks/:ticker
**Purpose:** Fetch stock metadata and 6-month price history
**Authentication:** None required
**Request Body:**
\`\`\`json
{ "ticker": "AAPL" }
\`\`\`
**Example Response (200):**
\`\`\`json
{
  "ticker": "AAPL",
  "name": "Apple Inc.",
  "description": "...",
  "market_cap": 2800000000000,
  "tradingData": [
    { "t": 1713139200000, "o": 175.50, "h": 178.20, "l": 174.80, "c": 177.90, "v": 52340000 }
  ]
}
\`\`\`
**Error Responses:**
- `400` — Missing ticker
- `502` — Upstream API failure
```

#### Document ALL endpoints:
1. `POST /stocks/:ticker` — Get stock data
2. `GET /stocks/logo/:ticker` — Get stock logo
3. `POST /stocks/batch` — Batch ticker quotes
4. `GET /stocks/all` — List all stocks
5. `GET /portfolio` — Get user portfolio
6. `POST /portfolio/trade` — Execute trade
7. `GET /portfolio/transactions` — Get transaction history
8. `POST /api/ai/ask` — Ask AI assistant
9. `GET /api/ai/health` — AI health check
10. `POST /comments/` — Create comment
11. `GET /comments/:ticker` — Get comments for stock
12. `PATCH /comments/:id` — Edit comment
13. `DELETE /comments/:id` — Delete comment

**Acceptance:** A grader can clone the repo, follow the README, start the app, log in with test credentials, and test all features without any confusion.

---

## Verification Plan

### Automated Tests
- Run `npm test` (existing Jest suite)
- Verify all backend routes respond correctly using manual curl/Postman testing
- Test auth: 401 on protected routes without token
- Test authorization: 403 when editing/deleting another user's comment

### Manual Verification (Browser)
1. **Register** → new account created, redirected to home
2. **Login** → existing account, toast notification, access to protected pages
3. **Logout** → returns to auth page, protected routes redirect
4. **Dashboard** → search stock, view chart, buy shares, sell shares
5. **Portfolio** → see holdings, allocation chart, P/L calculations, data persists on refresh
6. **Comments** → post comment, edit own comment, delete own comment, cannot edit others'
7. **Ask AI** → send question, receive answer, rate limit works
8. **Options** → calculator works, playground loads simulated chain
9. **Mobile** → test all above flows on 375px viewport
10. **Persistence** → restart server, verify all data survives

---

## Additional Features for Further App Quality

> These are **optional enhancements** beyond the rubric requirements. Implement only after all required MVPs are complete.

### High-Value Stretch Features
1. **Transaction History Page** — Dedicated page showing all buy/sell history with date, ticker, quantity, price, and P/L (data already exists in the `transactions` subcollection)
2. **Watchlist** — Allow users to save favorite tickers and see them on the dashboard with quick-glance price data
3. **Portfolio Performance Chart** — Time-series line chart showing portfolio value over time (track daily snapshots)
4. **Dark/Light Theme Toggle** — Already dark-themed; adding a light mode toggle would demonstrate responsive design skill
5. **Stock News Feed** — Integrate a free news API to show recent headlines for searched tickers
6. **Export Portfolio to CSV** — One-click download of holdings table as CSV

### Technical Quality Improvements
7. **Environment Variable Validation** — Add startup check in `server.js` that verifies all required env vars exist and exits with a helpful error if not
8. **Error Boundary Component** — React error boundary to catch rendering crashes and show a friendly fallback UI
9. **Loading Skeleton System** — Consistent skeleton loading states across all pages (partially done already)
10. **Input Sanitization** — Sanitize all user inputs (comments especially) against XSS
11. **API Response Caching (Client)** — Use React Query or SWR for data fetching with smart cache invalidation
12. **E2E Testing** — Playwright or Cypress tests for critical flows (register → trade → view portfolio)

### UX Polish
13. **Confirmation Modals** — "Are you sure?" modal before executing trades or deleting comments
14. **Onboarding Tour** — First-time user walkthrough highlighting key features
15. **Keyboard Shortcuts** — `Ctrl+K` to focus search, `Escape` to close modals
16. **Toast Notification for Errors** — Replace alert-style errors with toast notifications consistently
17. **Pagination** — Paginate comments list and transaction history for scalability

---

## Phase Summary & Estimated Effort

| Phase | Focus | Est. Effort | Rubric Points at Risk |
|-------|-------|-------------|----------------------|
| **1** | Backend-Enforced Authorization | 2-3 hrs | 10 pts (Auth/Authz) + 20 pts (Full-Stack) |
| **2** | Comments & Community MVP | 4-5 hrs | 35 pts (MVPs) |
| **3** | Form Validation & Error Handling | 2-3 hrs | 10 pts (Validation) |
| **4** | Responsive Design Audit | 2-3 hrs | 10 pts (UX/Responsive) |
| **5** | README & API Docs | 2-3 hrs | 10 pts (Documentation) |
| | **Total** | **13-17 hrs** | **Up to 85 pts at risk** |

> [!IMPORTANT]
> **Priority order matters.** Phase 1 and Phase 2 protect the most rubric points. Phase 5 is the easiest quick win. Recommended order: **1 → 2 → 5 → 3 → 4**.
