FAIL

# Verifier 1 — Surface / Data Model — independent verification report

Date: 2026-09-23
Branch: `feat/g3-verification-slice`
Under test: `plugin/scripts/surface.mjs`, `plugin/scripts/fixtures/slice/**`
Verifier: independent. I did not build any of this and I have changed none of it.

**Verdict: FAIL.** The engine is well-built, honest in its vocabulary and
correct on most of what it checks. It fails on a single structural point that
the brief's requirements turn on: **the verdict `HUMAN VERIFIED` is computed
from self-declared strings that nothing ever checks, and the artifact
identities §5.5 requires it to bind are recorded but never compared.** Six
separate attacks produced a green run (`0 error`, `exit 0`) over a tree whose
claims were demonstrably false.

I read §3, §4, §5.1–5.5, §14.1 and §14.4 of the capability design and the whole
reconciliation before opening `surface.mjs`, and read `BUILDER-1-REPORT.md`
last. Every builder claim I tested reproduced exactly; the failures below are
things the report did not claim, plus one thing it claimed as a success that I
read as the opposite.

---

## Method

All work on copies. The committed fixture and `surface.mjs` were not modified;
`git` was not invoked.

```sh
W=/tmp/claude-1000/-mnt-c-code/a6962881-89d1-431a-af15-7b0e4c121949/scratchpad/v1
mkdir -p $W && cd /mnt/c/code/agentic-governance
cp -r plugin/scripts/fixtures/slice $W/fx
cp plugin/scripts/surface.mjs $W/surface.mjs
echo "0.9.1" > $W/VERSION          # so content_sha256 matches the in-repo run
cd $W && node surface.mjs --root fx --out $W/base.json \
  --generated-at 2026-09-23T00:00:00.000Z --quiet
```

`base.json` reproduces the committed manifest exactly:

```
f00eeabfc0a1239fde7eec9d63ae5a08aa011087c01a6cf78798e3532693a0ca
```

Each attack below copies `$W/fx` to `$W/c<n>` and perturbs only that copy.

---

## Verdict per numbered item

| # | Attack | Verdict |
|---|---|---|
| 1 | Claim wording changes after `HUMAN VERIFIED` | **FAIL** (PASS only with `--previous`) |
| 2 | Dataset content changes after verification | **FAIL** |
| 3 | Artifact hash mismatch | **FAIL** |
| 4 | Referenced evidence file missing | **PASS** |
| 5 | PDataset path cannot resolve | **PASS** |
| 6 | No absolute URL under `Pages mechanism: none` | **PASS** |
| 7 | Undeclared determinism level | **PASS** (machine field honest; prose mislabels it `L1`) |
| 8 | Marker history mutation | **FAIL** in `surface.mjs` (caught by `governance-checks.mjs`) |
| 9 | Deterministic script returns the wrong answer | **FAIL** |
| 10 | Check that always passes / flip `P1-AC-04`'s outcome | **PASS** narrowly; the verdict is forgeable by one word |
| 11 | `derived_from` honesty | **PASS with a defect** — see argument |
| 12 | Is the exit code trustworthy? | **PASS** — could not break it |

---

## 1. Claim wording changes after `HUMAN VERIFIED` — FAIL

I changed `P1-AC-01` to say the **opposite** of what was verified: "duplicate
source IDs are **silently merged**" in place of "are **rejected**". Marker
block untouched.

### 1a — the documented default invocation

```sh
cd $W && rm -rf c1 && cp -r fx c1
perl -0pi -e 's/output record, and duplicate source IDs are rejected\./output record, and duplicate source IDs are silently merged./' c1/llm/claims.md
node surface.mjs --root c1 --out $W/c1a.json --generated-at 2026-09-23T00:00:00.000Z
```

```
surface: c1a.json
  claims 5  evidence 5  pdatasets 2  un-ID'd claim lines 1
  P1-AC-01   HUMAN VERIFIED       L3  
  P1-AC-02   AGENT VERIFIED       L1  
  P1-AC-03   NOT VERIFIED         L3  
  P1-AC-04   AGENT VERIFIED       L3  unfalsified
  S1-CL-01   HUMAN VERIFIED       L3  
  (un-ID'd)  llm/claims.md:31  "The normalized dataset is published to the project website."
  gaps 0  findings: 0 error, 1 warn, 1 info
EXIT=0
```

A claim asserting the opposite of the verified behaviour is presented as
`HUMAN VERIFIED`, zero findings, exit 0. This is the invocation the fixture
README documents (`node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice`).

### 1b — with `--previous`, the mechanism is correct

```sh
node surface.mjs --root c1 --previous $W/base.json --out $W/c1b.json --generated-at 2026-09-23T00:00:00.000Z
```

```
  P1-AC-01   NOT VERIFIED         L3  
  gaps 0  findings: 1 error, 1 warn, 1 info
EXIT=1
```

```json
{
 "state": "NOT VERIFIED",
 "state_source": "drift-reset",
 "marker_state": "HUMAN VERIFIED",
 "current_marker": "— HUMAN VERIFIED (PR #42, 2026-09-23)",
 "history": ["— AGENT VERIFIED (PR #41, 2026-09-22)"],
 "drift": {
  "previous_text_sha256": "15884430064cd27ce2bf1b0183266c87f9a65341c41197860170a6853614e43c",
  "previous_text": "Every valid source record produces exactly one normalized output record, and duplicate source IDs are rejected.",
  "previous_state": "HUMAN VERIFIED",
  "acknowledged": false,
  "proposed_marker": "— NOT VERIFIED (claim text edited, 2026-09-23)"
 }
}
```

