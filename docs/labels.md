# GitHub Labels

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)

## Purpose

This document defines the shared GitHub label taxonomy for organizing issues
and PRs. Milestone labels are project-specific and defined in each project's
governance delta.

## Type Labels

- `documentation`
- `architecture`
- `product`
- `domain`
- `ai`
- `integration`
- `ux`
- `research`
- `adr`
- `implementation`
- `bug`
- `governance`

## Status Labels

- `needs-review`
- `needs-decision`
- `blocked`
- `ready`
- `in-progress`

## Priority Labels

- `priority-high`
- `priority-medium`
- `priority-low`

## Governance Level Labels

- `gov-L0` — administrative, non-semantic; eligible for the Repository
  Steward fast track where activated
- `gov-L1` — governance & architecture (semantic; human review)
- `gov-L2` — implementation (semantic; human review)
- `gov-L3` — product (semantic; human review)

Apply exactly one governance-level label to every PR, matching the level
declared in the PR template. Level definitions live in
`docs/governance-levels.md`.

## Milestone Labels

Defined per project in `docs/governance-delta.md` (e.g.
`phase-0-foundation`, `phase-1-contracts`, ...).

## Special Labels

- `memory-bank-update`
- `adr-needed`
- `security-privacy`

Projects may add domain-specific special labels in their delta (e.g.
`youth-data`, `multi-sport`, `learning-system` in baseball-ai).

## Labeling Rules

Every issue/PR should have at least:

- one type label,
- one status label,
- and one priority label when appropriate.

Every PR additionally carries exactly one governance-level label
(`gov-L0`…`gov-L3`).

Prefer taxonomy type labels over GitHub defaults when classifying work (use
`product` or `implementation` rather than `enhancement`); defaults remain
acceptable for triage states the taxonomy does not cover (duplicates,
invalid, wontfix).
