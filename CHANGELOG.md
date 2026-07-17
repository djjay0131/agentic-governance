# Changelog

## 0.2.1 — 2026-07-14

Governance correction (not a policy change): makes explicit the PR-authorship
responsibility split we have consistently followed. Resolves issue #2 — the
docs described the PR workflow actor-less, which implied the repository owner
opens semantic PRs.

- **PR Responsibilities** (`docs/architecture-governance.md` §Git Workflow):
  three distinct responsibilities defined — **Author** (branch, implement,
  commit, push, open DRAFT PR, keep description current, respond to review,
  update branch, mark ready), **Reviewer** (architecture / governance /
  implementation review, approve or request changes, verify ADR compliance,
  verify invariants), **Repository Owner** (merge approved PRs, manage branch
  protection, repository administration).
- **Governance invariant** added: "Every semantic (L1–L3) change MUST exist
  as a Pull Request before review can occur. Therefore opening a draft PR is
  an author responsibility."
- **Normative PR lifecycle / state machine**: Task → Branch → Draft PR →
  Review → Fix loop → Approval → Merge, with each stage attributed to an
  actor (replaces the actor-less "Normal workflow" list).
- **Role de-conflation**: `### Project Owner / Chief Architect (human)` split
  so the human **Project Owner** is a distinct role from the AI Chief
  Architect; authoring and merging are now explicitly separate
  responsibilities. The Project Owner is named as the sole merge authority
  once, citing `docs/governance-levels.md` as the source of truth.
- Aligned wording in `docs/project-operating-system.md` (Draft PR step) and
  `docs/templates/contributing-template.md` (author opens the PR).

## 0.2.0 — 2026-07-11

Generalizes baseball-ai's "Governance 2.0" (PR #26 / ADR-0013, 2026-07-11)
into the canonical framework.

- **Governance levels (L0–L3)**: new `docs/governance-levels.md` — the
  semantic vs non-semantic test, the conservative default, the closed
  14-category L0 list, mixed-level = highest, asymmetric escalation (AI
  up-only, human down-only), level-aware merge authority.
- **L0 fast track**: new `docs/l0-fast-track.md` — twelve conditions,
  Administrative Change Certification, ordered artifact chain,
  allowlist model (fenced `l0-allowlist` block, read from `origin/main`),
  honest-gaps declaration. **Per-repo activation (owner decision):**
  steward merge authority ships INERT everywhere; each repo activates via
  its own ADR plus a human-approved activation PR. `/governance:establish`
  never activates it.
- **Repository Steward**: fourth executive persona
  (`governance/agents/repository-steward.md`) with activation gate,
  escalation conditions, absolute prohibitions, PR-as-audit-trail.
  Chief Reviewer gains the Governance Auditor duty; shared principles gain
  the steward, the qualified single-exception merge rule, and
  "a superior's direction is never authority to cross a charter
  prohibition."
- **Workflow-selection policy**: Modes 1–3 (single agent / specialist
  team / ultracode dynamic workflow) with selection signals and the
  canonical Mode 3 invocation; four Non-Negotiables ("ultracode is an
  execution mechanism, NOT a governance bypass"); issue-scoped sprint
  rhythm; Governance-2.0 agent-contract field set (retaining Required
  skills/workflows and Definition of Done).
- **Pattern libraries**: `docs/patterns/prompt-patterns.md` (Universal
  Bounded-Contract Skeleton + eight project-agnostic patterns) and
  `docs/patterns/execution-patterns-template.md` (seeded lessons with
  per-repo evidence slots).
- **Governance checks**: `governance/scripts/governance-checks.mjs` —
  parameterized port that reads each repo's delta allowlist from the base
  ref and enforces paired-diff shape constraints; honest
  enforced/not-enforced boundary in `governance/scripts/README.md`.
- **Level-aware surfaces**: definition-of-done (level → checklist
  mapping), review-checklist (L1–L3 applicability), labels
  (`gov-L0`…`gov-L3`), new PR-template template (level declaration first),
  pointer-first contributing template, delta template v0.2 fields
  (roadmap/memory-bank paths, governance check command, L0 allowlist,
  Platform Enforcement Reality, Steward Activation Status).

## 0.1.0 — 2026-07-09

- Initial release: generalized from baseball-ai's governance system
  (project-operating-system, architecture-governance, constitution,
  definition-of-done, review-checklist, branch-protection, labels,
  ADR/design/feature/research templates).
- Added the delta-file model (`docs/governance-delta-template.md`) and
  version pinning.
- Added Claude Code plugin surface: chief-architect, chief-reviewer,
  chief-product-officer personas; `/governance:establish` and
  `/governance:audit` skills.
