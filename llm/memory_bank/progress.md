# Progress

| Version | Shipped |
|---|---|
| 0.9.0 | Branch cleanup: `delete_branch_on_merge`, §Branch Cleanup policy, `audit` check 8 — asserted in three docs, implemented in none |
| 0.8.3 | Two version pins that could not stop going stale — now placeholders that read `VERSION` |
| 0.8.2 | Declaring a marketplace is not installing it; step 8 reports the accept as a human follow-up |
| 0.8.1 | README stated the plugin-install prerequisite it had never stated |
| 0.8.0 | `--layout` verifies `exists → declared` — the direction that catches drift |
| 0.7.2 | Step 8 refuses to write an ignored `.claude/settings.json` |
| 0.7.1 | `.claude/` joins the closed tool-contract class; check command must not expand the canon path |
| 0.7.0 | Canon location no longer hardcoded (`${CLAUDE_PLUGIN_ROOT}`, `§Canon Location`); `establish` registers the plugin |
| 0.6.1 | Checker stopped printing `fatal:` on passing runs |
| 0.6.0 | Two silent PASS-on-nothing defects fixed; **the checker's first tests** |
| 0.5.2 | PR responsibilities, PR-before-review invariant, normative lifecycle (closes #2) |
| 0.5.1 | The canon governs itself — own delta, `--layout` 4/4 |
| 0.2.0 | Levels, steward, workflows; four executive personas; establish/audit |
| 0.3.0 | Repo restructured `governance/` → `plugin/`; `llm/` control plane; AGENTS.md |
| 0.5.0 | `Sprints directory` slot (`llm/sprints/`) — sprint plans had no canonical home, so migrate was leaving them behind |
| 0.4.0 | `/governance:migrate`: pre-v0.3 → current layout, history-preserving, branch + PR, `--plan` by default |
| 0.3.1 | Base-ref fallback so checks survive a repo with no remote; `establish` creates the memory bank it declares |

## Verified 0.3.1

- No-remote repo: was exit 1 with a raw git `fatal:`, now exit 0, 3/3 passing,
  `WARN: origin/main not found; diffing against master`.
- Repo *with* a remote: unchanged, resolves `origin/main`, prints no warning.

## Portfolio state at v0.9.0 (2026-09-17)

Ten adopters, all on **v0.9**, all `delete_branch_on_merge: true`, zero check
failures: `agentic-kg`, `agentic-kgcs`, `agentic-kgis`, `home-network`,
`mats-12-application`, `fantasy-sports`, `ai-empirical-se-chapter`,
`baseball-ai`, `website`, and this repo.

`agentic-kgcs` and `ai-empirical-se-chapter` report 2/4 with `adr-index` and
`adr-status` **SKIP** — ADR systems installed, no ADR ever written. Accurate, not
broken; no ADR was fabricated to clear them.

`docs/superpowers/` exists nowhere in the portfolio. `website` adopted v0.8
independently, in another session, and came out conformant on every dimension —
better evidence the package works than anything done by hand here.

## The lesson worth keeping

Nine releases, and **every defect was found by deployment, not review**. A
release that has not been deployed to a real repo has not been tested. Two
subagent refusals were also worth more than their compliance would have been:
one flagged a judgment call an ambiguous brief had invited, the other refused a
destructive deletion justified by a mechanism that did not exist.
