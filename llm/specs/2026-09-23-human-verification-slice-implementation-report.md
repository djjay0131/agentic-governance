# Human Verification — vertical-slice implementation report

Status: Accepted
Date: 2026-09-23
Branch: `feat/g3-verification-slice`

## What was built

| Path | |
|---|---|
| `plugin/scripts/surface.mjs` | the minimum surface engine (D-1): claim parsing, `text_sha256`, marker chains, evidence, PDatasets, two projections, a deterministic manifest |
| `plugin/scripts/replay.mjs` | executes REPLAY and MODIFIED REPLAY as real subprocesses and records what happened |
| `plugin/scripts/surface-html.mjs` | the human verification interface — static HTML, zero dependencies |
| `plugin/scripts/fixtures/slice/**` | one merged fixture: source data → deterministic transform → generated data, 5 claims, 2 PDatasets, an `L1` attestation, a deliberately vacuous check, a human-authored independent check |
| `plugin/scripts/surface.test.mjs` | 44 assertions |
| `governance-checks.mjs` | 6th diff shape `verification-marker`, `verification-markers` check, lane-level human-state guard; suite 14 → 68 |
| `docs/verification/index.html` | the generated interface |

## What was proven

Each of these was demonstrated by **making it fail first**.

- **A governed claim carries a stable ID, hash-bound to its exact wording.** Editing `P1-AC-01`'s text resets it to `NOT VERIFIED`, refuses to overwrite the baseline it contradicts, names the marker to append, and **cannot be laundered by repeating the run**.
- **Agent verification is not human verification.** `P1-AC-02`, whose only evidence is testimony, is capped at `AGENT VERIFIED`; asserting `HUMAN VERIFIED` on it produces `state-cap-violation` and exit 1.
- **An agent cannot forge a human state.** Attempted through the L0 lane under all six diff shapes; refused under every one, with a control proving the lane is not simply closed.
- **Vacuity is detected by execution.** `P1-AC-04` passes REPLAY and fails to fail MODIFIED REPLAY, so it is reported `unfalsified` and barred from `HUMAN VERIFIED` — and that verdict now comes from running `--perturb`, not from reading a comment about it.
- **The gate is not stuck closed.** `P1-AC-01` and `S1-CL-01` still reach `HUMAN VERIFIED` on genuinely falsifying checks.
- **Artifacts are bound.** Mutating `data/source.csv` invalidates the claim and names the hash transition; prior markers remain visible.
- **Nothing is fabricated.** `Pages mechanism: none` → `link_resolution: local`; the page contains the string `http` **zero** times.
- **Both generators are `L3`.** Two runs differ only in `generated_at`, even with ten real subprocesses.

## What changed from the G-3 design, and why

Five amendments, each recorded in the artifact it corrects.

| | Found by | |
|---|---|---|
| **C-1** | reading | **The determinism scale was inverted in two places.** §4.1 and §5.5 said "Level 3" where §14.1 defines `L1`. Following them literally classifies attested and LLM work as *deterministic*, inverting the cap in §5.3 that stops an agent's say-so reaching `HUMAN VERIFIED`. |
| **C-2** | reading | §7.3 deferred "executable UI" wholesale, which reads as deferring any way for a human to re-run a check. Now separates the deferred *console* from the required *generated-command path*. |
| **C-3** | implementing | §9.1's code sketch calls `pairedConstraint`, permitting the in-place marker rewrite §3.5 forbids — and its filter would reject the marker lines it exists to permit. |
| **C-4** | verifying | **MODIFIED REPLAY is a defence against error, not against an adversary.** |
| **A-3** | scope | One merged fixture for the slice; both fixture designs stand for the full capability. |

**C-4 is the finding worth keeping.** The perturbation is *self-administered* — `--perturb` is implemented by the artifact under test — so `if (perturb) exit 1` satisfies the rule. A verifier drove a claim reading *"two plus two equals five"* to `HUMAN VERIFIED` while the manifest recorded `ASSERTION FALSE` in both execution records. §14.3 called this "the most valuable idea here"; that argument survives only for **honest mistakes**, which is what the three real vacuous guards in this portfolio were. What closes the gap is INDEPENDENT VERIFICATION, and the slice ships the worked example: delete `transform.mjs` and the human-authored check still passes while the agent's cannot load.

## What the verification process itself proved

Four verifiers attacked work they did not build. **All four returned `FAIL`.** Every serious defect in this slice was found by one of them; **none by me**, though I had spot-checked three of the four areas.

- The engine never executed anything — it read outcomes from code comments. One word walked the deliberately vacuous check to `HUMAN VERIFIED` through a clean run.
- `HUMAN VERIFIED` was forgeable at exit 0 via a `path-only` allowlist entry.
- The determinism cap was satisfied by narrative prose *about* the evidence.
- The interface rendered *executed* and *asserted* outcomes identically.

That is the brief's thesis demonstrated on its own implementation.

## What remains

**Open and reported, not implied closed:** a well-formed *second* evidence declaration in another check's file still reaches `HUMAN VERIFIED` at exit 0. §6.1's many-to-many relation makes borrowing representable by design.

**Not built (deliberately, per scope control):** the `verify-claim` skill, the Verifier agent charter, `llm/governance/verification.md`, the remaining integration points of §9, ADR-0002/0003, Design Surface Tier 2, adopter migration, `produced_by.class` corroboration, and the `crashed`/`asserted` distinction extended to REPLAY.

## Status

**G-3 remains `SPECIFIED`**, and the reason is the capability's own rule.

`IMPLEMENTED` would claim the feature is built; it is not — a vertical slice is. And the slice cannot be `VERIFIED`, because **no human has verified it**. An agent marking its own work complete is precisely what G-3 exists to prevent, and the first place that rule binds is here.

The slice's own claim about itself is `AGENT VERIFIED`. A human raises it or does not.
