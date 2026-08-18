# ADR-0001: `llm/` is the control plane; `docs/` is the data plane

Status: Accepted
Date: 2026-08-18

## Context

The portfolio was designed around a split by *role*: `llm/` holds what the
project and its agents run **on** — governance policy, role charters,
decisions, specs, plans, backlog, memory bank — and `docs/` holds document
**artifacts**: project and domain deliverables, material sourced from
outside the project, and published views of project content.

That rule was never written down. It survived only as habit, and habit
lost.

**Evidence 1 — the canon stated the opposite.**
`project-operating-system.md:247-249` read:

> `### docs/`
>
> Design, architecture, product, roadmap, and governance-delta documents.

Those three lines were the *only* canonical statement of repository layout
anywhere in the package, and they inverted the intended rule. `c9604f8`
(2026-07-09) extracted this package from its ancestor and froze exactly the
`docs/`-resident half as canon. `9014b71` (2026-07-11) then generalized the
last surviving `llm/` heading into "Memory bank (path declared in the
delta)" — a correct instinct for portability, but afterwards `llm/`
appeared nowhere in the package except one example line in the delta
template and the `llm/constitution/**` deny glob in the check script. An
agent reading the canon had no reason to write into `llm/` and every reason
not to.

**Evidence 2 — a vendor default was ratified as design authority.**
`governance-delta-template.md:22` offered
`docs/superpowers/specs/YYYY-MM-DD-...-design.md` as *the* worked example
of a Design-Authority Document. `obra/superpowers` writes there because
that is its hardcoded default. Rank 2 of the Design Authority Hierarchy —
the design-authority document, the artifact that outranks ADRs — was
therefore anchored, from the initial commit onward, to a path chosen by a
third-party tool. A downstream repo's delta now describes its siblings'
`docs/superpowers/specs/` documents as the norm it fails to meet.

**Evidence 3 — adoption is the vector.** The intended convention survives
in exactly the repos that never adopted this package (`cv`,
`ncsu-las-2026`), and is inverted in every repo that did (`agentic-kg`,
`agentic-kgis`, `agentic-kgcs`, `home-network`). The most recent adopter
has no `llm/` directory at all. In `agentic-kg` the inversion collided with
a live Jekyll site, which must now carry
`exclude: [adr/, governance-delta.md]` — a site configuration that hides
content is direct evidence the content is in the wrong tree.

The machinery hardened around the error: the L0 allowlist template
hardwires `docs/adr/…` and `docs/** link-target-only`, and the check script
defaults to `--delta docs/governance-delta.md` and `--adr-dir docs/adr`.
Every `/governance:establish` run instantiates that shape into a new repo.

## Decision

**Everything that governs how the repository is operated lives under
`llm/`. `docs/` holds project and domain deliverables, external material,
and derived views, and nothing that governs repository operation.**

1. **Two planes, split by role — not by authorship.** Who wrote a document
   decides nothing; what the document *does* decides everything. `llm/` is
   the **control plane**: artifacts that govern, plan, record, review, or
   operate the repository — governance policy and the delta, role charters,
   workflows, prompts and skills, design specs acting as design authority,
   implementation plans, backlog and feature specs, the memory bank, ADRs,
   roadmaps, execution patterns, and review and retrospective records.
   `docs/` is the **data plane**: project and domain deliverables, external
   material, and derived views of control-plane content — product and API
   documentation, project/domain technical specifications and reference
   material, vendor and third-party specifications, external proposals,
   research sources, PDFs, diagrams, datasets, and published sites and
   generated views. No artifact that governs repository operation lives in
   the artifacts tree, and any view placed there must name the `llm/`
   document it projects.

2. **A pre-write decision procedure.** Before creating any document,
   answer two questions in order:

   - **Q1 — Does this artifact control how the repository is governed,
     planned, remembered, reviewed, or operated?** YES → `llm/`. This is
     governance policy and the delta, role charters, workflows, prompts and
     skills, design specs acting as design authority, implementation plans,
     backlog and feature specs, the memory bank, ADRs, roadmaps, execution
     patterns, and review and retrospective records.
   - **Q2 — Otherwise: is it a project or domain deliverable, technical
     reference, external source, specification, or generated project
     documentation?** YES → `docs/`. This is product and API documentation,
     project/domain technical specifications and reference material, vendor
     and third-party specifications, external proposals, research sources,
     PDFs, diagrams, datasets, and published sites and generated views. A
     derived view of a control-plane document belongs here too, and must
     name the `llm/` document it projects.
   - **Otherwise — do not invent a location.** Use the existing structure
     the artifact plainly belongs to (`src/`, `tests/`, `.github/`), or
     escalate to the Repository Steward
     (`plugin/agents/repository-steward.md` §Layout Escalations (Inbound)).

   If the answer to Q1 is unclear, treat the artifact as control plane.
   Misfiling a source of truth as an artifact is the failure this ADR
   exists to prevent; the reverse is cheap to correct.

