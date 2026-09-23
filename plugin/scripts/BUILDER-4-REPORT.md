# Builder 4 — Governance Integration: `verification-marker` + marker-grammar validation

Date: 2026-09-23
Branch: `feat/g3-verification-slice`
Scope: activity A2 (sixth L0 diff shape) + marker grammar / state validation.

Files modified — and only these three:

- `plugin/scripts/governance-checks.mjs`
- `plugin/scripts/governance-checks.test.mjs`
- `llm/governance/l0-fast-track.md`

`plugin/scripts/surface.mjs` and `plugin/scripts/fixtures/**` were **not
touched** (confirmed: both are untracked in `git status` and neither appears in
my diff). No dependency was added; nothing reaches the network.

---

## 1. What was built

### 1.1 The sixth shape — `verification-marker`

`SHAPES` gains `'verification-marker'`, and `shapeConstraint` gains its branch.
The rule, from design §3.5 — *appending a marker line is permitted, and nothing
else is*:

1. **No line may be removed or edited vs the base.** Any removal fails. This is
   the append-only enforcement and the shape's reason to exist.
2. **Every added line must be a well-formed marker** —
   `— <STATE> (PR #<n>[, YYYY-MM-DD])`, or the reset form
   `— NOT VERIFIED (<reason>, YYYY-MM-DD)`.
3. **No added marker may assert `HUMAN REVIEWED` or `HUMAN VERIFIED`.** The L0
   fast track is the one lane in which an AI role may merge, so an L0 diff
   asserting a human's finding is an agent certifying human verification —
   §5.3's central rule, refused mechanically.

Deliberately **not** a `pairedConstraint`. `status-line-only` and
`checkbox-only` pair each removed line with an added one, i.e. they permit a
1:1 **replacement**; that is exactly what append-only forbids. A marker block
that can be rewritten in place is not a record — the one event a reader most
needs to see is a verification that was later withdrawn, and a rewrite hides
precisely that.

Consequence, stated in the policy doc: declaring `verification-marker` over a
file gives up in-lane checkbox flips for that file, because only one allow rule
matches a path and a tick flip is a replacement. That is the right trade under
this model, where a criterion is complete when verified, not when ticked.

### 1.2 Marker grammar and state validation — check `verification-markers`

A new **default** check (it runs on every invocation, not only `--l0`). It
resolves its claim source by the same precedence as every other path in this
script — `--claims <path>` flag > the delta's `## Roadmap` / `Path:` > nothing —
and reports:

| Defect | Authority |
|---|---|
| Malformed marker line (bad state word, prose in the parenthetical, missing PR citation, wrong dash, reset with no date) | §3.4 |
| A marker written on the claim line instead of below it | §3.5 — state is the LAST marker *line* |
| A marker attached to no claim, or to a claim with no ID | §3.2, §3.3 |
| A duplicated claim ID | §3.2 — an ID is an address |
| An illegal transition, read over the whole appended chain from the implicit `NOT VERIFIED` | §5.2's exhaustive table |
| A claim in a human state whose only evidence is `L1` | §5.3 mechanism 4, §6.3, §14.4 |
| A claim in a human state with no evidence citation at all, or citations declaring no level | §6.3 (`none` -> ceiling `NOT VERIFIED`), §14.1 (an undeclared level is a gap, never a default) |

**The scale is implemented the way §14.1 defines it, as amended:** `L3`
deterministic (strongest) > `L2` executable > **`L1` attested (weakest)**. The
ordering is asserted explicitly in `DETERMINISM_RANK` with a comment saying why
it must never be inverted, and §6 below proves by mutation that inverting it
breaks the suite.

**SKIP, never a false PASS.** No declared claim source -> `SKIP … — NOT VERIFIED`
naming exactly what it looked for. A declared source that is *absent* -> **FAIL**,
because a declared-but-missing source is a gap, not an empty result. A source
with no claim items -> SKIP. Un-ID'd, unmarked claims are legal (adoption is
incremental) but are **counted and reported on stderr**, never silently dropped.

### 1.3 `llm/governance/l0-fast-track.md`

- Sixth row in the §Block Format shape table, same four columns and voice.
- A following passage stating why it is not a paired shape, the human-state
  exclusion, and the checkbox trade.
