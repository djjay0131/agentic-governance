# Project Operating System

Status: Active
Last updated: 2026-07-09
Applies to: all repos adopting agentic-governance (see each repo's `docs/governance-delta.md`)

## Purpose

This document explains how an adopting project operates day to day. The
project's design-authority document (named in its governance delta — e.g. a
Foundational Design Specification or approved design spec) defines *what* is
being built. Architecture Governance defines *how decisions are controlled*.
This document defines *how people and AI agents execute work*.

## Operating Model

Each project runs like a small AI-assisted product and engineering
organization.

The project owner acts as Chief Architect authority and final decision
maker. AI agents act as executive role-holders (see `constitution/`) and
specialist contributors (Constellize personas). All work is coordinated
through GitHub issues, branches, pull requests, Markdown documents, ADRs,
and the memory bank.

## Core Workflow

```text
Roadmap -> Issue -> Branch -> Draft PR -> Review -> Revise -> Approve -> Merge -> Memory/ADR update
```

No work should skip the review path unless explicitly authorized for
emergency repair.

## Work Item Lifecycle

### 1. Roadmap Selection

Select work from the project roadmap or an approved issue.

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

Open a draft PR early. The PR becomes the collaboration space.

### 6. Review

Review for alignment, completeness, tradeoffs, risks, memory updates, and
ADR needs.

### 7. Approval and Merge

The project owner approves and merges. Post-merge, local clones should pull
from `main`.

## Weekly Operating Rhythm

Suggested cadence:

### Planning

- Review roadmap.
- Pick highest-value workstreams.
- Assign agents.
- Confirm dependencies.

### Production

- Agents work on branches.
- Draft PRs are opened early.
- Questions are captured in PRs or issues.

### Architecture Review

- Compare active PRs against the design-authority document and ADRs.
- Resolve conflicts.
- Decide which changes require ADRs.

### Merge / Memory Update

- Merge approved PRs.
- Update memory bank.
- Update roadmap status.
- Create follow-up issues.

## Agent Assignment Contract

Every AI agent should receive a bounded contract:

```text
Role:
Scope:
Read first:
Required skills/workflows:
Allowed files/directories:
Do not modify:
Deliverables:
Definition of Done:
Required sections:
Open questions to answer:
ADR candidates to identify:
Branch name:
PR title:
```

The `Required skills/workflows` section must identify applicable Superpowers
and Constellize workflows.

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

### `llm/memory_bank/` (or `llm/memory-bank/`)

Current project context for AI continuity. The delta file records which
layout the project uses.

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
