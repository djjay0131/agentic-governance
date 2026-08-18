# Prompt Patterns Library

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)
Applies to: all repos adopting agentic-governance (see each repo's `llm/governance/governance-delta.md`)

## Purpose

A composable, parameterized library of reusable prompt patterns for agent
work in adopting repositories. Each pattern names when to use it, gives a
skeleton with `<PLACEHOLDERS>`, states what must always be included, and
points to the governing policy instead of duplicating it. Pair with each
repo's `llm/governance/patterns/execution-patterns.md` (seeded from
`llm/governance/patterns/execution-patterns-template.md` — the lessons behind these
patterns).

## Scope

Prompt construction for agents working in adopting repositories: specialist
contracts, audit and reconciliation prompts, ultracode mission statements,
and administrative/bookkeeping prompts. This document does not define
governance policy; it cites it. Repo paths appear as placeholders resolved
by each repo's governance delta (`<MEMORY-BANK PATH>`, `<DESIGN-AUTHORITY
DOC>`, `<ROADMAP PATH>`, `<GOVERNANCE CHECK COMMAND>`).

---

## The Universal Bounded-Contract Skeleton

Every specialist prompt in this library is a specialization of this one
skeleton. It appears once, here; each pattern below states only its deltas.

```text
ROLE: You are the <ROLE TITLE> (Specialist <N>) for <SPRINT NAME>
  (issue #<ISSUE>), working in <REPO/BRANCH>.

OBJECTIVE: <one sentence: the outcome, not the activity>.

REQUIRED READING (before writing anything):
  <MINIMUM FILE LIST that binds this work — memory bank first, then the
  documents this deliverable must be consistent with>.

REQUIRED SKILLS/WORKFLOWS: <applicable Superpowers and Constellize
  workflows for this work type>.

FILE CONTRACT:
  - You may create/edit ONLY: <ALLOWED PATHS>.
  - You must NOT touch: <FORBIDDEN PATHS — especially other specialists'
    scopes>. If you find a defect in a file you don't own, REPORT it in
    your final report; never silently fix it.

DELIVERABLES: <exact file paths + required content>. Every file you create
  or substantially rewrite follows repo doc standards: Title / Status:
  Draft / Last updated: <DATE> / Owner: <ROLE> / Purpose / Scope /
  Assumptions / Open Questions / Cross-References. Bump "Last updated" on
  files you edit.

DEFINITION OF DONE: <the applicable checklist in
  llm/governance/definition-of-done.md for this work type and level>.

CONSTRAINTS:
  - <SPRINT-SPECIFIC SCOPE BOUNDARY — what this sprint is NOT>.
  - Do not redefine another specialist's decisions; where you depend on
    one, cite it.
  - Uncertain classification => semantic => human review (conservative
    default; see llm/governance/governance-levels.md in agentic-governance).

GIT: NEVER run git or gh mutations; read-only git/gh is allowed. The Lead
  Architect commits.

FINAL REPORT: Return <REPORT SHAPE — typically: files delivered, decisions
  made within your scope, conflicts found in others' files, open questions
  for the owner>.
```

Referenced below as **[UBC]**. The required contract elements it realizes
are defined in `llm/governance/project-operating-system.md` §Agent Assignment
Contract.

---

## Patterns

### 1. Research

- **When:** competitive, literature, or feasibility research.
- **Skeleton:** [UBC] with `ROLE = Research Specialist`; deliverable is a
  findings document, and add
  `CONSTRAINT: every claim carries a citation and a confidence level;
  distinguish VERIFIED (primary source) from CLAIMED (vendor marketing);
  downgrade findings you cannot verify`.
- **Always include:** the decision the research must inform, so the report
  ends with a recommendation, not a survey.
- **Policy pointer:** `llm/governance/definition-of-done.md` §Research Work;
  `llm/governance/templates/research-template.md`.

### 2. Implementation

- **When:** writing code against an approved blueprint or spec. Default to
  a single agent or small team — see the execution-patterns lesson on team
  sizing.
- **Skeleton:** [UBC] with `ROLE = Implementation Engineer`;
  `REQUIRED READING = <APPROVED BLUEPRINT/SPEC> + governing ADRs`; add
  `CONSTRAINT: if code would contradict an Accepted ADR, STOP and report —
  the ADR changes first or the code is wrong; tests accompany code;
  unretrofittable decisions (<LIST>) are mandatory from the first
  migration`.
- **Always include:** the definition of done
  (`llm/governance/definition-of-done.md`) and the phase gate this work must not
  cross.
- **Policy pointer:** `llm/governance/architecture-governance.md` (code is lowest in
  the authority hierarchy).

### 3. Administrative Maintenance (L0 / Steward)

- **When:** purely mechanical, non-semantic changes: memory-bank syncs,
  status flips after approved merges, link/path fixes.
- **Skeleton:** [UBC] with `ROLE = Repository Steward`; add
  `CONSTRAINT: L0 only — if ANY judgment about meaning is required, the
  change is semantic and must escalate to human review (conservative
  default); produce an Administrative Change Certification per the
  standard; list every changed line class in the certification`.
- **Always include:** the L0 eligibility conditions (cite, don't restate);
  the independent-audit requirement before any fast-track merge; the
  repo's Steward Activation Status (merge is forbidden while INACTIVE).
- **Policy pointer:** `llm/governance/l0-fast-track.md`; the Repository Steward
  charter (`plugin/agents/repository-steward.md`).

### 4. Governance Audit

- **When:** every sprint, after specialists deliver and before
  reconciliation. Non-optional — see the execution-patterns lesson on
  independent audits.
- **Skeleton:**
  ```text
  ROLE: Independent Governance Auditor for <SPRINT> (issue #<ISSUE>).
  You did NOT author any deliverable under audit and must not edit them.
  AUDIT SCOPE: <FILE LIST delivered this sprint> against <BINDING DOCS:
    governance, <DESIGN-AUTHORITY DOC>, ADRs, doc standards, sprint
    charter>.
  OUTPUT: numbered findings, each with severity (Must-fix / Should /
    Note), the exact file+location, the rule violated (cite it), and a
    proposed disposition. No fixes — findings only.
  GIT: read-only.
  ```
- **Always include:** independence (auditor ≠ author); severity triage;
  citation of the violated rule, so reconciliation is mechanical.
- **Policy pointer:** `llm/governance/review-checklist.md`,
  `llm/governance/architecture-governance.md`.

### 5. Lead Architect Reconciliation

- **When:** after the audit, to disposition findings and integrate
  specialist output into one coherent change set.
- **Skeleton:**
  ```text
  ROLE: Lead Architect for <SPRINT> (issue #<ISSUE>).
  INPUT: specialist final reports + audit findings <LIST>.
  FOR EACH FINDING: route it to the OWNER of the affected document for a
    proposed amendment (or reject with recorded rationale) BEFORE applying
    anything; apply accepted amendments; record disposition (applied /
    rejected+why / deferred+where tracked).
  THEN: resolve cross-document contradictions in favor of the authority
    hierarchy; commit completed deliverables promptly and per-scope (never
    a directory-level sweep); update memory bank; prepare ONE reviewable PR.
  GIT: you are the ONLY role that commits.
  ```
- **Always include:** owner-routing before application; per-file commits;
  the single-PR rule.
- **Policy pointer:** `llm/governance/project-operating-system.md` (core workflow),
  `llm/governance/architecture-governance.md` (authority hierarchy).

### 6. Ultracode Dynamic Workflow Missions

- **When:** broad, multi-domain, dependency-heavy sprints — new
  architecture baselines, cross-repo compatibility, governance overhauls.
  Never for L0 work; ultracode is an execution mechanism, never a
  governance bypass.
- **Canonical invocation language:**
  > Use an ultracode dynamic workflow. Construct a dependency-aware
  > orchestration plan, launch bounded specialist agents, run an
  > independent Governance Audit, reconcile through the Lead Architect,
  > and preserve progress across interruptions.
- **Skeleton:** the canonical language above, then:
  ```text
  CHARTER: issue #<ISSUE>. SCOPE: <in / out>.
  WAVES: <dependency-ordered specialist list, each a [UBC] contract>.
  HARD RULES: specialists never mutate git/gh; Lead Architect commits;
    doc standards on every file; uncertain classification => semantic =>
    human review.
  INTERRUPTION POLICY: commit completed deliverables immediately; resume
    from transcripts; no specialist output is lost to an infra stall.
  EXIT: audit reconciled, memory bank updated, ONE reviewable PR.
  ```
- **Always include:** the canonical invocation verbatim; the interruption
  policy.
- **Policy pointer:** `llm/governance/project-operating-system.md`
  §Workflow-Selection Policy and §Non-Negotiables.

### 7. PR Close-Out

- **When:** immediately after a substantive PR merges.
- **Skeleton:**
  ```text
  ROLE: Close-out agent for merged PR #<N> (read-only git/gh unless the
    human directs issue creation).
  TASKS: (1) enumerate durable decisions in the merged diff; (2) verify
    each is captured in ADR / <DESIGN-AUTHORITY DOC> / memory bank — list
    orphans; (3) propose follow-up issues for gaps and residuals;
    (4) draft memory-bank progress/activeContext updates.
  OUTPUT: coverage table (decision -> capture location), proposed issue
    list, memory-bank diff for the Lead Architect to commit.
  ```
- **Always include:** the no-orphan-decisions check; residuals explicitly
  tracked.
- **Policy pointer:** `llm/governance/architecture-governance.md` (no orphan
  decisions).

### 8. ADR Acceptance Bookkeeping

- **When:** flipping ADR statuses after a human-approved merge (an L0
  candidate under the fast-track policy).
- **Skeleton:**
  ```text
  ROLE: Repository Steward (L0). TASK: flip ADR <NNNN> Status:
    Proposed -> Accepted, recording the authorizing merge (PR #<N>,
    <DATE>); update llm/governance/adr/README.md index; touch NOTHING else in the
    ADR body — any wording change is semantic and escalates.
  OUTPUT: Administrative Change Certification listing exact lines changed.
  ```
- **Always include:** the authorizing PR reference; the status-line-only
  constraint; the certification.
- **Policy pointer:** `llm/governance/l0-fast-track.md` (status-line shape,
  certification standard); the repo's `llm/governance/adr/README.md`.

---

## Assumptions

- The [UBC] skeleton is the single source of truth for contract shape;
  patterns intentionally specify only deltas.
- Repos may add domain-specific patterns (architecture, product
  definition, platform, data architecture, cross-repo compatibility) in a
  local patterns file, following the same delta-from-[UBC] convention and
  carrying their own evidence.

## Open Questions

- Which repo-local patterns recur across enough of the portfolio to be
  promoted here (candidates: architecture work, product-definition work,
  data-architecture work, cross-repository compatibility). Promotion
  requires evidence from at least two repos.

## Cross-References

- `llm/governance/patterns/execution-patterns-template.md` — the lessons template
  behind these patterns
- `llm/governance/project-operating-system.md` — agent contract elements, workflow
  selection
- `llm/governance/governance-levels.md`, `llm/governance/l0-fast-track.md` — classification
  and the L0 lane
- `llm/governance/architecture-governance.md` — authority hierarchy,
  no-orphan-decisions
- `llm/governance/review-checklist.md`, `llm/governance/definition-of-done.md`
