# Changelog

## 0.3.0 — 2026-07-22

Adds the **Design Surface** capability: an opt-in, default-disabled way for
an adopting repo to publish a design view where every element is
attributable to an authoritative source (the projection rule) — a two-tier
generate/publish/verify model, never a new hand-authored source of truth.

- **Generator** (`governance/scripts/design-surface.mjs`): zero-dependency
  Node ES module, plain `node:` imports only, tested with the built-in
  `node:test` runner (no `npm install`). Parses the delta's
  `## Design Surface` block and deterministically emits Tier-1 artifacts —
  ADR index, taxonomy (included from the repo's own pre-rendered artifact
  plus a source-content hash, never re-rendered/parsed as YAML),
  module-map/architecture tree, status page — plus a content-hash manifest.
  Never fabricates: a missing declared source produces a visible gap marker
  and a non-zero exit, not silence.
- **`--design-surface` audit**: a non-blocking, advisory mode wired into
  `governance/scripts/governance-checks.mjs` that recomputes current source
  hashes and reports `missing-source`, `tier-1-out-of-date`, and
  `stale-narrative` findings — `SKIP` when the capability is undeclared or
  disabled, `PASS`/`WARN` otherwise; always exits 0.
- **`publish-design-surface` skill** (`governance/skills/publish-design-surface/SKILL.md`):
  Tier-2, review-gated. Regenerates Tier 1, synthesizes a cited "what we
  built and why" narrative from ADRs/memory-bank/spec, stamps its input
  hash for later drift detection, and opens a **draft PR** — the AI never
  merges it; a human merge is the publish gate.
- **Delta block**: `## Design Surface` added to
  `docs/governance-delta-template.md` shipping `Status: DISABLED` — repos
  that don't declare the block, or leave it disabled, are entirely
  unaffected (no artifacts, no findings, no version-pin move).
  `/governance:establish` offers to scaffold it; `/governance:audit` runs
  the `--design-surface` check and reports currency.
- **Reference CI template** (`docs/templates/design-surface-ci-template.yml`):
  copy-paste workflow that fetches full history, runs the generator, and
  publishes Tier 1 only — Tier 2 stays PR-gated, untouched by CI.
- **Canonical doc + ADR-0001**: `docs/design-surface.md` describes the two
  tiers and the projection rule; `docs/adr/0001-design-surface-capability.md`
  records the decision (this also bootstraps agentic-governance's own
  `docs/adr/` system, previously repo-local to adopters only).

**Adoption is opt-in.** The Design Surface block ships DISABLED by default,
and the delta-pin move to `v0.3` is likewise opt-in: only repos that
actively adopt the capability need bump their governance version pin to
`0.3.0`; repos that don't adopt it stay on their current pin unaffected.

## 0.2.0 — 2026-07-11

Generalizes a prior internal project's "Governance 2.0" into the canonical
framework.

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

- Initial release: generalized from a prior internal project's governance system
  (project-operating-system, architecture-governance, constitution,
  definition-of-done, review-checklist, branch-protection, labels,
  ADR/design/feature/research templates).
- Added the delta-file model (`docs/governance-delta-template.md`) and
  version pinning.
- Added Claude Code plugin surface: chief-architect, chief-reviewer,
  chief-product-officer personas; `/governance:establish` and
  `/governance:audit` skills.
