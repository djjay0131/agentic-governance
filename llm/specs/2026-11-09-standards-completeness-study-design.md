# Standards-Completeness Study: Design

Status: Draft
Date: 2026-11-09
Owner: Project owner
Governance: agentic-governance v0.9.1
Tracking issue: #32
Governance level of this document: L1 (design spec; changes to it are semantic)

> **Scope note.** This spec designs a study *of* the canon. It changes no
> canonical policy. Gaps it finds become backlog candidates
> (`llm/features/BACKLOG.md` G-5 to G-10) and follow the normal path from
> there. Research data and the paper draft are data-plane artifacts under
> `docs/research/standards-benchmark/` and `docs/paper/`.

## 1. Purpose

agentic-governance governs process in depth. Nobody has measured it
against the standards a software engineering or AI governance reviewer
would hold it to, and the canon's own backlog already names three places
where it governs one dimension exhaustively and an adjacent one not at all
(ADR-0001, G-1, G-3). This study asks how many more such gaps exist, how
deep the enforcement goes where coverage exists, and whether the
mechanical layer catches what it claims to catch.

It also produces a durable, re-runnable benchmark, so each future version
of the canon can be scored the same way.

## 2. Research questions

- **RQ1 Completeness.** What share of in-scope requirements from ten
  software lifecycle, security and AI governance sources does the canon
  address?
- **RQ2 Depth.** Of what it addresses, how much is mechanically or
  platform enforced, and how much rests on agent or human discipline?
- **RQ3 Detection.** Which governance violations does the deterministic
  layer detect, which does it miss, and does the canon's honest-gaps
  declaration predict the misses? Would the canon, as written, have
  prevented or detected the real incidents in our prior incident dataset
  (under double-anonymous review; not identified further here until
  2026-12-08)?
- **RQ4 Practice.** Do adopting repositories conform, and is human review
  actually concentrated on semantic (L1–L3) work as the canon intends?
- **RQ5 (optional) Memory fidelity.** How faithfully does an agent perform
  the L0 memory-bank sync that the canon ranks as its highest authority?

## 3. Experiments

| Exp | RQ | Benchmark | Deterministic? | Human effort |
|---|---|---|---|---|
| E1 | RQ1, RQ2 | B1 Standards Completeness Matrix | Scoring yes; coding is human judgment | Two coders, ~174 rows each, about 6 h; adjudication about 1 h |
| E2 | RQ3 | B2 GovFault fixture suite | Yes | None after build |
| E3 | RQ3 | B5 Incident replay | Coding is human judgment | Two coders, all incidents in the prior dataset, about 3 h |
| E4 | RQ4 | B3 Adopter census + B4 Human attention ledger | Yes (API mining at fixed SHAs and dates) | None after build |
| E5 | RQ5 | Memory-bank fidelity (MemOps-style) | No; pinned and logged, reported as distributions | Label review |

Benchmark definitions are in
`docs/research/standards-benchmark/benchmark-landscape.md`. The codebook
for E1 is `docs/research/standards-benchmark/coding-scheme.md`.

### 3.1 E1: Completeness and depth

- **Instrument.** `requirements-catalog.csv` (174 rows). Requirements are
  paraphrased and identified by clause or control ID; nothing is quoted
  from the standards.
- **Procedure.** Jason (JC) and Atharva (AK) each code every row
  independently against a pinned canon commit, after a joint calibration on
  ten rows that are then excluded from agreement. Chris Brown adjudicates
  disagreements and does not code. Claude's pilot file (`coding-CL.csv`) is
  not one of the two codings and is withheld from the coders until they
  finish, so it cannot anchor them.
- **Measures.** Coverage (share of in-scope rows at depth ≥ 2), enforcement
  (share at depth ≥ 4), depth distribution per source, linear-weighted κ on
  depth, unweighted κ on scope.
- **Sensitivity.** (a) `PARTIAL` rows in and out of the denominator;
  (b) the composite tie-break switched to weakest-part coding; (c) the
  SSDF v1.2 draft row in and out; (d) the same canon re-coded at the commit
  that merges G-3, if it has merged by then.

### 3.2 E2: GovFault

- **Instrument.** A fixture generator that builds one small git repo per
  fault class (F1–F12 in the landscape note) from a clean template, applies
  exactly one seeded violation as a commit on a branch, and records the
  expected catcher and tier.
- **Procedure.** Run `governance-checks.mjs` in default, `--layout` and
  `--l0` modes against each fixture; record exit code and the failing
  check names. Each fixture is also run clean, as a control that must pass.
- **Measures.** Detection matrix (fault × check). Agreement between
  observed misses and the canon's honest-gaps declaration. Any clean
  control that fails is a checker defect and is reported as one.
- **Out of scope for E2.** The `audit` skill is agent-executed. Its
  deterministic sub-checks (for example, counting direct commits) may be
  re-implemented in the harness and labeled as such; the skill itself is
  not run here.

### 3.3 E3: Incident replay

