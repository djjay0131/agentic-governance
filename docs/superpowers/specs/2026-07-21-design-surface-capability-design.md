# Design Surface Capability — Design

Status: Draft
Date: 2026-07-21
Target: agentic-governance v0.3 (new, opt-in capability)
Issue: #7

## 1. Context and motivation

In `agentic-kg` (and `baseball-ai`) we produced two published artifacts and
pushed them to GitHub Pages:

1. A **domain taxonomy** — in `agentic-kg`, `docs/reference/topic-taxonomy.md`,
   rendered from `seed_taxonomy.yml` (a derived artifact, not hand-written).
2. A **post-build design document** — a "what we built and why" narrative,
   produced **as an ad-hoc Claude task** and published.

The second is valuable but not repeatable: a human hand-drives Claude each
time, output is inconsistent, and it drifts from the sources as the system
evolves. We want it **automated, repeatable, and governed** — without letting
it become a parallel, hand-maintained source of truth that goes stale (the
exact failure mode governance and Constellize exist to prevent).

This spec defines a new **Design Surface** capability for the agentic-governance
package that turns the ad-hoc task into a governed, repeatable pipeline:
**generate the surface from authoritative sources → publish → verify currency.**

## 2. Goals and non-goals

**Goals**
- A published, always-attributable rendering of a repo's design, assembled
  from its authoritative sources.
- Automate what was an ad-hoc Claude task, as a governance skill.
- Keep agent-authored public prose behind a human review gate.
- Detect when the published surface is stale relative to its sources.
- Opt-in, per-repo, consistent with how the package already ships capabilities.

**Non-goals**
- Governance does **not** become a static-site generator or own each repo's
  Pages plumbing. It ships a reference workflow; repos adapt it.
- No new source of design authority. The surface is a *view*, ranked below
  everything in the design-authority hierarchy.
- Not mandatory. Repos without the capability declared are unaffected.

## 3. The model: a two-tier Design Surface

A **Design Surface** is a published rendering of a repo's design where **every
element is attributable to an authoritative source**. It splits by provenance:

### Tier 1 — Derived facts (deterministic, auto-published every build)
Mechanically extracted from structured sources, regenerated on every build,
published without review because they are facts:
- **Taxonomy / ontology** — rendered from the declared taxonomy source (e.g.
  `seed_taxonomy.yml`), carrying its content hash. Omitted when a repo declares
  no taxonomy (domain-specific).
- **ADR index** — id / title / status / supersedes, from the declared ADR dir.
- **Architecture / module map** — from the package/code layout.
- **Memory-bank + governance status** — current memory-bank files and
  revisions, governance version pin, delta summary, level labels.

### Tier 2 — Synthesized narrative (LLM, review-gated)
The human-readable "what was built and why" essay, generated **from** Tier-1
facts + ADRs + memory bank + spec/FDS, with **inline citations back to each
source**. Published only after a human merges its PR.

### The projection rule (core invariant)
Every element of the surface is attributable to an authoritative source: Tier 1
is mechanically derived; Tier 2 cites. Nothing on the surface is a new,
hand-authored source of truth. A Tier-2 claim with no source anchor is a
generation failure ("cite or omit"). This is what keeps the surface a view and
preserves the design-authority hierarchy.

## 4. Components (added to agentic-governance)

### 4.1 Skill `/governance:publish-design-surface`
`governance/skills/publish-design-surface/SKILL.md`. Run by an executive
persona (chief-architect). Steps:
1. Read the repo's delta `## Design Surface` declaration (sources, output dir,
   Pages mechanism).
2. Run the deterministic generator (4.2) to refresh Tier-1 artifacts + manifest.
3. Synthesize the Tier-2 narrative from Tier-1 + ADRs + memory bank + spec, with
   inline citations; self-check that every claim carries a source anchor.
4. Open a **draft PR** with the refreshed surface, declaring the governance
   level; mark ready only after the citation self-check passes; **never merge**.
5. If a declared source is missing, record a visible gap — never fabricate.

### 4.2 Deterministic generator `governance/scripts/design-surface.mjs`
Plain Node, zero dependencies (like `governance-checks.mjs`). Emits Tier-1
artifacts to the declared output dir and writes a **manifest**
(`design-surface-manifest.json`): `taxonomy_hash`, `adr_set_hash`,
`memory_bank_rev`, `narrative_inputs_hash`, `generated_at`,
`governance_version`. Runs in per-repo CI on every build; its output
auto-publishes. Does not touch Tier-2.

### 4.3 Drift/audit check
Extends `governance:audit` and `governance-checks.mjs` with a
`--design-surface` mode. Compares the published manifest against current
sources and the Tier-2 narrative's stamped `narrative_inputs_hash`. Reports
findings (never auto-fixes). Optionally a non-blocking CI warning.

