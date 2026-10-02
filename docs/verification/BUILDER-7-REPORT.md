# Builder 7 — answering VERIFIER-3-REPORT.md (D-1, D-2, D-3, D-4, D-5)

Role: Builder, G-3 Human Verification vertical slice.
Branch: `feat/g3-verification-slice`. Date: 2026-09-23.
Verdict answered: `docs/verification/VERIFIER-3-REPORT.md` — `FAIL` on **D-1**,
**D-2**, **D-3**.

Changed: `plugin/scripts/surface-html.mjs` (+139 / −19 lines) and its output,
`docs/verification/index.html`, regenerated from the **existing committed
manifest** `plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json`
(`content_sha256 a8d76b32f476c5e8bb4b5b7bebcddbc027c1280696ec9836af06e8d7d87d3342`,
unmodified — `git status` shows it untouched). Nothing in `surface.mjs`,
`replay.mjs`, `governance-checks*.mjs`, `fixtures/`, `llm/` or `.github/` was
touched.

Final page: `152967` bytes,
`sha256 1e3c43d50589b9e28dde7d7ec111b445cec6056f9d9dbd23ae9ad27582e558c9`.

---

## D-1 — the execution record is dropped, and every outcome is misattributed

### Before

The whole of `replay-record/v1` was one word and a fixed, false hint:

```html
<tr><th>outcome recorded in the manifest</th><td><code>pass</code>
  <span class="hint">recorded when it was last run by its producer &mdash; not by this page</span></td></tr>
```

and, in the execution-boundary panel:

> "Every `expect` and `outcome` shown below was *read out of the manifest*,
> where it was recorded by **whoever last ran the command**."

Counts on the committed page before the fix — each field appears **10 times in
the manifest**:

```
recorded_outcome   0        attested_outcome   0
execution_id       0        exit_status        0
stdout_sha256      0        stdout_first_line  0
outcome_source     0
```

### After

`commandBlock()` now renders the record, field by field, with the two outcomes
held apart. Verbatim from the regenerated page (first REPLAY, `P1-AC-01`):

```html
<tr><th>expected result</th><td><code>pass</code> <span class="hint">what this command must do for the evidence to hold</span></td></tr>
<tr><th><code>attested_outcome</code> <span class="hint">what the artifact says</span></th><td><code>pass</code>
  <span class="hint">read out of the artifact's own <code>// replay-outcome:</code> header &mdash; testimony, never a result</span></td></tr>
<tr><th><code>recorded_outcome</code> <span class="hint">what running it produced</span></th><td><span class="outcome-ok"><code>pass</code></span>
  <span class="hint">observed by <code>plugin/scripts/replay.mjs</code>, which executed this command when the manifest
  was generated (<code>2026-09-23T23:05:38.252Z</code>). Not by this page, and not by the artifact's producer.</span></td></tr>
<tr><th><code>outcome_source</code></th><td><code>executed</code>
  <span class="hint">the outcome above was observed, not copied from the artifact</span></td></tr>
<tr><th>as expected</th><td><span class="outcome-ok">true</span> <span class="hint">compares the observed outcome against the expectation above</span></td></tr>
<tr><th><code>exit_status</code></th><td><code>0</code> <span class="hint">the mechanical basis of the outcome above</span></td></tr>
<tr><th><code>stdout_first_line</code></th><td><pre class="shell inline out">PASS P1-AC-01 REPLAY: 9 unique valid source records -&gt; 9 output records; 1 duplicated source id(s) rejected</pre>
  <span class="hint">run the command yourself and compare this line against your own terminal</span></td></tr>
<tr><th><code>stdout_sha256</code></th><td><code class="hash">16a3f1f6bc2fac365b1058ec3da6966ba946efb1e5eb986bc6a8f3442733d414</code>
  <span class="hint">over 108 bytes of captured output</span></td></tr>
<tr><th><code>execution_id</code></th><td><code class="hash">2b027de10f3013a997cf589f38ea0500ae9fa31fda0c001c66a8604312fddc77</code>
  <span class="hint">identifies this one execution inside the <code>replay-record/v1</code> record</span></td></tr>
```

