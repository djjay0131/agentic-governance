# Builder 8 — defects D1, D2, D3, D5 and Item 10 from `VERIFIER-2-REPORT.md`

Date: 2026-09-23
Branch: `feat/g3-verification-slice`
Changed: `plugin/scripts/surface.mjs`, `plugin/scripts/replay.mjs` — and nothing else.
Method: every attack run against a **copy** of the fixture in a scratchpad. The
committed fixture was not mutated. No `git commit`, no `git push`, no `gh`.

---

## 0. The one-sentence answer

The guard and the parser are now one function, so a *mention* no longer buys a
claim somebody else's falsification; a MODIFIED REPLAY that crashes is refused
as a falsification; and `--no-previous` over an existing baseline is either
refused or recorded, so a re-baseline is no longer byte-indistinguishable from
a first run. **One thing does not change and must be read as still open:** a
*well-formed second declaration* still borrows a check, because §6.1's
many-to-many relation makes that representable by design (§2.4 below).

| Defect | Status |
|---|---|
| **D1** — a mention satisfies the citation guard | **closed** for the mention case; the well-formed-declaration case (§2d) remains open and is now louder, not silent |
| **D3** — a crash graded as a falsification | **closed**, with a control proving the gate still opens |
| **D2** — the drift-laundering lane | **closed**; lineage now propagates; finding on the committed manifest in §4.3 |
| **D5** — `produced_by.class` self-attested | **disclosed**, not verified — it cannot be verified here, and §5 says why |
| **Item 10** — severity of `human-state-on-agent-evidence` | **done**: `warn`, widened so its subject cannot delete it, second headline metric |
| D4, D6, D7, D8 | **not touched** — out of this assignment. §7. |

**One suite assertion is red in the repo as I leave it, by construction.** The
fixture's committed manifest is a *generated* artifact of `surface.mjs`, and
these fixes change what the generator emits. `fixtures/**` is off-limits to me,
so I could not refresh it. §6 proves the suite is otherwise green and gives the
exact one-line regeneration.

---

## 1. What I did not regress

Re-verified after the change, all of it:

- **The sandbox: 16 escape attempts, 16 refused, 0 executed.** All six classes
  from the Verifier's §3 — metacharacters, `..`, a file symlink, a **directory**
  symlink, an absolute path, a path argument, non-`node` interpreters,
  `node` with no script. `planCommand()` is untouched by this change.
- **Determinism, byte-for-byte, real clock, real subprocesses.** Two runs over
  the committed fixture differ in `generated_at` and nothing else
  (`differing lines: 2`, i.e. one line).
- **The human-authored check is still uncoupled.** With `transform.mjs` deleted
  from a copy: `human/cl01-independent-relationship.mjs` exits 0, its
  perturbation exits 1, and the agent's `checks/cl01-record-count.mjs` cannot
  load. I added nothing to it and imported nothing from it.
- `governance-checks.test.mjs`: **all regression tests passed**.

---

## 2. D1 — the guard and the parser are now one function

### 2.1 The mismatch, removed

There were two spellings of one concept. There is now one, and both readers go
through it (`surface.mjs`, `declaredEvidenceClaimId()`):

```js
function declaredEvidenceClaimId(line) {
  const m = EVIDENCE_RE.exec(stripComment(line));
  return m ? m[1] : null;
}
```

The parser that builds an evidence record calls it per line. `artifactCitesClaim()`
calls it per line. The unanchored `new RegExp('EVIDENCE\\s+' + claimId + ...)`
substring search is gone. **A mention is not a declaration**, and there is no
longer a second place where that could be decided differently.

### 2.2 The attack, reproduced against the unfixed engine

`checks/ac04-transform-runs.mjs` — the fixture's deliberately vacuous check —
with `locator:`, `replay:` and `modified-replay:` repointed at
`checks/ac01-duplicate-rejection.mjs`; one comment line appended to `ac01`:

```js
// (context: EVIDENCE P1-AC-04 is discussed in the handoff, not asserted here)
```

and `— HUMAN VERIFIED (PR #99, 2026-09-23)` appended to `P1-AC-04`'s marker.

