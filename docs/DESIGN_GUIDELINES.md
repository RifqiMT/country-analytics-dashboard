# Comprehensive Design Guidelines

## 1. Design Principles

- Clarity over decoration
- Evidence-first communication
- Progressive disclosure for complex analytics
- Consistent interaction patterns across modules

## 2. Color System

## Light Theme Core Palette

- Primary text: `slate-900`
- Secondary text: `slate-600`
- Tertiary text: `slate-500`
- Surface: `white`
- Elevated surface: `slate-50`
- Border: `slate-200`

## Semantic Colors

- Positive: `emerald-*`
- Warning: `amber-*`
- Critical: `red-*`
- Info/analytic accent: `teal-*` and `sky-*`

## Component-specific Usage

- Assistant verified-web badge: `emerald-50/80` background with `emerald-200` border.
- Highlighted country callout: `amber-50/60` background with `amber-200` border.
- Error notices: `red-50` background and `red-600` text.

## 3. Typography

- H1: section identity only, uppercase allowed for module-level title
- H2/H3: strong hierarchy for analysis blocks
- Body: concise professional prose; avoid dense paragraphs
- Numeric values: monospaced/tabular presentation for comparability

## 4. Layout and Spacing

- Card-first layout with rounded containers and clear separators
- 8px spacing rhythm baseline
- Keep controls grouped by user intent (filters together, actions together)

## 5. Component Standards

- Tables must support sorting where analytical comparison is expected.
- Chart/table toggle should preserve context and exports.
- Fullscreen and modal states must avoid nested action duplication.
- Empty states must explain next action clearly.

## 6. Accessibility

- Ensure sufficient contrast for semantic badges and statuses.
- Maintain keyboard operability for controls and dropdowns.
- Avoid color-only meaning; include text labels.

## 7. UX Writing Rules

- Use direct, neutral, evidence-based language.
- Avoid internal system terms in user-visible content.
- Clearly separate fact, interpretation, and uncertainty.
