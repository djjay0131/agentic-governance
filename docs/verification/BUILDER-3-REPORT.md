# Builder 3 — Human Verification interface

Role: Human UI Builder, G-3 Human Verification vertical slice.
Branch: `feat/g3-verification-slice`. Date: 2026-09-23.

This report is the builder's own account. **It is not verification.** A Human UI
Verifier checks this work; nothing below should be read as a pass.

---

## What was built

| Artifact | Purpose |
|---|---|
| `plugin/scripts/surface-html.mjs` | The renderer. Reads a `surface-manifest/v1` document, emits one self-contained static HTML page. Plain Node, zero dependencies. |
| `docs/verification/index.html` | The generated page (120,843 bytes), the verification projection of the slice fixture's manifest. |

Nothing else was created or modified. `surface.mjs`, `governance-checks*.mjs`,
`plugin/scripts/fixtures/**` and `llm/**` were read only.

```
$ git status --porcelain
?? docs/verification/
?? plugin/scripts/fixtures/slice/VERIFIER-1-REPORT.md    # another agent's file, not mine
?? plugin/scripts/surface-html.mjs
```

## The governing constraint

`Renderer: none` (design §7.3; delta `## Published Surface`). The page is plain
HTML with inline CSS, **no script of any kind**, system fonts only, and no
network access at build time or at view time. Quarto, R, jupyter and pandoc are
neither used nor required.

The execution boundary is stated on the page, in the first panel, before any
content:

> **This page renders commands. It does not run them.**
> … Every `expect` and `outcome` shown below was *read out of the manifest*,
> where it was recorded by whoever last ran the command. **No result on this
> page was obtained by this page.**
> … There is no spinner, no simulated output and no `PASS` this page produced.

Two guardrails in the generator enforce this mechanically rather than trusting
the template author. Both run before the file is written, and both `exit 2`:

1. **Absolute-URL refusal** — `/\b[a-z][a-z0-9+.-]*:\/\//i` over the rendered
   page. Under `Pages mechanism: none`, `link_resolution` is `local` and a
   fabricated URL would violate the guardrail the design inherits (§4.2). This
   mirrors `surface.mjs`'s own refusal, applied to the rendered page.
2. **Script refusal** — `/<script|\son[a-z]+\s*=/i`. The absence of execution is
   a property of the artifact, not a promise in its prose.

## What the page presents

**Per claim** (5 claims, each a card, colour-keyed by state on the left edge):
ID, scope, kind; the requirement **verbatim** in a blockquote; `text_sha256`
with what it binds; authority; source `path:line` as a working link; the
checkbox *and* the state, with the note that they are different axes; the
current state; the evidence ceiling and its reason; the `unfalsified` flag.

**The full marker chain**, rendered as an ordered timeline with the source line
number, the raw marker text, and every parsed field (`state`, `pr`, `date`,
`reason`, `well_formed`). History is not collapsed away — the last entry is
tagged `CURRENT — last line of the block`, the rest `history`. The `drift`
field is printed even though it is `null`.

`P1-AC-03` is `NOT VERIFIED` because its text drifted. The page renders that as
**an event, not an absence**, in a dedicated callout: the appended reset line,
the reason, the `HUMAN VERIFIED` line still visible above it, and why §5.4 means
the earlier verification stopped binding when the sentence changed —
*"Re-verification starts from the current sentence. It is not a resumption of
the old one."*

**Evidence — direct access.** Per record: `kind`; `determinism` with its meaning
spelled out in full (`L3` deterministic / `L2` executable non-deterministic /
`L1` attested, with the cap stated: *cannot reach `HUMAN VERIFIED`*); the
`locator` as a working relative link to the actual file plus a separate
open/download affordance; `sha256`; a `sha256sum` command so the reader can
confirm the hash themselves; `produced_by` with the actor class badged
(`agent` / `human`); `produced_at`; `declared_in` and its hash. The page
deliberately does **not** paste a code excerpt — an excerpt is a summary, and
the reader is told to open the file instead.