```
$ node plugin/scripts/surface.mjs --root .../d1 --out .../d1-before.json --no-previous
  claims 5  evidence 6  pdatasets 2  un-ID'd claim lines 1
  replays: 8 executed, 0 unexecuted  baseline: none
  P1-AC-01   HUMAN VERIFIED       L3
  P1-AC-02   AGENT VERIFIED       L1
  P1-AC-03   NOT VERIFIED         L3
  P1-AC-04   HUMAN VERIFIED       L3
  S1-CL-01   HUMAN VERIFIED       L3
  gaps 0  findings: 0 error, 0 warn, 3 info
EXIT=0

state HUMAN VERIFIED | ceiling HUMAN VERIFIED
unfalsified False | failed_to_falsify []
cov unfalsified [] | cov f2f []
locator checks/ac01-duplicate-rejection.mjs  matches True  cites True  lifts True
```

Exit 0, zero warnings, and the vacuity evidence deleted from the manifest, from
coverage and from the page. Exactly the Verifier's §2c.

### 2.3 The same attack, same copy, against the fix

```
$ node plugin/scripts/surface.mjs --root .../d1 --out .../d1-after.json --no-previous
  claims 5  evidence 6  pdatasets 2  un-ID'd claim lines 1
  replays: 8 executed, 0 unexecuted  baseline: docs/verification/surface-manifest.json DISCARDED (--no-previous)
  P1-AC-01   HUMAN VERIFIED       L3
  P1-AC-02   AGENT VERIFIED       L1
  P1-AC-03   NOT VERIFIED         L3
  P1-AC-04   AGENT VERIFIED       L3  unfalsified
  S1-CL-01   HUMAN VERIFIED       L3
  (un-ID'd)  llm/claims.md:32  "The normalized dataset is published to the project website."
  headline: 1/5 claims L1-only (attested, can never reach HUMAN VERIFIED)  ·  2/5 at HUMAN REVIEWED+ with no corroborated human producer
  gaps 0  findings: 2 error, 4 warn, 1 info
EXIT=1

  error replay-artifact-does-not-cite-claim P1-AC-04
  error state-cap-violation                P1-AC-04
  warn  baseline-discarded                 previous
  warn  human-state-on-agent-evidence      P1-AC-01
  warn  human-state-on-agent-evidence      S1-CL-01
  warn  unfalsified                        P1-AC-04
  info  l1-only                            P1-AC-02

state AGENT VERIFIED | ceiling AGENT VERIFIED
unfalsified True | the only modified replay that failed executed another claim's artifact
cov.unfalsified ['P1-AC-04']
cites False  lifts False
blocked: the executed artifact does not cite this claim (design §6.1)
```

`P1-AC-04` **keeps `unfalsified`** and **does not reach `HUMAN VERIFIED`**, at
exit 1.

Three changes produce that, and the second is the one the citation fix alone
would have missed:

1. **The citation guard is strict.** `cites_claim` is `False`, so the record
   cannot lift the ceiling, and the asserted `HUMAN VERIFIED` is capped.
2. **A non-binding record can no longer FALSIFY either.** With only the guard
   fixed, `P1-AC-04` would have been capped *and still lost `unfalsified`*: the
   borrowed check's modified replay does fail, and the old `falsifying` filter
   counted it. A record that executes somebody else's artifact is not testimony
   about this claim **in either direction**, so `falsifying` now requires
   `executed_artifact_matches_locator !== false && executed_artifact_cites_claim !== false`.
   That is what restores the row the Verifier told me to read.
3. **`replay-artifact-mismatch` and `replay-artifact-does-not-cite-claim` are
   now `error`, not `warn`.** They already meant "this record cannot lift the
   ceiling"; they now also mean "this record cannot falsify". A fact with that
   much weight has to be visible at the exit code, which is the only signal a
   CI gate reads.

### 2.4 What remains open, and why — the Verifier's §2d

I ran §2d against the fix. It still works, and I am reporting it as open:

```
$ node plugin/scripts/surface.mjs --root .../d2d --out .../d2d.json --no-previous
  P1-AC-04   HUMAN VERIFIED       L3  failed-to-falsify
  headline: 1/5 claims L1-only  ·  3/5 at HUMAN REVIEWED+ with no corroborated human producer
  gaps 0  findings: 0 error, 5 warn, 1 info
EXIT=0
```

Appending a **well-formed** `EVIDENCE P1-AC-04` block to `ac01` — no `locator:`
trick, no loose comment — declares a second, legitimate-looking evidence record
for `P1-AC-04` that is declared in `ac01`, whose locator *is* `ac01` and whose
replay *is* `ac01`. Every identity check passes because every identity check is
satisfied. §6.1's many-to-many relation makes this representable **by design**,
and no static check can know that `ac01`'s duplicate-rejection assertions say
nothing about "the transformation runs to completion". I did not try to close
it and I do not think it can be closed mechanically in this engine.

