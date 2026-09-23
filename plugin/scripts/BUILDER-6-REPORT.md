PASS

# Builder 6 — answering VERIFIER-4-REPORT.md (V-1, V-2, V-3, V-4, V-8)

Builder: Governance Integration Builder (independent session)
Date: 2026-09-23
Branch: `feat/g3-verification-slice`
Answering: `plugin/scripts/VERIFIER-4-REPORT.md` (verdict: FAIL)

**Files changed** — and only these three:

```
 llm/governance/l0-fast-track.md           |  37 ++-
 plugin/scripts/governance-checks.mjs      | 343 +++++++++++++++++++----
 plugin/scripts/governance-checks.test.mjs | 448 +++++++++++++++++++++++++++++-
```

`surface.mjs`, `replay.mjs`, `surface-html.mjs`, `docs/**`,
`surface.test.mjs` and `.github/workflows/ci.yml` were **not** touched.
`plugin/scripts/fixtures/slice/llm/governance/governance-delta.md` was **not**
touched either: V-4's fix did not require it — see §V-4. No `git commit`, no
`git push`, no `gh`.

Regression suite: **68 assertions, all pass** (was 38). `node --check` clean on
both scripts.

---

## V-1 — CRITICAL. The forged `HUMAN VERIFIED` is refused.

### The reasoning: where the guard belongs

The rule is *"no agent may mark its own work `HUMAN VERIFIED`."* That is a
property of **the lane**, not of a diff shape. L0 is the one lane in which an
AI role may merge; everything that merges through it is agent-authored by
construction. Binding the guard to `shape === 'verification-marker'` made the
*allowlist* — one word in a document, written by hand by a steward — the thing
that decides whether the rule applies at all. And because `shapeConstraint`
returns `[]` for `path-only` at line 739, one line **before** `diffLines` at
740, the weakest declaration bought zero diff inspection.

So the fix is not "also check `path-only`". It is: **the guard runs before any
shape is dispatched, over every added line of every allowed path, and there is
no shape to opt into.** `humanStateGuard` in `checkL0Paths`:

```js
    // Lane-wide first, shape second. The human-state guard must not be
    // reachable-around by declaring a weaker shape for the path (V-1).
    failures.push(...humanStateGuard(file));
    failures.push(...claimSourceShapeGuard(file, allowed[2], diffLines(file).added));
    failures.push(...shapeConstraint(file, allowed[2]));
```

The human-only clause was **removed** from the `verification-marker` branch, so
there is exactly one enforcement point, not two that can drift. The branch now
carries a comment saying where it went and why.

Detection is wider than `LEGAL_MARKER` and narrower than "the line mentions
`HUMAN VERIFIED`": a dash-like leader (em dash, en dash, horizontal bar,
hyphen-minus) followed by a human-only state, at the head of a line or appended
to a claim line. A forgery does not have to be well-formed to read to a human as
a sign-off, so malformed attempts are caught too; an index-table cell or a
sentence about the policy is not.

### The second half, which the state guard cannot reach

`path-only` also waives **append-only**. Under it an agent may *delete* a
`— NOT VERIFIED (artifact changed…, DATE)` reset line and restore the stale
`HUMAN VERIFIED` above it, without adding a single human state. So
`claimSourceShapeGuard` requires the declared claim source to be allowlisted
`verification-marker` — **conditional on the file actually carrying a marker**,
in the base tree or in the added lines. Adoption is incremental: a roadmap with
no markers at all keeps its `checkbox-only` tick flips, and that control is a
test.

### The forgery, re-run

The verifier's exact scenario: `allow llm/** path-only`, claim previously
`AGENT VERIFIED`, one appended line, `L3` evidence present, complete
certification. BEFORE is the checker as committed on `HEAD`; AFTER is this fix.
Same repository, same diff, same command.