**Executable verification.** REPLAY and MODIFIED REPLAY each get a command block
carrying: the exact command, the working directory (with a link to it), the
perturbation, the expected result, the outcome recorded in the manifest —
labelled *"recorded when it was last run by its producer — not by this page"* —
and `as_expected`, coloured red when false.

**What it establishes / what it does NOT establish** sits under every evidence
record as two adjacent columns. Every sentence is derived from manifest fields
(determinism, expectations, recorded outcomes, actor class). The "does not"
column always includes:

- *That the claim is true. A deterministic script can be consistently wrong.
  REPLAY proves the script reproduces; it does not prove the script asserts the
  right thing, and a green result is not proof of correctness.*
- That the check catches anything beyond the one recorded perturbation.
- That the claim's wording is the requirement anyone cares about.
- Independence, when `produced_by.class` is `agent`.

**PDatasets** (2): id, title, rows, bytes, `sha256`, `derived_from` (rendered as
the stated `none` for the root, per §4.1), `transformation` with its determinism
badge and *why* that level was derived, `produced_by`, `produced_at`,
`provenance_chain` as linked chips, `license`, `link_resolution`, the schema
table — and **VIEW and DOWNLOAD buttons pointing at the real file**, plus a
`sha256sum … && wc -lc` command. Each card closes with: *"The row count and the
schema above are a summary. The file beside them is the data. If the two ever
disagree, the file is right — open it."*

**Findings** are rendered by severity with the raw message and then an
explanation:

- `P1-AC-04` / `unfalsified` (warn) — spelled out as *the modified replay failed
  to fail*, that the check **may be vacuous**, and that a passing REPLAY on this
  claim therefore tells you the script executes and nothing more. The claim card
  additionally carries a red `UNFALSIFIED` flag and a `CEILING: AGENT VERIFIED`
  flag.
- `P1-AC-02` / `l1-only` (info) — spelled out as capped, *why*: testimony, no
  command, no output, no possible perturbation; an agent's assertion about its
  own work is `L1` by definition; the cap is lifted by new executable evidence,
  *"not a more confident sentence."*

**The un-ID'd claim line** has its own section, counted in the masthead, counted
in the coverage table (linked), and rendered in full with its text, location,
checkbox, state and the generator's note.

**Human decision affordance** appears twice: once per claim, once globally.
Per claim it names the exact file, the exact line to append **after**, a table of
all six states with the exact marker line for each (including the `NOT VERIFIED`
reset form), who may assert each, and — for claims whose ceiling permits it —
the two commands to run first, with the reminder that the second must *fail*.
Where the ceiling blocks `HUMAN VERIFIED` (`P1-AC-02`, `P1-AC-04`) the page says
so and why. Both blocks open with:

> **This page does not write your decision, and no agent may write one for you.**
> An agent writing a human verification state is the precise thing this
> capability exists to forbid (design §5.3). You edit the file yourself, in a
> pull request, with your own hands.

**Data-plane attribution** (`CLAUDE.md` §the two-plane rule) is a panel titled
*"What this page is, and what it is not"*, naming and linking every
control-plane document projected: `llm/claims.md`, `llm/pdatasets.md`, the
governance delta, the capability design, the slice reconciliation, the manifest
and both generators — and stating that if the page and those documents disagree,
**those documents are right and this page is stale.**

---

## Evidence

### 1. Generation command and verbatim output

