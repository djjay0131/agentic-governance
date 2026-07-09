# agentic-governance

Status: Active
Last updated: 2026-07-09

Canonical governance for all projects in this portfolio: how work is planned,
executed, reviewed, decided, and remembered — by humans and AI agents alike.

Seeded from the governance system developed in `baseball-ai` (2026-07-08),
generalized for portfolio-wide use.

## The Model

Three layers:

1. **Canonical docs (this repo).** The operating system, architecture
   governance, constitution (executive AI role charters), definition of done,
   review checklist, templates. Project-agnostic by construction.
2. **Per-project delta.** Each adopting repo carries a single
   `docs/governance-delta.md` (see `docs/governance-delta-template.md`)
   declaring its mission, project-specific principles, design-authority
   document, domain review questions, and label milestones. Canonical docs
   defer to the delta wherever project specifics are needed.
3. **Execution layer.** This repo doubles as a Claude Code plugin providing
   the executive personas (chief-architect, chief-reviewer,
   chief-product-officer) and the `/governance:establish` and
   `/governance:audit` skills. Specialist analysis is delegated to the
   Constellize plugin personas (system-architects, qa-engineers,
   product-managers, ...) — this repo deliberately does not duplicate them.

## Versioning

Governance evolves. Adopting repos pin the version they follow in their
delta file (`Governance: agentic-governance vX.Y`). Changes here bump
`VERSION` and are recorded in `CHANGELOG.md`; projects upgrade deliberately,
not implicitly.

## Adopting a Project

Run `/governance:establish` in the target repo, or manually:

1. Copy `docs/governance-delta-template.md` → `<repo>/docs/governance-delta.md` and fill it in.
2. Create `<repo>/docs/adr/` with `docs/templates/adr-template.md` as `0000-template.md`.
3. Add `.github/` PR/issue templates (see `docs/templates/`).
4. Create the GitHub remote, apply `docs/branch-protection.md` to `main`.
5. Instantiate the label taxonomy (`docs/labels.md` + delta milestones).
6. Add a `CONTRIBUTING.md` from `docs/templates/contributing-template.md`.
7. Record adoption in the project's memory bank.

## Contents

| Path | Purpose |
|---|---|
| `docs/project-operating-system.md` | How work flows: Issue → Branch → Draft PR → Review → Merge → Memory/ADR update |
| `docs/architecture-governance.md` | Decision control: authority hierarchy, no orphan decisions, ADR process |
| `docs/definition-of-done.md` | Completion criteria by work type |
| `docs/review-checklist.md` | Reviewer checklist for all PR types |
| `docs/branch-protection.md` | Required GitHub branch rules |
| `docs/labels.md` | Label taxonomy (milestones come from each project's delta) |
| `docs/governance-delta-template.md` | Template for a project's local governance delta |
| `docs/templates/` | ADR, design-doc, feature-spec, research, contributing templates |
| `constitution/` | Executive AI role charters + shared principles |
| `agents/`, `skills/` | Claude Code plugin surface (personas + establish/audit) |
