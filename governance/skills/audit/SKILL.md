---
name: audit
description: Audit the current repo's compliance with agentic-governance - delta freshness, version pinning, ADR coverage, orphan decisions, branch protection, label taxonomy, memory-bank currency. Produces a findings report; fixes only on request.
argument-hint: "[repo-path (default: cwd)]"
allowed-tools: Read, Glob, Grep, Bash
---

# governance:audit

Audit a repository's governance compliance. Work in the target repo
(argument, else cwd). Canonical governance repo: `~/code/agentic-governance`.
This skill reports; it does not fix unless the user asks afterward.

## Checks

1. **Adoption + version.** `docs/governance-delta.md` exists, has all
   template sections filled (no placeholder brackets), and pins a
   governance version. Compare the pinned version against the canonical
   `VERSION`; flag drift and summarize what changed (CHANGELOG entries in
   between).

2. **ADR health.** `docs/adr/` exists with template and README index.
   Every ADR has Status/Context/Decision/Alternatives/Consequences.
   Superseded ADRs are marked both directions. Cross-check: do recent
   design docs, specs, or memory-bank entries record durable decisions
   that lack an ADR (orphan-decision scan — grep specs and
   activeContext/progress for decision language: "decided", "chose",
   "superseded", "instead of")?

3. **Workflow compliance.** Recent history on `main`
   (`git log --first-parent -20`): are commits merge/squash commits from
   PRs, or direct commits? Flag direct commits after the adoption date
   (grandfather anything before). Check open PRs for draft-first usage and
   template completion.

4. **GitHub surface.** PR template, issue templates, CODEOWNERS,
   CONTRIBUTING exist. Branch protection on `main` matches
   `docs/branch-protection.md`
   (`gh api repos/{owner}/{repo}/branches/main/protection`). Label taxonomy
   instantiated (`gh label list` vs `docs/labels.md` + delta milestones).

5. **Memory-bank currency.** Memory bank exists at the delta's declared
   layout; `activeContext.md`/`progress.md` last-modified dates are not
   stale relative to recent merges (flag if the bank predates the last 5
   merged PRs).

6. **Documentation standards.** Major docs carry Status and Last-updated
   headers; statuses are from the canonical vocabulary.

## Report

Output a findings table ranked by severity (blocking / should-fix / note),
each with the file or setting, what is wrong, and the concrete fix. End
with an overall verdict: COMPLIANT / DRIFTING / NON-COMPLIANT, and offer to
fix the should-fix items.