```
$ node plugin/scripts/surface-html.mjs
surface-html: docs/verification/index.html  120843 bytes
  manifest plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json  content_sha256 f00eeabfc0a1239fde7eec9d63ae5a08aa011087c01a6cf78798e3532693a0ca
  claims 5  evidence 5  pdatasets 2  un-ID'd 1  findings 2
  links: 73 emitted, 18 distinct targets, 0 unresolved
  absolute URLs: 0 (guardrail enforced)   script tags: 0 (guardrail enforced)
    ok      plugin/scripts/fixtures/slice/llm/claims.md
    ok      plugin/scripts/fixtures/slice/llm/pdatasets.md
    ok      plugin/scripts/fixtures/slice/llm/governance/governance-delta.md
    ok      llm/specs/2026-09-18-human-verification-capability-design.md
    ok      llm/specs/2026-09-23-human-verification-slice-reconciliation.md
    ok      plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json
    ok      plugin/scripts/surface.mjs
    ok      plugin/scripts/surface-html.mjs
    ok      plugin/scripts/fixtures/slice/checks/ac01-duplicate-rejection.mjs
    ok      plugin/scripts/fixtures/slice
    ok      plugin/scripts/fixtures/slice/evidence/attestations.md
    ok      plugin/scripts/fixtures/slice/checks/ac03-sort-order.mjs
    ok      plugin/scripts/fixtures/slice/checks/ac04-transform-runs.mjs
    ok      plugin/scripts/fixtures/slice/checks/cl01-record-count.mjs
    ok      plugin/scripts/fixtures/slice/data/source.csv
    ok      plugin/scripts/fixtures/slice/data/generated.csv
    ok      plugin/scripts/fixtures/slice/checks
    ok      plugin/scripts/fixtures/slice/evidence
### EXIT=0
```

### 2. No absolute URLs, no external requests

```
$ grep -c 'http' docs/verification/*.html
0
grep exit=1 (1 = zero matches)

$ grep -c '://' docs/verification/index.html
0
```

**There are zero `http` hits to explain.** The string does not occur anywhere in
the page — not in a link, not in an `xmlns`, not in a comment.

Every other vector by which a static page can reach the network, counted:

```
<script      0
<iframe      0
<img         0
<link        0
@import      0
url(         0
srcset       0
integrity=   0
```

No `<link rel>`, so no webfont and no external stylesheet; all CSS is in one
inline `<style>`. No `url(` in the CSS, so no background-image fetch. No script,
so nothing can issue a request after load. The page is fully functional from
`file://` with the network off.

### 3. Every relative link resolves to a real file on disk

Checked independently of the generator: every `href` extracted from the emitted
HTML, resolved from `docs/verification/` as a browser would.

34 distinct hrefs — 16 in-page anchors, 18 file links.

```
anchor-ok  #binding
anchor-ok  #boundary
anchor-ok  #claim-P1-AC-01
anchor-ok  #claim-P1-AC-02
anchor-ok  #claim-P1-AC-03
anchor-ok  #claim-P1-AC-04
anchor-ok  #claim-S1-CL-01
anchor-ok  #claims
anchor-ok  #findings
anchor-ok  #pdatasets
anchor-ok  #pds-S1-DS-01
anchor-ok  #pds-S1-DS-02
anchor-ok  #provenance
anchor-ok  #states
anchor-ok  #summary
anchor-ok  #unidentified
file-ok    ../../llm/specs/2026-09-18-human-verification-capability-design.md
file-ok    ../../llm/specs/2026-09-23-human-verification-slice-reconciliation.md
file-ok    ../../plugin/scripts/fixtures/slice
file-ok    ../../plugin/scripts/fixtures/slice/checks
file-ok    ../../plugin/scripts/fixtures/slice/checks/ac01-duplicate-rejection.mjs
file-ok    ../../plugin/scripts/fixtures/slice/checks/ac03-sort-order.mjs
file-ok    ../../plugin/scripts/fixtures/slice/checks/ac04-transform-runs.mjs
file-ok    ../../plugin/scripts/fixtures/slice/checks/cl01-record-count.mjs
file-ok    ../../plugin/scripts/fixtures/slice/data/generated.csv
file-ok    ../../plugin/scripts/fixtures/slice/data/source.csv
file-ok    ../../plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json
file-ok    ../../plugin/scripts/fixtures/slice/evidence
file-ok    ../../plugin/scripts/fixtures/slice/evidence/attestations.md
file-ok    ../../plugin/scripts/fixtures/slice/llm/claims.md
file-ok    ../../plugin/scripts/fixtures/slice/llm/governance/governance-delta.md
file-ok    ../../plugin/scripts/fixtures/slice/llm/pdatasets.md
file-ok    ../../plugin/scripts/surface-html.mjs
file-ok    ../../plugin/scripts/surface.mjs

unresolved: 0
```