What did change is that **2c is no longer strictly worse than 2d**. 2c used to
*erase* the vacuity signal; it now produces two errors and exit 1. 2d leaves the
real vacuous check executed and visible (`failed-to-falsify`, `unfalsified`) and
raises the second headline metric from 2/5 to 3/5. The borrowing is not refused,
but it is no longer free of trace.

I deliberately did **not** add the Verifier's third suggested rule — an `error`
when the executed artifact differs from `declared_in`. It does not catch 2d
(there, `declared_in` *is* the executed artifact), and it would fire on the
legitimate shape where one file declares evidence whose locator is a sibling.
It would have bought noise, not coverage.

---

## 3. D3 — a crash is no longer a falsification

### 3.1 The discriminator, now read

`replay.mjs` records **which kind** of failure a non-zero exit was:

```js
function failureShape(status, stdout, stderr) {
  if (status === 0) return null;
  return stdout.length === 0 && stderr.length > 0 ? 'crashed' : 'asserted';
}
```

It is a property of the observed streams, not of the stderr text: parsing a
stack trace would make the grade a function of Node's diagnostic wording. It
errs toward `'crashed'`, because the safe reading of an ambiguous failure is
that nothing was falsified.

`surface.mjs` then refuses to lift on `'crashed'` (`liftBlockedReason`), excludes
crashed records from `falsifying`, raises `error modified-replay-failed-to-run`,
and records `crashed_modified_replays` per claim and in `coverage`.

### 3.2 The crash case — the Verifier's `P1-AC-08`

A check taking its dataset as an argument; its MODIFIED REPLAY names
`data/source-perturbed.csv`, which was never committed. `— HUMAN VERIFIED`
asserted on the claim.

```
  P1-AC-08   AGENT VERIFIED       L3  unfalsified
EXIT=1

error | modified-replay-failed-to-run | MODIFIED REPLAY `node checks/ac08-argfile.mjs
  data/source-perturbed.csv` exited 1 without writing anything to stdout (661 bytes on
  stderr, 0 on stdout): the harness BROKE rather than the check refusing its assertion. …
error | state-cap-violation | marker asserts `HUMAN VERIFIED` but the evidence ceiling is
  `AGENT VERIFIED` — MODIFIED REPLAY exited 1 with nothing on stdout and 661 bytes on
  stderr — it FAILED TO RUN, not failed to hold. A broken harness is not a falsification
warn  | replay-input-missing | MODIFIED REPLAY … names `data/source-perturbed.csv`, which
  does not exist on disk. …
warn  | unfalsified | reported **unfalsified** — modified replay crashed rather than
  failing: nothing was falsified (design §14.4)

mr as_expected True  failure_shape crashed  stderr 661  stdout 0
crashed_modified_replays ['checks/ac08-argfile.mjs']
```

Note `as_expected` is still `True` — the exit status *is* 1, and the record does
not lie about it. What changed is that `as_expected` is no longer sufficient.

### 3.3 The control — the gate still opens

Same claim, same command, same check. The only difference: the perturbed input
now exists, so the check reaches its assertion and reports it on stdout.

```
EXIT=0
state HUMAN VERIFIED | ceiling HUMAN VERIFIED
ceiling_reason: L3 evidence EXECUTED this run: REPLAY exited 0 and MODIFIED REPLAY
  exited 1 — it failed as it must (design §14.2, §14.4)
unfalsified False  crashed []
mr failure_shape asserted  stdout_first_line: 'FAIL P1-AC-08 MODIFIED REPLAY: too few rows'
lifts True
```

Not stuck closed. Both fixture claims that reached `HUMAN VERIFIED` before still
do, in every run above.

### 3.4 Input existence — checked, but a `warn`

`commandInputPaths()` (exported from `replay.mjs`, so tokenization stays in one
place beside `planCommand`) lists the path-shaped arguments a declared command
names, splitting `--flag=path` on the first `=`. Every one that is not on disk
raises `warn replay-input-missing`.

