# Human Verification Capability — Activity Plan

Status: Draft
Date: 2026-09-18
Owner: AI Chief Architect
Governance: agentic-governance v0.9.1
Amended: 2026-09-19 — A2 gains append-only enforcement, A5 gains artifact
invalidation, and A1/A6/A8 move Verifier to the human owner (design §3.5, §5.5)
Architecture: `llm/specs/2026-09-18-human-verification-capability-design.md`

> Deliverables 10–13 of the design brief: activity-by-activity decomposition,
> Builder/Verifier assignments, acceptance criteria per activity, and two
> end-to-end fixture designs.
>
> **This plan is for review. No activity below has been started.**

---

## 10. Activity decomposition

Twelve activities. Each is **one issue → one branch → one draft PR**, the
lifecycle canon already prescribes. Every activity touches `plugin/**` or a
policy basename, both of which are `HARD_DENY`, so **no activity in this plan is
L0-eligible**. None of them may take the fast track.

The plan's own acceptance criteria carry claim IDs in the grammar this
capability defines (`A2-AC-01`, …). That is deliberate: if the notation is not
usable for this work, it is not usable at all.

### Sequencing

```
        A1 ──────┬──────► A2
   (claim ID &   │     (6th shape
    marker)      │      + table)
                 │
                 └──────► A9 ──────► A12
                        (integr.)   (doc +
        A3 ──────┬──────► A4 ─┐      BACKLOG)
   (surface       │  (verif.   │
    engine)       │  projection)│
                  ├──────► A5 ─┤
                  │   (drift)   │
                  └──────► A7 ─┤
                     (PDataset) │
                                ├──► A10 (SE fixture)
        A6 ─────────────────────┤
   (determinism, replay modes)  ├──► A11 (research fixture)
                                │
        A8 ──────────────────────┘
   (Verifier charter)
```

**A1 and A3 are the two roots and can run in parallel.** A1 is pure policy; A3
is pure engine. Nothing else may start until both land, because everything
downstream depends either on the claim grammar or on the manifest shape.

### The activities

| ID | Activity | Level | Depends on | Deliverable |
|---|---|---|---|---|
| **A1** | Claim identity and marker grammar | L2 | — | ADR-0003; `llm/governance/verification.md` §claims; ID grammar; marker grammar; state table |
| **A2** | Sixth L0 diff shape `verification-marker` | L1 | A1 | `governance-checks.mjs` `SHAPES` + branch; `l0-fast-track.md` shape-table row; tests | **Amended 2026-09-19: the shape must also enforce append-only — a diff that deletes or edits an existing marker line is malformed (design §3.5). Without this, append-only is an aspiration, not a rule.**
| **A3** | Surface engine generalisation | L2 | — | ADR-0002; `plugin/scripts/surface.mjs` skeleton; `surface-manifest.json` schema; Design Surface spec amended |
| **A4** | Verification projection | L1 | A1, A3 | Claim discovery, state parsing, evidence binding by cited ID, projected view |
| **A5** | `--surface` drift mode | L1 | A3, A4 | Drift audit incl. the claim-text-hash reset rule (§5.4) **and artifact invalidation across all bound identifiers — commit SHA, artifact/dataset hashes, model id, execution id (§5.5, amended 2026-09-19)** |
| **A6** | Determinism model and replay executor | L2 | — | Level classifier; REPLAY / MODIFIED REPLAY / INDEPENDENT VERIFICATION; the unfalsified report |
| **A7** | PDataset record and link resolution | L1 | A3 | Record schema; derived links; `published`/`local`/`missing` resolution; gap markers |
| **A8** | Verifier role and Builder/Verifier separation | L2 | — | `plugin/agents/verifier.md`; tool-separation frontmatter; `verify-claim` skill |
| **A9** | Integration sweep | L2 | A1, A3 | All eleven integration points from design §9 |
| **A10** | Software-engineering fixture | L1 | A4, A5, A6 | End-to-end fixture (§13.1) |
| **A11** | Research fixture | L1 | A6, A7 | End-to-end fixture (§13.2) |
| **A12** | Canonical doc and backlog status | L1 | all | `verification.md` complete; BACKLOG G-3 → IMPLEMENTED |

