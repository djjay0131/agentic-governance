# Builder 1 — Surface / Data Model — report

Date: 2026-09-23
Branch: `feat/g3-verification-slice`
Builder: A3 / A4 / A7 (surface engine, verification projection, PDataset)
Verifier: **not me.** This report is evidence for an independent Verifier to
attack, not a claim that the work is verified.

---

## 1. What was built

### Files created (nothing else was touched)

```
plugin/scripts/surface.mjs                                   the engine, 0 deps
plugin/scripts/fixtures/slice/README.md                      fixture guide
plugin/scripts/fixtures/slice/BUILDER-1-REPORT.md            this file
plugin/scripts/fixtures/slice/llm/governance/governance-delta.md
plugin/scripts/fixtures/slice/llm/claims.md
plugin/scripts/fixtures/slice/llm/pdatasets.md
plugin/scripts/fixtures/slice/data/source.csv
plugin/scripts/fixtures/slice/data/generated.csv
plugin/scripts/fixtures/slice/transform.mjs
plugin/scripts/fixtures/slice/checks/ac01-duplicate-rejection.mjs
plugin/scripts/fixtures/slice/checks/ac03-sort-order.mjs
plugin/scripts/fixtures/slice/checks/ac04-transform-runs.mjs
plugin/scripts/fixtures/slice/checks/cl01-record-count.mjs
plugin/scripts/fixtures/slice/evidence/attestations.md
plugin/scripts/fixtures/slice/prior/claims.md
plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json
```

`plugin/scripts/governance-checks.mjs`, `plugin/scripts/governance-checks.test.mjs`,
`llm/**` and `docs/**` were **not** touched by me. `git status` on this tree
does show those first two files and `llm/governance/l0-fast-track.md` as
modified — **that is another builder's concurrent work in the same worktree,
not mine.** `node plugin/scripts/governance-checks.test.mjs` still reports
`all regression tests passed`.

### The manifest contract, for the three builders downstream

```
{ schema, generator, governance_version, generated_at, content_sha256, root,
  delta: { path, surface_status, renderer, pages_mechanism, output_dir },
  bound: { commit_sha, claims_source_sha256, pdataset_source_sha256, delta_sha256 },
  projections: { design: {status, sha256}, verification: {status, sha256} },
  verification: {
    status, claim_kinds, claims_source, pdataset_source, evidence_sources,
    claims: [ { id, scope, kind, text, text_sha256, authority, source:{path,line},
                checkbox, marker_state, marker_state_source, current_marker,
                history[], markers[], evidence[], best_determinism,
                ceiling, ceiling_reason, unfalsified, unfalsified_reason,
                state, state_source, drift } ],
    unidentified_claims: [ {path, line, checkbox, text, state, note} ],
    pdatasets: [ {id,title,path,sha256,bytes,produced_by,derived_from[],
                  derived_from_declared,transformation,
                  transformation_determinism, transformation_determinism_source,
                  produced_at,schema,rows,license,view_url,download_url,
                  link_resolution,source,provenance_chain,provenance_root} ],
    coverage: {...} },
  previous, gaps[], findings[], findings_by_severity }
```

Two fields the consumers should read rather than recompute:

- **`state`** is the effective state — the marker state after the determinism
  cap and the drift reset are applied. **`marker_state`** is what the file
  literally says. They differ exactly when something was refused, and
  `state_source` says which (`marker`, `absent-marker-default`,
  `capped-by-evidence`, `drift-reset`).
- **`content_sha256`** covers everything derived from the inputs and excludes
  `generated_at`. Compare that, not the file.

Evidence binds **by claim ID cited in the artifact** (design §6.1/§6.2), never
by a mapping file. The citation block is comment-punctuation agnostic, so the
same block works in `.mjs` and in Markdown:

```
EVIDENCE P1-AC-01
kind: test
determinism: L3
produced-by: fixture-builder (agent)
produced-at: 2026-09-22
replay: node checks/ac01-duplicate-rejection.mjs
replay-expect: pass
replay-outcome: pass
modified-replay: node checks/ac01-duplicate-rejection.mjs --perturb accept-duplicates
modified-replay-perturbation: stop rejecting duplicate source ids
modified-replay-expect: fail
modified-replay-outcome: fail
```

Exit codes: `0` manifest written with no `error`-severity finding; `1`
manifest written with at least one; `2` the engine could not run.

---

## 2. `node --check` clean on every `.mjs` written

```
$ for f in plugin/scripts/surface.mjs $(find plugin/scripts/fixtures/slice -name '*.mjs' | sort); do node --check "$f" && echo "OK  $f"; done
OK  plugin/scripts/surface.mjs
OK  plugin/scripts/fixtures/slice/checks/ac01-duplicate-rejection.mjs
OK  plugin/scripts/fixtures/slice/checks/ac03-sort-order.mjs
OK  plugin/scripts/fixtures/slice/checks/ac04-transform-runs.mjs
OK  plugin/scripts/fixtures/slice/checks/cl01-record-count.mjs
OK  plugin/scripts/fixtures/slice/transform.mjs
```

Zero dependencies — every `import` is `node:`-prefixed or a relative fixture
file:

```
$ grep -rhn "^import .* from '" plugin/scripts/surface.mjs plugin/scripts/fixtures/slice --include='*.mjs' | grep -v "node:" | grep -v "\.\./transform.mjs"
(end)
```

Clean-room run (A3-AC-03): copied to `/tmp` with no `node_modules` and no
`package.json` anywhere above it.

```
$ cd $S/clean && node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --out $S/clean.json
surface: ../clean.json
  claims 5  evidence 5  pdatasets 2  un-ID'd claim lines 1
  P1-AC-01   HUMAN VERIFIED       L3
  P1-AC-02   AGENT VERIFIED       L1
  P1-AC-03   NOT VERIFIED         L3
  P1-AC-04   AGENT VERIFIED       L3  unfalsified
  S1-CL-01   HUMAN VERIFIED       L3
  (un-ID'd)  llm/claims.md:31  "The normalized dataset is published to the project website."
  gaps 0  findings: 0 error, 1 warn, 1 info
exit=0
```

The one field that differs there is `governance_version: null` — there is no
`VERSION` file above `/tmp`, and the engine records that honestly rather than
guessing a version.

---

## 3. The generator is itself `L3`

Two runs, nothing changed between them:

```
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --out $S/run1.json --quiet
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --out $S/run2.json --quiet
$ diff -u $S/run1.json $S/run2.json
--- run1.json	2026-09-23 18:19:31.787765759 -0400
+++ run2.json	2026-09-23 18:19:32.035782017 -0400
@@ -2,7 +2,7 @@
   "schema": "surface-manifest/v1",
   "generator": "plugin/scripts/surface.mjs",
   "governance_version": "0.9.1",
-  "generated_at": "2026-09-23T22:19:31.616Z",
+  "generated_at": "2026-09-23T22:19:31.845Z",
   "content_sha256": "f00eeabfc0a1239fde7eec9d63ae5a08aa011087c01a6cf78798e3532693a0ca",
   "root": "plugin/scripts/fixtures/slice",
   "delta": {
diff exit=1
```

**The whole diff is one line, and it is `generated_at`.** With that line
filtered out the files are identical:

```
$ diff <(grep -v '"generated_at"' $S/run1.json) <(grep -v '"generated_at"' $S/run2.json)
diff exit=0
$ grep '"content_sha256"' $S/run1.json $S/run2.json
run1.json:  "content_sha256": "f00eeabfc0a1239fde7eec9d63ae5a08aa011087c01a6cf78798e3532693a0ca",
run2.json:  "content_sha256": "f00eeabfc0a1239fde7eec9d63ae5a08aa011087c01a6cf78798e3532693a0ca",
```

Stronger: with `--generated-at` pinned, two runs **from different working
directories, with `--root` spelled differently** are byte-identical. The
manifest carries no cwd-derived path — `root` is the delta's declared
`Surface root:`, declared and not derived.

