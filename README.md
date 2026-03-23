# Country Analytics Platform

Country Analytics Platform is a web application that helps people analyze countries using economic, social, health, education, and policy indicators.

If you are new to analytics tools, this README is your starting point.

## 1) What This Product Does

The platform helps you answer questions like:
- How is a country performing over time?
- How does one country compare with another?
- Which risks and opportunities matter for market entry?
- What patterns appear between two variables (for example, GDP per capita and life expectancy)?

The app combines data exploration with AI-assisted explanation, while keeping answers tied to evidence.

## 2) Main Features (Beginner-Friendly)

- Country Dashboard
- Global Analytics
- Analytics Assistant
- PESTEL Analysis
- Porter Five Forces
- Business Analytics
- Sources and Metrics Explorer

## 3) Why This Is Useful

- Reduces manual time spent collecting country indicators.
- Improves decision-readiness with consistent outputs.
- Provides structured analysis for planning discussions.

## 4) Quick Start

```bash
npm install
npm -C backend install
npm -C frontend install
```

Create `backend/.env`:

```env
PORT=4000
GROQ_API_KEY=your_groq_key_here
TAVILY_API_KEY=your_tavily_key_here
```

Run:

```bash
npm -C backend run dev
npm -C frontend run dev
```

## 5) Core APIs

- `POST /api/assistant/chat`
- `POST /api/analysis/pestel`
- `POST /api/analysis/porter`
- `GET /api/analysis/correlation-global`
- `POST /api/analysis/business/correlation-narrative`

See `docs/README.md` for full documentation.
