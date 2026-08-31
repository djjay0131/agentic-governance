# System patterns

## 1. Policy once, facts per repo
Canonical docs state policy; the delta states project facts. Canonical docs defer
to the delta wherever specifics are needed.

## 2. Never declare a path you did not create
Added 0.3.1. A delta declaring a memory-bank path it never creates makes the
delta false, and every check, agent and adopting plugin inherits the error.

## 3. Degrade, do not crash, on a configuration you accept
`establish` records "no remote" as legitimate; the checker must therefore work
there. A plugin that documents a configuration and then fails on it is worse than
one that refuses it outright. The base ref now falls back through
`origin/main` → `origin/master` → `main` → `master` → the git empty tree, saying
which it used.

## 4. Default-deny is the safety property
`checkL0Paths` denies anything with no matching allow rule. Explicit `deny` lines
are documentation and defence in depth, not the mechanism.

## 5. Do not learn about adopting plugins
Governance knows nothing about `agentic-research`, and should not. When the
research delta needed protection from a generic `allow docs/**` rule, the denial
went into the lines *research* prints — not into this repo's `HARD_DENY`.
