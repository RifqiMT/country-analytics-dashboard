# Comprehensive Design Guidelines (Enterprise UI/UX Standard)

This document defines the design and UX standards used by the Country Analytics Platform.

It is written for a wide audience (product, design, engineering, QA). It aims to prevent inconsistent UI patterns and to ensure that a reader unfamiliar with the codebase can still understand the visual and interaction rules.

## 1) Design principles

- **Clarity over decoration**: the UI should make analytical meaning obvious.
- **Evidence-first communication**: data context (units, years, scope) must be visible where users interpret values.
- **Progressive disclosure**: complex analysis should be shown step-by-step, with “generate” actions gated behind user intent where appropriate.
- **Consistency across modules**: similar controls should behave similarly (filters, toggles, exports, fullscreen).

## 2) Themes and palette tokens

The current UI ships with a light-first palette.

### 2.1 Light theme (core palette)

| Token purpose | Tailwind-style token |
| --- | --- |
| Primary text | `slate-900` |
| Secondary text | `slate-600` |
| Muted/tertiary text | `slate-500` |
| Background surface | `white` |
| Elevated surface | `slate-50` |
| Border / separators | `slate-200` |

### 2.2 Semantic colors (status & meaning)

| Semantic role | Use cases | Suggested tokens |
| --- | --- | --- |
| Positive / success / verified | Verified-web badge, success emphasis | `emerald-*` (e.g., `emerald-50/80`, `emerald-200`, `emerald-700`) |
| Warning / attention | Highlighted country callout, advisory tone | `amber-*` (e.g., `amber-50/60`, `amber-200`) |
| Critical / error | Errors, failed calls, destructive states | `red-*` (e.g., `red-50`, `red-600`) |
| Info / analytic accent | Accent headings, teal/cyan highlights | `teal-*` and `sky-*` |

## 3) Component standards

### 3.1 Surfaces and cards

Standard “content card” look:
- Rounded container (commonly `rounded-2xl`)
- Border based on `slate-200`
- Background `white`
- Soft shadow (`shadow-sm`)
- Padding for spacing hierarchy (commonly `p-4` / `sm:p-5`)

### 3.2 Typography

- Use strong hierarchy for analysis blocks (H2/H3).
- Avoid dense paragraphs for numeric-heavy areas; prefer short paragraphs and structured lists.
- Numeric values and tables should favor monospaced/tabular emphasis when meaning depends on precise reading.

### 3.3 Buttons and actions

Primary actions:
- Use dark/neutral emphasis (commonly `bg-slate-900` + `text-white`)

Secondary or constructive actions:
- Use accent colors (commonly red for “generate” in analysis modules and teal for “hover/soft actions”)

Button states:
- Disabled: reduce opacity and prevent pointer events.
- Focus: ensure visible focus ring for keyboard users.

### 3.4 Inputs, selects, and checkboxes

- Inputs/selects should use consistent border and internal padding.
- Labels should be explicit and remain close to the control.
- The UI must not rely solely on color to indicate selection (checkbox + label).

### 3.5 Tables

Tables are a core analysis output. Standards:
- Sorting enabled on analytical comparison tables.
- Header background should use `slate-50` or an equivalent subtle elevation.
- Font size for fullscreen tables must be readable (the UI uses a dedicated fullscreen table sizing class).

### 3.6 Charts and chart/table toggles

- Chart/table toggles must preserve context so exports and comparisons remain consistent.
- If a chart and its table view are both available, the toggle should not reset filters or year ranges.

### 3.7 Fullscreen mode (charts, tables, maps)

Fullscreen is a first-class UX state:
- The fullscreen container expands to viewport width/height.
- Chart/table/map shells must resize dynamically to remove “dead space” and keep labels readable.
- Avoid nested duplicated actions inside the fullscreen modal.

The CSS behavior is controlled via the fullscreen wrapper classes (notably `.cap-viz-fullscreen`), which also increase tick/legend label font sizes for readability.

### 3.8 Badges and notices

Verified Web Answer Mode badge:
- Background uses the positive semantic palette.
- Should explain what “verified” means in plain language (time-sensitive web grounding).

Highlighted country callout:
- Uses the warning semantic palette so users can immediately see where emphasis is applied.

Error notices:
- Use red semantic palette and show actionable next steps (try again, adjust filters, check keys).

## 4) Accessibility standards (must-have)

- Ensure adequate contrast between text and backgrounds.
- All controls must be keyboard operable.
- Avoid color-only meaning: provide text labels for statuses and selections.
- Keep focus states visible and consistent.

## 5) UX writing rules

- Keep user-facing content direct and neutral.
- Separate fact from interpretation.
- Mention scope and uncertainty when evidence is limited (especially assistant outputs).

## 6) Practical QA checklist for releases

Before shipping UI changes, validate:
- Readability in normal and fullscreen states
- Export buttons work from fullscreen and non-fullscreen contexts
- Table sorting and toggle state remain stable
- Badges/notice bars show correct semantics (verified/warning/error)