Manifest fields now rendered, per command:
`attested_outcome`, `recorded_outcome`, `outcome_source`, `as_expected`,
`expect`, `execution.executed`, `execution.unexecuted_reason`,
`execution.exit_status`, `execution.signal`, `execution.timed_out`,
`execution.stdout_first_line`, `execution.stdout_sha256`,
`execution.stdout_bytes`, `execution.execution_id`;
plus `manifest.replay.{runner,schema,execution,commands_executed,commands_unexecuted,timeout_ms,timing_excluded}`
and `manifest.generated_at` for the attribution.

Counts after (page vs manifest):

```
recorded_outcome   page=11  manifest=10     (10 command rows + 1 in the Binding panel)
attested_outcome   page=10  manifest=10
execution_id       page=10  manifest=10
exit_status        page=10  manifest=10
stdout_sha256      page=10  manifest=10
stdout_first_line  page=10  manifest=10
outcome_source     page=10  manifest=20
```

The `stdout_sha256` the page prints is real. Running the command the page prints,
from the working directory the page names:

```
$ cd plugin/scripts/fixtures/slice && node checks/ac01-duplicate-rejection.mjs | sha256sum
16a3f1f6bc2fac365b1058ec3da6966ba946efb1e5eb986bc6a8f3442733d414  -
exit=0
PASS P1-AC-01 REPLAY: 9 unique valid source records -> 9 output records; 1 duplicated source id(s) rejected
```

— identical to the rendered `stdout_sha256`, `exit_status` and
`stdout_first_line`.

### Attribution corrected

The false hint is gone (`grep -c "recorded when it was last run" index.html` →
`0`). The boundary panel now states the distinction instead of blurring it:

> "Every `expect` and `outcome` shown below was *read out of the manifest*.
> **No result on this page was obtained by this page.** The manifest
> distinguishes two of them and so does every command block below:
> `attested_outcome` is what the artifact's own comment claims, and
> `recorded_outcome` is what happened when `plugin/scripts/replay.mjs` actually
> executed the command while the manifest was being generated
> (`2026-09-23T23:05:38.252Z`, `10` commands executed). An asserted outcome and
> an observed one are never shown as the same thing — that conflation is the
> defect this record exists to prevent (design §14.2)."

The Binding panel gained the runner itself, as a resolving link:

> `replay runner | plugin/scripts/replay.mjs — execution enabled · 10 commands
> executed, 0 unexecuted · timeout 60000 ms · record schema replay-record/v1.
> Every recorded_outcome on this page was observed by this runner at
> 2026-09-23T23:05:38.252Z.`

### Disagreement surfaced prominently

Where `attested_outcome !== recorded_outcome`, a bordered red banner is emitted
**above** the table, before any other field. Demonstrated on a probe manifest
(`$SP/probe-mismatch.json`: `P1-AC-01` REPLAY attests `pass`, recorded `fail`):

```html
<p class="cmd-mismatch"><strong>ATTESTED &ne; OBSERVED.</strong> The artifact attests <code>pass</code>.
  Running it produced <code>fail</code>. <strong>The observed value governs</strong> &mdash; a verdict must
  not be a function of a comment (design §14.2). Everything this page says about this command is derived from
  <code>fail</code>, and the disagreement itself is evidence about the artifact.</p>
```

On the committed manifest all ten commands agree, so no banner renders — which
is the correct output, not an untested path.

---

## D-2 — the page told the reader a failing check "reproduces"

### Before

`scopeOfTest()` pushed this into **What this establishes** unconditionally,
consulting neither `as_expected` nor `recorded_outcome`:

> "**REPLAY.** Running `node checks/ac01-duplicate-rejection.mjs` from
> `plugin/scripts/fixtures/slice` is expected to `pass`. It reproduces — that
> is, the recorded artifact can be regenerated rather than merely described
> (design §14.2)."

