# Feature Catalog — Master Index

Status: Active
Last updated: 2026-09-10
Owner: Project owner (canonical governance)

Single source of truth for every capability spec'd or proposed for this
package — one line per feature, plus a link to the full spec once one
exists. This is control-plane content: it records direction, so changing
it is semantic (L1) and it is deny-listed from the L0 fast track.

Status key: **VERIFIED** (shipped, all gates pass) · **IMPLEMENTED**
(built, gates pending) · **SPECIFIED** (spec written, no code) ·
**BACKLOG** (needs spec).

Specs live in `llm/specs/`; this index links to them. Follow-ups and
defects that are not new capabilities belong in the relevant spec's
follow-up section, not here.

---

## Backlog

| # | Feature | Status | One-liner |
|---|---------|--------|-----------|
| G-1 | Model selection for delegated agents | BACKLOG | Govern *which model* a subagent runs on, the way Modes 1–3 already govern how many agents and what shape. |
| G-2 | `establish` should make governance checks a *required* status check | BACKLOG | The skill wires the check, then leaves it advisory — so no adopted repo actually blocks a merge on it. |

---

## G-1 · Model selection for delegated agents

**Problem.** The package governs *how many* agents a work item gets and
*what shape* the orchestration takes — `llm/governance/project-operating-system.md`
§Workflow-Selection Policy, Modes 1–3 and the Mode-Selection Table. It is
silent on which model each of those agents runs on. The Agent Assignment
Contract lists fourteen required fields and none of them is model or
reasoning effort; the Universal Bounded-Contract Skeleton in
`llm/governance/patterns/prompt-patterns.md` has no slot for one either.

So model choice is made ad hoc, per session, invisibly. It is never
declared before the work, never reviewed with it, and never recorded
after it — the same work item can be produced by a cheap fast model or an
expensive careful one and leave no trace of which.

**Why it matters.**

1. **Provenance of design authority.** Design specs and ADRs sit at rank 2
   of the design-authority hierarchy. Which model authored one is
   provenance the review chain currently cannot see.
2. **Cost and latency have no guidance.** Nothing steers L0 bookkeeping
   toward a cheap model or an L2/L3 architecture decision toward a
   careful one. Both errors are silent.
3. **It is the same failure shape this package has already had twice.**
   ADR-0001 exists because the package governed *process* exhaustively and
   *placement* nowhere, so a tool default filled the gap. Model selection
   is the identical gap one level over: it governs *execution mode*
   exhaustively and *model* nowhere, so the session default fills it.

**Shape of the solution** — to be settled in the spec, not decided here:

- A model/effort element added to the Agent Assignment Contract and to the
  UBC skeleton, so it is part of the bounded contract rather than an
  invisible session setting.
- Selection guidance keyed to governance level and work type, in the style
  of the existing Mode-Selection Table — signals in, choice out.
- **Declared, not hardcoded.** Available models and per-project defaults
  vary; by this package's own rule the canon prescribes the shape and each
  repo's delta binds the values.
- Recorded where a reviewer can see it — the PR template, the agent's
  final report shape, or both.
- A non-negotiable mirroring the ultracode one: **model choice is an
  execution decision, never a governance one.** Running L2 work on a
  stronger model does not reduce the review it requires, and running it on
  a weaker one does not increase it.

**Open questions for the spec.**

- Does this belong inside §Workflow-Selection Policy as a second axis
  alongside Modes 1–3, or as its own section? Mode and model are chosen
  at the same moment by the same role, which argues for one place.
- Should the delta declare an allowed model set, or only defaults?
- Is model choice ever itself semantic — does downgrading the model used
  on a design-authority document warrant review, or is it purely
  execution?
- How does it compose with reasoning effort, which is a separate knob with
  its own cost curve?
- Can `/governance:audit` check that declared model policy was followed,
  or is this guidance that is only reviewable by a human? If it is not
  mechanically checkable, say so plainly rather than implying enforcement
  the package cannot deliver.

**Related.** `llm/governance/project-operating-system.md` §Workflow-Selection
Policy and §Agent Assignment Contract; `llm/governance/patterns/prompt-patterns.md`
(UBC skeleton); `llm/governance/governance-levels.md` (the level this would
key against).

---

## G-2 · `establish` should make governance checks a required status check

**Problem.** `establish` step 8 configures branch protection (PRs
required, no force pushes or deletions, conversation resolution) and
step 9 wires the governance check command into CI. It never connects the
two: the `governance-checks` job is created but is not added as a
**required status check**. The result is a repo where governance checks
run, report, and are visible — and where a red PR merges anyway.

This was found by hand on this repository on 2026-09-10. Its own delta
recorded "required status checks: not enabled" as verified fact; the gap
was closed here with a direct `gh api` call. Every other adopted repo
still has it.

**Why it matters.** It is the same shape as the drift ADR-0001 corrected:
canon states a rule (`llm/governance/branch-protection.md` §Required
Status Checks — "add the project's CI checks as required once they
exist"), the tool does not implement it, and the audit does not detect the
difference. So the gate exists on paper for every adopter and binds none
of them. A governance package whose own enforcement is advisory is
recommending a practice it does not install.

**Sketch.** After step 9 has run the check once, add the resolved context
name to `required_status_checks` on the default branch. The context name
is not knowable in advance — it comes from the workflow's job name —
which is why this belongs after step 9 rather than inside step 8's
protection call.

**Open questions for the spec.**

- Does `establish` set this itself, or report it as a step the user must
  approve? Step 8 already asks before remote mutations; this is another
  one, and silently tightening merge rules on someone's repo is worse than
  asking twice.
- `strict` (require the branch be up to date before merging) — on or
  off? Non-strict was chosen here so stacked PRs do not force a rebase on
  every intervening merge. Is that the right default for adopters, or a
  local preference that belongs in the delta?
- Should `enforce_admins` be part of this, or stay separate? Without it an
  admin can bypass the required check, so the gate binds agents and
  ordinary flow but not the repo owner. That may be the correct trade for
  a single-maintainer repo and the wrong one for a team.
- What should `/governance:audit` do when it finds the check wired but not
  required — report it as a finding, or is a repo entitled to run its
  checks advisory-only by declared choice?
- Does the delta need a slot recording which checks are *required* versus
  merely present, so the Platform Enforcement Reality section stops being
  hand-written prose?

**Related.** `llm/governance/branch-protection.md` §Required Status
Checks; `plugin/skills/establish/SKILL.md` steps 8–9;
`llm/governance/l0-fast-track.md` (condition 9 cites the check command,
and a fast track over a non-blocking check certifies nothing);
`llm/governance/governance-delta.md` §Platform Enforcement Reality.
