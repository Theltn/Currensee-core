This app requires two terminals: one for the frontend and one for the backend.

Start the backend (Express server):

node server.js


Backend listens on port 4000 (or the port set in .env).

Make sure MongoDB is running.

Start the frontend (Vite dev server):

npm run dev


Opens the app in your browser (default: http://localhost:5173).

Frontend communicates with backend via API calls.

Both servers must run simultaneously for the app to work.

## Deploy split (recommended)

- Frontend: GitHub Pages (static files from `dist/`)
- Backend API: Render/Railway/Fly.io (Node server)
- Database: MongoDB Atlas

GitHub Pages cannot run `server.js`, so keep backend separate and point `VITE_BACKEND_URL` to your deployed API URL.

## Environment variables

Use `.env.example` as the template.

- Public frontend vars (safe to expose):
  - `VITE_BACKEND_URL`
  - `VITE_LOCAL_URL`
- Server-only secrets (never in client bundle):
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `POLYGON_API_KEY`
  - `OPENAI_API_KEY`

Do not commit `.env` to git.

## GitHub Pages + Render

This repo is configured for GitHub Pages at:
`https://pbierley.github.io/FidelityHackathon/`

Required GitHub repo variable:

- `VITE_BACKEND_URL=https://<your-render-service>.onrender.com`

Required GitHub setting:

- `Settings -> Pages -> Source -> GitHub Actions`

Deployment workflow file:

- `.github/workflows/deploy-pages.yml`

Deployed using Render + github actions.