**Links that do not resolve: none.** Had any been absent, the generator would
have rendered it as a `MISSING ON DISK` gap marker and exited 1 rather than
emitting a dead link (design §4.2 — never silent, never invented). That path is
exercised by the same code that produced the `ok` lines above, but it was not
triggered by this input, so it remains untested in practice.

### 4. Determinism — byte-identical across runs

```
$ node plugin/scripts/surface-html.mjs --quiet     # run A
$ node plugin/scripts/surface-html.mjs --quiet     # run B
$ diff run-a.html run-b.html
diff: NO DIFFERENCES — byte-identical

3e46584948504662bb4c14096df2f87e7018036cb88e028870c55e13fbe923f0  run-a.html
3e46584948504662bb4c14096df2f87e7018036cb88e028870c55e13fbe923f0  run-b.html
```

**No field differs, including timestamps.** The generator reads no clock: the
date shown on the page is the manifest's own `generated_at`
(`2026-09-23T00:00:00.000Z`), not this run's wall time. The generator is
therefore `L3` by design §14.1 — and the claim is checked here, not asserted.

Page `sha256`: `3e46584948504662bb4c14096df2f87e7018036cb88e028870c55e13fbe923f0`

### 5. `node --check`

```
$ node --check plugin/scripts/surface-html.mjs
clean (no output, exit 0)
```

Node v24.18.0.

### 6. Rendering, checked in a browser

The page was rendered headless at 1200px in both colour schemes and inspected:
light and dark both legible, states distinguishable at a glance by colour plus
label plus left-edge rule, monospace throughout for hashes, paths and commands,
no clipped or overflowing content, long commands wrapping with a hanging indent
so a wrapped line cannot be misread as a second command. Block-element tag
balance verified programmatically (all 14 element types balanced). The
screenshots were scratch and have been deleted; they are reproducible from the
committed page.

---

## Judgement calls, stated so they can be overruled

1. **No JavaScript at all**, not even a copy-to-clipboard button. A copy button
   would be harmless and useful, but "there is no script on this page" is a
   claim a reader can check in one `grep`, and it is worth more than the
   convenience.
2. **Nothing collapsed by default.** The two `<details>` blocks per claim are
   emitted `open`. They keep the collapse control but hide nothing on load,
   because a collapsed section is presentation hiding evidence.
3. **No code excerpts.** Where the design says show "the code (or a link to
   it)", the page links and refuses to excerpt, on the grounds that an excerpt
   is a summary of the very thing being verified. The file's hash and the
   command to recompute it sit next to the link.
4. **"What this establishes / does not establish" is generated prose**, derived
   only from manifest fields. It makes no judgement about whether any claim is
   true. A verifier should check that it says nothing the manifest does not
   support.
5. **`sha256sum` / `wc -lc` commands are generated affordances**, not manifest
   fields. They are labelled as ways for the reader to confirm a hash
   themselves, never as recorded evidence.
6. **The output path is `docs/verification/index.html` in the repository root**,
   not inside the fixture. The fixture's own `Output dir: docs/verification`
   resolves under the fixture root, which this builder was instructed not to
   touch; the manifest path and surface root are both flags on the generator, so
   an adopter pointing it at their own tree changes nothing but arguments.

## Not built

The interactive verification console stays deferred (design §7.3), as does any
in-page execution. `--surface` mode in `governance-checks.mjs`, the sixth diff
shape, the Verifier agent charter and the `verify-claim` skill are other
builders' scope.
