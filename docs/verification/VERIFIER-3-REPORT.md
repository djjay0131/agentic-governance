FAIL

# Verifier 3 — Human UI verification of the G-3 verification surface

Role: Human UI Verifier, G-3 Human Verification vertical slice.
Branch: `feat/g3-verification-slice`. Date: 2026-09-23.
Under test: `docs/verification/index.html`, `plugin/scripts/surface-html.mjs`,
input `plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json`.

Requirements read independently, before the artifact:
`llm/specs/2026-09-18-human-verification-capability-design.md` §3.5, §4, §4.2,
§5.1, §7.3 (as amended 2026-09-23), §14.1–14.2;
`llm/specs/2026-09-23-human-verification-slice-reconciliation.md` §4 C-2.
`docs/verification/BUILDER-3-REPORT.md` was read last.

---

## The question I was asked

> Does the page expose the **underlying evidence**, or only agent-generated
> **summaries**?

**It exposes the underlying evidence, with one layer missing and three
misstatements.** Every claim reaches real, hash-verified code and real data by a
working link; every hash, byte count and row count I could check against the
filesystem is correct; all ten commands the page prints reproduce exactly the
outcomes the page states. That is a genuinely good page and it is not a prose
façade.

But the page drops the `replay-record/v1` execution record — the artifact behind
every outcome it displays — and then tells the reader the wrong thing about
where those outcomes came from. Its provenance panel prints `[object Object]`
next to a sentence that contradicts the manifest. And its generated
"establishes" prose asserts that a check *reproduces* even when the manifest
records that the replay failed, or that nobody ran it. Each of those three is
the failure I was sent to hunt, in miniature: a summary standing where the
artifact exists, and a sentence the manifest does not support.

The defects are small, precisely located and cheap to fix. None of them is a
misreported hash. But **D-1**, **D-2** and **D-3** are each independently
disqualifying against items 5, 10 and 4 of the brief, so the verdict is `FAIL`
and the remedy is a short patch to `surface-html.mjs`, not a rebuild.

---

## Per-item results

| # | Item | Result |
|---|---|---|
| 1 | Summary vs artifact — code, transformation, dataset reachable | **PASS** |
| 2 | Both PDatasets: VIEW and DOWNLOAD, required fields | **PASS** |
| 3 | Page's claims about files match the files (`sha256`, `rows`, `bytes`) | **PASS** (hashes/bytes exact; see D-4 on the `rows` recompute command) |
| 4 | Append-only history; `P1-AC-03` reset legible as an event | **PASS** on the claim card; **FAIL** on the mechanical append-only result (D-3) |
| 5 | Execution boundary; nothing implying execution it did not perform | **FAIL** (D-1) |
| 6 | `unfalsified` on `P1-AC-04` explained, not a bare badge | **PASS** |
| 7 | `L1` cap on `P1-AC-02` — *why* is visible | **PASS** |
| 8 | The un-ID'd claim present and counted | **PASS** |
| 9 | A human can actually act — file, line, marker text, "no agent may write it" | **PASS** |
| 10 | Generated prose — wrong, overclaiming or true-by-construction | **FAIL** (D-2) |
| 11 | Every link resolves from `docs/verification/` as a browser would | **PASS** |

---

### 1. Summary vs artifact — **PASS**

Every evidence record renders a `locator` that is a working link to the real
file, its `sha256`, and a `sha256sum` command to recompute it. All six evidence
artifacts exist and all six hashes are correct:

```
$ while read -r loc sha; do real=$(sha256sum "plugin/scripts/fixtures/slice/$loc" | cut -d' ' -f1); ...
checks/ac01-duplicate-rejection.mjs           MATCH  onpage=3
evidence/attestations.md                      MATCH  onpage=3
checks/ac03-sort-order.mjs                    MATCH  onpage=3
checks/ac04-transform-runs.mjs                MATCH  onpage=3
checks/cl01-record-count.mjs                  MATCH  onpage=3
human/cl01-independent-relationship.mjs       MATCH  onpage=3
```

The transformation (`transform.mjs`) is reachable as the `transformation` field
of `S1-DS-02`; the human-authored check
`human/cl01-independent-relationship.mjs` is reachable and is correctly badged:

> "**Actor class.** `produced_by` is `fixture-owner (human)` — this check was
> authored by a human, not by the agent whose work it examines."

The refusal to paste excerpts is the right call and is argued, not assumed:

> "This page deliberately does not paste an excerpt: an excerpt is a summary,
> and a summary of the code is exactly the thing you should not be verifying
> against."

The three binding hashes in the footer are also correct:

```
$ cd plugin/scripts/fixtures/slice
claims  : 67874a7f1327a03a99fd1d72672b6602f185b39045009f610206ad103dd3b802  page: 67874a7f…
pdataset: 5e64c355abd1a6d5f7cbbefdb7fcd67ba9ad8d30bd4cfe983110ab70937a5fbb  page: 5e64c355…
delta   : c5f06253611ed9bd46c691d384a21e80851840a10c0e314991eabbffdc533f99  page: c5f06253…
```

### 2. Both PDatasets, VIEW and DOWNLOAD — **PASS**

Two distinct affordances per dataset, and `DOWNLOAD` is a real download, not a
relabelled view:

```
<a class="path" href="../../plugin/scripts/fixtures/slice/data/source.csv">VIEW</a>
<a class="path" href="../../plugin/scripts/fixtures/slice/data/source.csv" download>DOWNLOAD</a>
<a class="path" href="../../plugin/scripts/fixtures/slice/data/generated.csv">VIEW</a>
<a class="path" href="../../plugin/scripts/fixtures/slice/data/generated.csv" download>DOWNLOAD</a>
```

Both reach the actual CSV (resolution verified in item 11). All five required
fields appear on both cards: `rows`, `bytes`, `sha256`, `derived_from`,
`transformation` — and `derived_from` for the root dataset renders the stated
`none`, with §4.1's reason spelled out:

> "derived_from | `none` **stated, not omitted** — a root dataset must be
> distinguishable from one whose provenance was never recorded (design §4.1)"

`link_resolution: local` is stated on both cards with the §4.2 justification,
and no absolute URL is emitted anywhere. That is the honest answer under
`Pages mechanism: none`, not a shortfall.

### 3. Do the page's claims about the files match the files? — **PASS**

```
$ sha256sum plugin/scripts/fixtures/slice/data/source.csv && wc -lc plugin/scripts/fixtures/slice/data/source.csv
d496eda0abeee9c1f14dab82477fd13d6e03d4d20b8e9426c3aa2657f9a17793  …/data/source.csv
 13 453 …/data/source.csv
page says: sha=d496eda0abeee9c1f14dab82477fd13d6e03d4d20b8e9426c3aa2657f9a17793 rows=12 bytes=453

$ sha256sum plugin/scripts/fixtures/slice/data/generated.csv && wc -lc plugin/scripts/fixtures/slice/data/generated.csv
69e24c33f1325ad8688ce99f6b9ebb63bf5267420dc4e53dfebe5763f841612e  …/data/generated.csv
 10 367 …/data/generated.csv
page says: sha=69e24c33f1325ad8688ce99f6b9ebb63bf5267420dc4e53dfebe5763f841612e rows=9 bytes=367
```

**Zero hash mismatches. Zero byte mismatches.** `rows` is correct in meaning —
12 and 9 are the data rows, excluding the header — but the page's own recompute
command does not produce those numbers. See **D-4**.

I also confirmed the committed page is genuinely the generator's output for the
committed manifest, modulo the two path-dependent strings that a different
`--out` necessarily changes:

```
$ node plugin/scripts/surface-html.mjs --manifest …/surface-manifest.json --out $SP/regen.html --quiet
$ sed -e 's#\.\./\.\./\.\./\.\./\.\./mnt/c/code/agentic-governance/#../../#g' \
      -e 's#--out …/regen\.html#--out docs/verification/index.html#g' $SP/regen.html > $SP/regen-norm.html
3c5fe3aaee23eb48035381925d5de1e336f085990e7fc224d753eba2a84cc0b8  $SP/regen-norm.html
3c5fe3aaee23eb48035381925d5de1e336f085990e7fc224d753eba2a84cc0b8  docs/verification/index.html
```

### 4. Append-only history — **PASS** on the card, **FAIL** on the enforcement result

