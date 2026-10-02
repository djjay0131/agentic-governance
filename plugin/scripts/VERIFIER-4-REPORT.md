FAIL

# Verifier 4 — Governance Integration Verification (G-3 vertical slice)

Verifier: Governance Integration Verifier (independent session)
Date: 2026-09-23
Branch: `feat/g3-verification-slice`
Under test: `plugin/scripts/governance-checks.mjs` (`verification-marker` diff
shape, `verification-markers` check), `plugin/scripts/governance-checks.test.mjs`,
`llm/governance/l0-fast-track.md`

Requirement read independently before any code: capability design §3.4, §3.5,
§5.1, §5.2, §5.3, §14.1, §14.4; `l0-fast-track.md` §Block Format and
§Honest-Gaps; slice reconciliation C-1 and C-3. `BUILDER-4-REPORT.md` was read
last.

---

## Verdict

**FAIL.** The rule under test is *"no agent may mark its own work
`HUMAN VERIFIED`."*

The `verification-marker` shape itself is sound and I could not break it
head-on: every dash lookalike, in-place rewrite, deletion, checkbox flip,
missing citation and prose parenthetical was refused. But the rule is enforced
in exactly **one** place, and I forged `HUMAN VERIFIED` end to end — full run,
`0 failed`, **exit 0** — by going around it rather than through it:

1. **The lane guard is bound to the shape name, not to the claim source.** If a
   repo's declared claim file is allowlisted under `path-only` instead of
   `verification-marker`, an agent appends `— HUMAN VERIFIED (PR #n, date)`
   through the L0 fast track and every check passes. Nothing cross-checks the
   declared claim source against the shape its allowlist assigns it, and nothing
   warns. (V-1)
2. **The backstop cap is defeated by one token on any line of any file**,
   including files that are never committed and the agent's own narrative
   report. That is not a theoretical width: it is how the shipped slice fixture
   currently satisfies the cap. (V-3)
