---
name: establish
description: Onboard the current repo onto agentic-governance - declare the repository layout, create the governance delta (including L0 allowlist, platform-enforcement reality, steward activation status), install the two-plane routing rule into CLAUDE.md and AGENTS.md, and create the ADR system, GitHub templates, gov-level labels, branch protection, governance-checks wiring, and memory-bank note. Never activates steward merge authority.
argument-hint: "[repo-path (default: cwd)]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# governance:establish

Onboard a repository onto agentic-governance. Work in the target repo
(argument, else cwd). The canonical governance repo is at
`~/code/agentic-governance` (clone from
`github.com/djjay0131/agentic-governance` if missing).

Announce each step. Ask the user before any GitHub-remote mutations
(repo creation, branch protection, labels).

**This skill never activates Repository Steward merge authority.** The
delta it writes always says `Steward Activation Status: INACTIVE`.
Activation requires a repo-local ADR plus a human-approved activation PR
(canonical `llm/governance/l0-fast-track.md` §Per-Repo Activation) —
offer to draft the ADR if the user asks, but never flip the status
yourself.

**Every path this skill writes to is declared, never hardcoded.** The
canon prescribes the shape
(`~/code/agentic-governance/llm/governance/project-operating-system.md`
§Repository Areas); the repo's delta binds the paths. Angle-bracketed
names below — `<constitution dir>`, `<governance dir>`, `<adr dir>`,
`<spec dir>`, `<plans dir>`, `<features dir>`, `<memory-bank path>`,
`<artifacts dir>` — always mean the value declared in step 2.

## Steps

1. **Preflight.** Confirm the target is a git repo (offer `git init` if
   not; default branch `main`). Read the canonical repo's `VERSION`.
   Then classify the repo and take the matching path:

   - **New adoption** — no governance delta anywhere. Continue at step 2.
   - **Upgrade** — a delta already under `llm/` (typically
     `llm/governance/governance-delta.md`), i.e. the v0.3 layout. Diff it
     against the current template instead of overwriting, and add any
     template sections it is missing — including `## Repository Layout`
     (step 2) and the v0.2 fields below.
   - **Migration** — a delta at `docs/governance-delta.md`, or an ADR
     directory at `docs/adr/`, or a `docs/superpowers/` tree. The repo is
     on the pre-v0.3 layout, which ADR-0001 reverses
     (`~/code/agentic-governance/llm/governance/adr/0001-llm-control-plane-docs-data-plane.md`).
     **Stop and say so.** This skill does not migrate a repo; migration
     is an L1+ change that needs its own issue, branch, and PR.
     **Point the user at `/governance:migrate`**, which does that work
     under those rules: on a branch, with `git mv` so history follows,
     merging rather than overwriting an existing memory bank, archiving
     superseded content rather than deleting it, and landing the moves
     and the version pin in one PR. Run it with `--plan` first; it
     prints the full move list and changes nothing.

   On a migration, tell the user what it entails before they choose:

   - Control-plane content moves out of `docs/` into the declared paths
     — the delta, ADRs, design specs, plans, roadmap, patterns. `docs/`
     keeps external material and derived views only.
   - Every inbound cross-reference is rewritten. Verify this with grep,
     not with the link check: `governance-links` strips inline code
     spans, and path references are conventionally backticked, so a
     stale path can survive a green CI run.
   - `docs/superpowers/` is deleted once its contents are relocated, and
     the routing rule (step 5) is installed **first**, so the tool
     cannot recreate it mid-migration.
   - The version pin and the file moves land in the same PR. A repo that
     bumps one without the other is in a state neither version
     describes.

   The safe subset this skill can do today for such a repo is steps 2
   and 5 — declare the layout, install the routing rule — both of which
   are additive and stop the drift from continuing. Offer that as the
   minimum, and `/governance:migrate` as the complete path. Never move
   files silently.

