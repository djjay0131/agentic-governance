# Tech context

- `plugin/scripts/governance-checks.mjs` — Node, dependency-free, run from the
  adopting repo's root. `ROOT` comes from `git rev-parse --show-toplevel`, so it
  operates on the caller's repo, not the one holding the script.
- Layout changed in 0.3.0: `governance/` → `plugin/`. Clones predating that (the
  owner's local v0.2.0) have the old paths, and a patch for one does not apply to
  the other.
- Distributed both as a GitHub marketplace and, on the owner's machine, as a
  local Directory source. The two can diverge silently, and did.