This is exactly right, and §3.5 is honoured: the prior `HUMAN VERIFIED` marker
is still present in `current_marker` and `history`, nothing is erased, and the
reset is **proposed** rather than written. Credit where due.

### 1c — the default run destroys its own drift baseline

The default `--out` is `<root>/<output dir>/surface-manifest.json`, which is
the committed manifest. So the first default run after an edit overwrites the
only record of what was verified:

```sh
node -e "console.log('BEFORE:',require('$W/c1/docs/verification/surface-manifest.json').verification.claims.find(c=>c.id==='P1-AC-01').text_sha256)"
node surface.mjs --root c1 --generated-at 2026-09-23T00:00:00.000Z --quiet
node -e "console.log('AFTER :',require('$W/c1/docs/verification/surface-manifest.json').verification.claims.find(c=>c.id==='P1-AC-01').text_sha256)"
node surface.mjs --root c1 --previous c1/docs/verification/surface-manifest.json --out $W/c1c.json --generated-at 2026-09-23T00:00:00.000Z
```

```
committed text_sha256 BEFORE: 15884430064cd27ce2bf1b0183266c87f9a65341c41197860170a6853614e43c
committed text_sha256 AFTER : 06549b55753180ca60cb56258c3f1e444f3d7708d0e351a54ab6c8070ec0d625
--- now drift against the (overwritten) committed manifest:
  P1-AC-01   HUMAN VERIFIED       L3  
EXIT=0
```

