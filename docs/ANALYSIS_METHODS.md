# Analysis Methods

## 1) Business Analytics (Correlation)

- Pearson correlation and linear regression on selected metric pairs.
- Optional IQR-based outlier exclusion.
- Residual analysis and subgroup breakdown by region.
- Narrative generation with deterministic fallback and optional LLM refinement.

## 2) PESTEL

- Indicator digest + web context synthesis.
- Structured output constrained to stable sections.
- Grounding/sanitization layers to limit unsupported claims.

## 3) Porter Five Forces

- Digest-driven baseline plus web context for competitive dynamics.
- Grounding checks and fallback to deterministic data-only templates when evidence is thin.

## 4) Assistant Comparison Method

- Parses requested countries and metrics.
- Uses latest platform snapshot lines per metric.
- Builds deterministic comparison table with `% of top` relative values.
