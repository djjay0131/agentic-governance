# Governance Checks — Script Usage

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)

## Purpose

Documents `governance/scripts/governance-checks.mjs`, the canonical
lightweight check script cited by the L0 Fast-Track Policy
(`docs/l0-fast-track.md`, condition 9). The script mechanically verifies
the repo conventions that policy relies on; it is convention tooling, not
CI infrastructure. Policy itself lives in `docs/l0-fast-track.md` and
`docs/governance-levels.md` and is not restated here.

## Scope

Usage, check definitions, the allowlist parsing convention, and the honest
boundary between what is and is not mechanically enforced.

## How Adopting Repos Use It

The script operates on **the repository containing the current working
directory** (git toplevel), not on the directory holding the script. Keep
the canonical copy in agentic-governance and invoke it from any adopting
repo, or vendor a copy — either way, the delta's Governance Check Command
field records the exact invocation, e.g.:

```text
node ~/code/agentic-governance/governance/scripts/governance-checks.mjs
```

## Requirements

- Node.js (any recent version; plain `node:fs` / `node:path` /
  `node:child_process`, no dependencies).
- A local base ref (`git fetch origin main`) — the diff-based checks
  compare against it (`--base` overrides `origin/main`).
- A `docs/governance-delta.md` in the target repo carrying the fenced
  `l0-allowlist` block (`--delta` overrides the path) — required for
  `--l0` mode only.

## Usage

```bash
# Default mode — run on any branch, any PR:
node governance-checks.mjs

# Fast-track mode — required for L0 fast-track PRs (adds l0-paths and cert-present):
node governance-checks.mjs --l0 --cert-file pr-body.md
gh pr view <n> --json body -q .body | node governance-checks.mjs --l0

# Overrides:
node governance-checks.mjs --delta docs/governance-delta.md --adr-dir docs/adr --base origin/main
```

Exit code is 0 only when every check passes; each check prints
`PASS`/`FAIL` with per-failure detail lines.

## Checks

Default mode:

1. **governance-links** — every relative `.md` link in every tracked
   Markdown file resolves to an existing file. Anchors are ignored;
   external URLs, absolute paths, non-`.md` targets, links into
   `samples/`, and links inside code fences or inline code spans are
   skipped.
2. **adr-index** — every `<adr-dir>/NNNN-*.md` (excluding
   `0000-template.md`) has a row in the `<adr-dir>/README.md` index; the
   row's Status cell matches the first word of the file's `Status:` line;
   no index rows point at missing files. Skipped when the repo has no ADRs
   yet.
3. **adr-status** — every ADR's `Status:` line starts with one of
   Proposed / Accepted / Superseded / Deprecated; and any ADR whose Status
   changed vs the base ref while any other line in that file also changed
   is flagged (a status flip must be status-line-only to be L0). Newly
   created ADR files are not status flips and are exempt from the flip
   rule (their status validity is still checked); new ADRs are semantic
   (L1+) under the policy regardless.

`--l0` mode additionally runs:

4. **l0-paths** — every file changed vs the base ref must match an `allow`
   rule in the delta's `l0-allowlist` block, no `deny` rule, and no
   canonical hard-deny (below); the shape constraint declared on the
   matching `allow` rule is enforced on the file's diff.
5. **cert-present** — the PR body (from `--cert-file <path>`, else stdin)
   contains the `Administrative Change Certification` heading and all
   seven declarations, each present and checked (`[x]`).

## Allowlist Parsing Convention

`l0-paths` reads its rules from the target repo's governance delta so the
delta stays the single source of truth: a fenced code block whose info
string is `l0-allowlist`, containing one `allow <glob> <shape>` or
`deny <glob>` per line (shapes and semantics:
`docs/l0-fast-track.md` §L0 Path Allowlist). Blank lines and `#` comments
are ignored. Glob support is minimal by design: `**` (any path), `*` (any
non-slash run), `[...]` character classes. Deny rules are checked first.

Two security properties are preserved from the seed implementation:

1. **Base-ref allowlist read.** The block is read from the base ref
   (`origin/main`), never from the PR's tree, so an L0 PR cannot amend the
   allowlist that judges it. Bootstrap fallback to the working tree only
   when the base delta has no block, with a loud warning.
2. **Paired-diff shape constraints.** `checkbox-only` and
   `link-target-only` require every removed line to pair 1:1 with an added
   line identical except the toggled checkbox / the link target;
   `status-line-only` additionally requires the added Status line to match
   the constrained legal form (no free prose in the parenthetical).

