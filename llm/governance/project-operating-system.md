# Project Operating System

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)
Applies to: all repos adopting agentic-governance (see each repo's `llm/governance/governance-delta.md`)

## Purpose

This document explains how an adopting project operates day to day. The
project's design-authority document (named in its governance delta) defines
*what* is being built. Architecture Governance
(`llm/governance/architecture-governance.md`) defines *how decisions are controlled*.
This document defines *how people and AI agents execute work* — including
which execution mode to use for a given work item. It is the single source
of truth for the work-item lifecycle, the workflow-selection policy, the
agent-contract field set, handoff requirements, quality gates, conflict
resolution, and local sync.

## Scope

Day-to-day execution. Governance levels, roles, review policy, and merge
authority live in `llm/governance/architecture-governance.md` and
`llm/governance/governance-levels.md` and are cited here, not restated.

## Operating Model

Each project runs like a small AI-assisted product and engineering
organization.

The project owner acts as Chief Architect authority and final decision
maker. AI agents act as executive role-holders (see `llm/constitution/` and
`plugin/agents/`) and specialist contributors (Constellize personas).
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

Merge per level (`llm/governance/governance-levels.md`): L1–L3 by the project owner
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
`llm/governance/patterns/prompt-patterns.md`; each repo accumulates its own
evidence-backed execution lessons in a local `llm/governance/patterns/execution-patterns.md`
seeded from `llm/governance/patterns/execution-patterns-template.md`.

### Non-Negotiables (All Modes)

- Ultracode is an execution mechanism, NOT a governance bypass. Semantic
  work (L1/L2/L3) produced through ultracode still requires human review
  per the governance levels in `llm/governance/governance-levels.md`.
- Every mode's output flows through Issue -> Branch -> PR. No mode skips
  the Core Workflow above.
- Interruption resilience is required in Modes 2 and 3: commit completed
  specialist deliverables promptly, resume agents from transcripts, and
  never lose specialist output.
- Uncertain classification => semantic => human review (conservative
  default; see `llm/governance/governance-levels.md`).

## Operating Rhythm

Work runs in issue-scoped sprints, not on a fixed weekly calendar. Each
sprint follows the same arc:

### Plan

- Select work from the roadmap or an approved issue.
- The Chief Architect classifies the work (levels per
  `llm/governance/governance-levels.md`), selects the execution mode
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
  `llm/governance/governance-levels.md`).
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
cites the applicable checklist in `llm/governance/definition-of-done.md`.

The fully worked, parameterized skeleton for this contract — and its
specializations per work type — is the Universal Bounded-Contract Skeleton
in `llm/governance/patterns/prompt-patterns.md`. Use it rather than improvising
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

This repository has two planes, plus a small exempt class. Every path
below is **declared in the repo's governance delta** (§Repository
Layout), never hardcoded here: the canon prescribes the shape, the
delta binds the paths. This is the memory-bank lesson applied
consistently.

### The two planes

The split is by **role**, not by authorship. Who wrote a document
decides nothing; what the document *does* decides everything.

**Control plane — the `llm/` tree.** Artifacts that govern, plan,
record, review, or operate this repository: governance policy and the
governance delta, role charters, workflows, prompts and skills, design
specs acting as design authority, implementation plans, backlog and
feature specs, the memory bank, ADRs, roadmaps, execution patterns, and
review and retrospective records. Control-plane documents are sources
of truth, and nothing downstream is authoritative over them.

**Data plane — the artifacts tree (`docs/`).** Project and domain
deliverables, external material, and derived views of control-plane
content: product and API documentation, project/domain technical
specifications and reference material, vendor and third-party
specifications, external proposals, research sources, PDFs, diagrams,
datasets, and published sites and generated views. Nothing here governs
how this repository is operated.

The Design Surface projection rule requires every published element to
be attributable to an authoritative source. This is its inverse: **no
artifact that governs repository operation lives in the artifacts
tree, and any view placed there must name the `llm/` document it
projects.**

### Deciding where a document goes

Before creating any document, answer two questions in order.

**Q1 — Does this artifact control how the repository is governed,
planned, remembered, reviewed, or operated?** YES → control plane
(`llm/`). This is governance policy and the governance delta, role
charters, workflows, prompts and skills, design specs acting as design
authority, implementation plans, backlog and feature specs, the memory
bank, ADRs, roadmaps, execution patterns, and review and retrospective
records.

**Q2 — Otherwise: is it a project or domain deliverable, technical
reference, external source, specification, or generated project
documentation?** YES → the artifacts tree (`docs/`). This is product
and API documentation, project/domain technical specifications and
reference material, vendor and third-party specifications, external
proposals, research sources, PDFs, diagrams, datasets, and published
sites and generated views. A derived view of a control-plane document
belongs here too, and must name the `llm/` document it projects.

**Otherwise — do not invent a location.** Use the existing structure
the artifact plainly belongs to (`src/`, `tests/`, `.github/`), or
escalate to the Repository Steward
(`plugin/agents/repository-steward.md` §Layout Escalations (Inbound)).

If the answer to Q1 is unclear, treat the artifact as control plane.
Misfiling a source of truth as an artifact is the failure this rule
exists to prevent; the reverse is cheap to correct.

### Canonical destinations

| Content | Destination |
|---|---|
| Role charters, shared principles | `llm/constitution/` |
| Governance policy, the delta, templates, patterns | `llm/governance/` |
| Architecture Decision Records | `llm/governance/adr/` |
| Design specs, the design-authority document | `llm/specs/` |
| Implementation plans | `llm/plans/` |
| Feature specs and backlog | `llm/features/` |
| Memory bank | `llm/memory_bank/` |
| Product/domain docs, external material, published views | `docs/` |

ADRs are control plane: an ADR *is* the decision, not a report of one.
A published ADR index may be generated into the artifacts tree as a
derived view.

A repo declares only the paths it uses. An absent slot is not a
violation; an undeclared path is.

### Tool-contract paths

Some paths are fixed by a tool or a platform rather than chosen by
this project. They sit outside both planes and are exempt. The class
is closed:

- `.github/` — workflows, issue templates, PR templates.
- `.claude-plugin/` — the marketplace manifest.
- The plugin payload root — whatever directory a marketplace `source`
  field points at.
- Root-convention files: `README.md`, `CHANGELOG.md`, `VERSION`,
  `CONTRIBUTING.md`, `LICENSE`, `CLAUDE.md`, `AGENTS.md`.

The exemption covers **location only**. A tool default is never design
authority. Where a tool writes control-plane content into the
artifacts tree, override the tool — in the repo's `CLAUDE.md`, which
is the channel tools honor — and relocate the output. `docs/superpowers/`
is the worked example, and the reason this section exists
(`llm/governance/adr/0001-llm-control-plane-docs-data-plane.md`).

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

- `llm/governance/architecture-governance.md` — decision control, roles, branch
  naming.
- `llm/governance/governance-levels.md` — classification model, merge authority.
- `llm/governance/l0-fast-track.md` — the L0 lane.
- `llm/governance/patterns/prompt-patterns.md` — prompt skeletons and the Universal
  Bounded-Contract Skeleton.
- `llm/governance/patterns/execution-patterns-template.md` — the execution-lessons
  template repos instantiate.
- `llm/governance/definition-of-done.md` — Definition of Done checklists.
- `llm/governance/review-checklist.md` — reviewer checklist.
