# Human Verification Capability — Design

Status: Draft
Date: 2026-09-18
Amended: 2026-09-19 — §3.5, §5.5, §4.1 provenance fields, open questions 5–6
Owner: AI Chief Architect
Governance: agentic-governance v0.9.1
Supersedes: nothing
Amends: `llm/specs/2026-07-21-design-surface-capability-design.md` (see §2.2)

> **Scope note.** This document is deliverables 1–9, 14 and 15 of the design
> brief. The activity decomposition, Builder/Verifier assignments, acceptance
> criteria and fixture designs (deliverables 10–13) are in
> `llm/specs/2026-09-18-human-verification-activity-plan.md`.
>
> **No implementation has begun.** Nothing in `plugin/`, no generator, no
> checker mode, no delta block. This is architecture for review.

---

## 1. Current-state assessment

### 1.1 What exists

| Concern | State today |
|---|---|
| Work item | A GitHub issue. There is no task system; `TaskCreate/TaskUpdate/TaskList` appear in the chief-architect frontmatter and are referenced by no policy. |
| Requirement | **Does not exist as an object.** |
| Acceptance criterion | An anonymous Markdown checkbox in the adopter's roadmap. |
| Completion assertion | An agent flips `[ ]` to `[x]`. |
| Human verification | Happens at **checkpoints**, recorded in sprint `STATE.md`, attached to *phases* and never to criteria. |
| Machine-enforced state machine | Exactly one: ADR `Status:`. |
| First-class governed object | Exactly one: the ADR. |
| Machine-readable data | **None.** `find llm -type f ! -name "*.md"` returns nothing in canon *and* in the website adopter. |

The only structures any tool parses are the delta's `## Repository Layout`
bullets, the fenced ` ```l0-allowlist ` block, ADR `Status:` lines, the ADR
index table, and Markdown link targets — all in
`plugin/scripts/governance-checks.mjs`. Everything else is convention held up
by unusually disciplined prose.

### 1.2 The gap, stated precisely

**The framework governs process exhaustively and outcomes not at all.**

It can tell you that a change was classified L1, branched, drafted, reviewed by
the right role, and merged. It cannot tell you whether the thing the change was
supposed to achieve is *true*. Those are different questions, and only the
second one is what anybody actually wanted.

This is the same failure shape the package has already had twice, and it says
so about itself both times:

- **ADR-0001** exists because the package governed *process* exhaustively and
  *placement* nowhere, so a tool default filled the gap.
- **BACKLOG G-1** exists because it governs *execution mode* exhaustively and
  *model choice* nowhere, so the session default filled the gap.
- **This capability** exists because it governs *workflow* exhaustively and
  *verification of outcome* nowhere, so an agent's own say-so fills the gap.

G-1 names that recurrence explicitly — *"the identical gap one level over"*.
This is the third instance, and the argument for it is canon's own.

### 1.3 Five specific defects, each evidenced

1. **No criterion identity.** A criterion's only address is its prose sentence
   — and the prose is edited in place. The website repo's Phase 3 bucket-IAM
   criterion carries `*(Amended 2026-09-17: the original clause said … which
   ADR-0010 decision 5 makes unimplementable…)*`. So even the sentence is not a
   stable key. You cannot say "criterion 3 of phase 2" and be understood by a
   tool.

2. **Code cites ADRs and SEAMs, never criteria.** `ADR-0002/0004/0007/0008/
   0009/0010` and `SEAM-1…7` appear throughout `site/`, `gate/`, `infra/`,
   `contract/` — 73 in-repo references to `SEAM-1` alone. Criteria appear in
   code **zero** times. The convention demonstrably works; it has just never
   been applied to the thing being verified.

3. **Coverage is un-computable.** Requirement → test is achievable by a careful
   human in about ten minutes per criterion. Test → requirement is impossible.
   Nothing can tell you that a criterion has zero tests.

4. **A test can exist and not run.** From the website repo's own `ci.yml`,
   verbatim: *"The publishing contract's own suite (issue #26). It ran NOWHERE
   until now … the schema, the dependency-free validator the publish action
   actually executes, the rejection fixtures and the fixture-coverage guard
   were verified only by hand."* Phase 2 criteria were ticked on tests CI was
   not running.

5. **The tick and the evidence live in different files.** Criterion in the
   roadmap; proof in `STATE.md` and a handoff; neither links back.

### 1.4 What is already right, and must not be broken

This is the load-bearing half of the assessment. **The practice this capability
formalises already exists — by hand, in prose, inside the checkbox text.**

```markdown
- [x] A push to `cv` … publishes to the bucket … (ADR-0007)
  *(Publish half **done for real** 2026-09-16: … 19 objects under `sources/cv/` …
  Hub half proven **locally** against that real payload … but **not yet on the
  live site**. Ticks when a hub deploy serves it.)*
  *(**Verified live 2026-09-16/17:** `build-info.json` … reports `content_source: bucket`)*
