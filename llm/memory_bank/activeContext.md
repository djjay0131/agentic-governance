# Active context

**As of 2026-09-17 — v0.9.0.**

## Changed since v0.3.1

Nine releases in one session, driven by a portfolio-wide rollout. **Every defect
below was found by deploying canon to a real repo. Reading canon found none of
them.** That is the single most useful thing in this file.

- **0.5.1 — the canon did not follow its own rule.** `--layout` ran against this
  repo as a permanent `SKIP`: it had no delta of its own, so nothing was
  verified. ADR-0001 had decided the two-plane rule applies here too; the
  decision was stated and never mechanically closed. Also: the delta template
  still pinned `v0.2`, so every repo onboarded since v0.3 copied a pin predating
  the layout rule it was being onboarded to.
- **0.5.2 — PR responsibilities.** Forward-ported PR #3, open since 2026-07-16
  and unrebasable after the v0.3 migration moved its target files. Closed
  issue #2.
- **0.6.0 — two silent PASS-on-nothing defects in the checker.** `LAYOUT_SLOTS`
  matched labels by unanchored substring, and `/plan/i` matched the template's
  own `Artifacts directory (the data plane)` — *"plane" contains "plan"* — so the
  artifacts declaration was swallowed and the drift scan pointed at the wrong
  tree. Separately, `adr-index` and `adr-status` passed on a nonexistent ADR
  directory; two repos ran green for weeks with those checks verifying nothing.
  **The checker had no tests at all.** It has 13 now, in CI.
- **0.6.1 —** the checker printed `fatal:` on passing runs (`existsInBase`
  probes with `cat-file -e`; `execFileSync` inherits stderr as well as capturing
  it).
- **0.7.0 — stopped hardcoding canon's own location.** `~/code/agentic-governance`
  appeared in 13 places across 7 files and was written into every adopting repo.
  On the owner's machine it resolved **only because of a hand-made symlink**.
  Inside the plugin canon is now `${CLAUDE_PLUGIN_ROOT}/..`; written-into-repo
  artifacts resolve against a single declared `Canon checkout`. Also added
  `establish` step 8, plugin registration — the `/governance:*` skills were
  uninvokable in eight of nine repos.
- **0.7.1 —** `.claude/` was missing from the *closed* tool-contract class, which
  step 8 had just started writing into.
- **0.7.2 —** step 8 could register the plugin **for nobody**: it wrote
  `.claude/settings.json` without checking whether `.claude/` is gitignored.
- **0.8.0 — `--layout` gained the direction that catches drift.** It had only
  ever verified *declared → exists*, never the inverse, so `agentic-kg` held
  `llm/plans/` with a file in it while its delta asserted "this repo has no such
  content" — and passed 4/4 for five releases.
- **0.8.1–0.8.3 —** the README told you to run a skill it never told you to
  install; **declaring a marketplace is not installing it** (found by an agent
  that refused a destructive instruction and verified instead); and two version
  pins that had gone stale twice, now placeholders that cannot rot.
- **0.9.0 — branch cleanup.** Asserted in three canon documents, implemented in
  none; `delete_branch_on_merge` was off in all ten repos.

## Open

Verified 2026-09-17, not carried forward — all three items previously recorded
here were stale and are resolved:

- ~~Local clone at v0.2.0 with hand-applied uncommitted fixes~~ — it is at
  **v0.9.0**, clean, on the `plugin/` layout, in sync with origin.
- ~~`/plugin marketplace add` fails; name bound to a local Directory source~~ —
  the marketplace is **installed from GitHub**
  (`~/.claude/plugins/marketplaces/agentic-governance`, fetched 2026-09-17,
  VERSION 0.9.0) and `governance@agentic-governance` shows real usage. The
  `/governance:*` skills are reachable. This also closes v0.8.2's finding that
  declaring a marketplace in `.claude/settings.json` does not install it —
  declarations were written to ten repos, and the accept has now happened.
- ~~v0.3.1 pushed directly to `main`~~ — a real bypass, but historical. Every
  release since has gone through a PR, and `governance-checks` is now a required
  status check here.

Genuinely open:

- **Issues #7 and #9** — the Published Design Surface capability and its
  post-merge follow-ups. Untouched by the v0.5.1–v0.9.0 work.
- **Backlog G-1** (model selection for delegated agents) and **G-2**
  (`establish` should make governance checks a *required* status check — it
  wires the check and leaves it advisory, so no adopted repo blocks a merge on
  it).
- **`audit` has never been run end to end** against a repo since gaining checks
  8 and 11. It is the one skill this session changed without exercising.
- **Stale version literals in adopters**, outside the deltas the deploy reached:
  `fantasy-sports/README.md:11`, `mats-12/README.md:59` +
  `CONTRIBUTING.md:5` + `systemPatterns.md:89`,
  `ai-empirical/README.md:37`, `home-network/constellation-map.md:156`.
- **Actions are pinned by mutable tag** (`actions/checkout@v4`) everywhere
  except `website`, which pins by commit SHA. A supply-chain gap, and the good
  practice came from a session that was not this one.
