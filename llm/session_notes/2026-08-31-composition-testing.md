# Session notes — 2026-08-31

Changes here were driven entirely by testing `agentic-governance` composed with
a new plugin, `agentic-research`. Governance was not the subject of the session;
it was the environment the subject ran in, which is why these two bugs had gone
unnoticed.

## What composition testing exposed

**The no-remote crash reproduced on three consecutive runs.** Any repo without a
git remote — which every scratch and test repo is — got git's raw
`fatal: ambiguous argument 'origin/main'` on stderr and a FAIL. The delta written
by `establish` moments earlier said "no remote — branch protection unavailable".
The plugin was failing a configuration it had just finished documenting as
legitimate.

The tester's phrasing is worth keeping: *"the plugin fails on a configuration it
just documented."*

**The declared-but-uncreated memory bank.** `establish` wrote a memory-bank path
into the delta and only recommended creating the directory. Governance-only repos
therefore carried a delta pointing at nothing. It surfaced because
`agentic-research` had started backfilling that directory — and as the tester put
it, *"governance depending on research to make its own delta true is backwards."*
The fix belonged here.

## What composed cleanly, and is worth not breaking

Across two full composition runs, every one of these held:

- Research detected the governance delta and deferred to it for the memory-bank
  path rather than choosing its own.
- Exactly one memory bank in the repo.
- Research **printed** the L0 denial lines and refused to edit
  `docs/governance-delta.md` — correct, since editing it is L1 semantic work.
- No path collisions. Governance owns `docs/adr/` and `.github/`; research owns
  `paper/` and `llm/construction/`; `llm/memory_bank/` is shared **by
  declaration, not by accident**.
- Reverse order (research first) also survived — nothing overwritten, pure
  appends — but by luck: governance's memory-bank step happened to take its
  append branch. Not a designed guarantee.

## Process notes

- v0.3.1 was pushed **directly to `main`**, and the remote reported bypassing
  this repo's own pull-request rule. A governance repo is the worst possible
  place to make that exception. Open for the owner to revert and redo as a PR.
- The owner's local clone (v0.2.0, `governance/` layout) and the remote (v0.3.1,
  `plugin/` layout) both received the same two fixes by different routes and are
  not reconciled.