It is **not** an `error`, deliberately. §14.2 explicitly allows a perturbation
that *deletes the thing being asserted about*; a check that notices the absence
and says so on stdout is falsifying correctly, and an `error` here would refuse
a legitimate perturbation shape. The crash rule is what refuses; this one
discloses. No such finding fires on the committed fixture.

---

## 4. D2 — the laundering lane

### 4.1 Refused, or said out loud

`--no-previous` together with an `--out` that resolves to an **existing surface
manifest** now exits 2 unless `--accept-baseline-rewrite` is also given:

```
$ node plugin/scripts/surface.mjs --root .../rebase --no-previous --quiet   # claim text edited
surface.mjs: --no-previous would rewrite an existing baseline without comparing against it: docs/verification/surface-manifest.json
  `--no-previous` declares a FIRST run; this is a RE-BASELINE, and the two must not be
  indistinguishable in the artifact they produce.
  Re-baseline deliberately with --accept-baseline-rewrite (it is recorded in the manifest),
  or drop --no-previous and let the run compare, or write elsewhere with --out.
EXIT=2
```

"Is an existing baseline" is decided by parsing the file and checking
`schema === 'surface-manifest/v1'`, not by its path, so an `--out` that happens
to land on a manifest is caught too.

### 4.2 A re-baseline is now distinguishable from a first run

**Genuine first run** (no baseline anywhere on disk):

```
EXIT=0
  previous = null
```

**Deliberate re-baseline** (`--no-previous --accept-baseline-rewrite`):

```
EXIT=0
  previous = {
    "path": "docs/verification/surface-manifest.json",
    "source": "none: `--no-previous` DISCARDED the baseline at `docs/verification/surface-manifest.json`",
    "compared": false,
    "baseline_discarded": "docs/verification/surface-manifest.json",
    "rebaseline": true,
    "content_sha256_source": "a baseline existed at `path` and was DISCARDED by `--no-previous`: this
      manifest was compared against nothing. Drift (§5.4) and artifact invalidation (§5.5) are
      UNCHECKED this run. A genuine first run records `previous: null`; this run is a re-baseline
      and says so.",
    "claims_compared": null, "drifted": null, "invalidated": null, "markers_mutated": null
  }
  findings: [('warn', 'baseline-discarded')]
```

`drifted` is `null` and **not** `[]`. The page's own hint says an empty list
means "a comparison that ran and found none, not a comparison that was
skipped"; a discarded baseline must not be able to say that sentence about
itself. The run summary also prints `baseline: … DISCARDED (--no-previous)`.

`--no-previous` with `--out` pointing somewhere else, while a baseline exists,
is allowed (it overwrites nothing) but is recorded the same way, with
`rebaseline: false`.

### 4.3 Was the committed fixture manifest produced through that lane?

**Plainly: no — but its baseline was, and that is the defect.** From git:

| commit | `previous` in the committed manifest |
|---|---|
| `3f15805` (first) | `null` |
| `b2f08e8` (current) | `{path: docs/verification/surface-manifest.json, source: "default: the committed manifest", claims_compared: 5, drifted: [], invalidated: []}` |

The **committed artifact** was written by a default run that *did* compare
against a baseline and found nothing drifted. So the file in the tree is not
itself a `--no-previous` product.

That is not the reassurance it looks like. `BUILDER-2-REPORT.md` §7 discloses
regenerating with `--no-previous` after four `artifact-invalidated` errors. That
regeneration is not the committed file — it is the **baseline the committed file
compared against**. The drift had already been discarded by then, so the final
comparison was clean *because there was nothing left to compare*. A clean
`drifted: []` against a laundered baseline and a clean `drifted: []` against an
unbroken lineage were the same nine bytes.

The `3f15805` entry is the other half of the problem: `previous: null` there is
consistent with a genuine first run (no prior committed manifest existed), and
it is *also* exactly what the laundering lane produced. Under the old code the
artifact could not tell me which. Under the new code it can.

**So I closed the carry-forward too.** A run that compares against a baseline
whose own `previous.compared === false` records `baseline_was_rebaseline: true`
and raises `warn baseline-lineage-rebaselined`, and the flag **propagates** to
every later generation until someone rebuilds the chain from a genuine first
run. Demonstrated:

```
re-baseline, then a default run that compares against it:
  previous.compared = True | baseline_was_rebaseline = True
  drifted = []
  findings: [('warn', 'baseline-lineage-rebaselined')]
the generation after that:
  baseline_was_rebaseline = True
```