### 4.4 Delta capability declaration
A `## Design Surface` block added to `docs/governance-delta-template.md`,
capability-declared like temporal support; default DISABLED. See §6.

### 4.5 Reference CI workflow template
`docs/templates/design-surface-ci-template.yml`: runs the generator and deploys
Tier-1 to Pages on push to `main`; leaves Tier-2 to the PR flow. Repos adapt it
to their Pages mechanism (Jekyll / mkdocs / actions-pages).

### 4.6 Canonical doc + ADR
`docs/design-surface.md` (the capability, the two tiers, the projection rule,
rollout) and an ADR recording the decision and the projection rule.

## 5. Data flow

- **Continuous (Tier 1):** push to `main` → CI runs `design-surface.mjs` →
  Tier-1 artifacts + manifest regenerated → deployed to Pages. No human.
- **On-demand (Tier 2):** chief-architect runs `/governance:publish-design-surface`
  → regenerates the cited narrative → draft PR → human review → merge → Pages
  picks it up.
- **Verify:** `governance:audit` and CI `governance-checks --design-surface`
  compare the published manifest vs current sources.

### Drift mechanics
Each Tier-1 generation stamps the manifest. The Tier-2 narrative records, in its
front-matter, the `narrative_inputs_hash` it was synthesized from. The audit
catches the case that matters: **if ADRs / taxonomy / memory-bank changed since
the narrative was last generated, the stamped hash no longer matches the current
Tier-1 inputs → the narrative is stale → finding: "run
`/governance:publish-design-surface`."** Tier-1 currency is also checked (mostly
catches "CI did not run" or a manual edit to a generated file).

## 6. Delta declaration (opt-in, default DISABLED)

```
## Design Surface

Status: ENABLED                            # DISABLED by default
Taxonomy source: <path or "none">          # domain-specific; section omitted if "none"
ADR dir: docs/adr
Memory bank: <path>
Narrative sources: <comma-separated paths> # e.g. docs/superpowers/specs, docs/adr, <memory-bank>
Output dir: docs/design                    # published surface root
Pages mechanism: jekyll                     # jekyll | mkdocs | actions-pages | none
Narrative review: required                  # Tier-2 is always PR-gated
```

`Pages mechanism: none` means generate-only (produce the artifacts/manifest, no
publish). A repo omitting the block entirely has no Design Surface.

## 7. Guardrails and error handling

- **Missing declared source** → generator emits a visible gap marker in the
  output and a non-zero audit finding; never silent, never fabricated.
- **Tier-2 citation enforcement** → the skill self-checks that each narrative
  claim carries a source anchor; an uncited claim blocks the PR from being
  marked ready.
- **Human gate** → the Tier-2 PR is the review-before-publish control; the AI
  never merges it (consistent with `constitution/shared-principles.md`).
- **Default-disabled** → zero impact on non-adopting repos.
- **Staleness** → reported by the audit, never auto-fixed.

## 8. Testing

- `design-surface.mjs`: snapshot-tested against a fixture repo — deterministic
  Tier-1 output + manifest for known inputs; gap handling for a missing source.
- Drift check: fresh-vs-stale manifest cases (taxonomy changed, ADR added,
  memory-bank updated) each produce the expected finding.
- Skill: exercised end-to-end on the pilot repo — produces a cited narrative and
  a draft PR; an injected uncited claim is caught by the self-check.

## 9. Rollout and versioning

- New additive capability → agentic-governance **v0.3** (minor bump; the
  downstream delta pin moves to `v0.3` only for repos that adopt the capability;
  non-adopters stay on their current pin).
- Ships: the skill, the generator, the `--design-surface` audit mode, the delta
  template block, the reference CI workflow, `docs/design-surface.md`, and the
  ADR.
- **Pilot on `agentic-kg`** — it already has the taxonomy (`seed_taxonomy.yml` →
  `topic-taxonomy.md`) and a Pages docs site, so adoption *generalizes its
  existing practice* and is the cleanest proof. Then `agentic-kgis`.
- Opt-in; other capabilities (steward, temporal) untouched.

## 10. Open questions / deferred

- **Module-map fidelity**: how rich the deterministic architecture map should be
  (package tree vs. import graph). Start with the package/module tree; an import
  graph is a later enhancement.
- **Cross-repo / portfolio surface**: a portfolio-level index linking each
  repo's surface is out of scope here; revisit after two repos adopt.
- **Narrative regeneration cadence**: whether to nudge regeneration on a
  schedule vs. purely audit-driven. Start audit-driven (finding-based); a
  scheduled reminder is a later option.
