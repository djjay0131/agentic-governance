# Builder 2 — answering Verifier 1's FAIL

Date: 2026-09-23
Branch: `feat/g3-verification-slice`
Under repair: D1 (critical), D2 (high), D3 (high), plus D5, D6, D7 and two
others the fixes reached.
Builder: **not the Verifier.** This report is evidence for the next
independent Verifier to attack, not a claim that the work is verified.

---

## 0. The one-sentence answer

The engine believed what artifacts said about themselves; now it runs them.
`plugin/scripts/replay.mjs` executes every declared REPLAY and MODIFIED REPLAY
as a real subprocess and `surface.mjs` derives every outcome from the child's
exit status, so the verdict is no longer a function of an editable comment —
and the §5.5 identifiers that were recorded and never compared are now
recomputed and compared on every default run, against a baseline the run
refuses to overwrite while it is contradicting it.

| Verifier's defect | Status | Proof below |
|---|---|---|
| **D1** verdict rests on unexecuted `*-outcome:` comments | **fixed** | §2 |
| **D2** §5.5 artifact invalidation unimplemented | **fixed** | §3 |
| **D3** drift laundering via the default `--out` | **fixed** | §4 |
| **D5** duplicate claim IDs accepted silently | **fixed** | §5.1 |
| **D6** sibling masks a failed-to-falsify check | **fixed** | §5.2 |
| **D7** `provenance_root: true` invented for unrecorded provenance | **fixed** | §5.3 |
| **D8** `produced_by.class` parsed, stored, never read | **read now**, with teeth | §2.4 |
| **D9** undeclared determinism reported as "only `L1`" | **fixed** | §5.4 |
| **D4** marker-history mutation invisible to the engine | **fixed** (it fell out of D3's baseline) | §5.5 |
| D10 URL guardrail narrowness, D11 inline markers | **not attempted** — out of the brief's scope, and `governance-checks.mjs` (not mine to touch) covers D11 | — |

Files: `plugin/scripts/replay.mjs` (new, 370 lines),
`plugin/scripts/surface.mjs` (1032 → 1632),
`plugin/scripts/fixtures/slice/human/cl01-independent-relationship.mjs` (new),
and fixture edits. **Not touched:** `plugin/scripts/surface-html.mjs`,
`docs/**`, `plugin/scripts/governance-checks*.mjs`, `llm/**`. `git diff
--name-only` at the end of §8 is the evidence.

---

## 1. What was built

### `plugin/scripts/replay.mjs` — the runner

One job: execute a declared command and return an **execution record** that
says what actually happened.

```
{ schema, command, cwd, artifact, artifact_sha256, executed, unexecuted_reason,
  exit_status, signal, timed_out, outcome, outcome_source,
  stdout_sha256, stderr_sha256, stdout_bytes, stderr_bytes, stdout_first_line,
  timing: { duration_ms, started_at, finished_at }, execution_id }
```

- `outcome` is `'pass'` iff a real child process exited 0. There is no other
  way to produce it.
- A command that cannot be run comes back `executed: false` with a stated
  `unexecuted_reason`, `outcome: null`. **Never a pass, never a silent skip** —
  `surface.mjs` turns each one into a gap and an `error` finding, which is
  this repo's `SKIP — NOT VERIFIED` idiom applied to execution.
- `execution_id` is content-addressed: `sha256` over command, cwd, artifact,
  artifact hash, exit status and the output hashes. It identifies *what
  happened*, so it is stable across two runs that did the same thing — which
  is what lets it live in a deterministic manifest.

**Bounded execution**, because the command string is untrusted input read out
of a file in the tree:

| Guard | Behaviour |
|---|---|
| `spawnSync(process.execPath, argv, { shell: false })` | no shell, ever |
| shell metacharacters in the command | **refused**, not sanitized |
| program allowlist | `node` only |
| script + any path-shaped argument | must resolve **inside** the declared root, after `realpath`; absolute paths and `..` escapes refused |
| timeout / `maxBuffer` / pruned env | 60s default (`--replay-timeout`), 4 MiB, `PATH`/`HOME`/`TMPDIR`/`LANG=C`/`TZ=UTC` |

Two of these are proved firing in §6.

It is also a CLI:

```sh
node plugin/scripts/replay.mjs --root plugin/scripts/fixtures/slice \
  --command "node checks/ac04-transform-runs.mjs --perturb accept-duplicates"
```

### `human/cl01-independent-relationship.mjs` — the human-authored variation

Second evidence record for `S1-CL-01`, `produced-by: fixture-owner (human)`,
and the brief's required human-side variation preserved **as evidence**.

It imports nothing from the pipeline. It opens `data/source.csv` and
`data/generated.csv` as two independent tables, derives which source records
are "valid and uniquely identified" from the claim sentence itself, and checks
the one-for-one relationship — comparing scores **numerically** rather than
reproducing the agent's `toFixed(2)`, because re-deriving the agent's
formatting would be running the agent's code by hand.

```
$ node human/cl01-independent-relationship.mjs
PASS S1-CL-01 REPLAY: 9 generated records match the 9 valid, uniquely-identified source records one-for-one, computed independently of transform.mjs
EXIT=0
$ node human/cl01-independent-relationship.mjs --perturb drop-generated-row
FAIL S1-CL-01 MODIFIED REPLAY (--perturb drop-generated-row)
  - generated dataset holds 8 records, the claim says 9
  - source record S-011 is valid and unique but has no generated row
EXIT=1
```

**One fixture correction that came with it.** `checks/cl01-record-count.mjs`
was labelled `produced-by: fixture-owner (human)` while importing
`normalize()` from the agent's `transform.mjs` — it cannot disagree with the
pipeline about what the rules are. It is now `fixture-builder (agent)`.
Leaving it would have made `produced_by.class` decorative at the exact moment
the engine started reading it.

---

## 2. D1 — the verdict is now a function of an executed process

### 2.1 What changed in the data model

`replay-outcome:` and `modified-replay-outcome:` are still parsed. They are
recorded as **`attested_outcome`** — the author's account — and the exit
status becomes **`recorded_outcome`**, with `outcome_source: "executed"`.
Every ceiling decision reads the second one. Where the two disagree the
disagreement is itself an error finding, `replay-outcome-misreported`.

**The non-negotiable semantic:** `modified-replay-expect` must be `fail`.
Declaring anything else is now an error (`modified-replay-expect-invalid`) and
is read as `fail` regardless — a perturbation that leaves the check passing is
the definition of a vacuous check, so the expectation is not a knob.

### 2.2 The exploit, re-run

Injected defect — the Verifier's item 10, verbatim: flip **one word in one
comment**, append a `HUMAN VERIFIED` marker (append-only respected).

```sh
sed -i 's|^// modified-replay-outcome: pass$|// modified-replay-outcome: fail|' \
  c10/checks/ac04-transform-runs.mjs
# append "— HUMAN VERIFIED (PR #99, 2026-09-23)" under P1-AC-04's marker block
```

The check binary is untouched and still fails to fail:

```
$ cd c10 && node checks/ac04-transform-runs.mjs --perturb accept-duplicates
PASS P1-AC-04 MODIFIED REPLAY (--perturb accept-duplicates): the transformation ran to completion
MODIFIED REPLAY EXIT=0 (0 = it did NOT fail)
```

```
$ node surface.mjs --root c10 --no-previous --out c10.json --generated-at 2026-09-23T00:00:00.000Z
surface: c10.json
  claims 5  evidence 6  pdatasets 2  un-ID'd claim lines 1
  replays: 10 executed, 0 unexecuted  baseline: none
  P1-AC-01   HUMAN VERIFIED       L3  
  P1-AC-02   AGENT VERIFIED       L1  
  P1-AC-03   NOT VERIFIED         L3  
  P1-AC-04   AGENT VERIFIED       L3  unfalsified failed-to-falsify
  S1-CL-01   HUMAN VERIFIED       L3  
  (un-ID'd)  llm/claims.md:32  "The normalized dataset is published to the project website."
  gaps 0  findings: 2 error, 2 warn, 2 info
EXIT=1
```

`--no-previous` is deliberate here: it isolates D1, so the refusal cannot be
credited to D2's invalidation. The two errors:

```
[error] replay-outcome-misreported P1-AC-04
    evidence `checks/ac04-transform-runs.mjs` records `modified-replay-outcome: fail` but
    MODIFIED REPLAY `node checks/ac04-transform-runs.mjs --perturb accept-duplicates`
    actually exited 0 (`pass`). The recorded outcome is testimony and the executed outcome
    is the evidence; the executed outcome wins (design §14.1, §14.2).
    locator: checks/ac04-transform-runs.mjs

[error] state-cap-violation P1-AC-04
    marker asserts `HUMAN VERIFIED` but the evidence ceiling is `AGENT VERIFIED` —
    MODIFIED REPLAY exited 0 — it FAILED TO FAIL. The check passes while the thing it
    asserts is broken, which is the definition of a vacuous check (design §14.3).
    The asserted state is refused; the claim is presented as `AGENT VERIFIED`.
    locator: llm/claims.md:29
```

and the claim record, with the execution that produced it:

```json
{ "id": "P1-AC-04", "marker_state": "HUMAN VERIFIED", "state": "AGENT VERIFIED",
  "state_source": "capped-by-evidence", "ceiling": "AGENT VERIFIED",
  "unfalsified": true, "failed_to_falsify": ["checks/ac04-transform-runs.mjs"] }
{ "locator": "checks/ac04-transform-runs.mjs", "lifts_ceiling": false,
  "lift_blocked_reason": "MODIFIED REPLAY exited 0 — it FAILED TO FAIL. …",
  "modified_replay": {
    "attested_outcome": "fail", "recorded_outcome": "pass", "outcome_source": "executed",
    "as_expected": false, "exit": 0, "artifact": "checks/ac04-transform-runs.mjs",
    "artifact_sha256": "c51ed357bf372cbb…",
    "stdout_first_line": "PASS P1-AC-04 MODIFIED REPLAY (--perturb accept-duplicates): the transformation ran to completion",
    "execution_id": "371cec3ec2190232…" } }
```

On the **default** invocation (baseline present) the same tree produces four
errors and `P1-AC-04 NOT VERIFIED`: `artifact-invalidated`,
`replay-outcome-misreported`, `state-cap-violation`, and —
`marker-history-mutated S1-CL-01`, because the Verifier's `sed` for appending
a marker also matched `S1-CL-01`'s identical `— AGENT VERIFIED (PR #43,
2026-09-22)` line. The engine noticed the collateral edit; I did not, until it
told me.

### 2.3 The `L1`-to-`L3` lift (Verifier item 13), and two sharper versions

**13 — as reported.** `determinism: L1` → `L3` on the agent's prose
attestation, plus four fabricated replay comment lines pointing at
`ac04-transform-runs.mjs`:

```
P1-AC-02   AGENT VERIFIED       L3   unfalsified failed-to-falsify
EXIT=1
{ "state": "AGENT VERIFIED", "marker_state": "HUMAN VERIFIED",
  "state_source": "capped-by-evidence", "ceiling": "AGENT VERIFIED" }
