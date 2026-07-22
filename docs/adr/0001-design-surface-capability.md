# ADR-0001: Design Surface Capability

Status: Accepted
Date: 2026-07-22

## Context

agentic-governance repos accumulate design knowledge across ADRs, memory
banks, and specs, but have no mechanism to project that knowledge into a
published, browsable "design surface" (e.g. a Pages site) without inviting a
new, hand-authored, potentially-stale source of truth. Any such surface must
never outrun or contradict the authoritative sources it is meant to reflect.
This ADR also bootstraps agentic-governance's own ADR system: prior to this
change the repo had no `docs/adr/`.

## Decision

Add an opt-in, default-**DISABLED** Design Surface capability:

- A zero-dependency Node generator, `governance/scripts/design-surface.mjs`,
  reads a repo's `## Design Surface` governance-delta declaration and emits
  deterministic **Tier-1** artifacts (ADR index, taxonomy inclusion, module
  map, status) plus a content-hash manifest.
- A companion audit, `auditDesignSurface`, wired into `governance-checks.mjs`
  behind a non-blocking `--design-surface` flag, compares the published
  manifest against current sources and a Tier-2 narrative's stamped input
  hash, reporting `missing-source` / `tier-1-out-of-date` / `stale-narrative`
  findings advisorily (exit 0 always).
- A governance skill, `/governance:publish-design-surface`
  (`governance/skills/publish-design-surface/SKILL.md`), regenerates Tier 1,
  synthesizes a cited Tier-2 narrative, stamps its input hash, and opens a
  **draft PR** that the AI never merges.
- Repos opt in by adding the `## Design Surface` block (ships `Status:
  DISABLED` in `docs/governance-delta-template.md`) and enabling it; repos
  that do not declare or enable the block are entirely unaffected.

## Rationale

The capability must be additive and safe by default for the ~dozen repos
already on agentic-governance: opt-in + DISABLED-by-default means adoption is
a deliberate per-repo decision, never a silent behavior change. Splitting
generation into a mechanical tier and an LLM-synthesized tier lets the
mechanical facts publish continuously (cheap, deterministic, safe) while
keeping the higher-risk narrative under human review — matching the
project's existing human-merge-gate pattern for AI-authored content
(`constitution/shared-principles.md`).

## The projection rule (binding invariant)

Every element on the design surface must be attributable to an authoritative
source. Tier 1 is mechanically derived — it cannot fabricate because it only
reads and hashes what already exists. Tier 2 cites its sources inline. Two
projection-rule guarantees are provided by the generator itself, not left to
convention:

1. **Never fabricate.** A missing declared source (taxonomy artifact, ADR
   dir, memory bank) produces a visible gap marker in the generated output
   *and* a non-zero exit / audit finding — never silent, never invented. See
   `computeManifest`'s `gaps` accumulator and the `missing-source` finding
   kind in `auditDesignSurface`.
2. **Drift is detected, not assumed away.** The manifest's
   `narrative_inputs_hash` is derived from the three Tier-1 source hashes
   (`taxonomy_hash`, `adr_set_hash`, `memory_bank_rev`). The Tier-2 narrative
   stamps that hash into its own front-matter when synthesized; the audit
   recomputes the current hash and flags `stale-narrative` the moment any
   underlying source changes after the narrative was written — the actual
   mechanism that keeps the surface honest over time.

## The two-tier split (Tier-1 auto-published / Tier-2 review-gated)

| | Tier 1 | Tier 2 |
| --- | --- | --- |
| Content | ADR index, taxonomy inclusion, module map, memory-bank/governance status, manifest | "What we built and why" narrative |
| Producer | `design-surface.mjs` generator (deterministic) | `/governance:publish-design-surface` skill (LLM) |
| Publish path | Auto-published every build/CI run, no review | Always a draft PR; a human merges |
| Fabrication risk | None — mechanical read + hash of existing sources | Bounded by mandatory inline citations; an uncitable claim is a recorded gap, not written |
| AI merge authority | N/A (no PR involved) | **Never** — consistent with `constitution/shared-principles.md` |

This mirrors the project's existing pattern of auto-mergeable, mechanically
verifiable L0 changes vs. human-reviewed substantive changes, applied to the
design-surface domain specifically.

