# Slice claims

Claim IDs follow `<SCOPE>-<KIND>-<nn>` (design §3.2). `<KIND>` is delta-bound:
this fixture's delta declares `AC`, `CL` and `DS`.

Verification markers follow `— <STATE> (PR #<n>[, YYYY-MM-DD])` (design §3.4).
**An absent marker means `NOT VERIFIED`** — the default costs nothing to adopt
and cannot be forged by omission. The marker block is **append-only**: the
current state is the *last* line, history is the lines above it, and a reset
appends rather than erasing (design §3.5).

The checkbox and the verification state are **different axes**. `P1-AC-03`
below is ticked and `NOT VERIFIED` at the same time: the work was done, and
the verification stopped binding when the sentence was edited. Done means
`HUMAN VERIFIED`, not ticked.

## P1 — the normalization pipeline

- [x] `P1-AC-01` Every valid source record produces exactly one normalized
  output record, and duplicate source IDs are rejected. (activity-plan §13.1)
  — AGENT VERIFIED (PR #41, 2026-09-22)
  — HUMAN VERIFIED (PR #42, 2026-09-23)
- [x] `P1-AC-02` Normalization preserves the meaning of every source record it accepts. (design §6.3)
  — AGENT VERIFIED (PR #41, 2026-09-22)
- [x] `P1-AC-03` The generated dataset contains one row per accepted source record, and its rows are sorted ascending by normalized ID. (design §5.4)
  — AGENT VERIFIED (PR #41, 2026-09-20)
  — HUMAN VERIFIED (PR #42, 2026-09-21)
  — NOT VERIFIED (claim text edited, 2026-09-23)
- [x] `P1-AC-04` The transformation runs to completion without error on the committed source dataset. (design §14.3)
  — AGENT VERIFIED (PR #43, 2026-09-22)
- [ ] The normalized dataset is published to the project website.

## S1 — the dataset study

- [x] `S1-CL-01` The generated dataset contains exactly nine normalized records, one for each source record that is both valid and uniquely identified. (activity-plan §13.2)
  — AGENT VERIFIED (PR #43, 2026-09-22)
  — HUMAN VERIFIED (PR #44, 2026-09-23)
