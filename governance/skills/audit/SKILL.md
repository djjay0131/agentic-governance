---
name: audit
description: Audit the current repo's compliance with agentic-governance - delta freshness, version pinning, ADR coverage, orphan decisions, branch protection, label taxonomy (incl. gov-levels), PR level declarations, L0 allowlist format, steward activation consistency, governance checks, memory-bank currency. Produces a findings report; fixes only on request.
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
   between). For deltas pinned to v0.2+, verify the v0.2 fields exist:
   memory-bank path, roadmap path, governance check command, L0 Path
   Allowlist, Platform Enforcement Reality, Steward Activation Status.

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

4. **Governance levels.** Recent PRs (`gh pr list --state all --limit 15`):
   does each declare exactly one governance level in its body and carry
   exactly one `gov-L0`…`gov-L3` label, and do they match? Any PR titled
   `L0:` without a certification block? Any L0-labeled PR touching paths
   outside the delta's allowlist?

5. **L0 allowlist + steward activation.** The delta's fenced
   `l0-allowlist` block parses (every `allow` line has a valid shape;
   globs well-formed). Steward Activation Status is consistent:
   - INACTIVE ⇒ no steward-merged (`L0:`-titled, non-human-merged) PRs
     exist after adoption;
   - ACTIVE ⇒ the delta cites both an activation ADR (which exists,
     Accepted) and a human-approved activation PR (which exists and was
     merged by the human owner). ACTIVE without both references is a
     **blocking** finding.

6. **Governance checks.** If the delta declares a governance check
   command, run it (default mode) and report failures. Flag a declared
   command that does not run, and a missing declaration on a repo that has
   ADRs (should-fix).

7. **GitHub surface.** PR template (with the governance-level declaration
   as the first section), issue templates, CODEOWNERS, CONTRIBUTING
   (pointer-first, no local policy) exist. Branch protection on `main`
   matches `docs/branch-protection.md` or the delta's Platform Enforcement
   Reality honestly records why not
   (`gh api repos/{owner}/{repo}/branches/main/protection`). Label taxonomy
   instantiated (`gh label list` vs `docs/labels.md` + delta milestones +
   the four `gov-L*` labels).

8. **Memory-bank currency.** Memory bank exists at the delta's declared
   path; `activeContext.md`/`progress.md` last-modified dates are not
   stale relative to recent merges (flag if the bank predates the last 5
   merged PRs).

9. **Documentation standards.** Major docs carry Status, Last-updated, and
   Owner headers; statuses are from the canonical vocabulary; no repo doc
   restates canonical policy instead of citing it (consolidation
   principle).

## Report

Output a findings table ranked by severity (blocking / should-fix / note),
each with the file or setting, what is wrong, and the concrete fix. End
with an overall verdict: COMPLIANT / DRIFTING / NON-COMPLIANT, and offer to
fix the should-fix items.
