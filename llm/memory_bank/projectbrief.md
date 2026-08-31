# Project brief

`agentic-governance` is the AI engineering operating system for this portfolio:
how work is planned, classified, executed, reviewed, decided, merged and
remembered, by humans and agents alike.

Three layers:

1. **Canonical docs** — policy stated once, project-agnostic by construction.
2. **Per-project delta** — `docs/governance-delta.md` in each adopting repo,
   declaring project facts, never policy.
3. **Execution layer** — this repo doubles as a Claude Code plugin: four
   executive personas, `/governance:establish` and `/governance:audit`, and
   `governance-checks.mjs`.

Every change carries a level, L0 (administrative) to L3 (product). Human review
is mandatory for all semantic work. The only AI merge lane is the Repository
Steward's certified L0 fast track, and it ships **inert**.