The `P1-AC-03` card is the best thing on the page. All three markers are
rendered with their source line numbers, raw text and every parsed field; the
prior `HUMAN VERIFIED` is still there, tagged `history`; the reset is tagged
`CURRENT — last line of the block`; and the reset is narrated as an event:

> "**What happened here.** This claim is `NOT VERIFIED` **because of an event,
> not because of an absence.** On 2026-09-23 a marker was appended reading
> `— NOT VERIFIED (claim text edited, 2026-09-23)`. The line above it still
> reads `HUMAN VERIFIED`, and it was not erased. … Nobody withdrew it and
> nothing was overwritten — the marker block is append-only (design §3.5), so
> the whole chain above is still visible. Deleting it would hide exactly the
> event that matters most. Re-verification starts from the current sentence. It
> is not a resumption of the old one."

That is §3.5 rendered exactly as §3.5 asks. What is missing is the *mechanical*
half: the manifest records `previous.markers_mutated: []` — the result of the
append-only check against the baseline — and the page never shows it. See
**D-3**.

### 5. The execution boundary — **FAIL**

The boundary panel itself is exemplary and is the first thing on the page:

> "**This page renders commands. It does not run them.** Nothing on this page
> executes. There is no script on this page at all — no JavaScript, no network
> request at view time, no embedded runtime. … There is no spinner, no simulated
> output and no `PASS` this page produced. A page that animated a result would
> be worse than one that runs nothing (design §7.3, as amended 2026-09-23)."

No rendered `PASS` is presented as the page's own. Nothing implies in-page
execution. But the brief also asks for "a result presented without saying when
and by whom it was obtained", and on that the page fails ten times over. See
**D-1**.

### 6. `unfalsified` on `P1-AC-04` — **PASS**

Not a bare badge. The card header carries
`UNFALSIFIED — modified replay failed to fail` and `CEILING: AGENT VERIFIED`;
the row `unfalsified | true  modified replay failed to fail`; the ceiling reason
verbatim from the manifest; a `warn` finding with a rendered explanation; and,
in "What this does not establish", the unambiguous statement:

> "**Nothing about the claim — the check may be vacuous.** MODIFIED REPLAY ran
> `node checks/ac04-transform-runs.mjs --perturb accept-duplicates` … It was
> expected to `fail` and the manifest records that it `pass`ed. *The modified
> replay failed to fail.* The check passes while the behaviour it asserts is
> broken, so a passing REPLAY above tells you the script runs — and nothing
> more (design §14.3, §14.4)."

And the decision block closes the door:

> "`HUMAN VERIFIED` is not available for this claim. … Appending
> `HUMAN VERIFIED` here would assert more than the evidence can carry. Fix the
> evidence first."

A reader could not mistake this for a pass.

Minor ordering wobble, not a defect: the block prints "Before you may write
`HUMAN VERIFIED` on P1-AC-04, run both of these yourself…" immediately *above*
"`HUMAN VERIFIED` is not available for this claim." The two read oddly together.

### 7. The `L1` cap on `P1-AC-02` — **PASS**

The *why* is visible in four places: the header flag
`L1 ONLY — capped below HUMAN VERIFIED`, the ceiling row, the evidence-level
gloss (`CANNOT reach HUMAN VERIFIED…`), and the finding explanation:

> "The only evidence for this claim is `L1` (attested): somebody stated it and
> there is nothing to re-execute — no command, no output to compare, no
> perturbation that could falsify it. … not because nobody has looked yet, but
> because there is nothing a human could look at. Lifting the cap requires new
> executable evidence, not a more confident sentence."

### 8. The un-ID'd claim — **PASS**

Counted in the masthead (`1 un-ID'd claim line`), counted in the coverage table
(`un-ID'd claim lines | 1  counted, never silently dropped`), and given its own
linked section rendering the line in full with its location, checkbox, state and
the generator's note. Not quietly dropped.

### 9. Can a human actually act? — **PASS**

Per claim, the page names the exact file (`…/llm/claims.md`), the exact
insertion point ("append a new line immediately after line 22 (the current last
marker, `— HUMAN VERIFIED (PR #42, 2026-09-23)`)"), the grammar, a six-row table
of the exact marker line to append for each state with who may assert it, and
the commands to run first. It says plainly who may not write it:

> "This page does not write your decision, and **no agent may write one for
> you.** An agent writing a human verification state is the precise thing this
> capability exists to forbid (design §5.3). You edit the file yourself, in a
> pull request, with your own hands."

### 10. Generated prose — **FAIL**

I read all six evidence blocks. Five of the six generated sentences are correct
and well-calibrated, and the "does not establish" column never lets a green
REPLAY read as proof of correctness — it says the opposite, explicitly:

> "**That the claim is true.** A deterministic script can be consistently wrong.
> REPLAY proves the script reproduces; it does not prove the script asserts the
> right thing, and **a green result is not proof of correctness.**"

The sixth is wrong. See **D-2**.

### 11. Link resolution from `docs/verification/` — **PASS**

All 20 distinct file hrefs and all 16 anchors resolve, checked from the page's
own directory as a browser would:

```
$ cd docs/verification && for h in $(grep -o 'href="[^"#][^"]*"' index.html | …); do [ -e "$h" ] && echo OK || echo MISS; done
OK    ../../llm/specs/2026-09-18-human-verification-capability-design.md
OK    ../../llm/specs/2026-09-23-human-verification-slice-reconciliation.md
OK    ../../plugin/scripts/fixtures/slice
OK    ../../plugin/scripts/fixtures/slice/checks
OK    ../../plugin/scripts/fixtures/slice/checks/ac01-duplicate-rejection.mjs
OK    ../../plugin/scripts/fixtures/slice/checks/ac03-sort-order.mjs
OK    ../../plugin/scripts/fixtures/slice/checks/ac04-transform-runs.mjs
OK    ../../plugin/scripts/fixtures/slice/checks/cl01-record-count.mjs
OK    ../../plugin/scripts/fixtures/slice/data/generated.csv
OK    ../../plugin/scripts/fixtures/slice/data/source.csv
OK    ../../plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json
OK    ../../plugin/scripts/fixtures/slice/evidence
OK    ../../plugin/scripts/fixtures/slice/evidence/attestations.md
OK    ../../plugin/scripts/fixtures/slice/human
OK    ../../plugin/scripts/fixtures/slice/human/cl01-independent-relationship.mjs
OK    ../../plugin/scripts/fixtures/slice/llm/claims.md
OK    ../../plugin/scripts/fixtures/slice/llm/governance/governance-delta.md
OK    ../../plugin/scripts/fixtures/slice/llm/pdatasets.md
OK    ../../plugin/scripts/surface-html.mjs
OK    ../../plugin/scripts/surface.mjs
---- anchors: 16/16 OK ----
```

Zero 404s. (Four of the twenty are directory links — `…/slice`, `…/checks`,
`…/evidence`, `…/human`. Over `file://` and over a static host with indexes they
browse; over a host without directory indexes they would not. That is inherent
to `link_resolution: local` and is not a defect.)

---

## Defects

### D-1 — the execution record is dropped, and every outcome is misattributed. **Severity: high.**

`surface.mjs` goes to deliberate lengths to separate what an agent *says* about
a check from what a runner *observed*. Per command it emits a full
`replay-record/v1`:

```json
"attested_outcome": "pass",
"recorded_outcome": "pass",
"outcome_source": "executed",
"execution": {
  "executed": true, "exit_status": 0, "timed_out": false,
  "stdout_sha256": "16a3f1f6bc2fac365b1058ec3da6966ba946efb1e5eb986bc6a8f3442733d414",
  "stdout_bytes": 108,
  "stdout_first_line": "PASS P1-AC-01 REPLAY: 9 unique valid source records -> …",
  "execution_id": "2b027de10f3013a997cf589f38ea0500ae9fa31fda0c001c66a8604312fddc77"
}
```

and the fixture itself narrates why, in `checks/ac04-transform-runs.mjs`:

> "…this line is `attested_outcome` and the exit status is `recorded_outcome`.
> … That is the whole point: **a verdict must not be a function of a comment.**"

**None of it reaches the page.**

```
$ for t in execution_id exit_status stdout_first_line stdout_sha256 outcome_source replay-record commands_executed; do
    printf '%-20s %s\n' "$t" "$(grep -c -- "$t" docs/verification/index.html)"; done
execution_id         0
exit_status          0
stdout_first_line    0
stdout_sha256        0
outcome_source       0
replay-record        0
commands_executed    0
```

