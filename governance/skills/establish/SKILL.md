---
name: establish
description: Onboard the current repo onto agentic-governance - create the governance delta (including L0 allowlist, platform-enforcement reality, steward activation status), ADR system, GitHub templates, gov-level labels, branch protection, governance-checks wiring, and memory-bank note. Never activates steward merge authority.
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
(canonical `docs/l0-fast-track.md` §Per-Repo Activation) — offer to draft
the ADR if the user asks, but never flip the status yourself.

## Steps

1. **Preflight.** Confirm the target is a git repo (offer `git init` if
   not; default branch `main`). Read the canonical repo's `VERSION`. Check
   nothing conflicts (existing `docs/governance-delta.md` means this is an
   upgrade — diff against the current template instead of overwriting, and
   add any template sections the delta is missing, including the v0.2
   fields below).

2. **Governance delta.** Copy
   `~/code/agentic-governance/docs/governance-delta-template.md` to
   `docs/governance-delta.md`. Fill it in by reading the repo (README,
   memory bank, design specs) and interviewing the user for anything not
   derivable:
   - mission, design-authority document path, project principles, domain
     review questions, milestone labels, related repos;
   - **memory-bank path** and **roadmap path**;
   - **governance check command** (default:
     `node ~/code/agentic-governance/governance/scripts/governance-checks.mjs`;
     "none" if the user declines — note that this blocks any future fast
     track);
   - **L0 Path Allowlist** — instantiate the fenced `l0-allowlist` block
     with the repo's real memory-bank and roadmap paths; walk the user
     through each allow/deny rule;
   - **Platform Enforcement Reality** — verify, don't assume: check branch
     protection availability (`gh api
     repos/{owner}/{repo}/branches/main/protection` — a 403 on private
     free-plan repos means unavailable), whether checks can be required,
     and the token/identity model (shared owner token vs distinct
     identities). Record findings honestly;
   - **Steward Activation Status: INACTIVE** — always.
   Pin the governance version (`Governance: agentic-governance vX.Y`).

3. **ADR system.** Create `docs/adr/`, copy
   `docs/templates/adr-template.md` from the canonical repo as
   `docs/adr/0000-template.md`, and write `docs/adr/README.md` (index +
   lifecycle summary). If the repo has existing durable decisions living
   only in specs or memory banks, list them as ADR back-fill candidates and
   offer to draft them.

4. **GitHub surface.** Create `.github/pull_request_template.md` from the
   canonical `docs/templates/pr-template-template.md` — the governance-level
   declaration must be the first section. Create
   `.github/ISSUE_TEMPLATE/{feature,architecture-proposal,adr,research,documentation}.md`
   consistent with the canonical PR requirements (Problem, Motivation,
   Summary, Design decisions, Tradeoffs, Open questions, Related docs/ADRs,
   Memory-bank updates). Create `.github/CODEOWNERS` assigning the repo
   owner. Create `CONTRIBUTING.md` from the canonical
   `docs/templates/contributing-template.md` (pointer-first; no local
   policy).

5. **Remote + protection (with user approval).** If no remote exists:
   `gh repo create <owner>/<name> --private --source . --push`. Then apply
   `docs/branch-protection.md` rules to `main` via
   `gh api repos/{owner}/{repo}/branches/main/protection` (PRs required,
   approvals required, no force pushes/deletions, conversation resolution)
   — if the API returns 403, record that in the delta's Platform
   Enforcement Reality instead of failing. Instantiate the label taxonomy
   via `gh label create`: the canonical set (`docs/labels.md`), the delta's
   milestones, **and the four governance-level labels `gov-L0`, `gov-L1`,
   `gov-L2`, `gov-L3`** (suggested colors: gray, blue, orange, red;
   descriptions from `docs/labels.md`).

6. **Governance checks wiring.** Verify the delta's governance check
   command runs in the target repo (`node .../governance-checks.mjs`
   default mode). Fix broken links or ADR-index drift it reports, or record
   them as findings for the user. Note in the report that `--l0` mode stays
   dormant until the repo ever activates the steward.

7. **Memory bank.** If the repo has a memory bank, append an adoption note
   to `activeContext.md` and `progress.md` (governance adopted, version,
   date, delta path). If it has none, recommend the Constellize
   `memory:establish` workflow before proceeding.

8. **Report.** Summarize what was created, what needs the user (e.g. branch
   protection requires the remote or a paid plan), the ADR back-fill list,
   the platform-enforcement findings, and the first governed workflow
   reminder: from now on, Issue → Branch → Draft PR (with a governance-level
   declaration) → Review → Merge; no direct commits to `main`; steward
   merge authority remains INACTIVE until the repo passes its own
   activation ADR + PR.
