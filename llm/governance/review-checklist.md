# Review Checklist

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)

## Purpose

This checklist is the single source of truth for review criteria. It helps
reviewers evaluate documentation, architecture, design, and implementation
pull requests. The project's governance delta adds domain-specific
alignment questions. Do not maintain private question lists; propose
changes to this checklist instead.

## Applicability

This checklist applies to all semantic (L1–L3) PRs. It does not apply to
L0 fast-track PRs, which are audited solely against the eligibility
conditions and path allowlist in `llm/governance/l0-fast-track.md`. Apply the
Universal and Alignment sections to every semantic PR; apply the
Documentation, Architecture, AI, and Implementation sections wherever the
PR touches that kind of work (typically Documentation/Architecture for L1,
Implementation/AI for L2, Documentation for L3).

## Universal Review

- [ ] The PR has a clear problem statement.
- [ ] The PR explains why the change matters now.
- [ ] The scope is appropriate for one PR.
- [ ] Assumptions are explicit.
- [ ] Open questions are captured.
- [ ] Cross-references are included.
- [ ] The change does not introduce undocumented durable decisions.

## Alignment Review

- [ ] Aligns with the design-authority document.
- [ ] Preserves the project's core principles (see `llm/governance/governance-delta.md`).
- [ ] Preserves evidence/provenance where relevant.
- [ ] Supports AI where useful, with guardrails.
- [ ] Maintains human-in-the-loop control where needed.
- [ ] Passes the delta's domain-specific review questions.

## Documentation Review

- [ ] Document has status.
- [ ] Document has last updated date.
- [ ] Document has purpose/scope.
- [ ] Document includes assumptions and open questions where applicable.
- [ ] Related docs are linked.
- [ ] Memory-bank update is included if project context changed.

## Architecture Review

- [ ] Durable decisions are captured as ADRs or ADR candidates.
- [ ] Tradeoffs are documented.
- [ ] Alternatives are considered.
- [ ] Data model flexibility is preserved.
- [ ] Raw source data is not discarded.
- [ ] Security/privacy implications are considered.

## AI Review

- [ ] AI output has provenance requirements.
- [ ] Recommendations are explainable.
- [ ] Confidence/uncertainty is addressed where needed.
- [ ] Human review is required for sensitive decisions.
- [ ] Evaluation criteria are identified.
- [ ] Prompt/tool behavior is scoped.

## Implementation Review

- [ ] Implementation maps to approved docs.
- [ ] Tests or validation are included.
- [ ] Error handling is reasonable.
- [ ] Security/privacy concerns are addressed.
- [ ] Documentation is updated.
- [ ] Migration/data impact is explained.

## Final Review Question

Would a future contributor understand this decision without reading the
original chat? If not, the PR is not ready.

## Cross-References

- `llm/governance/governance-levels.md` — level definitions and review requirements
- `llm/governance/l0-fast-track.md` — the L0 audit instrument (this checklist does
  not apply there)
- `llm/governance/definition-of-done.md` — completion criteria (source of truth)