```
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --generated-at 2026-09-23T00:00:00.000Z --out $S/pin1.json --quiet
$ cd /tmp && node /mnt/c/code/agentic-governance/plugin/scripts/surface.mjs --root /mnt/c/code/agentic-governance/plugin/scripts/fixtures/slice --generated-at 2026-09-23T00:00:00.000Z --out $S/pin2.json --quiet
$ cmp $S/pin1.json $S/pin2.json && echo "cmp: files are byte-identical"
cmp: files are byte-identical
$ sha256sum $S/pin1.json $S/pin2.json
ec643343d641c524fc122a2e1bf5e3d9b6a09546a8c8ee90513cec72915d8c9c  pin1.json
ec643343d641c524fc122a2e1bf5e3d9b6a09546a8c8ee90513cec72915d8c9c  pin2.json
```

Determinism was engineered, not hoped for: directory iteration is sorted
before use, every array is sorted by a total key, and the content hash is
taken over a canonical JSON encoding with sorted keys.

---

## 4. The four `P1-AC-0n` outcomes, read out of the manifest

```
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --out $S/m1.json
surface: .../m1.json
  claims 5  evidence 5  pdatasets 2  un-ID'd claim lines 1
  P1-AC-01   HUMAN VERIFIED       L3
  P1-AC-02   AGENT VERIFIED       L1
  P1-AC-03   NOT VERIFIED         L3
  P1-AC-04   AGENT VERIFIED       L3  unfalsified
  S1-CL-01   HUMAN VERIFIED       L3
  (un-ID'd)  llm/claims.md:31  "The normalized dataset is published to the project website."
  gaps 0  findings: 0 error, 1 warn, 1 info
exit=0
```

Every row of the brief's table, matched.

### `P1-AC-01` → `HUMAN VERIFIED` (the happy path)

The brief's own sentence, verbatim, and it is falsifiable because the source
data really does contain a duplicate id that the transformation really does
reject.

```json
"text": "Every valid source record produces exactly one normalized output record, and duplicate source IDs are rejected.",
"text_sha256": "15884430064cd27ce2bf1b0183266c87f9a65341c41197860170a6853614e43c",
"authority": "activity-plan §13.1",
"marker_state": "HUMAN VERIFIED",
"history": ["— AGENT VERIFIED (PR #41, 2026-09-22)"],
"current_marker": "— HUMAN VERIFIED (PR #42, 2026-09-23)",
"best_determinism": "L3",
"ceiling": "HUMAN VERIFIED",
"ceiling_reason": "L3 evidence with a MODIFIED REPLAY that failed as it should (design §14.4)",
"unfalsified": false,
"state": "HUMAN VERIFIED", "state_source": "marker"
```

The replay and the modified replay are real, and they behave:

```
$ node checks/ac01-duplicate-rejection.mjs
PASS P1-AC-01 REPLAY: 9 unique valid source records -> 9 output records; 1 duplicated source id(s) rejected
  exit=0
$ node checks/ac01-duplicate-rejection.mjs --perturb accept-duplicates
FAIL P1-AC-01 MODIFIED REPLAY (--perturb accept-duplicates)
  - B: duplicate source id s-001 produced 2 output records, expected 0 (rejected)
  exit=1
```

### `P1-AC-02` → caps at `AGENT VERIFIED` (an agent's say-so is never enough)

```json
"best_determinism": "L1",
"ceiling": "AGENT VERIFIED",
"ceiling_reason": "best evidence is `L1` (attested): an agent's say-so is never enough (design §6.3, §5.3 mechanism 4)",
"state": "AGENT VERIFIED"
```

**The cap is enforced, not merely reported.** Modified replay — edit the
fixture to append `— HUMAN VERIFIED (PR #99, 2026-09-23)` to this `L1`-only
claim:

