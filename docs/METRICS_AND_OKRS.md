# Product Metrics and OKRs

## 1) Product Metrics Framework

### Reliability and Quality Metrics

- Assistant Grounded Answer Rate
  - Definition: % assistant responses that pass citation/safety gates without fallback replacement.
- Verified-Web Precision (time-sensitive questions)
  - Definition: % verified-web replies with proper `[W1]` usage and no safety override.
- Deterministic Fallback Activation Rate
  - Definition: % requests routed to deterministic/fallback paths.

### Performance Metrics

- Assistant P50 / P95 latency (end-to-end)
- Backend P50 / P95 for `/api/assistant/chat`
- Tavily retrieval latency and timeout rate

### Engagement and Outcome Metrics

- Task Completion Rate for top workflows (comparison, ranking, strategy analysis)
- Session retention for analyst users
- Export usage rate (CSV/PNG where applicable)

## 2) OKR Framework (Product Team)

### Objective 1: Improve assistant trust and accuracy
- KR1: Reduce hallucination-related user complaints by 60% QoQ
- KR2: Achieve >= 95% grounded output pass rate on monitored benchmark prompts
- KR3: Maintain <= 2% unresolved citation placeholder leakage incidents

### Objective 2: Improve analysis speed and usability
- KR1: Reduce `/api/assistant/chat` P95 latency by 35%
- KR2: Reduce multi-country comparison response time by 30%
- KR3: Increase successful first-answer acceptance by 25%

### Objective 3: Strengthen product-operational governance
- KR1: 100% feature releases reflected in traceability matrix and guardrails
- KR2: 100% core docs updated within same release cycle
- KR3: Weekly doc drift review with action closure >= 90%

## 3) Instrumentation Notes

- Track route-level timings and safety-gate reasons in backend telemetry.
- Track assistant mode usage (`Auto` vs `Web-first`) and feature path chosen.
- Separate deterministic answers from free-form LLM answers in analytics dashboards.
