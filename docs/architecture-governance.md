# Architecture Governance

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)
Applies to: all repos adopting agentic-governance (see each repo's `docs/governance-delta.md`)

## Purpose

This document defines how design and architecture decisions are made,
reviewed, documented, and changed. It applies to human contributors and AI
agents. It is the single source of truth for: decision control (the
authority hierarchy, the orphan-decision rule, when an ADR is required,
change management), roles and merge authority, branch naming, PR
requirements, memory-bank rules, documentation standards, and AI-agent
operating rules.

The goal is to prevent design drift, preserve decision history, spend human
review only where it changes meaning, and keep each project aligned with
its foundational vision (declared in the project's governance delta).

## Scope

Decision-control policy for all repository changes. The governance
classification model (levels L0–L3, semantic test, escalation) is owned by
`docs/governance-levels.md`; the L0 fast-track lane by
`docs/l0-fast-track.md`; day-to-day execution mechanics (work-item
lifecycle, workflow selection, agent contracts, quality gates) by
`docs/project-operating-system.md`. This document cites those; it does not
restate them.

## Core Governance Rule

No meaningful project decision should live only in chat.

Every durable decision must be captured in at least one of:

- Memory bank
- The project's design-authority document (named in the delta)
- Architecture Decision Record
- Detailed design document
- GitHub issue or pull request discussion

## Governance Classification

Every change is classified at exactly one governance level (L0–L3) before
it is merged; the level determines who must review it and who may merge it.
The classification model — the semantic vs non-semantic test, the
conservative default, the closed L0 category list, mixed-level rules,
escalation and reclassification rules, and level-aware merge authority — is
defined once, in `docs/governance-levels.md`. The L0 fast-track lane
(conditions, certification, allowlist, activation) is defined in
`docs/l0-fast-track.md`.

## Design Authority Hierarchy

When artifacts conflict, use this precedence order:

1. Memory bank
2. Design-authority document (FDS / approved design spec — named in the delta)
3. Architecture Decision Records
4. Detailed design documents
5. GitHub issues
6. Pull requests
7. Code

If code conflicts with an approved ADR, the code is wrong unless the ADR is
changed first. If an ADR conflicts with the design-authority document,
update or explicitly supersede that document before implementation proceeds.

Changing any artifact in this hierarchy is semantic (L1 for
governance/architecture artifacts, L3 for product artifacts) — with one
exception: synchronizing an artifact to reflect a decision already approved
in a merged PR is L0 bookkeeping.

## No Orphan Decisions

A decision is orphaned if it exists only in a conversation, prompt, meeting
note, or private scratchpad — including conversations with any AI assistant
(Claude, ChatGPT, or others).

Orphan decisions are not authoritative.

Before acting on an important decision, contributors must place it into the
repo as one of:

- ADR
- Design-authority document update
- Detailed design document
- Memory-bank update
- Issue or PR note

## Roles and Responsibilities

### Project Owner / Chief Architect (human)

The project owner owns final decision authority. Responsibilities:

- Approve or reject durable design decisions.
- Review and merge all semantic (L1/L2/L3) pull requests — the sole merge
  authority above L0.
- Resolve conflicts between agents or documents, including classification
  disputes.
- Set milestone priority.
- Protect the project vision (per the delta).
- Decide whether and when to activate the steward fast track
  (`docs/l0-fast-track.md` §Per-Repo Activation).

### Chief Architect (AI executive role)

Responsible for architectural coherence, level classification, and
execution-mode selection. Charter: `governance/agents/chief-architect.md`.

### Chief Reviewer / Governance Auditor (AI executive role)

Responsible for review quality and decision integrity (L1–L3), and serves
as the Governance Auditor for the L0 lane. Charter:
`governance/agents/chief-reviewer.md`.

### Chief Product Officer (AI executive role)

Responsible for user value and MVP discipline. Charter:
`governance/agents/chief-product-officer.md`.

### Repository Steward (AI executive role)

Executes the L0 administrative lane: certifies, opens, and — after
independent audit, and only in repos that have activated the fast track —
merges narrow L0 PRs, and maintains repository bookkeeping. Duties,
prohibitions, audit trail, and escalation mechanics:
`governance/agents/repository-steward.md`. The steward's merge authority is
the **only** exception to "no AI role merges its own work"
(`constitution/shared-principles.md`), exists solely for certified+audited
L0 changes, and is inert in every repo until activated per
`docs/l0-fast-track.md` §Per-Repo Activation.

### Specialist Agents / Contributors

Specialists own scoped workstreams. Prefer Constellize personas
(system-architects, data-specialists, qa-engineers, product-managers, ...)
for specialist analysis. Responsibilities:

- Work only in assigned scope unless explicitly approved.
- Produce Markdown design artifacts.
- Document assumptions and open questions.
- Identify ADR candidates.
- Use branches and pull requests.
- Classify their work's governance level; when uncertain, apply the
  conservative default (`docs/governance-levels.md`).

## Git Workflow

Direct commits to `main` are not allowed except for emergency repository
repair.

Note on enforcement: what the platform actually blocks varies per repo and
is recorded in each delta's Platform Enforcement Reality section; where
platform enforcement is unavailable, every rule in this workflow is
convention-enforced. Squash merge is the recommended convention for all
merges (`docs/branch-protection.md`).

Normal workflow:

1. Create or select GitHub issue.
2. Create branch from `main`.
3. Make scoped changes.
4. Open draft PR, declaring the governance level (L0–L3).
5. Review design and files changed.
6. Update memory bank and ADRs if needed.
7. Mark PR ready for review.
8. Merge per level: L1–L3 by the human owner after review; L0 by the
   Repository Steward after certification and audit where the fast track is
   activated, otherwise by the human owner.
9. Delete the merged branch.

## Branch Naming

Use clear prefixes:

```text
docs/<topic>
architecture/<topic>
product/<topic>
domain/<topic>
ai/<topic>
integration/<topic>
research/<topic>
prototype/<topic>
feature/<topic>
spike/<topic>
governance/<topic>
admin/<topic>
```

`governance/<topic>` is for changes to how the repo itself operates (L1).
`admin/<topic>` is reserved for L0 administrative branches opened by the
Repository Steward.

## Pull Request Requirements

Every PR should include:

- Governance level (L0–L3) with one-line justification
- Problem
- Motivation
- Summary of changes
- Design decisions
- Files changed
- Tradeoffs
- Open questions
- Related docs
- Related ADRs
- Memory-bank updates

PRs should be opened as drafts until the author believes the work is
reviewable. L0 PRs additionally carry the Administrative Change
Certification (`docs/l0-fast-track.md`). The PR template each repo installs
is `docs/templates/pr-template-template.md`.

## Review Requirements

The single source of truth for review criteria is
`docs/review-checklist.md`; reviewers apply it to all semantic (L1–L3) PRs.
L0 fast-track PRs are audited solely against the conditions and allowlist
in `docs/l0-fast-track.md`. The single source of truth for completion
criteria is `docs/definition-of-done.md`. This document intentionally does
not restate any of them — it defines only *who* must review and merge at
each level (see `docs/governance-levels.md`).

## ADR Process

Use ADRs for durable decisions that affect product direction, architecture,
data model, AI behavior, integration strategy, security, implementation
structure, or the governance process itself (levels, merge authority,
steward powers).

Creating or modifying ADR *content* is L1; flipping an ADR *status* to
record a decision already approved in a merged PR is L0.

ADR lifecycle:

1. Proposed
2. Accepted
3. Superseded
4. Deprecated

ADR files live in `docs/adr/`, named `0001-short-title.md`,
`0002-short-title.md`, ...

Each ADR should include: Status, Context, Decision, Alternatives considered,
Consequences, Related documents. Use `docs/templates/adr-template.md`.

## Memory Bank Rules

The memory bank (path declared in the delta) is the project context source
for AI sessions. It should summarize current truth and point to detailed
docs — detailed docs are not a replacement for memory-bank updates.

Update it when:

- Product direction changes.
- Architecture direction changes.
- MVP scope changes.
- Major open questions are answered.
- A milestone is completed.
- A key decision is made.

Governance classification: synchronizing the memory bank to already-merged,
already-approved work is L0; recording a *new* direction, scope, or
decision in the memory bank is semantic and travels with the PR that makes
that decision.

## Documentation Standards

Every major Markdown document should include:

- Title
- Status
- Last updated date
- Owner
- Purpose
- Scope
- Assumptions
- Open questions
- Cross-references

Recommended statuses: Draft, Review, Approved, Active, Implemented,
Superseded.

Consolidation principle: policy is stated once, in its source-of-truth
document, and cited everywhere else. Copied policy drifts; documents that
restate another document's policy are defects.

## AI Agent Operating Rules

AI agents must:

- Read the design-authority document and relevant memory-bank files before
  design work.
- Read the project's `docs/governance-delta.md`.
- Work on a branch and open a PR instead of committing directly to `main`.
- Classify every change at a governance level before opening the PR; apply
  the conservative default when uncertain.
- Never merge their own work — with the single exception of the Repository
  Steward's certified+audited L0 lane, where the repo has activated it
  (`docs/l0-fast-track.md`).
- Stay inside assigned scope.
- Document assumptions and uncertainty.
- Avoid making undocumented durable decisions.
- Identify needed ADRs.
- Preserve raw/evidence/source-data principles.
- Avoid implementation before design acceptance.

## Change Management

To change an approved decision:

1. Open an issue or PR explaining the proposed change.
2. Identify impacted documents and ADRs.
3. Update the source of authority first.
4. Update downstream docs/code second.
5. Mark superseded ADRs clearly.

Changing an approved decision is always semantic (L1, L2, or L3 per the
classification model) — never L0, regardless of how small the diff is.

## Governance Principle

Speed is useful, but architectural memory is more valuable. Projects should
move quickly without losing the reasoning behind why the system exists and
how it is meant to evolve. The classification model serves that principle:
human attention is reserved for changes that alter meaning, and everything
mechanical is certified, audited, and logged instead of silently trusted.

## Assumptions

- Each adopting repo carries a filled-in `docs/governance-delta.md`
  declaring the project facts this document parameterizes (design-authority
  document, memory-bank and roadmap paths, platform enforcement reality,
  steward activation status, L0 allowlist).
- Role separation among AI agents may be procedural rather than
  identity-based; each delta declares which honestly.

## Open Questions

- None currently.

## Cross-References

- `docs/governance-levels.md` — classification model (source of truth)
- `docs/l0-fast-track.md` — L0 fast-track policy (source of truth)
- `docs/project-operating-system.md` — execution, workflow selection
- `docs/review-checklist.md` — review criteria (source of truth)
- `docs/definition-of-done.md` — completion criteria (source of truth)
- `docs/labels.md` — label taxonomy, including `gov-L0`…`gov-L3`
- `docs/branch-protection.md` — recommended platform settings
- `docs/governance-delta-template.md` — the per-repo delta fields
- `constitution/shared-principles.md` + `governance/agents/` — role charters