For each incident in the prior dataset, two coders record: the canon rule that would
have prevented it (or none), the rule that would have detected it, the
depth of each rule (scheme from E1), and whether that rule existed in the
repo's pinned canon version at the time. Outcome per incident: prevented,
detected, missed. Same calibration, κ and adjudication as E1.

### 3.4 E4: Census and attention ledger

- **Census.** For each adopter in canon's delta §Related Repos, at a fixed
  SHA recorded in the run manifest: run the checker with the adopter's own
  declared command; record pinned version versus current, CI presence,
  whether the check is a required status check, branch protection state,
  and direct commits to `main` after the adoption date.
- **Ledger.** From the GitHub REST API (no GraphQL), for PRs merged in a
  fixed window: declared level and label, author type (human or agent, by
  commit trailer and PR body markers), number and timing of human reviews,
  time to merge, downward reclassifications. The claim under test is the
  canon's stated goal that human attention goes to semantic work.
- **External baseline (stretch).** Sample repos from the Galster et al.
  configuration dataset that carry agent configuration files, and count
  how many declare any equivalent of a level, a merge rule or a decision
  record. This places the canon against what practitioners do, not only
  against standards.

### 3.5 E5: Memory-bank fidelity (optional)

Only if E1–E4 are on schedule. Design in the landscape note §4. Model,
harness version and prompts are pinned; each condition runs at least five
times; outputs are scored by operation label, not by text similarity.

## 4. The harness

Built as code, not prompts. The harness is a tool, so by §Repository
Areas it belongs to neither plane, and this repo has no `src/`. The
proposed home is `plugin/scripts/study/`, beside the checker it exercises:
it can reuse the checker's parsing, and the checker's existing `HARD_DENY`
on `plugin/**` keeps it out of the L0 lane. The cost is that it ships
inside the plugin payload to every adopter. Because a new code location is
a layout decision, the owner settles it (open question 5) before the build
starts. Outputs go to `docs/research/standards-benchmark/results/`.

| Command | Does | Determinism contract |
|---|---|---|
| `node plugin/scripts/study/score.mjs` | Validate catalog and coding files against the codebook; compute coverage, depth, κ, sensitivity variants; write `results/e1-*.csv` and a summary | Same inputs → byte-identical outputs; sorted keys; no timestamps in data files |
| `node plugin/scripts/study/govfault.mjs build` | Generate fixture repos for F1–F12 under a temp dir from fixed templates | Fixed author, dates and commit messages, so fixture SHAs are stable |
| `node plugin/scripts/study/govfault.mjs run` | Run the checker on every fixture and its clean control; write `results/e2-detection.csv` | Same as above |
| `node plugin/scripts/study/census.mjs --manifest m.json` | E4 census and ledger from a manifest of repos, SHAs and date window | Reads only what the manifest pins; records API responses to disk and can replay from them offline |

Requirements on the build:

- Plain Node, no dependencies, matching the checker.
- Tests in `plugin/scripts/study/*.test.mjs`, including a test that runs
  each command twice and compares outputs byte for byte.
- A run manifest written next to every result: canon SHA, harness SHA,
  input file hashes, Node version.
- The harness is L2 work and takes the normal PR and human review. It is
  delegated to OpenCode on the project VM and verified from a fresh
  checkout before review, per the owner's standing working rule.

## 5. Roles

| Role | Who |
|---|---|
| Lead, coder JC | Jason Cusati |
| Coder AK; owner of E5 and the memory-benchmark mapping | Atharva Kokane |
| Adjudicator | Chris Brown |
| Harness build | OpenCode on agents4research, briefed and verified by Claude |
| Pilot coding, drafting | Claude |

## 6. Threats to validity

- **Construct.** Paraphrased, clause-level rows flatten standards that are
  written for organizations, not repositories. The scope screen and the
  deployer framing rule (codebook §2) are the mitigation, and both are
  reported, so a reader can disagree with them.
- **Coder bias.** Two of the coders built or used the canon. Claude, which
  helped write the canon, does not count as a coder. The adjudicator did
  not build it.
- **Depth is not effectiveness.** A checked rule nobody runs is weaker than
  a specified rule everyone follows. E2 and E4 exist so that RQ2 is not
  answered by the depth scale alone.
- **Edition drift.** 12207:2026 is new and 29148 is under revision. Rows
  record which numbering was confirmed against which text.
- **Single portfolio.** All adopters belong to one owner. E4's external
  baseline is the only check on that, and it is a stretch goal.
- **Copyright.** No standard text is reproduced. Readers need licensed
  copies to verify clause-level coding.

## 7. Open questions

1. Venue and deadline. Not decided; the study is scoped so E1–E3 alone
   make a complete short paper.
2. Should the canon adopt the catalog as a standing self-assessment run on
   each release (an `audit` mode), or keep it as research only?
3. Should Scorecard be run directly on adopters in E4, rather than only
   coded as requirements in E1? It would add a second, independent measure
   of the security gap.
4. Does E5 belong in this paper or in Atharva's memory-track paper?
5. Harness location: `plugin/scripts/study/` (ships with the plugin), a
   separate study repository, or a newly declared slot here. This is a
   layout decision and belongs to the owner.

