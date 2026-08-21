# Feature Catalog — Master Index

Status: Active
Last updated: 2026-08-21
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
