# Architectural decisions

## AD-G01 — The base ref degrades instead of crashing (0.3.1)
`origin/main` is correct in CI and absent locally. Falling back through
`origin/main` → `origin/master` → `main` → `master` → the git empty tree, with a
warning naming the choice, keeps the checks usable everywhere.

**Rejected:** requiring `--base` on local runs. It pushes a CI detail onto every
user and would have kept the crash as the default experience.

## AD-G02 — This repo does not yet carry its own governance delta
`agentic-governance` defines the delta but has none of its own, no `docs/adr/`
under governance, and until now no memory bank. Self-adoption is unresolved:
the recursion needs thought, not a reflexive `/governance:establish` run against
itself. Recorded so the gap is deliberate rather than forgotten.

## AD-G03 — `establish` creates the memory bank it declares (0.3.1)
**Rejected:** leaving creation to Constellize `memory:establish`. That left a
false delta whenever the recommendation was not followed, and in practice a
different plugin backfilled it — putting the fix in the wrong repo.
