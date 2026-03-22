# Product metrics and OKRs

This document defines **product health metrics** (how the product is measured in production or research) and **example OKRs** for the product and platform team. Replace placeholder targets **X**, **Y**, **Z** with baselines once telemetry exists.

---

## 1. North-star metric (suggested)

**Weekly active sessions (WAS)** — count of distinct browser sessions that load any primary route at least once per week.

**Primary routes:** `/`, `/global`, `/pestel`, `/porter`, `/business`, `/assistant`, `/sources`.

*Rationale:* The product’s core value is exploratory analysis; repeated return indicates habit formation. If client analytics are unavailable, proxy with **unique server sessions** or **unique client IPs** (hashed) per week, or **request volume** to `GET /api/country/*/series`.

---

## 2. Product health metrics

| Metric | Definition | Why it matters |
|--------|------------|----------------|
| **Dashboard load success rate** | Share of `GET /api/country/:cca3/series` returning **200** with a non-empty bundle for a defined list of economies | Core journey reliability |
| **P95 series latency (warm)** | 95th percentile latency for country series after cache warmup | Perceived speed; pairs with bootstrap warm behavior |
| **Bootstrap warm completion rate** | Share of `POST /api/bootstrap/warm` invocations that complete without process error (server-side) | First-session experience |
| **Global snapshot fallback rate** | Share of requests where `dataYear < requestedYear` | Publisher lag UX; monitor for communication gaps, not “failure” |
| **Assistant engagement** | Sessions posting to `POST /api/assistant/chat` divided by total sessions | AI feature adoption |
| **Strategy feature usage** | Sessions calling PESTEL or Porter endpoints divided by total sessions | Strategy workflow validation |
| **Export usage** | CSV download actions divided by relevant page sessions | Power-user and memo workflow validation |
| **Error toast rate** | Failed `getJson` / `postJson` divided by total client API calls | Client-visible friction |
| **Cache clear usage** | Count of `POST /api/cache/clear` | Power-user behavior or stale-data signals |
| **Sources page depth** | Sessions on `/sources` with search or scroll engagement (if instrumented) | Trust tooling usage |

### Leading indicators (qualitative)

- **Support themes:** confusion about PPP vs nominal, interpolation, map year vs selected year, SWOT duplication (should decrease with server-side dedupe).
- **Documentation traffic:** views of `docs/` or README (if hosted).

---

## 3. Quality and trust metrics

| Metric | Definition | Target direction |
|--------|------------|------------------|
| **Provenance coverage** | Share of dashboard line tooltips that can show a non-`reported` provenance label where enriched data exist | Transparency ↑ |
| **Grounding drop rate (PESTEL)** | Share of LLM fragments removed by server grounding filter (if logged) | Stable or decreasing false drops |
| **LLM fallback rate** | Assistant / PESTEL / Porter responses served without Groq vs with | Healthy optional path |
| **Attribution presence** | Share of AI responses including non-empty `attribution` arrays | **100%** where AI path runs |

---

## 4. Example OKRs (annual or half-year)

### Objective O1 — **Make the country dashboard the default stop for macro country context**

| Key result | Measure |
|------------|---------|
| KR1 | Increase weekly returning sessions by **X%** (same rough device or cookie) |
| KR2 | Achieve **≥ 99%** series success rate for a defined list of **30** large economies |
| KR3 | Reduce P95 **warm** series latency below **Y ms** on reference hardware |
| KR4 | Achieve **≥ 90%** successful bootstrap warm cycles in staging under nominal load |

### Objective O2 — **Strengthen trust in numbers and narrative**

| Key result | Measure |
|------------|---------|
| KR1 | Provenance or source hints on **100%** of dashboard line series where backend attaches provenance |
| KR2 | User-test: **≥ 80%** of participants correctly interpret `requestedYear` vs `dataYear` after onboarding copy |
| KR3 | **Zero** undocumented metrics in `GET /api/metrics` relative to `metrics.ts` |
| KR4 | Qualitative review: PESTEL SWOT quadrants **rarely** contain duplicate bullets in sampled countries |

### Objective O3 — **Responsible AI assist**

| Key result | Measure |
|------------|---------|
| KR1 | **100%** of LLM-backed responses include structured attribution metadata where the route defines it |
| KR2 | **GUARDRAILS.md** reviewed quarterly with product and legal stakeholders |
| KR3 | Assistant P95 latency below **Z s** with keys configured (measure server-side) |
| KR4 | Documented runbook for Groq outage (fallback models + Tavily-only assistant path) exercised once per quarter |

### Objective O4 — **Global and pedagogy surfaces**

| Key result | Measure |
|------------|---------|
| KR1 | **≥ 25%** of active sessions touch **Global Analytics** or **Business Analytics** in a benchmark month |
| KR2 | Instructor interviews: **≥ N** positive ratings on correlation + residuals usefulness |

---

## 5. Engineering efficiency metrics (optional)

| Metric | Use |
|--------|-----|
| **Deploy frequency** | Team velocity |
| **Mean time to restore** | Reliability |
| **Defect escape rate** | QA effectiveness |
| **Docs drift incidents** | Count of releases where TRACEABILITY or VARIABLES had to be corrected post-ship (drive toward zero) |

---

*Revise OKR targets after baselines are collected; keep this file aligned with **PRD** and **GUARDRAILS**.*