lift_blocked_reason: MODIFIED REPLAY exited 0 — it FAILED TO FAIL …
```

The fabricated block is executed, and executing it is what kills it.

**13b — I made the attack better.** Point the fabricated block at
`ac01-duplicate-rejection.mjs`, whose modified replay *genuinely* exits 1:

```
    ac01 MODIFIED REPLAY EXIT=1 (1 = it really fails)
{ "state": "AGENT VERIFIED", "marker_state": "HUMAN VERIFIED", "ceiling": "AGENT VERIFIED" }
lift_blocked_reason: the executed artifact is not the declared `locator: evidence/attestations.md`
[warn] replay-artifact-mismatch | the executed artifact(s) `checks/ac01-duplicate-rejection.mjs`
       are not the declared `locator: evidence/attestations.md`, so the hash this record binds
       is not the hash of what ran. The record cannot lift this claim's ceiling.
```

**13c — better still.** Also set `locator:` to the borrowed check, so the
bound hash *is* the hash of what ran:

```
{ "state": "AGENT VERIFIED", "marker_state": "HUMAN VERIFIED", "ceiling": "AGENT VERIFIED",
  "ceiling_reason": "the executed artifact does not cite this claim (design §6.1)" }
[warn] replay-artifact-does-not-cite-claim | … `checks/ac01-duplicate-rejection.mjs` does not
       cite `EVIDENCE P1-AC-02`. Evidence binds by the claim ID cited in the artifact
       (design §6.1, §6.2), so pointing a replay at another claim's check proves nothing here.
