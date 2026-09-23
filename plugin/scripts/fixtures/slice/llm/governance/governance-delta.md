# Governance Delta: slice fixture (synthetic)

Status: Active
Last updated: 2026-09-23
Governance: agentic-governance v0.9.1

> **This is a fixture, not an adopting repository.** It exists to exercise
> `plugin/scripts/surface.mjs` end to end with zero dependencies and no
> network. Every actor id below is fixture data: `fixture-builder (agent)` and
> `fixture-owner (human)` are notional actors, not people. Nothing here
> attests to anything about the real repository.

## Mission

One merged slice scenario — a source dataset, a deterministic normalization,
and a generated dataset — carrying the software-engineering concepts from
activity plan §13.1 and the research/data concepts from §13.2 in a single
fixture (activity plan §13, amendment 2026-09-23).

## Repository Layout

- Governance directory: `llm/governance/`
- Claims path: `llm/claims.md`
- Artifacts directory (the data plane): `docs/`

## Published Surface

Status: ENABLED
Design Surface: DISABLED
Verification: ENABLED
Surface root: plugin/scripts/fixtures/slice
Claim kinds: AC, CL, DS
Claims source: llm/claims.md
Evidence sources: checks, evidence, human
PDataset source: llm/pdatasets.md
Renderer: none
Pages mechanism: none
Output dir: docs/verification

`Pages mechanism: none` is deliberate: it means generate-only, so link
resolution is `local` and **no absolute URL may appear anywhere in the
generated manifest** (design §4.2, activity plan A7-AC-03).

`Claim kinds` is delta-bound, not enumerated in canon (design §3.2): this
fixture declares `AC` (acceptance criterion), `CL` (claim) and `DS`
(dataset).