2. **Declare the repository layout.** Settle the paths before anything
   is created; every later step writes to them, and the routing rule in
   step 5 binds its destination table to them.

   Derive what the repo already shows — an existing `llm/` tree, a
   memory bank, a spec or plans directory, a published site under
   `docs/` (a Jekyll `_config.yml`, a Pages source, a `docs/index.md`).
   Interview the user for every slot you cannot derive, offering the
   canonical default:

   | Slot | Canonical default |
   |---|---|
   | Constitution directory (role charters) | `llm/constitution/` |
   | Governance directory | `llm/governance/` |
   | ADR directory | `llm/governance/adr/` |
   | Spec directory | `llm/specs/` |
   | Plans directory | `llm/plans/` |
   | Features directory | `llm/features/` |
   | Memory-bank path | `llm/memory_bank/` |
   | Artifacts directory (the data plane) | `docs/` |

   Record **only the slots this repo actually uses**. An absent slot is
   not a violation; an undeclared path is. Do not declare a slot the
   repo has no content for and no near-term plan to fill — the
   `--layout` check asserts that every declared path exists.

   If a proposed binding would put source-of-truth content under the
   artifacts directory, say so and walk Q1/Q2 with the user
   (§Repository Areas). The shape is canon; only the paths are the
   repo's to choose.

3. **Governance delta.** Copy
   `~/code/agentic-governance/llm/governance/governance-delta-template.md`
   to `<governance dir>/governance-delta.md`. Fill `## Repository
   Layout` first, from step 2 — delete the lines for slots this repo did
   not declare, and replace the bracketed defaults with real paths on
   the ones it did. Then fill the rest by reading the repo (README,
   memory bank, design specs) and interviewing the user for anything not
   derivable:
   - mission, design-authority document path (under `<spec dir>`),
     project principles, domain review questions, milestone labels,
     related repos;
   - **roadmap path** — control plane; the memory-bank path is already
     settled in step 2 and carried into this block;
   - **governance check command** (default:
     `node ~/code/agentic-governance/plugin/scripts/governance-checks.mjs --layout`;
     "none" if the user declines — note that this blocks any future fast
     track). `--layout` belongs in the recorded command, not just in the
     one-off run of step 9: without it the two-plane rule is documented
     and never enforced. It is additive to the default checks and
     composes with `--base`, `--delta`, and `--adr-dir`. If any declared
     path differs from the checker's defaults, the command must pass
     `--delta` and `--adr-dir` explicitly;
   - **L0 Path Allowlist** — instantiate the fenced `l0-allowlist` block
     with the paths declared in step 2; walk the user through each
     allow/deny rule;
   - **Platform Enforcement Reality** — verify, don't assume: check branch
     protection availability (`gh api
     repos/{owner}/{repo}/branches/main/protection` — a 403 on private
     free-plan repos means unavailable), whether checks can be required,
     and the token/identity model (shared owner token vs distinct
     identities). Record findings honestly;
   - **Steward Activation Status: INACTIVE** — always.
   Pin the governance version (`Governance: agentic-governance vX.Y`).

4. **Create the declared directories.** Create exactly the directories
   declared in step 2, and nothing else. Do **not** create a placeholder
   for an undeclared slot: git cannot track an empty directory, a
   `.gitkeep` misstates the repo's shape, and `--layout` asserts only
   declared paths. A directory that a later step fills (`<adr dir>` in
   step 6) may be created there instead. Never create
   `docs/superpowers/`.

