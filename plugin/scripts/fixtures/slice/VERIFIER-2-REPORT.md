FAIL

# Verifier 2 — execution verification of the G-3 slice

Date: 2026-09-23
Branch: `feat/g3-verification-slice`
Under test: `plugin/scripts/replay.mjs` (new), `plugin/scripts/surface.mjs`
Verifier: **not the Builder.** Read the spec first; read `BUILDER-2-REPORT.md` last.
Method: every attack on a **copy** under a scratchpad. The committed fixture
was not mutated. No `git`, no `gh`, no writes to the repo outside this file.

---

## 0. The one-sentence answer

Execution is real and the sandbox is genuinely hard — but **the verdict is
still a function of an editable comment**, one layer up: a single non-declaring
comment line added to somebody else's check lets a claim borrow that check's
falsification, and the fixture's own deliberately-vacuous `P1-AC-04` reaches
`HUMAN VERIFIED` with **exit 0 and zero warnings**, its `failed-to-falsify`
finding erased. Two further lanes reach the same place: a MODIFIED REPLAY that
*crashes* is scored as "it failed as it must", and `--no-previous` still
launders claim-text drift in one command.

| # | Attack | Verdict |
|---|---|---|
| 1 | Check lies about its own execution (exit 0, assertion false) | **FAIL** — nothing catches it |
| 2 | Swap the executed artifact past both guards | **FAIL** — both guards bypassed, D1 |
| 3 | Sandbox: metacharacters, `..`, symlink, absolute, arg-path, non-`node` | **PASS** — 15/15 refused (one low-severity off-by-one, D6) |
| 4 | Hang / flood | **PARTIAL** — hang honest; `maxBuffer` breach misreported as a timeout, D4 |
| 5 | Modified replay that failed to *run*, not failed *correctly* | **FAIL** — indistinguishable, D3 |
| 6 | `produced_by.class` satisfying a human state | **FAIL** — self-attested, one word, D5 |
| 7 | Determinism under real execution | **PASS** — byte-identical; one nit, D7 |
| 8 | Human check shares no pipeline code | **PASS** — proven by deleting `transform.mjs` |
| 9 | `error` finding coexisting with exit 0 | **PASS** — structurally impossible |
| 10 | Is `info human-state-on-agent-evidence` the right severity | **No** — argued in §10 |

---

## 1. Can a check be made to lie about its own execution? — **FAIL**

**Defect injected.** A new claim `P1-AC-05` — *"Two plus two equals five on the
committed source dataset"* — with a check that evaluates its assertion, finds
it **false**, prints so, and exits 0 anyway. Its exit status is decided by one
thing only: whether a `--perturb` flag was passed.

```js
const assertionHolds = false;
if (!assertionHolds) process.stdout.write('ASSERTION FALSE: 2 + 2 === 5 does not hold\n');
if (perturb) { process.stdout.write('FAIL P1-AC-05 MODIFIED REPLAY\n'); process.exit(1); }
process.stdout.write('PASS P1-AC-05 REPLAY\n');
process.exit(0);
```

```
$ node plugin/scripts/surface.mjs --root .../a1 --out .../a1.json --no-previous
  claims 6  evidence 7  pdatasets 2  un-ID'd claim lines 1
  replays: 12 executed, 0 unexecuted  baseline: none
  P1-AC-01   HUMAN VERIFIED       L3  
  P1-AC-02   AGENT VERIFIED       L1  
  P1-AC-03   NOT VERIFIED         L3  
  P1-AC-04   AGENT VERIFIED       L3  unfalsified failed-to-falsify
  P1-AC-05   HUMAN VERIFIED       L3  
  S1-CL-01   HUMAN VERIFIED       L3  
  gaps 0  findings: 0 error, 2 warn, 3 info
EXIT=0
```

```
state: HUMAN VERIFIED | ceiling: HUMAN VERIFIED
ceiling_reason: L3 evidence EXECUTED this run: REPLAY exited 0 and MODIFIED REPLAY exited 1 — it failed as it must (design §14.2, §14.4)
lifts_ceiling: True blocked: None
replay stdout_first_line: ASSERTION FALSE: 2 + 2 === 5 does not hold
modified stdout_first_line: ASSERTION FALSE: 2 + 2 === 5 does not hold
```

