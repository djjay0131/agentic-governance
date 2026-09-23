# Slice fixture — one merged scenario

A synthetic mini-adopter that exercises `plugin/scripts/surface.mjs` end to
end with **zero dependencies, no network and no Quarto/R/jupyter/pandoc**. It
merges activity plan §13.1 (software engineering) and §13.2 (research/data)
into a single scenario, per the amendment at the head of §13:

    data/source.csv  ──transform.mjs──►  data/generated.csv
      S1-DS-01                              S1-DS-02
      (root, derived_from: none)            (derived_from: S1-DS-01)

> **Everything here is fixture data.** `fixture-builder (agent)` and
> `fixture-owner (human)` are notional actors, not people. The PR numbers in
> the marker blocks are notional. Nothing in this directory attests to
> anything about the real repository.

## Layout

| Path | What it is |
|---|---|
| `llm/governance/governance-delta.md` | the mini-adopter's delta: `## Published Surface`, `Claim kinds: AC, CL, DS`, `Renderer: none`, `Pages mechanism: none` |
| `llm/claims.md` | the claim lines, with append-only marker blocks (design §3.4, §3.5) |
| `llm/pdatasets.md` | the two PDataset declarations (design §4.1) |
| `data/source.csv` | 12 source records — one duplicate id, one invalid row |
| `data/generated.csv` | the committed output: 9 normalized records |
| `transform.mjs` | the deterministic normalization, `--check` re-verifies the committed output |
| `checks/*.mjs` | the executable evidence, each citing its claim ID |
| `human/*.mjs` | the **human-authored, independent** variation, sharing no code with the pipeline |
| `evidence/attestations.md` | the `L1` attested evidence for `P1-AC-02` |
| `prior/claims.md` | `llm/claims.md` as it read **before** the amendment, so drift can be derived |
| `docs/verification/surface-manifest.json` | a regenerable convenience copy (see below) |

## What each claim proves

| Claim | Evidence | Ends up | Proves |
|---|---|---|---|
| `P1-AC-01` | `L3`, replay + modified replay both as expected | `HUMAN VERIFIED` | the happy path, end to end |
| `P1-AC-02` | `L1` prose assertion only | `AGENT VERIFIED` | an agent's say-so is never enough |
| `P1-AC-03` | `L3`, verified, then the sentence was edited | `NOT VERIFIED` | verification binds to the exact wording (§5.4) |
| `P1-AC-04` | `L3` check that passes while asserting nothing real | `AGENT VERIFIED`, flagged `unfalsified` | the vacuous-check detector works |
| *(line 31, un-ID'd)* | — | counted in `unidentified_claims` | adoption is incremental (§3.2) |
| `S1-DS-01` | the source dataset | PDataset, `derived_from: none` **stated** | root provenance is stated, not omitted |
| `S1-DS-02` | the generated dataset | PDataset, `derived_from: S1-DS-01` | the provenance chain |
| `S1-CL-01` | `L3` ×2 — the agent's check **and** a human-authored independent one | `HUMAN VERIFIED` | the claim genuinely depends on its data, and two actors agree without sharing code |

`P1-AC-04` is the fixture's reason to exist and its check is **deliberately
vacuous**. Do not "fix" it: a verification tool that cannot detect a check
which passes without checking anything would have signed off on all three of
the real vacuous guards this portfolio found last week (design §14.3).

**Nothing in this fixture can promote itself by editing a comment.** Since
2026-09-23 `surface.mjs` runs `plugin/scripts/replay.mjs` over every declared
REPLAY and MODIFIED REPLAY and reads the child process's exit status. The
`replay-outcome:` and `modified-replay-outcome:` header lines are now
`attested_outcome` — the author's account — and the exit status is
`recorded_outcome`. Flip `P1-AC-04`'s `modified-replay-outcome: pass` to
`fail` and you do not get `HUMAN VERIFIED`; you get a
`replay-outcome-misreported` error naming the file, because the modified
replay still exits 0 when it is actually run.

### The human-authored variation

`human/cl01-independent-relationship.mjs` is the second evidence record for
`S1-CL-01` and the one that is `produced-by: fixture-owner (human)`. It
imports nothing from `transform.mjs`: it opens both CSVs as independent
tables, derives which source records are valid and uniquely identified from
the claim sentence, and checks the one-for-one relationship itself — comparing
scores numerically rather than reproducing the pipeline's `toFixed(2)`.
`checks/cl01-record-count.mjs`, which *does* import the agent's helper, is
labelled `produced-by: fixture-builder (agent)` for that reason. The engine
reads `produced_by.class`, so the label has to be true.

## Running it

```sh
# from the repository root — this EXECUTES all ten commands below
node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice

# keep the timings: `--replay-ledger` writes the execution records in full
node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice \
  --replay-ledger /tmp/replay-ledger.json

# one command on its own
node plugin/scripts/replay.mjs --root plugin/scripts/fixtures/slice \
  --command "node checks/ac04-transform-runs.mjs --perturb accept-duplicates"

# every REPLAY (all pass)                     — from plugin/scripts/fixtures/slice
node transform.mjs --check
node checks/ac01-duplicate-rejection.mjs
node checks/ac03-sort-order.mjs
node checks/ac04-transform-runs.mjs
node checks/cl01-record-count.mjs
node human/cl01-independent-relationship.mjs

# every MODIFIED REPLAY (all must FAIL — except ac04, which fails to fail)
node checks/ac01-duplicate-rejection.mjs --perturb accept-duplicates
node checks/ac03-sort-order.mjs          --perturb shuffle-output
node checks/ac04-transform-runs.mjs      --perturb accept-duplicates   # PASSES: that is the point
node checks/cl01-record-count.mjs        --perturb source-score
node human/cl01-independent-relationship.mjs --perturb drop-generated-row
```

No perturbation ever writes to a committed file; they all change behaviour in
memory only.

## The committed manifest

`docs/verification/surface-manifest.json` is **derived, regenerable and
disposable** — delete it, rerun the generator, and you get it back. It is
committed for two reasons now: so the renderer and the checker have a stable
input, and because **it is its own baseline**. A default run reads it before
writing anything and compares every bound identifier of §5.5 against it, which
is how claim-text drift and artifact invalidation are detected without a flag.
Regenerate it byte-identically with:

```sh
node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice \
  --generated-at 2026-09-23T00:00:00.000Z
```

Compare `content_sha256`, not the whole file: it covers everything the
generator derived from the inputs and deliberately excludes `generated_at`,
the one field permitted to differ between runs. It is currently
`a8d76b32f476c5e8bb4b5b7bebcddbc027c1280696ec9836af06e8d7d87d3342`.

Two things follow from the manifest being its own baseline:

- **Delete it and the first run has no baseline.** That is not an error, but
  drift and invalidation are unchecked on that run; the run says
  `baseline: none`. `--no-previous` states the same thing deliberately.
- **A run will not overwrite the baseline it has just contradicted.** Edit a
  claim sentence and the default run reports the drift, leaves the committed
  manifest alone and exits 1. Append the `— NOT VERIFIED (…)` marker it
  proposes (§3.5 appends, it never erases) and run again, or say
  `--accept-baseline-rewrite` out loud. One run used to launder an edit
  permanently.

`governance_version` is read from a `VERSION` file at or above `--root`, so a
copy of this fixture outside the repository needs one beside it to reproduce
the same `content_sha256`.
