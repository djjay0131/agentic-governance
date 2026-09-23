# Builder 5 — CI, and the regression suite the slice shipped without

Date: 2026-09-23
Branch: `feat/g3-verification-slice`
Built: `plugin/scripts/surface.test.mjs` (new), `.github/workflows/ci.yml`,
`plugin/scripts/README.md`
Builder: **not a Verifier.** This report is evidence for an independent
Verifier to attack, not a claim that the work is verified.

---

## 0. The one-sentence answer

Three scripts shipped with no CI coverage at all and a critical defect that
independent verification found by flipping one word in one code comment;
`surface.test.mjs` now holds 44 assertions covering every defect in
`VERIFIER-1-REPORT.md`, **every one of them watched failing under an injected
defect before it was kept**, CI runs it, and the two unpinned `@v4` action tags
are now 40-hex commit SHAs resolved from the GitHub API.

| The brief's ten | Where | Assertions | Shown failing by |
|---|---|---|---|
| 1. D1 — the flipped `modified-replay-outcome` | §B | 4 | *believe the `*-outcome:` comment again* |
| 2. The gate is not stuck closed | §B4 | 2 | *scale upside down*; *runner refuses everything*; *ceiling removed* |
| 3. D2 — mutating a bound dataset | §D | 4 | *invalidation toothless*; *stops naming what moved*; *rejected grammar*; *writes the reset* |
| 4. D3 — the baseline is not laundered | §E | 3 + 1 | *default run overwrites the baseline*; *`--accept-baseline-rewrite` ignored* |
| 5. The `L1` cap (L3 strongest → L1 weakest) | §C | 2 | *attested evidence allowed a human state*; *scale upside down* |
| 6. Append-only | §E/§F | 3 | *marker-block mutation unchecked*; *marker history flattened*; *scale upside down* |
| 7. Determinism | §G | 3 | *varying field in the hashed content*; *timings carried into the manifest* |
| 8. No fabrication | §H | 5 | *URL guardrail disabled*; *missing path fabricated*; *URL in a field the guardrail does not inspect*; *dangling locator silent* |
| 9. Un-ID'd claims counted | §I | 2 | *un-ID'd claims silently dropped* |
| 10. `surface-html.mjs` | §K | 6 | *script tag emitted*; *escaping removed*; *URL guardrail disabled*; *unresolved link rendered as a link*; *page stamped with its run time* |

---

## 1. What shipped

### `plugin/scripts/surface.test.mjs` — 44 assertions, 804 lines

Conventions taken from `governance-checks.test.mjs` and matched deliberately:
plain Node, zero dependencies, temp dirs created and removed, one `check()`
helper, `all regression tests passed` on the last line, non-zero exit on
failure. End-to-end throughout — the real `surface.mjs`, `replay.mjs` and
`surface-html.mjs` as subprocesses, over a **copy** of the committed fixture.
Nothing in the suite writes to `plugin/scripts/fixtures/**`; §D asserts that as
a fact rather than a promise, by comparing `llm/claims.md` in the working copy
against the committed original after a run that proposed a reset marker.

Two helpers earn their place beyond the borrowed shape:

- **`edit(root, rel, from, to)` refuses to make an edit that does not match
  exactly once.** This is not fastidiousness. Verifier 1's own `sed` for
  appending a marker to `P1-AC-04` silently also hit `S1-CL-01`, whose marker
  line is byte-identical, and Builder 2 only found out because the engine told
  them. A test whose defect injection quietly misses is a test that passes
  while proving nothing.
- **`readJson` returns an empty-but-shaped manifest when a run wrote
  nothing.** A generator that crashes or refuses to write is a *result*; it
  should turn assertions red with their own names attached, not throw an ENOENT
  stack trace out of the harness. I added this after a mutant crashed the suite
  at case 1 and hid the other 43 answers.

### `.github/workflows/ci.yml`

Two steps added, existing steps and comment style kept:

- **Surface regression tests** — `node plugin/scripts/surface.test.mjs`.
- **Verification surface renders with every link resolving** —
  `node plugin/scripts/surface-html.mjs --out "$RUNNER_TEMP/index.html"`.
  This is the one assertion the suite *cannot* make. The suite works over a
  reconstructed copy of the tree, so only a run against the real repository
  catches a moved or renamed file that the published page cites. It writes to a
  temp path: CI verifies the page, it does not regenerate the committed one.

### `plugin/scripts/README.md`

A new §Other Scripts In This Directory covering `surface.mjs`, `replay.mjs`,
`surface-html.mjs`, both test suites and the fixture; and a correction to
§Allowlist Parsing Convention security property 2 (below).

---

## 2. The standard — what defect did I inject to prove each test can fail?