The manifest **records the confession verbatim** — `ASSERTION FALSE: 2 + 2 ===
5 does not hold` — in both execution records, and grades the claim
`HUMAN VERIFIED`. Nothing reads `stdout_first_line`.

**Judgement.** Exit status as the sole oracle is the correct design; a generator
cannot semantically verify a check. But this exposes a structural weakness
that is *not* inherent (see §8, D8): **the perturbation is self-administered.**
Every MODIFIED REPLAY in the fixture — including the human-authored one — is
*the same artifact re-invoked with a flag it interprets itself*. "MODIFIED
REPLAY must fail" is therefore satisfiable by `if (perturb) exit 1`. The mode
§14.2 describes ("mutate an input, break a precondition, delete the thing
being asserted about") is an operation on the *environment*; what is
implemented is an operation the *check chooses to perform on itself*.

---

## 2. Can the executed artifact be swapped? — **FAIL (D1, high)**

The builder claims two guards and stops at variant `13c`. Both fire; both are
bypassable. I proved each can fire before relying on it.

### 2a — guard 1 fires (defect injected: replay repointed at another check)

`checks/ac04-transform-runs.mjs`'s `replay:`/`modified-replay:` repointed at
`checks/ac01-duplicate-rejection.mjs`, marker bumped to `HUMAN VERIFIED`:

```
  P1-AC-04   AGENT VERIFIED       L3  
  gaps 0  findings: 1 error, 1 warn, 2 info
EXIT=1
error | state-cap-violation | marker asserts `HUMAN VERIFIED` but the evidence ceiling is `AGENT VERIFIED` — the executed artifact is not the declared `locator: checks/ac04-transform-runs.mjs`. The asserted state is refused; the claim is presented as `AGENT VERIFIED`.
warn | replay-artifact-mismatch | the executed artifact(s) `checks/ac01-duplicate-rejection.mjs` are not the declared `locator: checks/ac04-transform-runs.mjs`, so the hash this record binds is not the hash of what ran. The record cannot lift this claim's ceiling.
```

### 2b — guard 2 fires (defect injected: `locator:` also repointed)

```
  P1-AC-04   AGENT VERIFIED       L3  
EXIT=1
error | state-cap-violation | marker asserts `HUMAN VERIFIED` but the evidence ceiling is `AGENT VERIFIED` — the executed artifact does not cite this claim (design §6.1). …
warn | replay-artifact-does-not-cite-claim | the executed artifact `checks/ac01-duplicate-rejection.mjs` does not cite `EVIDENCE P1-AC-04`. …
```

This is exactly where `BUILDER-2-REPORT.md` §2.3 stops: *"Two rules close this
family."*

### 2c — **both guards bypassed**. One comment line.

`artifactCitesClaim()` (`surface.mjs:529`) is a **loose substring search**:

```js
cites = new RegExp(`EVIDENCE\\s+${claimId}(?![A-Z0-9-])`).test(text);
```

while the parser that actually *declares* evidence anchors to end-of-line
(`EVIDENCE_RE`, `surface.mjs:443`). So a mention that the parser refuses to
treat as a declaration still satisfies the guard. Appended to `ac01`:

```js
// (context: EVIDENCE P1-AC-04 is discussed in the handoff, not asserted here)
```

```
$ node plugin/scripts/surface.mjs --root .../a2c --out .../a2c.json --no-previous
  claims 5  evidence 6  pdatasets 2  un-ID'd claim lines 1
  replays: 8 executed, 0 unexecuted  baseline: none
  P1-AC-01   HUMAN VERIFIED       L3  
  P1-AC-02   AGENT VERIFIED       L1  
  P1-AC-03   NOT VERIFIED         L3  
  P1-AC-04   HUMAN VERIFIED       L3  
  S1-CL-01   HUMAN VERIFIED       L3  
  gaps 0  findings: 0 error, 0 warn, 3 info
EXIT=0
state: HUMAN VERIFIED ceiling: HUMAN VERIFIED
ceiling_reason: L3 evidence EXECUTED this run: REPLAY exited 0 and MODIFIED REPLAY exited 1 — it failed as it must (design §14.2, §14.4)
locator: checks/ac01-duplicate-rejection.mjs executed: ['checks/ac01-duplicate-rejection.mjs']
matches_locator: True cites_claim: True
lifts_ceiling: True
--- all findings ---
  info human-state-on-agent-evidence P1-AC-01
  info human-state-on-agent-evidence P1-AC-04
  info l1-only P1-AC-02
```

**Read the row that is missing.** In every other run `P1-AC-04` carries
`unfalsified failed-to-falsify`. Here it carries nothing: because the evidence
record's `replay:` and `locator:` were repointed, the vacuous check **is never
executed**, so the fixture's single most important negative result —
the one §14.3 calls the most valuable idea in the capability — is **deleted
from the manifest, from `coverage.failed_to_falsify`, and from the page**.
Zero errors, zero warnings, exit 0.

### 2d — the strict fix does not close the family either

Appending a *well-formed* `EVIDENCE P1-AC-04` block to `ac01` (no `locator:`
trick, no loose comment) also reaches `HUMAN VERIFIED` at exit 0:

```
  P1-AC-04   HUMAN VERIFIED       L3  failed-to-falsify
  gaps 0  findings: 0 error, 1 warn, 3 info
EXIT=0
```

§6.1's many-to-many relation makes this *representable by design*, and no
static check can know that `ac01`'s duplicate-rejection assertions say nothing
about "the transformation runs to completion". 2c is strictly worse than 2d
because it also *erases* the vacuity signal; 2d at least leaves the warn.

**Smallest fix (two parts).**
1. `artifactCitesClaim()` must reuse `EVIDENCE_RE` over `stripComment(line)`
   per line, i.e. require a **declaration**, not a mention. That alone turns
   2c into 2d and restores the `failed-to-falsify` warn.
2. Raise `replay-artifact-mismatch` and `replay-artifact-does-not-cite-claim`
   from `warn` to `error`, and add a third: when an evidence record's
   `replay`/`modified-replay` execute an artifact **other than the file the
   record is declared in** (`declared_in`), say so as an `error`. Borrowing is
   then always visible at the exit code, which is the only honest position
   given 2d cannot be closed mechanically.

---

## 3. Is the sandbox real? — **PASS**

15 escape attempts through `replay.mjs --root <copy>`; every one refused,
`executed: false`, no `outcome`. Verbatim reasons:

| Command | Result |
|---|---|
| `node checks/ac01….mjs; node checks/pwn.sh` | refused — `the command contains shell metacharacters; the runner spawns a program directly and never a shell, so it is refused rather than executed with a different meaning` |
| `… && echo PWNED` | same |
| `… \| tee /tmp/x` | same |
| `… $(echo hi)` | same |
| `node -e process.exit(0)` | same |
| `node ../outside/pwn.mjs` | `script \`../outside/pwn.mjs\` resolves outside the declared surface root` |
| `node checks/../../outside/pwn.mjs` | same |
| `node checks/symlink-out.mjs` (file symlink out) | `script \`checks/symlink-out.mjs\` resolves outside the declared surface root` |
| `node checks/outdir/pwn.mjs` (**directory** symlink out) | `script \`checks/outdir/pwn.mjs\` resolves outside the declared surface root` |
| `node /abs/path/pwn.mjs` | `… is an absolute path; commands are resolved inside the declared root` |
| `bash checks/pwn.sh` | `program \`bash\` is not in the execution allowlist (node); execution is bounded to in-repo checks` |
| `sh -c echo` | `program \`sh\` is not in the execution allowlist (node)…` |
| `/usr/bin/env node …` | `program \`/usr/bin/env\` is not in the execution allowlist (node)…` |
| `node --experimental-x checks/….mjs` | `` `node` was declared with no script to run `` |
| `node checks/….mjs ../outside/pwn.mjs` | `argument \`../outside/pwn.mjs\` resolves outside the declared surface root` |
| `node checks/….mjs /abs/outside/pwn.mjs` | `argument \`…\` is an absolute path; arguments are resolved inside the declared root` |

`NODE_OPTIONS` cannot be injected (the env is pruned to `PATH`/`HOME`/`TMPDIR`
/`LANG`/`LC_ALL`/`TZ`). A symlinked **root** still works and reports
root-relative artifacts (`realpathSync` on both sides). I could not break this.

**D6 (low) — `--flag=path` argument containment is off by one segment.**
The containment test `path.resolve(rootReal, arg)` treats the flag prefix as a
path segment, which absorbs one `..`:

```
"--out=../x"     -> resolves to /srv/repo/--out=../x | inside-root? true
"../x"           -> resolves to /srv/x               | inside-root? false
what a child would do with --out=../x : /srv/x
```

`node checks/ac01-duplicate-rejection.mjs --out=../../outside/x` is accepted
and executed. Defence-in-depth only (the child is an in-root script), but the
guard does not mean what it reads. **Smallest fix:** split each argument on the
first `=` and containment-test the right-hand side too.

---

## 4. Timeout / maxBuffer — **PARTIAL**

**Hang — honest.** `checks/ac06-hang.mjs` (`setInterval` forever), run with
`--replay-timeout 3000`. The generator did not hang; both commands came back
unexecuted and the claim was capped:

```
  P1-AC-06   AGENT VERIFIED       L3  unfalsified
  replays: 12 executed, 2 unexecuted
error | replay-not-executed | REPLAY `node checks/ac06-hang.mjs` was not executed: the command did not finish within 3000ms and was killed. An outcome nobody observed is testimony (design §14.1), so it cannot support any state.
error | state-cap-violation | marker asserts `HUMAN VERIFIED` but the evidence ceiling is `AGENT VERIFIED` — REPLAY was not executed: …
EXIT=1
```

**Flood — not a pass, but reported falsely. D4 (medium).**
A child that writes 16 MiB and waits for drain exceeds the 4 MiB `maxBuffer`:

```
$ time node plugin/scripts/replay.mjs --root .../a4 --command "node checks/flood2.mjs"
 executed= False outcome= None exit= None bytes= None
 reason: the command did not finish within 60000ms and was killed
real	0m0.175s
```

The stated reason is **false**: the run lasted 0.175 s and the timeout is 60 s.
Node's own return values say what happened:

```
error.code = ENOBUFS | error.message = spawnSync … ENOBUFS
signal = SIGTERM | status = null | stdout bytes = 4259840
```

`replay.mjs:266` classifies by `res.error.code === 'ETIMEDOUT' || res.signal === 'SIGTERM'`,
and `maxBuffer` overflow kills with `SIGTERM`, so an output-budget breach is
recorded as a timeout and `timed_out: true`. Any externally-`SIGTERM`ed child
is mislabelled the same way. The direction is safe (never a pass) but a module
whose contract is *"every outcome this module reports was OBSERVED"* is stating
something it did not observe. **Smallest fix:** drop `|| res.signal === 'SIGTERM'`
and add an explicit branch — `res.error.code === 'ENOBUFS'` →
`` `the command exceeded the ${MAX_OUTPUT_BYTES}-byte output buffer and was killed` ``.

A child that floods and then calls `process.exit(0)` drops its pending writes
and exits 0; that is honestly recorded as a pass (146176 bytes captured), and
the truncation point was **stable across three runs** (`stdout_sha256`
`43c7a458…` each time), so it did not break determinism here. It is
scheduling-dependent in principle; I could not make it vary.

---

## 5. "Failed correctly" vs "failed to run" — **FAIL (D3, high)**

**Defect injected.** `P1-AC-08` with a check that takes its dataset as an
argument. Its MODIFIED REPLAY names `data/source-perturbed.csv` — a file that
was **never committed**. The check dies on `ENOENT`, exit 1.

```
// replay: node checks/ac08-argfile.mjs data/source.csv
// modified-replay: node checks/ac08-argfile.mjs data/source-perturbed.csv
```

```
  P1-AC-08   HUMAN VERIFIED       L3  
  gaps 0  findings: 0 error, 2 warn, 3 info
EXIT=0
state: HUMAN VERIFIED | ceiling_reason: L3 evidence EXECUTED this run: REPLAY exited 0 and MODIFIED REPLAY exited 1 — it failed as it must (design §14.2, §14.4)
modified exit: 1 outcome: fail as_expected: True
modified stderr_bytes: 817 stdout_first_line: ''
```

A stack trace is graded "it failed as it must". Nothing distinguishes
falsification from a crash, and — unlike `locator:` — a modified replay's
declared **inputs are never checked to exist**. In a research pipeline (§15.2,
where the perturbation *is* an input file) this is the default way to get it
wrong by accident, not only on purpose.

**Smallest fix.** The engine already holds the discriminator and ignores it:
`stdout_bytes == 0 && stderr_bytes > 0` on a MODIFIED REPLAY is a crash, not an
assertion failure. Record `modified_replay.failure_shape: 'asserted' | 'crashed'`
and refuse to lift on `'crashed'` (finding `modified-replay-failed-to-run`,
`error`). Stronger and still cheap: require the perturbed inputs to exist, i.e.
apply the `locator` existence check to every path-shaped argument of a
`modified-replay:` command.

---

## 6. `produced_by.class` — **FAIL (D5, medium)**

Two facts together:

1. The **shipped fixture** already grades `P1-AC-01` `HUMAN VERIFIED` on
   evidence whose only producer is `fixture-builder (agent)`. An agent-produced
   artifact satisfies a human state today, by design, disclosed as `info`.
2. The class is **self-attested by the artifact the agent writes**. One `sed`:

```
$ sed -i 's|^// produced-by: fixture-builder (agent)$|// produced-by: fixture-builder (human)|' checks/ac01-duplicate-rejection.mjs
  gaps 0  findings: 0 error, 2 warn, 1 info
EXIT=0
state: HUMAN VERIFIED | human_produced_evidence: True | actor classes: ['human']
coverage.human_state_on_agent_evidence: []
```

The claim's grade does not change — but the **only disclosure that it rests on
agent work disappears**, from the finding list, from `coverage`, and from the
page. §5.3 mechanism 2 is named "the actor-class gate (mechanical)"; a value an
agent writes about itself in a comment is not mechanical, it is `L1` testimony
about provenance. The engine's own principle — *an outcome nobody observed is
testimony* — is not applied to the actor field.

**Smallest fix (honest, not heroic).** Nothing in a zero-dependency,
no-git generator can *verify* authorship. So stop implying it does: record
`produced_by.class_source: 'self-attested (L1)'` in the manifest and say it on
the page, and make `human-state-on-agent-evidence` non-suppressible by widening
it — fire it whenever a human state rests on evidence with **no independently
corroborated** human producer, which under this engine is always. See §10.

---

## 7. Determinism under real execution — **PASS**

Two runs, real subprocesses, `--generated-at` pinned, identical flags:

```
content_sha256 equal: True 409c669ee9ca31c360d0
BYTE-IDENTICAL (no ledger flag)
BYTE-IDENTICAL (same ledger name)
```

No `duration_ms`, `started_at`, `finished_at`, `pid` or `ppid` anywhere in the
manifest — only the `replay.timing_excluded` prose field explaining their
absence. The ledger *does* differ between runs (`timing: {duration_ms: 64, …}`),
which is correct: it declares itself a log. The builder's §6 claim reproduces.

**D7 (low).** `content_sha256` is a function of the `--replay-ledger`
**filename**, via `manifest.replay.ledger = basename(LEDGER)`:

```
<     "content_sha256": "a7955a1f53e62efc…"     <     "ledger": "led1.json",
>     "content_sha256": "b90d81b07593d45e…"     >     "ledger": "led2.json",
```

The ledger path is an output convenience, not an input. Two people generating
the same manifest with different ledger paths disagree on its hash.
**Smallest fix:** exclude `replay.ledger` from the `content_sha256` input, as
`generated_at` already is.

---

## 8. The human-authored check — **PASS, and it is the strongest artifact here**

`human/cl01-independent-relationship.mjs` imports `node:fs`, `node:path`,
`node:url` — **nothing from the pipeline**. Not asserted; executed. I deleted
`transform.mjs` from a copy and ran both checks for `S1-CL-01`:

```
$ node human/cl01-independent-relationship.mjs
PASS S1-CL-01 REPLAY: 9 generated records match the 9 valid, uniquely-identified source records one-for-one, computed independently of transform.mjs
  human check EXIT=0
$ node human/cl01-independent-relationship.mjs --perturb drop-generated-row
FAIL S1-CL-01 MODIFIED REPLAY (--perturb drop-generated-row)
  - generated dataset holds 8 records, the claim says 9
  - source record S-011 is valid and unique but has no generated row
  human check (perturbed) EXIT=1
$ node checks/cl01-record-count.mjs
Node.js v24.18.0     ← the agent's check cannot even load
```

The independence is real and it is mechanically demonstrable. It also
re-derives the predicate from the claim *sentence* and compares scores
numerically rather than reproducing `toFixed(2)` — i.e. it does not re-run the
agent's code by hand. This is the part of the slice I tried hardest to break
and could not.

**D8 (limitation, not a code defect, stated because the report would be
dishonest without it).** Even this check's MODIFIED REPLAY is
**self-administered**: `--perturb drop-generated-row` is a flag the check
interprets about itself. A genuinely independent modified replay would perturb
the tree — copy it, mutate `data/generated.csv`, run the **unmodified**
command — so the check has no opportunity to recognise that it is being tested.
`replay.mjs` is already the right place: it could take a declared
`modified-replay-mutate: <path> <sed-like op>`, apply it to a scratch copy of
the root, and run the *replay* command unchanged. Until then, §14.2's
"MODIFIED REPLAY" is implemented as "the check's own self-test mode", which is
what §1 exploits.

---

## 9. Exit-code integrity — **PASS**

An `error` finding cannot coexist with exit 0. All `finding()` call sites end
at `surface.mjs:1389`; `counts` is computed at `1460–1461`; the process exits
at `1632` on `counts.error > 0 ? 1 : 0`. Nothing mutates `findings` in between.
Empirically confirmed on every error-producing run above, including the
write-refusal path, which still exits 1 and leaves the baseline intact:

```
surface.mjs: refusing to overwrite the baseline it contradicts — docs/verification/surface-manifest.json
  1 claim(s) drifted or were invalidated against it:
    P1-AC-01  append: — NOT VERIFIED (claim text edited, 2026-09-23)
EXIT=1
baseline still intact: YES
```

**The real exit-code problem is not integrity, it is severity assignment.** The
committed fixture ships `P1-AC-04` with a check that is *proven vacuous by
execution* and exits 0. Add D1 and a repo can be wholly laundered at exit 0.
Every signal that a check does not mean what it claims — `failed-to-falsify`,
`unfalsified`, `replay-artifact-mismatch`,
`replay-artifact-does-not-cite-claim`, `human-state-on-agent-evidence` — is
`warn` or `info`. A CI gate keyed on the exit code therefore sees none of them.

---

## 9b. `--no-previous` still launders claim-text drift — **D2 (high)**

The orchestrator confirmed that a *default* run refuses to overwrite the
baseline and cannot be laundered by repeating. That refusal has a lane around
it. Defect injected: one word of `P1-AC-01`'s claim text edited, then the
**default `--out`** (i.e. the committed baseline) with `--no-previous`:

```
$ node plugin/scripts/surface.mjs --root .../a12 --quiet --no-previous
EXIT=0
baseline overwritten? YES
P1-AC-01 state: HUMAN VERIFIED | drift: None | previous: None
findings: [('warn','failed-to-falsify','P1-AC-04'), ('warn','unfalsified','P1-AC-04'),
           ('info','human-state-on-agent-evidence','P1-AC-01'), ('info','l1-only','P1-AC-02')]

$ node plugin/scripts/surface.mjs --root .../a12 --quiet     # follow-up default run
EXIT=0
```

`surface.mjs`'s own header says *"One default run used to launder claim-text
drift permanently."* It still does; the cost is one flag documented as
`# first run: no baseline`. The engine **knows** the baseline is there — it
tests `exists(defaultBaselineAbs)` — and `--no-previous` overrides that
silently. Worse, the manifest cannot tell the two situations apart:
`previousSource` is set to ``none: `--no-previous` `` and then **never
recorded**, because `previousInfo` stays `null`. The laundered manifest is
byte-indistinguishable from a genuine first run.

This is not hypothetical: `BUILDER-2-REPORT.md` §7 discloses using exactly this
lane to re-baseline the committed fixture — *"I regenerated with
`--no-previous`, which is the honest form of…"*. It was disclosed in prose, in
a file no tool reads, precisely because the manifest has no field for it.

**Smallest fix.** (a) Always emit `previous: { source, path }` even when the
comparison was skipped, so a discarded baseline is visible in the artifact.
(b) Refuse `--no-previous` when the resolved `--out` **is** an existing
baseline, unless `--accept-baseline-rewrite` is also given — the flag that
already exists for saying it out loud.

---

## 10. Is `info` the right severity for `human-state-on-agent-evidence`?

**No. It should be `warn` at minimum, and the wording must change.**

The builder's position (§2.4) is defensible as far as it goes: *"Executed
evidence is not an attestation, and capping it would make `HUMAN VERIFIED`
unreachable for any agent-written test."* That is right. §5.3's four mechanisms
are deliberately independent, and mechanism 4 (the determinism cap) is the one
aimed at testimony. Capping agent-*authored executable* evidence would collapse
mechanism 4 into mechanism 2 and make the L3/L1 distinction meaningless. **I am
not asking for a cap.**

Three reasons `info` is nonetheless the wrong severity:

1. **It is the disclosure for a state the reader cannot otherwise reach.**
   `HUMAN VERIFIED` means, in §5.1's own words, *"a human observed or replayed
   the evidence and affirms the claim."* On `P1-AC-01` today, no human wrote
   the check, no human ran it, and no human appears anywhere in the evidence —
   a script an agent wrote, an agent ran, and an agent graded produces the
   label `HUMAN VERIFIED`. That may be the right *grade*; it is certainly the
   most surprising thing in the manifest, and §14.3's whole lesson is that the
   surprising thing must be loud. `info` is the severity used for `l1-only`,
   i.e. for facts that are *expected*.

2. **The disclosure is controlled by the party it discloses.** §6 above: one
   word in a comment removes it entirely, with no error, no warn, and no trace.
   A disclosure an agent can delete by editing its own file is not a control;
   it is a courtesy. This is the same defect shape as the one the predecessor
   found (*a verdict that is a function of a comment*) displaced from the
   verdict onto the audit of the verdict — which is why it must not be graded
   below the things it audits.

3. **The laundering is real, and §1 and §2c are what it looks like.** An agent
   that authors the claim's check, authors its perturbation flag, authors its
   `produced-by` line, and authors the comment that makes another check "cite"
   the claim has closed the loop on every input to the decision. The check
   whose execution falsifies *is* better evidence than testimony — but "an
   agent wrote the falsifier and the falsifier's own definition of being
   falsified" is a materially weaker claim than "this was falsified", and the
   manifest currently prints only the second.

**The change, and it is small.** Keep the grade. Raise the finding to `warn`;
make it fire on **every** claim at `HUMAN REVIEWED` or above whose evidence has
no human producer **that is corroborated by something other than its own
comment line** (under this engine: none, so phrase it as *"no independently
corroborated human producer"*); add `produced_by.class_source: 'self-attested'`;
and surface `coverage.human_state_on_agent_evidence` as a **headline metric**
beside `claims_l1_only`, which §6.3 already calls "the audit's headline metric
… the first honest output of this capability is an uncomfortable number". This
is the second uncomfortable number and it belongs next to the first.

Where I agree with the builder and would resist a change: do **not** make this
`error`, and do **not** cap. An `error` would make the shipped fixture fail its
own gate for doing the right thing, and would push adopters toward relabelling
`(agent)` as `(human)` — the D5 defect, incentivised.

---

## Defects

| # | Severity | Defect | Smallest fix |
|---|---|---|---|
| **D1** | **high** | Both artifact-swap guards bypassed by one non-declaring comment (`artifactCitesClaim` substring-matches where `EVIDENCE_RE` anchors). A vacuous claim reaches `HUMAN VERIFIED` at exit 0 with its `failed-to-falsify` finding erased. §2c | `artifactCitesClaim()` reuses `EVIDENCE_RE` over `stripComment(line)`; raise `replay-artifact-mismatch` / `replay-artifact-does-not-cite-claim` to `error`; add an `error` when the executed artifact ≠ `declared_in`. |
| **D2** | **high** | `--no-previous` + default `--out` launders claim-text drift in one command, exit 0; manifest records `previous: null`, indistinguishable from a first run. §9b | Always emit `previous: {source, path}`; refuse `--no-previous` when `--out` resolves to an existing baseline unless `--accept-baseline-rewrite`. |
| **D3** | **high** | A MODIFIED REPLAY that **crashes** (missing input, uncaught throw) is graded "it failed as it must". Declared perturbation inputs are never checked to exist. §5 | Record `failure_shape` from `stdout_bytes == 0 && stderr_bytes > 0`; refuse to lift on `'crashed'`; apply the `locator` existence check to path-shaped `modified-replay:` arguments. |
| **D4** | medium | `maxBuffer` (`ENOBUFS`) breach reported as `the command did not finish within 60000ms and was killed` after 0.175 s, with `timed_out: true`. §4 | Drop `\|\| res.signal === 'SIGTERM'` from the timeout test; add an explicit `ENOBUFS` branch naming the output budget. |
| **D5** | medium | `produced_by.class` is self-attested; `agent`→`human` in a comment silently deletes the only disclosure that a human state rests on agent work. §6 | `class_source: 'self-attested (L1)'`; widen and raise `human-state-on-agent-evidence` (see §10). |
| **D6** | low | `--flag=path` argument containment off by one segment; `--out=../x` reads as inside-root. §3 | Split each argument on the first `=` and containment-test the RHS. |
| **D7** | low | `content_sha256` depends on the `--replay-ledger` filename. §7 | Exclude `replay.ledger` from the hashed projection. |
| **D8** | design limitation | The perturbation is **self-administered** by the artifact under test, so "MODIFIED REPLAY must fail" is satisfiable by `if (perturb) exit 1`. §1, §8 | Declare the mutation to `replay.mjs`, apply it to a scratch copy of the root, run the **unchanged** replay command. Larger than a patch; record as the next design step. |

## Builder claims I could not reproduce

None. Every claim in `BUILDER-2-REPORT.md` that I re-tested reproduced:
the comment-flip exploit is dead (§2.2), the `L1` cap holds and can fire
(defect injected: `HUMAN VERIFIED` appended to `P1-AC-02` →
`error state-cap-violation … best evidence is L1 (attested), produced by agent`,
EXIT=1), the detector is not stuck closed (`P1-AC-01`/`S1-CL-01` reach
`HUMAN VERIFIED`), determinism survives real subprocesses byte-for-byte (§6),
and `node --test plugin/scripts/surface.test.mjs` passes
(`all regression tests passed`). The one claim that does **not** hold is §2.3's
*"Two rules close this family"* — they close `13a–13c` and not `13d` (§2c) or
`13e` (§2d).

## What I tried hard to break and could not

- **The execution sandbox.** 16 attempts across six escape classes, including a
  symlinked directory and a symlinked root. Every one refused with an accurate
  reason. Only the `--flag=path` off-by-one (D6) is a real gap and it is
  defence-in-depth.
- **Manifest determinism under real execution.** Byte-identical across runs;
  no timing, no pid, no absolute path, no URL. Even the flooding child's
  truncation point was stable across three runs.
- **The append-only marker chain and the baseline write-refusal** on the
  *default* lane — both fire, both leave the baseline intact, both exit 1.
  `--no-previous` (D2) goes around them; nothing goes *through* them.
- **The human-authored check's independence.** Deleting `transform.mjs` leaves
  it passing and the agent's check unable to load. That is a real result and
  the best artifact in the slice.
- **Exit-code integrity in the narrow sense.** No ordering or code path lets an
  `error` finding coexist with exit 0.

Read-only on the repo apart from this file. No fixes applied — reported for the
orchestrator to decide.
