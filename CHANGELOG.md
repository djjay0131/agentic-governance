# Changelog

## 0.7.0 — 2026-09-10

### The package stopped hardcoding its own location
This package's second principle is **declared, not hardcoded**: canon prescribes
the shape, each repo binds paths in its delta, nothing downstream hardcodes a
path. It then hardcoded `~/code/agentic-governance` into thirteen places across
seven files, and `establish` wrote that literal into every repo it onboarded —
the routing rule in `CLAUDE.md`, and the delta's own check command.

On the machine this portfolio lives on, that path resolved **only because of a
symlink** (`~/code -> /mnt/c/code`) created by hand on 2026-08-21. Remove the
symlink and every canon citation in all eight adopting repos goes dead at once.

Two mechanisms replace it, because the two audiences differ:

- **Inside the plugin** — skills, agent charters, `scripts/README.md` — canon is
  now `${CLAUDE_PLUGIN_ROOT}/..`. The plugin ships from inside the canonical
  repo, so that resolves wherever it is installed, on any machine, with no
  declaration at all. `migrate` already did this for `VERSION`; nothing else had
  adopted it.
- **Written into an adopting repo** — `CLAUDE.md`, `AGENTS.md`, the recorded
  check command — cannot use an environment variable: they are static prose read
  when the plugin may not be loaded. These now cite canon by **repo-relative
  path**, resolved against a single declared `Canon checkout`, with the GitHub
  URL alongside so a human can always follow the reference.

### New: `## Canon Location` in the delta
Declares the canon checkout, the canon repository URL, and where the plugin is
registered. One machine-specific value per repo, in one place, instead of a
literal repeated through the routing rule and the check command.

**Deliberately not verified by `--layout`.** A canon checkout is
environment-specific — CI fetches canon into a runner temp directory and has no
such path, so asserting it would fail every CI run for a repo whose local
declaration is perfectly correct. Stated in the template rather than left as an
unexplained gap, since v0.6.0 was about checks that claim more than they verify.

### New in `establish`: register the plugin (step 8)
Writing the routing rule never made the skills reachable. A survey of the nine
repos found the marketplace registered in **one**; another had a
`.claude/settings.json` that registered other marketplaces and omitted this one;
seven had no file at all, and there was no user-level registration either. So
`/governance:establish`, `/governance:audit` and `/governance:migrate` were
uninvokable almost everywhere — this session's own agents reached them by
reading the SKILL.md files directly by path.

Registration is **by git URL, never by local path**, and **merges** into an
existing `.claude/settings.json` rather than replacing it: those files normally
carry other marketplaces and a populated `enabledPlugins`, and clobbering one
would silently disable the user's other plugins.

Steps 8–12 renumber to 9–13.

## 0.6.1 — 2026-09-10

### The checker printed "fatal:" on passing runs
`existsInBase` probes the base with `git cat-file -e` and handles the miss —
that is how it asks "did this file exist before?". But `execFileSync` both
captures stderr on the thrown error *and* inherits it to the parent, so every
file absent from the base leaked a bare
`fatal: Not a valid object name <base>:<file>` into the log. One adopting repo
was emitting roughly twenty of them on a **green** run.

The helper now pipes stderr. The text is still on `e.stderr` for real
diagnostics; it simply stops printing for predictable, handled probes. A check
that cries "fatal" while passing teaches people to stop reading its output,
which is a slower version of the same failure as passing while verifying
nothing.

Found by the agent onboarding `baseball-ai`, which had silenced it in that
repo's hand-rolled checker copy and could not fix it upstream from there.

### §Related Repos: `baseball-ai` is no longer un-onboarded
It adopted governance the same day the table was rebuilt, so the row was stale
within hours of being written. All eight adopters are now on the two-plane
layout.

## 0.6.0 — 2026-09-10

### Two silent defects in the checker itself
Both found by upgrading real repos, not by reading the code. Both meant the
checker printed `PASS` while verifying nothing — the failure mode the whole
package exists to prevent.

