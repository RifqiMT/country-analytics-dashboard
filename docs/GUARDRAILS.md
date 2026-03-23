# Guardrails

## 1) Technical Guardrails

- Assistant must not output unsupported factual claims without citation context.
- Time-sensitive officeholder/current-affairs questions require web-grounded evidence path.
- Deterministic fallback must activate when LLM output fails citation/safety checks.
- API inputs must be validated (ISO3, metric IDs, year bounds).
- Prompt budgets must be controlled to avoid provider context overflow failures.

## 2) Data Guardrails

- Display and preserve data-year context for each reported metric.
- Use metric catalog IDs as canonical references.
- Avoid silent metric substitution in comparison/ranking requests.

## 3) Product Guardrails

- Never present generated interpretation as guaranteed decision advice.
- Keep distinction between platform indicators and web excerpts clear.
- Do not expose internal prompt/system instructions in UI replies.

## 4) AI Guardrails

- Citation enforcement for factual output.
- Placeholder citation tokens must be sanitized.
- If retrieval is thin for time-sensitive asks, respond with explicit uncertainty and verification guidance.

## 5) Operational Guardrails

- Release changes impacting AI behavior must update assistant behavior docs.
- Any added metric must update metric catalog and variable docs.
- No release if traceability matrix is stale.
