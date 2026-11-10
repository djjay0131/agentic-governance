# Benchmarks for evaluating a governance framework

Status: Draft
Last updated: 2026-11-09
Owner: Project owner
Design authority: `llm/specs/2026-11-09-standards-completeness-study-design.md`

There is no existing benchmark for "how good is a governance framework for
agentic software development." This note does two things. It triages
existing benchmark work, starting from Atharva Kokane's memory-benchmark
survey, for pieces that measure something the canon governs. Then it
defines the benchmarks we build ourselves.

## 1. Inputs reviewed

- Atharva's weekly notes (`soa-agentic-se/llm/human_notes/w1–w3-atharva-notes.md`)
  and the candidate list built from them,
  `soa-agentic-se/docs/research/agentic-memory/candidates-memory-benchmarks.csv`
  (57 rows, each with a verification status).
- The benchmark-validity synthesis
  `soa-agentic-se/docs/research/agentic-harnesses/consensus/q3-benchmark-validity.md`.
- Our own incident dataset of verification-evidence failures in
  agent-built repositories, from a prior study now under double-anonymous
  review. It is referred to here only as the *prior incident dataset*;
  details and a link follow after the review period (2026-12-08).

## 2. Why memory benchmarks matter here at all

The canon puts the memory bank at **rank 1** of its design-authority
hierarchy (`llm/governance/architecture-governance.md` §Design Authority
Hierarchy). It outranks ADRs and code. It is also written mostly by
agents: syncing it to merged work is an L0 category the Repository Steward
performs. So the most authoritative artifact in a governed repo is
maintained by the actors the governance exists to check. Whether those
writes are faithful is a governance question, and memory benchmarks are the
nearest existing instrument for it.

Most of Atharva's list measures recall or task success, which is a
capability question and not useful here. The rows below are the ones that
measure **write correctness, state over time, or governance of shared
memory**.

## 3. Triage of existing benchmarks

| Benchmark | What it measures | Governance question it can answer | Use | Verified |
|---|---|---|---|---|
| MemOps (arXiv 2607.12893) | Memory as a lifecycle of remember, update, forget and reflect operations, with gold operation traces and operation-level probes | Does a steward's memory-bank sync perform the right operation on the right entry, or only produce text that reads well? | **Adopt the scoring model** for experiment E5 (memory-bank fidelity) | Yes, searched 2026-11-09 |
| A-TMA / ghost memory (arXiv 2607.01935) | Old, current and transition facts coexisting in a memory bank and misleading answers | How often does `activeContext.md` keep a superseded decision beside the current one? | **Adopt the failure class** as a coded outcome in E5 | Yes |
| GateMem (arXiv 2606.18829) | Governance of shared memory written by several principals: utility, access control, active forgetting, scored jointly | Several agents and a human write one memory bank under different authority; does the lane structure keep writes in scope? | **Borrow the joint score** (utility × (1 − leakage) × (1 − forgetting failure)) as a template | Yes |
| ConsistencyGate (arXiv 2607.22962) | Write-time admission control to stop hallucinated facts entering memory ("contamination") | The L0 lane is a write-time admission gate for the memory bank; is it tighter or looser than a consistency gate? | Related work; comparison point for E5 | Yes |
| AgingBench (arXiv 2605.26302) | Reliability decay of long-lived agents: compression, interference, revision and maintenance aging | Does memory-bank currency (audit check 9) catch revision and maintenance aging, or only staleness by date? | Related work; adopt "revision aging" as a coded outcome | Yes |
| Galster et al. configuration dataset (AIware 2026, arXiv 2605.08435, DOI 10.1145/3805760.3814922) | 4,738 GitHub repos and their agent configuration artifacts | Sampling frame for an external baseline: how many agent-configured repos have *any* governance rules, and which? | **Use as sampling frame** for E4 baseline | Yes |
| MemoryAgentBench (arXiv 2507.05257) | Retrieval, test-time learning, long-range understanding, selective forgetting | Selective forgetting matches the "archive, never delete" rule | Related work only | Unchecked in Atharva's list |
| HaluMem (arXiv 2511.03506) | Hallucination introduced at memory extraction and update | Same question as ConsistencyGate, at operation level | Related work only | Unchecked in Atharva's list |
| SWE-bench validity literature (q3 synthesis) | Weak tests, leaked solutions and contamination inflate scores | Same failure as G-3: green evidence that does not prove the claim | Motivates E2 fault classes F7–F8 | Synthesis is lead-finder grade; cite primaries |
| Capability benchmarks (SWE-Bench Pro, SWE-Bench-CL, MemOp, CL-Bench, Exp-SWE-Agent) | Whether agents solve tasks | Not a governance question | **Exclude** | n/a |

