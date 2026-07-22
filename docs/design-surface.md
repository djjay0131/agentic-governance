# Design Surface

A published rendering of a repo's design where **every element is
attributable to an authoritative source** — a view, never a new source of
truth (it sits at the bottom of the design-authority hierarchy).

## Two tiers
- **Tier 1 — derived facts (deterministic, auto-published):** taxonomy
  (included from the repo's pre-rendered artifact + source hash), ADR index,
  module map, memory-bank/governance status, and a manifest of source hashes.
  Regenerated every build by `governance/scripts/design-surface.mjs`.
- **Tier 2 — synthesized narrative (LLM, review-gated):** the cited "what was
  built and why" essay, produced by `/governance:publish-design-surface` into a
  draft PR. Published only when a human merges it.

## The projection rule
Tier 1 is mechanically derived; Tier 2 cites. Nothing is hand-authored and
authoritative. A Tier-2 claim without a source anchor is omitted, not written.

## Drift
`node governance/scripts/governance-checks.mjs --design-surface` (advisory)
flags a `stale-narrative` when sources changed since the narrative was last
generated, plus `tier-1-out-of-date` and `missing-source`.

## Adopting
Add the `## Design Surface` block to your delta (default DISABLED → ENABLED),
declare your sources + Pages mechanism, and copy
`docs/templates/design-surface-ci-template.yml`. Pilot: agentic-kg.
