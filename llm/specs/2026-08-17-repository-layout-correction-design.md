# Repository Layout Correction — Design

Status: Draft
Date: 2026-08-17
Target: agentic-governance v0.3 (breaking layout change) + portfolio migration
Author: Repository owner, AI-assisted

## 1. The problem

The portfolio was meant to split storage by *role*:

- `llm/` — everything the project and its agents run on: governance policy,
  role charters, decisions, specs, plans, backlog, memory bank.
- `docs/` — document *artifacts* the project needs: proposals from other
  places, spec sheets, vendor material, and published views.

In every repo that adopted `agentic-governance`, the split is inverted:
governance and project-management content lives under `docs/`.

### 1.1 Where it went wrong

**a. The ancestor only half-applied the rule.** `baseball-ai` — the repo
agentic-governance was seeded from — had `llm/constitution/`,
`llm/memory-bank/`, `llm/features/`, `llm/construction/`, but kept every
governance *policy* document under `docs/`: `architecture-governance.md`,
`project-operating-system.md`, `review-checklist.md`,
`definition-of-done.md`, `labels.md`, `adr/`, `templates/`,
`master-roadmap.md`, the FDS. The rule reached the charters and the memory
bank; it never reached the policy layer.

**b. The extraction froze the wrong half as canon.** `c9604f8`
(2026-07-09, "Seeded from baseball-ai governance") packaged exactly the
`docs/`-resident half. `llm/constitution/` was promoted to root
`constitution/`; everything else stayed `docs/`. And
`docs/project-operating-system.md` §Repository Areas wrote the
contradiction down as canon:

> `### docs/` — Design, architecture, product, roadmap, and
> governance-delta documents.

That sentence is the only canonical statement of repository layout in the
package, and it states the opposite of the intended rule.

**c. The last `llm/` reference was generalized away.** `9014b71`
(2026-07-11) replaced `### llm/memory_bank/ (or llm/memory-bank/)` with
`### Memory bank (path declared in the delta)`. Correct instinct
(portability), but afterwards `llm/` appears nowhere in agentic-governance
except one example line in the delta template and the `llm/constitution/**`
deny glob in `governance-checks.mjs`. An agent reading the canon has no
reason to write into `llm/`.

**d. A tool default was promoted to policy.** `obra/superpowers` writes to
`docs/superpowers/specs/` and `docs/superpowers/plans/`. Rather than being
overridden, that path was cited as *the* example of a design-authority
document in `docs/governance-delta-template.md` from the initial commit
onward. agentic-kg's delta now describes "its siblings'
`docs/superpowers/specs/` documents" as the norm it fails to meet.

**e. The machinery hardened around `docs/`.** The L0 allowlist template
hardwires `allow docs/adr/README.md`, `allow docs/** link-target-only`,
`deny docs/governance-delta.md`; `governance-checks.mjs` defaults to
`--delta docs/governance-delta.md` and `--adr-dir docs/adr`. Every
`/governance:establish` run instantiates that shape.

**f. In agentic-kg it collided with a website.** `docs/` there predates
governance — it is the Jekyll Pages site (`549cdab`, `5fa950a`, Feb 2026).
Adoption dropped `docs/governance-delta.md` and `docs/adr/` into the
published site, and `docs/_config.yml` must actively hide them:

```yaml
exclude:
  - adr/
  - governance-delta.md
```

A site config that excludes content is direct evidence the content is in
the wrong tree. Then `7c2988b` (2026-07-21) added `docs/design/` — 14
hand-written notes "distilled from the specs in `llm/features/`" — a
parallel, hand-maintained copy of project-management content: precisely the
drift the Design Surface spec (`294692f`, same day) exists to prevent.

### 1.2 The clincher

The intended convention survives *exactly* where agentic-governance was
never adopted:

| Repo | Adopted? | Layout |
|---|---|---|
| `cv` | no | `llm/features/`, `llm/memory_bank/`; `docs/` empty — **correct** |
| `ncsu-las-2026` | no | `llm/features/`, `llm/memory_bank/`; `docs/` = `Adams CV 2026.pdf`, `18e-doe-codes.md`, `index.html` — **exactly the intended `docs/`** |
| `agentic-kg` | yes | delta + ADRs + design notes under `docs/` — inverted |
| `agentic-kgis` | yes | delta + ADRs + superpowers specs/plans under `docs/` — inverted |
| `agentic-kgcs` | yes | delta + ADRs under `docs/` — inverted |
| `home-network` | yes | delta + ADRs + superpowers + constellize under `docs/`; **no `llm/` at all**, memory bank at root `memory-bank/` — fully inverted |