A test nobody has seen fail is not evidence. So every assertion here was
watched going red.

### 2.1 Method

I could not modify the scripts under test, and would not want the repository to
carry a broken copy even briefly. So: a mutation harness
(scratchpad, not committed) copies `plugin/scripts/**` plus a `VERSION` file
into a temp tree, applies one named defect to the copy by exact-string
substitution (**refusing** if the anchor does not match exactly once), runs the
copied `surface.test.mjs`, and records which assertions went red. **32 mutants**
across three rounds (18 + 12 + 2).

Round 1 left **10 assertions that had never failed**, and that is the whole
point of doing this: at that moment those 10 were decoration. Rounds 2 and 3
were written specifically to kill them, one assertion at a time, and the last
one took three attempts — see the note under the table.

The harness ran against a **stated snapshot** of `plugin/scripts/**`, not the
live tree, because another builder was editing `surface.mjs` while I worked
(§7). The final run is against snapshot `19:42:02`, whose contents are:

```text
38b2a0fae8e879a3c6869b529364a52e77dbbdc26c0044fb2101af229af850c2  surface.mjs
532acab9a653bf3c6fe9240fe58e43fa5d482d3cc84d10706f8e1818effc2684  replay.mjs
27c7be5895db111311afd0527b36bc35def33569a39c962a24ebd705505380b0  surface-html.mjs
0eb24ba95ab6040dab6f37b3dc93dab30ce5a60232e472f3c889a53d0be813ab  surface.test.mjs
```

**`A4` is red in every mutant run below, including the ones where it is not the
target.** That is not harness noise: the committed fixture manifest is stale
against the current `surface.mjs`, which is a real finding and is §7.

### 2.2 Every assertion, and the defect that turned it red

| # | Assertion | The defect that turned it red |
|---|---|---|
| A1 | the committed fixture passes its own default run | delete `checks/ac01-*.mjs`; runner refuses everything; scale upside down; ceiling removed |
| A2 | the five fixture verdicts are exactly what the README documents | the same four |
| A3 | every declared replay is EXECUTED, not believed | runner refuses everything; ceiling removed |
| A4 | the committed manifest is current | perturb the committed `content_sha256`; and see §7 — it is red on the live tree right now |
| B1 | D1: flipping `modified-replay-outcome` does NOT reach HUMAN VERIFIED | **believe the `*-outcome:` comment again**; ceiling removed |
| B2 | D1: the misreported outcome is named | believe the comment; runner refuses everything; ceiling removed |
| B3 | D1: the comment is testimony, the exit status is evidence | believe the comment; runner refuses everything; ceiling removed |
| B4 | D1: a misreport is an error even with no state claimed | believe the comment; runner refuses everything; ceiling removed |
| B5 | a check passing under its own perturbation is `failed-to-falsify` | runner refuses everything; ceiling removed |
| B6 | **the gate OPENS** on a genuinely falsifying L3 check | scale upside down; evidence deleted; runner refuses everything; ceiling removed |
| B7 | the reason names the execution, not the declaration | scale upside down; ceiling removed |
| C1 | L1-only evidence cannot reach HUMAN VERIFIED | **attested ceiling promoted to HUMAN VERIFIED**; ceiling removed |
| C2 | the scale is not inverted (L1 capped in the run where L3 passes) | scale upside down; attested ceiling promoted; evidence deleted |
| D1 | mutating a bound dataset invalidates the claim | invalidation made toothless; ceiling removed |
| D2 | the finding NAMES the identifier and the dataset | drop `${detail}` from the message; ceiling removed |
| D3 | the reset is proposed in the §3.4 grammar, not written to the file | comma grammar the parser rejects; generator appends to `llm/claims.md` |
| D4 | the executed replay fails independently of the hash comparison | believe the comment; runner refuses everything; ceiling removed |
| E1 | a default run REFUSES to overwrite the baseline | refusal removed; ceiling removed |
| E2 | the drift is named and the marker proposed | refusal removed; ceiling removed |
| E3 | repetition does not launder it | refusal removed; ceiling removed |
| E4 | `--accept-baseline-rewrite` does overwrite | the flag ignored; ceiling removed |
| F1 | acknowledging by APPENDING clears it, exit 0 | scale upside down; runner refuses everything; ceiling removed |
| F2 | the prior HUMAN VERIFIED marker is still visible in history | `history: []`; ceiling removed |
| F3 | DELETING a prior marker is `marker-history-mutated` | the check removed; ceiling removed |
| G1 | two runs differ in `generated_at` and nothing else | a nonce in the hashed content; timings in the manifest |
| G2 | `content_sha256` identical across runs | the same two |
| G3 | wall-clock timings are not in the manifest | `manifestRecord` stops stripping `timing` |
| H1 | no absolute URL in the manifest | **a URL in `manifest.bound`, a field the guardrail does not inspect** |
| H2 | the URL guardrail refuses to write (exit 2) | guardrail disabled |
| H3 | a missing path is `missing` with every derived field null | fabricate a local link |
| H4 | a missing path is a finding AND a gap AND in coverage | fabricate a local link |
| H5 | a dangling evidence `locator:` is a finding and a gap | existence check removed |
| I1 | an un-ID'd claim is carried, counted and printed | dropped silently |
| I2 | a second un-ID'd claim is counted too | dropped silently |
| J1 | replay: a real in-root check runs, outcome from exit status | runner refuses everything; evidence deleted |
| J2 | replay: shell metacharacters REFUSED | the boundary removed; runner refuses everything |
| J3 | replay: a script outside the root REFUSED | the boundary removed; runner refuses everything |
| J4 | `--no-execute` produces gaps and lifts nothing above AGENT VERIFIED | `--no-execute` softened into a pass |
| K1 | html: an unresolved link is reported and rendered as a gap marker | rendered as an ordinary link; evidence deleted |
| K2 | html: creating the reported paths clears every unresolved link | escaping mutant (it changes the rendered bytes) |
| K3 | html: two runs are byte-identical | page stamped with its own run time |
| K4 | html: no `<script>` and no absolute URL | a `<script>` tag emitted with the guardrail off |
| K5 | html: an absolute URL in the manifest is refused, no page written | guardrail disabled |
| K6 | html: a `<script>` in claim text is escaped | script tag emitted; HTML escaping removed |