`surface-html.mjs` reads `spec.recorded_outcome` and nothing else
(line 208). What the page renders instead is one word plus a fixed hint:

```html
<tr><th>outcome recorded in the manifest</th><td><code>pass</code>
  <span class="hint">recorded when it was last run by its producer &mdash; not by this page</span></td></tr>
```

Two problems, both fatal to item 5:

1. **The attribution is wrong.** These outcomes were *not* recorded "when it was
   last run by its producer". The producer is `fixture-builder (agent)`,
   `produced_at: 2026-09-22`. The outcomes were obtained by
   `plugin/scripts/replay.mjs` during manifest generation —
   `manifest.replay = { runner: "plugin/scripts/replay.mjs", execution: "enabled",
   commands_executed: 10, timeout_ms: 60000 }`, `generated_at
   2026-09-23T23:05:38.252Z`. The page states the wrong actor and gives no time
   at all. The page's own ceiling text knows better and says
   "L3 evidence **EXECUTED this run**" three lines above — so the page
   contradicts itself.
2. **Observed and attested are indistinguishable.** A `pass` that a runner saw
   and a `pass` an agent typed into a `// replay-outcome:` comment render
   identically. That is precisely the laundering the manifest schema was built
   to prevent, undone at the last step.

This also strips the single most useful thing a human could check by eye: the
recorded `stdout_first_line`, against which they can compare their own terminal
after running the command the page tells them to run.

**Smallest fix.** In `commandBlock` (surface-html.mjs ~line 208), replace the
static hint with the execution record's own fields:

```js
const x = spec.execution ?? {};
const prov = x.executed
  ? `observed by <code>${manifest.replay?.runner}</code> when the manifest was generated (${manifest.generated_at}) &mdash; exit status <code>${x.exit_status}</code>, <code>execution_id ${x.execution_id}</code>`
  : `<strong>NOT EXECUTED</strong> &mdash; ${esc(x.unexecuted_reason ?? 'no execution record')}. This outcome was attested by the artifact, not observed.`;
```

and add a row for `stdout_first_line` when present, and for
`attested_outcome` whenever it differs from `recorded_outcome`.

### D-2 — generated prose claims a check "reproduces" when the manifest says it failed, or was never run. **Severity: high.**

`scopeOfTest()` pushes this into **What this establishes** unconditionally,
whenever `ev.replay` exists — it consults neither `as_expected` nor
`recorded_outcome` (surface-html.mjs line 239):

```js
yes.push(`<strong>REPLAY.</strong> Running <code>…</code> from <code>…</code> is expected to
  <code>${esc(ev.replay.expect)}</code>. It reproduces &mdash; that is, the recorded artifact can be
  regenerated rather than merely described (design §14.2).`);
```

Demonstrated, not inferred. I took the committed manifest, flipped
`P1-AC-01`'s REPLAY to a recorded failure, and rendered it:

```
$ node -e "… r.recorded_outcome='fail'; r.as_expected=false; r.execution.exit_status=1 …"
$ node plugin/scripts/surface-html.mjs --manifest $SP/probe-failing-replay.json --out $SP/probe-failing.html --quiet
```

The command table correctly turns red —

```
expected result | pass |
outcome recorded in the manifest | fail … |
as expected | false |
```

— and then, two lines below it, under the heading **What this establishes**:

```
REPLAY. Running node checks/ac01-duplicate-rejection.mjs from plugin/scripts/fixtures/slice is
expected to pass. It reproduces — that is, the recorded artifact can be regenerated rather than
merely described (design §14.2).
```

A failing replay is reported as establishing that the artifact reproduces. The
page contradicts its own table.

The unexecuted case is worse. Generating with the engine's real `--no-execute`
path and rendering it:

```
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --no-execute … --out $SP/noexec.json
$ node plugin/scripts/surface-html.mjs --manifest $SP/noexec.json --out $SP/noexec.html --quiet
```

gives, for a command nobody ran:

```
outcome recorded in the manifest | not recorded  recorded when it was last run by its producer — not by this page |
as expected | null |
What this establishes
REPLAY. … It reproduces — that is, the recorded artifact can be regenerated rather than merely described (design §14.2).
Byte-stability. The level is L3: same inputs, byte-identical outputs. …
```