```
$ node plugin/scripts/surface.mjs --root $S/mr3 --out $S/mr3.json --quiet
exit=1
{
 "marker_state": "HUMAN VERIFIED",
 "ceiling": "AGENT VERIFIED",
 "state": "AGENT VERIFIED",
 "state_source": "capped-by-evidence",
 ...
}
findings: [{
  "severity": "error", "code": "state-cap-violation", "subject": "P1-AC-02",
  "message": "marker asserts `HUMAN VERIFIED` but the evidence ceiling is `AGENT VERIFIED` — best evidence is `L1` (attested): an agent's say-so is never enough (design §6.3, §5.3 mechanism 4). The asserted state is refused; the claim is presented as `AGENT VERIFIED`.",
  "locator": "llm/claims.md:23"
}]
```

The asserted state is **refused**, the effective state stays `AGENT VERIFIED`,
and the run exits non-zero.

### `P1-AC-03` → resets to `NOT VERIFIED` (verification binds to exact wording)

Two independent mechanisms agree, which is the point of showing both.

**(a) Recorded, append-only (§3.5).** The marker block ends in a reset and the
earlier `HUMAN VERIFIED` is still visible above it — deleting it would hide
exactly the event that matters most:

```json
"history": ["— AGENT VERIFIED (PR #41, 2026-09-20)", "— HUMAN VERIFIED (PR #42, 2026-09-21)"],
"current_marker": "— NOT VERIFIED (claim text edited, 2026-09-23)",
"state": "NOT VERIFIED"
```

Note this claim is ticked `[x]` **and** `NOT VERIFIED`. That is deliberate:
the checkbox and the verification state are different axes.

**(b) Derived from hashes (§5.4).** `prior/claims.md` holds the sentence as it
read before the amendment. Generate a manifest from it, then run the current
tree against it:

```
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --claims prior/claims.md --out $S/prior.json
  P1-AC-03   HUMAN VERIFIED       L3        <-- before the edit
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --previous $S/prior.json --out $S/drift.json
  P1-AC-03   NOT VERIFIED         L3
"previous": { "claims_compared": 5, "drifted": ["P1-AC-03"] }
"drift": {
  "previous_text_sha256": "67e92d3703e1bfa209f45400273b87df896354c678c0435f79c4eeffde73d1ec",
  "previous_text": "The generated dataset contains one row per accepted source record.",
  "previous_state": "HUMAN VERIFIED",
  "acknowledged": true,
  "proposed_marker": null
}
```

And when the reset has **not** been recorded, the engine forces it and says so
loudly (modified replay: delete the reset line, compare against the prior
manifest):

```
$ node plugin/scripts/surface.mjs --root $S/mr5 --previous $S/prior.json --out $S/mr5.json --quiet
exit=1
{ "marker_state": "HUMAN VERIFIED", "state": "NOT VERIFIED", "state_source": "drift-reset",
  "drift": { "acknowledged": false, "proposed_marker": "— NOT VERIFIED (claim text edited, 2026-09-23)" } }
findings: [{ "severity": "error", "code": "claim-text-drift", "subject": "P1-AC-03",
  "message": "claim text was edited since the previous manifest (67e92d3703e1 -> be5c53bb3910) while the marker block still reads `HUMAN VERIFIED`. Verification binds to the exact wording, so the state resets to `NOT VERIFIED` (design §5.4). Append: — NOT VERIFIED (claim text edited, 2026-09-23)" }]
```

The engine **proposes** the marker line. It never writes it: the generator
reports and never auto-fixes (A5-AC-01).

### `P1-AC-04` → `unfalsified` (the vacuous-check detector works)

The check passes, and passes just as happily when the behaviour it is supposed
to be about is broken:

```
$ node checks/ac04-transform-runs.mjs
PASS P1-AC-04 REPLAY: the transformation ran to completion
  exit=0
$ node checks/ac04-transform-runs.mjs --perturb accept-duplicates
PASS P1-AC-04 MODIFIED REPLAY (--perturb accept-duplicates): the transformation ran to completion
  exit=0        <-- FAILED TO FAIL
```

The manifest says so:

```json
"unfalsified": true,
"unfalsified_reason": "modified replay failed to fail",
"ceiling": "AGENT VERIFIED",
"ceiling_reason": "MODIFIED REPLAY did not fail: the check passes while the thing it asserts is broken (design §14.3)",
"state": "AGENT VERIFIED"
```
```json
{"severity":"warn","code":"unfalsified","subject":"P1-AC-04",
 "message":"reported **unfalsified** — modified replay failed to fail (design §14.4)"}
```

**The detector is itself not vacuous.** Modified replay — change only the
recorded modified-replay outcome from `pass` to `fail` and the verdict flips:

```
$ sed -i 's|^// modified-replay-outcome: pass$|// modified-replay-outcome: fail|' $S/mr6/checks/ac04-transform-runs.mjs
$ node plugin/scripts/surface.mjs --root $S/mr6 --out $S/mr6.json --quiet
{ "unfalsified": false, "unfalsified_reason": null, "ceiling": "HUMAN VERIFIED" }
```

### The un-ID'd line → counted and reported, never dropped

```json
"unidentified_claims": [{
  "path": "llm/claims.md", "line": 31, "checkbox": " ",
  "text": "The normalized dataset is published to the project website.",
  "state": "NOT VERIFIED",
  "note": "no claim ID — counted and reported, never silently dropped (design §3.2)"
}]
"coverage": { "unidentified_claim_lines": 1, ... }
```

It is also printed on stdout on every run.

---

## 5. PDatasets and provenance

```
$ node -e '...' $S/m1.json    # verification.pdatasets
S1-DS-01  path data/source.csv     sha256 d496eda0…  bytes 453  rows 12
          derived_from []  derived_from_declared "none"  provenance_root true
          transformation "manual (records transcribed by hand…)"
          transformation_determinism "L1"
          transformation_determinism_source "derived: `manual` transformation is `L1` (design §4.1)"
          link_resolution "local"  view_url "plugin/scripts/fixtures/slice/data/source.csv"

S1-DS-02  path data/generated.csv  sha256 69e24c33…  bytes 367  rows 9
          derived_from ["S1-DS-01"]  provenance_chain ["S1-DS-01","S1-DS-02"]
          transformation "transform.mjs"  transformation_determinism "L3" (declared)
          link_resolution "local"  view_url "plugin/scripts/fixtures/slice/data/generated.csv"
```

`derived_from: none` is **stated** on the root, not omitted, so a root dataset
is distinguishable from one whose provenance was never recorded (§4.1).

`Pages mechanism: none` ⇒ `link_resolution: local`, repo-relative paths only.
No absolute URL appears anywhere in the output, and that is checked rather
than assumed — the engine refuses to write a manifest containing one, and:

```
$ grep -nE '[a-z][a-z0-9+.-]*://' plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json
grep exit=1 (1 = no match)
```

`S1-CL-01` reaches `HUMAN VERIFIED` and genuinely depends on its data — its
modified replay perturbs the **source dataset**, not the code:

```
$ node checks/cl01-record-count.mjs
PASS S1-CL-01 REPLAY: 9 records, recomputed sha256 69e24c33f1325ad8688ce99f6b9ebb63bf5267420dc4e53dfebe5763f841612e matches data/generated.csv
  exit=0
$ node checks/cl01-record-count.mjs --perturb source-score
FAIL S1-CL-01 MODIFIED REPLAY (--perturb source-score)
  - recomputed dataset sha256 335225caff65372d8e1c4f6ca1b6aa827bb8075971d69484b7698fb94dae0982 !== committed 69e24c33f1325ad8688ce99f6b9ebb63bf5267420dc4e53dfebe5763f841612e
  exit=1
```

---

## 6. The non-negotiable behaviours, each demonstrated by breaking it

| Behaviour | Modified replay | Result |
|---|---|---|
| Absent marker ⇒ `NOT VERIFIED`, never assumed | claims with no marker block | `marker_state_source: "absent-marker-default"`; never inferred from the checkbox |
| Declared path absent ⇒ `missing` + gap + finding | `rm data/generated.csv` | see below |
| Undeclared determinism is a gap, not a default | strip `determinism: L3` from an evidence header | see below |
| Un-ID'd claim line counted, never dropped | — | §4 above |

