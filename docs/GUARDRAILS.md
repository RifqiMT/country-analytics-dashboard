# Guardrails

This document defines **business** and **technical** limitations the team and users should understand when building on or interpreting the Country Analytics Platform.

---

## 1. Data and methodology

| Guardrail | Detail |
|-----------|--------|
| **Publisher lag** | World Bank, IMF, and UNESCO publish at different times. A “current calendar year” picker does not imply every indicator exists for that year. |
| **Resolved vs requested year** | Global snapshot and map endpoints may return `dataYear` earlier than `requestedYear` when the WDI slice is too sparse—this is intentional, not a bug. |
| **Merged and derived values** | Country series are densified, interpolated (with rules), carried forward at the tail, and sometimes filled from **WLD** (world aggregate). Points may include `provenance`; absence of provenance does not mean “raw WDI only”—see pipeline in `ARCHITECTURE.md`. |
| **GDP growth** | Interior gaps use **step** fill, not linear interpolation, per backend rules. |
| **Share metrics** | Values in the 0–100% space may be **clamped** after completion to reduce display artifacts. |
| **Debt in US$** | When WDI level debt is missing, the platform may estimate from **(debt % GDP) × nominal GDP** using the blended % series—documented in metric description. |
| **UIS vs WDI** | Where UIS API supplements WDI, definitions may differ slightly; UIS fills **null years only** after WDI/IMF. |
| **WHO** | Not integrated in the current metric catalog; do not claim WHO sourcing until `metrics.ts` is extended. |

## 2. AI and narrative features

| Guardrail | Detail |
|-----------|--------|
| **Optional keys** | Without `GROQ_API_KEY`, PESTEL, Porter, and Assistant use **structured or template fallbacks**—not hidden errors. |
| **Hallucination risk** | With Groq enabled, outputs must be treated as **draft narrative**; numbers should be checked against dashboard series and `Sources`. |
| **Web context** | Tavily results are **supplementary**; ranking and snippet quality vary; do not treat as legal or investment advice. |
| **Attribution** | Responses should carry attribution arrays where implemented; maintain them when extending prompts. |

## 3. Product and legal positioning

| Guardrail | Detail |
|-----------|--------|
| **Not financial advice** | The application is an **analytics and education** tool; no broker-dealer, fiduciary, or advisory relationship. |
| **No warranty** | Data and software are provided **as-is**; verify critical figures against official publisher releases for compliance or publication. |
| **Third-party terms** | Respect World Bank, IMF, UNESCO, REST Countries, Sea Around Us, Wikidata, and Groq/Tavily terms of use when scaling usage or redistributing data. |

## 4. Technical and operational

| Guardrail | Detail |
|-----------|--------|
| **No built-in auth** | The open MVP does not authenticate users; do not expose secrets in the SPA; do not rely on client-side secrecy. |
| **In-memory cache** | `POST /api/cache/clear` resets process memory only; horizontal scale requires external cache if multiple instances are deployed. |
| **Rate limits** | Upstream APIs may return **429**; backend retries selectively—sustained load may still fail; consider backoff and caching at the edge for production. |
| **CORS** | `origin: true` is permissive; restrict origins in production if the API is public-facing. |
| **Payload limits** | Express JSON body capped at **1 MB**; large uploads are out of scope. |
| **Environment secrets** | Never commit `.env`; use `.env.example` as the contract for optional keys. |

## 5. UX honesty

| Guardrail | Detail |
|-----------|--------|
| **Correlation ≠ causation** | Business analytics views should be described as associative, not causal, in user-facing copy and training. |
| **Porter proxy** | Macro indicators **proxy** industry forces; sector selection does not replace primary industry research. |
| **Fullscreen stacking** | Nested fullscreen (group gallery → chart fullscreen) uses z-index layering; test Escape order when changing modal code. |

---

*Review this document when adding new data providers, LLM prompts, or compliance-sensitive features.*
