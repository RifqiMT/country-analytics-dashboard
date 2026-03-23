# Assistant Behavior

## Purpose

Explain how the assistant routes questions, uses evidence, and applies safeguards.

## Intent classes
- statistics_drill
- country_compare
- country_overview
- general_web

## Evidence model
- Platform evidence blocks (D)
- Web evidence blocks (W)

## Quality controls
- Citation and relevance checks
- Deterministic paths for ranking/comparison classes
- Fallback behavior when quality thresholds are not met

## User guidance
- Ask metric-scoped questions for precision
- Use web-priority mode for time-sensitive questions
- Review attribution context before final decisions