```
########## THE V-1 FORGERY, BEFORE (checker as committed on HEAD) ##########
PASS  governance-links
SKIP  adr-index — NOT VERIFIED
      - no ADR directory at "llm/governance/adr": no ADR was checked. …
SKIP  adr-status — NOT VERIFIED
      - no ADR directory at "llm/governance/adr": no ADR status was checked. …
PASS  verification-markers
PASS  l0-paths
PASS  cert-present

4 of 6 checks passed, 0 failed. 2 check(s) SKIPPED, verifying nothing: adr-index, adr-status.
EXIT=0

########## THE SAME FORGERY, AFTER ##########
PASS  governance-links
SKIP  adr-index — NOT VERIFIED
      - no ADR directory at "llm/governance/adr": no ADR was checked. …
SKIP  adr-status — NOT VERIFIED
      - no ADR directory at "llm/governance/adr": no ADR status was checked. …
PASS  verification-markers (1 claim(s), 2 marker(s))
FAIL  l0-paths
      - llm/claims.md: added marker asserts "HUMAN VERIFIED", a human-only state (§5.2). The L0 fast track is the agent lane; a human verification assertion is semantic and takes human review. Agents may append AGENT VERIFIED, VERIFICATION FAILED, NEEDS REWORK or a NOT VERIFIED reset.
      - llm/claims.md: this repo's declared claim source carries verification markers but is allowlisted "path-only" — only the verification-marker shape enforces the append-only marker rule (§3.5). Replace the allow line with "allow llm/claims.md verification-marker" (l0-fast-track.md §Template Allowlist).
PASS  cert-present

1 of 6 check(s) failed. 2 check(s) SKIPPED, verifying nothing: adr-index, adr-status.
EXIT=1
```

