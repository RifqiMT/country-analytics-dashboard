# Vercel Deployment Guide

This guide prepares `country-analytics-platform` for a single-project Vercel deployment:
- frontend (Vite static assets) is served from `frontend/dist`;
- backend (Express API) is served as a Vercel Serverless Function at `/api`.

## Deployment architecture

- Static build output: `frontend/dist`
- API entrypoint: `api/index.ts`
- API source: `backend/src/index.ts` (exports Express app)
- Route behavior:
  - `/api/*` -> serverless function
  - all non-API routes -> frontend static app

## Required environment variables (Vercel Project Settings)

Set in **Vercel -> Project -> Settings -> Environment Variables**:

- `GROQ_API_KEY` (optional but recommended for Assistant/PESTEL/Porter narratives)
- `TAVILY_API_KEY` (optional; enables verified web retrieval paths)
- `PORT` is not required on Vercel (serverless runtime handles this)
- `VITE_API_BASE_URL`:
  - leave empty for single-project deploy (recommended)
  - set only if frontend must call an external API host

## First deploy steps

1. Import the GitHub repository in Vercel.
2. Keep root directory as repository root.
3. Confirm build settings:
   - Build Command: `npm run build -w frontend`
   - Output Directory: `frontend/dist`
4. Deploy.

## Validation checklist after deploy

- Open `/` and confirm SPA loads.
- Call `/api/health` and verify HTTP 200.
- Open Dashboard and Global Analytics pages and verify data loads.
- Run one Assistant/PESTEL/Porter request and verify graceful fallback behavior if keys are absent.
- Confirm browser network requests are same-origin (`/api/...`) unless `VITE_API_BASE_URL` is intentionally set.

## Operational notes

- `backend/src/index.ts` does not open a listener when `VERCEL=1`, preventing duplicate server startup in serverless runtime.
- Local development is unchanged (`npm -C backend run dev`, `npm -C frontend run dev`).
- For production custom domains, configure domain in Vercel after first successful deploy.