5. **Routing rule — `CLAUDE.md` and `AGENTS.md`.** This is the control
   point, and the reason the rest of this skill holds. `obra/superpowers`
   writes design specs to `docs/superpowers/specs/` and plans to
   `docs/superpowers/plans/` by default; its own skills defer to user
   preference for spec location (`brainstorming/SKILL.md`) and plan
   location (`writing-plans/SKILL.md`), and rank `CLAUDE.md` / `AGENTS.md`
   above skills (`using-superpowers/SKILL.md`). A repo that declares an
   `llm/` layout and leaves that default unopposed gets
   `docs/superpowers/` recreated by the next brainstorming session.
   Install the rule now, before any design, planning, or brainstorming
   work happens here.

   Write the two blocks in §Routing Rule Blocks below into `CLAUDE.md`
   and `AGENTS.md`. Both files are tool-contract paths, so both sit at
   the repo root regardless of the declared layout. `AGENTS.md` stays a
   pointer — one copy of the rule, in `CLAUDE.md`.

   Emit them verbatim apart from two substitutions: bind every
   angle-bracketed name to the path declared in step 2, and **delete the
   destination-table rows for slots this repo did not declare**. In
   particular, keep the `docs/superpowers/` prohibitions literal — they
   name the tool's hardcoded default, whatever this repo calls its
   artifacts directory. The block names §Repository Areas as the source
   of truth that outranks it: it is canon's tool-facing instance, not a
   second copy of canon.

   **Merging — never clobber an existing file.**
   - Both blocks are delimited by
     `<!-- BEGIN agentic-governance: repository layout -->` and
     `<!-- END agentic-governance: repository layout -->`.
   - Markers present → replace what is between them, and nothing else.
   - File exists, markers absent → append the delimited block at the
     end. Leave every existing instruction byte-for-byte intact.
   - File absent → create it with the `#` heading shown and the
     delimited block.
   - If existing instructions contradict the block — a spec or plan
     output path under the artifacts tree, a different documentation
     root — do not edit or delete them. Show the user both, ask which
     binds, and resolve it back into step 2's declaration. A contradicted
     rule is not an override.

6. **ADR system.** Create `<adr dir>`, copy
   `llm/governance/templates/adr-template.md` from the canonical repo as
   `<adr dir>/0000-template.md`, and write `<adr dir>/README.md` (index +
   lifecycle summary). If the repo has existing durable decisions living
   only in specs or memory banks, list them as ADR back-fill candidates and
   offer to draft them.

7. **GitHub surface.** Create `.github/pull_request_template.md` from the
   canonical `llm/governance/templates/pr-template-template.md` — the
   governance-level declaration must be the first section. Create
   `.github/ISSUE_TEMPLATE/{feature,architecture-proposal,adr,research,documentation}.md`
   consistent with the canonical PR requirements (Problem, Motivation,
   Summary, Design decisions, Tradeoffs, Open questions, Related docs/ADRs,
   Memory-bank updates). Create `.github/CODEOWNERS` assigning the repo
   owner. Create `CONTRIBUTING.md` from the canonical
   `llm/governance/templates/contributing-template.md` (pointer-first; no
   local policy).

8. **Remote + protection (with user approval).** If no remote exists:
   `gh repo create <owner>/<name> --private --source . --push`. Then apply
   `llm/governance/branch-protection.md` rules to `main` via
   `gh api repos/{owner}/{repo}/branches/main/protection` (PRs required,
   approvals required, no force pushes/deletions, conversation resolution)
   — if the API returns 403, record that in the delta's Platform
   Enforcement Reality instead of failing. Instantiate the label taxonomy
   via `gh label create`: the canonical set
   (`llm/governance/labels.md`), the delta's milestones, **and the four
   governance-level labels `gov-L0`, `gov-L1`, `gov-L2`, `gov-L3`**
   (suggested colors: gray, blue, orange, red; descriptions from
   `llm/governance/labels.md`).

9. **Governance checks wiring.** Run the delta's governance check command
   in the target repo exactly as recorded in step 3 — including
   `--layout`, which confirms every path declared in step 2 exists and
   that nothing source-of-truth sits under `<artifacts dir>`. Fix broken
   links or ADR-index drift it reports, or record them as findings for
   the user. A `SKIP layout — NOT VERIFIED` line means the checker found
   no delta at the path it looked in: re-run with `--delta
   <governance dir>/governance-delta.md`. A green run that verified
   nothing is the failure this line exists to prevent.

   Then wire it to run continuously, not once. If the repo has a CI
   workflow, add (or confirm) a step running that same command on push
   and pull request; if it has none, offer to create
   `.github/workflows/ci.yml` doing so — checkout with `fetch-depth: 0`,
   since the diff-based checks compare against the base ref. Record the
   outcome in the report. Note that `--l0` mode stays dormant until the
   repo ever activates the steward.