Adoption of the governance package is the vector. `home-network`, the most
recent adopter, has no `llm/` directory whatsoever.

**Root cause:** the rule was never written down. The single canonical
statement of layout says `docs/`, so tool defaults and template inertia won
unopposed in every repo that took the package.

## 2. Decisions taken

1. **The rule applies to agentic-governance itself.** Its policy library is
   governance content and moves to `llm/`, even though it is also the
   package's deliverable. No repo in the portfolio keeps governance under
   `docs/`.
2. **ADRs are source of truth and move to `llm/`.** A published ADR index
   may be generated into the site as a derived view.
3. **Scope is the whole portfolio.**

## 3. Target layout

### 3.1 Canonical (prescribed by agentic-governance v0.3)

```
llm/
  constitution/            role charters + shared principles
  governance/              policy docs, delta, templates/, patterns/
  governance/adr/          Architecture Decision Records
  specs/                   design specs / FDS (superpowers + Constellize output)
  plans/                   implementation plans
  features/                feature specs + backlog (Constellize)
  memory_bank/             agent memory
docs/                      DELIVERABLES, EXTERNAL material, PUBLISHED VIEWS
```

The split is by **role**, not by authorship. `docs/` holds project and
domain deliverables (product and API documentation, project/domain
technical specifications and reference material), material sourced from
outside this project (proposals, spec sheets, vendor docs, papers,
research sources, PDFs, diagrams, datasets), and **derived views** of
`llm/` content (the Pages site) — and nothing that governs how the
repository is operated. The Design Surface projection rule already says
every published element must be attributable to an authoritative source;
this establishes its inverse — **no artifact that governs repository
operation lives under `docs/`, and any view placed there must name the
`llm/` document it projects.**

Every path above is **declared in the repo's governance delta**, not
hardcoded. The canon prescribes the *shape*, the delta binds the *paths* —
the lesson already learned for memory-bank path, applied consistently.

### 3.2 agentic-governance itself

| From | To |
|---|---|
| `constitution/` | `llm/constitution/` |
| `docs/{architecture-governance,project-operating-system,governance-levels,l0-fast-track,review-checklist,definition-of-done,branch-protection,labels}.md` | `llm/governance/` |
| `docs/governance-delta-template.md` | `llm/governance/` |
| `docs/templates/`, `docs/patterns/` | `llm/governance/{templates,patterns}/` |
| `docs/superpowers/specs/2026-07-21-design-surface-capability-design.md` | `llm/specs/` |
| — (new) | `llm/governance/adr/` + ADR-0001 recording this decision |
| `docs/` | emptied; `docs/README.md` states the rule |
| `governance/` (plugin: agents, skills, scripts) | unchanged — see §7.1 |

The package becomes a working example of the layout it prescribes.

## 4. Phase 1 — write the rule into canon (agentic-governance v0.3)

Semantic (L1/L2). Issue → branch → PR, human review.

1. **ADR-0001 `llm/` is the governance surface, `docs/` is artifacts and
   views.** Records the rule, the inverse projection rule, and the
   self-application decision.
2. **Rewrite `project-operating-system.md` §Repository Areas.** This is the
   fix at the root — the sentence that caused the drift.
3. **Add `## Repository Layout` to the delta template**: governance dir,
   ADR dir, spec dir, plans dir, features dir, memory-bank path, artifacts
   dir. Delete the `docs/superpowers/specs/…` exemplar from the
   Design-Authority field.
4. **Re-express the L0 allowlist template** against declared paths instead
   of literal `docs/`.
5. **`governance-checks.mjs`**: flip `--delta` / `--adr-dir` defaults; read
   them from the delta's layout block when present. `HARD_DENY` already
   uses `**/` globs for policy docs and already carries
   `llm/constitution/**`, so the denies survive the move — verify, don't
   assume.
6. **`establish` skill**: create the declared layout; emit the superpowers
   path override (§5) into the onboarded repo's `CLAUDE.md`.
7. **`audit` skill**: new findings — *source-of-truth content under the
   artifacts dir* and *undeclared layout paths*.
8. **Housekeeping**: README path table, `CHANGELOG.md`, `VERSION` → 0.3.0,
   and a migration note for repos pinned at v0.2.

