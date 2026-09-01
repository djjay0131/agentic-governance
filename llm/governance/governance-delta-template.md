# Governance Delta: [Project Name]

Status: Draft
Last updated: YYYY-MM-DD
Governance: agentic-governance v0.2

This file localizes the canonical governance in
[`agentic-governance`](https://github.com/djjay0131/agentic-governance) for
this project. Canonical docs defer to this file wherever project specifics
are needed. Keep it short — durable design content belongs in the
design-authority document and ADRs, not here. This file declares project
facts, never policy; changing it is semantic (L1) and it is permanently
deny-listed from the L0 fast track.

## Mission

[One paragraph: what this project is and is not.]

## Design-Authority Document

[Path to the FDS or approved design spec that sits at rank 2 of the design
authority hierarchy, under the declared spec directory — e.g.
`llm/specs/YYYY-MM-DD-<topic>-design.md`.]

## Project Principles

[The non-negotiables reviewers protect. Numbered list. Examples from other
projects: "learning system first," "contracts first," "canonical IDs at
every write boundary," "rejections are data," "never lose raw source data."]

## Domain Review Questions

[Added to the canonical review checklist's Alignment Review section.]

- Does this ...?

## Repository Layout

The paths this repo binds. The canon prescribes the shape
(agentic-governance `llm/governance/project-operating-system.md`
§Repository Areas); this block binds it here, so nothing downstream
hardcodes a path. Declare only the slots this repo uses — an absent slot
is not a violation, an undeclared path is. Bracketed values are the
canonical defaults.

- Constitution directory (role charters): [`llm/constitution/`]
- Governance directory: [`llm/governance/`]
- ADR directory: [`llm/governance/adr/`]
- Spec directory: [`llm/specs/`]
- Sprints directory: [`llm/sprints/`]
- Plans directory: [`llm/plans/`]
- Features directory: [`llm/features/`]
- Memory-bank path: [`llm/memory_bank/` | `llm/memory-bank/` | other]
- Artifacts directory (the data plane): [`docs/`]

## Roadmap

Path: [e.g. `llm/master-roadmap.md`; "none" if the project has no roadmap
document yet.]

## Governance Check Command

[The exact command that runs the canonical governance checks against this
repo — e.g.
`node ~/code/agentic-governance/plugin/scripts/governance-checks.mjs --layout`.
Include `--layout` so the two-plane rule and the paths declared above are
enforced on every run, not only at onboarding; it is additive to the default
checks and composes with `--base`, `--delta`, and `--adr-dir`. Cited by L0
fast-track condition 9 (`llm/governance/l0-fast-track.md`). "none" until
wired up — which means no fast-track merge can occur here.]

## L0 Path Allowlist

The fenced block below is an instance of the canonical rule set in
agentic-governance `llm/governance/l0-fast-track.md` §Template Allowlist,
which also defines the block grammar and the diff shapes (§L0 Path
Allowlist). The check command parses **this** block, not that one, and
reads it from `origin/main`, never from a PR's tree. Replace every
angle-bracketed name with the path declared in §Repository Layout above;
delete rules that do not apply.

```l0-allowlist
# Instance of agentic-governance `llm/governance/l0-fast-track.md`
# §Template Allowlist — the source of this rule set and its grammar.
allow <memory-bank path>/** path-only
allow <adr dir>/README.md index-table-rows
allow <adr dir>/[0-9][0-9][0-9][0-9]-*.md status-line-only
allow <roadmap path> checkbox-only
allow llm/** link-target-only
allow <artifacts dir>/** link-target-only
deny src/**
deny scripts/**
deny .github/**
deny <governance delta path>
deny <adr dir>/0000-template.md
```

## Platform Enforcement Reality

[What the hosting platform actually enforces vs what is convention-only,
verified (not assumed) — e.g. via `gh api`. Cover at least:]

- Branch protection on `main`: [available/unavailable; configured rules]
- Required status checks: [available/unavailable]
- Token/identity model: [e.g. "all agent sessions authenticate with the
  owner's token — steward/auditor/architect are procedural roles, not
  distinct identities" | "steward has a dedicated machine account"]
- Hardening path: [what would convert convention into platform
  enforcement, and what blocks it]

## Steward Activation Status

Status: INACTIVE

[Steward merge authority ships inert (agentic-governance
`llm/governance/l0-fast-track.md` §Per-Repo Activation). To activate, record here:]

- Activation ADR: [llm/governance/adr/NNNN-....md — required]
- Activation PR: [#n, human-approved and human-merged — required]

## Milestone Labels

- `phase-0-...`
- `phase-1-...`

## Special Labels

[Domain-specific labels beyond the canonical set, if any.]

## Constitution Adjustments

[Deviations from the canonical executive charters, if any. Prefer none.]

## Related Repos

[Sibling repos in this project's constellation and how authority flows
between them.]