"not recorded … recorded when it was last run" is self-contradictory on its
face, and "It reproduces" is asserted from zero evidence.

There is a third, quieter hole in the same function. The vacuity sentence is
emitted only for `as_expected === true` or `=== false`, and the fallback covers
only `!ev.modified_replay`. When `as_expected` is `null` — exactly the
unexecuted case — **nothing at all is said about vacuity**, while the list still
carries "That the check catches anything beyond the one perturbation recorded
here", which presupposes a perturbation was observed. Silence precisely where
the brief cares most.

Mitigating, and worth recording: in the *unexecuted* case `surface.mjs` raises
ten `error`-severity `replay-not-executed` findings and the page does render
them, so the page is not wholly silent. But the per-evidence prose, which is
where a reader forms their judgement, is wrong.

**Smallest fix.** Gate the sentence on the observed outcome and drop the
expectation/assertion conflation:

```js
if (ev.replay.as_expected === true) {
  yes.push(`<strong>REPLAY.</strong> <code>${cmd}</code> was run from <code>${cwd}</code> and
    <code>${ev.replay.recorded_outcome}</code>ed, as recorded. The artifact reproduces …`);
} else if (ev.replay.as_expected === false) {
  no.unshift(`<strong>That the artifact reproduces.</strong> REPLAY was expected to
    <code>${ev.replay.expect}</code> and the manifest records that it
    <code>${ev.replay.recorded_outcome}</code>ed. …`);
} else {
  no.unshift(`<strong>That the artifact reproduces.</strong> This REPLAY was never executed
    (${x.unexecuted_reason}). Nothing here has been observed. …`);
}
```

and add an `as_expected === null` arm to the vacuity branch.

### D-3 — the Binding panel prints `[object Object]` and a false sentence, hiding the append-only check result. **Severity: medium-high.**

```
$ grep -o "previous.\{0,120\}" docs/verification/index.html
previous</code></th><td>[object Object] <span class="hint">no prior manifest to diff against</span></td></tr>
```

Two failures in one row (surface-html.mjs line 751, `orNull(manifest.previous)`
against an object):

1. A raw `[object Object]` on a page whose thesis is "every value below came
   from it".
2. The hint is **false**. The manifest records that a baseline comparison *did*
   happen:

```json
"previous": {
  "path": "docs/verification/surface-manifest.json",
  "source": "default: the committed manifest",
  "claims_compared": 5,
  "drifted": [], "invalidated": [], "markers_mutated": []
}
```

`markers_mutated: []` is the mechanical append-only enforcement result — the
"enforcer rather than an aspiration" §3.5 demands — and the page tells the
reader no comparison was made. Item 4's second half fails here: the *narration*
of the reset is excellent, the *proof that nothing was rewritten* is thrown
away.

**Smallest fix.** Render the object's fields instead of stringifying it:

```js
<tr><th><code>previous</code></th><td>${manifest.previous
  ? `${link(manifest.previous.path)} &mdash; ${manifest.previous.claims_compared} claims compared;
     drifted ${n(manifest.previous.drifted)}, invalidated ${n(manifest.previous.invalidated)},
     <strong>markers mutated ${n(manifest.previous.markers_mutated)}</strong> (design §3.5)`
  : `<span class="null">null</span> <span class="hint">no prior manifest to diff against</span>`}</td></tr>
```

### D-4 — the page's own "confirm it yourself" command does not reproduce the page's own number. **Severity: medium.**

```html
<th>rows</th><td><code>12</code></td></tr>
<th>confirm hash, rows and bytes yourself</th><td><pre class="shell inline">$ sha256sum …/data/source.csv &amp;&amp; wc -lc …/data/source.csv</pre></td></tr>
```

```
$ wc -lc plugin/scripts/fixtures/slice/data/source.csv
 13 453 …/data/source.csv
```

The page says `rows 12`; the command the page supplies to confirm it returns
`13`. The page is right — 12 is the data-row count, excluding the header — but
it never says so, and a reader who does what the page asks finds an apparent
mismatch on the one number the page invited them to check. On a page whose
entire purpose is "do not take this on trust", a verification affordance that
appears to fail is corrosive.