- §Template Allowlist: a repo whose roadmap carries markers **replaces**
  `allow <roadmap path> checkbox-only` with `allow <roadmap path> verification-marker`
  (a second rule would be dead — first match wins).
- §Honest-Gaps: the new shape added to the mechanically-verifiable list, plus
  two new residuals (whether an appended marker is *true*; whether a human-state
  marker written outside this lane carries a real approval).
- §Open Questions: "beyond the **five** above" -> "beyond the **six** above",
  recording that `verification-marker` was added under that rule — shape row
  and script branch in one PR.
- `Last updated:` -> 2026-09-23; Cross-References gains the capability design.

---

## 2. Test suite — BEFORE (verbatim)

```
$ node plugin/scripts/governance-checks.test.mjs   # (WARN lines elided)
PASS  artifacts label containing "plane" binds artifacts, not plans
PASS  the drift scan reads the DECLARED artifacts dir, not the default
PASS  a declared-but-missing path fails with the slot named
PASS  "Sprint plans directory" binds sprints, not plans
PASS  a missing delta reports SKIP, not PASS
PASS  adr-index SKIPs when the ADR directory does not exist
PASS  adr-status SKIPs when the ADR directory does not exist
PASS  neither ADR check reports a bare PASS on an absent directory
PASS  an ADR directory with no ADRs SKIPs rather than passing
PASS  a populated, consistent ADR directory still PASSes
PASS  git's own error text never reaches stderr
PASS  content in an undeclared canonical slot fails
PASS  a directory with no canonical slot is not flagged
PASS  an undeclared artifacts slot is not flagged

all regression tests passed
EXIT=0
```

14 assertions, all passing.

## 3. Test suite — AFTER (verbatim)

```
$ node plugin/scripts/governance-checks.test.mjs   # (WARN lines elided)
PASS  artifacts label containing "plane" binds artifacts, not plans
PASS  the drift scan reads the DECLARED artifacts dir, not the default
PASS  a declared-but-missing path fails with the slot named
PASS  "Sprint plans directory" binds sprints, not plans
PASS  a missing delta reports SKIP, not PASS
PASS  adr-index SKIPs when the ADR directory does not exist
PASS  adr-status SKIPs when the ADR directory does not exist
PASS  neither ADR check reports a bare PASS on an absent directory
PASS  an ADR directory with no ADRs SKIPs rather than passing
PASS  a populated, consistent ADR directory still PASSes
PASS  git's own error text never reaches stderr
PASS  content in an undeclared canonical slot fails
PASS  a directory with no canonical slot is not flagged
PASS  an undeclared artifacts slot is not flagged
PASS  verification-marker: appending a well-formed marker passes --l0
PASS  verification-marker: DELETING an existing marker line fails --l0
PASS  verification-marker: EDITING an existing marker in place fails --l0
PASS  verification-marker: editing the CLAIM TEXT fails --l0
PASS  verification-marker: a malformed marker (free prose in the parenthetical) fails --l0
PASS  verification-marker: a malformed marker (missing PR citation) fails --l0
PASS  verification-marker: a malformed marker (unlisted state word) fails --l0
PASS  verification-marker: a malformed marker (reset with no date) fails --l0
PASS  verification-marker: a malformed marker (hyphen instead of em dash) fails --l0
PASS  verification-marker: an L0 diff asserting "HUMAN VERIFIED" fails --l0
PASS  verification-marker: an L0 diff asserting "HUMAN REVIEWED" fails --l0
PASS  the pre-existing checkbox-only and status-line-only shapes still pass
PASS  verification-marker: a bare checkbox flip is not an append and fails --l0
PASS  verification-markers SKIPs when no claim source is declared
PASS  verification-markers never reports a bare PASS on an undeclared source
PASS  a declared-but-absent claim source FAILs rather than passing empty
PASS  a well-formed marker chain with L3 evidence PASSes
PASS  an L1-only claim reaching HUMAN VERIFIED FAILs (the determinism cap)
PASS  a HUMAN VERIFIED claim with no evidence citation at all FAILs
PASS  evidence with no declared determinism level FAILs as a gap
PASS  an illegal transition (NEEDS REWORK -> HUMAN VERIFIED) FAILs
PASS  a reset marker, then re-verification, is a legal chain
PASS  a malformed marker in the claim file FAILs the grammar check
PASS  a marker on an un-ID'd claim FAILs
PASS  a marker attached to no claim FAILs
PASS  an unmarked, un-ID'd roadmap PASSes and reports the un-ID'd count
PASS  a marker written on the claim line itself FAILs
PASS  a duplicated claim ID FAILs, and the shadowed copy is still cap-checked
PASS  a well-shaped append producing an illegal transition still fails the run
PASS  an unfilled Roadmap placeholder SKIPs instead of failing

all regression tests passed
EXIT=0
```

