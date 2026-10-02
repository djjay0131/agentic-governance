# Governance Checks — Script Usage

Status: Active
Last updated: 2026-09-23
Owner: Project owner (canonical governance)

## Purpose

Documents `plugin/scripts/governance-checks.mjs`, the canonical
lightweight check script cited by the L0 Fast-Track Policy
(`llm/governance/l0-fast-track.md`, condition 9). The script mechanically
verifies the repo conventions that policy relies on; it is convention
tooling, not CI infrastructure. Policy itself lives in
`llm/governance/l0-fast-track.md` and `llm/governance/governance-levels.md`
and is not restated here.

This directory no longer holds one script. `governance-checks.mjs` is the
enforcement mechanism and everything from §Usage to §Assumptions below is
about it; the verification-surface generators that ship beside it are
described in §Other Scripts In This Directory.

## Scope

Usage, path resolution, check definitions, the allowlist parsing
convention, the honest boundary between what is and is not mechanically
enforced, and a short account of every other executable in this directory.

## How Adopting Repos Use It

The script operates on **the repository containing the current working
directory** (git toplevel), not on the directory holding the script. Keep
the canonical copy in agentic-governance and invoke it from any adopting
repo, or vendor a copy — either way, the delta's Governance Check Command
field records the exact invocation, e.g.:

```text
# as an installed plugin (portable — prefer this):
node "${CLAUDE_PLUGIN_ROOT}/scripts/governance-checks.mjs" --layout

# from a local checkout of this repo:
node <canon checkout>/plugin/scripts/governance-checks.mjs --layout
```

`--layout` belongs in the recorded command and in CI, not only in a one-off
onboarding run: without it the two-plane rule is documented and never
enforced. It is additive to the default checks and composes with `--base`,
`--delta`, and `--adr-dir`.

## Requirements

- Node.js (any recent version; plain `node:fs` / `node:path` /
  `node:child_process`, no dependencies).
- A local base ref (`git fetch origin main`) — the diff-based checks
  compare against it (`--base` overrides `origin/main`).
- A governance delta in the target repo (canonically
  `llm/governance/governance-delta.md`, `--delta` overrides the path)
  carrying the fenced `l0-allowlist` block — required for `--l0` mode only.

## Usage

```bash
# Default mode — run on any branch, any PR:
node governance-checks.mjs

# Layout mode — the two-plane rule (adds layout):
node governance-checks.mjs --layout

# Fast-track mode — required for L0 fast-track PRs (adds l0-paths and cert-present):
node governance-checks.mjs --l0 --cert-file pr-body.md
gh pr view <n> --json body -q .body | node governance-checks.mjs --l0

# Overrides:
node governance-checks.mjs --delta llm/governance/governance-delta.md --adr-dir llm/governance/adr --base origin/main
```

`--layout` and `--l0` are additive: each appends its checks to the default
set rather than replacing it.

Exit code is 0 only when every check passes; each check prints
`PASS`/`FAIL` with per-failure detail lines.

## Path Resolution

Paths are declared, not hardcoded. Where the target repo's delta carries a
`## Repository Layout` block (`llm/governance/governance-delta-template.md`
§Repository Layout), the script reads its paths from that block. Precedence:

1. A CLI flag (`--delta`, `--adr-dir`).
2. The delta's `## Repository Layout` declaration.
3. The canonical default — `llm/constitution/` (role charters),
   `llm/governance/` (governance), `llm/governance/adr/` (ADRs),
   `llm/specs/`, `llm/plans/`, `llm/features/`, `llm/memory_bank/`,
   `docs/` (artifacts).

The block is read from the working tree, and parsed defensively: a missing
delta, a missing or misspelled block, an unfilled `<placeholder>`, a
bracketed menu of options, or a `none` value all degrade to the defaults —
with a `WARN` line whenever a delta exists but declares nothing usable.
Parsing never crashes, and in default mode the block never fails a check by
itself; it is `--layout` that turns a declaration into an assertion — and
that refuses to report a bare `PASS` when there was no declaration to
assert (see check 4 below).

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

`--layout` mode additionally runs:

4. **layout** — the two-plane rule
   (`llm/governance/project-operating-system.md` §Repository Areas) made
   mechanical, in the minimum scope: (a) every path the delta's
   `## Repository Layout` block declares exists; and (b) no source-of-truth
   document sits under the declared artifacts directory — a file whose
   basename is a hard-denied policy document, an `NNNN-*.md` ADR number, or
   a `*-design.md` design document. An ISO-dated name (`2026-08-18-*.md`)
   is an ordinary artifact filename, not an ADR number, and is not flagged
   unless it also ends `-design.md`. A repo declares only the slots it uses:
   an absent slot is not a violation, an undeclared path is. Nothing is
   asserted about slots the delta does not declare, so a repo is never
   failed for a directory it has no content for.

   **This check never passes silently on nothing.** When no path is
   declared at all, the two causes are graded differently:

   - **No delta at the resolved `--delta` path** (typo, non-default
     governance directory, pre-v0.3 repo, or a repo like the canonical
     package that has no delta of its own) → `SKIP layout — NOT VERIFIED`,
     naming the path it looked for, and named again in the summary line.
     Exit code is unaffected: the checker cannot tell a mistyped path from
     a repo that legitimately has none. The artifacts scan still runs
     against the default artifacts directory, and any violation it finds
     still FAILs.
   - **A delta exists but binds no path** — no `## Repository Layout`
     block, or nothing usable parsed from it → `FAIL`. Since v0.3 the
     template always carries the block, so a delta that declares nothing
     is a governance defect the repo can fix itself.

`--l0` mode additionally runs:

5. **l0-paths** — every file changed vs the base ref must match an `allow`
   rule in the delta's `l0-allowlist` block, no `deny` rule, and no
   canonical hard-deny (below); the shape constraint declared on the
   matching `allow` rule is enforced on the file's diff.
6. **cert-present** — the PR body (from `--cert-file <path>`, else stdin)
   contains the `Administrative Change Certification` heading and all
   seven declarations, each present and checked (`[x]`).

## Allowlist Parsing Convention

`l0-paths` reads its rules from the target repo's governance delta so the
delta stays the single source of truth: a fenced code block whose info
string is `l0-allowlist`, containing one `allow <glob> <shape>` or
`deny <glob>` per line (shapes and semantics:
`llm/governance/l0-fast-track.md` §L0 Path Allowlist). Blank lines and `#`
comments are ignored. Deny rules are checked first.

Two security properties are preserved from the seed implementation:

1. **Base-ref allowlist read.** The block is read from the base ref
   (`origin/main`), never from the PR's tree, so an L0 PR cannot amend the
   allowlist that judges it. Bootstrap fallback to the working tree only
   when the base delta has no block, with a loud warning.