Downstream CI is safe during this phase: adopting repos fetch the checker
**pinned to a commit SHA** (`agentic-kg/.github/workflows/governance-checks.yml`
pins `31f2771`). Moving files in the canon breaks nothing until each repo
bumps its own pin — that pin *is* the migration window.

## 5. Phase 2 — stop the tool from recreating the problem

`obra/superpowers` (marketplace SHA `44c9b2d`) writes design docs and plans
to `docs/superpowers/`. The plugin is not installed in this environment, so
the first task is to read the skill source and determine whether the output
path is configurable or hardcoded.

- If configurable: set it per repo.
- If hardcoded: a `CLAUDE.md` instruction overriding the destination, plus a
  post-run relocation step in the governance skills.

**This must land before the repo migrations** — otherwise the next
brainstorming session recreates `docs/superpowers/` in a repo that was just
cleaned.

## 6. Phase 3 — migrate the repos

One PR per repo. Each: move files, rewrite cross-links, update the delta's
layout block and L0 allowlist, bump `GOVERNANCE_REF` + version pin, re-run
governance checks.

**Order — smallest first, to prove the recipe before the risky one:**

1. **`agentic-kgcs`** (pilot; `docs/` holds only `adr/` + delta — `docs/`
   ends up empty). Validates the recipe end to end.
2. **`agentic-kgis`** — plus `docs/superpowers/{specs,plans}/` →
   `llm/{specs,plans}/`; triage `docs/ai/` and `docs/sprints/`.
3. **`home-network`** — the biggest structural change: create `llm/` (it
   has none), move root `memory-bank/` → `llm/memory_bank/`,
   `docs/constellize/` → `llm/`, `docs/superpowers/` → `llm/`. Keep
   `docs/runbooks/` (operator-facing published material).
4. **`agentic-kg`** — largest and only one with a live Pages site:
   - `docs/governance-delta.md`, `docs/adr/` → `llm/governance/`
   - delete the now-pointless `exclude: [adr/, governance-delta.md]` from
     `docs/_config.yml`
   - `docs/{about,reference,operations,status,ground-truth,index.md}` stay
     — they are the published site
   - `docs/design/` stays published but is **re-founded as a derived view**
     of `llm/features/` per the Design Surface spec, with a drift check;
     it must stop being a hand-maintained second source
   - update `CLAUDE.md` §Locations, delta, allowlist, CI flags
     (`--base origin/master`), and cross-links from `llm/features/` and the
     memory bank
5. **`baseball-ai`** — never adopted; the ancestor. Migrate its `docs/`
   policy set → `llm/governance/`, then onboard onto v0.3 via
   `/governance:establish`. Triage `docs/{domain,product,ui,architecture,
   research,ai,integrations}` and the FDS: sources → `llm/`, reference
   material → `docs/`.

**No migration needed:** `cv` and `ncsu-las-2026` already match the target;
use them as reference. `website` has neither tree.

## 7. Open decisions

### 7.1 `governance/` vs `llm/governance/` name collision

After the move, agentic-governance has `governance/` (the installable
plugin: agents, skills, scripts) *and* `llm/governance/` (policy prose).
Confusable.

**Recommendation:** rename the plugin payload `governance/` → `plugin/` and
update `.claude-plugin/marketplace.json` (`"source": "./plugin"`) in the
same v0.3 break. Cost is one re-add for anyone who installed the plugin —
cheap in a single-owner portfolio, and it removes the ambiguity
permanently. Alternative if we prefer zero plugin churn: name the policy
directory `llm/policy/`.

### 7.2 `agentic-kg/docs/design/`

Recommendation above is to keep it published and make it generated. If the
generator is not built in this pass, it should carry an explicit
"hand-maintained, may drift" banner rather than silently reading as
authoritative.

## 8. Phase 4 — enforcement

Add a `--layout` mode to `governance-checks.mjs` that fails when
source-of-truth content (delta, ADRs, `*-design.md`, memory-bank files,
feature specs) appears under the declared artifacts dir, or when a declared
layout path is missing. Wire into CI in every repo; promote to a required
status check once green.

Without this, the drift returns the next time a tool default disagrees with
the convention — which is exactly how we got here.

## 9. Verification

- Canon: no governance content under `agentic-governance/docs/`;
  `--layout` passes against the package itself.
- Each migrated repo: governance checks green, no broken internal links,
  delta layout block matches reality, pins bumped.
- `agentic-kg`: Pages site builds and no published URL 404s (the moved
  content was excluded from the site, so no public URL should change).