Two entries deserve a note rather than a footnote.

**`H1`** is the only assertion no *product* mutant could kill.
`surface.mjs`'s guardrail inspects `view_url` and `download_url`, not the
serialized document — Verifier 1 recorded that narrowness as D10 and it is
unfixed. The mutant that turns H1 red puts a URL in `manifest.bound`, which the
guardrail never reads and the assertion does. So the test covers strictly more
than the guardrail does, which is what the delta's sentence "no absolute URL may
appear anywhere in the generated manifest" actually says. If D10 is ever closed,
H1 is already there waiting.

**`C1`** took three attempts, and the two failures are the more interesting
result. Inverting `const DETERMINISM = ['L1','L2','L3']` changes nothing,
because the cap keys on `=== 'L1'` and not on that array's index. Removing the
`L1` branch from `liftBlockedReason` *still* caps the claim, because
`if (!e.replay) return …` catches an attestation next. That is defence in depth
and a good property of the engine; it also meant that for two rounds C1 was
decoration. The honest mutant promotes the attested-only ceiling directly.

### 2.3 Verbatim: the critical one

The defect is Verifier 1 item 10, restated as a code mutation — make
`surface.mjs` believe the `*-outcome:` comment again:

```diff
-        const observed = exec.outcome;   // null unless a real process exited
+        const observed = attested !== 'unrecorded' ? attested : exec.outcome;
```

Verbatim, and this is the point of the whole exercise — under the mutant the
vacuous check reaches `HUMAN VERIFIED` with **0 error and exit 0**, exactly as
Verifier 1 reported, and the four D1 assertions go red:

```text
PASS  the committed fixture passes its own default run (0 error, exit 0)
PASS  the five fixture verdicts are exactly what the fixture README documents
PASS  every declared replay is EXECUTED, not believed
FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
      regenerated 85e0ff3840e04e052399973e07c7429d52d5e9c1f96e4b8b53b77afe028bb8c8
FAIL  D1: flipping `modified-replay-outcome` does NOT reach HUMAN VERIFIED
      exit=0 state=HUMAN VERIFIED
      surface: ../../../../../surface-FHnHjm/b1.json
        claims 5  evidence 6  pdatasets 2  un-ID'd claim lines 1
        replays: 10 executed, 0 unexecuted  baseline: docs/verification/surface-manifest.json DISCARDED (--no-previous)
        P1-AC-01   HUMAN VERIFIED       L3  
        P1-AC-02   AGENT VERIFIED       L1  
        P1-AC-03   NOT VERIFIED         L3  
        P1-AC-04   HUMAN VERIFIED       L3  
        S1-CL-01   HUMAN VERIFIED       L3  
        (un-ID'd)  llm/claims.md:32  "The normalized dataset is published to the project website."
        headline: 1/5 claims L1-only (attested, can never reach HUMAN VERIFIED)  ·  3/5 at HUMAN REVIEWED+ with no corroborated human producer
        gaps 0  findings: 0 error, 4 warn, 1 info
      
FAIL  D1: the misreported outcome is named — `replay-outcome-misreported`
      warn baseline-discarded previous
      warn human-state-on-agent-evidence P1-AC-01
      warn human-state-on-agent-evidence P1-AC-04
      warn human-state-on-agent-evidence S1-CL-01
      info l1-only P1-AC-02
FAIL  D1: the comment is recorded as testimony and the exit status as evidence
      {
       "command": "node checks/ac04-transform-runs.mjs --perturb accept-duplicates",
       "cwd": "plugin/scripts/fixtures/slice",
       "expect": "fail",
       "attested_outcome": "fail",
       "recorded_outcome": "fail",
       "outcome_source": "executed",
       "as_expected": true,
       "execution": {
        "schema": "replay-record/v1",
        "command": "node checks/ac04-transform-runs.mjs --perturb accept-duplicates",
        "cwd": "plugin/scripts/fixtures/slice",
        "artifact": "checks/ac04-transform-runs.mjs",
        "artifact_sha256": "c51ed357bf372cbbfb87fba63d158bc8ad45c19e2c819129e913d6bd528a5651",
        "executed": true,
        "unexecuted_reason": null,
        "exit_status": 0,
        "signal": null,
        "timed_out": false,
        "outcome": "pass",
        "outcome_source": "executed",
        "failure_shape": null,
        "stdout_sha256": "9b992cf4236d5bc12ddb06bdf8ff291b781747158c5585f2de9ff9bada2d9a79",
        "stderr_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "stdout_bytes": 98,
        "stderr_bytes": 0,
        "stdout_first_line": "PASS P1-AC-04 MODIFIED REPLAY (--perturb accept-duplicates): the transformation ran to completion",
        "execution_id": "371cec3ec2190232f464f91dbc03e4db0990d3f43e1e52e07deb2c06125476c9"
       },
       "perturbation": "stop rejecting duplicate source ids in the transformation"
      }
FAIL  D1: a misreported outcome is an error even with no state being claimed
      exit=0
      warn baseline-discarded previous
      warn human-state-on-agent-evidence P1-AC-01
      warn human-state-on-agent-evidence S1-CL-01
      info l1-only P1-AC-02
```

Read the third block closely. `recorded_outcome` says `"fail"` while the
execution record beneath it says `"exit_status": 0, "outcome": "pass"`. The
mutant made the *derived* field believe the comment; the execution record still
tells the truth, which is why the assertion can see the difference at all.

### 2.4 Verbatim: every mutant's red list

**Round 1 — 18 mutants**