2. **Shape constraints on the diff.** Most shapes are *paired*:
   `checkbox-only` and `link-target-only` require every removed line to
   pair 1:1 with an added line identical except the toggled checkbox / the
   link target; `status-line-only` additionally requires the added Status
   line to match the constrained legal form (no free prose in the
   parenthetical).

   **`verification-marker` is deliberately not one of them.** A verification
   marker block is APPEND-ONLY (design §3.5: "Removal is a violation, and it
   is mechanically checkable"), so the shape permits added lines and refuses
   every removed or rewritten one — including the 1:1 replacement that every
   paired shape allows. Rewriting `— AGENT VERIFIED (PR #22, …)` into
   `— AGENT VERIFIED (PR #99, …)` is a legal paired diff and an illegal
   marker edit, and that difference is the whole reason the shape exists.
   It also refuses a `HUMAN VERIFIED` or `HUMAN REVIEWED` append, because an
   L0 diff is a lane where an AI role may merge and those two states are not
   an agent's to assert. Declaring `verification-marker` over a file
   therefore buys append-only enforcement and gives up in-lane checkbox
   flips on that file; `plugin/scripts/governance-checks.test.mjs` asserts
   both halves of that trade.

## Glob Parsing

Glob support is minimal by design: `**` (any path), `*` (any non-slash
run), `[...]` character classes. An unterminated `[` is an error, not a
guess: the glob is rejected and the check reports
`check error: unparseable glob (unterminated "[" character class)`.

`**/` matches **zero** or more path segments: `**/labels.md` matches both a
root-level `labels.md` and `llm/governance/labels.md`. Compiling it to a
form that required the slash was the same class of bug as `scripts/**`
never matching the nested `plugin/scripts/` payload — a repo keeping its
policy documents at the repository root escaped every basename hard-deny
below. A trailing `**` (`plugin/**`) is unaffected and still matches any
path beneath the prefix, not the bare prefix itself.

This is load-bearing, not cosmetic. A delta whose allowlist still carries a
bracketed placeholder — `deny [adr dir]/0000-template.md` parses as the
glob `[adr` — used to send `globToRegExp` into an infinite loop, so the
checker **hung** rather than failing. Manual regression repro (a scratch
repo, never this one):

```bash
mkdir /tmp/probe && cd /tmp/probe && git init -q . && git commit -q --allow-empty -m base
mkdir -p llm/governance
printf '```l0-allowlist\nallow llm/** link-target-only\ndeny [adr dir]/0000-template.md\n```\n' \
  > llm/governance/governance-delta.md
git add -A && git commit -qm delta
node <path-to>/governance-checks.mjs --l0 --base HEAD~1 --cert-file /dev/null
```

Expected, promptly: `FAIL l0-paths` with
`check error: unparseable glob (unterminated "[" character class): "[adr"`.
The accompanying `cert-present` failure and bootstrap `WARN` are expected
noise for a scratch repo. A hang is the regression.

## Canonical Hard-Denies

The code is authoritative: `HARD_DENY` in `governance-checks.mjs` is the
rule. The list below is a convenience copy, and must be updated in the same
change as the code — if the two ever disagree, the code wins and the prose
is the defect.

Enforced regardless of the delta block's content: the governance delta
itself (whatever path is declared), `.github/**`, `scripts/**`,
`plugin/**`, `src/**`, `constitution/**`, `llm/constitution/**` plus
whatever path the delta declares as its constitution directory, and any
file named `governance-delta.md`, `architecture-governance.md`,
`project-operating-system.md`, `governance-levels.md`, `l0-fast-track.md`,
`review-checklist.md`, `definition-of-done.md`, `branch-protection.md`, or
`labels.md` anywhere in the tree.

Two notes on the shape of that list, because both are easy to "simplify"
wrongly:

- **`plugin/**` is separate from `scripts/**`.** `scripts/**` matches only
  a top-level `scripts/` directory, so it never covered a nested payload
  such as `plugin/scripts/` — this check script was not hard-denied in its
  own repository until `plugin/**` was added. `scripts/**` stays, because
  adopting repos keep scripts at the top level.
- **`llm/governance/**` is deliberately *not* hard-denied.** It would
  swallow `llm/governance/adr/**` and silently kill the L0 lane for ADR
  status flips (`status-line-only`) and index-row regeneration
  (`index-table-rows`) — the two things the fast track exists to do. Policy
  documents are denied by basename instead, which keeps them denied wherever
  a repo declares its governance directory
  (`llm/governance/adr/0001-llm-control-plane-docs-data-plane.md` §Risks).

Changing allowlist *membership* takes effect by editing the delta alone
(via a semantic, human-reviewed PR — the delta is deny-listed from L0);
adding a new *shape* requires a change to this script and to
`llm/governance/l0-fast-track.md` together.

## What Is and Is Not Mechanically Enforced

Enforced: link integrity, ADR index/status consistency, status-flip
isolation, changed-path allowlisting with the diff-shape constraints
above, certification-block presence and checked declarations, declared
layout paths existing, and source-of-truth filenames under the artifacts
directory.

Not enforced (per the policy's Honest-Gaps Declaration in
`llm/governance/l0-fast-track.md`, which governs): whether a change is
actually meaning-preserving; whether a cited PR really approved an ADR
decision; whether a link fix preserves *which* document is referenced (only
that paired lines differ solely in link targets); audit-session
independence; artifact ordering; whether a document under the artifacts
directory is a source of truth when its *filename* does not say so (only
the policy, ADR, and `*-design.md` name shapes are recognized — the Q1/Q2
judgment stays human); and — on platforms where checks cannot be required —
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

## Other Scripts In This Directory

Everything above documents `governance-checks.mjs`. These ship beside it
and are separate programs with separate jobs. The capability they implement
is specified in
`llm/specs/2026-09-18-human-verification-capability-design.md`; section
numbers below refer to it.

- **`surface.mjs`** — the verification-surface generator. It reads a
  repository's declared claim source, its PDataset declarations and its
  evidence artifacts, and emits one `surface-manifest/v1` JSON document
  recording, per claim, the marker block, the state the marker asserts, the
  state the evidence can actually carry, and why the two differ. An asserted
  state above the evidence ceiling is **refused**, not annotated: that
  refusal is the determinism cap (§5.3 mechanism 4, §6.3), and it is what
  stops an agent promoting its own work. It executes every declared REPLAY
  and MODIFIED REPLAY through `replay.mjs` and derives each outcome from the
  child process's exit status, so a verdict is never a function of what an
  artifact says about itself. On a default run it also reads the manifest it
  is about to write as a **baseline** and compares every bound identifier of
  §5.5 — claim text, evidence hashes, dataset hashes, marker history — and
  **refuses to overwrite a baseline it has just contradicted**, so a drift
  cannot be laundered by re-running. Deterministic: two runs over unchanged
  inputs differ in `generated_at` alone, and `content_sha256` covers
  everything else. Usage: `node surface.mjs --root <dir>`; `--no-previous`
  for a genuine first run, `--no-execute` where a process cannot be spawned
  (it then refuses to produce any human state), `--replay-ledger <path>` for
  the timings, which are kept out of the manifest precisely so the
  determinism claim stays checkable.

- **`replay.mjs`** — the execution boundary. One job: run a declared command
  and return an execution record that says what actually happened
  (`executed`, `exit_status`, `outcome`, output hashes, a content-addressed
  `execution_id`). A command that cannot be run comes back
  `executed: false` with a stated reason and `outcome: null` — never a pass,
  never a silent skip. Because the command string is untrusted input read
  out of a file in the tree under audit, execution is bounded: no shell ever
  (`shell: false`), shell metacharacters refused rather than sanitized, the
  program allowlist is `node` alone, the script and every path-shaped
  argument must resolve inside the declared root after `realpath`, and the
  child runs under a timeout, a `maxBuffer` and a pruned environment. It is
  also a CLI:
  `node replay.mjs --root <dir> --command "node checks/x.mjs"`.

- **`surface-html.mjs`** — the projection, rendered for a human. Input is a
  `surface-manifest/v1` document; output is one self-contained static page
  with no script, no CDN, no webfont and no network at view time. It renders
  the exact REPLAY and MODIFIED REPLAY commands for the reader to run in
  their own shell; the page never executes them and never shows an outcome
  it did not read out of the manifest (§7.3, `Renderer: none`). A declared
  path absent on disk is rendered as a visible `MISSING ON DISK` gap marker
  and sets exit 1 — never a dead link presented as a live one. Two
  guardrails are enforced on the emitted bytes rather than asserted in
  prose: an absolute URL under `Pages mechanism: none`, or any `<script>` or
  inline event handler, makes the generator refuse to write the page at all.

- **`governance-checks.test.mjs`**, **`surface.test.mjs`** — the regression
  suites, both wired into `.github/workflows/ci.yml`. Plain Node, zero
  dependencies, temp dirs, non-zero exit on failure. `surface.test.mjs`
  builds a copy of `fixtures/slice/` per case, perturbs exactly one thing
  and runs the real generators over it; the committed fixture is never
  modified.

- **`fixtures/slice/`** — the synthetic mini-adopter `surface.test.mjs` runs
  against, with its own README (`governance-checks.test.mjs` builds its own
  throwaway git repositories instead and does not use it). Its `checks/ac04-transform-runs.mjs` is deliberately
  vacuous: it passes under its own perturbation, which is what a
  verification tool must be able to detect. Do not "fix" it.

## Cross-References

- `llm/governance/l0-fast-track.md` — the policy this script serves
  (conditions, allowlist, certification, honest gaps).
- `llm/governance/governance-levels.md` — classification model.
- `llm/governance/project-operating-system.md` §Repository Areas — the
  two-plane rule `--layout` enforces.
- `llm/governance/governance-delta-template.md` — the delta fields the
  script reads, including §Repository Layout.
- `plugin/agents/repository-steward.md` — steward duties, including
  running these checks.
- `llm/specs/2026-09-18-human-verification-capability-design.md` — the
  design the surface scripts implement (§3.4 marker grammar, §3.5
  append-only, §5.5 artifact invalidation, §14.1 determinism levels).
- `plugin/scripts/fixtures/slice/README.md` — the fixture, claim by claim.
