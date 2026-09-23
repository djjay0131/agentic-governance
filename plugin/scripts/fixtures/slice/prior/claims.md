# Slice claims — the state of `llm/claims.md` BEFORE the 2026-09-23 amendment

This is fixture input, not a second source of truth. It exists so that
claim-text drift (design §5.4) can be **derived** rather than asserted:

    node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice \
      --claims prior/claims.md --out <prior-manifest>
    node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice \
      --previous <prior-manifest> --out <current-manifest>

`P1-AC-03` is the only claim whose sentence differs. In this earlier version
it reads "…one row per accepted source record." — the clause about sort order
was added later, after the claim had already been `HUMAN VERIFIED`. Its marker
block here has no reset line, because at this point there was nothing to reset.

## P1 — the normalization pipeline

- [x] `P1-AC-01` Every valid source record produces exactly one normalized
  output record, and duplicate source IDs are rejected. (activity-plan §13.1)
  — AGENT VERIFIED (PR #41, 2026-09-22)
  — HUMAN VERIFIED (PR #42, 2026-09-23)
- [x] `P1-AC-02` Normalization preserves the meaning of every source record it accepts. (design §6.3)
  — AGENT VERIFIED (PR #41, 2026-09-22)
- [x] `P1-AC-03` The generated dataset contains one row per accepted source record. (design §5.4)
  — AGENT VERIFIED (PR #41, 2026-09-20)
  — HUMAN VERIFIED (PR #42, 2026-09-21)
- [x] `P1-AC-04` The transformation runs to completion without error on the committed source dataset. (design §14.3)
  — AGENT VERIFIED (PR #43, 2026-09-22)
- [ ] The normalized dataset is published to the project website.

## S1 — the dataset study

- [x] `S1-CL-01` The generated dataset contains exactly nine normalized records, one for each source record that is both valid and uniquely identified. (activity-plan §13.2)
  — AGENT VERIFIED (PR #43, 2026-09-22)
  — HUMAN VERIFIED (PR #44, 2026-09-23)