### Why A9 is one activity and not eleven

The v0.5.0 precedent: adding a layout slot touched six places and v0.5.1 had to
fix two that were missed. Splitting the integration sweep across eleven PRs
reproduces exactly that failure mode — each PR looks complete in isolation.
A9 ships as one reviewable diff with the design §9 table as its checklist, and
its acceptance criterion is that **every row is ticked or explicitly deferred
with a reason**.

The one exception is already handled: integration points 3 and 4 (the shape in
the script, and the shape in the table) ship together in **A2**, because canon
explicitly requires it — *"Add shapes here and in the script together."*

---

## 11. Builder / Verifier assignments

### The rule

> **No builder may mark its own requirement complete.**

Every activity has a Builder and a **distinct** Verifier, running in a distinct
session. Independence is **temporal and artifactual** — canon's existing L0
condition-10 definition, reused verbatim: *"a distinct recorded artifact from a
distinct session, not a distinct identity."* It does not require two humans or
two accounts.

### Mechanical separation

| Actor | `tools:` | Write access to claim files | Max state it may assert |
|---|---|---|---|
| **Builder** | Read, Glob, Grep, Write, Edit, Bash | **denied** via `disallowedTools` | none |
| **Verifier** | Read, Glob, Grep, Bash, Edit *(claim files only)* | allowed | `AGENT VERIFIED`, `VERIFICATION FAILED`, `NEEDS REWORK` |
| **Human owner** | — | allowed | `HUMAN REVIEWED`, `HUMAN VERIFIED`, and any transition out of `HUMAN VERIFIED` |

This uses the mechanism canon **already** uses for role separation —
`tools:`/`disallowedTools:` frontmatter on agent charters. It is not a new
enforcement system; it is an application of the existing one.

### Assignments

| Activity | Builder | Verifier | Why this pairing |
|---|---|---|---|
| A1 | chief-architect | **human owner** (was chief-reviewer) | Policy change; the reviewer is canon's standing skeptic for decision integrity |
| A2 | implementation specialist | chief-reviewer | The shape must be adversarially probed — see A2's acceptance criteria |
| A3 | implementation specialist | chief-architect | Amends an approved spec; architecture ownership verifies |
| A4 | implementation specialist | **a second implementation specialist** | Pure code; independence is what matters, not seniority |
| A5 | implementation specialist | second implementation specialist | as A4 |
| A6 | chief-architect | **human owner** (was chief-reviewer) | The determinism model is the conceptual core |
| A7 | implementation specialist | second implementation specialist | as A4 |
| A8 | chief-architect | **human owner** (was chief-reviewer) | Defines the Verifier role itself — see note below |
| A9 | chief-architect | chief-reviewer | Eleven-surface sweep; completeness is the risk |
| A10 | second implementation specialist | implementation specialist (the A4 builder) | Deliberate inversion: the A4 builder verifies the fixture that tests A4 — *and cannot mark it* |
| A11 | second implementation specialist | implementation specialist | as A10 |
| A12 | repository-steward | chief-architect | Status bookkeeping is the steward's charter |

**A8 bootstrap note.** A8 defines the Verifier role, so it cannot be verified by
a Verifier that does not yet exist. Its verification is performed by the human
owner directly. This is stated rather than hidden; a bootstrap that pretends to
be self-verifying is precisely the failure this capability exists to prevent.

### Amendment 2026-09-19 — the human holds Verifier on A1, A6 and A8

The assignments above originally named `chief-reviewer` as Verifier throughout.
For three activities that is the recursion this capability exists to break:

- **A1 — claim identity and marker grammar.** Every other activity keys off it.
  An error here is invisible downstream and expensive to unwind.
- **A6 — determinism model and replay executor.** It decides what counts as
  reproduced, which is the conceptual core of the whole capability.
- **A8 — the Verifier role itself.** An agent specifying the role that checks
  agents, and then verifying that specification, is precisely the loop the brief
  opens by rejecting: *"an agent must never automatically promote its own work."*

`chief-reviewer` still reviews all three — the change is to who **marks** them.
The remaining nine keep their AI Verifiers, including A10 and A11's deliberate
inversion, where the A4 builder verifies the fixture testing A4 and cannot mark
it.

This is a one-line-per-activity change with a large effect on whether the
capability's own claims are trustworthy, and it is the amendment most likely to
slow delivery. That is the trade.

### Reporting

The Verifier's report is the **evidence record**, not a summary. It states, per
acceptance criterion: the claim ID, the mode used (REPLAY / MODIFIED REPLAY /
INDEPENDENT), the command run, the verbatim output, and met/not-met. Prose
assertions without an accompanying command are `L1` and are labelled as such.

---

## 12. Acceptance criteria per activity

Falsifiable, evidence-demanding, each citing its authority — matching the style
the website repo's roadmap already achieves.

### A1 — Claim identity and marker grammar

- `A1-AC-01` ADR-0003 is `Proposed` and records: the ID grammar, the marker
  grammar, the six states, the legal-transition table, and the claim-text-hash
  reset rule (design §5.4).
- `A1-AC-02` The marker grammar is isomorphic to the ADR `Status:` line — no
  free prose in the parenthetical — and the document says why.
- `A1-AC-03` An absent marker means `NOT VERIFIED`, stated explicitly, so
  adoption costs nothing and omission cannot forge a state.
- `A1-AC-04` `<KIND>` vocabulary is declared delta-side, not enumerated in
  canon. **Modified replay:** a grep for `hypothesis`, `study`, `p-value` or
  any research term in the canon changes returns **zero** hits.
- `A1-AC-05` The doc states that `AGENT VERIFIED` is not a prerequisite for
  `HUMAN VERIFIED`, and the transition table permits `NOT VERIFIED →
  HUMAN VERIFIED`.

### A2 — Sixth diff shape

- `A2-AC-01` `verification-marker` is in `SHAPES` and the branch is implemented.
- `A2-AC-02` A diff that flips **only** a marker passes `--l0`.
- `A2-AC-03` **Modified replay:** a diff that changes a claim's **text** while
  preserving its marker **fails** `--l0`. This is the criterion that makes the
  shape non-vacuous; without it the shape would permit silent claim rewriting.
- `A2-AC-04` **Modified replay:** a diff adding a *malformed* marker (missing
  PR number, free prose in the parenthetical, an unlisted state word) **fails**.
- `A2-AC-05` The `l0-fast-track.md` shape table gains its row **in the same
  PR** — canon's rule, not a preference.
- `A2-AC-06` All five pre-existing shapes still pass their tests, unchanged.

### A3 — Surface engine generalisation

- `A3-AC-01` ADR-0002 is `Proposed`, recording the extend-not-duplicate decision
  and the rename rationale (nothing depends on the unbuilt names).
- `A3-AC-02` The Design Surface spec is amended, not superseded; its projection
  rule, "cite or omit", gap-marker and human-gate guarantees survive verbatim.
- `A3-AC-03` `surface.mjs` has **zero dependencies** — matching
  `governance-checks.mjs`. **Modified replay:** `git archive` to a clean
  directory with no `node_modules` anywhere above it, then run. It must work.
- `A3-AC-04` `surface-manifest.json` carries both projections' hashes and one
  `generated_at` / `governance_version`.
- `A3-AC-05` A repo with no `## Published Surface` block is unaffected:
  generator exits 0, emits nothing, and the checker reports `SKIP`.

