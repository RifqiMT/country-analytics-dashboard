# Product metrics and OKRs

This document defines **product health metrics** (how we measure the product in production or research) and **example OKRs** for the product team. Adjust baselines when analytics instrumentation is added.

---

## 1. North-star metric (suggested)

**Weekly active sessions (WAS)** — count of distinct browser sessions that load any primary route (`/`, `/global`, `/pestel`, `/porter`, `/business`, `/assistant`) at least once per week.

*Rationale:* The product’s value is exploration; repeated return indicates habit formation. If you lack analytics, proxy with **server request volume** to `/api/country/*/series` per week (unique IPs + country hash for privacy).

---

## 2. Product health metrics

| Metric | Definition | Why it matters |
|--------|------------|----------------|
| **Dashboard load success rate** | Share of `GET /api/country/:cca3/series` returning 200 with non-empty bundle for top N countries | Core journey reliability |
| **P95 series latency** | 95th percentile response time for country series (warm cache) | Perceived speed |
| **Global snapshot fallback rate** | Share of requests where `dataYear < requestedYear` | Signals publisher lag UX; monitor, don’t minimize blindly |
| **Assistant engagement** | Sessions posting to `/api/assistant/chat` / total sessions | AI feature adoption |
| **Export usage** | CSV download actions / dashboard sessions | Power-user validation |
| **Error toast rate** | Failed `getJson`/`postJson` / total calls from SPA | Client-visible friction |
| **Cache clear usage** | `POST /api/cache/clear` count | Power users or stale-data issues |

### Leading indicators (qualitative / lightweight)

- **Support themes:** repeated confusion about PPP vs nominal, interpolation, or “wrong year” on map.
- **Documentation hits:** traffic to `docs/` or README (if hosted).

---

## 3. Quality and trust metrics

| Metric | Definition | Target direction |
|--------|------------|------------------|
| **Provenance coverage** | Share of chart tooltip rows showing a provenance label where non-`reported` | Transparency ↑ |
| **Sources page usage** | Visits to `/sources` per active user | Trust tooling ↑ |
| **LLM fallback rate** | Assistant/Porter/PESTEL responses without Groq vs with | Infrastructure optional path healthy |

---

## 4. Example OKRs (annual or half-year)

### Objective O1 — **Make the country dashboard the default stop for macro country context**

| Key result | Measure |
|------------|---------|
| KR1 | Increase weekly returning sessions (same rough device fingerprint or cookie) by **X%** |
| KR2 | Achieve **≥ 99%** series success rate for a defined list of 30 large economies |
| KR3 | Reduce P95 warm-cache series latency below **Y ms** on reference hardware |

### Objective O2 — **Strengthen trust in numbers**

| Key result | Measure |
|------------|---------|
| KR1 | Ship or improve provenance display on **100%** of dashboard line series tooltips where data exists |
| KR2 | User-test: **≥ 80%** of participants correctly interpret `requestedYear` vs `dataYear` on global map after copy change |
| KR3 | Maintain **zero** undocumented metrics in `GET /api/metrics` |

### Objective O3 — **Responsible AI assist**

| Key result | Measure |
|------------|---------|
| KR1 | **100%** of LLM-backed responses include structured attribution metadata |
| KR2 | Document **guardrails** (`GUARDRAILS.md`) reviewed quarterly |
| KR3 | Reduce average Assistant prompt latency P95 below **Z s** with keys configured |

---

## 5. Engineering efficiency metrics (optional)

| Metric | Use |
|--------|-----|
| **Deploy frequency** | Team velocity |
| **Mean time to restore** | Reliability |
| **Defect escape rate** | QA effectiveness |

---

*OKR targets (X, Y, Z) should be set from baseline measurements once telemetry exists.*
