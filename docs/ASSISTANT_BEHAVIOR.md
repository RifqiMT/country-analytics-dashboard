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

## Enterprise Behavior Specification (Expanded)

### 1) What the assistant is designed to do

The assistant helps users by:
- Ranking and comparing countries using deterministic metric-driven tables when the question is metric-scoped
- Explaining patterns in clear analyst prose while maintaining scope fidelity to the requested metrics
- Supporting time-sensitive questions via verified live web retrieval when web grounding is required

### 2) Intent routing (how requests are classified)

The backend classifies the user’s question into intent classes and uses that classification to determine:
- Which evidence sources are eligible (platform evidence, verified web evidence, or both)
- Whether deterministic templates are allowed (to avoid hallucinated tables)
- Whether fallback paths must be used due to scope mismatch risk

Current intent classes:
- `statistics_drill`: questions that require numeric/statistical extraction and ranking behavior
- `country_compare`: questions that ask for comparing countries across metric dimensions
- `country_overview`: questions that ask for a broad overview anchored to indicator series
- `general_web`: non-metric questions where live web evidence may be required

### 3) Evidence model and citation discipline

The assistant can use two evidence streams:
- **Platform evidence blocks** (`[D#]`): deterministic facts derived from platform indicator series and ranking/comparison structures
- **Web evidence blocks** (`[W#]`): condensed live web excerpts intended to support only the specific claims they back

Safety requirement:
- The final user-visible output must not leak internal placeholder citation tokens.
- Assertions must align to evidence blocks; unsupported claims trigger fallback.

### 4) Deterministic paths vs LLM generation

Deterministic paths are used for:
- Ranking/comparison answers where stable table-first output is required
- Verified-web time-sensitive questions when deterministic verified-web reply paths are available

LLM generation is used for:
- Narrative synthesis and strategy-style prose when evidence quality gates pass

When evidence quality gates fail:
- The system activates deterministic scaffold/fallback outputs to maintain dependability

### 5) Web-first vs Auto routing

The UI exposes a routing mode concept:
- **Auto (balanced routing)**: tends to keep metric grounding tight and only uses web as needed
- **Web-first**: biases toward live retrieval on every turn when Tavily is configured

This is implemented through request-level fields:
- `webSearchPriority` and/or legacy `assistantMode` (e.g. `assistantMode="web_priority"`)

If Tavily keys are missing, web-first/verified-web behavior falls back safely.

### 6) Model selection and retry/fallback chain

When LLM generation is enabled:
- The backend selects a primary Groq model for each use case (assistant, pestel, porter, business)
- If the primary model fails due to transient errors or retryable provider conditions, the backend tries fallback candidates

Model chain inputs (configured by env vars):
- `GROQ_MODEL_*` for use-case primary selection
- `GROQ_FALLBACK_MODELS_*` for use-case fallback candidates
- `GROQ_FALLBACK_MODELS` for global fallback candidates

### 7) Performance controls (prompt budgets)

To avoid provider failures and long-tail latencies:
- the backend clamps prompt and context budgets before LLM calls
- it reduces metric fetch to only what is required for the question scope

### 8) User-visible UX signals

The assistant UI communicates behavior through:
- Persona banner (category, persona name/title, and brief description)
- Verified Web Answer Mode badge (when verified-web deterministic path is used)
- Routing label (“Dashboard” vs “Web search” vs other routing signals)

These signals help users understand trust and provenance without requiring them to inspect raw system internals.