```text
### D1: believe the `*-outcome:` comment again (the original critical defect)
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  D1: flipping `modified-replay-outcome` does NOT reach HUMAN VERIFIED
  FAIL  D1: the misreported outcome is named — `replay-outcome-misreported`
  FAIL  D1: the comment is recorded as testimony and the exit status as evidence
  FAIL  D1: a misreported outcome is an error even with no state being claimed
  FAIL  D2: the executed replay fails independently of the hash comparison
  exit=1

### Invert the determinism scale (L1 strongest, L3 weakest)
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  exit=1

### D2: artifact invalidation recorded but toothless
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  D2: mutating a bound dataset invalidates the claim it carried
  exit=1

### D3: the default run overwrites the baseline it contradicts
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  D3: a default run after a claim-text edit REFUSES to overwrite the baseline
  FAIL  D3: the drift is named and the §3.5 marker to append is proposed
  FAIL  D3: repetition does not launder it — the second run refuses identically
  exit=1

### D4: marker-block mutation unchecked
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  append-only: DELETING a prior marker line is caught as `marker-history-mutated`
  exit=1

### Determinism: a varying field in the hashed content
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  two runs over identical inputs differ in `generated_at` and nothing else
  FAIL  content_sha256 is identical across runs, even though real processes ran
  exit=1

### Determinism: wall-clock timings carried into the manifest
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  two runs over identical inputs differ in `generated_at` and nothing else
  FAIL  content_sha256 is identical across runs, even though real processes ran
  FAIL  wall-clock timings are not in the manifest at all
  exit=1

### The absolute-URL guardrail disabled (surface.mjs)
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  the URL guardrail refuses to write the manifest at all (exit 2)
  exit=1

### A missing declared path fabricated into a working link
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  a missing declared path resolves to `missing` with every derived field null
  FAIL  a missing declared path is a finding AND a gap AND in coverage — never silence
  exit=1

### Un-ID'd claims silently dropped
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  an un-ID'd claim is carried, counted and printed
  FAIL  a second un-ID'd claim is counted too — the tally is derived, not fixed
  exit=1

### replay.mjs: the execution boundary removed (shell + path escape allowed)
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  replay: a command with shell metacharacters is REFUSED, never executed
  FAIL  replay: a script resolving outside the surface root is REFUSED
  exit=1

### replay.mjs: a runner that refuses EVERYTHING
  FAIL  the committed fixture passes its own default run (0 error, exit 0)
  FAIL  the five fixture verdicts are exactly what the fixture README documents
  FAIL  every declared replay is EXECUTED, not believed
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  D1: the misreported outcome is named — `replay-outcome-misreported`
  FAIL  D1: the comment is recorded as testimony and the exit status as evidence
  FAIL  D1: a misreported outcome is an error even with no state being claimed
  FAIL  a check that passes under its own perturbation is reported `failed-to-falsify`
  FAIL  the gate OPENS: a genuinely falsifying L3 check reaches HUMAN VERIFIED, exit 0
  FAIL  the reason names the execution, not the declaration
  FAIL  the scale is not inverted: L1 is capped in the same run in which L3 passes
  FAIL  D2: the executed replay fails independently of the hash comparison
  FAIL  append-only: acknowledging the drift by APPENDING clears it, exit 0
  FAIL  replay: a real in-root check runs and its outcome comes from the exit status
  FAIL  replay: a command with shell metacharacters is REFUSED, never executed
  FAIL  replay: a script resolving outside the surface root is REFUSED
  exit=1

### surface-html.mjs: escaping and the script guardrail both removed
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  html: an unresolved link is reported, rendered as a gap marker, and sets exit 1
  FAIL  html: creating exactly the reported paths clears every unresolved link, exit 0
  exit=1

### surface-html.mjs: the absolute-URL guardrail disabled
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  html: an absolute URL in the manifest is refused, and no page is written
  exit=1

### surface-html.mjs: an unresolved link rendered as an ordinary link
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  html: an unresolved link is reported, rendered as a gap marker, and sets exit 1
  exit=1

### surface-html.mjs: the page stamped with its own run time
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  html: two runs over an unchanged manifest are byte-identical
  exit=1

### Fixture defect: the evidence a HUMAN VERIFIED claim rests on is deleted
  FAIL  the committed fixture passes its own default run (0 error, exit 0)
  FAIL  the five fixture verdicts are exactly what the fixture README documents
  FAIL  every declared replay is EXECUTED, not believed
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  the gate OPENS: a genuinely falsifying L3 check reaches HUMAN VERIFIED, exit 0
  FAIL  the scale is not inverted: L1 is capped in the same run in which L3 passes
  FAIL  replay: a real in-root check runs and its outcome comes from the exit status
  FAIL  html: an unresolved link is reported, rendered as a gap marker, and sets exit 1
  exit=1

### Fixture defect: the committed manifest is stale
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  exit=1
```

**Round 2 — 12 mutants, aimed at the assertions round 1 left untouched**

```text
### The `L1` cap removed (attestation can carry a human state)
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  exit=1

### The determinism scale implemented upside down (`L3` treated as the weakest)
  FAIL  the committed fixture passes its own default run (0 error, exit 0)
  FAIL  the five fixture verdicts are exactly what the fixture README documents
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  the gate OPENS: a genuinely falsifying L3 check reaches HUMAN VERIFIED, exit 0
  FAIL  the reason names the execution, not the declaration
  FAIL  the scale is not inverted: L1 is capped in the same run in which L3 passes
  FAIL  append-only: acknowledging the drift by APPENDING clears it, exit 0
  exit=1

### The invalidation finding stops naming what moved
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  D2: the finding NAMES the identifier and the dataset that moved
  exit=1

### The proposed reset marker uses a grammar the parser would reject
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  D2: the reset marker is proposed in the §3.4 grammar, not written into the claims file
  exit=1

### The generator WRITES the reset into the claims file instead of proposing it
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  D2: the reset marker is proposed in the §3.4 grammar, not written into the claims file
  exit=1

### Marker history flattened to the current marker only
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  append-only: the prior HUMAN VERIFIED marker is still visible in history
  exit=1

### `--accept-baseline-rewrite` ignored — the refusal has no way out
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  D3: --accept-baseline-rewrite does overwrite — the refusal has a stated way out
  exit=1

### An absolute URL in a manifest field the guardrail does not inspect
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  no absolute URL appears in the manifest under `Pages mechanism: none`
  exit=1

### A dangling evidence `locator:` reported silently
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  a dangling evidence locator is a finding and a gap
  exit=1

### `--no-execute` softened into a pass
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  --no-execute produces gaps and errors, and lifts no claim above AGENT VERIFIED
  exit=1

### surface-html.mjs: a <script> tag emitted, guardrail off
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  html: the page emits no <script> and no absolute URL
  FAIL  html: a <script> tag in claim text is escaped, never emitted as markup
  exit=1

### surface-html.mjs: HTML escaping removed, guardrail off
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  html: a <script> tag in claim text is escaped, never emitted as markup
  exit=1
```

