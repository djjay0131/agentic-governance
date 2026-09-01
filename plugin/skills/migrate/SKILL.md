---
name: migrate
description: Move a repo from the pre-v0.3 layout to the current one, preserving git history and existing content - relocate the governance delta, ADRs, specs, plans and memory bank into the declared control plane, rewrite every inbound reference, archive superseded material rather than deleting it, and land the moves and the version pin in one PR. Use when establish reports "Migration" and stops, or when a repo still keeps control-plane content under docs/.
argument-hint: "[repo-path (default: cwd)] [--plan | --execute]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# governance:migrate

`establish` classifies a pre-v0.3 repo as **Migration** and stops, because
moving control-plane content is L1+ semantic work that needs its own issue,
branch and PR. This skill does that work — under those same rules, not around
them.

## Non-negotiables

1. **History is preserved.** Every relocation is `git mv`. Never copy-then-
   delete: it detaches the file from its history, and the history is often the
   most valuable thing in an old memory bank.
2. **Content is preserved.** Existing memory-bank entries, ADRs and specs are
   *moved*, never regenerated. If a canonical file has no counterpart in the old
   layout, create it as a clearly-labelled stub — never write plausible content
   over a gap.
3. **Superseded material is archived, not deleted.** Anything genuinely obsolete
   goes to `<memory-bank>/archive/` with a dated note saying what superseded it.
   The only thing deleted outright is `docs/superpowers/` *after* its contents
   are relocated, per ADR-0001.
4. **Never on `main`.** Work on a branch and open a PR. A migration that lands
   as a direct push is the same violation the L0 fast track exists to prevent.
5. **`--plan` is the default.** Print the full move list and stop. Only
   `--execute` touches a file, and only after the user has seen the plan.

## Step 1 — Classify and refuse early

- Confirm a git repo, clean working tree (stop if dirty — a migration diff must
  be readable), and that you are **not** on `main`. Offer to branch:
  `governance/migrate-v0.3`.
- Confirm the repo really is pre-v0.3: a delta at `docs/governance-delta.md`, an
  ADR dir at `docs/adr/`, or a `docs/superpowers/` tree. If it is already on the
  current layout, say so and stop — this skill has nothing to do.
- Read the canonical `VERSION` from `${CLAUDE_PLUGIN_ROOT}/../VERSION`.

## Step 2 — Declare the target layout first

Run `establish`'s Step 2 layout interview (or read `## Repository Layout` from
the existing delta if it already has one). Nothing moves until every destination
is a declared path. Canonical defaults:

| Slot | Default |
|---|---|
| Governance directory | `llm/governance/` |
| ADR directory | `llm/governance/adr/` |
| Constitution | `llm/constitution/` |
| Specs | `llm/specs/` |
| Plans | `llm/plans/` |
| Features | `llm/features/` |
| Memory bank | `llm/memory_bank/` |
| Artifacts (data plane) | `docs/` |

**Declare only slots this repo has content for.** `--layout` asserts that every
declared path exists.

## Step 3 — Install the routing rule BEFORE moving anything

Install `establish`'s Step 5 routing rule into `CLAUDE.md` / `AGENTS.md` first.
`obra/superpowers` writes to `docs/superpowers/` by default and will recreate it
mid-migration if the rule is not already in place. This ordering is not
cosmetic; getting it wrong means moving the same files twice.

## Step 4 — Build the move plan

Walk the repo and produce an explicit table. Do not glob-and-hope; every source
path is listed individually so the user can veto any line.

| From | To | Why |
|---|---|---|
| `docs/governance-delta.md` | `<governance dir>/governance-delta.md` | control plane |
| `docs/adr/*.md` | `<adr dir>/` | control plane |
| `docs/superpowers/specs/*` | `<spec dir>/` | vendor default → declared path |
| `docs/superpowers/plans/*` | `<plans dir>/` | vendor default → declared path |
| `memory-bank/`, `docs/memory-bank/` | `<memory-bank>/` | control plane |
| roadmap document | declared roadmap path | control plane |

**Stays in `docs/`:** externally-sourced material, published site content (a
Jekyll `_config.yml`, `docs/index.md`, a Pages source), and derived views. If
moving something would break a published site, say so and leave it.

**Ask about anything ambiguous.** A file you cannot confidently classify is a
question for the user, not a guess. List unclassified files separately rather
than sweeping them into a destination.

## Step 5 — Reconcile the memory bank

This is the part that carries the most value and the most risk.

- `git mv` the old directory to the declared path. If the old bank used
  different filenames (`active-context.md` vs `activeContext.md`,
  `decisions.md` vs `architecturalDecisions.md`), `git mv` each to its canonical
  name — do not create a new file beside the old one.
- **Merge, never overwrite.** Where both an old file and a canonical file exist,
  concatenate under dated headings and tell the user which files were merged.
  Losing someone's `activeContext.md` to a layout change is the worst outcome
  this skill can produce.
- Canonical files with no old counterpart become stubs marked
  `<!-- stub: no counterpart in the pre-v0.3 layout -->`.
- Content that is genuinely superseded moves to `<memory-bank>/archive/` under a
  dated filename, with a one-line note on what replaced it. Archive is the
  default for anything doubtful; deletion needs the user to say so.
- Append a migration note to `activeContext.md` and `progress.md`: what moved,
  when, and the PR number once it exists.

## Step 6 — Rewrite every inbound reference

After the moves, every reference to an old path is broken.

```bash
grep -rn --exclude-dir=.git -e 'docs/governance-delta' -e 'docs/adr/' \
     -e 'docs/superpowers/' -e 'memory-bank/' .
```

Rewrite each hit. Check `README.md`, `CLAUDE.md`, `AGENTS.md`, `.github/`
workflows and templates, every `.md` under the control plane, and any script
that takes a path argument.

**Verify with `grep`, not with the link check.** `governance-links` strips
inline code spans, and path references are conventionally backticked — a stale
path survives a green CI run. Re-run the grep above and show it returning
nothing but intentional historical mentions (an ADR describing the old layout
should keep its old paths; say so rather than rewriting history).

## Step 7 — Pin, verify, and open the PR

- Update the version pin in the delta to the canonical `VERSION`. **The pin and
  the moves land in the same PR** — a repo that bumps one without the other is
  in a state neither version describes.
- Run the governance check command including `--layout`. Every declared path
  must exist.
- If the repo also uses `agentic-research`, run
  `node <paper>/scripts/research-checks.mjs` too: its delta may declare a
  memory-bank path that just moved, and `governance.sync` will catch the
  mismatch. Tell the user to update `docs/research-delta.md` — do not edit
  another plugin's delta yourself.
- Commit as one logical change per group (routing rule, moves, reference
  rewrites, pin) so the PR is reviewable, and open the PR with a body listing:
  every move, every merged memory-bank file, everything archived, everything
  left in `docs/` and why, and any file the user was asked to classify.

## Step 8 — Report

State plainly:

- what moved, and that history followed it (`git log --follow` on a sample)
- what was merged, and what was archived
- what stayed in `docs/`, and why
- what still needs a human: the PR review itself, and any file you could not
  classify

Never report success while the working tree is dirty with unstaged moves, or
while the grep in Step 6 still returns unintentional hits.
