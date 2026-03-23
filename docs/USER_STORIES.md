# User Stories and Acceptance Guidance

This document defines the platform’s primary user stories and includes acceptance guidance aligned to current implementation behavior.

Stories are written in user language, but each acceptance section is specific enough to guide QA and engineering verification.

## 1) Dashboard and Global Analytics

### Story D1: Control country and year range

**Story:** As an analyst, I want to control the country and year range so I can evaluate trends with correct time context.

**Acceptance criteria:**
- Users can select a country focus and a year window.
- Series display and comparisons reflect the **actual data year** used by the backend after clamping/fallback.
- The UI keeps units visible and consistent in all views.

### Story D2: Metric-scoped comparisons

**Story:** As a researcher, I want metric-scoped comparison views so I can benchmark countries on requested indicators.

**Acceptance criteria:**
- Comparison/ranking views are driven by metric IDs from the metric catalog.
- Values render in unit-correct format, including missingness handling (no implicit “zero”).
- Sorting works reliably and produces stable ordering.

### Story D3: Export-ready outputs

**Story:** As a decision-maker, I want export-ready outputs so I can share findings in reports.

**Acceptance criteria:**
- Exports reflect the current filters and selection state (year range, regions/categories, and metrics).
- Exports function in both normal and fullscreen modes.

## 2) Analytics Assistant

### Story A1: Scope fidelity for metric questions

**Story:** As a strategy user, I want assistant responses to stay within the requested metric scope so I can trust scope fidelity.

**Acceptance criteria:**
- For metric-scoped intents, replies are anchored to platform evidence using deterministic comparison/ranking outputs where applicable.
- Drift detection triggers fallback when the reply risks leaving the approved metric scope.

### Story A2: Web grounding for time-sensitive questions

**Story:** As a user, I want time-sensitive/current-event questions to be grounded in verified live web evidence when needed.

**Acceptance criteria:**
- Verified-web deterministic path activates for eligible time-sensitive questions when web evidence is required.
- Web evidence is cited and treated as excerpt text supporting specific claims.
- If web context is too thin, the response uses fallback behavior and avoids unsupported assertions.

### Story A3: Attribution transparency

**Story:** As a user, I want attribution transparency so I can evaluate trust.

**Acceptance criteria:**
- The UI exposes routing/category signals (dashboard vs web vs verified web).
- Citation behavior is consistent with the evidence model and does not leak placeholder tokens.

## 3) Strategy Modules (PESTEL / Porter)

### Story S1: Coherent PESTEL and Porter narratives

**Story:** As a manager, I want coherent PESTEL/Porter narratives so I can use them in planning meetings.

**Acceptance criteria:**
- Output is structured into stable sections suitable for stakeholder review.
- The UI renders the narrative even when AI generation is not available (data-only scaffold fallback).

### Story S2: Reliable fallback when AI output is weak

**Story:** As a stakeholder, I want reliable fallback behavior when AI output is weak so the app remains dependable.

**Acceptance criteria:**
- If generation fails grounding/safety checks (or AI keys are missing), deterministic scaffold output is returned.
- Attribution indicates when fallback/scaffold mode was used.

## 4) Business Analytics

### Story B1: Correlation diagnostics and relative interpretation

**Story:** As an analyst, I want variable-focused correlation analysis and relative comparison so I can interpret risks and opportunities using consistent statistics.

**Acceptance criteria:**
- The module computes and displays Pearson correlation `r`, p-value approximation, `r²` proxy, regression slope/intercept, and residual-based diagnostics.
- Optional IQR outlier exclusion is applied and reflected in results.
- The UI clearly labels correlation as correlation (not causation).

### Story B2: Persist analysis until regenerate

**Story:** As a user, I want analysis persistence across navigation until I regenerate it so I can keep my workflow intact.

**Acceptance criteria:**
- Generated correlation/narrative data is restored when returning to the module.
- Changing filters invalidates prior results and clears until the user clicks “Generate analysis” again.