`PASS verification-markers` in the AFTER run is correct and is the point: the
tree-level check has no actor knowledge, `AGENT VERIFIED → HUMAN VERIFIED` is a
legal edge and the `L3` evidence is real. The actor class is knowable only from
the lane (builder's 8.2), and the lane guard is now the thing that cannot be
walked around.

**Paired negative — the lane is not simply shut.** Same repo, correct
`verification-marker` allowlist, same one-line append, a state an agent *may*
assert:

```
=== PAIRED NEGATIVE: correct shape + a state an agent MAY assert ===
PASS  governance-links
PASS  verification-markers (1 claim(s), 2 marker(s))
PASS  l0-paths
PASS  cert-present
4 of 6 checks passed, 0 failed. …
EXIT=0
```

A second control in the suite: an ordinary `path-only` memory-bank edit still
passes `--l0`; `path-only` has not become "no L0 edits at all".

**The verifier's bound, re-run against all six shapes.** The suite now loops the
identical forgery over `path-only`, `link-target-only`, `index-table-rows`,
`checkbox-only`, `status-line-only` and `verification-marker` and asserts
`FAIL l0-paths` with `human-only state` on every one. No future shape can
quietly re-open the hole.

---

## V-3 — HIGH. The cap reads evidence, and only evidence.

### What was wrong, in both directions

`evidenceCitations` read the level from an `L1`/`L2`/`L3` token on the **same
physical line** as the claim ID. The project's own evidence — the
`EVIDENCE <id>` header block documented in `surface.mjs` §Evidence and used by
every artifact in `fixtures/slice/` — puts the ID on one line and
`determinism: L3` two lines below. So the honest format declared **nothing**
(too tight), and the cap passed only because two narrative reports carried
`P1-AC-01 … L3` on one line (too loose).

### The fix: declared, structured, tracked

1. **The level comes from the evidence header block**, read the way the engine
   reads it: a citing line that declares `EVIDENCE <id>` (comment punctuation
   stripped the same way `surface.mjs` strips it), then the `determinism:` key
   within that block. The block ends at a blank line or the next `EVIDENCE`
   header, with a 16-line backstop. The two halves of one capability must not
   parse evidence differently — that is the same principle as V-4.
2. **A mention is a citation, never a declaration.** This closes the negation:
   `// P1-AC-01 has no L3 evidence and was never replayed.` carries no
   `determinism:` key, so it declares no level.
3. **Narrative files are excluded outright** — `*-REPORT.md`, `README.md`,
   `CHANGELOG.md`, `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`. This is
   load-bearing rather than belt-and-braces:
   `fixtures/slice/BUILDER-1-REPORT.md:80` quotes a **complete, well-formed**
   `EVIDENCE P1-AC-01 / determinism: L3` block as a fenced example. A report
   *about* evidence is not evidence, and an adopter carries the artifacts, not
   the reports.
4. **`--untracked` dropped** from the `git grep`. The fast track accepts a
   pasted local run as the checks-pass artifact, so a scratch file that is not
   in the PR and will not exist in CI must not make that run green.
5. Bonus (V-9): the level token is now case-insensitive and normalised, so
   lowercase `l3` is a level rather than a misleading "no level declared".

The "no level declared" message now names the convention instead of leaving the
author to guess it.

### Both directions, verbatim

```
### (a) narrative prose only — a report saying P1-AC-01 has L3 evidence
FAIL  verification-markers
      - llm/claims.md:3: P1-AC-01 is "HUMAN VERIFIED" but no evidence anywhere in the tree cites it — §6.3 caps a claim with no evidence at NOT VERIFIED
   EXIT=1

### (b) the honest multi-line EVIDENCE block — a legitimate L3 claim
PASS  verification-markers (1 claim(s), 2 marker(s))
   EXIT=0

### (c) a negation: 'P1-AC-01 has no L3 evidence'
FAIL  verification-markers
   EXIT=1

### (d) an untracked, uncommitted evidence file
FAIL  verification-markers
   EXIT=1
   (git status: ?? evidence/ )

### (e) no evidence anywhere — the omission path, still closed
FAIL  verification-markers
   EXIT=1
```

(b) is the file the verifier showed being rejected:

```
#!/usr/bin/env node
// EVIDENCE P1-AC-01
// kind: test
// determinism: L3
// produced-by: builder (agent)
// replay: node evidence/ac01.mjs
```

**The omission path is still closed**, both halves: no evidence → FAIL (e); no
declared level → FAIL (c). And the cap is **not stuck closed** — see the
fixture runs under V-4, where the slice's own `L3` claims pass on the slice's
own evidence format with every narrative report deleted.

### What remains, stated plainly

**Best-level-wins across a claim's declarations still stands**, so one
fabricated `determinism: L3` block outranks any number of honest `L1` ones.
What changed is that the fabrication must now be a structured declaration in a
tracked evidence artifact — a thing a reviewer can be pointed at, and a thing
`replay.mjs` can be run against — rather than a sentence anywhere in any file.
The fabrication path is 8.3's acknowledged residual and belongs to §5.3's other
three mechanisms and to the auditor; nothing textual can distinguish a truthful
`determinism: L3` from a false one.

---

## V-2 — HIGH. An unbalanced fence fails loudly.

`parseClaims` now returns `unclosedFenceAt`, and an unclosed fence at end of
file is a **failure**, not a silent truncation. §3.2's rule — a claim is never
silently omitted — is now enforced by the parser and not merely asserted in the
policy. Second, a passing run prints **what it examined**, so a drop from twelve
claims to one is visible in a CI log even where the run is green.

```
### control: no fence — the L1-only forgery is caught
FAIL  verification-markers
      - llm/claims.md:5: P1-AC-02 is "HUMAN VERIFIED" but its only evidence is L1 (attested — the WEAKEST level, §14.1) — §6.3/§14.4 cap an L1-only claim at "AGENT VERIFIED". …
   EXIT=1

### DEFECT: one unbalanced ``` line above the second claim
FAIL  verification-markers
      - llm/claims.md:5: unbalanced code fence — everything below it is inside a fence that never closes, so those claims and markers were not checked. A claim is never silently omitted (§3.2): close the fence.
   EXIT=1

### DEFECT: the same line at the TOP of the file (used to SKIP, exit 0)
FAIL  verification-markers
      - llm/claims.md:1: unbalanced code fence — everything below it is inside a fence that never closes, so those claims and markers were not checked. …
   EXIT=1
```

Both exit 1. A **balanced** fence still excludes its contents — a marker example
inside a documentation fence is documentation, not a claim — and that control is
a test.

The PASS note is asserted too:
`PASS verification-markers (2 claim(s), 2 marker(s))`.

---

## V-4 — HIGH. The checker now resolves the claim source the way the engine does.

`readClaimsPath` accepts **both** declarations, with the engine's winning:

* `## Published Surface` → `Claims source:` — what `surface.mjs` reads, and
  therefore the one that wins when both are present;
* `## Roadmap` → `Path:` — the delta template's declaration, for every repo
  that publishes no surface.

When both are declared and **disagree**, the checker warns loudly and follows
the engine, because a checker that verifies a different file from the one the
surface publishes is worse than no checker. The SKIP message now names both
blocks.

**The fixture delta was not modified.** V-4's fix did not require it: the
fixture's `Claims source: llm/claims.md` was always a valid declaration; the
checker was reading the wrong block. Changing the fixture to satisfy the
checker would have been the same defect in the other direction.

### The check, run against the slice fixture

`fixtures/slice/` copied into a standalone git repo, committed, real checker,
no `--claims`:

```
$ node governance-checks.mjs
PASS  governance-links
SKIP  adr-index — NOT VERIFIED
      - no ADR directory at "llm/governance/adr": no ADR was checked. …
SKIP  adr-status — NOT VERIFIED
      - no ADR directory at "llm/governance/adr": no ADR status was checked. …
WARN: 1 claim(s) carry no claim ID and no marker, so they are invisible to verification: llm/claims.md:31
PASS  verification-markers (6 claim(s), 9 marker(s))

2 of 4 checks passed, 0 failed. 2 check(s) SKIPPED, verifying nothing: adr-index, adr-status.
EXIT=0
```

Not a SKIP: six claims and nine markers examined, including the two
`HUMAN VERIFIED` claims whose caps are evaluated against `checks/` and
`human/`. The un-ID'd line 31 is reported, never dropped.

**Proof that this is not a vacuous pass** — two modified replays on the fixture:

```
=== MR-1: strip the fixture's own `// determinism: L3` from checks/ac01 ===
FAIL  verification-markers
      - llm/claims.md:19: P1-AC-01 is "HUMAN VERIFIED" but no citing artifact DECLARES a determinism level — §14.1: an undeclared level is a gap marker, never a default. A level is declared by an evidence header block ("EVIDENCE P1-AC-01" followed by "determinism: L1|L2|L3"), not by a mention of the level near the ID (10 citation(s): checks/ac01-duplicate-rejection.mjs:2, checks/ac01-duplicate-rejection.mjs:15, checks/ac01-duplicate-rejection.mjs:80)
EXIT=1

=== MR-2: delete every narrative report (BUILDER-*, VERIFIER-*, README.md) ===
PASS  verification-markers (6 claim(s), 9 marker(s))
EXIT=0
```

MR-1 is the cap firing on the fixture's own artifacts: the level really is being
read from `checks/ac01-duplicate-rejection.mjs:4`. MR-2 is the verifier's
stuck-closed scenario, now green: the fixture's `L3` claims rest on the
fixture's evidence, not on prose about it. **Both fixture runs are regression
tests**, so the two halves of the slice can no longer drift apart unnoticed.

### V-5: over-matching, not a finding — and fixed

The verifier asked for a judgement. `MARKER_CANDIDATE` matched a state word
**anywhere** on a line, so ordinary prose about verification was reported as a
malformed marker, and the fixture failed on three of its own explanatory
paragraphs ("**An absent marker means `NOT VERIFIED`**", "Done means
`HUMAN VERIFIED`, not ticked"). That is **over-matching**. A state word in
mid-sentence is not an attempted marker, and a claims file explaining its own
convention is exactly the prose an adopting repo writes; treating it as a
forgery attempt trains people to stop reading the output.

A candidate must now *start* like a marker: a dash-like leader (em dash, en
dash, horizontal bar — **not** hyphen-minus, which begins every Markdown
bullet), or a state word at the head of the line behind an optional list
bullet. Two tests pin both halves: the fixture's explanatory prose passes, and a
marker attempt with **no dash at all** (`HUMAN VERIFIED (PR #25, …)` under a
claim) is still reported as malformed with the em-dash reason. The
hyphen-instead-of-em-dash case and the inline-marker case were already covered
and still fail.

---

## V-8 — `l0-fast-track.md` §Assumptions

The sentence now enumerates **three** security properties a substitute command
must preserve, and says why the second cannot be read as "paired":

> 2. the diff-shape constraints — including `verification-marker`'s
>    **append-only** rule, which is deliberately **not** paired. Five of the six
>    shapes are paired 1:1 line replacements; a substitute command that
>    implemented the sixth as a paired constraint would satisfy the word
>    "paired" while permitting the in-place marker rewrite the shape exists to
>    forbid;
> 3. the human-only state guard — `HUMAN REVIEWED` and `HUMAN VERIFIED` may not
>    be asserted by an L0 diff, **whatever shape the changed path declares**.

Two more spots in the same file were brought into line with the code, since a
policy that describes the old enforcement point is the next V-1:

* §Honest-Gaps, mechanically-verifiable list: the human-only clause moved out of
  the `verification-marker` bullet into its own lane-wide bullet, plus a bullet
  for the claim-source shape requirement.
* §Template Allowlist: the `checkbox-only` → `verification-marker` replacement
  is now stated as **enforced**, with the `path-only` reset-deletion as the
  worked reason.

**Not fixed, out of my file set:** `plugin/scripts/README.md` still describes
the five-shape world and never mentions `verification-marker` (the verifier's
second half of V-8). Another agent has that file open in this branch.

---

## The scale — not inverted

`DETERMINISM_RANK = { L1: 1, L2: 2, L3: 3 }`, `EVIDENCE_CEILING` caps `L1` at
`AGENT VERIFIED`, the comparison is `best === 'L1'`, and `L3` is strongest.
None of that was touched. The paired test that guards it is intact and was
strengthened: the `L3`-passes and `L1`-fails fixtures now differ in exactly one
token (`determinism: L3` vs `determinism: L1`) inside an otherwise identical
evidence block, so inverting the rank flips both.

---

## Verification

```
$ node --check plugin/scripts/governance-checks.mjs
$ node --check plugin/scripts/governance-checks.test.mjs
node --check: clean (both)

$ node plugin/scripts/governance-checks.test.mjs
… 68 assertions
all regression tests passed

$ node plugin/scripts/governance-checks.mjs --layout        # this repo
PASS  governance-links
PASS  adr-index
PASS  adr-status
SKIP  verification-markers — NOT VERIFIED
      - no claim source declared: neither the delta's "## Published Surface" block ("Claims source:") nor its "## Roadmap" block ("Path:") binds a path …
PASS  layout

4 of 5 checks passed, 0 failed. 1 check(s) SKIPPED, verifying nothing: verification-markers.
EXIT=0
```

**New tests added (30 assertions), each a modified replay with a paired
control:** the six-shape forgery loop and its two controls (V-1); the
reset-deletion declaration guard and the marker-free-roadmap control (V-1);
narrative prose, a quoted `EVIDENCE` block in a report, a negation, an
untracked file, and the lowercase-`l3` control (V-3); fence above a claim,
fence at top of file, balanced-fence control, and the PASS-note assertion
(V-2); `Claims source:` resolution and two runs of the **shipped slice fixture**
(V-4); marker-convention prose and the no-dash marker attempt (V-5).

**Three existing tests were rewritten, not deleted**: the `L3` happy path, the
`L1` cap and the no-level gap now use the project's own `EVIDENCE <id>` header
block instead of an `L3` token in a docstring. That is the format the engine
reads and the fixture ships; the old fixtures were testing a convention that
existed nowhere else in the capability.

### One failure that is not mine

`node plugin/scripts/surface.test.mjs` reports
`FAIL the committed manifest is current: a regeneration reproduces its own
content_sha256`. That is another agent's in-flight 268-line change to
`surface.mjs` (plus `replay.mjs`), both of which are outside my file set and
modified in the working tree. I touched neither `surface.mjs` nor the fixture,
so no change of mine can move the manifest hash. Flagging it for whoever owns
that file.
