# Coding scheme: governance coverage and enforcement depth

Status: Draft (v0.1, used for the single-coder pilot)
Last updated: 2026-11-09
Owner: Project owner
Design authority: `llm/specs/2026-11-09-standards-completeness-study-design.md` §4

This is the codebook coders apply to `requirements-catalog.csv`. One coder
produces one file, `coding-<initials>.csv`, with one row per catalog row.
Coders work independently and do not see each other's files until the
agreement step.

## 1. Unit of analysis

One catalog row: a requirement paraphrased from a named clause, practice,
category or control of a standard. The unit being judged is the canon of
agentic-governance at a pinned commit (`canon_ref`), meaning everything on
the default branch under `llm/governance/`, `llm/constitution/`,
`plugin/agents/`, `plugin/skills/`, `plugin/scripts/`, plus `README.md` and
`llm/features/BACKLOG.md`. Open PRs and unbuilt specs do not count toward
depth; they may be cited in `gap`.

## 2. Scope screen (done first)

Before coding depth, the coder confirms or overrides the catalog's
preliminary `scope` value.

| Value | Meaning |
|---|---|
| `IN` | A repository-level governance framework for human and AI-agent software work could reasonably be expected to address this |
| `PARTIAL` | Applies only in part, or only for some kinds of repository |
| `OUT` | Organizational, contractual, runtime-operational, or about training AI models |
| `DRAFT` | From an unfinalized standard; reported as sensitivity only |

**Framing rule.** For AI governance standards (ISO/IEC 42001, NIST AI RMF,
SP 800-218A), the "AI system" is the set of coding agents the project
*uses* to build software. The project is a deployer and user of AI, not a
developer of models. Requirements about training data and model weights are
therefore `OUT`.

## 3. Depth scale

Code the **highest** level at which the canon meets the requirement's core
obligation. If the canon meets only a narrower version (for example,
reviews code but not for security), code the level at which the stated
requirement is met and explain in `rationale`.

| Depth | Label | Test | Example |
|---|---|---|---|
| 0 | ABSENT | Nothing in canon addresses it | Vulnerability response (SSDF RV.1) |
| 1 | MENTIONED | Referenced, listed as a field or checklist word, or deferred to the delta, with no obligation or procedure | "Risks" field in agent handoffs |
| 2 | SPECIFIED | A normative rule (must, never, required) or a defined procedure, relying on people or agents to follow it | Change management steps in `architecture-governance.md` |
| 3 | PROCEDURAL | An executable skill or agent charter carries it out, step by step, when invoked | `establish` writing the delta; `audit` check 9 on memory-bank currency |
| 4 | CHECKED | A deterministic check (`governance-checks.mjs`) fails when it is violated, with no LLM involved | `adr-status` rejecting a status flip that edits other lines |
| 5 | PLATFORM | The framework installs a hosting-platform gate that blocks the violation | Branch protection installed by `establish` step 10 |

Notes on the scale.

- **3 and 4 are not strictly ordered in strength.** A deterministic check
  that runs only when someone types the command can be weaker than a
  charter an agent always loads. The scale orders *mechanization*, not
  effectiveness. Effectiveness is measured separately (study experiment E2).
- **5 counts where the framework installs it**, even if a particular repo
  could not enable it (free private repos, single maintainers). Record that
  caveat in `rationale`.
- **Covered** means depth ≥ 2. **Enforced** means depth ≥ 4.

## 4. Evidence rule

Every depth ≥ 1 needs an `evidence` pointer of the form
`<path> §<section>` or `<path> step <n>` that another coder can open.
Depth 0 needs a one-line `rationale` saying where the coder looked.

## 5. Tie-breaks

1. Two documents disagree: code the one higher in the canon's authority
   order (`llm/governance/architecture-governance.md` §Design Authority
   Hierarchy) and note the conflict.
2. A composite requirement (for example, ISO/IEC 42001 clause 9, which
   bundles audit, monitoring and management review): code the depth at
   which its **core obligation** (the process purpose, or the control
   title) is met, and name every absent part in `rationale` or `gap`. The
   stricter alternative, coding the weakest substantive part, changes
   results more than any other rule, so the study reports it as a
   sensitivity analysis.
3. When unsure between two adjacent levels, code the lower one. This
   mirrors the canon's own conservative default.

## 6. Files

| File | Who | Status |
|---|---|---|
| `coding-CL.csv` | Claude (single-coder pilot, canon `01c7d69`) | Done. Not a study result. |
| `coding-JC.csv` | Jason | To do |
| `coding-AK.csv` | Atharva | To do |

Agreement is weighted Cohen's κ on depth (linear weights) and unweighted κ
on scope, computed by the study harness. Disagreements go to an
adjudicator who has not coded.