**Honest limit:** this works forward only. The existing committed manifest
carries no `previous.compared` key, so `baseline_was_rebaseline` reads `false`
on it — the historic re-baseline of §7 is **not** retro-detected and cannot be.
The prose disclosure in `BUILDER-2-REPORT.md` §7 remains the only record of it,
which is precisely the situation D2 describes. Anyone who wants that lineage
provably clean has to rebuild the fixture's manifest chain from a first run.

---

## 5. D5 and Item 10 — the disclosure its subject could delete

### 5.1 Can `produced_by.class` be derived or corroborated? No.

I looked for something to check it against. There is nothing: this engine has
no git (by design — A3-AC-03 requires it to run from a `git archive`), no
signatures, no external register, and the only other statement about authorship
in the tree is another comment in the same file, written by the same party. Any
"corroboration" I invented would be a second self-attestation wearing a
mechanical face, which is the exact failure the Verifier named.

So the manifest stops implying otherwise. Every `produced_by` now carries:

```json
"produced_by": { "actor": "fixture-builder", "class": "agent", "class_source": "self-attested (L1)" }
```

The engine's own principle — *an outcome nobody observed is testimony* — is now
applied to the actor field too, rather than to executions alone.

### 5.2 Item 10, as accepted

`human-state-on-agent-evidence` is now **`warn`**, and it is **widened so its
subject cannot delete it**:

- It fires on **every** claim at `HUMAN REVIEWED` or above, not only on claims
  with no human producer. The narrow predicate was removable with one `sed`
  (`(agent)` → `(human)`), which deleted the finding, the coverage entry and the
  page row with no error, no warn and no trace. Under this engine no human
  producer is corroborated, so the honest predicate is the wider one.
- The message differs between the two cases and names which it is: *"rests
  entirely on evidence produced by agent — no record citing this claim declares
  a human producer at all"* versus *"rests on evidence whose human producer is
  SELF-ATTESTED: `human/cl01-independent-relationship.mjs` declares `(human)` in
  its own comment header … the same one-word edit that would make it `(agent)`
  made it `(human)`."*
- **Not `error`, and no cap.** `error` would fail the shipped fixture for doing
  the right thing and would incentivise relabelling `(agent)` as `(human)` —
  which §5.1 shows is free. Executed evidence is not an attestation, and capping
  it would collapse §5.3 mechanism 4 into mechanism 2 and make the L3/L1
  distinction meaningless.

### 5.3 The second headline metric

`coverage.human_state_uncorroborated_producer` sits immediately beside
`claims_l1_only`, and both are printed by the run:

```
  headline: 1/5 claims L1-only (attested, can never reach HUMAN VERIFIED)  ·  2/5 at HUMAN REVIEWED+ with no corroborated human producer
```

The narrower `coverage.human_state_on_agent_evidence` is **kept**: "no human
producer is declared at all" is a different and stronger fact than "the declared
human producer is self-attested", and dropping it would trade one blind spot for
another. `coverage.crashed_modified_replays` was added alongside for D3.

On the committed fixture the second number is **2/5** — `P1-AC-01` (no human
producer anywhere) and `S1-CL-01` (a human producer, self-attested). That is the
second uncomfortable number, and it is now next to the first.

---

## 6. Suite, syntax, determinism — and the one red assertion

```
$ node --check plugin/scripts/surface.mjs && node --check plugin/scripts/replay.mjs
node --check: clean

$ node plugin/scripts/governance-checks.test.mjs
all regression tests passed
```

`surface.test.mjs` in the repo as I leave it: **43 of 44 assertions pass.** The
one that fails is:

```
FAIL  the committed manifest is current: a regeneration reproduces its own content_sha256
      regenerated 85e0ff3840e04e052399973e07c7429d52d5e9c1f96e4b8b53b77afe028bb8c8
```

**This is not a behavioural regression; it is a stale generated artifact.**
`plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json` is an
*output* of `surface.mjs`, and these fixes change what the generator emits
(`class_source`, `failure_shape`, `previous.compared`,
`previous.baseline_was_rebaseline`, the two new coverage keys, and
`human-state-on-agent-evidence` at `warn` on two claims). That test exists
precisely to catch a stale baseline, and it is catching one. I am forbidden to
touch `fixtures/**`, so I left it stale rather than silently regenerating a file
another agent may be holding.

