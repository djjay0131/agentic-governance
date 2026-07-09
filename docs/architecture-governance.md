# Architecture Governance

Status: Active
Last updated: 2026-07-09
Applies to: all repos adopting agentic-governance (see each repo's `docs/governance-delta.md`)

## Purpose

This document defines how design and architecture decisions are made,
reviewed, documented, and changed. It applies to human contributors and AI
agents.

The goal is to prevent design drift, preserve decision history, and keep
each project aligned with its foundational vision (declared in the project's
governance delta).

## Core Governance Rule

No meaningful project decision should live only in chat.

Every durable decision must be captured in at least one of:

- Memory bank
- The project's design-authority document (FDS or equivalent)
- Architecture Decision Record
- Detailed design document
- GitHub issue or pull request discussion

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
- Merge pull requests.
- Resolve conflicts between agents or documents.
- Set milestone priority.
- Protect the project vision (per the delta).

### Chief Architect (AI executive role)

Responsible for architectural coherence. See
`constitution/chief-architect.md`.

### Chief Reviewer (AI executive role)

Responsible for review quality and decision integrity. See
`constitution/chief-reviewer.md`.

### Chief Product Officer (AI executive role)

Responsible for user value and MVP discipline. See
`constitution/chief-product-officer.md`.

### Specialist Agents / Contributors

Specialists own scoped workstreams. Prefer Constellize personas
(system-architects, data-specialists, qa-engineers, product-managers, ...)
for specialist analysis. Responsibilities:

- Work only in assigned scope unless explicitly approved.
- Produce Markdown design artifacts.
- Document assumptions and open questions.
- Identify ADR candidates.
- Use branches and pull requests.

## Git Workflow

Direct commits to `main` are not allowed except for emergency repository
repair.

Normal workflow:

1. Create or select GitHub issue.
2. Create branch from `main`.
3. Make scoped changes.
4. Open draft PR.
5. Review design and files changed.
6. Update memory bank and ADRs if needed.
7. Mark PR ready for review.
8. Merge after approval.

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
```

## Pull Request Requirements

Every PR should include:

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
- Review checklist

PRs should be opened as drafts until the author believes the work is
reviewable.

## Pull Request Review Checklist

Reviewers should check:

- Does this align with the design-authority document?
- Does this preserve the project's core principles (per the delta)?
- Does it treat evidence and provenance correctly?
- Does it identify AI opportunities and guardrails?
- Does it create a durable decision requiring an ADR?
- Does it require a memory-bank update?
- Does it introduce contradictions with existing docs?
- Is the scope appropriate for one PR?

The project delta may add domain-specific review questions.

## ADR Process

Use ADRs for durable decisions that affect product direction, architecture,
data model, AI behavior, integration strategy, security, or implementation
structure.

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

The memory bank is the project context source for AI sessions.

Update it when:

- Product direction changes.
- Architecture direction changes.
- MVP scope changes.
- Major open questions are answered.
- A milestone is completed.
- A key decision is made.

Do not treat detailed docs as a replacement for memory-bank updates. The
memory bank should summarize current truth and point to detailed docs.

## Documentation Standards

Every major Markdown document should include:

- Title
- Status
- Last updated date
- Purpose
- Scope
- Assumptions
- Open questions
- Cross-references

Recommended statuses: Draft, Review, Approved, Implemented, Superseded.

## AI Agent Operating Rules

AI agents must:

- Read the design-authority document and relevant memory-bank files before
  design work.
- Read the project's `docs/governance-delta.md`.
- Work on a branch.
- Open a PR instead of committing directly to `main`.
- Stay inside assigned scope.
- Document assumptions and uncertainty.
- Avoid making undocumented durable decisions.
- Identify needed ADRs.
- Preserve raw/evidence/source-data principles.
- Avoid implementation before design acceptance.

## Definition of Done

See `definition-of-done.md` for per-work-type completion criteria.

## Change Management

To change an approved decision:

1. Open an issue or PR explaining the proposed change.
2. Identify impacted documents and ADRs.
3. Update the source of authority first.
4. Update downstream docs/code second.
5. Mark superseded ADRs clearly.

## Governance Principle

Speed is useful, but architectural memory is more valuable. Projects should
move quickly without losing the reasoning behind why the system exists and
how it is meant to evolve.