### A4 — Verification projection

- `A4-AC-01` Claims are discovered from the delta-declared path; each yields id,
  text, `text_sha256`, authority, state.
- `A4-AC-02` Evidence binds by **cited claim ID** in the artifact (docstring,
  comment), not by a mapping file.
- `A4-AC-03` The projection answers all three questions that are unanswerable
  today: claims with no evidence; claims with `L1`-only evidence; claims
  `AGENT VERIFIED` but not `HUMAN VERIFIED`.
- `A4-AC-04` Un-ID'd criteria are **counted and reported**, never silently
  skipped — the `SKIP — NOT VERIFIED` principle already in the checker.
- `A4-AC-05` **Modified replay:** delete the only test citing a claim; that
  claim must move from "has evidence" to "no evidence" in the next run.

### A5 — Drift mode

- `A5-AC-01` `--surface` reports findings and **never auto-fixes** (Design
  Surface §4.3, inherited).
- `A5-AC-02` **The reset rule:** editing a claim's text changes its hash and
  resets the state to `NOT VERIFIED`. Demonstrated on a fixture, not asserted.
- `A5-AC-03` The website repo's real Phase 3 amendment (`*(Amended 2026-09-17…)*`)
  is used as the regression case: it must reset.
- `A5-AC-04` Design Surface narrative drift and verification drift are reported
  by **one** mode, with one definition of stale.
- `A5-AC-05` A missing declared source yields a visible gap marker and a
  non-zero finding — never silence, never fabrication.

### A6 — Determinism model and replay

- `A6-AC-01` Every evidence record must declare `L1`/`L2`/`L3`. An **undeclared
  level is a gap marker**, not a default — stated and enforced.
- `A6-AC-02` `L3` verification recomputes and compares a hash.
- `A6-AC-03` `L2` verification re-executes and compares assertions, not bytes.
- `A6-AC-04` A claim whose only evidence is `L1` **cannot** reach
  `HUMAN VERIFIED`. **Modified replay:** attempt it; it must be refused.
- `A6-AC-05` A claim with a REPLAY but no MODIFIED REPLAY is reported
  **unfalsified**.
- `A6-AC-06` **The portfolio regression set.** The three vacuous guards found in
  the preceding effort — the leak check with no private items, the private-links
  check over one page, and the unconfigured logging layer whose tests passed
  only because `caplog` attached the missing handler — are encoded as fixtures.
  **MODIFIED REPLAY must flag all three.** This is the activity's single most
  important criterion: it is the only one backed by defects that actually
  happened.

### A7 — PDataset

- `A7-AC-01` The record schema matches design §4.1.
- `A7-AC-02` `view_url` / `download_url` are **derived**, never hand-written.
- `A7-AC-03` `Pages mechanism: none` yields `link_resolution: local` and
  repo-relative paths. **Modified replay:** no absolute URL appears in the
  output. A fabricated URL is the failure this criterion exists to catch.
- `A7-AC-04` A declared-but-absent path yields `link_resolution: missing` plus a
  visible gap marker and a non-zero finding.
- `A7-AC-05` The doc states plainly that zero data files exist across the six
  adopting repos and that PDataset is fixture-bound until a research adopter
  exists.

### A8 — Verifier role

- `A8-AC-01` `verifier.md` exists with `tools:`/`disallowedTools:` enforcing the
  §11 table.
- `A8-AC-02` **Modified replay:** a Builder charter attempting to write a claim
  file is refused by the tool restriction, not by instruction text.
- `A8-AC-03` The Verifier may assert at most `AGENT VERIFIED`. Attempting
  `HUMAN VERIFIED` is refused.
- `A8-AC-04` The charter states the independence definition verbatim from
  `l0-fast-track.md` condition 10, and that it is temporal and artifactual.
- `A8-AC-05` The bootstrap exception is recorded in the PR body: A8 is verified
  by the human owner, because the Verifier role does not yet exist.

