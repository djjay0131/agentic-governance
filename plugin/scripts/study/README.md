# Standards-Completeness Study Harness

Status: Active
Last updated: 2026-11-19
Owner: Project owner (standards-completeness study)

## Purpose

The deterministic half of the standards-completeness study (issue #32). It
scores the E1 codings against `requirements-catalog.csv`, runs the E2 GovFault
fixture suite against the canonical checker, and builds the E4 adopter census
and human-attention ledger from a pinned manifest and a recorded API cache. All
commands are plain Node with no dependencies, and all produce byte-identical
outputs for the same inputs. Design authority:
`llm/specs/2026-11-09-standards-completeness-study-design.md` §3.1, §3.2, §3.4,
§4.

## Scope

`score.mjs`, `govfault.mjs`, `census.mjs`, their shared `lib.mjs`, and the
tests. It reads the catalog, the coding files, `governance-checks.mjs`, and the
GitHub REST API. It does not change policy, the catalog, a coding file, the
checker, or the paper. E3 and E5 are out of scope; nothing here calls an agent
or an LLM.

## Requirements

- Node.js (any recent version; no dependencies).
- `git` on `PATH`: GovFault builds real repositories, E4 checks out pinned
  commits, and the manifest records the harness and canon commits.
- The target data directory contains `requirements-catalog.csv` and one or more
  `coding-*.csv` files for E1.
- E4 `init` and `record` need a GitHub token from `GITHUB_TOKEN` (or the token
  `gh auth token` prints). `run --offline` needs no token and makes no network
  call.

## Path Resolution

The harness never hardcodes the data path. By default it reads the artifacts
slot from `llm/governance/governance-delta.md` the same way
`governance-checks.mjs` does (the `## Repository Layout` row whose label binds
`artifacts`, falling back to `docs/`), then appends
`research/standards-benchmark/`. In this repository that resolves to
`docs/research/standards-benchmark/`.

Both commands accept `--data <dir>`, which overrides the whole resolution and
points directly at the standards-benchmark directory. Tests and fixtures use it
so they never touch the repository's real results.

## E1: `score.mjs`

```bash
# Resolve the data directory from the delta, write results/ beside the inputs:
node plugin/scripts/study/score.mjs

# Explicit data directory (tests, fixtures, another checkout):
node plugin/scripts/study/score.mjs --data /path/to/standards-benchmark

# Feed a G-3 re-code if one exists at a known canon commit:
node plugin/scripts/study/score.mjs --g3-ref <sha>
```

### Validation

Before writing anything, `score.mjs` checks:

- expected catalog and coding columns are present;
- catalog `req_id`s are unique and `scope` is one of `IN`, `PARTIAL`, `OUT`,
  `DRAFT`;
- every coding file covers the catalog exactly 1:1 (no missing, extra or
  duplicate IDs);
- `depth` is an integer from 0 to 5;
- every row at depth >= 1 has an `evidence` pointer;
- an optional coding `scope` column, when present, uses a legal value.

A validation failure prints the file and row and exits non-zero without writing
results.

### Measures

Per coder and per source, and for an `ALL` aggregate: total rows, in-scope rows,
covered (depth >= 2), enforced (depth >= 4), and the 0–5 depth histogram. The
headline denominator is scope `IN`; `OUT` is always excluded and `DRAFT` is
excluded from the headline.

For every pair of coders, it writes unweighted Cohen's kappa on scope and
linear-weighted kappa on depth (fixed 0–5 scale). The scope value is the
coder's when the coding file carries a `scope` column, otherwise the catalog's
preliminary value; `e1-agreement.csv` names which source was used. A degenerate
expected matrix yields no kappa rather than a fabricated 1.0.

The four sensitivity variants in design §3.1:

| Variant | Implementation |
|---|---|
| (a) `PARTIAL` in/out | headline excludes it; `*_partial_in` columns include it |
| (b) weakest-part coding | computed when the coding files carry `weakest_part_depth`; otherwise reported as not computable |
| (c) SSDF v1.2 draft in/out | headline excludes it; `*_draft_in` columns include it |
| (d) G-3 re-code | computed when a coding file carries a different `canon_ref` (or one matching `--g3-ref`); otherwise reported as not run |

### Outputs

`results/e1-coverage.csv`, `results/e1-agreement.csv`,
`results/e1-summary.md`, and `results/manifest.json`.

When only one coding is present — as with the pilot `coding-CL.csv` — the run
still completes, and every output is labelled `PILOT`. A single-coder pilot is
not a study result, and no agreement is fabricated: `e1-agreement.csv` carries a
status row with `NA`/`NA` instead of a pair.

## E2: `govfault.mjs`

```bash
# Build F1-F12 and a clean control for each under a work directory:
node plugin/scripts/study/govfault.mjs build [--work <dir>]

# Rebuild, run default/--layout/--l0 against every fixture, write results:
node plugin/scripts/study/govfault.mjs run [--work <dir>] [--data <dir>]
```

`run` rebuilds from scratch every time. Each fixture is one small git
repository with a fixed author, email and `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`
per commit, so its base and case SHAs are stable. The default work directory is
`<tmp>/agentic-governance-govfault`; `--work` isolates concurrent runs.

Every fixture has a fixed `## Repository Layout`, an ADR and index, a memory
bank, and an `l0-allowlist` instance. The specific DOCS/ADR allow rules come
first so the fault classes stay isolated; `docs/**` is `path-only`, so F7, F8
and F12 are not caught by an unrelated allowlist-shape failure.

| Fault | Seeded violation | Expected catcher | Tier |
|---|---|---|---|
| F1 | ADR status flip that also edits decision text | `adr-status` | Checked |
| F2 | New ADR with no index row | `adr-index` | Checked |
| F3 | Design spec written under `docs/superpowers/specs/` | `layout` | Checked |
| F4 | Declared layout path that does not exist | `layout` | Checked |
| F5 | L0 change that edits the delta allowlist | `l0-paths` | Checked |
| F6 | Certification block with one unchecked declaration | `cert-present` | Checked |
| F7 | Link fix that swaps which document is referenced | none expected | Residual (auditor) |
| F8 | Checkbox ticked with no evidence | none expected | Residual (G-3) |
| F9 | Direct commit to `main` | platform / audit check 3 | Platform |
| F10 | Governance check in CI but not required | audit check 6 | Procedural (G-2) |
| F11 | Memory bank older than the last five merges | audit check 9 | Procedural |
| F12 | Backticked path to a moved file | none expected | Known blind spot |

`run` executes `governance-checks.mjs` in `default`, `--layout` and `--l0`
modes against each fault and each clean control, with `--base main`. It records
the exit code and the failing check names, then writes
`results/e2-detection.csv` and `results/manifest-e2.json`.

`match` is `yes` when the observed failing checks include the expected catcher.
For a `none` expectation it is `yes` only when nothing failed. For F9–F11 the
expected catcher is the platform or the `audit` skill, which E2 deliberately
does not run, so `match` is `no` by construction — that is the measured gap, not
a fixture defect. If F7, F8 or F12 is unexpectedly detected, or a clean control
fails, the result is reported as a finding; the fixture is not adjusted to make
it pass.

## E4: `census.mjs`

```bash
# Pin the adopters listed in canon's delta §Related Repos:
node plugin/scripts/study/census.mjs init --manifest <file.json> \
  [--window-from <date>] [--window-to <date>] [--owner <login>] [--anon-map <file.json>]

# Fetch every API response and repository snapshot the manifest needs:
node plugin/scripts/study/census.mjs record --manifest <file.json> --cache <dir>

# Compute only from the recorded cache, with no network:
node plugin/scripts/study/census.mjs run --manifest <file.json> --cache <dir> --offline [--data <dir>]
```

`init` reads canon's delta §Related Repos and resolves, for each adopter, the
default-branch head SHA, the adoption date (the oldest commit that touches the
adopter's governance delta), and a ledger window. The generated manifest is
committed, so later runs are pinned. It uses the REST API only.

`--anon-map` accepts a JSON object mapping a full repository name to a display
alias. When an alias is used, the committed manifest carries the alias and the
real mapping is written to `<manifest>.local.json`, which stays untracked. The
census, ledger, manifest and PR text then use only the alias.

`record` fetches every response the run needs and stores the raw JSON on disk
under `cache/requests/`, keyed by request. It follows REST pagination and stores
the next-page link with each response. It also stores a depth-1 bare repository
per adopter at the pinned SHA under `cache/repos/`. Credentials are used only to
fetch and are removed from the cached repository's remote before it is stored.

`run --offline` reads only the cache and never calls the network. For each
adopter it creates a temporary clone of the pinned SHA and runs the command
declared in the adopter's own `## Governance Check Command`, with
`CLAUDE_PLUGIN_ROOT` pointing at this checkout's `plugin/` directory. The
`<canon checkout>` placeholder and `${CLAUDE_PLUGIN_ROOT}` are resolved locally.
It records the exit code and the `FAIL` check names.

`e4-census.csv` has one row per adopter: pinned SHA, adoption date, default
branch, pinned canon version, current canon version, pin status, declared check
command, exit status and failing checks, CI workflow presence, whether the check
is a required status check, branch protection state, and the count of direct
(non-merge, non-PR) commits to the default branch after the adoption date.

`e4-ledger.csv` has one row per PR merged in the window: PR number, declared
level (title first, then label), level source, author type and the marker that
determined it (`Co-Authored-By`, `Claude-Session`, `Generated-with`, or a PR
body marker), number of human reviews (bots and the PR author excluded), hours
from open to first human review, hours from open to merge, and whether the level
label was reclassified downward from the issue-events history.

## Manifests and Determinism

Every run writes a manifest beside its results: `results/manifest.json` for E1,
`results/manifest-e2.json` for E2, and `results/manifest-e4.json` for E4. Each
records the canon SHA, harness SHA, the SHA-256 of every input file, and the
Node version. E2 also records the base and case SHA of every fixture. E4 also
records the input manifest hash, the cache index hash, and a cache hash over the
sorted request responses and pinned repository refs. There are no wall-clock
timestamps in any data file, and no absolute paths: results depend on input
content, not on where the data directory lives. Rows and keys are sorted.

## Tests

```bash
node plugin/scripts/study/score.test.mjs
node plugin/scripts/study/govfault.test.mjs
node plugin/scripts/study/census.test.mjs
```

`score.test.mjs` checks kappa against a hand-computed 2x2 example (2/3) and a
hand-computed 6x6 linear-weighted example (6/7), then runs the scorer in two
different data directories and asserts byte-identical outputs.

`govfault.test.mjs` runs the suite twice and asserts byte-identical outputs;
asserts every clean control passes in every mode; and asserts F1–F6 are detected
by the named check. It reports, without asserting, whether F7, F8 and F12 were
detected.

`census.test.mjs` uses the synthetic fixture cache under
`fixtures/census/`: two invented adopters, a small recorded REST cache, and two
bare repositories. It runs `run --offline` twice and asserts byte-identical
outputs, runs it in a second data directory, and runs it with network access
disabled by a preload that throws on `fetch`, `http`, `https`, `net`, `tls` and
`dns`. It also asserts the recorded census fields, marker detection, review
counting, durations and downward reclassification.

CI runs all three test files after the checker regression tests
(`.github/workflows/ci.yml`).

## Limitations

- Depth measures mechanization, not effectiveness; E2 is the check on that.
- The E2 clean control is a hand-built fixture, not a platform. Branch
  protection, required status checks and direct-commit detection are outside
  the deterministic checker, which is why F9–F11 are `match=no`.
- The fixture delta is a fixed instance, not the canon's own allowlist. It
  exists to isolate one fault at a time, not to re-test allowlist membership.
- E4 is an API snapshot pinned by the manifest. Branch protection, required
  status checks and CI presence are recorded as the API returned them at record
  time, not re-derived later.
- Direct commits use the commit's associated-PR endpoint. A commit that has no
  associated PR and no merge parent counts as direct; a squash or rebase commit
  with an associated PR does not.
- Author type is a marker heuristic, not proof of authorship. A PR with no
  agent marker is recorded as human; the recorded marker column makes the
  classification auditable.
- A committed E4 cache is optional. The raw cache is a run input and is kept
  out of git when it is large; `record` reproduces it from the pinned manifest.
- Uncertain classifications remain semantic and go to human review.

## Cross-References

- `llm/specs/2026-11-09-standards-completeness-study-design.md` — design authority
- `docs/research/standards-benchmark/coding-scheme.md` — E1 codebook
- `docs/research/standards-benchmark/benchmark-landscape.md` §4 — F1–F12
- `plugin/scripts/governance-checks.mjs` — the checker E2 exercises
- `plugin/scripts/README.md` — checker usage and declared-path resolution
