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
(`docs/l0-fast-track.md`; `constitution/shared-principles.md` §Operating
Rule).

## Required Status Checks

Add the project's CI checks as required once they exist (tests, lint, type
checks, markdown lint, security scans, AI evaluation tests as applicable).

## Local Developer Sync

After PRs are merged:

```bash
git checkout main
git pull origin main
```