```

Two rules close this family: an evidence record's replay must execute **its
own declared locator**, and the executed artifact must **cite the claim**.
Both are §6.1's binding-by-citation, applied to the thing that ran rather than
to the thing that was declared.

### 2.4 `produced_by.class` has a read site (D8)

Three of them, in ascending severity:

1. `L1` evidence can never lift a ceiling, and the reason now **names the
   actor class**: ``  `L1` (attested) evidence produced by an agent:
   testimony, with nothing to re-execute. An agent's say-so is never enough
   (design §14.1, §6.3, §5.3 mechanism 4)``. An agent-produced attestation
   cannot satisfy a human state.
2. Evidence with **no** declared `produced-by: <actor> (human|agent)` cannot
   lift a ceiling at all — the actor class behind it is unrecorded, and §4.2's
   "never silent, never invented" applies to actors too.
3. `info`/`human-state-on-agent-evidence` fires when a `HUMAN REVIEWED` or
   `HUMAN VERIFIED` state rests entirely on agent-produced evidence. It fires
   on the committed fixture, for `P1-AC-01`, and says why it nonetheless
   stands: *"It stands only because the evidence was executed and falsified
   this run."*

What I did **not** do: cap a machine-checked `L3` claim because an agent wrote
the check. Executed evidence is not an attestation, and capping it would make
`HUMAN VERIFIED` unreachable for any agent-written test — which is not what
§5.3 mechanism 2 is protecting. The gate is on testimony, not on authorship of
code that was run. If the next Verifier reads §5.3 as stricter than that, it
is a two-line change and I would rather be told than guess.

### 2.5 The detector is not stuck closed

A check I cannot make *pass* is no better than one I cannot make fail. I made
`ac04` non-vacuous (assert the output has no duplicate ids) and re-ran the same
machinery:

```
$ node checks/ac04-transform-runs.mjs --perturb accept-duplicates
FAIL P1-AC-04 MODIFIED REPLAY (--perturb accept-duplicates): duplicate ids in the output
   MODIFIED REPLAY EXIT=1 (1 = it now really fails)

  P1-AC-04   HUMAN VERIFIED       L3  
{ "state": "HUMAN VERIFIED", "ceiling": "HUMAN VERIFIED",
  "ceiling_reason": "L3 evidence EXECUTED this run: REPLAY exited 0 and MODIFIED REPLAY exited 1 — it failed as it must (design §14.2, §14.4)",
  "unfalsified": false, "failed_to_falsify": [] }