### After — three arms, derived from the observed outcome

**`as_expected === true`** (the committed manifest) — the sentence now names the
runner and the observed result rather than the expectation:

> "**REPLAY.** `node checks/ac01-duplicate-rejection.mjs` was executed from
> `plugin/scripts/fixtures/slice` by `plugin/scripts/replay.mjs` when this
> manifest was generated, and it `pass`ed — which is what was expected (`pass`).
> It reproduces: the recorded artifact can be regenerated rather than merely
> described (design §14.2)."

**`as_expected === false`** — moved out of *establishes* and into the front of
*does NOT establish* (a `noLead` list guarantees it leads the column). Proven,
not asserted: probe manifest with `P1-AC-01`'s REPLAY flipped to
`recorded_outcome: "fail"`, `as_expected: false`, `exit_status: 1`:

```
$ node plugin/scripts/surface-html.mjs --manifest $SP/probe-failing-replay.json --out $SP/probe-failing.html
```

Inside the `P1-AC-01` block: **`"It reproduces"` occurs 0 times.** What it says
instead:

> "**That the artifact reproduces.** REPLAY `node checks/ac01-duplicate-rejection.mjs`
> was expected to `pass` and, when it was run, it `fail`ed instead. *The replay
> did not reproduce.* Nothing downstream of this command can be relied on until
> that is explained — a failing replay is a result to investigate, not evidence
> to stand on (design §14.2)."

**`as_expected === null`** (nothing ran) — generated through the engine's real
`--no-execute` path, not a hand-edited manifest:

```
$ node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice --no-execute --out $SP/noexec.json
$ node plugin/scripts/surface-html.mjs --manifest $SP/noexec.json --out $SP/noexec.html
```

`"It reproduces"` occurs **0 times** in the `P1-AC-01` block. Instead:

> "**That the artifact reproduces.** REPLAY `node checks/ac01-duplicate-rejection.mjs`
> was **never executed** (execution disabled by `--no-execute`: the outcome was
> not observed). Its outcome is `not recorded` and nothing about it has been
> observed by anyone. The command is printed so that you can be the first to run
> it; until somebody does, reproduction is an open question, not a property
> (design §14.2)."

and the self-contradictory row is gone — the command table now reads:

```
recorded_outcome   | not recorded   NOT OBSERVED. execution disabled by `--no-execute`: the outcome was
                                    not observed — nobody ran this command. Any value beside it is the
                                    artifact's own claim about itself, not a result.
outcome_source     | unexecuted     the outcome above was not observed by a runner
as expected        | null           unknown: nothing was observed, so nothing can be compared against
                                    the expectation above
execution.executed | false          … There is no exit status, no output and no execution_id, because
                                    nothing ran.
```

### The vacuity silence

A fourth arm was added for a MODIFIED REPLAY that exists but was never observed
(`as_expected === null`), where the page previously said **nothing at all**:

> "**Whether the check is vacuous — *unknown*.** A MODIFIED REPLAY is recorded
> (`node checks/ac01-duplicate-rejection.mjs --perturb accept-duplicates`,
> perturbing the code by "stop rejecting duplicate source ids in the
> transformation") but it was **never executed** (execution disabled by
> `--no-execute`: the outcome was not observed), so its outcome was not
> observed. Nothing here shows the check would notice if the claim were false.
> Unknown is not the same as fine, and it is not the same as non-vacuous
> (design §14.3, §14.4)."

And the standing caveat *"That the check catches anything beyond the one
perturbation recorded here"* — which presupposes a perturbation was observed —
is now emitted only when `modified_replay.as_expected` is `true` or `false`,
never when nothing ran. On the committed manifest this sentence is unchanged
(`grep -c "Whether the check is vacuous"` → `0`, correctly, because all ten
commands were executed).

Manifest fields the prose is now derived from: `replay.as_expected`,
`replay.recorded_outcome`, `replay.expect`, `replay.execution.unexecuted_reason`,
`modified_replay.as_expected`, `modified_replay.recorded_outcome`,
`modified_replay.perturbation`, `modified_replay.execution.unexecuted_reason`,
`manifest.replay.runner`.