**Round 4 — 2 mutants, aimed at the last one**

```text
### `L1` attested evidence allowed to carry a human state
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  L1-only evidence cannot reach HUMAN VERIFIED — the asserted state is REFUSED
  FAIL  the scale is not inverted: L1 is capped in the same run in which L3 passes
  exit=1

### The evidence ceiling removed entirely (nothing blocks a lift)
  FAIL  the committed fixture passes its own default run (0 error, exit 0)
  FAIL  the five fixture verdicts are exactly what the fixture README documents
  FAIL  every declared replay is EXECUTED, not believed
  FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
  FAIL  D1: flipping `modified-replay-outcome` does NOT reach HUMAN VERIFIED
  FAIL  D1: the misreported outcome is named — `replay-outcome-misreported`
  FAIL  D1: the comment is recorded as testimony and the exit status as evidence
  FAIL  D1: a misreported outcome is an error even with no state being claimed
  FAIL  a check that passes under its own perturbation is reported `failed-to-falsify`
  FAIL  the gate OPENS: a genuinely falsifying L3 check reaches HUMAN VERIFIED, exit 0
  FAIL  the reason names the execution, not the declaration
  FAIL  L1-only evidence cannot reach HUMAN VERIFIED — the asserted state is REFUSED
  FAIL  the scale is not inverted: L1 is capped in the same run in which L3 passes
  FAIL  D2: mutating a bound dataset invalidates the claim it carried
  FAIL  D2: the finding NAMES the identifier and the dataset that moved
  FAIL  D2: the reset marker is proposed in the §3.4 grammar, not written into the claims file
  FAIL  D2: the executed replay fails independently of the hash comparison
  FAIL  D3: a default run after a claim-text edit REFUSES to overwrite the baseline
  FAIL  D3: the drift is named and the §3.5 marker to append is proposed
  FAIL  D3: repetition does not launder it — the second run refuses identically
  FAIL  append-only: acknowledging the drift by APPENDING clears it, exit 0
  FAIL  append-only: the prior HUMAN VERIFIED marker is still visible in history
  FAIL  D3: --accept-baseline-rewrite does overwrite — the refusal has a stated way out
  FAIL  append-only: DELETING a prior marker line is caught as `marker-history-mutated`
  exit=1
```

### 2.5 The passing suite

<!-- VERBATIM-GREEN -->

---

## 3. Two tests that exist so the suite cannot prove the wrong thing

**A suite made only of refusals would pass on a tool that refuses
everything.** Mutant M12 is exactly that tool — `planCommand` returns a refusal
for every command — and it takes 16 assertions down with it, including all four
control assertions. That is the property I wanted: the suite is not satisfiable
by a permanently-closed gate.

Positively:

- **§B4 — the gate opens.** Same tree as the D1 test, same appended
  `HUMAN VERIFIED` marker, one difference: the check is made *genuinely
  falsifying* (it asserts the output holds no duplicate ids, so the
  `accept-duplicates` perturbation really does break it). `P1-AC-04` reaches
  `HUMAN VERIFIED` with zero errors and exit 0, and `ceiling_reason` names the
  execution: `MODIFIED REPLAY exited 1 — it failed as it must`. The two cases
  are a modified replay of each other: they differ by exactly the thing under
  test.
- **§E4 — the baseline refusal has a stated way out.**
  `--accept-baseline-rewrite` really does overwrite. Without this, a
  `surface.mjs` that refused every write would pass §E1–E3.

---

## 4. The determinism scale is not inverted, and the suite can tell

`L3` deterministic (strongest) → `L2` → `L1` attested (weakest). The pair in §C
runs in **one invocation**: `P1-AC-02`, whose only evidence is the agent's prose
attestation, is refused at `AGENT VERIFIED` with `best_determinism: "L1"`, while
in the same manifest `P1-AC-01` reaches `HUMAN VERIFIED` with
`best_determinism: "L3"`. Invert the implementation (mutant M13,
`e.determinism === 'L1'` → `'L3'`) and seven assertions go red, C2 among them,
while the naive "L1 is capped" assertion on its own would have survived. That is
why the assertion is written as a pair rather than as two independent checks.

---

## 5. CI

```yaml
      - name: Surface regression tests
        run: node plugin/scripts/surface.test.mjs
      - name: Verification surface renders with every link resolving
        run: node plugin/scripts/surface-html.mjs --out "$RUNNER_TEMP/index.html"
```

Runtime of the suite on this machine: **~14 s**, and it spawns roughly 200 real
subprocesses doing it (10 replays × ~20 generator invocations). Nothing is
parallelised and nothing needs to be.

### The action pins