**Proof that it is the only cause.** I copied `VERSION` + `plugin/` into a
scratch tree, regenerated the manifest there with a plain default run, and ran
both suites:

```
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice
  claims 5  evidence 6  pdatasets 2  un-ID'd claim lines 1
  replays: 10 executed, 0 unexecuted  baseline: docs/verification/surface-manifest.json
  P1-AC-01   HUMAN VERIFIED       L3
  P1-AC-02   AGENT VERIFIED       L1
  P1-AC-03   NOT VERIFIED         L3
  P1-AC-04   AGENT VERIFIED       L3  unfalsified failed-to-falsify
  S1-CL-01   HUMAN VERIFIED       L3
  headline: 1/5 claims L1-only (attested, can never reach HUMAN VERIFIED)  ·  2/5 at HUMAN REVIEWED+ with no corroborated human producer
  gaps 0  findings: 0 error, 4 warn, 1 info
EXIT=0

$ node plugin/scripts/surface.test.mjs
all regression tests passed          (44 of 44 PASS, 0 FAIL)

$ node plugin/scripts/governance-checks.test.mjs
all regression tests passed
```

The five fixture verdicts are **unchanged**, the run is still exit 0 with zero
errors, and the regeneration is **idempotent** (running it twice yields the same
`content_sha256`, `41a2492650…`).

**To land this, run exactly one command** — a default run, no `--no-previous`,
no `--accept-baseline-rewrite`, nothing to acknowledge:

```
node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice
```

Expected result: `EXIT=0`, `0 error, 4 warn, 1 info`, and
`content_sha256 = 41a24926506585ad14db61c55ddadc30180a168c1ec028c56894fd19909d31f5`
(that value assumes no other agent has changed the fixture in the meantime; the
command is the authority, not the hash). Worth noting: the honest re-baseline
lane for this repo is a **default compared run**, not `--no-previous`.

**Determinism, real clock, real subprocesses, against the repo's own fixture:**

```
$ diff det1.json det2.json
5c5
<   "generated_at": "2026-09-23T23:38:19.792Z",
---
>   "generated_at": "2026-09-23T23:38:21.230Z",
```

One line. Byte-identical otherwise.

---

## 7. What I did not touch, and why

**D4** (`ENOBUFS` reported as a timeout), **D6** (`--flag=path` containment off
by one), **D7** (`content_sha256` depends on the ledger *filename*) and **D8**
(the perturbation is self-administered) are not in this assignment. D4, D6 and
D7 are each a few lines inside `replay.mjs`/`surface.mjs` and I could have taken
them; I did not, because a second builder working the same defect list in the
same two files would collide, and none of them changes a verdict. D8 is a design
step, not a patch, and I agree with the Verifier that `replay.mjs` is the right
place for it: a declared mutation applied to a scratch copy of the root, with the
**unchanged** replay command re-run, is what would make MODIFIED REPLAY stop
being "the check's own self-test mode".

`commandInputPaths()` splits `--flag=path` on the first `=` for its own
existence check. That is **not** a D6 fix: `planCommand`'s containment guard is
unchanged and still absorbs one `..` through a flag prefix.

## 8. Summary of the interface changes

New manifest fields: `evidence[].produced_by.class_source`;
`*.execution.failure_shape` on every execution record;
`claims[].crashed_modified_replays`; `coverage.human_state_uncorroborated_producer`;
`coverage.crashed_modified_replays`; `previous.compared`;
`previous.baseline_was_rebaseline`; and, on a skipped comparison,
`previous.baseline_discarded` / `previous.rebaseline` with
`claims_compared`/`drifted`/`invalidated`/`markers_mutated` as `null`.

New findings: `modified-replay-failed-to-run` (`error`), `replay-input-missing`
(`warn`), `baseline-discarded` (`warn`), `baseline-lineage-rebaselined` (`warn`).

Severity changes: `replay-artifact-mismatch` and
`replay-artifact-does-not-cite-claim` `warn` → `error`;
`human-state-on-agent-evidence` `info` → `warn` **and widened**.

New CLI behaviour: `--no-previous` over an existing baseline exits 2 without
`--accept-baseline-rewrite`; the run summary prints the two headline metrics and
marks a discarded baseline.

`surface-html.mjs` needs no change to render any of this: it reads
`previous.path`/`source`/`claims_compared`/`drifted`/… defensively, and `null`
renders as `null` rather than as `0`. I verified the four HTML assertions in the
suite still pass.
