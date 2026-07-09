---
name: establish
description: Onboard the current repo onto agentic-governance - create the governance delta, ADR system, GitHub templates, labels, branch protection, and memory-bank note. Use when adopting governance in a new or existing repo.
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

## Steps

1. **Preflight.** Confirm the target is a git repo (offer `git init` if
   not; default branch `main`). Read the canonical repo's `VERSION`. Check
   nothing conflicts (existing `docs/governance-delta.md` means this is an
   upgrade — diff against the current template instead of overwriting).

2. **Governance delta.** Copy
   `~/code/agentic-governance/docs/governance-delta-template.md` to
   `docs/governance-delta.md`. Fill it in by reading the repo (README,
   memory bank, design specs) and interviewing the user for anything not
   derivable: mission, design-authority document path, project principles,
   domain review questions, memory-bank layout, milestone labels, related
   repos. Pin the governance version (`Governance: agentic-governance
   vX.Y`).

3. **ADR system.** Create `docs/adr/`, copy
   `docs/templates/adr-template.md` from the canonical repo as
   `docs/adr/0000-template.md`, and write `docs/adr/README.md` (index +
   lifecycle summary). If the repo has existing durable decisions living
   only in specs or memory banks, list them as ADR back-fill candidates and
   offer to draft them.

4. **GitHub surface.** Create `.github/pull_request_template.md` and
   `.github/ISSUE_TEMPLATE/{feature,architecture-proposal,adr,research,documentation}.md`
   consistent with the canonical PR requirements (Problem, Motivation,
   Summary, Design decisions, Tradeoffs, Open questions, Related docs/ADRs,
   Memory-bank updates, Review checklist). Create `.github/CODEOWNERS`
   assigning the repo owner. Create `CONTRIBUTING.md` from the canonical
   `docs/templates/contributing-template.md`.

5. **Remote + protection (with user approval).** If no remote exists:
   `gh repo create <owner>/<name> --private --source . --push`. Then apply
   `docs/branch-protection.md` rules to `main` via
   `gh api repos/{owner}/{repo}/branches/main/protection` (PRs required,
   approvals required, no force pushes/deletions, conversation resolution).
   Instantiate the label taxonomy (`docs/labels.md` + delta milestones) via
   `gh label create`.

6. **Memory bank.** If the repo has a memory bank, append an adoption note
   to `activeContext.md` and `progress.md` (governance adopted, version,
   date, delta path). If it has none, recommend the Constellize
   `memory:establish` workflow before proceeding.

7. **Report.** Summarize what was created, what needs the user (e.g. branch
   protection requires the remote), the ADR back-fill list, and the first
   governed workflow reminder: from now on, Issue → Branch → Draft PR →
   Review → Merge; no direct commits to `main`.
