# Release Readiness Checklist

Use this checklist before production releases to keep analytics quality, guardrails, and documentation synchronized.

## Product and UX checks

- Assistant, PESTEL, Porter, and Business Analytics complete their primary user flows.
- App-wide AI key manager in header can save, clear, validate, and reuse keys across modules.
- Error states are user-readable (no raw stack traces or internal prompt artifacts).

## AI/data quality checks

- Assistant verified-web behavior uses citation-safe output and deterministic fallback when evidence is thin.
- PESTEL output passes strict grounding gate or falls back to deterministic data/web blend.
- SWOT cards render exactly five readable bullets per quadrant without truncation artifacts.

## API and integration checks

- `/api/keys/validate` returns provider-specific status for Groq and Tavily.
- Header-based user keys (`X-User-Groq-Api-Key`, `X-User-Tavily-Api-Key`) are honored by Assistant, PESTEL, Porter, and Business narrative endpoints.
- Endpoint contracts in `docs/API_REFERENCE.md` match current request/response behavior.

## Performance and reliability checks

- Build passes for backend and frontend (`npm run build`).
- API latency/toast panel shows healthy request execution for core workflows.
- Fallback paths are deterministic when keys are missing or provider calls fail.

## Documentation and governance checks

- Updated docs in same cycle: PRD, variables, guardrails, traceability, changelog.
- `docs/TRACEABILITY_MATRIX.md` includes new/changed requirements.
- `docs/CHANGELOG.md` includes dated release notes with impact summary.