```

The committed fixture's `ac04` stays deliberately vacuous. Do not "fix" it.

---

## 3. D2 — §5.5 artifact invalidation

Every bound identifier is recomputed each run and compared against the
manifest the marker was written against:

| Identifier | Compared as |
|---|---|
| `text_sha256` | the claim sentence (§5.4, unchanged) |
| `artifact_sha256` | each evidence `locator`, each declaring file, **and the artifact that was executed** |
| `dataset_sha256` | each PDataset an evidence record binds with the new `pdatasets:` field |
| `commit_sha` | only when the caller states one on both runs — see the note below |

A mismatch sets `state = NOT VERIFIED`, `state_source =
"artifact-invalidation"`, raises an `error`, and **proposes** the §3.5 marker.
It is proposed and not written, exactly as the drift path does and exactly as
the Verifier credited: the generator never edits the claims file (A5-AC-01),
the prior `HUMAN VERIFIED` line stays visible, and a reset appends.

### The proof

```sh
sed -i 's/^s-002,Katherine Johnson,99/s-002,Katherine Johnson,42/' c2/data/source.csv
node surface.mjs --root c2 --out c2.json --generated-at 2026-09-23T00:00:00.000Z
```

```
  replays: 10 executed, 0 unexecuted  baseline: docs/verification/surface-manifest.json
  P1-AC-01   NOT VERIFIED         L3  artifact-changed
  P1-AC-02   AGENT VERIFIED       L1  
  P1-AC-03   NOT VERIFIED         L3  artifact-changed
  P1-AC-04   NOT VERIFIED         L3  unfalsified failed-to-falsify artifact-changed
  S1-CL-01   NOT VERIFIED         L3  artifact-changed
  gaps 0  findings: 7 error, 2 warn, 2 info