```
### declared path absent on disk
$ rm $S/mr1/data/generated.csv && node plugin/scripts/surface.mjs --root $S/mr1 --out $S/mr1.json --quiet
exit=1
link_resolution: missing | view_url: null | sha256: null
gaps: [{"subject":"S1-DS-02","field":"path","message":"declared path absent on disk: data/generated.csv","locator":"llm/pdatasets.md:27"}]
findings: [{"severity":"error","code":"missing-declared-source","subject":"S1-DS-02",
 "message":"declared path `data/generated.csv` is absent on disk — `link_resolution: missing`, never a fabricated link (design §4.2)"}]
```

```
### undeclared determinism level
$ sed -i '/^\/\/ determinism: L3$/d' $S/mr2/checks/cl01-record-count.mjs
$ node plugin/scripts/surface.mjs --root $S/mr2 --out $S/mr2.json --quiet
exit=1
state: AGENT VERIFIED | best_determinism: null | ceiling: AGENT VERIFIED
gaps: [{"subject":"S1-CL-01","field":"determinism","message":"evidence checks/cl01-record-count.mjs declares no determinism level"}]
findings: [{"severity":"error","code":"undeclared-determinism","subject":"S1-CL-01",
 "message":"evidence `checks/cl01-record-count.mjs` declares no determinism level. There is no default: L1 would quietly cap the claim and L3 would quietly launder an assertion (design §14.1)"}]
```

Neither `L1` nor `L3` is assumed. The level simply becomes `null`, the claim
loses its executable ceiling, and the run fails.

Three more guards, all exercised the same way:

```
### the inverted-scale bug the reconciliation caught (C-1), guarded in code
$ # declare `determinism: L3` on S1-DS-01, whose transformation is `manual`
exit=1
transformation_determinism: L1 | derived: `manual` transformation is `L1` (design §4.1)
findings: [{"severity":"error","code":"manual-transformation-determinism","subject":"S1-DS-01",
 "message":"transformation is `manual` but determinism is declared `L3`. A manual operation is `L1` (attested) by design §4.1 no matter how deterministic it looks."}]

### malformed marker — free prose in the parenthetical (A2-AC-04's shape, engine side)
$ # "— HUMAN VERIFIED (looked fine to me)"
exit=1
findings: [{"severity":"error","code":"malformed-marker","subject":"P1-AC-01",
 "message":"marker `— HUMAN VERIFIED (looked fine to me)` is malformed: parenthetical must be `PR #<n>[, YYYY-MM-DD]` (design §3.4)"}]
P1-AC-01 state: AGENT VERIFIED   (the malformed marker is refused; the last WELL-FORMED marker wins)

### delete the only evidence citing a claim (A4-AC-05)
$ rm $S/mr7/checks/ac01-duplicate-rejection.mjs
exit=1
{ "evidence": 0, "ceiling": "NOT VERIFIED", "marker_state": "HUMAN VERIFIED",
  "state": "NOT VERIFIED", "state_source": "capped-by-evidence" }
coverage.claims_with_no_evidence: ["P1-AC-01"]