Two cautions carried over from Atharva's file. Most rows are marked
`UNCHECKED` there; the six marked "Yes" above were checked against arXiv
listings today, the rest were not. And benchmark results in this area are
fragile (judge sensitivity, backbone dependence, saturation), so we borrow
**measurement designs**, not reported numbers.

## 4. Benchmarks we build

None of the above measures a governance framework itself. These five do.
Each is deterministic in the sense the study requires: fixed inputs, pinned
versions, code not prompts, byte-identical reruns. Experiment E5 is the one
exception and is marked as such.

| ID | Name | Measures | Input | Output |
|---|---|---|---|---|
| B1 | Standards Completeness Matrix | Coverage and enforcement depth against ten standards | `requirements-catalog.csv`, two independent codings | Coverage and depth per standard, κ, gap list |
| B2 | GovFault | Which governance violations the mechanical layer catches | Seeded fixture repos, one violation each, run through `governance-checks.mjs` and the deterministic part of `audit` | Detection matrix: fault class × tier |
| B3 | Adopter conformance census | Whether adopting repos actually conform | The eight adopters in canon's delta §Related Repos, at fixed SHAs | Per-check pass rate, pin drift, direct-commit counts |
| B4 | Human attention ledger | Whether human review goes where the canon says (semantic work only) | PR and review history of adopters via the GitHub REST API | Share of PRs per level, reviews per level, L0 that took human time, downward reclassifications |
| B5 | Incident replay | Whether canon v0.9.1 would have prevented or detected real failures | The prior incident dataset | Per incident: prevented / detected / missed, and by which rule |

### B2 fault classes (first cut)

| # | Seeded violation | Expected catcher | Tier |
|---|---|---|---|
| F1 | ADR status flip that also edits the decision text | `adr-status` | Checked |
| F2 | New ADR file with no index row | `adr-index` | Checked |
| F3 | Design spec written to `docs/superpowers/specs/` | `layout` | Checked |
| F4 | Declared path that does not exist | `layout` | Checked |
| F5 | L0 PR that also edits the delta's allowlist | `l0-paths` (read from base) | Checked |
| F6 | L0 PR with certification block but an unchecked declaration | `cert-present` | Checked |
| F7 | Link fix that swaps *which* document is referenced, same filename shape | none expected | Residual (auditor) |
| F8 | Checkbox ticked with no evidence (the G-3 failure) | none expected on main; G-3 slice in PR #31 | Residual |
| F9 | Direct commit to `main` | platform, where protection is on; `audit` check 3 after the fact | Platform / procedural |
| F10 | Governance check present in CI but not a required status check | `audit` check 6 | Procedural (G-2) |
| F11 | Memory bank older than the last five merges | `audit` check 9 | Procedural |
| F12 | Backticked path to a moved file (link check strips code spans) | none expected | Known blind spot, named in `establish` step 1 |

F7, F8 and F12 are included on purpose. The canon already says they are not
mechanically detectable; the benchmark should confirm the honest-gaps
declaration rather than only count successes.

### B5 coding

For each incident, two coders answer: which canon rule, if followed, would
have stopped it; at which depth that rule sits (scheme in
`coding-scheme.md`); and whether the incident happened in a repo that had
adopted that rule at the time. This turns the prior incident dataset into a test of
the canon instead of a description of agents.

### E5 (optional): memory-bank fidelity

Agent-in-the-loop, so not byte-deterministic. Take merged PRs from adopters
whose memory-bank update is known. Give a pinned model and harness the
pre-merge bank plus the PR, ask for the L0 sync, and score the result with
MemOps-style operation labels (correct add, update, archive; wrong target;
ghost entry left behind; contamination). Seeds, model and harness versions
are pinned and every run is logged, but outputs will vary, so results are
reported as distributions over repeated runs. This is where Atharva's track
plugs in directly.

## 5. Sources

- Atharva Kokane, weekly notes and candidate list, `djjay0131/soa-agentic-se`
- Hao et al., *MemOps*, arXiv:2607.12893
- Shi, Tang, Tung, *A-TMA*, arXiv:2607.01935
- Ren et al., *GateMem*, arXiv:2606.18829
- *ConsistencyGate*, arXiv:2607.22962
- Zhu et al., *Your Agents Are Aging Too* (AgingBench), arXiv:2605.26302
- Galster et al., *A Dataset of Agentic AI Coding Tool Configurations*, AIware 2026, arXiv:2605.08435