---

## D-3 — the append-only proof was discarded

### Before

```html
<tr><th><code>previous</code></th><td>[object Object]
  <span class="hint">no prior manifest to diff against</span></td></tr>
```

Both halves wrong: a stringified object, and a hint the manifest contradicts
(`claims_compared: 5`).

### After

```html
<tr><th><code>previous</code> <span class="hint">the baseline this manifest was compared against</span></th>
  <td><a class="path" href="../../plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json">docs/verification/surface-manifest.json</a>
  <span class="hint">default: the committed manifest</span>
  <table class="kv kv-tight">
    <tr><th><code>claims_compared</code></th><td><code>5</code> <span class="hint">claims matched against the baseline by id</span></td></tr>
    <tr><th><code>drifted</code></th><td><code>0</code> <span class="hint">claims whose text changed since the baseline. <code>0</code> is a comparison that ran and found none, not a comparison that was skipped (design §5.4)</span></td></tr>
    <tr><th><code>invalidated</code></th><td><code>0</code> <span class="hint">claims whose evidence artifact changed since the baseline. <code>0</code> is a comparison that ran and found none (design §5.5)</span></td></tr>
    <tr><th><strong><code>markers_mutated</code></strong></th><td><code>0</code> <span class="hint"><strong>the append-only enforcement result.</strong> A marker block may only be appended to. Any marker present in the baseline that is now missing, reordered or rewritten appears here. An empty list is the guarantee holding &mdash; mechanically checked against the baseline, not asserted (design §3.5).</span></td></tr>
    <tr><th><code>content_sha256</code></th><td><span class="null">null</span> <span class="hint">omitted by design: carrying the baseline's hash would make this manifest a function of which baseline it was compared against, and the committed manifest is its own default baseline. The baseline is named in <code>path</code>; hash it there.</span></td></tr>
  </table></td></tr>
```

Manifest fields now rendered: `previous.path` (as a resolving link),
`previous.source`, `previous.claims_compared`, `previous.drifted`,
`previous.invalidated`, `previous.markers_mutated`, `previous.content_sha256`,
`previous.content_sha256_source`. A non-empty list renders its count *and* its
member ids, so a mutation would name itself.

`grep -c markers_mutated index.html` → `1` (was `0`); `[object Object]` → `0`.

---

## D-4 — the confirm command now reproduces the page's own number

### Before

```
rows | 12
confirm hash, rows and bytes yourself | $ sha256sum …/data/source.csv && wc -lc …/data/source.csv
```

`wc -lc` returns `13 453`; the page says `rows 12`.

### After

```
rows | 12   data rows, excluding the header line. A plain `wc -l` over this file returns one more
            than this number; the command below skips the header so that it reproduces exactly the
            figure printed here.

confirm hash, rows and bytes yourself |
  $ sha256sum plugin/scripts/fixtures/slice/data/source.csv
  $ tail -n +2 plugin/scripts/fixtures/slice/data/source.csv | wc -l   # 12 — data rows, header skipped
  $ wc -c plugin/scripts/fixtures/slice/data/source.csv                # 453 bytes
  Run these from the repository root. Each one reproduces exactly the value printed above it — a
  confirmation command that disagrees with the page would be worse than none.
```

Run verbatim:

```
$ sha256sum  …/data/source.csv     → d496eda0abeee9c1f14dab82477fd13d6e03d4d20b8e9426c3aa2657f9a17793  (page: same)
$ tail -n +2 …/data/source.csv | wc -l  → 12   (page: rows 12)
$ wc -c      …/data/source.csv     → 453        (page: bytes 453)
$ tail -n +2 …/data/generated.csv | wc -l → 9   (page: rows 9)
$ wc -c      …/data/generated.csv  → 367        (page: bytes 367)
```

---

## D-5 — Markdown no longer leaks

