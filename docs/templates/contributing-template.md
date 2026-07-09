# Contributing to [Project Name]

Status: Draft
Last updated: YYYY-MM-DD

## Purpose

This guide explains how humans and AI agents contribute to this project.
This project follows [agentic-governance](https://github.com/djjay0131/agentic-governance)
(see `docs/governance-delta.md` for project specifics).

## Before You Start

Read these first:

1. The memory bank's `activeContext.md`
2. The design-authority document (named in `docs/governance-delta.md`)
3. `docs/governance-delta.md`
4. agentic-governance: `docs/architecture-governance.md` and
   `docs/project-operating-system.md`

## Contribution Rules

- Do not commit directly to `main`.
- Work on a branch (naming conventions in architecture-governance).
- Open a draft PR early.
- Keep work scoped.
- Update documentation when decisions change.
- Add ADRs for durable decisions (`docs/adr/`, use the template).
- Update the memory bank when project context changes.
- Be explicit about assumptions and open questions.

## AI Agent Contributors

AI agents must:

- Follow assigned role and scope.
- Read relevant docs before editing.
- Avoid undocumented durable decisions.
- Identify ADR candidates.
- Produce reviewable Markdown.
- Open PRs rather than pushing to `main`.
- Never merge their own PRs.

## Definition of Done

See agentic-governance `docs/definition-of-done.md`.