### a repo with no ## Published Surface block (A3-AC-05)
$ node plugin/scripts/surface.mjs --root $S/mr9 --out $S/mr9.json
SKIP — no `## Published Surface` block; this repo has no surface.
exit=0
ls: cannot access '$S/mr9.json': No such file or directory     <-- emitted nothing
```

No perturbation above touched a committed file; each ran against a copy in the
scratch directory, and `--perturb` on the checks changes behaviour in memory
only.

---

## 7. Coverage — the three questions that are unanswerable today (§6.4)

```json
"coverage": {
  "claims_total": 5,
  "claims_with_no_evidence": [],
  "claims_l1_only": ["P1-AC-02"],
  "agent_verified_not_human_verified": ["P1-AC-02", "P1-AC-04"],
  "unfalsified": ["P1-AC-04"],
  "drifted": [],
  "capped_by_evidence": [],
  "by_state": {"NOT VERIFIED":1,"AGENT VERIFIED":2,"HUMAN REVIEWED":0,"HUMAN VERIFIED":2,"VERIFICATION FAILED":0,"NEEDS REWORK":0},
  "by_best_determinism": {"L1":1,"L2":0,"L3":4,"none":0},
  "unidentified_claim_lines": 1,
  "evidence_records": 5,
  "pdatasets_total": 2,
  "pdatasets_missing": []
}
```

---

## 8. Decisions I made that the Verifier should attack

1. **Where evidence metadata lives.** The design fixes the *binding* (claim ID
   cited in the artifact, §6.1/§6.2) but not where `determinism`, `produced_by`
   and the replay commands are written. I put them in a comment block beside
   the citation, in the artifact. That keeps one source of truth and lets the
   record move with the test — but it is my convention, not canon's, and it is
   the thing most worth arguing about.
2. **`Surface root:` in the delta.** The manifest must state the working
   directory for a replay command without deriving a path from `process.cwd()`
   or from git (the engine must run from a `git archive`, A3-AC-03). I made the
   delta declare it. Consequence: the manifest is completely cwd-independent,
   which is what makes the byte-identity proof in §3 hold across directories.
3. **The effective-state cap changes `state`, not just a flag.** A marker
   asserting more than the evidence carries is *refused*: `state` drops to the
   ceiling and an `error` finding names it. §6.3 says "achievable state is
   capped"; A6-AC-04 says the attempt "must be refused". Presenting the
   asserted state with a warning attached would have been the weaker reading.
4. **Drift needs a previous manifest.** §5.4 says `text_sha256` "is recorded in
   the manifest", so drift is derived by comparing manifests (`--previous`),
   not by trusting the tree. The fixture therefore also carries the §3.5
   appended reset, so the committed fixture shows the right answer with or
   without `--previous`. A verifier could reasonably call the appended marker
   "hardcoding the outcome" — §4(b) above is the answer, and the unacknowledged
   case is demonstrated too.
5. **Severity and exit code.** `error` ⇒ exit 1; `warn`/`info` ⇒ exit 0.
   `unfalsified` and `l1-only` are deliberately **not** errors: §14.4 says `L1`
   "never blocks, always visible", and the fixture's whole point is to ship a
   vacuous check while still exiting 0 on the happy path. If the checker builder
   wants those to block, that is their policy call, and `findings_by_severity`
   gives them the hook.
6. **No missing-path or undeclared-determinism case is committed** in the
   fixture, so the happy-path run exits 0 and downstream builders get a clean
   input. Both behaviours are proven by modified replay in §6 instead. Activity
   plan §13.2 wanted a `missing.csv` committed; I judged a permanently non-zero
   fixture worse for the three consumers. Easy to reverse if the Verifier
   disagrees — add one bullet to `llm/pdatasets.md`.
7. **The committed manifest** at `docs/verification/surface-manifest.json` is a
   convenience, regenerated byte-identically with
   `--generated-at 2026-09-23T00:00:00.000Z`. Running the generator with
   defaults overwrites it with a fresh `generated_at` and dirties the tree —
   that is a generator behaving normally, but it is worth knowing.

## 9. What I did not build, deliberately

The HTML renderer, the replay runner, the `--surface` checker mode and the
sixth L0 diff shape all belong to other builders. `surface.mjs` emits the data
each of them needs (`replay` / `modified_replay` with `command` + `cwd` for the
runner; `state` + `marker_state` + `markers[]` + `content_sha256` for the
checker; `gaps` + `findings` + `coverage` for the page) and does none of their
work. There is also no negative fixture here proving each *checker* rule can
fail — that belongs with the checker.

**Nothing in this report is a verification.** It is the evidence, and it is
`L3`: every command above is re-runnable and every one of them is recorded
with the output it produced.