**The artifacts slot was never declarable.** `LAYOUT_SLOTS` matched labels by
unanchored substring, and `/plan/i` matched the delta template's own label
`Artifacts directory (the data plane)` — **"plane" contains "plan"**. Because
`readLayout` keeps the first declaration per slot and the template lists
`Plans directory` above `Artifacts directory`, the artifacts line was swallowed
and artifacts fell back to its default. Any repo declaring a non-default
artifacts directory had **the drift scan pointed at the wrong tree** and was
told PASS. In a delta with no plans line, the reverse happened: `plans` bound
silently to the artifacts path. Every pattern is now `\b`-anchored.

**`adr-index` and `adr-status` passed on a nonexistent ADR directory.**
`adrFiles()` returned `[]` and the empty set satisfied every assertion. Both
`agentic-kgis` and `mats-12-application` ran for weeks with both checks green
while the checker resolved its ADR directory to a path that did not exist —
`agentic-kgis` was hiding two broken ADR links and fifteen malformed index
rows behind it. Both checks now report a graded `SKIP` naming what was not
verified, matching how `--layout` already handled a missing delta.

### First tests for the checker
`plugin/scripts/governance-checks.test.mjs`, run in CI. Nine end-to-end
regression tests over throwaway git fixtures — the script has no main guard and
resolves its root from `git rev-parse`, so they invoke the real checker rather
than importing pieces of it. Each defect above is pinned, including the
`"Sprint plans directory"` → `sprints` ordering that the anchoring change could
otherwise have undone, and a positive case so the new guards cannot degrade into
a permanent SKIP.

### Closes three gaps v0.5.0 left behind
v0.5.0 added the Sprints slot to the delta template, `establish`'s layout
interview, `migrate`'s move plan and the `--layout` check — but not everywhere it
needed to go. Found while upgrading `fantasy-sports` from v0.3.

- **`<sprints dir>` was missing from `establish`'s placeholder list.** The
  skill's preamble enumerates every angle-bracketed name it substitutes;
  `<sprints dir>` was never added, so the one name the interview could newly
  collect was not declared substitutable.
- **The Sprints row was missing from §Canonical destinations.** That table lives
  *inside the `CLAUDE.md` routing block written into every adopting repo*. A repo
  that adopted the Sprints slot therefore got a routing rule that never named
  where sprint content goes — the slot existed in the delta and was invisible to
  the agent reading `CLAUDE.md`.

### New in `establish`: the execution-lessons file is actually created
Canon states in two places that each repo keeps its own evidence-backed lessons
in a local `<governance dir>/patterns/execution-patterns.md` **"seeded from"**
`execution-patterns-template.md`, and the CONTRIBUTING template points
contributors at it. Nothing ever created it. Every adopted repo has been citing
a file that does not exist.

`establish` now has step 7 for it, and **never overwrites an existing one** — that
file holds evidence a repo accumulated, which is exactly the content a
regenerating tool must not clobber. Steps 7–11 renumber to 8–12; internal
cross-references and the skill's frontmatter description were updated with them.

This is the same defect class as G-2 and as the drift ADR-0001 corrected: canon
prescribes, the tool does not install, and the audit cannot tell the difference.
Prescribing a file into existence is not the same as creating it.

## 0.5.2 — 2026-09-10

### PR responsibilities, the PR-before-review invariant, and a normative lifecycle
A governance correction that has been sitting unmerged since 2026-07-16 as
draft PR #3. It was opened against the pre-v0.3 `docs/` layout, so the v0.3
migration left it unrebasable, and the defects it fixes are still in canon
two months later: `### Project Owner / Chief Architect (human)` conflated the
human owner with the AI Chief Architect, and §Git Workflow still described the
PR flow as an actor-less nine-step list. Together those implied the repository
owner opens semantic PRs.

This forward-ports the original work to the current layout, unchanged in
substance:

- **Role de-conflation.** `Project Owner (human)` is now distinct from the AI
  Chief Architect, with merging, branch protection and repository
  administration named as owner responsibilities, and an explicit note that
  ownership does not make the owner the author of the PRs they merge.
- **Governance invariant.** Every semantic (L1–L3) change MUST exist as a PR
  before review can occur; therefore opening a draft PR is an *author*
  responsibility. Review is an act performed *on* a pull request.
