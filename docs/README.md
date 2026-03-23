# Documentation Index

This folder is the canonical product and engineering documentation set.

## Core Product Docs

- `PRD.md` — product requirements, scope, feature intent, release priorities
- `USER_PERSONAS.md` — user archetypes, goals, and pain points
- `USER_STORIES.md` — actionable user stories and acceptance notes
- `DESIGN_GUIDELINES.md` — visual system and UX behavior standards

## Delivery and Governance

- `PRODUCT_DOCUMENTATION_STANDARD.md` — writing rules, structure, ownership, quality gates
- `TRACEABILITY_MATRIX.md` — requirement to implementation and test traceability
- `GUARDRAILS.md` — business and technical constraints
- `CHANGELOG.md` — documentation and product alignment history

## Architecture and APIs

- `ARCHITECTURE.md` — runtime architecture, module boundaries, key flows
- `API_REFERENCE.md` — endpoint contracts and usage patterns
- `ASSISTANT_BEHAVIOR.md` — assistant routing, grounding, fallback, and safety behavior
- `ANALYSIS_METHODS.md` — methodology for PESTEL, Porter, and Business Analytics

## Data and Metrics

- `METRIC_CATALOG.md` — canonical metric dictionary (from `backend/src/metrics.ts`)
- `VARIABLES.md` — environment variables, request variables, derived variables, relationship map
- `METRICS_AND_OKRS.md` — product metrics and product-team OKR framework

## Ownership

- Product team owns PRD, personas, stories, OKRs.
- Design team owns design guidelines.
- Platform/backend team owns architecture, API reference, assistant behavior, guardrails.
- Any feature change must update impacted docs in the same PR.