### A9 — Integration sweep

- `A9-AC-01` **Every one of the eleven rows** in design §9 is either implemented
  or explicitly deferred with a recorded reason. A silently missed row is the
  v0.5.1 failure repeating.
- `A9-AC-02` The `## Published Surface` delta block defaults to `DISABLED` for
  both projections.
- `A9-AC-03` **Modified replay:** run the full check suite against a repo with
  no block. Zero behaviour change, zero new findings.
- `A9-AC-04` `definition-of-done.md` states that a criterion is done when
  `HUMAN VERIFIED`, not when ticked.
- `A9-AC-05` The `establish` skill offers the block at adoption and **never
  enables it** — consistent with its standing rule about steward activation.

### A10 / A11 — Fixtures

Criteria are the fixture assertions in §13 below.

### A12 — Canonical doc and status

- `A12-AC-01` `llm/governance/verification.md` is complete and is the single
  canonical statement; the two specs are design history, not policy.
- `A12-AC-02` BACKLOG G-3 moves to `IMPLEMENTED` — **not** `VERIFIED`, since by
  canon's own key `VERIFIED` means all gates pass, which requires the capability
  to have been used on real work.
- `A12-AC-03` ADR-0002 and ADR-0003 move to `Accepted` via `status-line-only`
  diffs citing their PRs.

---

## 13. End-to-end fixture designs

