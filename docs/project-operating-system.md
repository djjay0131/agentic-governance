# Project Operating System

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)
Applies to: all repos adopting agentic-governance (see each repo's `docs/governance-delta.md`)

## Purpose

This document explains how an adopting project operates day to day. The
project's design-authority document (named in its governance delta) defines
*what* is being built. Architecture Governance
(`docs/architecture-governance.md`) defines *how decisions are controlled*.
This document defines *how people and AI agents execute work* — including
which execution mode to use for a given work item. It is the single source
of truth for the work-item lifecycle, the workflow-selection policy, the
agent-contract field set, handoff requirements, quality gates, conflict
resolution, and local sync.

## Scope

Day-to-day execution. Governance levels, roles, review policy, and merge
authority live in `docs/architecture-governance.md` and
`docs/governance-levels.md` and are cited here, not restated.

## Operating Model

Each project runs like a small AI-assisted product and engineering
organization.

The project owner acts as Chief Architect authority and final decision
maker. AI agents act as executive role-holders (see `constitution/` and
`governance/agents/`) and specialist contributors (Constellize personas).
All work is coordinated through GitHub issues, branches, pull requests,
Markdown documents, ADRs, and the memory bank.

## Core Workflow

```text
Roadmap -> Issue -> Branch -> Draft PR -> Review -> Revise -> Approve -> Merge -> Memory/ADR update
```

No work should skip the review path unless explicitly authorized for
emergency repair.

## Work Item Lifecycle

### 1. Roadmap Selection

Select work from the project roadmap (path declared in the delta) or an
approved issue.

### 2. Issue Creation

Create an issue describing:

- Problem
- Desired outcome
- Scope
- Deliverables
- Relevant docs
- Acceptance criteria

### 3. Branch Creation

Create a branch using the naming convention in `architecture-governance.md`.

### 4. Draft Work

Contributor produces scoped changes.

Design work should be Markdown-first. Implementation work should only happen
after design approval.

### 5. Draft PR

Open a draft PR early, declaring the governance level (L0–L3). The PR
becomes the collaboration space.

### 6. Review

Review for alignment, completeness, tradeoffs, risks, memory updates, and
ADR needs.

### 7. Approval and Merge

Merge per level (`docs/governance-levels.md`): L1–L3 by the project owner
after review; L0 per the fast-track policy where activated. Post-merge,
local clones should pull from `main`.

## Workflow-Selection Policy

The Chief Architect selects the execution mode BEFORE substantial work
begins and records the choice in the issue or PR. Execution mode is about
how work is produced; it never changes what review the work requires
(see Non-Negotiables below).

### Mode 1 — Single Agent

One agent, one bounded contract, one branch.

Use for: narrow fixes, bounded documentation edits, small implementation
tasks, localized bugs, and uncomplicated L0 administration.

### Mode 2 — Specialist Team

Static parallel agents with disjoint file scopes, followed by a
reconciliation round.

Use for: cross-document design, domain work, data architecture, platform
decisions, product definition, multi-expertise research, and
implementation spanning several concerns.

### Mode 3 — Dynamic Workflow (Ultracode)

A dependency-aware orchestration script that launches bounded specialist
agents in waves, runs an independent Governance Audit, and reconciles
through a Lead Architect.

Strong triggers:

- Multi-repository work.
- Cross-domain architecture.
- Several parallel research streams.
- Repository-wide transformations.
- Dependency-ordered specialist waves.
- Repeated audit/reconciliation cycles.
- Tasks whose intermediate findings dynamically create new sub-tasks.
- Work expected to use many agents or long context.
- Tasks where an orchestration script should be generated and run.

Canonical prompt language for invoking Mode 3:

> Use an ultracode dynamic workflow. Construct a dependency-aware
> orchestration plan, launch bounded specialist agents, run an independent
> Governance Audit, reconcile through the Lead Architect, and preserve
> progress across interruptions.

### Mode-Selection Table

| Signals in the work item | Mode |
|---|---|
| One file cluster, one expertise, bounded outcome; localized bug; routine L0 administration | Mode 1 — Single Agent |
| Several documents or concerns, multiple expertises, scopes known up front and separable | Mode 2 — Specialist Team |
| Dependencies between work units; findings will spawn sub-tasks; repo-wide or multi-repo scope; audit/reconcile cycles expected; many agents or long context | Mode 3 — Ultracode |

Reusable prompt skeletons for all three modes live in
`docs/patterns/prompt-patterns.md`; each repo accumulates its own
evidence-backed execution lessons in a local `docs/patterns/execution-patterns.md`
seeded from `docs/patterns/execution-patterns-template.md`.

### Non-Negotiables (All Modes)

- Ultracode is an execution mechanism, NOT a governance bypass. Semantic
  work (L1/L2/L3) produced through ultracode still requires human review
  per the governance levels in `docs/governance-levels.md`.
- Every mode's output flows through Issue -> Branch -> PR. No mode skips
  the Core Workflow above.
- Interruption resilience is required in Modes 2 and 3: commit completed
  specialist deliverables promptly, resume agents from transcripts, and
  never lose specialist output.
- Uncertain classification => semantic => human review (conservative
  default; see `docs/governance-levels.md`).

## Operating Rhythm

Work runs in issue-scoped sprints, not on a fixed weekly calendar. Each
sprint follows the same arc:

### Plan

- Select work from the roadmap or an approved issue.
- The Chief Architect classifies the work (levels per
  `docs/governance-levels.md`), selects the execution mode
  (Workflow-Selection Policy above), and records both in the issue or PR.
- Confirm dependencies between deliverables.

### Execute

- Agents work on branches under bounded contracts.
- Draft PRs are opened early; questions are captured in PRs or issues.

### Review

- Compare the PR against the design-authority document and ADRs; resolve
  conflicts.
- Decide which changes require ADRs.
- Human review for all semantic (L1/L2/L3) work.

### Merge and Memory Update

- Merge approved PRs (per-level merge authority,
  `docs/governance-levels.md`).
- Update memory bank and roadmap status.
- Create follow-up issues.

## Agent Assignment Contract

Every AI agent must receive a bounded contract before starting work. The
required elements are:

```text
Role:
Objective:
Required reading:
Required skills/workflows:
Allowed files/directories:
Do not modify:
Deliverables:
Definition of Done:
Required sections:
Sprint scope boundary (what this work is NOT):
Open questions to answer:
ADR candidates to identify:
Git rules (no git/gh mutations; who commits):
Final report shape:
```

The `Required skills/workflows` element must identify applicable
Superpowers and Constellize workflows. The `Definition of Done` element
cites the applicable checklist in `docs/definition-of-done.md`.

The fully worked, parameterized skeleton for this contract — and its
specializations per work type — is the Universal Bounded-Contract Skeleton
in `docs/patterns/prompt-patterns.md`. Use it rather than improvising
contract text.

## Agent Handoff Requirements

Each agent deliverable must include:

- Summary
- Assumptions
- Recommendations
- Alternatives considered
- Risks
- Open questions
- Related docs
- ADR candidates

## Repository Areas

### Memory bank (path declared in the delta)

Current project context for AI continuity.

### `docs/`

Design, architecture, product, roadmap, and governance-delta documents.

### `docs/adr/`

Architecture Decision Records.

### `.github/`

GitHub workflows, issue templates, and PR templates.

### Application directories

Created only after design readiness.

## Decision Flow

1. Idea emerges.
2. Capture in issue or PR.
3. Discuss tradeoffs.
4. If durable, create ADR.
5. Update the design-authority document or detailed docs.
6. Update memory bank if project context changed.
7. Implement only after approval.

## Priority Rules

When unsure what to do next, clarify in this order (adapt per project via
the delta file):

1. MVP / v1 scope
2. Domain model
3. Core system principles (the delta's project principles)
4. AI architecture
5. Integration feasibility
6. UX
7. Only then scaffold implementation.

## Quality Gates

### Design Quality Gate

A design is ready when another contributor can understand the decision
without the original chat context.

### Implementation Quality Gate

Implementation is ready when it maps to approved docs and can be tested or
reviewed against acceptance criteria.

### AI Quality Gate

AI-generated behavior is ready when it has:

- data provenance,
- explainability,
- human review where needed,
- confidence or uncertainty handling,
- and evaluation criteria.

## Conflict Resolution

If agents disagree:

1. Identify source of conflict.
2. Check the design-authority document and ADRs.
3. Escalate to project owner if unresolved.
4. Record final decision in ADR or memory bank.

## Local Development Sync

Because some changes may be made through GitHub connectors, local clones
must pull after merges:

```bash
git checkout main
git pull origin main
```

For branch work:

```bash
git fetch origin
git checkout <branch-name>
```

## Operating Principle

A project should preserve the reasoning behind the product as carefully as
it preserves the code. Projects are expected to evolve, but evolution must
remain visible and reviewable.

## Assumptions

- Each adopting repo declares its roadmap and memory-bank paths in its
  governance delta; this document refers to them abstractly.
- Team shape and platform enforcement vary per repo; the delta's Platform
  Enforcement Reality section records what is convention-enforced.

## Open Questions

- Whether Mode 3 warrants a standing, versioned orchestration script
  template versus per-sprint generation (revisit as adopting repos
  accumulate ultracode sprint evidence in their execution-patterns files).

## Cross-References

- `docs/architecture-governance.md` — decision control, roles, branch
  naming.
- `docs/governance-levels.md` — classification model, merge authority.
- `docs/l0-fast-track.md` — the L0 lane.
- `docs/patterns/prompt-patterns.md` — prompt skeletons and the Universal
  Bounded-Contract Skeleton.
- `docs/patterns/execution-patterns-template.md` — the execution-lessons
  template repos instantiate.
- `docs/definition-of-done.md` — Definition of Done checklists.
- `docs/review-checklist.md` — reviewer checklist.