10. **Memory bank.** The delta declares a `<memory-bank path>`, so that path
    must exist by the time this skill finishes. A delta pointing at a
    directory that was never created makes the delta false, and every check,
    agent and adopting plugin that reads it inherits the error.

    - **If the repo has a memory bank there**, append an adoption note to
      `activeContext.md` and `progress.md` (governance adopted, version,
      date, delta path).
    - **If it has none**, create the declared directory and seed it with at
      least `activeContext.md`, `projectbrief.md` and `progress.md`, each
      carrying the adoption note and a one-line statement of what belongs in
      it. Say plainly that these are stubs, then recommend the Constellize
      `memory:establish` workflow to populate them properly — as the next
      step, not as a precondition. Never leave the declared path empty on
      the grounds that some other plugin may fill it later.

    Do not declare a path you did not create.

11. **Report.** Summarize what was created — including the declared
    layout and the `CLAUDE.md` / `AGENTS.md` routing rule, noting whether
    each was created or merged into existing instructions — what needs the
    user (e.g. branch protection requires the remote or a paid plan), the
    ADR back-fill list, the platform-enforcement findings, and the first
    governed workflow reminder: from now on, Issue → Branch → Draft PR
    (with a governance-level declaration) → Review → Merge; no direct
    commits to `main`; steward merge authority remains INACTIVE until the
    repo passes its own activation ADR + PR.

## Routing Rule Blocks

Emitted by step 5. Substitute the declared paths; change nothing else.
The `#` heading and any line outside the `BEGIN`/`END` markers belong to
a newly created file only — when merging into a file that already
exists, write the marked region and nothing outside it.

`CLAUDE.md`:

```markdown
# CLAUDE.md

Instructions for AI agents working in this repository.

<!-- BEGIN agentic-governance: repository layout -->
## Repository layout: two planes

The source of truth for this rule is
`~/code/agentic-governance/llm/governance/project-operating-system.md`
§Repository Areas, and the decision behind it is
`~/code/agentic-governance/llm/governance/adr/0001-llm-control-plane-docs-data-plane.md`.
Where this file and §Repository Areas disagree, §Repository Areas
wins. The paths below are the ones this repo declares in
`<governance dir>/governance-delta.md` §Repository Layout.

The split is by **role**, not by authorship. Who wrote a document
decides nothing; what the document *does* decides everything.

**Control plane — the `llm/` tree.** Artifacts that govern, plan,
record, review, or operate this repository: governance policy and
the governance delta, role charters, workflows, prompts and skills,
design specs acting as design authority, implementation plans,
backlog and feature specs, the memory bank, ADRs, roadmaps,
execution patterns, and review and retrospective records.
Control-plane documents are sources of truth, and nothing downstream
is authoritative over them.

**Data plane — the artifacts tree (`<artifacts dir>`).** Project and
domain deliverables, external material, and derived views of
control-plane content: product and API documentation, project/domain
technical specifications and reference material, vendor and
third-party specifications, external proposals, research sources,
PDFs, diagrams, datasets, and published sites and generated views.
Nothing here governs how this repository is operated.

**No artifact that governs repository operation lives in the
artifacts tree, and any view placed there must name the `llm/`
document it projects.**

### Before you create any document: Q1, then Q2

**Q1 — Does this artifact control how the repository is governed,
planned, remembered, reviewed, or operated?** YES → control plane
(`llm/`). This is governance policy and the governance delta, role
charters, workflows, prompts and skills, design specs acting as
design authority, implementation plans, backlog and feature specs,
the memory bank, ADRs, roadmaps, execution patterns, and review and
retrospective records.

**Q2 — Otherwise: is it a project or domain deliverable, technical
reference, external source, specification, or generated project
documentation?** YES → the artifacts tree (`<artifacts dir>`). This
is product and API documentation, project/domain technical
specifications and reference material, vendor and third-party
specifications, external proposals, research sources, PDFs,
diagrams, datasets, and published sites and generated views. A
derived view of a control-plane document belongs here too, and must
name the `llm/` document it projects.

**Otherwise — do not invent a location.** Use the existing structure
the artifact plainly belongs to (`src/`, `tests/`, `.github/`), or
escalate to the Repository Steward.

If the answer to Q1 is unclear, treat the artifact as control plane.
Misfiling a source of truth as an artifact is the failure this rule
exists to prevent; the reverse is cheap to correct.

### Canonical destinations

| Content | Destination |
|---|---|
| Role charters, shared principles | `<constitution dir>` |
| Governance policy, the delta, patterns | `<governance dir>` |
| Architecture Decision Records | `<adr dir>` |
| Design specs, the design-authority document | `<spec dir>` |
| Implementation plans | `<plans dir>` |
| Feature specs and backlog | `<features dir>` |
| Memory bank | `<memory-bank path>` |
| Product/domain docs, external material, published views | `<artifacts dir>` |

ADRs are control plane: an ADR *is* the decision, not a report of
one. A published ADR index may be generated into the artifacts tree
as a derived view.

This repo declares only the paths it uses. An absent slot is not a
violation; an undeclared path is. If a document needs a home that is
not listed above, do not invent a path: use the existing structure it
plainly belongs to, or escalate to the Repository Steward.

### Tool-contract paths

Some paths are fixed by a tool or a platform rather than chosen by
this project. They sit outside both planes and are exempt. The class
is closed:

- `.github/` — workflows, issue templates, PR templates.
- `.claude-plugin/` — the marketplace manifest.
- The plugin payload root — whatever directory a marketplace
  `source` field points at.
- Root-convention files: `README.md`, `CHANGELOG.md`, `VERSION`,
  `CONTRIBUTING.md`, `LICENSE`, `CLAUDE.md`, `AGENTS.md`.

The exemption covers **location only**. A tool default is never
design authority. Where a tool writes control-plane content into the
artifacts tree, override the tool here and relocate the output.

### Output-location preferences (these override tool defaults)

These are the repository owner's standing **user preferences for
spec and plan location**. They take precedence over any skill's,
plugin's, or tool's default output path.

**Design specs and brainstorming output.** Write every design spec
to `<spec dir>/YYYY-MM-DD-<topic>-design.md`. **Never** write to
`docs/superpowers/specs/`, and never create a `docs/superpowers/`
directory.

**Implementation plans.** Write every implementation plan to
`<plans dir>/YYYY-MM-DD-<feature-name>.md`. **Never** write to
`docs/superpowers/plans/`, and never create a `docs/superpowers/`
directory.

This applies to the `obra/superpowers` skills — `brainstorming`,
`writing-plans`, and anything downstream of them — and to any other
tool with a hardcoded documentation path. If a skill instructs you
to write a spec or a plan somewhere else, this preference wins:
create the document under `llm/` instead, and do not mirror or copy
it into the artifacts tree.
<!-- END agentic-governance: repository layout -->
```

`AGENTS.md`:

```markdown
# AGENTS.md

<!-- BEGIN agentic-governance: repository layout -->
See `CLAUDE.md`. It carries this repository's agent instructions —
the two-plane rule (`llm/` control plane, `<artifacts dir>` data
plane), the Q1/Q2 pre-write decision procedure, the tool-contract
exemption class, and the output-location preferences for design
specs and implementation plans.

This file exists because some tools read `AGENTS.md` rather than
`CLAUDE.md` (`obra/superpowers` `using-superpowers/SKILL.md` names
both). It restates no policy of its own; `CLAUDE.md` is the only
copy.
<!-- END agentic-governance: repository layout -->
```
