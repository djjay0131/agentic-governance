# Governance Levels

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)
Applies to: all repos adopting agentic-governance (see each repo's `llm/governance/governance-delta.md`)

## Purpose

This document is the single source of truth for the governance
classification model: the four levels (L0–L3), the semantic vs non-semantic
test, the conservative default, the closed L0 category list, mixed-level
classification, escalation and reclassification rules, and level-aware merge
authority. Other documents cite this one; they must not restate this policy.

The goal is to spend human review only where it changes meaning: every
change is classified before merge, human attention is reserved for changes
that alter meaning, and everything mechanical is certified, audited, and
logged instead of silently trusted.

## Scope

Classification policy for all repository changes, by humans or AI agents.
The L0 fast-track lane that classification feeds is defined in
`llm/governance/l0-fast-track.md`. Decision control (authority hierarchy, ADR process)
is defined in `llm/governance/architecture-governance.md`. Day-to-day execution is
defined in `llm/governance/project-operating-system.md`.

## The Semantic vs Non-Semantic Test

A change is **semantic** if a reasonable reviewer could believe it alters
meaning, behavior, decisions, or obligations — of the system, the project,
or the people governed by its documents.

A change is **non-semantic** only if it is mechanically verifiable as
meaning-preserving: an auditor can confirm, from the diff and already-merged
repository state alone, that nothing the project means, decides, promises,
or does has changed.

The burden of proof is on non-semantic. If verification requires judgment,
interpretation, or domain knowledge, the change is semantic.

## The Conservative Default

**Uncertain classification ⇒ semantic ⇒ human review.**

If anyone — author, steward, or auditor — is unsure which level a change
belongs to, or unsure whether it is semantic, it is treated as semantic and
takes the lowest plausible semantic level (L1, L2, or L3, whichever fits).
Misclassifying semantic work as L0 is a governance failure; escalating an
administrative change to human review is never a failure.

## The Four Levels

Every change to an adopting repository is classified at exactly one
governance level before it is merged. The level determines who must review
it and who may merge it.

| Level | Name | Nature | Review | Merge authority |
|---|---|---|---|---|
| L0 | Administrative | Non-semantic maintenance | Steward certification + independent Governance Auditor audit | Repository Steward, after certification and audit pass — only where the repo has activated the fast track (`llm/governance/l0-fast-track.md` §Per-Repo Activation); otherwise the human owner |
| L1 | Governance & Architecture | Semantic | Human review required | Human owner only |
| L2 | Implementation | Semantic | Human review required | Human owner only |
| L3 | Product | Semantic | Human review required | Human owner only |

### L0 — Administrative

Non-semantic maintenance that **cannot** change system meaning, behavior,
architecture, requirements, business rules, or intent. L0 work records
reality that was already approved elsewhere; it never creates new reality.

L0 consists of exactly these fourteen categories:

1. Memory-bank synchronization to already-merged, already-approved work
2. Roadmap progress updates (checkbox/status bookkeeping against merged
   reality)
3. Progress/status bookkeeping
4. ADR status flips **only** after the underlying decision was already
   approved in a merged PR, citing that PR
5. ADR index regeneration
6. Completed-issue closure (acceptance criteria verifiably met by merged
   work)
7. Archive maintenance (moving completed artifacts to designated archive
   locations)
8. Broken-link repair (path corrections only — never substituting which
   document is referenced)
9. Cross-reference maintenance
10. Formatting-only changes
11. Typo corrections that cannot alter meaning — defined narrowly:
    spelling/punctuation fixes whose before-and-after readings are
    indistinguishable in meaning. **Never** inside normative sentences of
    ADRs, business rules, or requirements; when in doubt, it is NOT a typo
    fix and the change is semantic.
12. Generated indexes
13. Branch cleanup (deleting merged branches)
14. Stale status-language cleanup ("in progress" on verifiably finished
    work, dates that no longer hold)

Anything not on this list is not L0. A change is only L0 if **every part**
of its diff is L0. L0 changes are eligible for Repository Steward fast-track
merge only when all conditions of the L0 Fast-Track Policy
(`llm/governance/l0-fast-track.md`) pass **and** the repo has activated the fast
track; an L0 change that fails any fast-track condition — or lands in a repo
where the fast track is inactive — still requires human review.

### L1 — Governance & Architecture

Semantic changes to how the project decides and designs. Includes: new or
modified ADR content, design-authority-document changes, architecture
documents, domain-model changes, governance-policy changes (including this
document and the repo's governance delta), and architecture roadmap
decisions.

### L2 — Implementation

Semantic changes to what the system does. Includes: production code,
schemas, migrations, APIs, authentication/authorization, infrastructure,
deployment, CI/CD behavior, executable configuration, and security controls.

### L3 — Product

Semantic changes to what the product is and promises. Includes:
requirements, MVP scope, personas, business rules, user-visible workflow
behavior, privacy/consent policy, and prioritization.

## Mixed-Level Changes

A PR that touches multiple levels is classified at the **highest** level it
touches (L3 > L2 > L1 > L0). A single L1 sentence in an otherwise
administrative PR makes the whole PR L1. Authors should split administrative
housekeeping out of semantic PRs so the L0 lane stays usable.

## Review and Audit Requirements per Level

- **L0**: The Repository Steward certifies the change against the
  Administrative Change Certification standard (`llm/governance/l0-fast-track.md`).
  The Governance Auditor independently audits every certified L0 PR before
  merge. The full audit-trail requirements live in the Repository Steward
  charter (`plugin/agents/repository-steward.md`).
- **L1–L3**: Human review by the project owner is mandatory. Reviewers use
  `llm/governance/review-checklist.md` (the single source of truth for review
  criteria). ADR-bearing L1 changes additionally follow the ADR process in
  `llm/governance/architecture-governance.md`. All semantic changes must meet the
  applicable Definition of Done (`llm/governance/definition-of-done.md`).

## Escalation and Reclassification Rules

Escalation is asymmetric: AI roles may only move classification **up**;
only the human owner may move it **down**.

- Any participant (author, steward, auditor, reviewer) may escalate any
  change to a higher level at any time before merge; escalation needs no
  justification and cannot be overruled downward by an AI role.
- Only the human owner may reclassify a change downward (e.g., L1 → L0),
  and only by explicit statement on the PR or issue.
- The steward must escalate — refuse to certify and route to human review —
  whenever a change fails any part of the L0 definition or the fast-track
  conditions, or whenever classification is uncertain (conservative
  default).
- The Governance Auditor's rejection of an L0 certification is final for
  the fast-track lane: the PR moves to human review; the steward may not
  re-certify the same diff.
- Disagreements about classification are resolved by the human owner; until
  resolved, the change is treated as semantic.

## Level-Aware Merge Authority

- **L1–L3 (all semantic work):** the human project owner is the sole merge
  authority. No AI role may merge semantic work under any execution mode or
  team size.
- **L0:** the Repository Steward may merge only certified, independently
  audited, checks-passing L0 PRs, and only in repos whose governance delta
  shows `Steward Activation Status: ACTIVE` (see `llm/governance/l0-fast-track.md`
  §Per-Repo Activation). Everywhere else, L0 PRs are merged by the human
  owner (the certification and audit artifacts remain valuable as review
  accelerators).

Changing an approved decision is always semantic (L1, L2, or L3 per this
model) — never L0, regardless of how small the diff is. Synchronizing an
artifact to reflect a decision already approved in a merged PR is L0
bookkeeping.

## Assumptions

- Each adopting repo declares its design-authority document, memory-bank
  path, roadmap path, governance check command, L0 path allowlist, platform
  enforcement reality, and steward activation status in its
  `llm/governance/governance-delta.md` (fields defined in
  `llm/governance/governance-delta-template.md`).
- Where a repo's platform cannot enforce role separation (shared tokens, no
  branch protection), separation is procedural and artifactual — declared
  honestly in the delta's Platform Enforcement Reality section.

## Open Questions

- None currently. Level-boundary disputes discovered by adopting repos
  should be raised as issues against this repo, not resolved by local
  redefinition.

## Cross-References

- `llm/governance/l0-fast-track.md` — the L0 fast-track policy (conditions,
  certification, allowlist, activation)
- `llm/governance/architecture-governance.md` — decision control, ADR process,
  authority hierarchy
- `llm/governance/project-operating-system.md` — execution, workflow selection
- `llm/governance/definition-of-done.md` — level → completion-checklist mapping
- `llm/governance/review-checklist.md` — L1–L3 review instrument
- `llm/governance/labels.md` — `gov-L0`…`gov-L3` labels
- `llm/constitution/shared-principles.md` — role principles, merge rule
- `plugin/agents/repository-steward.md` — Repository Steward charter
