# Contributing to [Project Name]

Status: Draft
Last updated: YYYY-MM-DD
Owner: [Project owner]

## Purpose

Quickstart for humans and AI agents contributing to this project. This
guide holds no policy of its own: every rule below is a pointer to its
single source of truth. If anything here appears to conflict with a linked
document, the linked document wins.

This project follows
[agentic-governance](https://github.com/djjay0131/agentic-governance);
project specifics live in `docs/governance-delta.md`.

## Scope

Orientation and pointers only.

## Read First

1. The memory bank's `activeContext.md` (path in `docs/governance-delta.md`)
2. The design-authority document (named in `docs/governance-delta.md`)
3. `docs/governance-delta.md` — this project's mission, principles, and
   local parameters
4. agentic-governance `docs/governance-levels.md` — how changes are
   classified (L0–L3)
5. agentic-governance `docs/project-operating-system.md` — how work is
   executed day to day, including workflow-mode selection

## How to Contribute

1. Start from an issue (templates in `.github/ISSUE_TEMPLATE/`).
2. Branch from `main` — never commit to `main` directly. Branch naming:
   agentic-governance `docs/architecture-governance.md` §Branch Naming.
3. Classify your change at a governance level (L0–L3) before opening the
   PR. Uncertain classification means semantic, which means human review
   (agentic-governance `docs/governance-levels.md`, Conservative Default).
4. As the author, open a draft PR early using
   `.github/pull_request_template.md`, including the governance-level
   declaration. Keep the PR scoped to one concern. Opening the PR is an
   author responsibility — the owner does not open PRs on your behalf
   (agentic-governance `docs/architecture-governance.md` §Git Workflow →
   PR Responsibilities).
5. Meet the applicable Definition of Done for the declared level:
   agentic-governance `docs/definition-of-done.md`.
6. Reviews of semantic (L1–L3) work apply agentic-governance
   `docs/review-checklist.md`. L0 administrative work follows the
   fast-track lane in agentic-governance `docs/l0-fast-track.md` and the
   Repository Steward charter — noting this repo's Steward Activation
   Status in `docs/governance-delta.md`.

## Where the Rules Live

| Topic | Source of truth |
|---|---|
| Governance levels, semantic test, conservative default, escalation, merge authority | agentic-governance `docs/governance-levels.md` |
| L0 fast track (conditions, certification, allowlist, activation) | agentic-governance `docs/l0-fast-track.md` |
| Decision control, authority hierarchy, ADR requirement, branch naming, documentation standards, AI-agent operating rules | agentic-governance `docs/architecture-governance.md` |
| Work-item lifecycle, workflow-selection policy (single agent / specialist team / ultracode), agent contracts, quality gates, local sync | agentic-governance `docs/project-operating-system.md` |
| Definition of Done (per work type, per level) | agentic-governance `docs/definition-of-done.md` |
| Review checklist (L1–L3) | agentic-governance `docs/review-checklist.md` |
| Label taxonomy, including governance-level labels | agentic-governance `docs/labels.md` |
| Prompt and execution pattern libraries | agentic-governance `docs/patterns/` + this repo's `docs/patterns/execution-patterns.md` |
| Role charters (Chief Architect, Chief Reviewer/Governance Auditor, Chief Product Officer, Repository Steward) | agentic-governance `constitution/` + `governance/agents/` |
| This project's mission, principles, design-authority document, memory-bank and roadmap paths, L0 allowlist, platform enforcement reality, steward activation status | `docs/governance-delta.md` |
| ADR mechanics, template, and index | `docs/adr/README.md` |
| Memory-bank structure, reading order, update triggers | The memory bank's own README |

## AI Agent Contributors

AI agents follow the AI Agent Operating Rules in agentic-governance
`docs/architecture-governance.md` and work under a bounded contract per
`docs/project-operating-system.md` (skeleton:
`docs/patterns/prompt-patterns.md`). AI agents never merge their own work,
with the single exception defined in agentic-governance
`constitution/shared-principles.md`.

## Assumptions

- The canonical agentic-governance docs are reachable from this repo
  (sibling checkout or GitHub); `docs/governance-delta.md` pins the
  governance version this repo follows.

## Open Questions

- None.

## Cross-References

- `docs/governance-delta.md` — this project's governance delta
- agentic-governance `docs/architecture-governance.md`,
  `docs/governance-levels.md`, `docs/project-operating-system.md`