EXIT=1
```

```
[artifact-invalidated] S1-CL-01
   a bound identifier changed since the marker was written: dataset_sha256 of `S1-DS-01`
   (d496eda0abee -> 4ac33ea05dc7). Verification identifies WHAT was verified, so a claim
   whose artifacts moved underneath it cannot keep presenting as `HUMAN VERIFIED`
   (design §5.5). Append: — NOT VERIFIED (artifact changed: dataset_sha256, 2026-09-23)

[replay-outcome-misreported] S1-CL-01
   evidence `checks/cl01-record-count.mjs` records `replay-outcome: pass` but REPLAY
   `node checks/cl01-record-count.mjs` actually exited 1 (`fail`).
[replay-outcome-misreported] S1-CL-01
   evidence `human/cl01-independent-relationship.mjs` records `replay-outcome: pass` but
   REPLAY `node human/cl01-independent-relationship.mjs` actually exited 1 (`fail`).
[state-cap-violation] S1-CL-01
   marker asserts `HUMAN VERIFIED` but the evidence ceiling is `AGENT VERIFIED` —
   REPLAY exited 1 (`fail`) where `pass` was expected.
```

```json
"S1-CL-01": { "state": "NOT VERIFIED", "marker_state": "HUMAN VERIFIED",
  "state_source": "artifact-invalidation",
  "current_marker": "— HUMAN VERIFIED (PR #44, 2026-09-23)",
  "history": ["— AGENT VERIFIED (PR #43, 2026-09-22)"],
  "bound_pdatasets": ["S1-DS-01","S1-DS-02"] }
"invalidation": { "changed": [{ "identifier":"dataset_sha256","subject":"S1-DS-01",
    "previous_sha256":"d496eda0abeee9c1f14dab82477fd13d6e03d4d20b8e9426c3aa2657f9a17793",
    "current_sha256":"4ac33ea05dc7669f2697ef2c68585eaddab41d63de8775939df99d72a064597c" }],
  "identifiers": ["dataset_sha256"], "acknowledged": false,
  "proposed_marker": "— NOT VERIFIED (artifact changed: dataset_sha256, 2026-09-23)" }
"coverage.artifact_invalidated": ["P1-AC-01","P1-AC-03","P1-AC-04","S1-CL-01"]
```

Two independent mechanisms catch it — the hash comparison **and** the executed
replay failing. The human-authored check fails too, which is the point of it:
it genuinely depends on the data.

Four claims invalidate, not one, because four evidence records bind
`S1-DS-01`. That is correct: they all rest on that file.

### Three judgement calls, stated so they can be disagreed with

- **`commit_sha` is opt-in.** §5.5 lists it as a bound identifier, but this
  engine never derives one (it does not shell out to git, A3-AC-03). Deriving
  it would invalidate every claim on every unrelated commit and make
  `HUMAN VERIFIED` unreachable in practice. It is compared only when a caller
  passes `--commit` on both runs, i.e. when a repo opts into commit-level
  binding. Coarse by nature; I did not want to hide that behind a default.
- **Datasets bind by declaration.** A new evidence field,
  `pdatasets: S1-DS-01, S1-DS-02`, says which data a check rests on. The
  alternative — invalidate every claim whenever any dataset changes — is
  louder but wrong, and a binding that names nothing is an error
  (`unknown-pdataset-binding`).
- **Multiple identifiers join with ` and `, not `, `.** The §3.4 reset grammar
  admits no comma before the date, so `— NOT VERIFIED (artifact changed:
  artifact_sha256 and dataset_sha256, 2026-09-23)` is what the engine proposes.
  A proposed marker that the parser would reject would be worse than useless.

---

## 4. D3 — the baseline

Three changes, one idea: *the committed manifest is the record of what was
verified, so treat it like one.*

1. **It is the default baseline.** With no `--previous`, the engine reads
   `<output dir>/surface-manifest.json` before writing anything.
   `--no-previous` is the explicit escape hatch for a genuine first run, and
   the run says `baseline: none` when there is none.
2. **A run will not overwrite the baseline it has just contradicted.** If the
   output path is the baseline and an unacknowledged drift or invalidation
   stands, nothing is written: the proposed markers go to stderr and the run
   exits 1. `--accept-baseline-rewrite` overrides, out loud.
3. **The baseline's own `content_sha256` is deliberately not copied into the
   manifest.** It would make the manifest a function of which baseline it
   happened to be compared against — and since the committed manifest is its
   own baseline, run N would disagree with run N-1 forever. The baseline is
   named in `previous.path`; hash it there. The field says this of itself.

### The proof

```sh
perl -0pi -e 's/duplicate source IDs are rejected\./duplicate source IDs are silently merged./' c1/llm/claims.md
node surface.mjs --root c1 --generated-at 2026-09-23T00:00:00.000Z     # no --previous, default --out
```

```
surface.mjs: refusing to overwrite the baseline it contradicts — docs/verification/surface-manifest.json
  1 claim(s) drifted or were invalidated against it:
    P1-AC-01  append: — NOT VERIFIED (claim text edited, 2026-09-23)
  Append the marker(s) above (design §3.5 — a reset appends, it never erases), then re-run.
  Or write elsewhere with --out, or overwrite deliberately with --accept-baseline-rewrite.