**Smallest fix.** Label the field and the command:
`rows | 12  data rows, excluding the header`, and emit
`$ tail -n +2 <path> | wc -l && wc -c <path>`.

### D-5 — Markdown leaks into the rendered page. **Severity: low.**

Manifest finding messages carry Markdown, which the generator escapes but never
converts:

```
$ grep -o 'reported \*\*unfalsified\*\*[^<]*' docs/verification/index.html
reported **unfalsified** — modified replay failed to fail (design §14.4)
$ grep -o 'only `L1` (attested)[^<]*' docs/verification/index.html
only `L1` (attested) evidence: capped at `AGENT VERIFIED` and can never reach `HUMAN VERIFIED` (design §6.3)
```

Literal `**` and backticks in six rendered messages. Cosmetic, but it is the
Findings panel — the part a reader scans first.

**Smallest fix.** A four-line inline-Markdown pass over finding messages
(`` `x` `` → `<code>`, `**x**` → `<strong>`) applied after `esc()`.

### D-6 — two hashes are unlabelled and unrecomputable. **Severity: low.**

The Binding panel says "Recompute any of them with the commands in the execution
boundary above", then prints
`manifest content_sha256 | a8d76b32…` and
`verification projection | ENABLED, sha256 7907b266…` without saying what either
covers. They are, respectively, the canonical-JSON hash of the manifest with
`generated_at` and `content_sha256` nulled, and the canonical-JSON hash of
`manifest.verification` — neither is the hash of any file on disk, so
`sha256sum` on anything will not reproduce them. Every other hash on the page
ships a recompute command; these two do not.

**Smallest fix.** One clause each: "over the manifest with `generated_at` and
`content_sha256` nulled (canonical JSON)" / "over `manifest.verification`
(canonical JSON)".

### D-7 — an evidence record's determinism level is presented as fact, never as self-declared. **Severity: low.**

For PDatasets the page carefully distinguishes `why that level | declared` from
`why that level | derived: manual transformation is L1`. For *evidence* records
it does not: the level is read from a `// determinism: L3` comment in the very
artifact under test, and the page states it flatly —

> "**Byte-stability.** The level is `L3`: same inputs, byte-identical outputs.
> A hash comparison over the result is therefore meaningful (design §14.1)."

```
$ grep -c "self-declared\|declared in the artifact\|declares its level" docs/verification/index.html
0
```

§14.1 does require every evidence record to declare its level, so this is a
declaration by design — but `P1-AC-04`'s deliberately vacuous check declares its
own `L3`, and the page repeats it without a word about provenance.

**Smallest fix.** Append to the determinism gloss: "declared by the artifact
itself, in its `// determinism:` header — not independently established."

### D-8 — `BUILDER-3-REPORT.md`'s verbatim evidence describes a different page. **Severity: medium (report, not page).**

Read last and treated as claims to disprove. Five of its numbers do not match
the shipped artifacts:

| Report claims | Actual |
|---|---|
| page `120,843` bytes | `130410` |
| page `sha256 3e465849…fbe923f0` | `3c5fe3aaee23eb48035381925d5de1e336f085990e7fc224d753eba2a84cc0b8` |
| manifest `content_sha256 f00eeabf…2693a0ca` | `a8d76b32f476c5e8bb4b5b7bebcddbc027c1280696ec9836af06e8d7d87d3342` |
| `generated_at 2026-09-23T00:00:00.000Z` | `2026-09-23T23:05:38.252Z` |
| "claims 5 evidence **5** … findings **2**" | evidence `6`, findings `4` |

Its §3 link inventory also omits `…/slice/human` and
`…/human/cl01-independent-relationship.mjs`, both of which the shipped page
links.

The cause is benign and worth stating plainly: the manifest was regenerated
after the report was written
(`BUILDER-3-REPORT.md 18:41`, `surface-manifest.json 19:05`,
`index.html 19:05`), picking up a sixth evidence record and two more findings.
`surface-html.mjs` itself (`18:39`) was *not* touched afterwards, so the
report's **descriptive** claims about the generator's behaviour all held up
under test. Only its numeric evidence is stale — but a report whose "Evidence"
section does not describe the committed artifact cannot be used as evidence, and
it should be regenerated before this slice is signed off.