- A fresh `/governance:establish` on a scratch repo produces the `llm/`
  layout, not `docs/`.

## 10. Follow-ups (out of scope for v0.3)

Deferred deliberately. Each was found during the v0.3 migration and left
undone so a mechanically verifiable move PR stayed reviewable.

**Content defects**

1. **De-domain two templates.** `llm/governance/templates/design-doc-template.md`
   carries `## Multi-Sport Implications` and youth-athlete/parent/coach
   framing; `feature-spec-template.md` carries evidence/provenance framing.
   Both are baseball-ai residue in project-agnostic templates. Replace with
   a "Domain Implications (see governance delta)" hook. Semantic (L1) —
   adopting repos instantiate these files.
2. **Merge-authority SSOT claim boundary.** `architecture-governance.md` and
   `governance-levels.md` both claim to be the single source of truth for
   merge authority. Narrow the former to "who holds each role".
3. **Duplicated ultracode blockquote.** The canonical Mode 3 invocation is
   verbatim in both `project-operating-system.md` §Mode 3 and
   `patterns/prompt-patterns.md` §6. A patterns library whose stated design
   is to point rather than duplicate is violating its own rule.
4. **`plugin/scripts/README.md` restates `HARD_DENY` in prose.** By this
   package's Documentation Standards that is a defect; today only
   discipline keeps the two in step.

**Enforcement gaps**

5. **`governance-links` cannot see this repository's references.** Zero
   Markdown links into the moved trees exist — all 314 cross-references are
   backticked inline code spans, which `checkLinks()` strips before
   matching. CI stayed green throughout a migration that could have broken
   every reference in the repo. Extend the checker to validate path-shaped
   inline code spans, or the next migration is equally unverifiable.
6. **Path strings inside shipped prompt payloads.** Three live in
   `patterns/prompt-patterns.md` fenced `text` blocks (the bounded-contract
   skeleton and the steward's ADR-bookkeeping task). They are pasted into
   real agent contracts, sit inside fences the checker deliberately skips,
   and a stale path there silently misroutes a live agent. Needs a
   dedicated check.
7. **`--layout` false positive.** It flags any `*-design.md` under the
   artifacts directory. Under the corrected routing rule a *product or
   domain* design document is a Q2 artifact and legitimately lives there.
   Narrow the shape or make it delta-configurable before `docs/`-resident
   design deliverables become common.
8. **The version string is duplicated in three files** — `VERSION`,
   `.claude-plugin/marketplace.json`, `plugin/.claude-plugin/plugin.json` —
   with no check that they agree.

**Canon-repo gaps**

9. **agentic-governance carries no governance delta of its own,** so
   `--layout` has no declared paths to check when run against the canon.
   Decide whether the package should carry a delta or whether `--layout`
   needs a canon-repo mode.
10. **agentic-governance has no memory bank,** so `llm/memory_bank/` stays
    empty in the repo that prescribes it.

## 11. Cross-repository follow-up

Not executed here — this migration deliberately touched only
agentic-governance. Each item below should propagate to the shared
governance baseline as sibling repos migrate.

- **The migration order stands** (§6): `agentic-kgcs` (pilot, smallest) →
  `agentic-kgis` → `home-network` → `agentic-kg` → `baseball-ai`.
- **Every sibling needs the routing rule installed before its files move.**
  Re-running `/governance:establish` now emits it into `CLAUDE.md` and
  `AGENTS.md`; doing the moves first leaves a window in which a
  brainstorming session recreates `docs/superpowers/` in a repo just
  cleaned.
- **`home-network` is the structural outlier** — no `llm/` tree at all,
  memory bank at root `memory-bank/`, planning docs in `docs/constellize/`.
  It needs the tree created, not just repointed.
- **`agentic-kg` is the only sibling with a live Pages site.** Its
  `docs/_config.yml` excludes `adr/` and `governance-delta.md`; those
  exclusions become unnecessary once the content moves, and
  `docs/design/` should be re-founded as a derived view of `llm/features/`
  rather than a hand-maintained copy.
- **`cv` and `ncsu-las-2026` need no migration** — both already match the
  target. They are the control group that proved adoption was the drift
  vector, and they are the reference implementations.
- **Pin bumps are the migration window.** Downstream CI fetches the checker
  at a commit SHA, so nothing breaks until each repo bumps deliberately.
  Bump the pin, the check-command path (`plugin/scripts/`), and the delta
  layout block in one PR per repo.
