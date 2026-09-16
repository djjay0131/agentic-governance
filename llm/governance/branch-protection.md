# Branch Protection

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)

## Purpose

This document describes recommended branch protection settings for adopting
repositories. Not every plan/platform can apply them (e.g., private
free-plan GitHub repos return 403 for branch protection); each repo records
what its platform actually enforces — verified, not assumed — in its
delta's Platform Enforcement Reality section, and the governance process
treats everything else as convention-enforced.

## Required `main` Rules

Protect `main` with:

- Require pull request before merging.
- Require approvals before merging.
- Dismiss stale approvals when new commits are pushed.
- Require review from CODEOWNERS when configured.
- Require conversation resolution before merging.
- Prevent force pushes.
- Prevent deletions.

## Merge Strategy

Recommended default: squash merge.

Rationale:

- Keeps `main` history clean.
- Preserves detailed discussion in PRs.
- Makes rollback easier.

## Direct Commits

Direct commits to `main` should be disabled except for emergency repository
repair.

## AI Agent Rule

AI agents may open draft PRs but must not merge their own PRs — with the
single exception of the Repository Steward's certified, independently
audited L0 fast track, where the repo has activated it
(`llm/governance/l0-fast-track.md`; `llm/constitution/shared-principles.md` §Operating
Rule).

## Required Status Checks

Add the project's CI checks as required once they exist (tests, lint, type
checks, markdown lint, security scans, AI evaluation tests as applicable).

## Branch Cleanup

**Set `delete_branch_on_merge: true` on every repository.** The PR lifecycle
already ends with "Branch deleted post-merge"
(`llm/governance/architecture-governance.md` §PR Lifecycle), but until the
platform does it, that clause depends on whoever merges remembering
`--delete-branch`. A rule enforced by memory is a rule that decays: every repo
in this portfolio had the setting off, and merged branches accumulated in all
of them.

Branch cleanup is **L0** (`llm/governance/governance-levels.md`, category 13).
It is administrative precisely *because* the platform does it automatically —
a human sweeping branches by hand is doing something else, and needs the rules
below.

### Deleting a branch by hand: classify by PR, never by commits

A **squash-merged branch always looks unmerged.** The squash commit on `main`
is not any of the branch's commits, so `git branch --merged` omits it and the
compare API reports `diverged, ahead=N`. Reading either as "unmerged" keeps
dead branches alive; reading `ahead=N` as "has unique work" is the mistake that
makes a cleanup look risky and stalls it.

The reliable discriminator is **the pull request**:

| Branch has | Meaning | Action |
|---|---|---|
| a **merged** PR | content is on the default branch, whatever the commits say | **delete** |
| an **open** PR | live work | keep |
| a PR **closed unmerged** | abandoned or superseded work; the branch is the only copy | keep unless the owner says otherwise |
| **no PR at all** | work that was never reviewed; the branch is the only copy | **never delete** — open a PR or ask |
| a declared long-lived role (`gh-pages`, a release branch) | infrastructure | keep; declare it in the delta |

The last two rows are why this is not a blind sweep. Deleting an unreviewed
branch destroys the only copy of work that no review ever saw — the one
outcome cleanup must never produce.

### Why the governance checks do not enforce this

`governance-checks.mjs` reads the working tree and local git only. Branch
state, PR state and repository settings are remote facts behind the API, and a
check that silently passed when it could not reach them would be worse than no
check (`CHANGELOG.md`, v0.6.0). `/governance:audit` reports stale branches
instead, because it can query the API — and it reports rather than deletes.

## Local Developer Sync

After PRs are merged:

```bash
git checkout main
git pull origin main
```