3. **ADRs are control plane.** An ADR *is* the decision, not a report of
   one. ADRs live at `llm/governance/adr/`, under the single
   `llm/governance/**` prefix that also carries policy documents, the
   delta, templates, and patterns. A published ADR index may be generated
   into `docs/` as a derived view.

4. **A named exemption class: tool-contract paths.** Some paths are fixed
   by a tool or platform rather than chosen by this project. They sit
   outside both planes and are permanently exempt. The class is closed and
   enumerated:

   - `.github/` — workflows, issue templates, PR templates.
   - `.claude-plugin/` — the Claude Code marketplace manifest.
   - The plugin payload root (`plugin/` in this repository) — the
     directory a marketplace `source` field points at.
   - Root-convention files: `README.md`, `CHANGELOG.md`, `VERSION`,
     `CONTRIBUTING.md`, `LICENSE`, `CLAUDE.md`, `AGENTS.md`.

   The exemption covers **location only**. A tool default is never design
   authority. Where a tool writes control-plane content into the artifacts
   directory, the correct response is to override the tool and relocate
   the output — not to ratify the path.

5. **This repository applies the rule to itself.** `agentic-governance`'s
   policy library is governance content and moves to `llm/`, even though
   it is simultaneously the package's deliverable. No repo in the
   portfolio keeps governance under `docs/`. The package becomes a working
   example of the layout it prescribes.

6. **Paths are declared, not hardcoded.** The canon prescribes the
   *shape*; each repo's governance delta binds the *paths*, in a
   `## Repository Layout` block. This is the lesson already learned for
   the memory-bank path, applied consistently.

## Rationale

The rule was already the intent everywhere it was not overwritten. What
failed was not the design but its absence from the canon: an unwritten
convention cannot outvote a written default, and a tool default is written
every time the tool runs.

Writing the rule into `project-operating-system.md` §Repository Areas fixes
the sentence that caused the drift. Writing it into `CLAUDE.md` reaches the
one channel the offending tool contractually honors. Writing it into the
`establish` skill stops the shape from propagating into the next repo,
which is the only fix that scales — six repos drifted because one skill
instantiated the wrong layout six times.

Naming the exemption class matters as much as naming the rule. Without it,
`.github/` and the plugin root read as violations, a future audit re-opens
a settled question, and the rule loses credibility the first time it is
applied to a path nobody controls. The class is closed by enumeration so
that "the tool needs it there" cannot be re-argued case by case.

ADRs are placed under `llm/governance/adr/` rather than a flat `llm/adr/`
so that a single `llm/governance/**` prefix covers all governance content.
That keeps the L0 path allowlist and the layout check expressible in one
glob instead of several.

Doing this now, at a version boundary, costs one coordinated break. Doing
it later costs the same break plus every repo onboarded in between.

## Alternatives Considered

### Alternative 1 — Ratify the status quo: governance stays under `docs/`

Rewrite the intent to match reality. Zero migration cost, zero breakage,
and the canon becomes internally consistent immediately.

Rejected. It concedes the design-authority question to a vendor default,
and it leaves `docs/` meaning "everything," which is the same as meaning
nothing. It also leaves `agentic-kg` permanently excluding governance
content from its own published site, and offers no principle for deciding
where the *next* kind of document goes.

### Alternative 2 — Half-apply, as the ancestor did

Keep project-management content (`features/`, `memory_bank/`) under `llm/`
and leave the policy layer under `docs/`. This is exactly what `baseball-ai`
did, and it is the state this package was extracted from.

Rejected. It is the empirically demonstrated failure mode: the rule reached
the charters and the memory bank and never reached the policy layer,
because there was no principle saying it should. Any split that cannot be
derived from a one-sentence rule will drift again.

### Alternative 3 — Flat `llm/adr/` instead of `llm/governance/adr/`

Shorter, and matches the common convention of a top-level ADR directory.

Rejected. It splits governance content across two top-level prefixes, so
every allowlist rule, hard-deny glob, and layout assertion has to be
written twice. The cost is paid on every future edit to the enforcement
machinery; the benefit is four characters.

### Alternative 4 — Rename the artifacts directory instead of moving governance

Leave governance where it is and introduce e.g. `artifacts/` for external
material, keeping `docs/` as the project's own documentation.

