# How Complete Is Agent Governance? Benchmarking a Repository Governance Framework for Agentic Software Engineering Against Software Engineering and AI Standards

Status: Draft v0.1 (outline plus prose for sections that do not depend on results)
Last updated: 2026-11-09
Owner: Project owner
Study design: `llm/specs/2026-11-09-standards-completeness-study-design.md`
Venue: not chosen. Anonymize before any double-blind submission.

> **Reading guide.** Sections 1–4 and 6 are drafted. Section 5 holds the
> results structure with the single-coder pilot shown as a placeholder.
> Every pilot number is marked and will be replaced by the two-coder
> results. Nothing in §5 is a finding yet.

---

## Abstract (placeholder, written to the design)

Coding agents now write much of the code, documentation and design in some
repositories, and the teams using them have started to write governance
for them: who may merge what, which changes need a human, where decisions
must be recorded. These rule sets are new and mostly informal, and nobody
has asked how complete they are against the standards that software
engineering and AI governance already have. We study one such framework,
agentic-governance, which runs in [N] repositories. We describe its
internal workflow and identify fifteen points where it requires a human.
We then build a clause-level benchmark of 174 requirements from ten
sources, including ISO/IEC/IEEE 12207, ISO/IEC 42001, NIST SP 800-218 and
the NIST AI RMF, and code the framework against it for coverage and for
the depth at which each requirement is enforced. [Results: coverage X%,
enforced Y%, κ = Z.] A fault-injection suite of twelve governance
violations shows that [result], and replaying [M] real incidents from
agent-built repositories shows that [result]. The framework is strong on
decision records, change control and review, and weak on requirements,
security, measurement and risk. We release the catalog, codebook and
harness so other frameworks can be scored the same way.

## 1. Introduction

A repository that agents work in needs rules about agents. Most teams write
these as a context file: a `CLAUDE.md` or `AGENTS.md` that tells the agent
how to behave. Recent mining studies have started to catalog what those
files contain [Galster 2026a; Galster 2026b; Mohsenimofidi 2026]. A smaller
number of teams go further. They write governance: rules that bind the
humans as well as the agents, decide who may merge which change, and
require that decisions survive the chat session that produced them.

This raises a question the configuration studies are not designed to
answer. If a team adopts such a framework, what does it get, and what does
it still lack? Software engineering has standards for exactly the
activities these frameworks touch: life cycle processes (ISO/IEC/IEEE
12207), requirements (29148), architecture description (42010), reviews
and audits (IEEE 1028), configuration management (IEEE 828) and secure
development (NIST SP 800-218). AI governance now has its own: ISO/IEC 42001
for management systems, the NIST AI Risk Management Framework, and the SP
800-218A profile for generative AI. None of them was written with a coding
agent in mind. Most still apply, once you treat the agent as an AI system
the team *uses* rather than one it builds.

We take one framework that has been in use for several months across a
small portfolio of research and engineering repositories, and measure it
against all of these at once. The framework, agentic-governance, is
unusual in two ways that make it a good subject. It is explicit: policy is
written once, in versioned documents, with a per-repository contract that
binds it to local facts. And it is candid about its limits. Its own backlog
records three places where it governs one dimension exhaustively and the
next one over not at all.

We ask four questions.

- **RQ1.** How much of what the standards require does the framework address?
- **RQ2.** Where it does, how much is enforced by a check or a platform
  gate, and how much depends on an agent or a person following a rule?
- **RQ3.** Which violations does its deterministic layer catch, and would
  it have stopped real failures from agent-built repositories?
- **RQ4.** Do the repositories that adopted it conform, and does human
  review go where the framework says it should?

Our contributions:

1. A description of the framework's internal workflow, centered on the
   fifteen points where it requires a human (§3).
2. A re-runnable benchmark: 174 paraphrased, clause-identified
   requirements from ten sources, a scope screen with an explicit framing
   rule for AI governance standards, and a six-level depth scale that
   separates *mentioned*, *specified*, *procedural*, *checked* and
   *platform-enforced* (§4).