- **PR Responsibilities.** Author / Reviewer / Repository Owner, each with its
  own list. In a solo project one person may wear several hats, but for L1–L3
  the author↔reviewer and reviewer↔merge separations are never collapsed.
- **PR Lifecycle (normative).** Task → Branch → Draft PR → Review → Fix loop →
  Approval → Merge, as a table attributing every stage to an actor. Replaces
  the actor-less list.
- Aligned wording in `project-operating-system.md` §5 and
  `templates/contributing-template.md` step 4, so the attribution propagates
  into every adopter's CONTRIBUTING by reference.

Framed as a patch, following the original PR's reasoning: the responsibility
split is made **explicit**, not newly introduced. The `v0.5` pin is unchanged,
so adopters inherit the correction by reference with no delta churn.

## 0.5.1 — 2026-09-10

### The canon now governs itself
This package published the two-plane rule, shipped a `--layout` check to
enforce it, and then ran that check against itself as a permanent `SKIP` — it
had no delta of its own, so there was nothing to verify. ADR-0001 decided the
rule applies to this repository too; that decision was stated but never
mechanically closed.

`llm/governance/governance-delta.md` closes it. This repo now declares its own
layout and `--layout` is a real assertion here: **4 of 4 checks pass** where it
previously reported 3 of 4 with one verifying nothing.

Two paths are documented as deliberately outside the slot table rather than
quietly ignored: `llm/session_notes/` (a dated journal, not a governed artifact
class) and `plugin/` (a tool-contract path whose shape the plugin loader owns).
The Plans and Sprints slots are declared absent, with the reason.

The delta's Platform Enforcement Reality section is verified against the GitHub
API, not assumed, and it records an uncomfortable fact: required status checks
are **not enabled**, so governance checks are advisory at the platform level and
mandatory only by convention.

### Fixed: new adopters were handed a three-version-stale pin
`governance-delta-template.md` still read `Governance: agentic-governance v0.2`.
Every repo onboarded since v0.3 copied that line, so a fresh adopter declared a
pin predating the layout rule it was being onboarded to. Now `v0.5`.

### Fixed: `/governance:migrate` was invisible
The whole of v0.4.0 appeared nowhere outside this changelog — not in the README,
not in `marketplace.json`, not in `plugin.json`. Anyone browsing the plugin could
not discover the skill that migrates their repo, and the README's advice on
pre-v0.3 repos still implied the move was purely manual. All four now name it.

## 0.5.0 — 2026-08-31

### Sprints get a canonical slot
The layout slot table had no home for sprint plans, so `/governance:migrate`
classified `construction/sprints/` as "control plane by nature, but with no
canonical slot" and left it where it was. That was the wrong conclusion from the
right observation: sprint plans record how work was executed and are control
plane by any reading. The gap was in the slot table, not in the content.

`Sprints directory` (default `llm/sprints/`) is now a declarable slot in the
delta template, `establish`'s layout interview, `migrate`'s move plan, and the
`--layout` check.

Ordering note: the slot matcher tests `sprints` **before** `plans`, so a label
like "Sprint plans directory" binds to sprints rather than being swallowed by
the `/plan/i` matcher.

Existing repos are unaffected — an undeclared slot is not a violation. A repo
adopts it by declaring the path and moving the content, which `migrate` now
proposes as a normal row rather than an exception.

## 0.4.0 — 2026-08-31

### New: `/governance:migrate`
`establish` has always *detected* a pre-v0.3 repo and stopped, correctly —
moving control-plane content is L1+ work needing its own issue, branch and PR.
But nothing then did the work, so every repo left on the old layout stayed there.

`migrate` does it under the same rules rather than around them:

- **History follows.** Every relocation is `git mv`, never copy-then-delete. The
  history of an old memory bank is usually the most valuable thing in it.
- **Content is preserved.** Existing entries are moved, never regenerated. Where
  an old file and a canonical file both exist they are merged under dated
  headings; a canonical file with no counterpart becomes a labelled stub rather
  than invented content.
