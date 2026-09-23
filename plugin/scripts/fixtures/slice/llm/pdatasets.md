# PDatasets

A PDataset is a named, hashed, addressable data bundle that evidence can point
at (design §4). `sha256`, `bytes`, `rows`, `view_url`, `download_url` and
`link_resolution` are **derived by the generator, never hand-written** — a
hand-written hash is a hash of nothing.

`derived_from` is required and `none` must be *stated*, so that a root dataset
is distinguishable from one whose provenance was simply never recorded
(design §4.1).

## `S1-DS-01` — Source records, as collected

- path: data/source.csv
- produced_by: manual
- derived_from: none
- transformation: manual (records transcribed by hand from the collection sheet)
- produced_at: 2026-09-20
- schema: id:string, name:string, score:number, recorded_at:date
- license: CC0-1.0

This is the **root** of the provenance chain, and it says so. Its
transformation is `manual`, which is an `L1` (attested) operation by design
§4.1 regardless of how deterministic transcription looks — so the generator
derives `L1` here rather than accepting a declared level.

## `S1-DS-02` — Normalized records

- path: data/generated.csv
- produced_by: transform.mjs
- derived_from: S1-DS-01
- transformation: transform.mjs
- determinism: L3
- produced_at: 2026-09-22
- schema: id:string, name:string, score:number, recorded_at:date
- license: CC0-1.0

Derived, and the derivation is an executable artifact rather than a story
about one: `node transform.mjs --check` re-runs it and compares the bytes.