Canonical hard-denies (enforced regardless of the block's content): the
governance delta itself, `.github/**`, `scripts/**`, `src/**`,
`constitution/**`, `llm/constitution/**`, and any file named
`governance-delta.md`, `architecture-governance.md`,
`project-operating-system.md`, `governance-levels.md`, `l0-fast-track.md`,
`review-checklist.md`, `definition-of-done.md`, `branch-protection.md`, or
`labels.md` anywhere in the tree.

Changing allowlist *membership* takes effect by editing the delta alone
(via a semantic, human-reviewed PR — the delta is deny-listed from L0);
adding a new *shape* requires a change to this script and to
`docs/l0-fast-track.md` together.

## What Is and Is Not Mechanically Enforced

Enforced: link integrity, ADR index/status consistency, status-flip
isolation, changed-path allowlisting with the diff-shape constraints
above, certification-block presence and checked declarations.

Not enforced (per the policy's Honest-Gaps Declaration in
`docs/l0-fast-track.md`, which governs): whether a change is actually
meaning-preserving; whether a cited PR really approved an ADR decision;
whether a link fix preserves *which* document is referenced (only that
paired lines differ solely in link targets); audit-session independence;
artifact ordering; and — on platforms where checks cannot be required —
anything at all as a hard gate. The script makes violations visible; the
Governance Auditor and human review carry the judgment. Each repo's delta
records its own platform's enforcement reality.

## Assumptions

- The base ref is fetched and current; diff-based checks are only as fresh
  as the local ref.
- ADR index rows keep the `| [NNNN](file.md) | Title | Status | Date |`
  shape.
- The target repo's delta carries the fenced `l0-allowlist` block before
  any fast-track merge is attempted (condition 9 fails safely otherwise).

## Open Questions

- Whether adopting repos should vendor the script (stable, but drifts) or
  invoke the canonical copy (fresh, but couples to a sibling checkout).
  Current recommendation: invoke the canonical copy and record the pinned
  governance version in the delta.

## Cross-References

- `docs/l0-fast-track.md` — the policy this script serves (conditions,
  allowlist, certification, honest gaps).
- `docs/governance-levels.md` — classification model.
- `docs/governance-delta-template.md` — the delta fields the script reads.
- `governance/agents/repository-steward.md` — steward duties, including
  running these checks.

---

# design-surface.mjs — Design Surface Generator + Audit

Status: Active
Last updated: 2026-07-22
Owner: Project owner (canonical governance)

## Purpose

Documents `governance/scripts/design-surface.mjs`, the generator and audit
library for the opt-in **Design Surface** capability
(`docs/design-surface.md`, `docs/adr/0001-design-surface-capability.md`).
Like `governance-checks.mjs`, it is a plain Node ES module with **zero
runtime dependencies** (`node:child_process`, `node:crypto`, `node:fs`,
`node:path`, `node:url` only) and is exercised entirely by the built-in
`node:test` runner (`node --test governance/scripts/test/*.test.mjs`) — no
test framework, no `npm install`.

It operates on the repository containing the current working directory
(git toplevel), not the directory holding the script, and only acts when
the target repo's `docs/governance-delta.md` carries a `## Design Surface`
block with `Status: ENABLED`. Undeclared or `DISABLED` repos are entirely
unaffected.

## What It Generates

Running the generator produces **Tier 1 only** — the deterministic,
mechanically-derived facts (ADR index, taxonomy inclusion, module map,
memory-bank/governance status, and a content-hash manifest). It never
produces Tier 2, the LLM-synthesized "what we built and why" narrative;
that is the job of the review-gated `/governance:publish-design-surface`
skill (`governance/skills/publish-design-surface/SKILL.md`), which calls
this generator for Tier 1 and then writes the cited narrative into a draft
PR that only a human merges.

## Usage

```bash
# Generate Tier 1 into the delta's declared output dir:
node governance/scripts/design-surface.mjs

# Overrides:
node governance/scripts/design-surface.mjs --delta docs/governance-delta.md --out docs/design
```

## Flags

- `--delta <path>` — path to the governance delta to read the
  `## Design Surface` declaration from. Default: `docs/governance-delta.md`.
- `--out <path>` — override the delta's declared `Output dir:` for where
  Tier-1 artifacts and the manifest are written.
- `--design-surface` — not a flag on this script's own CLI; this is the
  mode `governance-checks.mjs` exposes (see below) to run the advisory
  drift audit rather than the default L0/link/ADR checks.

Exit code is non-zero only when the projection rule is violated — a
declared source is missing (a "gap"). Gaps are always printed, never
silent, and never fabricated as content.

## `--design-surface` Audit Mode (in `governance-checks.mjs`)

```bash
node governance/scripts/governance-checks.mjs --design-surface
```

Non-blocking and self-contained: it does not run alongside the default
link/ADR checks, and it **always exits 0**. It recomputes the current
source hashes and compares them against the published manifest and the
Tier-2 narrative's stamped input hash, printing one line per outcome:

- `SKIP  design-surface (not declared)` / `(disabled)` — the block is
  absent or `Status: DISABLED`.
- `PASS  design-surface (fresh)` — no findings.
- `WARN  design-surface: <message>` — one per finding, of kind
  `missing-source` (a declared source is gone), `tier-1-out-of-date`
  (published Tier-1 hashes disagree with current sources — CI hasn't
  regenerated, or a generated file was hand-edited), or `stale-narrative`
  (sources changed since the Tier-2 narrative was last generated — the one
  that matters most; re-run `/governance:publish-design-surface`).

## Cross-References

- `docs/design-surface.md` — the canonical capability doc (two tiers, the
  projection rule, adoption steps).
- `docs/adr/0001-design-surface-capability.md` — the decision record.
- `docs/governance-delta-template.md` — the `## Design Surface` block
  fields (default `DISABLED`).
- `governance/skills/publish-design-surface/SKILL.md` — the Tier-2,
  review-gated skill that calls this generator.
- `docs/templates/design-surface-ci-template.yml` — reference CI workflow
  that runs this generator and publishes Tier 1 only.