---

## Could not reproduce

- **Nothing the orchestrator confirmed failed to hold.** `http` occurs 0 times;
  0 `<script>`/`<img>`/`<link>`/`@import`/`url(`; all 34 links resolve (16
  anchors, 18 file targets — I count 20 distinct file hrefs including the two
  directory links added since, all resolving).
- I initially measured the page as *not* byte-reproducible. That was my own
  error: `--out` legitimately changes both the relative link depth and the
  regeneration command echoed on the page. Corrected below.

## Things I tried hard to break and could not

1. **The hashes.** Six evidence artifacts, two PDatasets, three binding hashes —
   eleven independently recomputed, eleven exact. No misreported hash anywhere
   on the page.
2. **The commands.** I ran all ten REPLAY/MODIFIED REPLAY commands the page
   prints, copied from the page's own HTML rather than the manifest, from the
   working directory the page names. Every outcome matched the page exactly,
   including the two that must fail and the one that must not:

   ```
   $ node checks/ac01-duplicate-rejection.mjs                                → exit 0  (page: pass)
   $ node checks/ac01-duplicate-rejection.mjs --perturb accept-duplicates    → exit 1  (page: fail)
   $ node checks/ac03-sort-order.mjs                                         → exit 0  (page: pass)
   $ node checks/ac03-sort-order.mjs --perturb shuffle-output                → exit 1  (page: fail)
   $ node checks/ac04-transform-runs.mjs                                     → exit 0  (page: pass)
   $ node checks/ac04-transform-runs.mjs --perturb accept-duplicates         → exit 0  (page: pass — failed to fail, as reported)
   $ node checks/cl01-record-count.mjs                                       → exit 0  (page: pass)
   $ node checks/cl01-record-count.mjs --perturb source-score                → exit 1  (page: fail)
   $ node human/cl01-independent-relationship.mjs                            → exit 0  (page: pass)
   $ node human/cl01-independent-relationship.mjs --perturb drop-generated-row → exit 1 (page: fail)
   ```

   Running them left the tree untouched (`data/generated.csv`, `data/source.csv`
   and `llm/claims.md` byte-identical before and after), so the page's
   instruction to a human is safe to follow.
3. **Determinism.** Two runs to an identical `--out`:

   ```
   run1=180b73241c491e5d31a706593bcc3f541957b5847fff084e46c9c41828581abc
   run2=180b73241c491e5d31a706593bcc3f541957b5847fff084e46c9c41828581abc
   BYTE-IDENTICAL
   ```

4. **Provenance of the committed page.** Regenerated and normalised for the two
   path-dependent strings, it is byte-identical to `docs/verification/index.html`
   (`3c5fe3aa…`). The committed page really is this manifest, rendered by this
   generator.
5. **A hidden summary standing in for a dataset.** There is none — no CSV row and
   no line of check source is embedded anywhere in the page
   (`grep -c "Katherine Johnson"` → `0`, `grep -c "const uniqueValid"` → `0`).
   The refusal to excerpt is consistent and argued.
6. **A promotion path for an agent.** I could find no affordance, phrasing or
   omission by which the page nudges a reader toward `HUMAN VERIFIED` on
   insufficient evidence. Where the ceiling blocks it, the page says so and
   refuses. `coverage.human_state_on_agent_evidence: ["P1-AC-01"]` — the one
   uncomfortable fact in the fixture — is surfaced as an `info` finding on the
   page rather than buried.

---

## Verdict

`FAIL`, on **D-1**, **D-2** and **D-3**.

The page is close, and the direction is right: it is the most honest generated
interface I have had to check, and its instinct — *"Nothing here is summarised
without the thing it summarises sitting beside it"* — is the correct one and is
mostly honoured. It fails because in three places it does not honour it: the
execution record exists and is not shown, the baseline comparison exists and is
denied, and one generated sentence asserts reproduction the manifest does not
support. All three are in `surface-html.mjs` and all three are a short patch.
None requires touching the engine, the manifest or the fixture.

Recommended: fix D-1, D-2, D-3 and D-4; regenerate the page and
`BUILDER-3-REPORT.md`; re-verify. D-5 through D-7 can follow.