## 8. Related documents

- `docs/how-it-works/README.md`: derived view of the canon used to brief coders
- `docs/research/standards-benchmark/`: catalog, codebook, pilot coding, benchmark landscape
- `docs/paper/draft.md`: paper draft
- `llm/features/BACKLOG.md`: G-1 to G-3, and candidates G-5 to G-10
- `llm/specs/2026-09-18-human-verification-capability-design.md`: G-3, the gap E1 is expected to confirm
- `llm/specs/2026-10-01-harness-independence-audit.md`: the runtime coupling that limits E2 to the deterministic layer

## 9. Builder contract for the harness (ready to dispatch)

The harness is L2 work delegated to OpenCode on the project VM. This is the
contract, written to the Universal Bounded-Contract Skeleton
(`llm/governance/patterns/prompt-patterns.md`). It is **not dispatched**
until the owner settles open question 5; `<HARNESS DIR>` below is then
replaced with the chosen path (default proposal `plugin/scripts/study/`).

```text
ROLE: You are the Study Harness Builder (Specialist 1) for the
  standards-completeness study (issue #32), working in
  djjay0131/agentic-governance on branch feature/study-harness, cut from
  research/standards-completeness-study.

OBJECTIVE: A dependency-free Node harness that scores the E1 codings and
  runs the E2 fault-injection suite, producing byte-identical outputs on
  every rerun.

REQUIRED READING (before writing anything):
  llm/memory_bank/activeContext.md; this spec (§3.1, §3.2, §4);
  docs/research/standards-benchmark/coding-scheme.md;
  docs/research/standards-benchmark/benchmark-landscape.md §4 (F1-F12);
  plugin/scripts/README.md; plugin/scripts/governance-checks.mjs;
  plugin/scripts/governance-checks.test.mjs (test style to match).

REQUIRED SKILLS/WORKFLOWS: test-first. Write the determinism test and one
  failing fixture test before the code that satisfies them.

FILE CONTRACT:
  - You may create/edit ONLY: <HARNESS DIR>/**,
    docs/research/standards-benchmark/results/**,
    .github/workflows/ci.yml (to add the harness tests only).
  - You must NOT touch: plugin/scripts/governance-checks.mjs (import it or
    shell out to it; report defects, never fix them), anything under llm/,
    the catalog and coding CSVs, the paper.

DELIVERABLES:
  1. <HARNESS DIR>/score.mjs: validates requirements-catalog.csv and every
     coding-*.csv (columns, IDs match catalog 1:1, depth 0-5, evidence
     present for depth >= 1, scope values legal). Computes per source:
     rows, covered (depth >= 2), enforced (depth >= 4), depth histogram;
     for any two coders, unweighted kappa on scope and linear-weighted
     kappa on depth; the four sensitivity variants in spec §3.1. Writes
     results/e1-coverage.csv, results/e1-agreement.csv,
     results/e1-summary.md. With only coding-CL.csv present it must run
     and label every output PILOT.
  2. <HARNESS DIR>/govfault.mjs build|run: builds one git repo per fault
     F1-F12 plus a clean control each, in a temp dir, from fixed
     templates with fixed author, email and GIT_*_DATE so SHAs are stable;
     runs the checker in default, --layout and --l0 modes; writes
     results/e2-detection.csv (fault, mode, exit code, failing checks,
     expected catcher, match yes/no).
  3. results/manifest.json per run: canon SHA, harness SHA, sha256 of
     every input file, node version. No wall-clock timestamps in any
     data file.
  4. <HARNESS DIR>/*.test.mjs: runs each command twice and asserts
     byte-identical outputs; kappa against a hand-computed 2x2 and 6x6
     example; every clean control passes; F1-F6 are detected by the
     expected check.
  5. A README in <HARNESS DIR> with usage, following repo doc standards.

DEFINITION OF DONE: llm/governance/definition-of-done.md, Implementation
  Work. Plus: `node plugin/scripts/governance-checks.mjs --layout` passes,
  and the existing checker tests still pass.

CONSTRAINTS:
  - Not in scope: E3, E4, E5; any change to policy; any agent or LLM call.
  - Everything that is run is code; no step depends on a prompt.
  - If F7, F8 or F12 are unexpectedly detected, or any clean control
    fails, record it in the report as a finding. Do not adjust the
    fixture to make it pass.
  - Uncertain classification => semantic => human review.

GIT: Commit to feature/study-harness and push that branch. Do not open a
  PR, do not merge, never touch main. Claude verifies from a fresh clone,
  then opens the draft PR declaring L2.

FINAL REPORT: files delivered; test output pasted verbatim; the
  e1-summary.md and e2-detection.csv produced on the pilot data; any
  checker defect found; open questions for the owner.
```

Verification before the PR (Claude, from a fresh clone, not from the
builder's report): rerun every command twice and diff the outputs; recompute
two kappa values by hand; confirm each clean control passes and each of
F1–F6 fails on the named check; confirm no file outside the file contract
changed.