- **Superseded material is archived**, with a dated note on what replaced it.
  Only `docs/superpowers/` is deleted, and only after relocation, per ADR-0001.
- **Branch and PR, never `main`.** The moves and the version pin land together.
- **`--plan` is the default** — it prints the full per-file move list and
  changes nothing until `--execute`.

It installs the routing rule *before* moving anything, so `obra/superpowers`
cannot recreate `docs/superpowers/` mid-migration, and it verifies reference
rewrites with `grep` rather than the link check — `governance-links` strips
inline code spans, so a stale backticked path survives a green CI run.

`establish` and `audit` now point at it instead of dead-ending.

## 0.3.1 — 2026-08-31

Two fixes found while testing `agentic-governance` composed with
`agentic-research` on repos with no remote.

### `governance-checks.mjs` no longer crashes without a remote
`adr-status` and the other diff-based checks ran `git diff --name-only
origin/main` with no guard. On a repo with no remote that emitted git's raw
`fatal: ambiguous argument 'origin/main'` to stderr and FAILed — a configuration
`governance:establish` itself records as a legitimate Platform Enforcement
Reality ("no remote — branch protection unavailable"). The plugin was failing a
setup it had just finished documenting.

The base ref now resolves through `origin/main` → `origin/master` → `main` →
`master` → the git empty tree, warning which one it settled on. An explicit
`--base` that does not resolve warns and falls back rather than crashing. A repo
that does have `origin/main` is unaffected and prints no warning.

### `establish` creates the memory bank it declares
Step 10 wrote a `<memory-bank path>` into the delta but only *recommended*
creating the directory, so a repo with no prior memory bank ended up with a
delta pointing at nothing. Every check, agent and adopting plugin that reads
that path inherited the error — and in practice a second plugin was backfilling
it, which puts the fix in the wrong repo.

`establish` now creates and seeds the directory when it is absent, and states
the rule plainly: do not declare a path you did not create. The Constellize
`memory:establish` recommendation stays, as the next step rather than a
precondition.

## 0.3.0 — 2026-08-18

Corrects the repository architecture: `llm/` is the control plane, `docs/`
is the data plane. Breaking — every canonical path moved.

- **The two-plane rule**: new `llm/governance/adr/0001-llm-control-plane-docs-data-plane.md`
  and a rewritten `llm/governance/project-operating-system.md` §Repository
  Areas — the control/data split, the pre-write decision procedure, and a
  closed exemption class for tool-contract paths (`.github/`,
  `.claude-plugin/`, the plugin payload root, root-convention files).
  §Repository Areas was previously the package's only statement of layout,
  and it named `docs/` as the home for design, architecture, product and
  roadmap documents — the inverse of the intended architecture.
- **Control-plane migration**: role charters to `llm/constitution/`, policy
  docs, templates and patterns to `llm/governance/`, ADRs to
  `llm/governance/adr/`, design specs to `llm/specs/`. `docs/` now holds
  only a README naming what belongs there.
- **Plugin payload renamed** `governance/` → `plugin/`, removing the
  collision with `llm/governance/`. The plugin's `name` is unchanged, so
  `/governance:establish` and `/governance:audit` still work; the
  marketplace `source` moved to `./plugin`, so installs need one re-add.
- **Repository layout is declared, not hardcoded**: new `## Repository
  Layout` block in `llm/governance/governance-delta-template.md`. The
  canon prescribes the shape; each repo binds the paths.
- **The routing rule propagates**: `/governance:establish` now installs it
  into each onboarded repo's `CLAUDE.md` and `AGENTS.md`. Its absence was
  the drift vector — onboarding installed `docs/`-shaped machinery and
  nothing opposing a tool's default output path.
- **The delta template no longer ratifies a vendor default.** Its
  Design-Authority Document field cited `docs/superpowers/specs/…` as the
  worked example, which promoted a third-party tool's hardcoded output path
  to rank-2 design authority in every adopting repo.
- **`/governance:audit` stops scoring the drift as compliance**: checks
  retargeted at declared paths, plus findings for source-of-truth content
  under the artifacts dir and for undeclared layout paths.