A two-form converter (`mdInline`) that escapes **first** and then rewrites only
`` `x` `` → `<code>` and `**x**` → `<strong>`. It is not a Markdown parser, so
the XSS guardrail is unaffected (the injected-`<script>` regression test still
passes). Applied to `finding.message`, `claim.ceiling_reason`,
`execution.unexecuted_reason`, `pdataset.transformation_determinism_source` and
the determinism legend's own strings.

```
before: reported **unfalsified** — modified replay failed to fail (design §14.4)
after:  reported <strong>unfalsified</strong> — modified replay failed to fail (design §14.4)
```

Residual Markdown on the whole page: `` `x` `` → **0**, `**x**` → **0**
(previously six messages plus `derived: `manual` transformation is `L1`` and
five copies of ``Re-execute; compare `sha256`.``).

---

## Preserved properties — re-verified on the shipped page

| Property | Result |
|---|---|
| `grep -c 'http' index.html` | **0** |
| `<script` / `<img` / `<link` / `@import` / `url(` / `srcset` | **0 / 0 / 0 / 0 / 0 / 0** |
| inline event handlers (` on…=`) | **0** |
| absolute URLs (`[a-z]+://`) | **0** — generator guardrail still enforced, exit 2 on violation |
| two generations to the same `--out`, byte-identical | **yes** — both `815f96f51903beb0…` |
| generator reads no clock | **structural**: `grep -n "new Date\|Date.now\|toISOString\|process.hrtime" surface-html.mjs` → no matches |
| links resolve | **21 file targets, 0 missing; 16 anchors, 0 unresolved** (20 → 21 targets: `plugin/scripts/replay.mjs`, the runner, is now linked once from the Binding panel) |
| every rendered hash matches the real file | **11 recomputed, 0 misreported** (6 evidence artifacts, 2 PDatasets, 3 binding hashes) |
| execution boundary | intact and unchanged in substance — "This page renders commands. It does not run them." No `<script>`, no spinner, no simulated output, no `PASS` the page produced |
| `establishes / does NOT establish` per evidence record | **6 / 6**, unchanged |
| "A deterministic script can be consistently wrong" | **5** occurrences, identical to before (the sixth record is `L1`-only and has no script; its "does not" side carries "An assertion is not a check") |
| generator exit code on the committed manifest | **0** |
| `node --check plugin/scripts/surface-html.mjs` | **clean** |

Regression suite `plugin/scripts/surface.test.mjs` — all five §K
(`surface-html.mjs`) checks pass:

```
PASS  html: an unresolved link is reported, rendered as a gap marker, and sets exit 1
PASS  html: creating exactly the reported paths clears every unresolved link, exit 0
PASS  html: two runs over an unchanged manifest are byte-identical
PASS  html: the page emits no <script> and no absolute URL
PASS  html: an absolute URL in the manifest is refused, and no page is written
PASS  html: a <script> tag in claim text is escaped, never emitted as markup
```

One unrelated failure in that suite —
*"the committed manifest is current: a regeneration reproduces its own
`content_sha256`"* — is outside this change: `surface.mjs`, `replay.mjs` and
`governance-checks.mjs` all carry uncommitted modifications from other agents
working in parallel, so a regeneration no longer reproduces the committed
manifest's hash. No file in that test's path was touched here.

---

## Not done, deliberately

**D-6** (the two canonical-JSON hashes carry no recompute command) and **D-7**
(an evidence record's determinism level is self-declared and not labelled as
such) are outside this assignment's scope. Both are one-clause additions and
neither is disqualifying; the Verifier filed them as `low` and recommended they
follow. **D-8** (`BUILDER-3-REPORT.md`'s stale numeric evidence) is a report
defect in another builder's report and is not this report's to rewrite — but it
remains true, and this report's numbers supersede it for the shipped page.

## Files

- `plugin/scripts/surface-html.mjs` — the only source change.
- `docs/verification/index.html` — regenerated from the unmodified committed
  manifest.
- `docs/verification/BUILDER-7-REPORT.md` — this file.

No commit, no push, no `gh`.