3. **A single unbalanced ``` line removes a claim from the check** — reported
   `PASS`, exit 0 — or degrades the entire check to `SKIP`, exit 0. (V-2)

Three further integration defects: the checker and `surface.mjs` read the claim
source from two different, incompatible delta declarations, so the check
**SKIPs on the slice's own fixture and has never been run against it** (V-4);
when forced to run there it **fails on the fixture's own explanatory prose**
(V-5) and **blocks the fixture's legitimate `L3` claims** (V-3); and
`l0-fast-track.md` §Assumptions still describes the shape set as "paired
diff-shape constraints", which is the one spot the doc edit missed (V-8).

---

## Method, and how I tested the verifier

All work on throwaway copies. Nothing in the repository was mutated except this
report. No `git` write commands, no `gh`, no commits.

I wrote my own harness rather than extending
`governance-checks.test.mjs`, so that no assumption of the builder's was
inherited: it builds a fresh git repo, commits a BASE tree, applies one
mutation, and runs the real checker. Every claim below is a full verbatim run.

**Defect injected to prove each check can fire** is stated per item. Where a
check is expected to pass, I ran a paired negative fixture that differs in one
character or one line and observe the check firing; a check that never fires is
not evidence.

---

## Item 1 — Forge `HUMAN VERIFIED` as an agent through the L0 lane

**FAIL** — forged, exit 0.

### 1a–1b. Head-on: refused (defence works)

Defect injected to prove the check fires: the identical fixture with
`— NEEDS REWORK (PR #11, 2026-09-21)` appended instead passes `l0-paths`, so a
`FAIL` below is the human-state guard firing and not a broken fixture.

```
$ node governance-checks.mjs --l0
FAIL  l0-paths
      - llm/claims.md: added marker asserts "HUMAN VERIFIED", a human-only state (§5.2). The L0 fast track is the agent lane; a human verification assertion is semantic and takes human review. Agents may append AGENT VERIFIED, VERIFICATION FAILED, NEEDS REWORK or a NOT VERIFIED reset.
EXIT=1
```

Also refused with a non-breaking space between the em dash and the state
(`— HUMAN VERIFIED …`), which JS `\s` accepts and which I expected to slip
through the classifier into `LEGAL_MARKER` and past the state test. It does
reach `LEGAL_MARKER`, and the human-state check still fires. Same output.

### 1c. Human state smuggled into the reset reason: **not refused**

`LEGAL_RESET_MARKER` allows any `[^()]+` as the reason.

```
$ node governance-checks.mjs --l0
PASS  verification-markers
PASS  l0-paths
```
on the appended line

```
  — NOT VERIFIED (superseded by HUMAN VERIFIED sign-off from the owner, 2026-09-21)
```

No state is forged — the asserted state is `NOT VERIFIED`, the weakest — but the
line renders to a human reader as a human sign-off, and it is the *last* line of
the block, which §3.5 makes the current state. This is precisely the failure
mode the builder's own `INLINE_MARKER` guard exists to prevent ("asserts nothing
while reading like verification"), left open on the one form where prose is
legal. Severity **low**; listed because the symmetry is already argued in the
source.

### 1d. **The forgery that works.** Claim file allowlisted under another shape

The guard lives inside `if (shape === 'verification-marker')`. Nothing asserts
that the declared claim source is allowlisted under that shape. With
`allow llm/** path-only` — canonically the memory-bank shape, and one word from
a plausible steward mistake — `shapeConstraint` returns `[]` without reading the
diff at all:

```
$ node governance-checks.mjs --l0 --cert-file cert.md
PASS  governance-links
SKIP  adr-index — NOT VERIFIED
      - "llm/governance/adr" contains no ADR files (NNNN-*.md): no ADR was checked.
SKIP  adr-status — NOT VERIFIED
      - "llm/governance/adr" contains no ADR files (NNNN-*.md): no ADR status was checked.
PASS  verification-markers
PASS  l0-paths
PASS  cert-present

4 of 6 checks passed, 0 failed. 2 check(s) SKIPPED, verifying nothing: adr-index, adr-status.
EXIT=0
```

The diff is one appended line, `— HUMAN VERIFIED (PR #11, 2026-09-21)`, on a
claim whose prior state was `AGENT VERIFIED`, authored by an agent, merged
through the lane in which an AI role may merge, with a complete Administrative
Change Certification. **Exit 0.**

I ran the same forgery against every shape to bound it exactly. Only `path-only`
admits it:

| Declared shape for the claim file | Result |
|---|---|
| `path-only` | **PASS, exit 0 — forged** |
| `link-target-only` | FAIL — `1 changed line(s) contain no Markdown link` |
| `index-table-rows` | FAIL — `1 non-table line(s)` |
| `checkbox-only` | FAIL — `1 non-checkbox line(s)` |
| `status-line-only` | FAIL — `1 other changed line(s)` |
| `verification-marker` | FAIL — human-only state |
| not allowlisted | FAIL — `matches no L0 allowlist pattern` |

The read-from-base rule holds and is not the way in: a PR that rewrites its own
allowlist to `path-only` is judged by the base allowlist *and* hard-denied for
touching the delta.

```
$ node governance-checks.mjs --l0 --cert-file cert.md   # PR rewrites its own allowlist
FAIL  l0-paths
      - llm/claims.md: added marker asserts "HUMAN VERIFIED", a human-only state (§5.2). …
      - llm/governance/governance-delta.md: matches always-denied pattern "llm/governance/governance-delta.md" (canonical deny rule) — fails --l0 outright
EXIT=1
```

So the exposure is a **declaration** defect, not a diff defect — and the delta
that declares it is never checked for this.

**Severity: HIGH. Smallest fix:** in `checkL0Paths`, when `CLAIMS_REL` is
declared and a changed path resolves to it, require the matched allow rule's
shape to be `verification-marker`; fail otherwise. Roughly:

```js
if (CLAIMS_REL && file === CLAIMS_REL && allowed[2] !== 'verification-marker')
  failures.push(`${file}: the declared claim source is allowlisted "${allowed[2]}" — only the verification-marker shape guards marker appends (§3.5, l0-fast-track §Block Format)`);
```

---

## Item 2 — Rewrite history: edit in place, delete

**PASS in the diff shape. FAIL outside it** (by design, but the boundary is
narrower than the phrase "mechanically checkable" in §3.5 suggests).

Defect injected to prove the guard fires: the same fixture with an *appended*
marker passes, so the failures below are the append-only rule and not the
fixture.

In-place 1:1 rewrite:

```
$ node governance-checks.mjs --l0
FAIL  l0-paths
      - llm/claims.md: the verification-marker shape is append-only — 1 line(s) removed or edited vs main. Deleting or editing an existing marker line, or changing a claim's text, is a violation (§3.5); a reset APPENDS "— NOT VERIFIED (<reason>, YYYY-MM-DD)". First offending line: "— AGENT VERIFIED (PR #10, 2026-09-20)"
      - llm/claims.md: added marker asserts "HUMAN VERIFIED", a human-only state (§5.2). …
EXIT=1
```

Deletion of a marker line, deletion of the whole claim file, and a bare checkbox
flip are all refused with the same append-only failure. Claim-text edits too.

**Outside the lane, nothing catches removal.** `checkVerificationMarkers` reads
the current tree only; it has no base comparison. Deleting the reset line from a
chain `AGENT VERIFIED → HUMAN VERIFIED → NOT VERIFIED (artifact changed…)`
restores a stale `HUMAN VERIFIED` and is reported clean:

```
$ node governance-checks.mjs --layout      # after deleting the reset marker
PASS  verification-markers
```

The surviving chain `NOT VERIFIED → AGENT VERIFIED → HUMAN VERIFIED` is legal,
so no tree-level rule can see the deletion. §3.5 assigns append-only to the
shape (A2), so this is the design's own scope; but it means append-only is
enforced **only** in L0 PRs, over **only** files declared `verification-marker`,
and not at all in the L1+ lane where most claim edits will happen. Worth stating
plainly in §Honest-Gaps, which currently reads as though the property is general.

---

## Item 3 — Illegal transitions from §5.2

**PASS.** Every illegal edge I tried is refused, with the permitted set named.

Defect injected to prove the check fires: the legal chains at the bottom of the
table pass in the identical fixture.

```
$ node governance-checks.mjs
FAIL  verification-markers
      - llm/claims.md:5: illegal transition "NEEDS REWORK" -> "HUMAN VERIFIED" on P1-AC-01 — §5.2's table permits only NOT VERIFIED from "NEEDS REWORK"
EXIT=1
```

| Chain | Expected | Result |
|---|---|---|
| `NEEDS REWORK → HUMAN VERIFIED` | illegal | FAIL ✓ |
| `VERIFICATION FAILED → HUMAN VERIFIED` | illegal | FAIL ✓ |
| `VERIFICATION FAILED → AGENT VERIFIED` | illegal | FAIL ✓ |
| `NEEDS REWORK → AGENT VERIFIED` | illegal | FAIL ✓ |
| `HUMAN VERIFIED → AGENT VERIFIED` | illegal | FAIL ✓ |
| `HUMAN VERIFIED → HUMAN REVIEWED` | illegal | FAIL ✓ |
| `AGENT VERIFIED → HUMAN VERIFIED` | legal (human) | PASS ✓ |
| `NOT VERIFIED → HUMAN VERIFIED` | legal (human only) | PASS ✓ |
| `HUMAN VERIFIED → NOT VERIFIED → HUMAN VERIFIED` | legal | PASS ✓ |

`LEGAL_TRANSITIONS` is a faithful transcription of §5.2, including the absence of
any edge out of `VERIFICATION FAILED`/`NEEDS REWORK` other than the reset.

`NOT VERIFIED → HUMAN VERIFIED` **asserted by an agent** passes outside the L0
lane, because the marker grammar carries no actor field. That is the builder's
self-reported 8.2 and it is exactly as limited as claimed — the actor class is
knowable only from the lane, and the lane guard is the one bypassed in item 1.

---

## Item 4 — The determinism cap, both directions

**FAIL.** Open where it should be shut, and shut where it should be open.

Scale direction is correct everywhere: `DETERMINISM_RANK = { L1: 1, L2: 2, L3: 3 }`,
`EVIDENCE_CEILING` caps `L1` at `AGENT VERIFIED`, and the comparison is
`best === 'L1'`. **No inverted-scale defect (C-1) exists in the code.**

### Closed correctly

```
$ node governance-checks.mjs           # L1-only evidence
FAIL  verification-markers
      - llm/claims.md:3: P1-AC-01 is "HUMAN VERIFIED" but its only evidence is L1 (attested — the WEAKEST level, §14.1) — §6.3/§14.4 cap an L1-only claim at "AGENT VERIFIED". An agent's assertion about its own work is L1 by definition; it is testimony, not verification.
EXIT=1
```

`L2` and `L3` evidence both pass in the identical fixture, so the cap is not
stuck closed on the synthetic case.

### **Stuck closed on the project's own evidence format**

The slice's real evidence artifacts declare the claim on one line and the level
on another (`plugin/scripts/fixtures/slice/checks/ac01-duplicate-rejection.mjs`):

```
// EVIDENCE P1-AC-01
// kind: test
// determinism: L3
```

`evidenceCitations` reads the level only from the **same physical line** as the
ID, so this file declares nothing to the checker. I copied
`plugin/scripts/fixtures/slice/` into a standalone git repo, removed the
narrative `*-REPORT.md`/`README.md` files (an adopter would not carry them), and
ran the checker against the fixture's own claims:

```
$ node governance-checks.mjs --claims llm/claims.md
FAIL  verification-markers
      - llm/claims.md:19: P1-AC-01 is "HUMAN VERIFIED" but no citing artifact declares a determinism level (L1/L2/L3) — §14.1: an undeclared level is a gap marker, never a default (10 citation(s): checks/ac01-duplicate-rejection.mjs:2, checks/ac01-duplicate-rejection.mjs:16, checks/ac01-duplicate-rejection.mjs:81)
      - llm/claims.md:35: S1-CL-01 is "HUMAN VERIFIED" but no citing artifact declares a determinism level (L1/L2/L3) — §14.1: an undeclared level is a gap marker, never a default (14 citation(s): checks/cl01-record-count.mjs:2, …)
EXIT=1
```

The checker finds ten citations in the very file whose line 4 reads
`determinism: L3`, and reports that no level was declared. A legitimate `L3`
claim is blocked. **A cap stuck closed is also a defect**, and this one is
stuck closed against the slice's own artifacts.

With the reports present the fixture passes — because
`BUILDER-1-REPORT.md:126` and `README.md:37` happen to carry
`P1-AC-01 … L3` on one line. **The cap is currently satisfied by narrative prose
about the evidence, not by the evidence.** Same-line coupling is nowhere in
§6.1, §14.1 or the fixture's documented convention.

**Severity: HIGH. Smallest fix:** read the level from a small window around the
citation (e.g. the citing line plus the following 5 lines of the same comment
block, or an explicit `determinism:` key anywhere in the citing file when that
file contains exactly one `EVIDENCE <id>` header), and add the shipped fixture
to `governance-checks.test.mjs` so the two halves of the slice are tested
together.

Lowercase `l3` is also rejected (`no citing artifact declares a determinism
level`). Defensible, undocumented; **severity low**.

---

## Item 5 — Grammar forgery

**PASS.** Every form was refused, each with a specific reason.

Defect injected to prove the grammar check fires: the well-formed
`— AGENT VERIFIED (PR #11, 2026-09-21)` passes in each fixture.

| Attack | Result |
|---|---|
| en dash `–` | FAIL — `must begin with an em dash (U+2014)` |
| hyphen-minus `-` | FAIL — same |
| horizontal bar `―` (U+2015) | FAIL — same |
| missing PR citation `— AGENT VERIFIED (2026-09-21)` | FAIL — `missing the PR citation` |
| prose in the parenthetical | FAIL — `no free prose in the parenthetical … (§3.4)` |
| marker on the claim line | FAIL — `written on the claim line itself … asserts nothing while reading like verification` |
| marker attached to no claim | FAIL — `not attached to any claim` |
| marker on an un-ID'd claim | FAIL — `carries a verification marker but no claim ID` |
| `HUMAN  VERIFIED` (double space) | FAIL — `state must be one of …` |
| reset with no date | FAIL — `a reason and a date are both required` |

Each fires identically in the L0 shape and in the tree-level check, which is the
right redundancy.

**The cost of the wide candidate regex is a false-positive class.**
`MARKER_CANDIDATE` matches any line containing a state word, so ordinary prose
*about* verification — which is exactly what a roadmap adopting this capability
will contain — is read as a marker:

```
$ node governance-checks.mjs
FAIL  verification-markers
      - llm/claims.md:6: verification marker is not attached to any claim — a marker belongs on the claim line it verifies (§3.3): "Note: an absent marker means NOT VERIFIED, and only a human may write HUMAN VERIFIED."
EXIT=1
```

The slice's **own fixture** trips this three times on its own explanatory
paragraphs:

```
$ node governance-checks.mjs --claims llm/claims.md      # fixtures/slice as a standalone repo
FAIL  verification-markers
      - llm/claims.md:7: verification marker is not attached to any claim — a marker belongs on the claim line it verifies (§3.3): "**An absent marker means `NOT VERIFIED`** — the default costs nothing to adopt"
      - llm/claims.md:13: verification marker is not attached to any claim — …: "below is ticked and `NOT VERIFIED` at the same time: the work was done, and"
      - llm/claims.md:15: verification marker is not attached to any claim — …: "`HUMAN VERIFIED`, not ticked."
EXIT=1
```

Worse, prose sitting directly under a claim is attached to that claim's marker
block as a malformed marker. **Severity: MEDIUM. Smallest fix:** treat a line as
a marker candidate only when it begins with a dash-like character
(`/^\s*[—–―-]\s/`), keeping the lookalike-dash detection and dropping the
bare-state-word branch; a state word in mid-sentence prose is not an attempted
marker, and the claim-line case is already covered separately by
`INLINE_MARKER`.

---

## Item 6 — The evidence scan: omission path, fabrication width

**Omission path: PASS (closed, exactly as claimed).**
**Fabrication width: FAIL — materially wider than 8.3 describes.**

Omission, both halves, verbatim:

```
$ node governance-checks.mjs           # no evidence anywhere
FAIL  verification-markers
      - llm/claims.md:3: P1-AC-01 is "HUMAN VERIFIED" but no evidence anywhere in the tree cites it — §6.3 caps a claim with no evidence at NOT VERIFIED
EXIT=1

$ node governance-checks.mjs           # evidence present, no level declared
FAIL  verification-markers
      - llm/claims.md:3: P1-AC-01 is "HUMAN VERIFIED" but no citing artifact declares a determinism level (L1/L2/L3) — §14.1: an undeclared level is a gap marker, never a default (1 citation(s): evidence/check.mjs:1)
EXIT=1
```

8.3 describes the fabrication path as *"an agent that writes `L3` next to a claim
ID in a file launders the cap."* The true width, each item confirmed by a run:

1. **The line need not assert anything.** A *negation* unlocks the cap. The only
   citation `// P1-AC-01 has no L3 evidence and was never replayed.` yields
   `PASS  verification-markers`, exit 0.
2. **The file need not be committed, or even tracked.** `git grep --untracked`
   means a scratch file in the working tree is evidence. An untracked
   `scratch-notes.md` containing `P1-AC-01 — determinism L3 (never committed).`
   yields `PASS`, exit 0. `l0-fast-track.md` §Ordered Artifact Chain accepts *"a
   local run whose output is pasted as a PR comment"* as the checks-pass
   artifact, so a local `PASS` can rest on evidence that is not in the PR and
   will not exist in CI. (`.gitignore`d files are correctly excluded.)
3. **Any file type counts, including the agent's own report.** This is not
   hypothetical: it is how the shipped fixture passes (item 4).
4. **Best-level-wins across citations.** One fabricated `L3` line overrides any
   number of honest `L1` declarations — confirmed with a two-line evidence file.
5. **Conversely, the honest format is rejected** (item 4).

So the scan currently admits prose, negations and uncommitted files, and refuses
the slice's own evidence convention. **Severity: HIGH (combined with item 4).**
Smallest fixes: drop `--untracked` (or warn loudly when an untracked file is the
sole citation) so the cap reads only what the PR actually contains; require the
level to come from a structured `EVIDENCE <id>` header block rather than any
line mentioning the ID; and restate 8.3's limit in those terms.

---

## Item 7 — Does `SKIP` ever masquerade as `PASS`?

**PASS on labelling. FAIL on consequence.**

The labelling is exemplary and I could not make a skip read as a pass. The
outcome is its own line, the summary counts it out, and the note survives a
failing run:

```
$ node plugin/scripts/governance-checks.mjs --layout      # canon, Path: none
SKIP  verification-markers — NOT VERIFIED
      - no claim source declared: the delta's "## Roadmap" block binds no path (or declares "none"), so no claim, marker or verification state was checked. Pass --claims <path> if this repo's claims live elsewhere.

4 of 5 checks passed, 0 failed. 1 check(s) SKIPPED, verifying nothing: verification-markers.
EXIT=0
```

A declared-but-absent claim source correctly FAILs rather than skipping.

**But a skip is attacker-inducible and exits 0.** One unbalanced ``` line at the
top of the claim file empties the parse:

```
$ node governance-checks.mjs
SKIP  verification-markers — NOT VERIFIED
      - llm/claims.md: no claim checkbox items found, so no marker grammar or verification state was checked.
EXIT=0
```

And placing that same line *above one claim* hides only that claim, so the run
reports a clean `PASS` while a forged `HUMAN VERIFIED` on `L1`-only evidence
sits below it:

```
$ node governance-checks.mjs           # control: same tree, no fence
FAIL  verification-markers
      - llm/claims.md:5: P1-AC-02 is "HUMAN VERIFIED" but its only evidence is L1 … it is testimony, not verification.
EXIT=1

$ node governance-checks.mjs           # one ``` line inserted above P1-AC-02
PASS  verification-markers
EXIT=0
```

This contradicts the capability's own stated principle — A8, *"un-ID'd claims
are reported, never silently skipped"*, and §3.2, *"It must never be silently
omitted"*. An unbalanced fence is also an ordinary accident, not only an attack:
a claims file with one stray or mis-indented fence silently stops being checked.

**Severity: HIGH. Smallest fix:** on `PASS`, print the number of claims examined
(`PASS  verification-markers (12 claims, 5 markers)`) so a drop from twelve to
one is visible; and fail, or at minimum warn, when `fenced` is still true at
end of file. Both are a few lines in `parseClaims`/`checkVerificationMarkers`.

---

## Item 8 — Exit-code integrity

**PASS.** I could not produce a `FAIL` line with exit 0.

`failed` is incremented on the only branch that prints `FAIL`, and
`process.exit(failed === 0 ? 0 : 1)` is the single exit. Verified across every
fixture in this report (assertion: output matches `/^FAIL /m` ⟹ exit 1). A check
returning a malformed value throws out of the loop and exits non-zero rather
than passing. The only exit-0 states with unverified content are `SKIP` states,
covered in item 7.

```
$ node governance-checks.mjs --layout
FAIL  verification-markers
      - llm/claims.md:5: illegal transition "NEEDS REWORK" -> "HUMAN VERIFIED" on P1-AC-01 — §5.2's table permits only NOT VERIFIED from "NEEDS REWORK"
PASS  layout

1 of 5 check(s) failed. 2 check(s) SKIPPED, verifying nothing: adr-index, adr-status.
EXIT=1
ASSERT: output contains "FAIL" = true, exit=1
```

---

## Item 9 — The sixth shape vs the other five

**PASS.** `verification-marker` is genuinely not paired.

The branch does not call `pairedConstraint`; it rejects `removed.length > 0`
outright. A 1:1 replacement — which `checkbox-only` and `link-target-only` accept
by construction — is refused (item 2, verbatim). C-3 is correctly implemented:
§3.5 was built, not §9.1's sketch.

Defect injected to prove the guard is live rather than incidental: appending a
marker to the same file in the same fixture passes `l0-paths`, and the identical
diff expressed as a removal+addition fails. The builder's own M-2 mutation
(`if (removed.length > 0)` → `if (false)`) breaking three tests is consistent
with what I observe.

One consequence worth stating: because *every* added line must be a well-formed
marker, a claim cannot be **added** through this lane either, and a brand-new
claim file cannot be introduced. That is correct under §3.5 and should be in the
policy's "consequences worth stating plainly" list beside the checkbox-flip cost.

---

## Item 10 — `l0-fast-track.md` internal consistency

**FAIL** — one spot missed, inside the builder's own file set.

Correct and consistent:
- The shape table has exactly **six** rows; the `verification-marker` row's
  mechanical-check column matches the code clause for clause (nothing removed or
  edited, every added line a well-formed marker, no human-only state).
- §Open Questions now reads *"beyond the **six** above"* and records that the
  row and the script branch shipped together. No stale "five" remains.
- §Honest-Gaps lists the new shape in the mechanically-verifiable set and adds
  the two right residuals.
- The Template Allowlist keeps `checkbox-only` and explains the replacement
  (*"A repo whose roadmap carries verification markers **replaces** its
  `allow <roadmap path> checkbox-only` line"*), including the first-match-wins
  reason. Consistent with `parseAllowlist`.
- The "Every other shape permits a line to be replaced" paragraph is accurate.

**Missed:** §Assumptions still reads

> a repo may substitute an equivalent command … provided it preserves both
> security properties: the read-from-base allowlist and the **paired
> diff-shape constraints**.

There are no longer two security properties of that shape: the sixth is
deliberately unpaired, and a substitute command that implemented it as a paired
constraint would satisfy this sentence while permitting the in-place rewrite the
shape exists to forbid. The builder flagged the identical wording in
`plugin/scripts/README.md` §8.5 as out of their file set, but `l0-fast-track.md`
**is** in their file set and carries the same sentence. **Severity: LOW.
Smallest fix:** "…the read-from-base allowlist and the diff-shape constraints,
including `verification-marker`'s append-only rule, which is deliberately not
paired."

Separately confirmed, for whoever picks up 8.5: `plugin/scripts/README.md` does
not contain the string `verification-marker` anywhere, and its §Two security
properties still describes only the five-shape world.

---

## Verification of the builder's three self-reported weaknesses

| Claim | Verdict |
|---|---|
| **8.1** Append-only is strict, so a `verification-marker` file gives up in-lane checkbox flips | **As claimed.** Confirmed verbatim; the cost is real, documented in the policy, and correct under §3.5. Add that new claims and new claim files are also excluded. |
| **8.2** Actor class is enforced only where knowable — from the lane | **As claimed.** `NOT VERIFIED → HUMAN VERIFIED` by an agent passes outside the lane; the lane guard is the sole mechanical actor test. Correctly recorded as a residual. Its weight is higher than the report implies, because item 1d shows the single guard can be missed entirely by a delta declaration. |
| **8.3** The evidence scan can be lied to; the omission path is closed | **Omission path: confirmed closed** (no evidence → FAIL; no level → FAIL). **Width understated**: negations, uncommitted files, narrative reports and best-level-wins all launder the cap, and the slice's own evidence format is *rejected*. See item 6. |
| 8.4 (bonus) inline marker and duplicate claim ID | Both confirmed fixed; I re-ran both and they fail correctly. |
| 8.5 (bonus) `README.md` paired-constraint wording | Confirmed — and the same defect exists in `l0-fast-track.md` §Assumptions, which was in scope (item 10). |

### The fourth weakness, not self-reported

**V-4 — the checker has never been run against the slice's own fixture, because
the two halves disagree about where the claim source is declared.**

- `governance-checks.mjs` `readClaimsPath` reads `## Roadmap` → `Path:`.
- `surface.mjs` reads `## Published Surface` → `Claims source:`.
- `plugin/scripts/fixtures/slice/llm/governance/governance-delta.md` declares
  `Claims path:` (in §Repository Layout) and `Claims source: llm/claims.md` (in
  §Published Surface), and has **no `## Roadmap` block**.

Result, running the checker in the fixture as a standalone repo:

```
$ node governance-checks.mjs
SKIP  verification-markers — NOT VERIFIED
      - no claim source declared: the delta's "## Roadmap" block binds no path (or declares "none"), so no claim, marker or verification state was checked.

1 of 4 checks passed, 0 failed. 3 check(s) SKIPPED, verifying nothing: adr-index, adr-status, verification-markers.
EXIT=0
```

The one repository built to exercise this capability end to end silently
verifies nothing, and when pointed at the claims with `--claims` it fails on its
own prose (item 5) and blocks its own `L3` claims (item 4). The checker's tests
and the fixture were built against each other's assumptions and never met.
**Severity: MEDIUM-HIGH. Smallest fix:** have `readClaimsPath` accept
`Claims source:` from `## Published Surface` as well as `## Roadmap` → `Path:`,
and add one test that runs the shipped fixture through the checker.

### A fifth, smaller one

**V-6 — new files that are not yet tracked are invisible to `--l0`.**
`changedFiles()` is `git diff --name-only <base>`, which omits untracked paths.
A local run reports `PASS  l0-paths`, exit 0, on a tree that also contains a new
`plugin/scripts/evil.mjs` (a hard-denied path) and a new claim file full of
`HUMAN VERIFIED` markers; `git add -A` on the identical tree produces three
failures. In CI the PR head is committed, so this is a **local-run** exposure —
but the fast track explicitly accepts a pasted local run as the checks-pass
artifact. **Severity: MEDIUM. Smallest fix:** in `--l0` mode, warn (or fail) when
`git status --porcelain` reports untracked, non-ignored paths.

---

## Findings, by severity

| # | Finding | Severity | Smallest fix |
|---|---|---|---|
| V-1 | Human-state guard lives only in the `verification-marker` branch; a claim file declared `path-only` lets an agent append `HUMAN VERIFIED` through L0 with exit 0 | **HIGH** | Fail `--l0` when the declared claim source is allowlisted under any other shape |
| V-2 | One unbalanced ``` line hides claims (`PASS`) or empties the check (`SKIP`), both exit 0 | **HIGH** | Print the claim count on PASS; fail/warn on an unclosed fence at EOF |
| V-3 | Determinism level must be on the same line as the claim ID, so the slice's own `// determinism: L3` evidence declares nothing; the cap currently passes on report prose | **HIGH** | Read the level from the citing evidence header block; add the fixture to the test suite |
| V-4 | Checker and `surface.mjs` read the claim source from different delta blocks; the check SKIPs on the slice fixture | **MED-HIGH** | Accept `Claims source:` as well as `## Roadmap` → `Path:` |
| V-6 | Untracked new files invisible to `--l0`, including hard-denied paths | **MEDIUM** | Warn/fail on untracked non-ignored paths in `--l0` |
| V-5 | `MARKER_CANDIDATE` reads ordinary prose containing a state word as a marker; the shipped fixture's claims file fails on its own paragraphs | **MEDIUM** | Require a leading dash-like character for a marker candidate |
| V-7 | The reset reason is unconstrained prose and may contain `HUMAN VERIFIED`, producing a last line that reads as human sign-off | **LOW** | Reject state names inside the reset reason |
| V-8 | `l0-fast-track.md` §Assumptions still says "paired diff-shape constraints"; `README.md` never mentions the sixth shape | **LOW** | Reword §Assumptions; README in the integration sweep |
| V-9 | Lowercase `l3` is rejected with the generic "no level declared" message | **LOW** | Case-insensitive token, or name the cause |

---

## Tried hard, could not break

Stated so the next verifier does not re-spend the time. Each was attempted with
a working fixture and a paired negative that proves the relevant check fires.

- **The `verification-marker` shape itself, head-on.** No dash lookalike (en
  dash, hyphen, horizontal bar), no non-breaking space, no double space, no
  blockquote prefix, no indentation and no missing/extra date got a human state
  past it. The classifier and the state test are independent, so a line that
  slips past the first is still caught by the second.
- **In-place rewrite or deletion inside the lane.** Refused in every form I
  tried, including deleting the whole file and disguising a rewrite as a
  checkbox flip.
- **The read-from-base rule.** A PR that ships its own weakened allowlist is
  judged by the base's and hard-denied for touching the delta.
- **The transition table.** No illegal edge passed; no edge exists that is in
  the code and not in §5.2.
- **Scale inversion (C-1).** The code is correct in every place the level is
  compared, and the ordering is asserted explicitly rather than inferred.
- **`SKIP` presenting as `PASS`.** The labelling is honest in every path I could
  reach, including when other checks fail.
- **`FAIL` with exit 0.** No path found.

## Unreproducible / not tested

- `§5.3` mechanisms 1 (tool separation via charter `disallowedTools`) and 3
  (independence of sessions) are outside a checker's reach and were not tested
  here; they remain the residual the policy says they are.
- Platform behaviour (GitHub approvals binding a `HUMAN VERIFIED` citation) could
  not be exercised — no network, and canon's Platform Enforcement Reality records
  that approvals bind nothing here.
- `surface.mjs`, `surface-html.mjs` and `replay.mjs` were read only far enough to
  establish the claim-source mismatch (V-4); they are another verifier's scope.

## Provenance

Every command above was run from a throwaway copy under the session scratchpad
(`atk/harness.mjs`, `a1-l0.mjs`, `a2-check7.mjs`, `a3-final.mjs`,
`a4-untracked.mjs`, `a5-repro.mjs`, plus a standalone copy of
`plugin/scripts/fixtures/slice/`). The repository was not modified; this report
is the only write. `node plugin/scripts/governance-checks.test.mjs` passes
unmodified on the shipped tree (38 assertions, `all regression tests passed`) —
which is itself the point of V-4: the suite and the fixture do not overlap.
