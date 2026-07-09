# Branch Protection

Status: Active
Last updated: 2026-07-09

## Purpose

This document describes required branch protection settings for adopting
repositories.

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

AI agents may open draft PRs but must not merge their own PRs.

## Required Status Checks

Add the project's CI checks as required once they exist (tests, lint, type
checks, markdown lint, security scans, AI evaluation tests as applicable).

## Local Developer Sync

After PRs are merged:

```bash
git checkout main
git pull origin main
```
