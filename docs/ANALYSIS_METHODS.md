# Analysis Methods

## Business correlation
- Computes linear association between selected metrics
- Supports outlier exclusion
- Returns diagnostics + narrative interpretation

## PESTEL
- Combines indicator digest and optional web context
- Uses structured output and fallback controls

## Porter
- Builds force-level analysis from digest + optional web context
- Applies grounding and fallback behavior

## Important limitation
Correlation indicates association, not causation.

## 1) Business Analytics: Correlation & regression

The Business Analytics module analyzes the relationship between two selected metrics (`metricX`, `metricY`) across a specified inclusive year window.

### 1.1 Data points and missingness

- A data point is a country-year observation where **both** metric values exist (non-null) for the same year.
- Missing values are excluded from computation.

### 1.2 Pearson correlation (r)

Pearson correlation measures linear association strength:

`r = cov(x, y) / (std(x) * std(y))`

Interpretation guidance:
- `|r| >= 0.7`: strong
- `0.4 <= |r| < 0.7`: moderate
- `0.2 <= |r| < 0.4`: weak
- `< 0.2`: negligible

### 1.3 Regression line (slope and intercept)

The system fits a simple linear regression line:

`y_fitted = intercept + slope * x`

Where:
- `slope` is derived from the correlation and variance ratio between X and Y
- `intercept` ensures the line is centered on means of X and Y

### 1.4 Residuals

For each included point:

`residual = y - y_fitted`

Residuals are used for:
- residual diagnostics (residual distribution / residual-vs-fitted plots)
- explaining “how well the line fits” the observed data

### 1.5 Optional outlier exclusion (IQR rule)

Users can toggle outlier exclusion by applying an interquartile range rule:

For X:
- Compute `q1x` and `q3x`
- `iqrX = q3x - q1x`
- Flag X as an outlier if `x < q1x - 1.5*iqrX` or `x > q3x + 1.5*iqrX`

For Y:
- Compute `q1y` and `q3y`
- Apply the same 1.5*IQR rule for Y outliers

If `excludeIqr=true`, any point flagged as an outlier in either X or Y is removed from the regression/correlation computation.

### 1.6 Confidence band (`ciBand`)

The system computes a confidence band around the fitted line using:
- `tCrit = 1.96`
- a mean-squared error estimate from residuals
- a standard error expression that depends on x position relative to mean x

This band is a visualization/uncertainty aid; it is not a substitute for robust causal inference.

## 2) Narrative generation for correlation (`correlation-narrative`)

When narrative generation is enabled, the module sends a structured payload to the backend and optionally uses LLM synthesis.

Important constraints:
- The narrative language is exploratory and framed as hypothesis guidance.
- Correlation is treated as association, not causation.
- Residual diagnostics and subgroup patterns can be included to strengthen “what to investigate next”.

## 3) PESTEL methodology

PESTEL outputs combine:
- A structured digest of relevant platform indicator signals
- Optional web context (when enabled and when evidence gates allow it)

The backend constrains output to stable narrative sections so the UI remains consistent, and uses a data-only scaffold when AI generation is unavailable.

## 4) Porter Five Forces methodology

Porter Five Forces outputs combine:
- Force-level digest scaffolding derived from platform indicator signals
- Optional web context for competitive/industry dynamics when evidence gates allow it

When AI generation is unavailable or web evidence is thin, the system uses deterministic scaffold outputs to keep the product dependable and safe.
