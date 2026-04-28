# Currensee — Presentation Outline & Script

---

## Slide 1: Project Identity

**Content (On Slide):**
* **Team Currensee:** Theo Helton, David Pope
* **Project Title:** Currensee: A Full-Stack Personal Finance & Investment Platform
* **Tagline:** Learn, paper trade, and track investments with zero financial risk.

**Script:**
"Hi everyone, we are Team Currensee. I'm Theo and this is David. Our project is Currensee, a full-stack personal finance and investment platform. Our goal is to provide a single, unified place where beginners can learn about the market, practice paper trading, and track their investments completely risk-free."

---

## Slide 2: The Problem

**Content (On Slide):**
* Current tools are too complex or lack educational focus
* Risky for beginners to learn with real money
* **The Solution:** A unified dashboard for learning & tracking
* **Constraint:** Purely educational (virtual $10,000 balance)

**Script:**
"The main problem we saw is that beginner investors don't have a good all-in-one platform. Existing tools are either way too complex for newcomers, or they are just too limited to actually learn anything meaningful. Without a safe place, beginners risk losing real money while figuring things out. Currensee solves this by giving users a unified dashboard to search real stock data, execute simulated trades, and get answers from our AI assistant. We constrain our scope tightly by only allowing virtual trading—starting everyone with a $10,000 balance—so the environment stays purely educational."

---

## Slide 3: Target Users & Use Case

**Content (On Slide):**
* **Beginner Investors:** Learning without losing cash
* **Students:** Hands-on practice for finance/econ classes
* **Core Scenario:** Research → Buy → Learn

**Script:**
"Our target users are primarily beginner investors and students. They want to understand how buying and selling works without risking their own cash. For example, a beginner investor comes to Currensee, creates an account, and uses their virtual $10,000 to buy shares of Apple. From there, they can read up on options concepts in our educational hub, or even ask our AI assistant to explain what a 'Put' option is."

---

## Slide 4: Feature List (User Stories)

**Content (On Slide):**
* Account Creation & Secure Login
* $10,000 Virtual Paper Trading
* Real-Time Stock Market Data & Charts
* Portfolio Tracking & Analytics
* AI Financial Assistant & Options Education

**Script:**
"To make this work, we have several core user stories. As a user, I want to securely log in and start with a virtual $10,000 balance so I trade without risk. I want to buy and sell shares of real stocks to build a simulated portfolio, and see my holdings, average costs, and profit/loss updated live. Finally, as a user, I want to search real market data, interact with candlestick charts, and use an AI assistant to answer my investing questions quickly."

---

## Slide 5: UX Snapshot (Wireframes + Flow)

**Content (On Slide):**
*(Insert 1-2 rough wireframes here)*
* **Step 1:** Sign up / Log in
* **Step 2:** Dashboard & Stock Search
* **Step 3:** View Chart & Execute Trade
* **Step 4:** Portfolio Auto-Update

**Script:**
"Here is a snapshot of our core user journey. First, the user signs up. They land on the main dashboard where they can see trending stocks and use the search bar. They enter a ticker symbol, view the interactive candlestick chart, and decide to hit 'Buy'. After entering the amount of shares and confirming, they are automatically navigated to their Portfolio page, where they can see their updated holdings and remaining cash balance."

---

## Slide 6: Data Model

**Content (On Slide):**
* **User:** `id`, `cashBalance`, `credentials`
* **Stock (Asset):** `ticker`, `price`, `history`
* **Position:** `userId`, `ticker`, `quantity`, `avgCost`
* **Transaction:** `type`, `quantity`, `price`, `timestamp`
* **Comment:** `userId`, `ticker`, `content`

**Script:**
"Our data model relies on five core objects. The 'User' object holds authentication info and the live cash balance. The 'Stock' object caches market data. 'Positions' represent what a user currently holds—for instance, 10 shares of AAPL at $150. 'Transactions' acts as our ledger for every buy and sell event. Finally, 'Comments' map user IDs to specific stock tickers so people can discuss market moves."

---

## Slide 7: Technical Blueprint: API Plan

**Content (On Slide):**
* **Auth Routes:** `/users/signup`, `/users/login`
* **Trading Routes:** `/users/buyAsset`, `/users/sellAsset`
* **Data Routes:** `/stocks/:ticker`, `/users/getPositions`
* **Community:** `/comments/:ticker`, `/api/ai/ask`

**Script:**
"For our API, we've structured our routes using REST principles. We have unauthenticated POST routes for user signup and login. Once authenticated with a session cookie, users can hit our trading routes to buy or sell assets, and our data routes to grab their current positions or fetch live stock details. We also have dedicated routes to handle community comments and forward user questions to our AI API."

---

## Slide 8: Tech Stack & Architecture

**Content (On Slide):**
* **Frontend:** Next.js (React), Tailwind CSS, Chart.js
* **Backend:** Next.js API Routes (Serverless)
* **Database:** MongoDB (Atlas)
* **External APIs:** Massive.com (Data), OpenAI (Assistant)

**Script:**
"Our tech stack uses a modern, serverless architecture. We have transitioned to Next.js and React for our frontend to improve performance, routing, and future scalability, paired with Tailwind CSS for rapid, clean styling. Because Next.js handles full-stack capabilities, we use Next.js API routes as our serverless backend, eliminating the need for a separate Express server. This streamlined architecture connects directly to our MongoDB Atlas database. Whenever we need live market data or educational chatbot responses, our Next.js backend securely reaches out to our external APIs like Massive.com and OpenAI."

---

## Slide 9: MVP vs Stretch Goals

**Content (On Slide):**
* **MVP:**
  * Secure User Auth
  * Live Stock Data & Charts
  * Buy/Sell Paper Trading Engine
  * Portfolio Tracking Dashboard
* **Stretch Goals:**
  * AI Financial Assistant
  * Community Comments
  * Options Education Hub

**Script:**
"We've strictly scoped our MVP to ensure we deliver a working product on time. Our Must-Ship features are secure user authentication, connecting the live stock market data, building the paper trading engine to actually process buys and sells, and the portfolio tracking dashboard. If time permits, our stretch goals include integrating the AI Financial Assistant, adding community comments on stock pages, and building out the interactive Options Education Hub."

---

## Slide 10: Execution Plan + Risks

**Content (On Slide):**
* **Roles:** Theo (Frontend/UI/AI), David (Backend/DB/Auth)
* **Risk 1:** API Rate Limits → *Mitigation: Mock data locally*
* **Risk 2:** Trading Math → *Mitigation: Strict unit testing*
* **Risk 3:** Scope Creep → *Mitigation: Lock MVP strictly*

**Script:**
"For execution, Theo is handling the frontend UI, charting, and AI setup, while David is tackling the Node backend, database design, and trading logic. We've identified three main risks. First, API rate limits could break the app, so we will use mock data during development. Second, paper trading math can get complicated fast, so we will write strict unit tests for average costs and balances. Finally, to prevent our scope from expanding too much, we are rigidly locking the MVP and won't start any stretch goals until the core trading works."
