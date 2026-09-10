# Governance Delta: agentic-governance

Status: Active
Last updated: 2026-09-10
Governance: agentic-governance v0.5

This file localizes the canonical governance in
[`agentic-governance`](https://github.com/djjay0131/agentic-governance) for
this project. In this repository the canon and the adopter are the same
tree: the policy this file defers to is the policy stored here. That is
deliberate — ADR-0001 decided the two-plane rule applies to this package
itself, and a rule the canon does not follow is not a rule. This file
declares project facts, never policy; changing it is semantic (L1) and it
is permanently deny-listed from the L0 fast track.

## Mission

The AI Engineering Operating System for this portfolio: how work is
planned, classified, executed, reviewed, decided, merged, and remembered,
by humans and AI agents alike. It ships as three layers — canonical
governance docs, a per-project delta contract, and an installable Claude
Code plugin.

It is **not** a product, a framework, or a library. It states policy once
and defers every project fact to the adopting repo's delta. It does not
duplicate specialist personas that the Constellize plugin already
provides.

## Design-Authority Document

`llm/governance/architecture-governance.md` — this package's own decision
control sits at rank 2 of the design authority hierarchy it defines
(§Design Authority Hierarchy). Capability-level design specs live in
`llm/specs/` and rank below it, as rank-4 detailed design.

## Project Principles

1. **Policy once, facts in the delta.** Canonical docs are
   project-agnostic by construction. A project fact appearing in canon is
   a defect.
2. **Declared, not hardcoded.** Canon prescribes shape; each repo binds
   paths in its `## Repository Layout` block. Nothing downstream hardcodes
   a path.
3. **The canon obeys its own rules.** Any rule stated here must hold in
   this repository first, and be mechanically checked here where it can
   be checked at all.
4. **A prose copy of an executable procedure is a defect.** Skills are
   the procedure; documentation cites them rather than restating them
   (`llm/governance/architecture-governance.md` §Documentation Standards).
5. **Merge authority is earned per repo, not shipped.** The L0 fast track
   ships inert everywhere, including here.
6. **Preserve history over tidiness.** Relocations use `git mv`; dated
   records describing where things *were* are never rewritten to match
   where they are now.

## Domain Review Questions

- Does this change state policy in canon that is actually a project fact
  belonging in an adopter's delta?
- If it adds or moves a path, is the path declared in §Repository Layout
  and bound through the layout slot table rather than hardcoded?
- Does it hold in this repository, and does `--layout` verify it here?
- If it changes a skill's behavior, does the skill remain the single
  statement of that procedure, with docs citing rather than restating it?
- Does it change what an *already-adopted* repo experiences on its pinned
  version, and if so is the version bump and CHANGELOG entry present?

## Repository Layout

The paths this repo binds. The canon prescribes the shape
(`llm/governance/project-operating-system.md` §Repository Areas); this
block binds it here.

- Constitution directory (role charters): `llm/constitution/`
- Governance directory: `llm/governance/`
- ADR directory: `llm/governance/adr/`
- Spec directory: `llm/specs/`
- Features directory: `llm/features/`
- Memory-bank path: `llm/memory_bank/`
- Artifacts directory (the data plane): `docs/`

Slots deliberately not declared: **Plans** and **Sprints**. This package
does not execute sprints, and its implementation plans are written into
the spec they implement rather than into a separate plans tree. An absent
slot is not a violation; if either practice changes, the slot is declared
before the directory is created.

Two paths in this tree are outside the slot table and intentionally so:

- `llm/session_notes/` — dated working notes from individual sessions.
  Control plane, but a journal rather than a governed artifact class; it
  has no canonical slot and needs none.
- `plugin/` — the Claude Code plugin payload. A tool-contract path whose
  shape is fixed by the plugin loader, not by this rule
  (`llm/governance/project-operating-system.md` §Repository Areas, the
  tool-contract exemption).

## Roadmap

Path: none. Direction is tracked as a feature catalog
(`llm/features/BACKLOG.md`) rather than a dated roadmap, because this
package ships on adopter demand rather than on a schedule.

## Governance Check Command

`node plugin/scripts/governance-checks.mjs --layout`

Run from the repository root — this repo *is* the checker, so it needs no
external path. `.github/workflows/ci.yml` runs exactly this on every push
and pull request. Cited by L0 fast-track condition 9
(`llm/governance/l0-fast-track.md`).

## L0 Path Allowlist

The fenced block below is an instance of the canonical rule set in
`llm/governance/l0-fast-track.md` §Template Allowlist, which also defines
the block grammar and the diff shapes (§L0 Path Allowlist). The check
command parses **this** block, and reads it from `origin/main`, never from
a PR's tree.

```l0-allowlist
# Instance of `llm/governance/l0-fast-track.md`
# §Template Allowlist — the source of this rule set and its grammar.
allow llm/memory_bank/** path-only
allow llm/governance/adr/README.md index-table-rows
allow llm/governance/adr/[0-9][0-9][0-9][0-9]-*.md status-line-only
allow llm/** link-target-only
allow docs/** link-target-only
deny src/**
deny scripts/**
deny .github/**
deny llm/governance/governance-delta.md
deny llm/governance/governance-delta-template.md
deny llm/governance/templates/adr-template.md
deny llm/features/BACKLOG.md
```

`plugin/**` and `llm/constitution/**` need no rule here: both are denied
unconditionally by the checker (`HARD_DENY`), because the plugin payload
is executable and the constitution is rank-1 authority. The template and
the feature catalog are denied explicitly — each declares itself L1 in
its own header, and the fast track must honor that.

## Platform Enforcement Reality

Verified against the GitHub API on 2026-09-10, not assumed:

- **Branch protection on `main`: partially configured.** Pull requests
  are required, force pushes and deletions are blocked, stale reviews
  dismiss, and conversation resolution is required. But
  `required_approving_review_count` is **0** and `enforce_admins` is
  **off** — so the owner can merge unreviewed, and an admin can still
  bypass the required check. The gate binds agents and ordinary flow; it
  does not bind the owner.
- **Required status checks: enabled** (2026-09-10). The `ci.yml`
  `governance-checks` job is a required context on `main`, non-strict
  (a PR need not be rebased onto the newest `main` to merge). A PR whose
  governance checks fail can no longer be merged. This is the one gate
  that is genuinely enforced by the platform rather than by convention.
- **Token/identity model:** all agent sessions authenticate with the
  owner's token. Chief Architect, Chief Reviewer, Chief Product Officer
  and Repository Steward are procedural roles, not distinct identities,
  and the platform cannot tell them apart.
- **Hardening path — what remains.** Two steps, both deliberately not
  taken:
  - `enforce_admins` → on. This would make the required check bind the
    owner too. Not taken yet because it also blocks the owner's own
    emergency path on a single-maintainer repo; it is the smaller of the
    two remaining gaps and the likelier next step.
  - `required_approving_review_count` → 1. **Blocked, not deferred.** A
    single-maintainer repo cannot supply a second approver, so a required
    review would deadlock every PR until either a second human or a
    distinct steward machine account exists. This is the same constraint
    recorded for the L0 fast track.

## Steward Activation Status

Status: INACTIVE

Steward merge authority ships inert
(`llm/governance/l0-fast-track.md` §Per-Repo Activation) and has not been
activated here. Activating it would require an activation ADR and a
human-approved, human-merged activation PR. Neither exists.

The original blocker is now gone: required status checks *are* enforced as
of 2026-09-10, so there is finally something for a fast-track merge to
certify against. What remains is the identity model — all agent sessions
authenticate with the owner's token, so the platform cannot distinguish a
steward merge from an owner merge, and a certified lane whose operator is
indistinguishable from the person it reports to certifies nothing. The
fast track stays inert until that is solved, not merely until the checks
turn on.

- Activation ADR: none
- Activation PR: none

## Milestone Labels

None. This package versions on adopter demand rather than by phase, so
`VERSION` and `CHANGELOG.md` carry the milestone story instead of GitHub
milestones.

## Special Labels

None beyond the canonical set. The canonical taxonomy
(`llm/governance/labels.md`), including `gov-L0`…`gov-L3`, is installed
here and is verified present.

## Constitution Adjustments

None. This repository is where the canonical charters live; a deviation
here would be a change to the charters themselves, not a delta.

## Related Repos

Adopters, in migration order. Authority flows one way — canon here,
facts there. No adopter's delta may override policy, and this repo never
depends on an adopter.

| Repo | Pinned | Layout |
|---|---|---|
| `agentic-kgcs` | v0.3 | migrated |
| `agentic-kg` | v0.5 | migrated (ADR-0002 there) |
| `agentic-kgis` | v0.2 | pre-v0.3, migration pending |
| `home-network` | v0.2 | pre-v0.3, no `llm/` tree yet |
| `baseball-ai` | none | never onboarded |

Adopters pin a version and upgrade deliberately. A change here reaches
them only when they bump their pin, which is what makes a breaking layout
change safe to ship.
