# agentic-governance

Status: Active
Last updated: 2026-08-18

The AI Engineering Operating System for this portfolio: how work is
planned, classified, executed, reviewed, decided, merged, and remembered —
by humans and AI agents alike, across every adopting project.

Seeded from a governance system developed in a prior internal project
(2026-07-08), generalized for portfolio-wide use; v0.2 absorbs that
project's "Governance 2.0" (levels, steward, workflow selection).

## The Model

Three layers:

1. **Canonical docs (this repo).** The operating system, architecture
   governance, governance levels (L0–L3) and the L0 fast track, the
   constitution (executive AI role charters), definition of done, review
   checklist, pattern libraries, templates. Project-agnostic by
   construction: policy is stated once here; project facts live in each
   repo's delta.
2. **Per-project delta.** Each adopting repo carries a single
   `llm/governance/governance-delta.md` (see
   `llm/governance/governance-delta-template.md`)
   declaring its mission, project-specific principles, design-authority
   document, domain review questions, repository layout (the paths it
   binds), roadmap path,
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
human-approved activation PR (`llm/governance/l0-fast-track.md`).

## Versioning

Governance evolves. Adopting repos pin the version they follow in their
delta file (`Governance: agentic-governance vX.Y`). Changes here bump
`VERSION` and are recorded in `CHANGELOG.md`; projects upgrade deliberately,
not implicitly.

## Adopting a Project

Run `/governance:establish` in the target repo. It declares the repository
layout, writes the governance delta and ADR system at the declared paths,
installs the `.github/` templates, label taxonomy and branch protection,
wires the governance checks, and installs the artifact-routing rule into
the repo's `CLAUDE.md` and `AGENTS.md` so tool defaults cannot quietly
place control-plane documents in the artifacts tree.

The skill is the procedure. It is not restated here — a prose copy of an
executable procedure drifts, and this package treats that as a defect
(`llm/governance/architecture-governance.md` §Documentation Standards).

Repos adopted before v0.3 carry the pre-v0.3 layout (`docs/governance-delta.md`,
`docs/adr/`). Moving them is a semantic change that needs its own PR; see
`llm/governance/adr/0001-llm-control-plane-docs-data-plane.md`.

## Contents

| Path | Purpose |
|---|---|
| `llm/governance/project-operating-system.md` | How work flows: lifecycle, workflow-selection policy (Modes 1–3 incl. ultracode), agent contracts, quality gates, **repository layout** |
| `llm/governance/architecture-governance.md` | Decision control: authority hierarchy, no orphan decisions, roles, ADR process |
| `llm/governance/governance-levels.md` | The L0–L3 classification model: semantic test, conservative default, escalation, merge authority |
| `llm/governance/l0-fast-track.md` | The L0 fast track: twelve conditions, certification, allowlist, per-repo activation |
| `llm/governance/definition-of-done.md` | Completion criteria by work type, mapped to governance levels |
| `llm/governance/review-checklist.md` | Reviewer checklist for semantic (L1–L3) PRs |
| `llm/governance/branch-protection.md` | Recommended GitHub branch rules |
| `llm/governance/labels.md` | Label taxonomy incl. `gov-L0`…`gov-L3` (milestones come from each project's delta) |
| `llm/governance/governance-delta-template.md` | Template for a project's local governance delta, incl. its repository-layout declaration |
| `llm/governance/adr/` | This package's own decision records |
| `llm/governance/patterns/prompt-patterns.md` | Universal Bounded-Contract Skeleton + reusable agent prompt patterns |
| `llm/governance/patterns/execution-patterns-template.md` | Seeded execution-lessons template repos instantiate and evidence locally |
| `llm/governance/templates/` | ADR, design-doc, feature-spec, research, contributing, PR-template templates |
| `llm/constitution/` | Shared executive AI principles (four roles, merge rule, direction-is-not-authority) |
| `llm/specs/` | Design specs for this package's own capabilities |
| `plugin/agents/`, `plugin/skills/` | Claude Code plugin surface (four personas + establish/audit) |
| `plugin/scripts/` | `governance-checks.mjs` — the canonical L0/convention/layout check script |
| `docs/` | Artifacts tree: external material and derived views. Holds only a README stating what belongs here. |