3. Measurements of coverage, depth, detection and practice for one
   framework (§5).
4. A gap agenda, proposed to the framework's backlog as
   candidates (§6).

## 2. Background and related work

**Agent configuration in the wild.** Galster et al. identify eight
configuration mechanisms across five agentic coding tools and analyze
their adoption in engineered GitHub projects [Galster 2026a]; a companion
dataset covers 4,738 repositories and 15,591 configuration artifacts
[Galster 2026b]. Related studies examine context files and context
engineering in open source [Mohsenimofidi 2026; Agent READMEs 2025]. These
works describe what developers write. They do not evaluate whether what is
written amounts to governance, or against what.

**Governance of agent memory.** Memory is where governance and capability
meet. GateMem frames shared memory written by several principals as a
governance problem and scores utility, access control and forgetting
jointly [Ren 2026]. MemOps evaluates memory as a lifecycle of explicit
operations rather than by final answers [Hao 2026]. ConsistencyGate gates
memory writes to stop contamination [ConsistencyGate 2026], and AgingBench
shows reliability decaying across sessions as memory state changes
[Zhu 2026]. A-TMA names "ghost memory", where superseded and current facts
coexist in a store [Shi 2026]. SSGM proposes decoupling memory evolution
from memory governance [Lam 2026]. These are directly relevant because the
framework we study ranks its memory bank above every other artifact,
including code.

**Verification evidence.** A body of work on SWE-bench shows that passing
tests can accept wrong patches and that weak tests inflate scores [refs to
verify from the benchmark-validity synthesis]. The same failure, a green
signal that does not prove the claim, appears in the framework's own
backlog as its largest open gap (G-3).

**Standards.** We use the editions current on 2026-11-09:
ISO/IEC/IEEE 12207:2026, 29148:2018, 42010:2022; IEEE 1028-2008 and
828-2012 (both Inactive-Reserved but still the reference texts); NIST SP
800-218 v1.1 with the v1.2 draft as sensitivity; SP 800-218A; NIST AI 100-1
(AI RMF 1.0); ISO/IEC 42001:2023; and the eighteen checks of OpenSSF
Scorecard v5 as an operational security baseline.

## 3. The framework

*Condensed from `docs/how-it-works/README.md`; the full description is the
artifact.*

agentic-governance has three layers. **Canon** is project-agnostic policy
in versioned Markdown. A per-repository **delta** binds it to local facts:
declared paths, the check command, what the hosting platform actually
enforces, and whether the AI merge lane is switched on. An **execution
layer**, packaged as a Claude Code plugin, supplies four role agents
(Chief Architect, Chief Reviewer, Chief Product Officer, Repository
Steward), three skills (`establish`, `audit`, `migrate`) and a
dependency-free check script.

Its central device is classification. Every change is one of four levels.
L0 covers fourteen narrowly defined bookkeeping categories that can be
verified as meaning-preserving from the diff alone. L1 (governance and
architecture), L2 (implementation) and L3 (product) are semantic and need a
human reviewer and a human merge. Unsure means semantic. Only a human may
lower a level.

L0 has its own lane. The Steward certifies a change, a separately run
auditor session audits it, and the check script verifies every changed path
against an allowlist read from the base branch, so a change cannot amend
the rules that judge it. The lane ships inert. A repository activates it
only through its own decision record and a human-merged pull request.
Canon has not activated it [census to report adopters], and records why in
its own delta:
every agent session uses the owner's token, so the platform cannot tell a
Steward merge from an owner merge.

Documents are split by role into a control plane (`llm/`) and a data plane
(`docs/`). The rule is installed into each repository's agent context files
because a popular planning skill otherwise writes specs into the data plane
by default.