`actions/checkout@v4` and `actions/setup-node@v4` were mutable tags. A tag is a
promise; the owner can repoint `v4` at any commit. `llm/memory_bank/activeContext.md`
already carries this as an open portfolio-wide supply-chain gap ("Actions are
pinned by mutable tag (`actions/checkout@v4`) everywhere except `website`"), and
this repository is the canon — a canon that does not do the thing it prescribes
is not evidence the thing works.

Resolved from the GitHub API, not transcribed:

```console
$ curl -sS https://api.github.com/repos/actions/checkout/git/ref/tags/v4
  "object": { "sha": "11d5960a326750d5838078e36cf38b85af677262", "type": "commit" }
$ curl -sS https://api.github.com/repos/actions/setup-node/git/ref/tags/v4
  "object": { "sha": "49933ea5288caeca8642d1e84afbd3f7d6820020", "type": "commit" }
```

Both refs are `type: commit`, so no annotated-tag dereference was needed, and
both are the commit tagged **v4.4.0**:

```console
$ curl -sS https://api.github.com/repos/actions/checkout/tags?per_page=100
['v4.4.0', 'v4']
$ curl -sS https://api.github.com/repos/actions/setup-node/tags?per_page=100
['v4.4.0', 'v4']
```

```yaml
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
```

Both are 40 hex characters, asserted mechanically rather than by eye, and the
file parses as YAML with its six steps intact. The trailing comment is `v4.4.0`
rather than `v4` because the exact release is what a reader needs in order to
decide whether to bump; `v4` is where it came from and is recorded in the
comment block above the steps.

---

## 6. `plugin/scripts/README.md`

### The correction that was owed

§Allowlist Parsing Convention, security property 2, described shape constraints
as paired-diff without exception:

> **Paired-diff shape constraints.** `checkbox-only` and `link-target-only`
> require every removed line to pair 1:1 with an added line …

The sixth shape contradicts that. `verification-marker` is **append-only**
(design §3.5: "Removal is a violation, and it is mechanically checkable"), so it
permits added lines and refuses every removed *or rewritten* one — including
precisely the 1:1 replacement every paired shape allows. Rewriting
`— AGENT VERIFIED (PR #22, …)` into `— AGENT VERIFIED (PR #99, …)` is a legal
paired diff and an illegal marker edit, and that difference is the reason the
shape exists. The README now says so, names the second half of the rule (a
`HUMAN VERIFIED` / `HUMAN REVIEWED` append is refused in a lane where an AI role
may merge), and states the trade the shape imposes: declaring it over a file
buys append-only enforcement and gives up in-lane checkbox flips on that file.
`governance-checks.test.mjs` already asserts both halves; the README now points
at that instead of asserting it a second time.

### The paragraphs `replay.mjs` and `surface.mjs` were owed

A new §Other Scripts In This Directory, because the file's own title and Purpose
scope it to `governance-checks.mjs` and the directory has quietly grown to six
programs. One paragraph each for `surface.mjs` (what it computes, that a state
above the ceiling is *refused* rather than annotated, that the outcomes come
from executed processes, that the committed manifest is its own baseline and
will not be overwritten while contradicted, and the determinism claim),
`replay.mjs` (the execution record, that an unrunnable command is never a pass,
and the five bounds on execution), `surface-html.mjs` (`Renderer: none`, the
`MISSING ON DISK` gap marker, and the two guardrails enforced on emitted bytes),
the two test suites, and the fixture — including the standing instruction not to
"fix" `ac04`.

I did not restate policy that lives elsewhere; §Purpose's rule that "policy
itself lives in `llm/governance/…` and is not restated here" applies to the
design spec too, so the new section cites section numbers rather than
paraphrasing them.

---

## 7. Disclosure — `surface.mjs` was being edited while I tested

`plugin/scripts/surface.mjs` was being rewritten by another builder for the
whole of my session — six saves between 19:28 and 19:42, still in progress when
I finished. Two consequences, both stated rather than worked around:

**1. At 19:31 the file was syntactically fine and semantically broken.** A call
to `commandInputPaths(cmd)` had landed without its definition, so
`surface.mjs` threw `ReferenceError` on any tree whose replay outcomes
disagreed. My suite went red with 20 assertions and one uncaught ENOENT. I did
not touch the file — it is not mine — and waited. It settled at 19:33 and again
at 19:37 and 19:42. **That crash is also the reason `readJson` and `replay`
now return empty shapes instead of throwing**: the first time it happened the
harness died at case 1 and hid the other 43 answers. A test suite that cannot
report on a broken tool is a test suite that goes quiet exactly when it matters.

**2. `A4` is red on the live tree, and the finding is real.** The current
`surface.mjs` emits six manifest fields the committed fixture manifest predates:

```text
.verification.claims[].evidence[].produced_by.class_source
.verification.claims[].evidence[].replay.execution.failure_shape
.verification.claims[].evidence[].modified_replay.execution.failure_shape
.verification.claims[].crashed_modified_replays
.verification.coverage.human_state_uncorroborated_producer
.verification.coverage.crashed_modified_replays
```

```text
regenerated 85e0ff3840e04e052399973e07c7429d52d5e9c1f96e4b8b53b77afe028bb8c8
committed   a8d76b32f476c5e8bb4b5b7bebcddbc027c1280696ec9836af06e8d7d87d3342
```

Nothing is *wrong* with the tree — the default run still reports 0 errors and
exit 0, the five verdicts are unchanged, and no claim is invalidated. The
manifest is simply older than the generator. But **the committed manifest is its
own drift baseline** (§5.5), so a stale one silently disarms drift and
artifact-invalidation detection for every later run, which is precisely the
class of defect `A4` exists to catch. It caught one on its first day.

**I did not fix it.** `plugin/scripts/fixtures/**` is outside my permitted
paths, and the re-baseline belongs to whoever is changing the generator — it is
the same disclosure Builder 2 made in their §7 ("I re-baselined the fixture
manifest once, deliberately"). One command closes it:

```sh
node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice
```

**Until that runs, CI is red**, on this one assertion, for a true reason. I would
rather hand over a red build with a named cause than a green one with a test
deleted.

A last caveat on my own evidence: every mutation result in §2 is against a
snapshot, and `surface.mjs` has changed since — the snapshot hash is in §2.1 so
the run can be reproduced rather than trusted. Two mutants that killed
assertions in an earlier round stopped killing them against the newer
`surface.mjs` (the `DETERMINISM` array inversion, and one malformed
`surface-html` escaping mutant), which is why the table names the mutants that
work now rather than the ones that worked first.

---

## 8. What I did not do, and what I know is weak

**Not touched:** `surface.mjs`, `replay.mjs`, `surface-html.mjs`,
`governance-checks*.mjs`, `plugin/scripts/fixtures/**`, `docs/**`, `llm/**`. No
`git commit`, no `git push`, no `gh` mutation; the only network calls were two
read-only GitHub API tag lookups.

Named weak points, so a Verifier does not have to find them first:

- **The suite asserts behaviour, not the absence of the defects' causes.** It
  proves `HUMAN VERIFIED` is refused in the eight situations the report found.
  It does not prove there is no ninth. Mutant M12 is the closest thing to a
  general argument and it is not a proof.
- **The `--out`-relative page invocation is embedded in the rendered HTML**, so
  `surface-html.mjs` is byte-identical only for a fixed `--out`. §K compares two
  renders to the *same* path. Rendering to two different paths differs on one
  line, which is correct and is not what the determinism claim is about — but a
  reader could misread §K as stronger than it is.
- **§K reconstructs a repo-shaped tree** (fixture under
  `plugin/scripts/fixtures/slice`, plus empty files at the paths the renderer
  reports missing) rather than using the real repository. It therefore proves
  link resolution over a synthetic tree; the CI step covers the real one. The
  reconstruction is self-adapting — it materialises exactly the paths the
  renderer *named* — so it does not hard-code the set of off-fixture links, and
  if the renderer starts citing a new repo file the suite still passes.
- **§A4 compares a regeneration against the committed manifest's own
  `content_sha256`** rather than a literal. That makes it robust to legitimate
  fixture edits, at the cost of not catching a fixture and manifest that were
  regenerated together into a *wrong* state. Catching that is the Verifier's
  job, not a hash's.
- **Runtime is real execution.** The suite spawns ~200 processes. On a runner
  where `node` cannot spawn, it fails rather than skipping — deliberately, but
  it is a hard dependency the governance checks do not have.
- **`edit()`'s anchors are literal strings from the committed fixture.** A
  legitimate reword of `llm/claims.md` will throw `expected exactly 1
  occurrence` rather than silently testing nothing. That is the failure mode I
  want, but it means fixture edits and this file move together.

## 9. Recommendation to the next Verifier

1. Find an assertion in §2.2 whose named mutant does not actually turn it red —
   the table is the claim most worth attacking, and the harness that produced it
   is gone (scratchpad), so it has to be reproduced rather than trusted.
2. Construct a `surface.mjs` defect that reaches `HUMAN VERIFIED` and that all
   44 assertions survive. That is the ninth situation §8 admits may exist.
3. Check the §K reconstruction against the real repository layout: if
   `surface-html.mjs` ever cites a file the manifest does not name, the
   self-adapting step would paper over it.
4. Decide whether the CI renderer step belongs in CI at all, or whether
   `docs/verification/index.html` should be regenerated and committed by a
   scheduled job instead — Builder 2 flagged it stale and nobody owns it.
