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
| **Groq rate limits** | The backend tries **fallback Groq models** (`GROQ_FALLBACK_MODELS` + built-ins), then **Tavily-only synthesis** for the Assistant when every Groq call fails; PESTEL/Porter fall back to the data scaffold. |
| **Hallucination risk** | With Groq enabled, outputs are **draft narrative**. PESTEL uses **strict JSON grounding prompts** (digest + static profile + Tavily only for numbers/names/events), **very low temperature (~0.06)** and **top_p ~0.85**, plus a **server-side grounding filter** that drops bullets/paragraphs whose cited years, %, $ amounts, or million/billion figures are absent from SOURCE A / profile / web—gaps are filled from the data scaffold. Users should still verify figures on the dashboard. |
| **Web context** | Tavily results are **supplementary**; ranking and snippet quality vary; do not treat as legal or investment advice. **PESTEL** prepends a Tavily **executive synthesis** to SOURCE B when `TAVILY_API_KEY` is set, adds **five date-bounded windows** (7d, 1mo, 6mo, 1y, 5y) for cross-PESTEL retrieval, retries JSON on the **Assistant Groq stack** if the PESTEL stack fails, and can **assemble dimension bullets + SWOT from Tavily alone** (no Groq) when keys permit. |
| **Attribution** | Responses should carry attribution arrays where implemented; maintain them when extending prompts. |
| **PESTEL output shape** | Merged analysis enforces **five bullets per PESTEL dimension and per SWOT quadrant** with padding from fallbacks; **cross-quadrant SWOT deduplication** reduces copy-paste. **Client prose polish** strips internal scaffolding phrases when present—users should still verify numbers on the dashboard. |
| **LLM payload limits** | Large web bundles may be **truncated** before the Groq request to avoid HTTP **413**; full text may still be used for non-LLM grounding paths. Do not assume the model sees the entire Tavily dump. |

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
| **Payload limits** | Express JSON body capped at **1 MB**; large uploads are out of scope. Groq and other LLM providers impose their own request size limits—backend truncation is a mitigant, not a guarantee of full context. |
| **Environment secrets** | Never commit `.env`; use `.env.example` as the contract for optional keys. |

## 5. UX honesty

| Guardrail | Detail |
|-----------|--------|
| **Correlation ≠ causation** | Business analytics views should be described as associative, not causal, in user-facing copy and training. |
| **Porter proxy** | Macro indicators **proxy** industry forces; sector selection does not replace primary industry research. |
| **Fullscreen stacking** | Nested fullscreen (group gallery → chart fullscreen) uses z-index layering; test Escape order when changing modal code. |

---

*Review this document when adding new data providers, LLM prompts, or compliance-sensitive features.*
