# Changelog

## 0.3.0 — 2026-08-18

Corrects the repository architecture: `llm/` is the control plane, `docs/`
is the data plane. Breaking — every canonical path moved.

- **The two-plane rule**: new `llm/governance/adr/0001-llm-control-plane-docs-data-plane.md`
  and a rewritten `llm/governance/project-operating-system.md` §Repository
  Areas — the control/data split, the pre-write decision procedure, and a
  closed exemption class for tool-contract paths (`.github/`,
  `.claude-plugin/`, the plugin payload root, root-convention files).
  §Repository Areas was previously the package's only statement of layout,
  and it named `docs/` as the home for design, architecture, product and
  roadmap documents — the inverse of the intended architecture.
- **Control-plane migration**: role charters to `llm/constitution/`, policy
  docs, templates and patterns to `llm/governance/`, ADRs to
  `llm/governance/adr/`, design specs to `llm/specs/`. `docs/` now holds
  only a README naming what belongs there.
- **Plugin payload renamed** `governance/` → `plugin/`, removing the
  collision with `llm/governance/`. The plugin's `name` is unchanged, so
  `/governance:establish` and `/governance:audit` still work; the
  marketplace `source` moved to `./plugin`, so installs need one re-add.
- **Repository layout is declared, not hardcoded**: new `## Repository
  Layout` block in `llm/governance/governance-delta-template.md`. The
  canon prescribes the shape; each repo binds the paths.
- **The routing rule propagates**: `/governance:establish` now installs it
  into each onboarded repo's `CLAUDE.md` and `AGENTS.md`. Its absence was
  the drift vector — onboarding installed `docs/`-shaped machinery and
  nothing opposing a tool's default output path.
- **The delta template no longer ratifies a vendor default.** Its
  Design-Authority Document field cited `docs/superpowers/specs/…` as the
  worked example, which promoted a third-party tool's hardcoded output path
  to rank-2 design authority in every adopting repo.
- **`/governance:audit` stops scoring the drift as compliance**: checks
  retargeted at declared paths, plus findings for source-of-truth content
  under the artifacts dir and for undeclared layout paths.
- **`governance-checks.mjs`**: new `--layout` check; reads paths from the
  delta's layout block (CLI flag > delta > default); `plugin/**` added to
  the hard denies (`scripts/**` only ever matched a top-level `scripts/`,
  so the check script was never denied in its own repo); fixed an infinite
  loop in `globToRegExp` on an unterminated `[`, and a temporal-dead-zone
  crash in layout parsing that would have affected every adopting repo.
- **L0 allowlist de-duplicated.** Two copies existed and had diverged;
  `llm/governance/l0-fast-track.md` is now the declared source and the
  delta template's block is a labelled instance, so drift is detectable.

### Migration for repos pinned at v0.2

Pins are by commit SHA, so nothing breaks until a repo bumps. To upgrade:
move `docs/governance-delta.md` → the declared governance dir and
`docs/adr/` → the declared ADR dir, add the `## Repository Layout` block,
re-express the L0 allowlist against declared paths, install the routing
rule into `CLAUDE.md`/`AGENTS.md`, and repoint the check command at
`plugin/scripts/governance-checks.mjs`. Verify cross-references by grep:
`governance-links` strips inline code spans, so it cannot see them.

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