**One default run launders the drift permanently.** Builder decision 4
("drift needs a previous manifest") and decision 7 ("running with defaults
overwrites it") are each disclosed; their product is not, and it is worse than
either.

---

## 2. Dataset content changes after verification — FAIL

`S1-CL-01` (`HUMAN VERIFIED`) claims the generated dataset holds "exactly nine
normalized records, one for each source record that is both valid and uniquely
identified". I changed one score in the bound source PDataset.

```sh
cd $W && rm -rf c2 && cp -r fx c2
sed -i 's/^s-002,Katherine Johnson,99/s-002,Katherine Johnson,42/' c2/data/source.csv
node surface.mjs --root c2 --out $W/c2a.json --generated-at 2026-09-23T00:00:00.000Z
node surface.mjs --root c2 --previous $W/base.json --out $W/c2b.json --generated-at 2026-09-23T00:00:00.000Z
```

Both runs, identically:

```
  S1-CL-01   HUMAN VERIFIED       L3  
  gaps 0  findings: 0 error, 1 warn, 1 info
EXIT=0
```

The `dataset_sha256` §5.5 names is recorded in both manifests and is
demonstrably different:

```
base     [["S1-DS-01","d496eda0abeee9c1f14dab82477fd13d6e03d4d20b8e9426c3aa2657f9a17793",12],["S1-DS-02","69e24c33f1325ad8688ce99f6b9ebb63bf5267420dc4e53dfebe5763f841612e",9]]
tampered [["S1-DS-01","4ac33ea05dc7669f2697ef2c68585eaddab41d63de8775939df99d72a064597c",12],["S1-DS-02","69e24c33f1325ad8688ce99f6b9ebb63bf5267420dc4e53dfebe5763f841612e",9]]
```

And the claim's own recorded REPLAY, run by hand, fails:

```sh
cd $W/c2 && node checks/cl01-record-count.mjs; node transform.mjs --check
```

```
FAIL S1-CL-01 REPLAY
  - recomputed dataset sha256 335225caff65372d8e1c4f6ca1b6aa827bb8075971d69484b7698fb94dae0982 !== committed 69e24c33f1325ad8688ce99f6b9ebb63bf5267420dc4e53dfebe5763f841612e
EXIT=1
FAIL transform --check: data/generated.csv does not match the transform output
EXIT=1
```

**`--surface` keeps presenting the claim as `HUMAN VERIFIED` while the evidence
it rests on fails on the first try.** §5.5 is unambiguous: "If any bound
identifier changes, `--surface` appends an invalidation marker". Nothing in
`surface.mjs` compares `dataset_sha256` across runs. The `bound` block records
`claims_source_sha256`, `pdataset_source_sha256` and `delta_sha256` and no code
path ever reads them back.

---

## 3. Artifact hash mismatch — FAIL

I gutted the assertions out of `checks/ac01-duplicate-rejection.mjs`, leaving
the `EVIDENCE` header byte-identical.

```sh
cd $W && rm -rf c3 && cp -r fx c3
# delete everything between `const failures = [];` and `const label = perturb`
cd c3 && node checks/ac01-duplicate-rejection.mjs; node checks/ac01-duplicate-rejection.mjs --perturb accept-duplicates
```

```
PASS P1-AC-01 REPLAY: 9 unique valid source records -> 9 output records; 1 duplicated source id(s) rejected
REPLAY EXIT=0
PASS P1-AC-01 MODIFIED REPLAY (--perturb accept-duplicates): 9 unique valid source records -> 11 output records; 1 duplicated source id(s) rejected
MODREPLAY EXIT=0
```

The check is now vacuous — it prints its old success message unconditionally
and passes under its own perturbation.

```sh
node surface.mjs --root c3 --previous $W/base.json --out $W/c3.json --generated-at 2026-09-23T00:00:00.000Z
```

```
  P1-AC-01   HUMAN VERIFIED       L3  
  gaps 0  findings: 0 error, 1 warn, 1 info
EXIT=0
base evidence sha256     71bc5eb40e1d8715d51833d8107edfc4ca408113f3e23c6300eb4d2443b8743c
tampered evidence sha256 4d8f25f2e8a35b436a5f245b2ba3a3a73671bd46a5d2110fb05e8cab273d8396
```

The `artifact_sha256` changed, both values sit in the two manifests, and
nothing compares them. §14.4's "`L3` evidence: the generator recomputes and
compares the hash. A mismatch is a finding" is not implemented — there is no
*declared* hash in the evidence schema to compare a recomputation against, so
there is nothing a recomputation could contradict.

---

## 4. Referenced evidence file missing — PASS

### 4a — delete the check a claim cites

```sh
cd $W && rm -rf c4a && cp -r fx c4a && rm c4a/checks/ac01-duplicate-rejection.mjs
node surface.mjs --root c4a --out $W/c4a.json --generated-at 2026-09-23T00:00:00.000Z
```

```
  P1-AC-01   NOT VERIFIED         --  
  gaps 1  findings: 1 error, 2 warn, 1 info
EXIT=1
```

```json
{
  "severity": "error", "code": "state-cap-violation", "subject": "P1-AC-01",
  "message": "marker asserts `HUMAN VERIFIED` but the evidence ceiling is `NOT VERIFIED` — no evidence cites this claim. The asserted state is refused; the claim is presented as `NOT VERIFIED`.",
  "locator": "llm/claims.md:19"
}
```

`state_source: "capped-by-evidence"`, `coverage.claims_with_no_evidence:
["P1-AC-01"]`, gap recorded. The marker is refused, not honoured. Correct.

### 4b — dangling `locator:`

```sh
cd $W && rm -rf c4b && cp -r fx c4b
sed -i 's|^locator: evidence/attestations.md|locator: evidence/does-not-exist.md|' c4b/evidence/attestations.md
node surface.mjs --root c4b --out $W/c4b.json --generated-at 2026-09-23T00:00:00.000Z
```

```
EXIT=1
[{ "severity": "error", "code": "missing-declared-source", "subject": "P1-AC-02",
   "message": "evidence locator `evidence/does-not-exist.md` does not exist (design §4.2)",
   "locator": "evidence/attestations.md" }]
gaps: [{"subject":"P1-AC-02","field":"locator","message":"evidence locator is absent on disk: evidence/does-not-exist.md","locator":"evidence/attestations.md"}]
```

Error + gap + exit 1. Correct. One nuance: the evidence record still counts
toward the claim's ceiling although its artifact is provably absent. Because
the error is loud and exit is non-zero, I do not call that a defect, but a
missing artifact ought not lift a ceiling.

---

## 5. PDataset path cannot resolve — PASS

```sh
cd $W && rm -rf c5 && cp -r fx c5
sed -i 's|^- path: data/source.csv|- path: data/nowhere.csv|' c5/llm/pdatasets.md
node surface.mjs --root c5 --out $W/c5.json --generated-at 2026-09-23T00:00:00.000Z --quiet
```

```
EXIT=1
{
 "path": "data/nowhere.csv",
 "link_resolution": "missing",
 "sha256": null,
 "bytes": null,
 "rows": null,
 "view_url": null,
 "download_url": null
}
findings: [{ "severity": "error", "code": "missing-declared-source", "subject": "S1-DS-01",
  "message": "declared path `data/nowhere.csv` is absent on disk — `link_resolution: missing`, never a fabricated link (design §4.2)",
  "locator": "llm/pdatasets.md:12" }]
gaps: [{ "subject": "S1-DS-01", "field": "path", "message": "declared path absent on disk: data/nowhere.csv" }]
coverage.pdatasets_missing: ["S1-DS-01"]
```

`missing`, a visible gap, a non-zero finding, and nulls rather than invented
hashes or links. Never silent, never invented. Exactly §4.2.

---

## 6. No absolute URL under `Pages mechanism: none` — PASS

```sh
grep -n -i -E 'https?://|[a-z][a-z0-9+.-]*://' $W/base.json ; grep -c -i 'http' $W/base.json
```

```
grep exit=1 (1 = no match)
0
```

Zero occurrences of `http` anywhere in the manifest.

**I proved the guardrail can fire** rather than assuming it. Injected defect:
an absolute `Surface root:` under `Pages mechanism: none`.

```sh
cd $W && rm -rf c6d && cp -r fx c6d
sed -i 's|^Surface root: plugin/scripts/fixtures/slice|Surface root: https://example.org/pub|' c6d/llm/governance/governance-delta.md
node surface.mjs --root c6d --out $W/c6d.json --generated-at 2026-09-23T00:00:00.000Z
```

```
surface.mjs: refusing to emit absolute URLs under `Pages mechanism: none`: https://example.org/pub/data/source.csv, https://example.org/pub/data/generated.csv, https://example.org/pub/data/source.csv, https://example.org/pub/data/generated.csv
EXIT=2
manifest written? NO
```

It refuses to write the manifest at all. That is the right severity.

Narrowness worth recording (low): the guardrail inspects only `view_url` and
`download_url`, not the serialized manifest. Declaring `path:
https://example.org/source.csv` puts the string `https://` into the manifest
three times — in `path`, in the finding message, in the gap message — while
`view_url` stays `null` and `link_resolution` is `missing` with an error and
exit 1. Those are *echoes of the declared input*, not fabricated links, so the
design intent holds; but the delta's sentence "no absolute URL may appear
anywhere in the generated manifest" is literally violable and is not what the
code checks.

---

## 7. Undeclared determinism level — PASS, with a prose defect

```sh
cd $W && rm -rf c7 && cp -r fx c7
sed -i '/^\/\/ determinism: L3$/d' c7/checks/ac01-duplicate-rejection.mjs
sed -i '/^- determinism: L3$/d' c7/llm/pdatasets.md
node surface.mjs --root c7 --out $W/c7.json --generated-at 2026-09-23T00:00:00.000Z
```

```
  P1-AC-01   AGENT VERIFIED       --  
  gaps 2  findings: 3 error, 1 warn, 2 info
EXIT=1
P1-AC-01 evidence determinism: [null] best: null ceiling: AGENT VERIFIED state: AGENT VERIFIED
S1-DS-02 det: null source: null
by_best_determinism: {"L1":1,"L2":0,"L3":3,"none":1}
```

```json
{ "severity": "error", "code": "undeclared-determinism", "subject": "P1-AC-01",
  "message": "evidence `checks/ac01-duplicate-rejection.mjs` declares no determinism level. There is no default: L1 would quietly cap the claim and L3 would quietly launder an assertion (design §14.1)" }
```

No default in either direction — the field is `null`, it is a gap, exit 1, and
the claim loses its ceiling. That is the requirement, met.

**But the prose then defaults to `L1` anyway.** The same run emits:

```json
{ "severity": "info", "code": "l1-only", "subject": "P1-AC-01",
  "message": "only `L1` (attested) evidence: capped at `AGENT VERIFIED` and can never reach `HUMAN VERIFIED` (design §6.3)" }
```

and `ceiling_reason: "best evidence is \`L1\` (attested): an agent's say-so is
never enough"`. The evidence is not `L1`; its level is undeclared. §14.1 says
an undeclared level is a gap marker, not an assumption — the machine field
obeys, the human-facing sentence does not.

---

## 8. Marker history mutation — FAIL in `surface.mjs`

Two mutations at once: an existing *history* marker rewritten in place on
`P1-AC-01`, and `P1-AC-03`'s drift-reset line deleted.

```sh
cd $W && rm -rf c8 && cp -r fx c8
sed -i 's|^  — AGENT VERIFIED (PR #41, 2026-09-22)$|  — HUMAN VERIFIED (PR #41, 2026-09-22)|' c8/llm/claims.md
sed -i '/— NOT VERIFIED (claim text edited, 2026-09-23)/d' c8/llm/claims.md
node surface.mjs --root c8 --previous $W/base.json --out $W/c8b.json --generated-at 2026-09-23T00:00:00.000Z
```

```
  P1-AC-03   HUMAN VERIFIED       L3  
  gaps 0  findings: 1 error, 1 warn, 1 info
EXIT=1
P1-AC-03 {"state":"HUMAN VERIFIED","marker_state":"HUMAN VERIFIED","history":["— AGENT VERIFIED (PR #41, 2026-09-20)"],"current":"— HUMAN VERIFIED (PR #42, 2026-09-21)","drift":null}
```

`P1-AC-03` — the fixture's own demonstration of §5.4/§3.5 — is restored to
`HUMAN VERIFIED` by deleting one line, and **no finding mentions the deletion**.
The one error in that run is an unrelated `state-cap-violation` on `P1-AC-02`
(my `sed` matched its marker too). The previous manifest holds the erased line
verbatim:

```
prev current_marker: — NOT VERIFIED (claim text edited, 2026-09-23) | prev state: NOT VERIFIED
```

The `--previous` comparison reads only `text_sha256`; `markers[]`, `history[]`
and `current_marker` are emitted and never compared. §3.5 says removal "is a
violation, and it is mechanically checkable" — in this engine it is not
checked.

**Fair attribution:** the designated enforcer is the sixth L0 diff shape, and
`plugin/scripts/governance-checks.mjs` (another builder) does implement it —
`shape === 'verification-marker'` rejects any removed-or-edited line versus
`BASE`, deliberately not using `pairedConstraint`. So the system as a whole
catches this **in the L0 allowlist lane, against a git base**. It is not caught
by the tool that computes and publishes the verdict, and not caught at all
outside that lane.

---

## 9. A deterministic script that returns the wrong answer — FAIL

The sharpest form: make the claim **false**, keep every hash-comparing check
green, and change no recorded outcome.

```sh
cd $W && rm -rf c9 && cp -r fx c9
# 1. duplicates are now ACCEPTED by default — the claim becomes false
sed -i "s|const acceptDuplicates = opts.perturb === 'accept-duplicates';|const acceptDuplicates = opts.perturb !== 'reject-duplicates';|" c9/transform.mjs
# 2. regenerate the committed output so transform --check and cl01's sha compare still agree
cd c9 && node transform.mjs && node transform.mjs --check
# 3. replace the check body with an unconditional pass; EVIDENCE header untouched
```

```
wrote data/generated.csv: 11 accepted, 1 rejected
PASS transform --check: 11 accepted, 1 rejected
```

`data/generated.csv` now contains the duplicate twice:

```
S-001,Grace Hopper,88.00,2026-09-01
S-001,Grace Hopper,88.00,2026-09-04
```

Both replays pass:

```
PASS P1-AC-01 REPLAY: duplicate rejection verified
EXIT=0
PASS P1-AC-01 MODIFIED REPLAY (--perturb accept-duplicates): duplicate rejection verified
EXIT=0
```

```sh
node surface.mjs --root c9 --previous $W/base.json --out $W/c9.json --generated-at 2026-09-23T00:00:00.000Z
```

```
  P1-AC-01   HUMAN VERIFIED       L3  
  P1-AC-03   NOT VERIFIED         L3  
  P1-AC-04   AGENT VERIFIED       L3  unfalsified
  S1-CL-01   HUMAN VERIFIED       L3  
  gaps 0  findings: 0 error, 1 warn, 1 info
EXIT=0
```

`P1-AC-01` ("duplicate source IDs are rejected") is false and reads
`HUMAN VERIFIED`. `S1-CL-01` ("exactly nine normalized records") is false and
reads `HUMAN VERIFIED`; its untouched, human-authored check says otherwise when
actually run:

```
FAIL S1-CL-01 REPLAY
  - recomputed record count 11 !== 9
EXIT=1
```

---

## 10. A check that always passes — PASS narrowly, forgeable by one word

On the honest fixture the detector works, and the coverage block names the
right claim (`"unfalsified": ["P1-AC-04"]`, `ceiling_reason: "MODIFIED REPLAY
did not fail…"`). That is a real result.

Now the flip the brief asked for. I changed **one word in one code comment** on
`ac04-transform-runs.mjs` and appended a `HUMAN VERIFIED` marker (append-only
respected):

```sh
cd $W && rm -rf c10 && cp -r fx c10
sed -i 's|^// modified-replay-outcome: pass$|// modified-replay-outcome: fail|' c10/checks/ac04-transform-runs.mjs
sed -i 's|^  — AGENT VERIFIED (PR #43, 2026-09-22)$|  — AGENT VERIFIED (PR #43, 2026-09-22)\n  — HUMAN VERIFIED (PR #99, 2026-09-23)|' c10/llm/claims.md
cd c10 && node checks/ac04-transform-runs.mjs --perturb accept-duplicates
```

The check binary is untouched and still fails to fail:

```
PASS P1-AC-04 MODIFIED REPLAY (--perturb accept-duplicates): the transformation ran to completion
MODIFIED REPLAY EXIT=0 (0 = it did NOT fail)
```

```sh
node surface.mjs --root c10 --previous $W/base.json --out $W/c10.json --generated-at 2026-09-23T00:00:00.000Z
```

```
  P1-AC-04   HUMAN VERIFIED       L3  
  gaps 0  findings: 0 error, 0 warn, 1 info
EXIT=0
```

```json
{
 "state": "HUMAN VERIFIED",
 "ceiling": "HUMAN VERIFIED",
 "ceiling_reason": "L3 evidence with a MODIFIED REPLAY that failed as it should (design §14.4)",
 "unfalsified": false,
 "mr": { "recorded_outcome": "fail", "as_expected": true, ... }
}
```

The fixture's deliberately vacuous check — the thing the README says is "the
fixture's reason to exist" — reaches `HUMAN VERIFIED` with zero findings and
exit 0.

The builder ran this same experiment (report §4, "The detector is itself not
vacuous") and presented it as proof the detector is sensitive. It is that. It
is also proof that the detector reads only what the check's author says about
itself, and I read the second conclusion as the load-bearing one.

### 10b — the `unfalsified` signal is also maskable by a sibling

Adding a second evidence block for `P1-AC-04` that *claims* a falsifying
modified replay makes the known-vacuous check's warning vanish entirely:

```
  P1-AC-04   AGENT VERIFIED       L3  
  gaps 0  findings: 0 error, 0 warn, 1 info
EXIT=0
{ "state": "AGENT VERIFIED", "ceiling": "HUMAN VERIFIED",
  "unfalsified": false, "unfalsified_reason": null,
  "evidence": [["checks/ac04-extra.mjs","fail",true],
               ["checks/ac04-transform-runs.mjs","pass",false]] }
coverage.unfalsified: []
```

The per-evidence `as_expected: false` is still visible, but the claim-level
flag, the `warn` finding and `coverage.unfalsified` are all gone. `falsifying
.length > 0` wins over `failedToFail.length > 0`. A reader scanning coverage
sees nothing wrong.

---

## 11. `derived_from` honesty — my argument

```sh
cd $W && rm -rf c11 && cp -r fx c11 && sed -i '/^- derived_from: none$/d' c11/llm/pdatasets.md
node surface.mjs --root c11 --out $W/c11.json --generated-at 2026-09-23T00:00:00.000Z --quiet
```

```
EXIT=1
STATED none  : {"derived_from":[],"derived_from_declared":"none","provenance_root":true,"provenance_chain":["S1-DS-01"]}
UNRECORDED   : {"derived_from":[],"derived_from_declared":null,"provenance_root":true,"provenance_chain":["S1-DS-01"]}
findings: [{ "severity":"error","code":"unstated-provenance","subject":"S1-DS-01",
  "message":"`derived_from` is required and `none` must be STATED, so a root dataset is distinguishable from one whose provenance was never recorded (design §4.1)" }]
```

**My view, argued.** `derived_from: []` on its own is **not** an honest
statement of "none". An empty array is JSON's natural value for "I have nothing
to say", and the experiment above shows it is byte-identical between a root
that declared `none` and one that declared nothing at all. Had the manifest
carried only that field, §4.1 would be violated outright.

It does not carry only that field. `derived_from_declared` is `"none"` versus
`null`, and the omission additionally produces an error finding, a gap and exit
1. So the **manifest as a whole satisfies §4.1** — a root dataset *is*
distinguishable from an unrecorded one — and the requirement is met by the
companion field rather than by the array. I accept it, with one reservation:
`derived_from` is the field's canonical name and the one a consumer will reach
for, and it is the lossy one. Naming the honest field `derived_from` and the
convenience one `derived_from_ids` would have put the truth in the obvious
place.

**The real defect here is adjacent.** `provenance_root: true` and
`provenance_chain: ["S1-DS-01"]` are *derived* assertions, and the generator
emits them identically for both cases. For the unrecorded dataset the engine is
stating, as a derived fact, that the dataset is a provenance root — when the
only honest derived answer is "unknown". §4.2's rule is "never silent, never
invented". The omission is not silent; the rootness is invented.

---

## 12. Is the exit code trustworthy? — PASS, could not break it

Structural check: every `finding()` call site precedes the counting.

```sh
grep -n 'const counts = ' surface.mjs ; grep -n "finding('" surface.mjs | tail -3
```

```
914:const counts = { error: 0, warn: 0, info: 0 };
787:        finding('error', 'unstated-provenance', id,
844:      finding('error', 'unknown-provenance', d.id,
853:      finding('error', 'provenance-cycle', d.id, ...
```

Last producer at line 853, counter at 914, `process.exit(counts.error > 0 ? 1 :
0)` is the final statement. The early exits (`SKIP`, `die()`, the URL
guardrail) all occur before any finding can exist, or exit 2.

I tried to make an error coexist with exit 0 by disabling the projection that
would have displayed it:

```sh
cd $W && rm -rf c12a && cp -r fx c12a
sed -i 's|^Verification: ENABLED|Verification: DISABLED|' c12a/llm/governance/governance-delta.md
sed -i '/^- derived_from: none$/d' c12a/llm/pdatasets.md
node surface.mjs --root c12a --out $W/c12a.json --generated-at 2026-09-23T00:00:00.000Z
```

```
EXIT=1
verification projection: null
findings_by_severity: {"error":1,"warn":1,"info":1}
findings: [ 'error unstated-provenance S1-DS-01', 'warn unfalsified P1-AC-04', 'info l1-only P1-AC-02' ]
```

Still exit 1. **The exit code is trustworthy given the findings list.** The
problem is never that an error escapes the exit code; it is that attacks 1, 2,
3, 8, 9 and 10 produce no finding at all. Minor side-observation from this
probe: with `Verification: DISABLED` the projection drops to `null` while stdout
still prints all five claims and their states, and findings reference claims
absent from the manifest.

---

## Additional attacks not on the list

### 13. The `L1` cap is bypassable by editing one letter — FAIL (severity: critical)

The orchestrator confirmed the cap fires on `P1-AC-02`. It fires on a
*declared* level, and the declaration is a comment in a file anyone can edit.
`evidence/attestations.md` holds an agent's prose opinion that its own document
calls "Nobody can check that". I changed `determinism: L1` to `L3` and added
four comment lines:

```sh
cd $W && rm -rf p_F && cp -r fx p_F
sed -i 's|^determinism: L1$|determinism: L3|' p_F/evidence/attestations.md
sed -i 's|^replay: none$|replay: node checks/ac04-transform-runs.mjs\nreplay-outcome: pass\nmodified-replay: node checks/ac04-transform-runs.mjs --perturb accept-duplicates\nmodified-replay-outcome: fail|' p_F/evidence/attestations.md
sed -i 's|^  — AGENT VERIFIED (PR #41, 2026-09-22)$|  — AGENT VERIFIED (PR #41, 2026-09-22)\n  — HUMAN VERIFIED (PR #99, 2026-09-23)|' p_F/llm/claims.md
node surface.mjs --root p_F --out $W/pF.json --generated-at 2026-09-23T00:00:00.000Z
```

```
  P1-AC-02   HUMAN VERIFIED       L3  
  gaps 0  findings: 0 error, 1 warn, 0 info
EXIT=0
{
 "state": "HUMAN VERIFIED",
 "ceiling": "HUMAN VERIFIED",
 "best": "L3",
 "evidence_produced_by": [{ "actor": "fixture-builder", "class": "agent" }]
}
```

An agent's untestable opinion about its own work is now `HUMAN VERIFIED`, and
the manifest records in the same breath that the evidence was produced by an
`agent`.

The same result is reachable by adding a 14-line file that is entirely comments
plus one `process.stdout.write`.

### 14. `produced_by.class` is parsed, stored and never consulted

```sh
grep -n "producedBy\|produced_by\|\.class" surface.mjs
```

```
478:      let producedBy = null;
480:      if (pb) producedBy = { actor: pb[1].trim(), class: pb[2] };
482:        gap(claimId, 'produced_by', ...
510:        produced_by: producedBy,
820:        produced_by: fields.get('produced_by') ?? null,
```

No read site. §5.3 mechanism 2 (actor-class gate) has no representation in the
engine: nothing requires evidence behind a human state to involve a human, and
nothing checks the cited PR. On the committed fixture, `P1-AC-01` reaches
`HUMAN VERIFIED` on evidence whose every record is `produced-by:
fixture-builder (agent)`.

### 15. Duplicate claim IDs are accepted silently — FAIL (severity: medium)

I appended a second, contradictory `P1-AC-03` asserting `HUMAN VERIFIED`:

```
  P1-AC-03   NOT VERIFIED         L3  
  P1-AC-03   HUMAN VERIFIED       L3  
  gaps 0  findings: 0 error, 1 warn, 1 info
EXIT=0
claims with id P1-AC-03: [ { line: 25, state: 'NOT VERIFIED' }, { line: 31, state: 'HUMAN VERIFIED' } ]
by_state: {"NOT VERIFIED":1,"AGENT VERIFIED":2,"HUMAN REVIEWED":0,"HUMAN VERIFIED":3,...}
dup finding? 0
```

§3.2 makes the ID a claim's identity. Uniqueness is never checked. A consumer
using `claims.find()` sees `NOT VERIFIED`; one building a `Map` (as
`surface.mjs` itself does for `byId` and for `prevClaims` in the drift
comparison) sees `HUMAN VERIFIED`. Two readers of the same manifest disagree
about the same claim.

### 16. Inline marker smuggling — not honoured, but not reported either (low)

A marker crammed onto the claim line itself is correctly **not** honoured —
state stays `AGENT VERIFIED` — but it is swallowed into `text`, silently
changing `text_sha256` and losing the authority:

```json
{
 "text": "Normalization preserves the meaning of every source record it accepts. (design §6.3) — HUMAN VERIFIED (PR #99, 2026-09-23)",
 "authority": null,
 "state": "AGENT VERIFIED"
}
```

A human reading `llm/claims.md` sees `HUMAN VERIFIED` on the line; the manifest
says otherwise; `surface.mjs` emits no finding. `governance-checks.mjs` check 7
does flag inline markers, so the system covers it; the engine does not.

---

## Defects, by severity, with the smallest fix for each

| # | Defect | Severity | Smallest fix |
|---|---|---|---|
| D1 | A verdict of `HUMAN VERIFIED` rests on `replay-outcome` / `modified-replay-outcome` strings that nothing ever executes or checks. One word in a comment flips a vacuous check to `HUMAN VERIFIED` (item 10); a fabricated comment block lifts an `L1` opinion to `HUMAN VERIFIED` (item 13). | **Critical** | Until a replay runner exists, treat a recorded-but-unobserved outcome as what §14.1 says it is — testimony. Either (a) cap the ceiling at `AGENT VERIFIED` when no run record with an `execution_id` backs the outcome, or (b) at minimum add `outcome_source: "attested"` to each replay record and an `attested-outcome` warn finding so the manifest never presents an unobserved outcome as an observation. (b) is a ~10-line change. |
| D2 | §5.5 artifact invalidation is unimplemented. `dataset_sha256`, evidence `sha256`, `claims_source_sha256`, `pdataset_source_sha256`, `delta_sha256` are all recorded and never compared (items 2, 3). | **High** | In the `--previous` block, extend the loop beyond `text_sha256`: for each claim compare each evidence `sha256` and each bound PDataset `sha256` against the previous manifest; on a mismatch emit `error`/`artifact-invalidated` and set `state = 'NOT VERIFIED'`, `state_source = 'artifact-invalidation'`, with `proposed_marker: "— NOT VERIFIED (artifact changed: <identifier>, YYYY-MM-DD)"` — exactly the shape §5.5 specifies and exactly the shape the drift path already implements. |
| D3 | Drift is undetectable in the default invocation, and the default `--out` overwrites the committed manifest that would have been the baseline (item 1). | **High** | Default `--previous` to `<root>/<output dir>/surface-manifest.json` when it exists and no `--previous` was given, reading it *before* writing. Two lines. A `--no-previous` escape hatch keeps a first run clean. |
| D4 | Marker-block mutation and deletion are invisible to the engine (item 8). | **Medium** | In the `--previous` block, assert that the previous claim's `history + current_marker` is a prefix of this run's; emit `error`/`marker-history-mutated` otherwise. The data is already in both manifests. |
| D5 | Duplicate claim IDs accepted silently; consumers disagree about the same claim (item 15). | **Medium** | After the claim loop, group by `id` and emit `error`/`duplicate-claim-id` for any group larger than one. |
| D6 | A sibling evidence record masks a known failed-to-falsify check: the claim-level `unfalsified` flag, the `warn` finding and `coverage.unfalsified` all disappear (item 10b). | **Medium** | Keep the two signals separate. Add `coverage.failed_to_falsify` and a `warn` finding whenever *any* executable evidence has `modified_replay.as_expected === false`, independent of whether a sibling falsified. |
| D7 | `provenance_root: true` and a `provenance_chain` are asserted for a dataset whose provenance was never recorded — inventing rootness (item 11). | **Medium** | `provenance_root = rawDerived === 'none' ? true : (rawDerived === null ? null : false)`; leave `provenance_chain` null when `derived_from_declared` is null. |
| D8 | `produced_by.class` parsed, stored, never consulted; §5.3 mechanism 2 has no engine representation (item 14). | **Medium** | Out of scope to fix fully here (it needs the PR-approval gate), but the engine can at least emit `info`/`human-state-on-agent-evidence` when a `HUMAN REVIEWED`/`HUMAN VERIFIED` marker rests entirely on evidence whose every `produced_by.class` is `agent`. |
| D9 | Undeclared determinism is reported to the reader as "only `L1` (attested) evidence" in `ceiling_reason` and the `l1-only` finding (item 7). | **Low** | Branch on `levels.length === 0` before the `executable.length === 0` branch; emit `undeclared-determinism-only` with wording that says undeclared, not `L1`. |
| D10 | The absolute-URL guardrail inspects only `view_url`/`download_url`, not the serialized manifest, so the delta's "anywhere in the generated manifest" is broader than what is enforced (item 6). | **Low** | Run the existing regex over `serialized` and exclude the finding/gap `message` fields, or narrow the delta's sentence to match the code. |
| D11 | Inline markers are folded into claim text with no finding (item 16). | **Low** | Detect ` — <STATE> (` in the claim body and emit `error`/`inline-marker`, matching `governance-checks.mjs` check 7. |

---

## Builder claims I could not reproduce

**None.** Every claim in `BUILDER-1-REPORT.md` that I tested reproduced
exactly, including the ones I most expected to be flattering:

- §3 determinism and `content_sha256` `f00eeab…` — reproduced, and the
  committed manifest regenerates byte-identically.
- §4 the `P1-AC-02` `L1` cap and its `state-cap-violation` message — reproduced.
- §5 `grep -nE '[a-z][a-z0-9+.-]*://'` over the committed manifest, no match — reproduced.
- §6 deleted evidence → `state_source: "capped-by-evidence"`,
  `coverage.claims_with_no_evidence: ["P1-AC-01"]` — reproduced verbatim.
- §6 no `## Published Surface` block → `SKIP`, exit 0, nothing emitted — reproduced.
- §2 `node --check` clean on all six `.mjs`, zero non-`node:` imports — reproduced.
- §7 the whole coverage block — reproduced field for field.

The report's self-description is accurate and it names its own weak points
(decisions 4, 6, 7). My disagreement is with one *reading*, not one fact:
report §4 presents the `modified-replay-outcome: pass → fail` flip as evidence
the detector is not vacuous. The same experiment is the proof that the verdict
is a function of an editable comment, and that is the more important thing the
experiment shows.

One caveat on the README rather than the report: "delete it, rerun the
generator, and you get it back" holds in-repo, but `governance_version` is read
by walking up to eight directories **above** `--root` looking for a `VERSION`
file, so the same fixture copied elsewhere yields a different
`content_sha256` (`2697a50b74…` in my workspace until I added a `VERSION`).
The builder discloses the null case in report §2; the README's byte-identity
instruction does not carry the caveat.

---

## What I tried hard to break and could not

Stated plainly, because it is a real result:

- **The exit code.** I could not construct any input where an `error`-severity
  finding is reported and the process exits 0. The ordering is structurally
  sound, not accidental.
- **The determinism cap as a refusal.** Every time an asserted state exceeded
  the computed ceiling, the asserted state was **refused** and `state` dropped
  to the ceiling with a named error — not presented with a warning attached.
  Builder decision 3 is the right reading and it is implemented correctly.
- **Malformed markers.** A marker with free prose in the parenthetical is
  rejected *and* its state is not honoured; the last well-formed marker wins.
  I could not get a malformed `HUMAN VERIFIED` to take effect.
- **Fabricated links.** I could not make the generator invent a URL, a hash, a
  byte count or a row count for anything absent from disk. Everything was
  `null` with a gap and an error. The `Pages mechanism` guardrail refuses to
  write the manifest at all, which I verified by making it fire.
- **Path invention generally.** `link_resolution: missing` behaved correctly
  under every variation I tried, including an `https://` path and a missing
  `path:` field.
- **Determinism defaulting.** Neither `L1` nor `L3` is ever assumed for a
  stripped level; the field goes `null` and the run fails. The `manual` →
  `L1` derivation (the inverted-scale defect C-1) is guarded in code and I
  made it fire.
- **Un-ID'd claims.** Counted, printed on stdout, carried in
  `unidentified_claims` with a note. Never silently dropped.
- **Provenance integrity.** `unknown-provenance` and `provenance-cycle` both
  fired on injected defects.

The engine's *vocabulary* is honest throughout — `marker_state` versus `state`,
`state_source`, `recorded_outcome`, `derived_from_declared`,
`transformation_determinism_source`, `ceiling_reason`. The gap is not honesty
of naming. It is that the engine believes what the artifacts say about
themselves.

---

## Every check I relied on, and the defect I injected to prove it can fail

A check I could not make fail is not evidence. All of these fired.

| Check (`code`) | Injected defect | Result |
|---|---|---|
| `state-cap-violation` | `rm checks/ac01-duplicate-rejection.mjs` | error, state → `NOT VERIFIED`, exit 1 |
| `state-cap-violation` | append `— HUMAN VERIFIED` to `L1`-only `P1-AC-02` | error, state held at `AGENT VERIFIED`, exit 1 |
| `claim-text-drift` | reword `P1-AC-01`, run with `--previous` | error, state → `NOT VERIFIED`, `proposed_marker` emitted, exit 1 |
| `missing-declared-source` (claims) | `path: data/nowhere.csv` | error + gap + `link_resolution: missing`, exit 1 |
| `missing-declared-source` (evidence) | `locator: evidence/does-not-exist.md` | error + gap, exit 1 |
| `undeclared-determinism` (evidence) | strip `// determinism: L3` | error + gap, level `null`, exit 1 |
| `undeclared-determinism` (pdataset) | strip `- determinism: L3` | error + gap, exit 1 |
| `manual-transformation-determinism` | declare `L3` on the `manual` root dataset | error, derived `L1` wins, exit 1 |
| `unstated-provenance` | delete `- derived_from: none` | error + gap, exit 1 |
| `unknown-provenance` | `derived_from: S1-DS-99` | error, exit 1 |
| `provenance-cycle` | `S1-DS-01` ← `S1-DS-02` ← `S1-DS-01` | error on both datasets, exit 1 |
| `malformed-marker` | `— HUMAN VERIFIED (because I checked it, 2026-09-23)` | error, state falls back to last well-formed marker, exit 1 |
| `undeclared-claim-kind` | rename `P1-AC-04` → `P1-ZZ-04` | error, exit 1 |
| `evidence-for-unknown-claim` | `EVIDENCE S1-CL-01` → `S1-CL-77` | warn, plus `state-cap-violation` on the orphaned claim, exit 1 |
| `unfalsified` | committed fixture `P1-AC-04` | warn, `coverage.unfalsified: ["P1-AC-04"]`, exit 0 by design |
| absolute-URL guardrail | `Surface root: https://example.org/pub` | refuses to write the manifest, exit 2 |
| `SKIP` path | rename the `## Published Surface` heading | `SKIP`, exit 0, nothing emitted |

And the checks that **do not exist**, each proven absent by an injected defect
that produced `0 error` and `exit 0`: artifact-hash invalidation (D2), dataset
invalidation (D2), marker-history mutation (D4), duplicate claim ID (D5),
replay-outcome verification (D1), actor-class gate (D8).

---

## Recommendation

Do not mark G-3's slice human-verified on this engine as it stands. D1, D2 and
D3 are each independently sufficient to let a false claim carry
`HUMAN VERIFIED` through a clean, green, exit-0 run, and D1 lets an agent do it
to its own work by editing a comment — the precise failure §5.3 exists to
prevent.

None of this is a redesign. D2 and D4 are extensions of the `--previous` loop
that already exists and already does the analogous thing for `text_sha256`;
D3 is a default; D1's honest form (b) is a field and a warning. The
architecture is sound; it is under-enforced in exactly the places where the
inputs are self-reported.
