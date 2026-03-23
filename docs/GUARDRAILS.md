# Guardrails

## Technical guardrails
- Validate inputs (ISO3, metric IDs, year range)
- Enforce quality checks on assistant responses
- Use deterministic fallback when evidence is weak

## Data guardrails
- Preserve data-year context
- Use canonical metric IDs
- Avoid silent metric substitution

## AI guardrails
- Keep evidence-aware answer behavior
- Remove placeholder citation tokens
- Avoid unsupported factual claims

## Business guardrails
- Do not present outputs as autonomous final decisions
- Keep uncertainty explicit when confidence is low