**Human touchpoints.** We count fifteen places where the canon forbids an
agent from acting alone (Table 1 in the artifact). They cluster in four
groups: adoption (approving remote changes, accepting the plugin,
supplying intent), merge authority (all semantic merges; L0 merges unless
activated; activation and revocation), escalation (classification
disputes, every Steward escalation and auditor rejection, every layout
decision), and verification (the proposed rule that only a human may mark a
claim verified). [Figure 1: lifecycle with human gates.]

**Enforcement tiers.** The canon distinguishes, and we keep, four tiers:
platform gates installed at adoption; six deterministic checks; agent
procedures in the audit skill and the role charters; and convention. It
also publishes an honest-gaps list of what its checks cannot verify, which
we test in E2.

## 4. Method

### 4.1 Requirements catalog

We extracted 174 requirements from the ten sources at the granularity
each standard is organized by: 30 processes from 12207, 9 clauses from
29148, 8 topics from 42010, 8 review types and rules from IEEE 1028, 8
activities from IEEE 828, 19 practices from SSDF plus one draft practice,
9 tasks from SP 800-218A, 19 AI RMF categories, the 7 management-system
clauses and 38 Annex A controls of 42001, and the 18 Scorecard checks.
Each row is paraphrased, never quoted, and carries its clause or control
identifier and a note on whether the numbering was confirmed against the
standard's published structure.

### 4.2 Scope screen and the deployer framing

Each row is screened IN, PARTIAL or OUT for a repository-level framework.
For AI governance standards we apply one framing rule: the AI system is
the set of coding agents the project uses. The project is a deployer. Rows
about training data and model weights are out; rows about roles,
oversight, logging, intended use and suppliers are in.

### 4.3 Depth coding

Each in-scope row is coded on a six-level scale: 0 absent, 1 mentioned,
2 specified, 3 procedural (an agent skill or charter performs it), 4
checked (a deterministic check fails on violation), 5 platform (the
framework installs a gate). Coverage is depth ≥ 2; enforcement is depth ≥
4. The scale orders mechanization, not effectiveness, which is why E2 and
E4 exist. Two authors coded independently against a pinned commit after
calibration; a third author adjudicated. [κ to report.]

### 4.4 GovFault (E2)

Twelve fixture repositories, each with one seeded violation and a clean
control, are run through the check script in all three modes. Three
classes are seeded precisely because the canon says it cannot detect them,
so that the experiment tests the honest-gaps declaration as well as the
checks.

### 4.5 Incident replay (E3)

