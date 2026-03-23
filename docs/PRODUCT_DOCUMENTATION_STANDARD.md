# Product Documentation Standard

## Purpose

Define a professional, consistent, enterprise-ready documentation standard for the Country Analytics Platform.

## Principles

1. **Single source of truth**: one canonical file per concern.
2. **Traceable**: requirements map to implementation and validation artifacts.
3. **Current-state first**: docs reflect implemented behavior, not assumptions.
4. **Actionable**: each document must help product, design, engineering, QA, and stakeholders make decisions.
5. **Readable**: concise language, consistent terminology, explicit definitions.

## Required Document Set

- Product context: `README.md`, `PRD.md`, `USER_PERSONAS.md`, `USER_STORIES.md`
- Delivery controls: `TRACEABILITY_MATRIX.md`, `GUARDRAILS.md`, `CHANGELOG.md`
- Technical references: `ARCHITECTURE.md`, `API_REFERENCE.md`, `ASSISTANT_BEHAVIOR.md`, `ANALYSIS_METHODS.md`
- Data references: `METRIC_CATALOG.md`, `VARIABLES.md`, `METRICS_AND_OKRS.md`
- UX reference: `DESIGN_GUIDELINES.md`

## Writing Format Rules

- Use clear headings and short sections.
- Prefer bullets for policy statements and checklists.
- Define terms before use.
- Distinguish **must** vs **should** language.
- Avoid implementation speculation.

## Quality Gates (Definition of Done)

A documentation update is done when:

- Scope files are updated and internally consistent.
- New behavior appears in PRD, API/architecture docs, and traceability matrix.
- Variables and metric references are updated where applicable.
- Guardrail impacts are documented.
- Changelog receives an entry.

## Review Cadence

- Weekly: product and engineering lead sync on doc drift.
- Release gate: no release without traceability and guardrails update.
