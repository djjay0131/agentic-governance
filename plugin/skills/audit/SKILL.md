---
name: audit
description: Audit the current repo's compliance with agentic-governance - delta freshness, version pinning, repository layout and the two-plane rule, ADR coverage, orphan decisions, branch protection, label taxonomy (incl. gov-levels), PR level declarations, L0 allowlist format, steward activation consistency, governance checks, memory-bank currency. Produces a findings report; fixes only on request.
argument-hint: "[repo-path (default: cwd)]"
allowed-tools: Read, Glob, Grep, Bash
---

# governance:audit

Audit a repository's governance compliance. Work in the target repo
(argument, else cwd). Canonical governance repo: `~/code/agentic-governance`.
This skill reports; it does not fix unless the user asks afterward.

Read the delta's `## Repository Layout` block first: every path below is
the one **this repo declares**, not a hardcoded one. Where a slot is
undeclared, fall back to the canonical default
(`llm/governance/`, `llm/governance/adr/`, `llm/specs/`, `llm/plans/`,
`llm/features/`, `llm/memory_bank/`, `docs/`) and record the missing
declaration as a finding (check 10). A repo declares only the slots it
uses: an absent slot is not a violation, an undeclared path is.

## Checks

1. **Adoption + version.** The governance delta (declared path, canonically
   `llm/governance/governance-delta.md`) exists, has all template sections
   filled (no placeholder brackets), and pins a governance version. Compare
   the pinned version against the canonical `VERSION`; flag drift and
   summarize what changed (CHANGELOG entries in between). For deltas pinned
   to v0.2+, verify the v0.2 fields exist: memory-bank path, roadmap path,
   governance check command, L0 Path Allowlist, Platform Enforcement
   Reality, Steward Activation Status. For v0.3+, additionally verify the
   `## Repository Layout` block exists and every path it declares resolves
   (`--layout` checks this mechanically).

2. **ADR health.** The declared ADR directory (canonically
   `llm/governance/adr/`) exists with template and README index.
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
   command, run it (default mode, and again with `--layout`) and report
   failures. Flag a declared command that does not run, and a missing
   declaration on a repo that has ADRs (should-fix).

7. **GitHub surface.** PR template (with the governance-level declaration
   as the first section), issue templates, CODEOWNERS, CONTRIBUTING
   (pointer-first, no local policy) exist. Branch protection on `main`
   matches canonical `llm/governance/branch-protection.md` or the delta's
   Platform Enforcement Reality honestly records why not
   (`gh api repos/{owner}/{repo}/branches/main/protection`). Label taxonomy
   instantiated (`gh label list` vs canonical `llm/governance/labels.md` +
   delta milestones + the four `gov-L*` labels).

8. **Memory-bank currency.** Memory bank exists at the delta's declared
   path; `activeContext.md`/`progress.md` last-modified dates are not
   stale relative to recent merges (flag if the bank predates the last 5
   merged PRs).

9. **Control-plane content under the artifacts directory.** The two-plane
   rule (canonical `llm/governance/project-operating-system.md`
   §Repository Areas): the artifacts directory holds project and domain
   deliverables, external material, and derived views — and **nothing that
   governs how the repository is operated**. Under the declared artifacts
   directory, every one of the following is a finding:
   - the governance delta, any ADR (`NNNN-*.md`), any `*-design.md` or
     other design-authority document, implementation plans, feature specs
     or backlog, memory-bank files, and repo-local counterparts of the
     canonical governance policy documents;
   - **any `docs/superpowers/**` path at all** — a tool default writing
     control-plane content into the data plane, which is the failure
     ADR-0001 exists to prevent. Its presence also means the repo's
     `CLAUDE.md` output-location override is missing or being ignored:
     report both.

   A derived view is legitimate only if it names the control-plane document
   it projects; an unattributed copy is a finding. Judgment beyond filename
   shape (Q1: does it control how the repository is governed, planned,
   remembered, reviewed, or operated? Q2: is it a project/domain
   deliverable, technical reference, external source, specification, or
   generated project documentation?) is the auditor's, not the checker's —
   `--layout` catches only the name shapes.

10. **Undeclared layout paths.** Every control-plane path in use is
    declared in the delta's `## Repository Layout` block. Compare the
    directories actually holding governance docs, ADRs, specs, plans,
    feature specs and the memory bank against the block; a path in use that
    the block does not declare is a finding, as is a declared path that does
    not exist (`--layout` flags the latter mechanically). Flag hardcoded
    paths in the repo's own docs, workflows, or skill instructions where the
    declared path should have been cited instead — that is how the layout
    drifted in the first place. Tool-contract paths (`.github/`,
    `.claude-plugin/`, the plugin payload root, root-convention files) are
    exempt and are not findings.

11. **Documentation standards.** Major docs carry Status, Last-updated, and
    Owner headers; statuses are from the canonical vocabulary; no repo doc
    restates canonical policy instead of citing it (consolidation
    principle).

## Report

Output a findings table ranked by severity (blocking / should-fix / note),
each with the file or setting, what is wrong, and the concrete fix. End
with an overall verdict: COMPLIANT / DRIFTING / NON-COMPLIANT, and offer to
fix the should-fix items.

Layout findings are reported, never silently fixed: relocating a document
between planes is a Q1/Q2 judgment about what the document *is*, which is
semantic. Route link repair and path corrections that follow an
already-approved relocation to the Repository Steward
(`plugin/agents/repository-steward.md`); route the relocation decision
itself to the human owner.

## Pre-v0.3 layout

If control-plane content still sits under `docs/` — a delta at
`docs/governance-delta.md`, an ADR directory at `docs/adr/`, or a
`docs/superpowers/` tree — this repo is on the pre-v0.3 layout that ADR-0001
reverses. Report it, and point at `/governance:migrate --plan`.

Do not attempt the moves from an audit. An audit reports; it does not restructure.