> **Amended 2026-09-23 (slice reconciliation A-3).** The 2026-09-23 vertical-slice
> brief asks for **one** fixture exercising both the software-engineering and the
> research/data concepts, "without creating an artificially large system". Both
> designs below stand unchanged for the full implementation; the slice builds a
> single merged fixture at `plugin/scripts/fixtures/slice/` that takes:
>
> - from **13.1** — claim identity, the marker block, the `L1` cap, claim-text
>   drift, and the vacuous-check detector (`P1-AC-04`, the fixture's reason to exist);
> - from **13.2** — a real source dataset, a deterministic transformation, a
>   generated dataset, PDataset provenance and hashes, and the perturbation that
>   proves the claim depends on its data (`S1-CL-01`).
>
> Merging is a scope decision for the slice, not a design change. Two fixtures
> remain correct for the full capability; one is enough to prove the architecture,
> and the brief's own example claim — *every valid source record produces exactly
> one normalized output record, and duplicate source IDs are rejected* — is
> already the shape of 13.2's transformation step.

Both fixtures are directories under `plugin/scripts/fixtures/`, exercised by
`surface.test.mjs`. Both run with zero dependencies and no network.

### 13.1 Fixture 1 — Software engineering

A minimal adopter: a delta declaring a roadmap and `## Published Surface`, a
roadmap with four claims, a test file, and a deliberately vacuous test.

```
fixtures/se/
  llm/governance/governance-delta.md      Published Surface: Verification ENABLED,
                                          Claim kinds: AC, Pages mechanism: none
  llm/master-roadmap.md                   4 claims
  tests/test_cache.py                     cites P1-AC-01
  tests/test_vacuous.py                   cites P1-AC-04, asserts nothing real
```

The four claims and what each proves:

| Claim | Evidence | Expected outcome | Proves |
|---|---|---|---|
| `P1-AC-01` | `L3` test, cited by ID, with a recorded MODIFIED REPLAY | reaches `HUMAN VERIFIED` | The happy path works end to end |
| `P1-AC-02` | `L1` prose assertion only | **caps at `AGENT VERIFIED`**; attempting `HUMAN VERIFIED` is refused | An agent's say-so is never sufficient — the brief's core principle |
| `P1-AC-03` | `L3` test, verified, **then the claim text is edited** | **resets to `NOT VERIFIED`** | Verification binds to exact wording (design §5.4) |
| `P1-AC-04` | `L3` test that passes but asserts nothing meaningful | REPLAY passes; **MODIFIED REPLAY fails to fail** → reported **unfalsified** | The vacuous-guard detector works |

Plus two structural assertions:

- `P1-AC-05` exists in the roadmap **without** an ID → counted and reported as
  un-ID'd, never silently dropped.
- Running the generator twice with no input change produces a byte-identical
  manifest apart from `generated_at` → the generator is itself `L3`.

**`P1-AC-04` is the fixture's reason to exist.** A verification tool that cannot
detect a test which passes without testing anything would have signed off on all
three real vacuous guards found in this portfolio last week.

### 13.2 Fixture 2 — Research

A minimal study with a two-step pipeline, exercising PDataset and the research
DAG with no Quarto, no R, no network.

```
fixtures/research/
  llm/governance/governance-delta.md   Claim kinds: CL, Renderer: none,
                                       Pages mechanism: none
  study/protocol.md                    declares inputs, steps, outputs
  study/steps/01-extract.mjs           raw.csv  -> extracted.csv
  study/steps/02-summarise.mjs         extracted.csv -> summary.json
  study/data/raw.csv                   12 rows, committed, tiny
  study/claims.md                      2 claims
```

| Assertion | Expected | Proves |
|---|---|---|
| REPLAY of the DAG | every output hash matches the manifest | The pipeline is reproducible |
| `S1-DS-01` (`extracted.csv`) | recorded with `sha256`, `bytes`, `rows`, `produced_by: step-01` | PDataset binds to a real artifact |
| Link resolution under `Pages mechanism: none` | `link_resolution: local`; **no absolute URL anywhere in the output** | Never fabricate a URL |
| `study/data/missing.csv` declared but absent | `link_resolution: missing` + visible gap marker + non-zero finding | Gaps are loud |
| `S1-CL-01` — "mean of column X is 4.5" | `L3`, REPLAY reproduces; MODIFIED REPLAY perturbs `raw.csv` and the value **must change** | The claim genuinely depends on its data |
| `S1-CL-02` — "the effect is robust" | `L1` attested, no command | **caps at `AGENT VERIFIED`**; reported as `L1`-only | Unfalsifiable prose cannot be human-verified |
| MODIFIED REPLAY on a step that ignores its input | claim reported **unfalsified** | The research-side vacuity detector works |
| Whole fixture | runs with node only — no Quarto, R, jupyter, pandoc | The capability is genuinely zero-dependency |

**The `S1-CL-01` perturbation is the research analogue of `P1-AC-04`.** If
changing the data does not change the claim's evidence, the analysis does not
depend on the data it cites — which is the single most common way a
reproducible-looking research pipeline is actually broken.

---

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | The first honest run produces an uncomfortable number of `L1`-only claims and the capability gets switched off | Default DISABLED; adoption incremental; the number is the point and should be framed as a baseline, not a failure |
| R2 | Claim IDs are added and then not maintained | The un-ID'd count is reported every run; drift is visible rather than assumed |
| R3 | A9's eleven surfaces are partially completed | A9-AC-01 makes completeness the criterion; the design §9 table is the checklist |
| R4 | The sixth diff shape widens the L0 lane in a way nobody intended | A2-AC-03 and A2-AC-04 are both modified replays specifically probing for over-permission |
| R5 | Building for a research adopter that does not exist | A7-AC-05 and design §15.4 state the fixture-bound status explicitly rather than implying readiness |
| R6 | Scope grows into an interactive console | Explicitly deferred, design §7.3 |

## Open questions

Carried from the architecture document §17, unchanged: whether canon dogfoods
the capability; whether the website repo retrofits IDs to its ~145 existing
checkboxes; whether `VERIFICATION FAILED` should block a merge; and whether
canon's `docs/` gains a Pages mechanism.

## Stop point

Per the brief: **this plan and the architecture document are the deliverable.**
No activity above has been started, and none will be until the architecture and
this decomposition have been reviewed.