**44 assertions, all passing. The 14 pre-existing ones are unchanged and all
still pass — no regression.** The 30 new ones are listed above; **23 of
them assert that a deliberately broken input fails**, and 7 are controls
asserting that a legitimate change still passes.

Two pre-existing shapes (`checkbox-only`, `status-line-only`) had **no test at
all** before this change, so "the five existing shapes still work" rested on
nothing. They now have one (activity plan A2-AC-06).

One test-harness change: `runChecker` now captures **stderr as well as stdout on
every run** (via `spawnSync`), not only when the run fails. Some findings are
reported on stderr as `WARN` lines — the count of un-ID'd claims is one — and a
helper that captured stderr only on failure could not assert on them at all.

---

## 4. Each new check, failing on a deliberately broken input

Every case below is a **MODIFIED REPLAY**: a fixture that passes, perturbed in
exactly one way that should break it, with the verbatim output. A check that
cannot be made to fail proves nothing.

Each fixture is a throwaway git repo whose delta declares
`Path: llm/master-roadmap.md` and `allow llm/master-roadmap.md verification-marker`,
holding this claim on `main`:

```markdown
# Roadmap

- [x] `P1-AC-01` A gate test asserts that no `/p/**` response carries `public` (ADR-0004)
  — AGENT VERIFIED (PR #22, 2026-09-16)
```

### 4.0 Control — the permitted change

Appending `  — NEEDS REWORK (PR #23, 2026-09-18)` and nothing else:
`PASS  l0-paths`. Without this the failures below would prove only that the
shape rejects everything.

### 4.1 Append-only: DELETING an existing marker line

**Injected defect:** delete the existing "— AGENT VERIFIED (PR #22, 2026-09-16)" marker line

```
$ node governance-checks.mjs --l0 --base main --cert-file .cert.md
PASS  governance-links
PASS  adr-index
PASS  adr-status
PASS  verification-markers
FAIL  l0-paths
      - llm/master-roadmap.md: the verification-marker shape is append-only — 1 line(s) removed or edited vs main. Deleting or editing an existing marker line, or changing a claim's text, is a violation (§3.5); a reset APPENDS "— NOT VERIFIED (<reason>, YYYY-MM-DD)". First offending line: "— AGENT VERIFIED (PR #22, 2026-09-16)"
PASS  cert-present

1 of 6 check(s) failed.
exit=1
```

### 4.2 Append-only: EDITING an existing marker in place

**Injected defect:** rewrite the existing marker in place (PR #22 -> PR #99)

```
$ node governance-checks.mjs --l0 --base main --cert-file .cert.md
PASS  governance-links
PASS  adr-index
PASS  adr-status
PASS  verification-markers
FAIL  l0-paths
      - llm/master-roadmap.md: the verification-marker shape is append-only — 1 line(s) removed or edited vs main. Deleting or editing an existing marker line, or changing a claim's text, is a violation (§3.5); a reset APPENDS "— NOT VERIFIED (<reason>, YYYY-MM-DD)". First offending line: "— AGENT VERIFIED (PR #22, 2026-09-16)"
PASS  cert-present

1 of 6 check(s) failed.
exit=1
```

### 4.3 Append-only: editing the CLAIM TEXT under a preserved marker

**Injected defect:** edit the claim TEXT while preserving its marker

```
$ node governance-checks.mjs --l0 --base main --cert-file .cert.md
PASS  governance-links
PASS  adr-index
PASS  adr-status
PASS  verification-markers
FAIL  l0-paths
      - llm/master-roadmap.md: the verification-marker shape is append-only — 1 line(s) removed or edited vs main. Deleting or editing an existing marker line, or changing a claim's text, is a violation (§3.5); a reset APPENDS "— NOT VERIFIED (<reason>, YYYY-MM-DD)". First offending line: "- [x] `P1-AC-01` A gate test asserts that no `/p/**` response carries `public` (ADR-0004)"
      - llm/master-roadmap.md: added line is not a well-formed verification marker — a marker line is "— <STATE> (PR #<n>[, YYYY-MM-DD])" and must begin with an em dash (U+2014): "- [x] `P1-AC-01` A gate test asserts that no `/p/**` response carries `public` or `s-maxag"
PASS  cert-present

1 of 6 check(s) failed.
exit=1
```

### 4.5 The central rule: an agent appending `HUMAN VERIFIED` in the L0 lane

**Injected defect:** an agent appends HUMAN VERIFIED in the L0 lane

```
$ node governance-checks.mjs --l0 --base main --cert-file .cert.md
PASS  governance-links
PASS  adr-index
PASS  adr-status
FAIL  verification-markers
      - llm/master-roadmap.md:3: P1-AC-01 is "HUMAN VERIFIED" but no evidence anywhere in the tree cites it — §6.3 caps a claim with no evidence at NOT VERIFIED
FAIL  l0-paths
      - llm/master-roadmap.md: added marker asserts "HUMAN VERIFIED", a human-only state (§5.2). The L0 fast track is the agent lane; a human verification assertion is semantic and takes human review. Agents may append AGENT VERIFIED, VERIFICATION FAILED, NEEDS REWORK or a NOT VERIFIED reset.
PASS  cert-present

2 of 6 check(s) failed.
exit=1
```

### 4.6 Grammar: free prose in the parenthetical (caught in BOTH checks)

**Injected defect:** free prose in the parenthetical

```
$ node governance-checks.mjs --l0 --base main --cert-file .cert.md
PASS  governance-links
PASS  adr-index
PASS  adr-status
FAIL  verification-markers
      - llm/master-roadmap.md:5: malformed verification marker — no free prose in the parenthetical — it holds "PR #<n>[, YYYY-MM-DD]" and nothing else (§3.4): "— HUMAN VERIFIED (I checked it myself, PR #25)"
FAIL  l0-paths
      - llm/master-roadmap.md: added line is not a well-formed verification marker — no free prose in the parenthetical — it holds "PR #<n>[, YYYY-MM-DD]" and nothing else (§3.4): "— HUMAN VERIFIED (I checked it myself, PR #25)"
PASS  cert-present

2 of 6 check(s) failed.
exit=1
```

### 4.4 Append-only: a bare checkbox flip is a replacement, not an append

**Injected defect:** a bare checkbox flip (a replacement, not an append)

```
$ node governance-checks.mjs --l0 --base main --cert-file .cert.md
PASS  governance-links
PASS  adr-index
PASS  adr-status
PASS  verification-markers
FAIL  l0-paths
      - llm/master-roadmap.md: the verification-marker shape is append-only — 1 line(s) removed or edited vs main. Deleting or editing an existing marker line, or changing a claim's text, is a violation (§3.5); a reset APPENDS "— NOT VERIFIED (<reason>, YYYY-MM-DD)". First offending line: "- [x] `P1-AC-01` A gate test asserts that no `/p/**` response carries `public` (ADR-0004)"
      - llm/master-roadmap.md: added line is not a well-formed verification marker — a marker line is "— <STATE> (PR #<n>[, YYYY-MM-DD])" and must begin with an em dash (U+2014): "- [ ] `P1-AC-01` A gate test asserts that no `/p/**` response carries `public` (ADR-0004)"
PASS  cert-present

1 of 6 check(s) failed.
exit=1
```

### 4.7 Grammar: a malformed marker sitting in the tree, with no diff involved

**Injected defect:** malformed marker in the claim file (prose parenthetical, no PR)

```
$ node governance-checks.mjs
PASS  governance-links
PASS  adr-index
PASS  adr-status
FAIL  verification-markers
      - llm/master-roadmap.md:4: malformed verification marker — missing the PR citation — the form is "(PR #<n>[, YYYY-MM-DD])": "— HUMAN VERIFIED (looked fine to me)"

1 of 4 check(s) failed.
```

### 4.8 §5.2: an illegal transition

**Injected defect:** illegal transition NEEDS REWORK -> HUMAN VERIFIED (L3 evidence present, so only the transition can fail)

```
$ node governance-checks.mjs
PASS  governance-links
PASS  adr-index
PASS  adr-status
FAIL  verification-markers
      - llm/master-roadmap.md:5: illegal transition "NEEDS REWORK" -> "HUMAN VERIFIED" on P1-AC-01 — §5.2's table permits only NOT VERIFIED from "NEEDS REWORK"

1 of 4 check(s) failed.
```

### 4.9 The determinism cap: `L1`-only evidence reaching `HUMAN VERIFIED`

**Injected defect:** the determinism cap — L1-only evidence reaching HUMAN VERIFIED

```
$ node governance-checks.mjs
PASS  governance-links
PASS  adr-index
PASS  adr-status
FAIL  verification-markers
      - llm/master-roadmap.md:3: P1-AC-01 is "HUMAN VERIFIED" but its only evidence is L1 (attested — the WEAKEST level, §14.1) — §6.3/§14.4 cap an L1-only claim at "AGENT VERIFIED". An agent's assertion about its own work is L1 by definition; it is testimony, not verification.

1 of 4 check(s) failed.
```

### 4.10 Control for 4.9: the identical claim with `L3` evidence must PASS

**Injected defect:** the same claim with L3 evidence must PASS

```
$ node governance-checks.mjs
PASS  governance-links
PASS  adr-index
PASS  adr-status
PASS  verification-markers

4 of 4 checks passed, 0 failed.
```

### 4.11 Found by attacking my own first implementation: inline marker + duplicated ID

**Injected defect:** inline marker on the claim line + a duplicated claim ID shadowing it

```
$ node governance-checks.mjs
PASS  governance-links
PASS  adr-index
PASS  adr-status
FAIL  verification-markers
      - llm/master-roadmap.md:3: "HUMAN VERIFIED" is written on the claim line itself — a marker belongs on its own line below the claim, because the current state is the LAST marker line (§3.5). As written it asserts nothing while reading like verification.
      - llm/master-roadmap.md:6: claim ID P1-AC-02 is already used at llm/master-roadmap.md:4 — a claim ID is an address (§3.2) and must be unique
      - llm/master-roadmap.md:4: P1-AC-02 is "HUMAN VERIFIED" but no evidence anywhere in the tree cites it — §6.3 caps a claim with no evidence at NOT VERIFIED

1 of 4 check(s) failed.
```

### 4.12 A marker with nothing to bind to

**Injected defect:** a marker on an un-ID'd claim, and a marker attached to no claim at all

```
$ node governance-checks.mjs
PASS  governance-links
PASS  adr-index
PASS  adr-status
FAIL  verification-markers
      - llm/master-roadmap.md:6: verification marker is not attached to any claim — a marker belongs on the claim line it verifies (§3.3): "— HUMAN VERIFIED (PR #25, 2026-09-17)"
      - llm/master-roadmap.md:3: carries a verification marker but no claim ID — verification binds to an addressable claim (§3.2), and an un-ID'd claim cannot be cited by its evidence

1 of 4 check(s) failed.
```
---

## 5. SKIP is preserved — "could not check" never becomes "passed"

```
$ node plugin/scripts/governance-checks.mjs --layout     # run in canon itself
PASS  governance-links
PASS  adr-index
PASS  adr-status
SKIP  verification-markers — NOT VERIFIED
      - no claim source declared: the delta's "## Roadmap" block binds no path (or declares "none"), so no claim, marker or verification state was checked. Pass --claims <path> if this repo's claims live elsewhere.
PASS  layout

4 of 5 checks passed, 0 failed. 1 check(s) SKIPPED, verifying nothing: verification-markers.
exit=0
```

Canon's own delta says `Path: none`, so the check honestly reports that it
verified nothing. Behaviour for every existing adopting repo: **zero new
findings, exit code unchanged** (activity plan A9-AC-03), plus one honest SKIP
line. An unfilled `## Roadmap` template placeholder also reads as undeclared and
SKIPs — it must not resolve to the template's own example path and hard-fail
every repo that has not filled it in (tested).

---

## 6. MODIFIED REPLAY on my own implementation

Two mutations, each applied to the shipped checker, suite re-run, then reverted.

**M-1 — invert the determinism scale** (`DETERMINISM_RANK` to `L1: 3, L2: 2, L3: 1`,
`EVIDENCE_CEILING` inverted, the cap comparison flipped to `best === 'L3'`) —
i.e. implement the cap backwards, exactly the defect §14.1's amendment warns
about:

```
FAIL  a well-formed marker chain with L3 evidence PASSes
FAIL  an L1-only claim reaching HUMAN VERIFIED FAILs (the determinism cap)
SUITE EXIT=1
```

Both halves of the pair break, in opposite directions. The cap cannot be
inverted silently.

**M-2 — disable the append-only guard** (`if (removed.length > 0)` to `if (false)`),
i.e. make the shape behave like the other paired shapes:

```
FAIL  verification-marker: DELETING an existing marker line fails --l0
FAIL  verification-marker: EDITING an existing marker in place fails --l0
FAIL  verification-marker: a bare checkbox flip is not an append and fails --l0
```

The claim-text-edit test survives M-2 — the edited claim line is still not a
well-formed marker — which is defence in depth working as intended.

Both mutations were reverted; `all regression tests passed` afterwards.

---

## 7. `node --check`

```
$ node --check plugin/scripts/governance-checks.mjs
OK
```

(no output from `node --check`; `OK` is the shell's confirmation that it exited 0)

---

## 8. Design decisions a reviewer should challenge first

**8.1 Append-only is enforced strictly, which means design §9.1's sketch was not
implemented as written.** §9.1 proposes `verification-marker` as a
`pairedConstraint` that masks the checkbox and a trailing marker — i.e. a 1:1
**replacement**. §3.5 (and the activity plan's 2026-09-19 amendment to A2)
require the opposite: *"A diff that deletes or edits an existing marker line is
malformed."* §3.5 is later and is the load-bearing rule, and l0-fast-track's own
tie-breaker says the stricter behaviour wins where the allowlist and the check
diverge. I implemented §3.5. **The consequence is real and is documented in the
policy doc: a file under `verification-marker` cannot have its checkboxes
flipped in the L0 lane.**

**8.2 The actor-class gate is enforced where it is mechanically knowable.** The
marker grammar carries no actor field, so "asserted by an agent" is not readable
from a marker in isolation. It *is* readable from the lane: the L0 fast track is
the only lane in which an AI role may merge, so an L0 diff appending
`HUMAN REVIEWED`/`HUMAN VERIFIED` is an agent asserting a human's finding, and
is refused (§4.5 above). Outside that lane the remaining mechanical guards are
the transition table, the PR-citation requirement, and the determinism cap;
§5.3's mechanisms 1 (tool separation) and 2 (GitHub approval) are outside a
checker's reach by design, and are recorded as residuals in
`l0-fast-track.md` §Honest-Gaps.

**8.3 The evidence scan reads determinism from a citation line, and can be
lied to.** `evidenceCitations` runs `git grep` for the claim ID and reads an
`L1`/`L2`/`L3` token from the citing line (§6.1's binding-by-citation, which is
the only form available to a dependency-free checker until `surface.mjs` emits a
manifest). It closes the **omission** path — no evidence, or evidence with no
declared level, both fail. It cannot close the **fabrication** path: an agent
that writes `L3` next to a claim ID in a file launders the cap. Nothing textual
can distinguish a truthful declaration from a false one; that is what §5.3's
other three mechanisms and the auditor are for. This limit is stated in the
source comment and in §Honest-Gaps rather than being left for a reviewer to
discover.

**8.4 Two holes found by attacking my own first implementation.** Both passed
silently until I tried them (§4.11):

- a marker crammed onto the **claim line itself** — it asserts nothing under
  "the state is the last marker line" while reading to a human exactly like
  verification;
- a **duplicated claim ID**, where keying state by ID dropped one copy's cap
  check entirely, letting a verified duplicate shadow an unverified original.

Both are now failures with their own regression tests.

**8.5 Scope note for whoever owns `plugin/scripts/README.md`.** That file's
§Security Properties describes the shape constraints as paired-diff constraints
(`checkbox-only` and `link-target-only`). `verification-marker` is deliberately
**not** paired, and the README is outside this builder's permitted file set, so
it is left for the integration sweep (design §9, integration point 3/4 is
satisfied; the README is not one of the eleven rows but should be updated).

---

## 9. Not done, deliberately

- No `--surface` mode, no manifest, no `surface.mjs` change — another builder
  owns that, and the claim/evidence model here reads the tree directly rather
  than a manifest so the two do not collide.
- No delta-template change (`## Published Surface`, `Claim kinds:`) — design §9
  integration points 1 and 5–11 are outside this activity.
- No ADR. Per the slice reconciliation §5, no ADR is required for the slice.