## Alternatives Considered

### Alternative 1: Single-tier, fully LLM-generated design surface

One LLM pass reads sources and writes the entire surface, gated by a single
PR review. Rejected: conflates cheap, always-safe mechanical facts (ADR
status, module layout) with the higher-risk narrative, forcing every routine
refresh through human review and creating pressure to rubber-stamp — eroding
the review gate's value where it matters most (the narrative's claims).

### Alternative 2: Parse taxonomy YAML directly in the generator

Have the generator load and render each repo's taxonomy YAML itself.
Rejected: violates the zero-runtime-dependency constraint (no stdlib YAML
parser exists in Node, and adding a third-party one is out of scope for this
capability), and duplicates rendering logic repos already own (e.g. agentic-kg
already renders `topic-taxonomy.md` from `seed_taxonomy.yml`).

## The taxonomy refinement (zero-dep, spec §4.1)

The generator does **not** parse arbitrary taxonomy YAML — no stdlib YAML
parser exists in Node and none may be added under the zero-runtime-dependency
constraint. Instead the delta declares two paths:

- `Taxonomy rendered:` — the repo's own **pre-rendered** taxonomy artifact
  (e.g. `topic-taxonomy.md`, already produced by the repo's own code from its
  taxonomy source).
- `Taxonomy source:` — the **raw** taxonomy file (e.g. `seed_taxonomy.yml`),
  used only for content hashing (`taxonomy_hash` in the manifest), never
  parsed or rendered by `design-surface.mjs`.

`buildTaxonomy` includes the rendered artifact verbatim (with a
generated-from header noting both paths) and records the source file's SHA-256
in the manifest for drift detection. Only `Taxonomy rendered: none` (an absent
rendered artifact) omits the taxonomy section entirely — taxonomy is
domain-specific and not every adopting repo has one. `Taxonomy source: none`
merely means no source hash is recorded (the header shows `source: n/a`).

## Consequences

### Positive

- Adopting repos get a continuously fresh, mechanically-verified design
  surface with zero risk of the Tier-1 facts drifting silently out of sync.
- The narrative stays cited and human-reviewed, without blocking routine
  Tier-1 refreshes on that review.
- Zero new runtime dependencies; the generator, audit, and skill are all
  plain Node / Markdown.
- Non-adopting repos are provably unaffected (default DISABLED; the delta
  block, if absent or DISABLED, short-circuits `main()` and the audit).

### Negative / Tradeoffs

- Two artifacts (rendered taxonomy + raw source) must both be declared and
  kept in sync by the adopting repo's own tooling; the generator cannot
  detect a rendered artifact that has silently fallen out of sync with its
  source beyond the source's content hash changing.
- The `--design-surface` audit is advisory only (always exits 0); a repo can
  ignore `stale-narrative` findings indefinitely without a hard CI gate.

### Risks

- A repo could enable the capability without wiring the CI template, so
  Tier 1 is generated locally but never published — mitigated by the
  `tier-1-out-of-date` finding once a narrative or downstream consumer
  expects a published manifest.
- Declaring `Taxonomy rendered:` without keeping the source hash meaningful
  (e.g. pointing it at an unrelated file) would silently pass the hash check
  while not reflecting real drift; this is a documentation/adoption risk, not
  a generator defect.

## Impacted Areas

- [ ] Product
- [ ] Domain model
- [ ] Data architecture
- [ ] AI architecture
- [x] Domain-specific systems (see governance delta)
- [ ] Integrations
- [ ] UX
- [ ] Security/privacy
- [x] Implementation
- [x] Documentation

## Related Documents

- `docs/design-surface.md` (canonical capability doc)
- `docs/superpowers/specs/2026-07-21-design-surface-capability-design.md` (approved spec)
- `docs/superpowers/plans/2026-07-21-design-surface-capability.md` (implementation plan)
- `docs/governance-delta-template.md` (`## Design Surface` block)
- `governance/scripts/design-surface.mjs`, `governance/scripts/governance-checks.mjs`
- `governance/skills/publish-design-surface/SKILL.md`

## Related Issues / PRs

- Implementation branch: `feature/design-surface-capability`

## Supersedes

None.

## Superseded By

None.