[Describe after the review period of the prior study ends. Two coders map
each prior incident to the rule that would have prevented or detected it,
and that rule's depth.]

### 4.6 Census and attention ledger (E4)

Adopting repositories at fixed SHAs: checker results, pin drift, CI and
required-check state, direct commits after adoption. From pull-request
history: level declared, reviews by level, L0 changes that still took
human time, downward reclassifications.

## 5. Results

### 5.1 RQ1 and RQ2: coverage and depth

> **PILOT, single coder (Claude), not a result.** Coverage by source over
> IN and PARTIAL rows: IEEE 828 75%, IEEE 1028 62%, ISO/IEC 42001 61%,
> 12207 60%, 42010 57%, SP 800-218A 40%, AI RMF 39%, 29148 22%, SSDF 21%,
> Scorecard 12%. Rows reaching depth ≥ 4: 11 of 151.

[Table 2: coverage and depth by source, two-coder.]
[Figure 2: depth distribution per source, stacked bars.]

Expected narrative, to be confirmed or rewritten: coverage is highest
where the framework was designed to act (decisions, change control,
review, AI roles and accountability) and lowest in requirements, security,
measurement and risk. Most coverage sits at *specified* or *procedural*.
Very little reaches a check or a gate.

### 5.2 RQ3: detection

[Table 3: fault × check detection matrix. Clean-control results.]
[Incident replay: prevented / detected / missed, with the rule and depth.]

### 5.3 RQ4: practice

[Table 4: census. Figure 3: share of human review time by level.]

## 6. Discussion

**Process without outcome, again.** The framework already knows its
pattern: it governs *placement*, *execution mode* and *workflow* in depth,
and each time found the adjacent dimension ungoverned. The pilot suggests
the pattern generalizes. The gaps are not random. They are the dimensions
that sit just outside the pull request: what the requirement was, whether
the build is secure, whether anything is measured, and what happens after
release.

**The authority inversion.** The memory bank sits at the top of the
framework's authority hierarchy and is written by agents through the L0
lane. Our depth coding treats that lane as strong, because it is
certified, audited and checked. But the checks verify *paths and diff
shapes*, not whether the memory entry is true. Whether the most
authoritative artifact in the repository is faithful is, today, a matter of
convention. This is where memory-governance benchmarks (§2) become a
governance instrument rather than a capability measure.

**What a standards benchmark cannot say.** A high coverage score would not
mean the framework is good, and a low one would not mean it is bad. 12207
and 42001 were written for organizations; a repository framework that
tried to satisfy all of them would be unusable. The value of the catalog is
that it makes omissions deliberate. Each gap can now be closed, or
declared out of scope with a reason.

[Gap agenda: G-5 security baseline, G-6 measurement, G-7 risk register,
G-8 agent provenance and supplier policy, G-9 release governance, G-10
incident response.]

## 7. Threats to validity

See the study design §6. In short: paraphrased rows flatten standards
written for organizations; two coders built or used the framework; depth
is not effectiveness; 12207:2026 is new and 29148 is under revision; every
adopter belongs to one owner.

## 8. Conclusion

[After results.]

## Data availability

Catalog, codebook, codings, fixtures and harness:
`docs/research/standards-benchmark/` in the agentic-governance
repository. [Archive DOI at submission.]

## References (working list; each to be verified and converted to BibTeX)

| Key | Reference | Status |
|---|---|---|
| Galster 2026a | M. Galster et al., *Configuring Agentic AI Coding Tools: An Exploratory Study*, AIware 2026, arXiv:2602.14690 | Located by search, 2026-11-09 |
| Galster 2026b | M. Galster et al., *A Dataset of Agentic AI Coding Tool Configurations*, AIware 2026, arXiv:2605.08435, doi:10.1145/3805760.3814922 | Verified, 2026-11-09 |
| Mohsenimofidi 2026 | S. Mohsenimofidi et al., *Context Engineering for AI Agents in Open-Source Software*, MSR 2026, arXiv:2510.21413 | From Galster 2026b reference list; verify |
| Agent READMEs 2025 | *Agent READMEs: An Empirical Study of Context Files for Agentic Coding*, arXiv:2511.12884 | From Galster 2026b reference list; verify authors |
| Ren 2026 | Z. Ren et al., *GateMem*, arXiv:2606.18829 | Verified |
| Hao 2026 | X. Hao et al., *MemOps*, arXiv:2607.12893 | Verified |
| ConsistencyGate 2026 | *ConsistencyGate*, arXiv:2607.22962 | Title verified; authors to add |
| Zhu 2026 | J. Zhu et al., *Your Agents Are Aging Too*, arXiv:2605.26302 | Verified |
| Shi 2026 | Z. Shi, Y. Tang, A. K. H. Tung, *A-TMA*, arXiv:2607.01935 | Verified |
| Lam 2026 | C. Lam et al., *Governing Evolving Memory in LLM Agents (SSGM)*, arXiv:2603.11768 | Verified |
| Standards | ISO/IEC/IEEE 12207:2026; 29148:2018; 42010:2022; IEEE 1028-2008; IEEE 828-2012; NIST SP 800-218 v1.1, 800-218r1 ipd, 800-218A; NIST AI 100-1; ISO/IEC 42001:2023; OpenSSF Scorecard v5 | Editions confirmed, 2026-11-09 |
