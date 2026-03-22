# Changelog — documentation and product alignment

This log records **documentation suite** and **user-visible product documentation** updates that align `docs/` and the root **README** with the repository. It does not replace Git history for code changes.

---

## 2026-03-21

- **Analytics Assistant** documented end-to-end: intent routing, platform metric scope, prepended ranking tables, **prose-only** LLM instructions, **server-side duplicate table stripping**, **single [W1]** web excerpt policy, **citation map** (`citations.D` / `citations.W`), **Groq** timeouts/retries/backoff and **prompt clamping**, **Tavily** resilience path.
- **README** product overview and benefits updated for Assistant behavior and trust cues.
- **PRD** extended with **FR-9–FR-12**, **NFR-6–NFR-7**, product logic §5 Assistant, release notes §13.1.
- **USER_PERSONAS** and **USER_STORIES** updated for Assistant workflows (US-A1–A10).
- **VARIABLES** adds **§1A** (`POST /api/assistant/chat` body) and **§4.2** Mermaid assistant pipeline; maintenance note for Assistant changes.
- **METRICS_AND_OKRS** adds Assistant-oriented health metrics and OKR KR5 under responsible AI.
- **DESIGN_GUIDELINES** adds **§4.4** Assistant palette (teal assistant chrome vs red user/send).
- **TRACEABILITY_MATRIX** maps FR-8–12 and US-A1–A10 to modules.
- **GUARDRAILS** adds Assistant scope, ranking dedupe, web excerpt, and persona-banner disclaimers.
- **ARCHITECTURE** lists Assistant frontend libs and expands §7 Assistant pipeline.
- **PRODUCT_DOCUMENTATION_STANDARD** glossary and checklist extended for Assistant artifacts.

---

*Maintainers: append a dated section when a release materially changes docs or user-facing behavior described in `docs/`.*