surface: NOT WRITTEN — the baseline it contradicts was left intact
  P1-AC-01   NOT VERIFIED         L3  text-drift
  gaps 0  findings: 1 error, 2 warn, 2 info
EXIT=1

baseline on disk is still: HUMAN VERIFIED 15884430064c
```

The Verifier's laundering sequence was: run once with defaults, then compare.
Running it a second time produces the identical refusal and the identical
`15884430064c`. **The drift cannot be laundered by repetition.**

The resolution path works and keeps the history:

```
  — AGENT VERIFIED (PR #41, 2026-09-22)
  — HUMAN VERIFIED (PR #42, 2026-09-23)
  — NOT VERIFIED (claim text edited, 2026-09-23)      <- appended by hand
```
```
  P1-AC-01   NOT VERIFIED         L3  text-drift
  gaps 0  findings: 0 error, 2 warn, 2 info
EXIT=0
history preserved: ["— AGENT VERIFIED (PR #41, 2026-09-22)","— HUMAN VERIFIED (PR #42, 2026-09-23)"]
current: — NOT VERIFIED (claim text edited, 2026-09-23)
```

---

## 5. The rest

### 5.1 D5 — duplicate claim IDs

```
$ node surface.mjs --root c15 --no-previous …
EXIT=1
[error] duplicate-claim-id P1-AC-03 | claim ID `P1-AC-03` is declared 2 times
   (llm/claims.md:25, llm/claims.md:38). The ID is the claim's identity (design §3.2);
   duplicates make two readers of one manifest disagree.
```

### 5.2 D6 — a sibling cannot mask a vacuous check

`coverage.failed_to_falsify` and a `failed-to-falsify` warn are emitted for
**any** executed evidence whose modified replay exits 0, independently of
whether a sibling falsified. Adding a genuinely-falsifying sibling for
`P1-AC-04`:

```
{ "state": "AGENT VERIFIED", "ceiling": "HUMAN VERIFIED",
  "unfalsified": false, "failed_to_falsify": ["checks/ac04-transform-runs.mjs"] }
coverage.unfalsified       = []
coverage.failed_to_falsify = ["P1-AC-04"]
[warn] failed-to-falsify
```

`unfalsified` keeps its old meaning (no falsifying evidence at all); the
vacuous check stays visible in coverage and in the findings either way.

### 5.3 D7 — invented rootness

```
UNRECORDED : {"derived_from":[],"derived_from_declared":null,"provenance_root":null,
              "provenance_root_source":"unrecorded: `derived_from` was never stated (design §4.1)",
              "provenance_chain":null}
STATED none: {"derived_from":[],"derived_from_declared":"none","provenance_root":true,
              "provenance_root_source":"declared","provenance_chain":["S1-DS-01"]}
```

`provenance_chain_complete` was added for the adjacent case: a child whose
ancestor's provenance was never recorded.

### 5.4 D9 — undeclared is not `L1`

Strip every determinism declaration and the reader is told the truth:
`undeclared-determinism-only` — *"the level is UNDECLARED, not `L1`"* — and
`ceiling_reason` says the same. The old text claimed "only `L1` (attested)
evidence" about evidence with no level at all.

### 5.5 D4 — marker history

It came free with the baseline: the previous manifest's `markers[]` must be a
**prefix** of this run's, or `marker-history-mutated` fires with the removed or
rewritten lines quoted. This is the engine catching what `governance-checks.mjs`
catches in the L0 lane — now caught outside that lane too, on the default run.

### 5.6 Execution that cannot happen

Three injected defects in one tree — a `bash -c` command, a `..` escape, and
`--no-execute`:

```
[error] replay-not-executed P1-AC-01 | REPLAY `bash -c "echo pass"` was not executed:
   the command contains shell metacharacters; the runner spawns a program directly and
   never a shell, so it is refused rather than executed with a different meaning.
[error] replay-not-executed P1-AC-04 | MODIFIED REPLAY `node ../../../../../etc/passwd`
   was not executed: script `../../../../../etc/passwd` resolves outside the declared
   surface root. An outcome nobody observed is testimony (design §14.1), so it cannot
   support any state.
gaps: [ {subject P1-AC-01, field replay, …}, {subject P1-AC-04, field modified-replay, …} ]
states: P1-AC-01=AGENT VERIFIED …            <- was HUMAN VERIFIED
```

`--no-execute` (for an environment that genuinely cannot spawn): 12 errors, 10
gaps, and **no claim above `AGENT VERIFIED`**. It softens nothing.

---

## 6. Determinism — executing real subprocesses did not cost it

Two runs of the committed fixture, real clock, ten subprocesses each:

```
$ diff z1.json z2.json
5c5
<   "generated_at": "2026-09-23T23:00:15.336Z"
---
>   "generated_at": "2026-09-23T23:00:16.492Z"
content_sha256 equal: true
```

**Byte-identical apart from `generated_at`.** How, given that the brief
allowed durations to be excluded from `content_sha256` instead:

- `duration_ms`, `started_at` and `finished_at` are **not in the manifest at
  all**. They live in the replay ledger (`--replay-ledger <path>`), which is a
  log and says so in its own `note` field. `content_sha256` therefore needs no
  exclusion list beyond `generated_at`, and a diff of two runs shows one line
  rather than twenty-one. The manifest states this in its `replay.timing_excluded`
  field.
- `execution_id` is content-addressed, not run-addressed, so it is stable.
- Captured output is reduced to hashes, byte counts and a **redacted** first
  line: the root path and `cwd` are replaced with `.`, absolute paths with
  `<path>`, and anything `scheme://` with `<url>`. That last one keeps the
  delta's "no absolute URL anywhere in the manifest" true even though output
  now flows into it.

```
$ grep -c -iE '[a-z][a-z0-9+.-]*://' …/surface-manifest.json
0
$ grep -oE '"[^"]*/(mnt|tmp|home)/[^"]*"' …/surface-manifest.json
(no output)
```

The fixture also regenerates byte-identically **from a copy outside the
repository** (with a `VERSION` beside it, per the Verifier's caveat, which the
README now carries):

```
regenerated elsewhere: a8d76b32f476c5e8bb4b5b7bebcddbc027c1280696ec9836af06e8d7d87d3342
committed in-repo    : a8d76b32f476c5e8bb4b5b7bebcddbc027c1280696ec9836af06e8d7d87d3342
```

---

## 7. The committed fixture, after the fixes

```
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --generated-at 2026-09-23T00:00:00.000Z
surface: plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json
  claims 5  evidence 6  pdatasets 2  un-ID'd claim lines 1
  replays: 10 executed, 0 unexecuted  baseline: docs/verification/surface-manifest.json
  P1-AC-01   HUMAN VERIFIED       L3  
  P1-AC-02   AGENT VERIFIED       L1  
  P1-AC-03   NOT VERIFIED         L3  
  P1-AC-04   AGENT VERIFIED       L3  unfalsified failed-to-falsify
  S1-CL-01   HUMAN VERIFIED       L3  
  (un-ID'd)  llm/claims.md:31  "The normalized dataset is published to the project website."
  gaps 0  findings: 0 error, 2 warn, 2 info
EXIT=0
```

Same five verdicts as before the repair — and now every one of them is a
consequence of ten processes that ran. `content_sha256` is
`a8d76b32f476c5e8bb4b5b7bebcddbc027c1280696ec9836af06e8d7d87d3342`.

**Disclosure: I re-baselined the fixture manifest once, deliberately.** Adding
`pdatasets:` lines to the check headers changed their `artifact_sha256`, and
the engine did exactly what §3 says it should — four `artifact-invalidated`
errors and a refusal to overwrite the baseline. I regenerated with
`--no-previous`, which is the honest form of "these artifacts were rebuilt and
re-verified in this change". A Verifier should treat the committed manifest's
provenance as *this build*, not as the previous one.

---

## 8. What I did not touch, and what I know is wrong

```
$ git diff --name-only
plugin/scripts/fixtures/slice/README.md
plugin/scripts/fixtures/slice/checks/ac01-duplicate-rejection.mjs
plugin/scripts/fixtures/slice/checks/ac03-sort-order.mjs
plugin/scripts/fixtures/slice/checks/ac04-transform-runs.mjs
plugin/scripts/fixtures/slice/checks/cl01-record-count.mjs
plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json
plugin/scripts/fixtures/slice/llm/governance/governance-delta.md
plugin/scripts/surface.mjs
# untracked: plugin/scripts/replay.mjs, plugin/scripts/fixtures/slice/human/
```

`plugin/scripts/surface-html.mjs`, `docs/**`, `plugin/scripts/governance-checks*.mjs`
and `llm/**` are untouched. Gates:

```
$ node --check …                       ok on all 11 .mjs files (incl. surface-html.mjs)
$ node plugin/scripts/governance-checks.test.mjs
all regression tests passed
$ grep non-`node:` imports in surface.mjs / replay.mjs → none
```

Two things for other people, neither of them mine to fix:

1. **`docs/verification/index.html` is stale.** It was rendered from the
   pre-repair manifest. I ran the renderer against the new manifest read-only —
   it consumes it without error and already prints the new
   `ceiling_reason` ("MODIFIED REPLAY exited 1 — it failed as it must"), so it
   needs a regeneration, not a code change. `docs/**` is off-limits to me.
2. **`plugin/scripts/README.md` does not mention `replay.mjs`.** Outside my
   permitted paths; one paragraph is owed there.

### Weak points, named by me

- **The `pdatasets:` binding is opt-in.** A check that reads a dataset but
  declares no binding is not invalidated when that dataset changes — its
  replay will usually fail, but "usually" is doing work there. A stricter
  engine would infer bindings from what the process opened; this one cannot
  see that without tracing syscalls.
- **`stdout_first_line` is the one place untrusted output enters the
  manifest.** It is redacted and length-capped, and it is the field I would
  attack first.
- **Execution is trust in the checks themselves.** `surface.mjs` now runs code
  from the tree it is auditing, bounded to `node` and to the declared root. In
  a repo where an attacker can already write `checks/*.mjs` they could already
  write anything; the guard is the boundary, not the absence of execution.
  The `--no-execute` path exists for callers who will not accept that, and it
  refuses to produce a human state rather than pretending.
- **Timeouts are wall-clock.** A check that hangs produces
  `replay-not-executed` after 60s — correct, but 60s × N evidence records is
  the worst case for a large repo. Nothing here is parallelised.

---

## 9. Recommendation to the next Verifier

Attack these first, because they are where I would look:

1. Find a command string that `planCommand` accepts and that does something
   other than run an in-repo check.
2. Find a way to make an evidence record lift a ceiling without both commands
   being executed — `liftBlockedReason` in `surface.mjs` is the single gate,
   and a single gate is a single point of failure.
3. Make the manifest non-deterministic. Two runs, `diff`, anything but
   `generated_at` is a bug.
4. Launder a drift or an invalidation in two runs rather than one.
5. Decide whether §5.3 mechanism 2 means what I implemented in §2.4 — that an
   agent may write a check whose execution lifts a claim — or something
   stricter. That is a reading, and I would rather it were reviewed than
   assumed.
