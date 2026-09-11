# Governance Delta: [Project Name]

Status: Draft
Last updated: YYYY-MM-DD
Governance: agentic-governance v[canon's current minor — read it from canon's `VERSION`, do not copy a number from this template]

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

## Canon Location

Where the canonical `agentic-governance` repo lives, declared once. **This is
the only machine-specific path this repo is permitted to contain** — every
canon citation in `CLAUDE.md`, `AGENTS.md` and the check command below resolves
against it, so it changes in one place instead of a dozen.

- Canon checkout: [absolute or `~`-relative path, e.g. `~/code/agentic-governance`]
- Canon repository: `https://github.com/djjay0131/agentic-governance`
- Plugin registered: [`repo` (`.claude/settings.json`) | `user`
  (`~/.claude/settings.json`) | `no` — and if `no`, the
  `/governance:*` skills cannot be invoked here]

Skills and agents running as the installed plugin resolve canon from
`${CLAUDE_PLUGIN_ROOT}/..` and need none of this; the declaration exists for
everything that is read *without* the plugin loaded — static instructions in
`CLAUDE.md`, and a check command run from a plain shell.

**Deliberately not verified by `--layout`.** A canon checkout is
environment-specific: CI fetches canon into a runner temp directory and has no
such path, so asserting it would fail every CI run for a repo whose local
declaration is perfectly correct. Verify it yourself when you change it —
`ls <canon checkout>/VERSION`.

## Governance Check Command

[The exact command that runs the canonical governance checks against this
repo — e.g.
`node "${CLAUDE_PLUGIN_ROOT}/scripts/governance-checks.mjs" --layout` when the
plugin is loaded; from a plain shell, the same script under the
`Canon checkout` declared in §Canon Location above.

**Do not expand the checkout path here.** Reference the declaration instead.
Writing the literal path a second time re-creates exactly the duplication
§Canon Location exists to remove — the machine-specific value must appear in
**one** place per repo, and being twenty lines below the declaration does not
make a second copy one place. `grep -c` for it: the count should be 1.
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
