# Assistant Behavior

## 1. Intent Routing

Primary intents:
- `statistics_drill`
- `country_compare`
- `country_overview`
- `general_web`

Routing determines:
- evidence priority (platform vs web)
- deterministic vs LLM path eligibility
- safety gate strictness

## 2. Grounding Model

- Platform evidence lines become `[D#]` references.
- Web evidence lines become `[W#]` references (assistant currently compacts to top web hit).
- Facts should map to cited evidence from current turn.

## 3. Deterministic Paths

- Ranking requests: deterministic response with table-first behavior.
- Country comparison requests: deterministic markdown table, including `% of top` per metric.
- Time-sensitive officeholder asks: deterministic verified-web path when available.

## 4. Safety Gates

- Citation presence checks.
- Verified-web checks for time-sensitive claims requiring `[W1]` support.
- Non-metric drift control for `general_web` turns.
- Fallback to grounded evidence blocks on failure.

## 5. Performance Controls

- Prompt budget clamp before LLM call.
- Use-case model routing and fallback chain.
- Metric fetch reduced to requested subsets for assistant turns.

## 6. UX Signals

- Persona banner for answer framing.
- Verified Web Answer Mode badge when deterministic verified-web path is used.
