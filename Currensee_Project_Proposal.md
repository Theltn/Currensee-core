# Currensee — Project Proposal

---

## A) Project Identity

**Team Name:** Team Currensee

**Members:** Theo Helton, David Pope

**Project Title:** Currensee: A Full-Stack Personal Finance & Investment Platform

**The Problem:**
Most beginner investors lack a single platform that combines real-time stock data, paper trading, portfolio tracking, and financial education in one place. Existing tools are either too complex for newcomers or too limited for meaningful learning. Currensee solves this by providing a unified dashboard where users can search real stock data, execute simulated trades with a virtual $10,000 balance, track their portfolio performance, explore options trading concepts through an interactive educational hub, and get instant answers from an AI-powered financial assistant — all without risking real money. The target audience is students, beginner investors, and anyone looking to build financial literacy through hands-on practice.

---

## B) Feature List (User Stories)

### Authentication
- As a user, I want to **sign up with a username and password** so that I can create a personal account.
- As a user, I want to **log in to my account** so that I can access my portfolio and trading features.
- As a user, I want to **log out securely** so that my account stays protected on shared devices.

### Stock Market Data
- As a user, I want to **search for any stock by ticker symbol** so that I can view its current and historical price data.
- As a user, I want to **view interactive candlestick charts** so that I can analyze a stock's 6-month price history.
- As a user, I want to **see featured stock charts on the homepage** so that I can quickly discover trending tickers.
- As a user, I want to **view stock logos and metadata** so that I can identify companies at a glance.

### Paper Trading
- As a user, I want to **start with a virtual $10,000 cash balance** so that I can practice trading without financial risk.
- As a user, I want to **buy shares of a stock** so that I can build a simulated portfolio.
- As a user, I want to **sell shares I own** so that I can realize gains or cut losses.
- As a user, I want to **see my updated cash balance after trades** so that I know how much buying power I have left.

### Portfolio
- As a user, I want to **view all my holdings in a table** so that I can see quantity, average cost, market value, and P/L for each position.
- As a user, I want to **see my total net account value** so that I can track my overall performance.
- As a user, I want to **view a portfolio allocation chart** so that I can see how diversified my investments are.

### Comments & Community
- As a user, I want to **post comments on a stock's page** so that I can share my analysis with others.
- As a user, I want to **edit or delete my own comments** so that I can correct mistakes or remove outdated takes.
- As a user, I want to **read other users' comments** so that I can see different perspectives on a stock.

### AI Financial Assistant
- As a user, I want to **ask financial questions to an AI assistant** so that I can learn about stocks, options, and investing concepts.
- As a user, I want to **receive clear, educational responses** so that I can build my financial literacy without receiving risky financial advice.

### Options Education
- As a user, I want to **browse an Options Knowledge Hub** so that I can learn about calls, puts, Greeks, pricing, and risk.
- As a user, I want to **use an options profit/loss simulator** so that I can see potential outcomes of options trades before committing.
- As a user, I want to **use a breakeven calculator** so that I can quickly evaluate an option's value.

---

## C) Technical Blueprint

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, Vite, Chart.js |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Atlas) |
| Auth | JWT (httpOnly cookies), bcrypt |
| External APIs | Massive.com (stock data), OpenAI (AI assistant) |
| Deployment | GitHub Pages (frontend), Render (backend) |

### API Route Plan

| Method | Route | Purpose |
|---|---|---|
| POST | `/users/signup` | Create account |
| POST | `/users/login` | Log in |
| POST | `/users/logout` | Log out |
| POST | `/users/getBalance` | Get cash balance |
| POST | `/users/getPositions` | Get stock positions |
| POST | `/users/buyAsset` | Buy shares |
| POST | `/users/sellAsset` | Sell shares |
| GET | `/stocks/all` | List all stocks |
| POST | `/stocks/:ticker` | Get stock details + price history |
| POST | `/comments/create` | Post a comment |
| GET | `/comments/:ticker` | Get comments for a stock |
| PATCH | `/comments/comment/:id` | Edit a comment |
| DELETE | `/comments/comment/:id` | Delete a comment |
| POST | `/api/ai/ask` | Ask the AI assistant a question |