Rejected. `docs/` already means "the published site" in at least one
adopting repo and "external material" in two unadopted ones; redefining it
a third way multiplies the ambiguity. It also leaves the actual defect
untouched — the canon would still fail to say which documents are
authoritative.

### Alternative 5 — Name the policy directory `llm/policy/` to dodge the collision

After the move, `governance/` (the installable plugin) and
`llm/governance/` (policy prose) coexist and are confusable. Naming the
prose directory `llm/policy/` avoids renaming the plugin.

Rejected in favour of renaming the plugin payload `governance/` → `plugin/`
(this ADR, decision 4, and the tool-contract exemption). "Governance" is
the right word for the prose; the plugin directory is a tool-contract path
whose name carries no meaning beyond the marketplace `source` field. The
plugin's declared `name` stays `governance`, so `/governance:establish` and
`/governance:audit` are unchanged. This closes the open question recorded
in the layout-correction design, §7.1.

## Consequences

### Positive

- The package becomes a working example of the layout it prescribes;
  `/governance:establish` on a scratch repo produces `llm/`, not `docs/`.
- The layout question has a written answer and a two-question procedure,
  so it can be applied to document types nobody has thought of yet.
- One `llm/governance/**` prefix expresses the whole governance surface for
  allowlists, hard-denies, and the layout check.
- `agentic-kg` can delete `exclude: [adr/, governance-delta.md]` from
  `docs/_config.yml`; its site stops hiding its own content.
- The Design Surface projection rule gains its inverse. "Every published
  element is attributable to an authoritative source" and "no source of
  truth lives under the artifacts directory" are now a matched pair, and
  either one alone was insufficient.
- Naming the exemption class means a future audit closes the `.github/`
  and plugin-root question by citation instead of by argument.

### Negative / Tradeoffs

- v0.3 is a breaking layout change. Every adopting repo must move files and
  rewrite cross-links; the largest has a live Pages site.
- Anyone who installed the plugin must re-add it once, because the
  marketplace `source` changes from `./governance` to `./plugin`.
- Git history for the moved documents now requires `--follow`, and blame
  spans a rename.
- `agentic-governance` gains an `llm/` tree whose `plans/`, `features/`,
  and `memory_bank/` slots stay empty, so the prescribed shape and this
  repo's actual shape differ. Resolved by declaring paths in the delta
  rather than asserting a fixed tree.

### Risks

- **Silent link rot.** The `governance-links` check validates Markdown
  link syntax only, and strips fenced blocks and inline code spans first.
  Every cross-reference in this package is a backticked code span, so
  **not one stale path from this migration is detectable by the current
  checker.** Verification must be grep-based until the checker is
  extended. Highest-exposure sites: `l0-fast-track.md` (54 inbound
  references across 19 files) and the three path strings embedded inside
  `prompt-patterns.md`'s prompt payloads, where a stale path sends a live
  agent to a file that does not exist.
- **Partial adoption.** A repo that bumps its version pin without moving
  its files, or the reverse, ends up in a state neither v0.2 nor v0.3
  describes. Mitigated by requiring the pin bump and the move in one PR.
- **Regression by tool.** If the `CLAUDE.md` override is missed in a repo,
  the next brainstorming session recreates `docs/superpowers/` in a tree
  that was just cleaned. Mitigated by making `establish` emit the override
  and by the `--layout` check.
- **Over-broad enforcement.** Adding `llm/governance/**` to the check
  script's `HARD_DENY` would be a natural-looking simplification and would
  silently destroy the L0 lane for ADR status flips and index rows. The
  hard-deny set must stay basename-globbed for policy documents, with
  `llm/governance/adr/**` deliberately left allowlistable.

## Impacted Areas

- [ ] Product
- [ ] Domain model
- [ ] Data architecture
- [ ] AI architecture
- [ ] Domain-specific systems (see governance delta)
- [x] Integrations
- [ ] UX
- [ ] Security/privacy
- [x] Implementation
- [x] Documentation

## Related Documents

- `llm/specs/2026-08-17-repository-layout-correction-design.md` — the
  root-cause analysis and migration plan this ADR ratifies.
- `llm/governance/project-operating-system.md` §Repository Areas — the
  normative statement of the rule and the Q1/Q2 procedure.
- `llm/governance/governance-delta-template.md` §Repository Layout — where
  each repo declares its own paths.
- `llm/specs/2026-07-21-design-surface-capability-design.md` — the
  projection rule this ADR inverts.
- `CLAUDE.md` — the tool-facing statement of the same rule.

## Related Issues / PRs

- (fill in at PR time)

## Supersedes

None.

## Superseded By

None.