```

That single line informally carries a verification *level* (local vs live),
*evidence*, a *date*, and a *stated tick condition*. A commit is literally
titled **"#16: Test 4 half proven; tick only what is actually verified"**.

The design brief's states were not invented for this repo. They were reverse-
engineered from it.

Three further assets to preserve:

- `SKIP — NOT VERIFIED` already exists in `governance-checks.mjs`, with the
  rationale *"a reader must never mistake 'verified nothing' for 'verified and
  clean.'"* That is this capability's governing principle, already written down.
- Canon's own `BACKLOG.md` already distinguishes **`VERIFIED` (shipped, all
  gates pass)** from **`IMPLEMENTED` (built, gates pending)**. The distinction
  exists; it has never been applied to requirements or to adopters.
- The **checkpoint** is already the human-verification event. The owner applies
  Terraform, signs in, looks at the site. It just isn't attached to claims.

### 1.5 Constraints this design must respect

| Constraint | Source | Consequence here |
|---|---|---|
| One source of truth; no parallel audit log | Repository Steward charter: *"The audit trail mechanism is the L0 PR itself… An appended log file would duplicate what GitHub preserves"* | **No ledger file.** See §3.3 — this turns out to cost nothing. |
| `plugin/**` is `HARD_DENY` | `governance-checks.mjs:140` | Every code change in this capability is L1+. Never L0. |
| Canon must not learn about adopters | `systemPatterns.md` §5: *"Governance knows nothing about `agentic-research`, and should not."* | Canon prescribes shape; the delta binds paths and vocabulary. No domain specifics in canon. |
| Repos must not invent local diff shapes | `l0-fast-track.md` §Open Questions | The sixth shape ships in canon and in the checker **together**. |
| Adding a capability touches many places | v0.5.0 precedent: a layout slot touched six files; v0.5.1 fixed two it missed | §9 enumerates all integration points as a checklist, not prose. |

---

## 2. Proposed architecture

### 2.1 One engine, two projections

The Design Surface spec already contains ~70% of the machinery this brief asks
for: declared sources → deterministic generator → hashed manifest → drift
audit → review-gated publication, with the projection rule *"a view, never a
new source of truth"* and *"cite or omit"*.

Building a second manifest, a second hash scheme and a second drift check
beside it would be the worst available outcome — a fourth instance of the
duplicated-half-mechanism failure the package keeps diagnosing in itself.

**Decision (owner, 2026-09-18): extend it.**

```
                    declared sources (delta-bound)
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
        design projection          verification projection
   (taxonomy, ADR index,        (claims, states, evidence,
    module map, mem-bank)        determinism, PDatasets)
                 │                         │
                 └────────────┬────────────┘
                              ▼
                  plugin/scripts/surface.mjs
                   (one generator, zero deps)
                              │
                              ▼
                     surface-manifest.json
              (one manifest, one definition of "stale")
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
      governance-checks --surface     published view
          (drift audit, never          (Pages, or
           auto-fixes)                 generate-only)
```

### 2.2 What this changes in the Design Surface spec

**Renaming an unbuilt artifact costs nothing.** The Design Surface spec is
Draft and unimplemented — no generator, no manifest, no delta block, no skill.
Nothing anywhere depends on the name `design-surface-manifest.json`. So the
generalisation can be done cleanly rather than bolted on:

| Design Surface spec says | Becomes | Why |
|---|---|---|
| `plugin/scripts/design-surface.mjs` | `plugin/scripts/surface.mjs` | Two projections, one engine |
| `design-surface-manifest.json` | `surface-manifest.json` | One manifest; one definition of "stale" |
| `governance-checks --design-surface` | `governance-checks --surface` | One drift mode |
| delta block `## Design Surface` | `## Published Surface`, with `Design Surface:` and `Verification:` status lines | One opt-in block, two independently-toggled projections |
| Tier 1 / Tier 2 | unchanged | The deterministic/LLM split is exactly right and is reused verbatim |

Everything else in that spec survives untouched: the projection rule, "cite or
omit", the missing-source gap marker, default-DISABLED, the human merge gate,
`Pages mechanism: none` meaning generate-only.

This amendment is **ADR-0002**, and it unblocks a spec that has sat unbuilt
since July.

### 2.3 Why verification is a projection and not a database

The instinct is to build a requirements registry — a JSON file of claims and
states. **That is the wrong shape here, and the repo's own governance says so.**
It would become the fifth place a phase's truth lives (roadmap, STATE, contract,
handoff) and would drift within a single sprint.

Instead: **the claim stays where it already is**, gains an ID and a status
marker in the ADR `Status:` grammar, and the generator *projects* a queryable
view from it. The manifest is derived, regenerable, and disposable. Delete it
and rerun the generator and you get it back. That is what makes it a view.

---

## 3. Verification data model

### 3.1 Objects

**Claim** — a falsifiable statement someone wants to be true, with an authority.

| Field | Source |
|---|---|
| `id` | `<SCOPE>-<KIND>-<nn>`, e.g. `P3-AC-04`, `S1-CL-02` |
| `text` | the sentence itself, verbatim |
| `text_sha256` | computed; **binds verification to the exact wording** (§5.4) |
| `authority` | cited ADR / design-doc section, already conventional |
| `scope` | phase slug (SE) or study id (Research) — already a GitHub milestone label |
| `state` | §5 |
| `evidence[]` | §6 |

ID grammar is canon's; the `<KIND>` vocabulary is **delta-bound**, because
canon must not learn what a "study" is. Software Engineering adopters declare
`AC`; research adopters declare `CL`, `H` (hypothesis) or whatever fits.

**Evidence** — an artifact bearing on a claim.

| Field | Notes |
|---|---|
| `kind` | `test`, `command`, `artifact`, `pdataset`, `observation`, `assertion` |
| `determinism` | `L3` \| `L2` \| `L1` — §14 |
| `locator` | path, command line, or URL |
| `sha256` | for artifacts; absent for observations |
| `produced_by` | actor id + actor class (`human` \| `agent`) |
| `produced_at` | ISO date |
| `replay` | the exact command to re-execute, or `null` if not replayable |

**Verification event** — (claim, state, actor, actor_class, evidence[], date, PR).

**PDataset** — §4.

### 3.2 Claim identity — the one load-bearing change

```markdown
- [x] `P2-AC-04` A push to `cv`, with no commit to `website` … (ADR-0007)
```

`P2-AC-04` is then greppable from code comments, test docstrings, handoffs, PR
bodies and STATE — **exactly as `ADR-0007` and `SEAM-1` already are**. Those two
prove the convention works in this codebase. No new file, no new system, no new
tool required to make the ID useful on day one.

Adoption is incremental: a repo may add IDs to some criteria and not others. An
ID-less criterion is simply invisible to the projection, and the audit reports
how many there are. It must never be silently omitted (`SKIP — NOT VERIFIED`).

### 3.3 Where verification state lives — and why no new file is needed

The brief asked for durable verification records. The Steward charter forbids a
parallel log. The owner chose the hybrid: agent events ephemeral, human events
durable.

**That choice turns out to require no new file at all.** Put the marker on the
claim line, in the grammar canon already enforces for ADRs:

```markdown
- [x] `P3-AC-04` A gate test asserts that no `/p/**` response carries
  `public` or `s-maxage` in `Cache-Control` (ADR-0004)
  — HUMAN VERIFIED (PR #25, 2026-09-17)
```

This is durable (a tracked file), survives a repo transfer or a PR export
(unlike a GitHub comment), is greppable, is diffable, and **lives on the claim
itself** — so the one-source-of-truth rule is not bent, let alone broken. The
Steward's ruling stands completely intact.

The split:

| Event | Where | Durability |
|---|---|---|
| Agent verification detail — validation tables, command output, route parity | handoff / PR body, where it already is | Ephemeral; GitHub preserves it |
| **Agent verification *outcome*** | marker on the claim line | Durable |
| **Human verification outcome** | marker on the claim line | Durable |
| Human verification *evidence* | checkpoint record in sprint `STATE.md`, where it already is | Durable, already conventional |

### 3.4 Marker grammar

Deliberately isomorphic to the ADR status line, which the checker already
validates and which every contributor already reads:

```
— <STATE> (PR #<n>[, YYYY-MM-DD])
```

`<STATE>` ∈ { `AGENT VERIFIED`, `HUMAN REVIEWED`, `HUMAN VERIFIED`,
`VERIFICATION FAILED`, `NEEDS REWORK` }. **Absent marker = `NOT VERIFIED`** —
the default costs nothing to adopt and cannot be forged by omission.

No free prose in the parenthetical, same as `status-line-only`. Evidence is
referenced by locator in the projection, not inlined here — the existing
hand-written prose annotations migrate into handoffs and checkpoint records.

### 3.5 The marker block is append-only

§3.3 chose a marker on the claim line and no new file, and the Steward charter
forbids a parallel log. That collides with the brief's Activity 11, which
requires an **append-only** verification record and says plainly: *do not
silently mutate historical verification records.* A marker that is rewritten in
place is the opposite of append-only.

**Resolution: the marker block accumulates. Nothing in it is ever replaced or
removed.**

```markdown
- [x] `P3-AC-04` A gate test asserts that no `/p/**` response carries
  `public` or `s-maxage` in `Cache-Control` (ADR-0004)
  — AGENT VERIFIED (PR #22, 2026-09-16)
  — HUMAN VERIFIED (PR #25, 2026-09-17)
```

- **Current state is the last line.** One rule, no ambiguity, and the cheap read
  stays cheap — a reader or a checker takes the final marker.
- **History is the lines above it.** The chain *is* the record. There is no
  parallel log, no new file, and the Steward's ruling stands exactly as §3.3
  left it.
- **A reset appends, it does not erase.** Claim-text drift (§5.4) and artifact
  invalidation (§5.5) append `— NOT VERIFIED (<reason>, YYYY-MM-DD)`. The prior
  `HUMAN VERIFIED` line remains visible, which is the point: a reader must be
  able to see that something *was* verified and then stopped being so. Deleting
  it would hide exactly the event that matters most.
- **Removal is a violation, and it is mechanically checkable.** A diff that
  deletes or edits an existing marker line is malformed. This is a *shape*
  rule, so it belongs in the sixth L0 diff shape (A2) alongside the grammar:
  `verification-marker` permits appending a marker line and permits nothing
  else. Append-only then has an enforcer rather than being an aspiration —
  which is the distinction v0.9.1 added to `audit` check 6.

The cost is honest: claims that are verified, invalidated and re-verified grow a
few lines. That is the correct trade. A one-line marker is cheaper to read and
loses the only history anyone would ever want.

**What this does not claim.** Git history is not the append-only guarantee here
— history can be rewritten, and reconstructing state from diffs is not
inspection. The guarantee is that the *current tree* carries the chain, so
inspection needs no archaeology.

---

## 4. PDataset specification

**PDataset** = a named, hashed, addressable data bundle that evidence can point
at, with working view and download links.

### 4.1 Record

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `<STUDY>-DS-<nn>` |
| `title` | yes | human-readable |
| `path` | yes | repo-relative, or a URI for external storage |
| `sha256` | yes | of the file, or of the manifest of files for a directory |
| `bytes` | yes | |
| `produced_by` | yes | pipeline step id (§15) or `manual` |
| `derived_from` | yes* | id(s) of the source PDataset(s); `none` for a root dataset. *Required — this field **is** the provenance chain the brief asks for, and `none` must be stated rather than omitted, so a root dataset is distinguishable from an unrecorded one.* |
| `transformation` | yes* | the executable artifact that produced this from `derived_from`, or `manual` with a reason. *A `manual` transformation is an **`L1`** (attested) operation by §14 regardless of how deterministic it looks.* |
| `produced_at` | yes | ISO date |
| `schema` | no | column names/types when tabular |
| `rows` | no | |
| `license` | no | |
| `view_url` | derived | never hand-written |
| `download_url` | derived | never hand-written |
| `link_resolution` | derived | `published` \| `local` \| `missing` |

### 4.2 Link resolution — the honest part

The brief asks for *working* view and download links. Canon cannot promise one:
**`docs/` in canon contains only `README.md` and there is no Pages config.**
Fabricating a URL would violate the Design Surface guardrail this design
inherits — *"never fabricate"*.

So links are **derived, never stored**, from the delta's `Pages mechanism` and
`Output dir`:

- `Pages mechanism: jekyll|mkdocs|actions-pages` → `link_resolution: published`,
  and the generator emits absolute URLs under the declared output root.
- `Pages mechanism: none` → `link_resolution: local`, repo-relative paths only.
  This is generate-only mode, already defined by the Design Surface spec.
- Declared path absent on disk → `link_resolution: missing`, a **visible gap
  marker** and a non-zero audit finding. Never silent, never invented.

The drift audit checks link *resolvability*; it does not assert liveness of an
external URL it cannot reach.

### 4.3 Finding to record honestly

**There are zero data files across all six adopting repositories.** Not one
non-Markdown file exists in either control plane examined. PDataset therefore
ships in v1 with:

- the record schema,
- the link-resolution rules,
- a **fixture** (§ activity plan A11),

and **no real binding until a research adopter exists**. Specifying it further
than that would be designing against an imagined consumer. This is recorded as
an assumption, not a decision.

---

## 5. Verification state machine

### 5.1 States

| State | Meaning | Who may assert |
|---|---|---|
| `NOT VERIFIED` | default; no marker present | — |
| `AGENT VERIFIED` | an agent produced evidence satisfying the claim | Verifier agent |
| `HUMAN REVIEWED` | a human read the claim and its evidence and found it coherent | human |
| `HUMAN VERIFIED` | a human observed or replayed the evidence and affirms the claim | human |
| `VERIFICATION FAILED` | evidence was produced and the claim is **false** | Verifier agent or human |
| `NEEDS REWORK` | evidence is insufficient or the claim is ill-formed; not a falsification | Verifier agent or human |

### 5.2 Transitions

```
                    ┌──────────────────────────────────────┐
                    │                                      │
   NOT VERIFIED ──► AGENT VERIFIED ──► HUMAN REVIEWED ──► HUMAN VERIFIED
        ▲                 │                  │                  │
        │                 ▼                  ▼                  │
        │         VERIFICATION FAILED   NEEDS REWORK            │
        │                 │                  │                  │
        └─────────────────┴──────────────────┘                  │
                     (rework resets)                            │
        ▲                                                       │
        └───────────── claim text edited (§5.4) ────────────────┘
```

Legal transitions, exhaustively:

| From | To | Permitted actor |
|---|---|---|
| `NOT VERIFIED` | `AGENT VERIFIED`, `VERIFICATION FAILED`, `NEEDS REWORK` | agent or human |
| `NOT VERIFIED` | `HUMAN REVIEWED`, `HUMAN VERIFIED` | **human only** |
| `AGENT VERIFIED` | `HUMAN REVIEWED`, `HUMAN VERIFIED`, `VERIFICATION FAILED`, `NEEDS REWORK` | human (agent may only move to FAILED/REWORK) |
| `HUMAN REVIEWED` | `HUMAN VERIFIED`, `VERIFICATION FAILED`, `NEEDS REWORK` | **human only** |
| `HUMAN VERIFIED` | `VERIFICATION FAILED`, `NEEDS REWORK` | **human only** |
| any | `NOT VERIFIED` | automatic, on claim-text change (§5.4) |

**`AGENT VERIFIED` is never a prerequisite for `HUMAN VERIFIED`, and never a
step toward it.** A human may verify a claim no agent has touched. This encodes
the brief's core principle directly in the graph: agent verification is
evidence, not a stage of human verification.

### 5.3 The central rule, and how it is enforced

> **No builder may mark its own requirement complete.**

Four independent mechanisms, because one is not enough:

1. **Tool separation (mechanical, already how canon works).** The Builder
   charter carries the roadmap/claims path in `disallowedTools` write patterns.
   A Builder physically cannot write a marker. This is the same mechanism the
   package already uses for role separation via `tools:`/`disallowedTools:`
   frontmatter.
2. **Actor-class gate (mechanical).** `HUMAN REVIEWED`, `HUMAN VERIFIED` and any
   transition *out of* `HUMAN VERIFIED` require the cited PR to carry a human
   approval. The checker asserts the citation; GitHub asserts the approval.
3. **Independence (temporal and artifactual).** Reusing canon's existing L0
   condition-10 definition verbatim — *"a distinct recorded artifact from a
   distinct session, not a distinct identity"*. The Verifier's evidence must be
   a distinct artifact produced in a distinct session from the Builder's.
4. **Determinism cap (mechanical).** A claim whose only evidence is `L1`
   **cannot** reach `HUMAN VERIFIED` (§14.3). An agent's assertion about its own
   work is `L1` by definition.

### 5.4 Claim-text drift — the rule that makes this trustworthy

`text_sha256` is recorded in the manifest at the moment a marker is written.
**If the claim sentence is edited, its hash changes and the state resets to
`NOT VERIFIED`.**

This directly solves defect §1.3(1). The website repo's Phase 3 criterion was
amended *after* work began; under this rule that amendment would have visibly
un-verified the claim rather than silently changing what "verified" referred to.

Verification is bound to the exact wording that was verified. A reviewer never
has to wonder whether the tick predates the sentence.

Drift is reported by `--surface`, in the same mechanism and the same breath as
Design Surface narrative drift. One definition of stale.

### 5.5 Artifact invalidation — tamper evidence beyond the claim text

§5.4 binds verification to the exact claim *wording*. The brief's Activity 8
asks for more: verification must identify exactly **what was verified**, and if
an artifact changes afterwards the system must not keep presenting it as
`HUMAN VERIFIED`.

Claim-text drift is one input to invalidation, not invalidation itself. A claim
sentence can sit untouched while the code, dataset, configuration or model it
refers to is replaced underneath it.

**Generalise §5.4's mechanism rather than adding a second one.** At the moment a
marker is written, the manifest records the identity of every artifact the
verification rested on:

| Bound identifier | Applies to |
|---|---|
| `commit_sha` | the repository state the claim was verified against |
| `artifact_sha256` | each cited file — verification code, config, fixture |
| `dataset_sha256` | each cited PDataset (§4.1 already records `sha256`) |
| `model_id` + `model_version` | **`L1`** (attested) operations (§14) |
| `execution_id` | the run whose output was the evidence |
| `text_sha256` | the claim sentence (§5.4, unchanged) |

**If any bound identifier changes, `--surface` appends an invalidation marker**
— `— NOT VERIFIED (artifact changed: <identifier>, YYYY-MM-DD)` — per §3.5. One
definition of stale, one mechanism, one report, exactly as §5.4 intended.

Two deliberate limits, stated so nobody over-reads this:

- **Tamper-evident, not tamper-proof.** Hashes detect change; they do not
  prevent it, and anyone who can edit the tree can edit the manifest. The claim
  is that a silent substitution becomes a visible one, which is all a
  git-hosted system can honestly offer.
- **`L1` cannot bind an output.** For nondeterministic operations the
  manifest binds the *inputs* — prompt, model id, parameters, seed where one
  exists — and not the output, because re-running produces a different one
  legitimately. §14's distinction between reproducing the *procedure* and
  reproducing the *output* is what makes this coherent; pretending otherwise
  would make every LLM claim permanently invalid.

---

## 6. Claim-to-evidence model

### 6.1 Relation

Many-to-many. A claim has zero or more evidence records; one evidence record
may bear on several claims (one test can satisfy three criteria). The binding
is **by claim ID in the evidence artifact**, not by a registry:

```python
def test_no_private_response_is_cacheable_by_the_cdn():
    """P3-AC-04 — the explicit assertion the contract and the roadmap require."""
```

This is the mechanism `SEAM-7` already uses successfully —
`describe("smoke-route presence check (SEAM-7)")` in the website repo. The
generator greps for claim IDs exactly as a human currently greps for `ADR-0004`.

### 6.2 Why binding-by-citation and not a mapping file

A mapping file would need updating whenever a test moved, would silently rot,
and would be a second source of truth about which test proves what. A docstring
citation moves with the test and is visible at the point of reading. It is also
the only option that makes **test → claim** answerable, which is the direction
that is impossible today (§1.3(3)).

### 6.3 Achievable state is capped by best evidence

| Best evidence | Ceiling | Rationale |
|---|---|---|
| `L3` deterministic | `HUMAN VERIFIED` via replay | A human can re-run it and compare bytes |
| `L2` executable | `HUMAN VERIFIED` via recorded observation | Re-runnable, but the human must witness the outcome |
| `L1` attested only | **`AGENT VERIFIED`** | Nobody can check it; it is testimony |
| none | `NOT VERIFIED` | |

The audit's headline metric is **claims whose only evidence is `L1`**. Applied
to the website repo today that number would be large, and that is the point:
the first honest output of this capability is an uncomfortable number.

### 6.4 Coverage becomes computable

With claim IDs cited in evidence, the generator answers the three questions
nothing can answer today:

- claims with **no** evidence,
- claims whose evidence is `L1` only,
- claims `AGENT VERIFIED` but not `HUMAN VERIFIED` — *exactly* the "half proven"
  situation the website repo hand-wrote prose for in Phase 2.

---

## 7. Quarto and executable-UI feasibility

### 7.1 Evidence

Verified on this machine: **Quarto, R, Rscript, jupyter and pandoc are not
installed.** `uv`, `node 24` and `docker` are. `governance-checks.mjs` is
deliberately zero-dependency plain Node, and the Design Surface spec requires
its generator to be the same.

### 7.2 Assessment

**Quarto is not feasible as a dependency in v1, and should not be one ever.**

Making canon's generator require Quarto would mean every adopting repo — six of
them, none of which is a research repo — must install an R/Python publishing
toolchain to run a governance check. That inverts the package's own
zero-dependency discipline for the benefit of a consumer that does not yet
exist on this machine.

### 7.3 Recommendation

Declared, not hardcoded — the same pattern as everything else:

```
Renderer: none          # none | quarto
```

- **`none` (default).** The generator emits plain Markdown and static HTML with
  zero dependencies. Every claim, state, evidence record and PDataset is
  viewable. This is the full capability; nothing is withheld.
- **`quarto`.** A research adopter that *has* Quarto gets executable documents —
  re-runnable analysis, inline PDataset previews, live replay output. Canon
  ships the template; it never invokes Quarto unless the delta asks.
- **Escape hatch.** `docker` is present, so a research repo can pin a Quarto
  container without a host install. Recorded as an available option, not a
  requirement.

**An interactive verification console is deferred entirely.** It is a genuinely
attractive idea and a genuinely large one; it belongs in the backlog after the
data model has shipped and been used. Building it now would be designing a UI
for data that does not yet exist.

> **Amended 2026-09-23 (slice reconciliation A-2).** As first written this
> paragraph deferred "executable UI" as a whole, which reads as deferring any
> way for a human to re-run a check. That is more than was intended and more
> than the capability can afford: a human who cannot re-execute the evidence is
> back to trusting an agent's summary, which is the gap G-3 exists to close.
>
> The distinction the section actually needs:
>
> - **Deferred** — an interactive console that executes code *in the page*.
> - **Required, and in scope under `Renderer: none`** — the generated page
>   emits the exact REPLAY and MODIFIED REPLAY commands, with their inputs,
>   expected results and working directory, for the human to run in their own
>   shell.
>
> The second costs zero dependencies, because emitting a string is not
> executing it. It also keeps the **execution boundary explicit**: the page
> states plainly that it renders commands and does not run them. A page that
> animated a fake result would be worse than one that runs nothing.

---

## 8. Repository structure

All paths in canon. Everything under `plugin/**` is `HARD_DENY` — **no part of
this capability's code can ever go through the L0 fast track.**

```
plugin/
  scripts/
    surface.mjs                     NEW  generator, two projections, zero deps
    surface.test.mjs                NEW  fixtures (§ activity plan A10, A11)
    governance-checks.mjs           MOD  + --surface mode; + 6th diff shape
    governance-checks.test.mjs      MOD  + shape tests
  skills/
    publish-design-surface/         NEW  from the Design Surface spec (Tier 2)
    verify-claim/SKILL.md           NEW  the human verification flow
  agents/
    verifier.md                     NEW  Verifier charter (§ activity plan A8)

llm/
  governance/
    verification.md                 NEW  canonical capability doc
    l0-fast-track.md                MOD  6th shape row + allowlist example
    definition-of-done.md           MOD  done = HUMAN VERIFIED, not ticked
    project-operating-system.md     MOD  Verifier in the Assignment Contract
    labels.md                       MOD  verification-failed, needs-rework
    governance-delta-template.md    MOD  ## Published Surface block
    patterns/prompt-patterns.md     MOD  VERIFICATION element in the UBC skeleton
    templates/
      pr-template-template.md       MOD  ## Verification section
      surface-ci-template.yml       NEW  reference CI (from the DS spec)
    adr/
      0002-extend-design-surface-to-a-shared-surface-engine.md   NEW
      0003-claim-identity-and-verification-markers.md            NEW
  specs/
    2026-07-21-design-surface-capability-design.md   MOD  amended per §2.2
    2026-09-18-human-verification-capability-design.md   THIS
    2026-09-18-human-verification-activity-plan.md       deliverables 10–13
  features/
    BACKLOG.md                      MOD  + G-3
```

**Note on `llm/plans/`.** The activity plan is placed in `llm/specs/`, not
`llm/plans/`. Canon's delta does not merely omit a Plans slot — it refuses one:

> *"Slots deliberately not declared: **Plans** and **Sprints**. This package
> does not execute sprints, and its implementation plans are written into the
> spec they implement rather than into a separate plans tree."*

`CLAUDE.md` carries a standing owner preference pointing plans at `llm/plans/`.
The two conflict. The delta wins here, on `CLAUDE.md`'s own terms — it defers
to §Repository Areas explicitly, and its closing rule is that *"an undeclared
path is"* a violation, which a freshly created `llm/plans/` in this repo would
be. That preference exists to stop `obra/superpowers` writing plans into the
data plane, not to force a plans tree into a package that deliberately has
none. Flagged as an ADR candidate (§16, A4): the conflict will recur for every
plan written in canon, and should be settled once rather than re-argued.

---

## 9. Integration points

A checklist rather than prose, deliberately: the v0.5.0 precedent is that
adding a layout slot touched **six** places and v0.5.1 had to fix two that were
missed. This capability touches **eleven**.

| # | Surface | Change | Level |
|---|---|---|---|
| 1 | `governance-delta-template.md` | `## Published Surface` block; `Design Surface:` / `Verification:` status lines; `Claim kinds:`; `Renderer:` | L1 |
| 2 | `governance-checks.mjs` | `--surface` drift mode | L1 |
| 3 | `governance-checks.mjs` `SHAPES` (line 160) | 6th shape `verification-marker` | L1 |
| 4 | `l0-fast-track.md` §Block Format shape table | the row for it — **shipped in the same PR as (3)**, per canon's own rule | L1 |
| 5 | `pr-template-template.md` | `## Verification` — claim IDs this PR claims, and at what state | L1 |
| 6 | `project-operating-system.md` §Agent Assignment Contract | Verifier role; DEFINITION OF DONE references claim IDs, not restated prose | L2 |
| 7 | `prompt-patterns.md` UBC skeleton | `VERIFICATION:` element | L2 |
| 8 | `definition-of-done.md` | a criterion is done when `HUMAN VERIFIED` — not when ticked | L2 |
| 9 | `labels.md` | `verification-failed`, `needs-rework` | L1 |
| 10 | `governance:audit` skill | reports L1-only claims, un-ID'd claims, drifted claims | L1 |
| 11 | `establish` skill | offers the `## Published Surface` block at adoption; never enables it | L1 |

### 9.1 The one blocking mechanical detail

`checkbox-only` is the L0 diff shape the website repo declares for its roadmap.
Its implementation is strict — `governance-checks.mjs:614–618`:

```js
if (shape === 'checkbox-only') {
  const bad = changed.filter((l) => !/^\s*[-*]\s+\[( |[xX])\]\s/.test(l));
  if (bad.length) return [`${file}: L0 diff must be checkbox list items only …`];
  return pairedConstraint(file, removed, added,
    (l) => l.replace(/\[( |[xX])\]/, '[·]'), 'checkbox-toggle');
}
```

A removed/added pair may differ **only** in `[ ]` vs `[x]`. So writing or
changing a verification marker on a criterion line **fails `--l0`**.

(Worth noting: the existing hand-written `*(Verified live …)*` annotations were
never L0-eligible either. They went in as part of semantic PRs, and the fast
track is INACTIVE in that repo, so nothing ever ran `--l0` on them.)

**Resolution — a sixth canonical shape, `verification-marker`:**

```js
if (shape === 'verification-marker') {
  const bad = changed.filter((l) => !/^\s*[-*]\s+\[( |[xX])\]\s/.test(l));
  if (bad.length) return [`${file}: L0 diff must be checkbox list items only …`];
  return pairedConstraint(file, removed, added,
    (l) => l.replace(/\[( |[xX])\]/, '[·]')
            .replace(/\s+—\s+(NOT VERIFIED|AGENT VERIFIED|HUMAN REVIEWED|HUMAN VERIFIED|VERIFICATION FAILED|NEEDS REWORK)\s*\(PR #\d+(,\s*\d{4}-\d{2}-\d{2})?\)\s*$/, ' — ·'),
    'verification-marker');
}
```

The normalizer masks the checkbox **and** a well-formed trailing marker, so a
*state transition* stays L0 bookkeeping while any edit to the claim **text**
remains semantic (L1) — which is exactly the boundary §5.4 needs.

Canon's own Open Questions section pre-authorises this: *"Whether canonical
shapes beyond the five above will be needed… **Add shapes here and in the script
together; repos must not invent local shapes.**"* Hence integration points 3 and
4 ship in one PR.

---

## 14. Determinism classification and enforcement

### 14.1 The three levels

| Level | Name | Definition | Verified by |
|---|---|---|---|
| **L3** | Deterministic | Same inputs → byte-identical outputs | Re-execute; compare `sha256` |
| **L2** | Executable, non-deterministic | Runs to a pass/fail, output not byte-stable (timestamps, network, cloud state, LLM sampling) | Re-execute; compare **assertions**, not bytes |
| **L1** | Attested | A human or agent states it. No re-execution possible | Nothing. It is testimony |

Every evidence record **must** declare its level. There is no default — an
undeclared level is a gap marker, not an assumption, because the safe-looking
default (`L1`) would quietly cap claims and the useful-looking default (`L3`)
would quietly launder assertions.

> **Amended 2026-09-23 (slice reconciliation A-1).** §4.1 and §5.5 previously
> said "Level 3" where they meant **`L1`** — the *weakest* level — while this
> table defines `L3` as the *strongest*. The scale was inverted in two places.
> An implementer following those sections literally would have classified
> manual, attested and LLM work as **deterministic**, inverting the one cap in
> §5.3 mechanism 4 that stops an agent's own say-so reaching `HUMAN VERIFIED`.
> This table is canonical; those citations now read `L1`.

### 14.2 Three verification modes

**REPLAY** — re-execute the recorded command with the recorded inputs; expect
the recorded result. Proves the artifact is *reproducible*.

**MODIFIED REPLAY** — re-execute with a deliberate perturbation that *should*
change the outcome: mutate an input, break a precondition, delete the thing
being asserted about. **Expect failure.** Proves the check is *not vacuous*.

**INDEPENDENT VERIFICATION** — a distinct actor, in a distinct session, with no
access to the builder's reasoning, produces evidence from the claim text alone.
Proves the result is not an artifact of how it was built. Uses canon's existing
independence definition: *temporal and artifactual, not identity-based*.

### 14.3 Why MODIFIED REPLAY is the most valuable idea here

The immediately preceding effort in this portfolio found **three vacuous
guards** in production code: a leak check that scanned for private items when
none existed, a private-links check over a single page, and an entire logging
layer whose 21 call sites were silently discarded — whose tests passed only
because `caplog` attached the very handler that was missing.

**All three would have been caught by MODIFIED REPLAY. None was caught by a
suite going red.** Every one was found by a human asking "what would this look
like if it were broken?" — which is precisely the question MODIFIED REPLAY
mechanises.

That is not a hypothetical benefit. It is the strongest available argument for
this capability, and it is drawn from this portfolio's own recent history.

### 14.4 Enforcement

- `L3` evidence: the generator recomputes and compares the hash. A mismatch is
  a finding.
- `L2` evidence: the reference CI template re-runs it. A failure is a finding.
- `L1` evidence: counted and surfaced. Never blocks, always visible.
- **Claims whose only evidence is `L1` cannot reach `HUMAN VERIFIED`** — the
  hard cap from §6.3.
- MODIFIED REPLAY is **required** for any claim reaching `HUMAN VERIFIED` on
  `L3`/`L2` evidence: the perturbation and its expected failure are recorded
  alongside the replay command. A claim with a replay but no modified replay is
  reported as **"unfalsified"** — verified to run, not verified to matter.

---

## 15. Reproducible research pipeline

### 15.1 Shape

```
study ──► protocol ──► run ──► PDataset ──► analysis ──► claim
            │           │         │            │           │
         declared    command   hashed      command     evidence
          inputs                output                   (L3)
```

Every step declares: inputs (hashed), a command, outputs (hashed). The manifest
records the DAG. This makes the whole chain from raw data to published claim a
single replayable object.

### 15.2 The three modes applied

- **REPLAY** — re-run the DAG from declared inputs; every output hash must match.
- **MODIFIED REPLAY** — perturb one declared input; the dependent claim's
  evidence **must** change. If it does not, the analysis does not depend on the
  data it claims to, and the claim is reported **unfalsified**.
- **INDEPENDENT VERIFICATION** — a second actor re-derives the claim from the
  PDataset alone, without the analysis code.

### 15.3 Domain binding

Canon defines `study`, `protocol`, `run`, `analysis` as **step kinds with
declared inputs and outputs** and nothing more. It does not know what a
hypothesis is, what a p-value is, or what counts as a valid protocol. The
research adopter's delta binds vocabulary and paths — consistent with
`systemPatterns.md` §5.

### 15.4 Status

**Specified, not buildable yet.** There is no research adopter on this machine
and zero data files across the six adopting repos. §15 ships as the fixture in
activity A11 and as the schema; it binds to reality when a research repo
adopts. Stated as an assumption rather than presented as a finished integration.

---

## 16. Assumptions

Per the standing instruction — conservative choice taken, recorded here, flagged
as ADR candidate where it is a decision.

| # | Assumption | ADR candidate |
|---|---|---|
| A1 | `agentic-research` is a **plugin**, canon's declared "second consumer", not a repo on this machine. The research domain is therefore designed as an adopter binding, not against a readable codebase. | no |
| A2 | Renaming Design Surface's unbuilt artifacts is free, since nothing depends on them. | **ADR-0002** |
| A3 | Claim IDs live on the claim line; no registry file. | **ADR-0003** |
| A4 | The activity plan goes in `llm/specs/`. The delta **deliberately refuses** a Plans slot; `CLAUDE.md` points plans at `llm/plans/`. The delta wins on `CLAUDE.md`'s own deference rule, and creating `llm/plans/` would itself be the undeclared path its closing rule forbids. | **yes — the conflict should be settled once** |
| A5 | PDataset ships with schema + fixture and no real binding until a research adopter exists. | no |
| A6 | Quarto is an optional declared renderer, never a dependency. | no |
| A7 | Executable/interactive UI is deferred to the backlog. | no |
| A8 | Adoption is incremental; un-ID'd claims are reported, never silently skipped. | no |

## 17. Open questions

1. **Does canon itself adopt this capability?** Canon has a BACKLOG with
   `VERIFIED`/`IMPLEMENTED` statuses but no roadmap of acceptance criteria.
   Dogfooding would be valuable and is not free.
2. **Does the website repo retrofit claim IDs to its ~145 existing checkboxes,
   or only to new ones?** Retrofit is mechanical but is a large L1 diff.
3. **Should `VERIFICATION FAILED` block a merge?** It is a true statement about
   a merged system; blocking may be right, or may just cause under-reporting.
4. Whether canon's `docs/` should gain a Pages mechanism so the published
   surface has somewhere to go.

## 17a. Decisions on the blocking questions (2026-09-21)

Questions 5 and 6 above blocked A1 from starting. Both are settled here by the
repository owner; questions 1–4 remain genuinely open and block nothing.

### D-1 — A3 builds the minimum engine. Design Surface is a consumer, not a prerequisite.

**Decision.** A3 delivers the surface engine and the `surface-manifest` schema
scoped to what verification needs, and nothing more. Issues #7 and #9
(Published Design Surface) become a **second consumer** of that engine rather
than a dependency of it.

**Why.** Verification addresses a live governance gap — the package governs
process exhaustively and outcome nowhere, and `audit` check 6 demonstrated the
cost of that inside canon itself. Design Surface is a publishing capability and
is unstarted. Blocking the urgent capability behind the optional one would put
A4, A5, A7 and A9 behind work nobody has begun.

**The risk this creates, stated.** Two consumers of one engine means the
engine's interface has to be approximately right on the first attempt, and the
second consumer is not available to pressure-test it. The mitigation is
narrowness: A3 ships the manifest schema and the projection seam, and resists
generalising for a consumer that does not exist. A thin engine that #7 later
extends is recoverable; a speculative one built for an imagined second consumer
is not.

**What this does not decide.** §2.2's amendments to the Design Surface spec
stand — they describe how the two projections relate when both exist. This
decides only the build order.

### D-2 — the human owner holds Verifier on A1, A6 and A8.

**Decision.** Confirmed as amended on 2026-09-19. `chief-reviewer` still
reviews all three; the change is who **marks** them.

**Why.** These are the three activities where an agent verifying an agent is
the recursion this capability exists to break: A1 defines claim identity, which
every other activity keys off; A6 defines what counts as reproduced; A8 defines
the Verifier role itself. The plan had already reached for this in `A8-AC-05`,
recording a bootstrap exception naming the human owner "because the Verifier
role does not yet exist." That instinct was correct and is now general.

**The cost, stated.** This is the change most likely to slow delivery — three
activities now wait on human availability rather than agent throughput. That is
the trade, accepted deliberately rather than discovered later.

## 18. Related documents

- `llm/specs/2026-07-21-design-surface-capability-design.md` — amended by §2.2
- `llm/specs/2026-09-18-human-verification-activity-plan.md` — deliverables 10–13
- `llm/governance/l0-fast-track.md` — §Block Format, shapes, condition 10
- `llm/governance/adr/0001-llm-control-plane-docs-data-plane.md`
- `llm/features/BACKLOG.md` — G-1 (the analogous gap), G-3 (this)
- `llm/memory_bank/systemPatterns.md` §5 — the no-adopter-knowledge rule
