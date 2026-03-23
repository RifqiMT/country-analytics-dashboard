# Product Documentation Standard

## Purpose

Ensure documentation is clear, accurate, and usable for readers without prior project knowledge.

## Principles

1. Clarity first
2. Single source of truth
3. Traceability
4. Current-state accuracy
5. Audience awareness

## Quality gates

- Facts align with implementation.
- Cross-doc references are updated.
- Beginner-friendly explanation exists.
- Examples are concrete.
- Changelog entry is added.

## Enterprise Requirements for This Repository

This repository uses an enterprise-style documentation standard so that:
- New joiners can understand product intent and usage without reading code
- Engineering changes do not silently invalidate docs
- Product, design, and QA teams share the same definitions and governance rules

## Required Sections (recommended minimum)

When updating a documentation artifact, include (as relevant):
1. Purpose & scope: what the doc covers and who it is for
2. Glossary: definitions of key terms used in the doc
3. How to use: the “reader journey” (what to read first, what to do next)
4. Behavior rules: must/should statements and invariants
5. Examples: concrete request/response examples or UI usage examples
6. Limitations & guardrails: what the system cannot guarantee
7. Related references: links to dependent docs and canonical sources

## Writing Format Rules

- Prefer clear headings and short sections.
- Use tables for variable definitions and contract-like documentation.
- Avoid vague language; include concrete parameters (P95, route names, required fields).
- Use “must” for non-negotiable rules and “should” for best practices.
- Define acronyms the first time they appear.

## Traceability & Synchronization Rules

Updates must keep the documentation set internally consistent. In particular:
- Metrics changes require updating:
  - `docs/METRIC_CATALOG.md`
  - `docs/VARIABLES.md`
  - `docs/TRACEABILITY_MATRIX.md`
- Assistant behavior changes require updating:
  - `docs/ASSISTANT_BEHAVIOR.md`
  - `docs/GUARDRAILS.md`
  - `docs/TRACEABILITY_MATRIX.md`

## Quality Gates (Definition of Done)

This doc update is considered complete only if:
- Facts align with implementation behavior
- Any cross-doc references are updated and not broken
- Examples are usable and reflect actual payload fields
- The update is noted in `docs/CHANGELOG.md`

## Review Workflow

1. Author: implementer edits the doc
2. Technical review: engineer verifies alignment to code paths and request/response contracts
3. Product/design review: stakeholder verifies readability and whether docs match user intent
4. Release gate: traceability + guardrails mapping are updated for impacted requirements

## Cadence

- Weekly: doc drift scan for outdated references
- Release gate: no release without traceability and guardrails alignment
- Monthly: onboarding readability check for new joiners
