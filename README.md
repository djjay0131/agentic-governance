# agentic-governance

Status: Active
Last updated: 2026-07-11

The AI Engineering Operating System for this portfolio: how work is
planned, classified, executed, reviewed, decided, merged, and remembered —
by humans and AI agents alike, across every adopting project.

Seeded from the governance system developed in `baseball-ai` (2026-07-08),
generalized for portfolio-wide use; v0.2 absorbs baseball-ai's
"Governance 2.0" (levels, steward, workflow selection — PR #26 /
ADR-0013).

## The Model

Three layers:

1. **Canonical docs (this repo).** The operating system, architecture
   governance, governance levels (L0–L3) and the L0 fast track, the
   constitution (executive AI role charters), definition of done, review
   checklist, pattern libraries, templates. Project-agnostic by
   construction: policy is stated once here; project facts live in each
   repo's delta.
2. **Per-project delta.** Each adopting repo carries a single
   `docs/governance-delta.md` (see `docs/governance-delta-template.md`)
   declaring its mission, project-specific principles, design-authority
   document, domain review questions, memory-bank and roadmap paths,
   governance check command, L0 path allowlist, platform enforcement
   reality, and steward activation status. Canonical docs defer to the
   delta wherever project specifics are needed.
3. **Execution layer.** This repo doubles as a Claude Code plugin providing
   the four executive personas (chief-architect, chief-reviewer — also the
   L0 Governance Auditor, chief-product-officer, repository-steward), the
   `/governance:establish` and `/governance:audit` skills, and the
   governance-checks script. Specialist analysis is delegated to the
   Constellize plugin personas (system-architects, qa-engineers,
   product-managers, ...) — this repo deliberately does not duplicate them.

Every change in an adopting repo carries a governance level: L0
(administrative, non-semantic) through L3 (product). Human review is
mandatory for all semantic work (L1–L3). The only AI merge lane is the
Repository Steward's certified, independently audited L0 fast track — and
it ships **inert**: each repo must activate it through its own ADR plus a
human-approved activation PR (`docs/l0-fast-track.md`).

## Versioning

Governance evolves. Adopting repos pin the version they follow in their
delta file (`Governance: agentic-governance vX.Y`). Changes here bump
`VERSION` and are recorded in `CHANGELOG.md`; projects upgrade deliberately,
not implicitly.

## Adopting a Project

Run `/governance:establish` in the target repo, or manually:

1. Copy `docs/governance-delta-template.md` → `<repo>/docs/governance-delta.md` and fill it in (including the v0.2 fields: paths, check command, L0 allowlist, platform reality, steward status INACTIVE).
2. Create `<repo>/docs/adr/` with `docs/templates/adr-template.md` as `0000-template.md`.
3. Add `.github/` PR/issue templates (`docs/templates/pr-template-template.md` puts the governance-level declaration first).
4. Create the GitHub remote, apply `docs/branch-protection.md` to `main` where the plan allows; record reality in the delta either way.
5. Instantiate the label taxonomy (`docs/labels.md` incl. `gov-L0`…`gov-L3`, plus delta milestones).
6. Add a `CONTRIBUTING.md` from `docs/templates/contributing-template.md`.
7. Record adoption in the project's memory bank.

## Contents

| Path | Purpose |
|---|---|
| `docs/project-operating-system.md` | How work flows: lifecycle, workflow-selection policy (Modes 1–3 incl. ultracode), agent contracts, quality gates |
| `docs/architecture-governance.md` | Decision control: authority hierarchy, no orphan decisions, roles, ADR process |
| `docs/governance-levels.md` | The L0–L3 classification model: semantic test, conservative default, escalation, merge authority |
| `docs/l0-fast-track.md` | The L0 fast track: twelve conditions, certification, allowlist, per-repo activation |
| `docs/definition-of-done.md` | Completion criteria by work type, mapped to governance levels |
| `docs/review-checklist.md` | Reviewer checklist for semantic (L1–L3) PRs |
| `docs/branch-protection.md` | Recommended GitHub branch rules |
| `docs/labels.md` | Label taxonomy incl. `gov-L0`…`gov-L3` (milestones come from each project's delta) |
| `docs/governance-delta-template.md` | Template for a project's local governance delta |
| `docs/patterns/prompt-patterns.md` | Universal Bounded-Contract Skeleton + reusable agent prompt patterns |
| `docs/patterns/execution-patterns-template.md` | Seeded execution-lessons template repos instantiate and evidence locally |
| `docs/templates/` | ADR, design-doc, feature-spec, research, contributing, PR-template templates |
| `constitution/` | Shared executive AI principles (four roles, merge rule, direction-is-not-authority) |
| `governance/agents/`, `governance/skills/` | Claude Code plugin surface (four personas + establish/audit) |
| `governance/scripts/` | `governance-checks.mjs` — the canonical L0/convention check script |