- **`governance-checks.mjs`**: new `--layout` check; reads paths from the
  delta's layout block (CLI flag > delta > default); `plugin/**` added to
  the hard denies (`scripts/**` only ever matched a top-level `scripts/`,
  so the check script was never denied in its own repo); fixed an infinite
  loop in `globToRegExp` on an unterminated `[`, and a temporal-dead-zone
  crash in layout parsing that would have affected every adopting repo.
- **L0 allowlist de-duplicated.** Two copies existed and had diverged;
  `llm/governance/l0-fast-track.md` is now the declared source and the
  delta template's block is a labelled instance, so drift is detectable.

### Migration for repos pinned at v0.2

Pins are by commit SHA, so nothing breaks until a repo bumps. To upgrade:
move `docs/governance-delta.md` → the declared governance dir and
`docs/adr/` → the declared ADR dir, add the `## Repository Layout` block,
re-express the L0 allowlist against declared paths, install the routing
rule into `CLAUDE.md`/`AGENTS.md`, and repoint the check command at
`plugin/scripts/governance-checks.mjs`. Verify cross-references by grep:
`governance-links` strips inline code spans, so it cannot see them.

## 0.2.0 — 2026-07-11

Generalizes a prior internal project's "Governance 2.0" into the canonical
framework.

- **Governance levels (L0–L3)**: new `docs/governance-levels.md` — the
  semantic vs non-semantic test, the conservative default, the closed
  14-category L0 list, mixed-level = highest, asymmetric escalation (AI
  up-only, human down-only), level-aware merge authority.
- **L0 fast track**: new `docs/l0-fast-track.md` — twelve conditions,
  Administrative Change Certification, ordered artifact chain,
  allowlist model (fenced `l0-allowlist` block, read from `origin/main`),
  honest-gaps declaration. **Per-repo activation (owner decision):**
  steward merge authority ships INERT everywhere; each repo activates via
  its own ADR plus a human-approved activation PR. `/governance:establish`
  never activates it.
- **Repository Steward**: fourth executive persona
  (`governance/agents/repository-steward.md`) with activation gate,
  escalation conditions, absolute prohibitions, PR-as-audit-trail.
  Chief Reviewer gains the Governance Auditor duty; shared principles gain
  the steward, the qualified single-exception merge rule, and
  "a superior's direction is never authority to cross a charter
  prohibition."
- **Workflow-selection policy**: Modes 1–3 (single agent / specialist
  team / ultracode dynamic workflow) with selection signals and the
  canonical Mode 3 invocation; four Non-Negotiables ("ultracode is an
  execution mechanism, NOT a governance bypass"); issue-scoped sprint
  rhythm; Governance-2.0 agent-contract field set (retaining Required
  skills/workflows and Definition of Done).
- **Pattern libraries**: `docs/patterns/prompt-patterns.md` (Universal
  Bounded-Contract Skeleton + eight project-agnostic patterns) and
  `docs/patterns/execution-patterns-template.md` (seeded lessons with
  per-repo evidence slots).
- **Governance checks**: `governance/scripts/governance-checks.mjs` —
  parameterized port that reads each repo's delta allowlist from the base
  ref and enforces paired-diff shape constraints; honest
  enforced/not-enforced boundary in `governance/scripts/README.md`.
- **Level-aware surfaces**: definition-of-done (level → checklist
  mapping), review-checklist (L1–L3 applicability), labels
  (`gov-L0`…`gov-L3`), new PR-template template (level declaration first),
  pointer-first contributing template, delta template v0.2 fields
  (roadmap/memory-bank paths, governance check command, L0 allowlist,
  Platform Enforcement Reality, Steward Activation Status).

## 0.1.0 — 2026-07-09

- Initial release: generalized from a prior internal project's governance system
  (project-operating-system, architecture-governance, constitution,
  definition-of-done, review-checklist, branch-protection, labels,
  ADR/design/feature/research templates).
- Added the delta-file model (`docs/governance-delta-template.md`) and
  version pinning.
- Added Claude Code plugin surface: chief-architect, chief-reviewer,
  chief-product-officer personas; `/governance:establish` and
  `/governance:audit` skills.
