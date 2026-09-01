# Progress

| Version | Shipped |
|---|---|
| 0.2.0 | Levels, steward, workflows; four executive personas; establish/audit |
| 0.3.0 | Repo restructured `governance/` → `plugin/`; `llm/` control plane; AGENTS.md |
| 0.4.0 | `/governance:migrate`: pre-v0.3 → current layout, history-preserving, branch + PR, `--plan` by default |
| 0.3.1 | Base-ref fallback so checks survive a repo with no remote; `establish` creates the memory bank it declares |

## Verified 0.3.1

- No-remote repo: was exit 1 with a raw git `fatal:`, now exit 0, 3/3 passing,
  `WARN: origin/main not found; diffing against master`.
- Repo *with* a remote: unchanged, resolves `origin/main`, prints no warning.
