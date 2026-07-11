# Definition of Done

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)

## Purpose

This document is the single source of truth for when work is considered
complete for adopting projects. Projects may add work types in their
governance delta.

## Which Checklist Applies at Which Governance Level

Every change carries a governance level (`docs/governance-levels.md`):

- **L0 — Administrative:** this document does not apply. L0 completion is
  the Administrative Change Certification plus independent audit, per the
  L0 Fast-Track Policy (`docs/l0-fast-track.md`).
- **L1 — Governance & Architecture:** Design Work, Research Work, and/or
  ADR Work below, as applicable.
- **L2 — Implementation:** Implementation Work below, plus AI Feature Work
  and Integration Work where applicable.
- **L3 — Product:** Design Work below (product design docs), plus Research
  Work where applicable.

Merge Readiness applies to all semantic (L1–L3) PRs.

## Design Work

Design work is done when:

- [ ] It is captured in the repository as Markdown.
- [ ] The document has status and last updated date.
- [ ] Purpose, scope, assumptions, and open questions are included.
- [ ] It aligns with the project's design-authority document.
- [ ] Cross-references are included.
- [ ] ADR candidates are identified.
- [ ] Memory-bank updates are included if project context changed.
- [ ] The PR has been reviewed.

## Research Work

Research work is done when:

- [ ] The research question is clear.
- [ ] Sources are listed.
- [ ] Findings are summarized.
- [ ] Recommendation is explicit.
- [ ] Risks and unknowns are listed.
- [ ] Follow-up issues are created or proposed.

## ADR Work

ADR work is done when:

- [ ] Context is clear.
- [ ] Decision is explicit.
- [ ] Alternatives are documented.
- [ ] Consequences are documented.
- [ ] Status is set.
- [ ] Related docs/PRs are linked.

## Implementation Work

Implementation work is done when:

- [ ] There is an approved issue or spec.
- [ ] Relevant design docs/ADRs exist.
- [ ] Code is reviewed through PR.
- [ ] Tests or validation steps are included.
- [ ] Documentation is updated.
- [ ] Data/security/privacy impacts are documented.
- [ ] Memory bank is updated if the project state changed.

## AI Feature Work

AI feature work is done when:

- [ ] AI behavior is specified.
- [ ] Inputs and outputs are defined.
- [ ] Evidence/provenance is tracked.
- [ ] Human review requirements are defined.
- [ ] Evaluation method is defined.
- [ ] Safety/guardrails are documented.

## Integration Work

Integration work is done when:

- [ ] Access method is documented.
- [ ] Terms/API/export constraints are noted.
- [ ] Raw payload storage is defined.
- [ ] Normalized mapping is defined.
- [ ] Failure modes are documented.
- [ ] Manual fallback is considered.

## Merge Readiness

A PR is ready to merge when:

- [ ] It is no longer draft.
- [ ] Review comments are resolved.
- [ ] Required docs are updated.
- [ ] ADR/memory-bank needs are addressed.
- [ ] Project owner approves (L1–L3); L0 PRs merge via the steward fast
      track where activated (`docs/l0-fast-track.md`), otherwise by the
      project owner.

## Cross-References

- `docs/governance-levels.md` — classification model
- `docs/l0-fast-track.md` — L0 completion (certification + audit)
- `docs/review-checklist.md` — review criteria (source of truth)
