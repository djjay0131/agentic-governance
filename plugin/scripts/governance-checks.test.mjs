#!/usr/bin/env node
// Regression tests for governance-checks.mjs.
//
// The checker is the enforcement mechanism for the two-plane rule, and until
// v0.6.0 it had no tests. It shipped a silent defect for the whole life of the
// `artifacts` slot: LAYOUT_SLOTS matched labels by unanchored substring, and
// /plan/i matched the delta template's own "Artifacts directory (the data
// plane)" label, so the artifacts declaration bound to `plans` and artifacts
// fell back to its default. A repo declaring a non-default artifacts directory
// had the drift scan pointed at the wrong tree and was told PASS.
//
// The script has no main guard and resolves ROOT from `git rev-parse`, so these
// are end-to-end: build a throwaway git repo, run the real checker in it, and
// assert on its output and exit code.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECKER = fileURLToPath(new URL('./governance-checks.mjs', import.meta.url));
let failed = 0;

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'govchk-'));
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  // `git init -b` needs git >= 2.28; this runs on 2.25 too.
  git('init', '-q');
  execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], { cwd: dir, stdio: 'pipe' });
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'test');
  git('add', '-A');
  git('commit', '-qm', 'fixture');
  return dir;
}

// stdout AND stderr, on every run. The checker reports some findings on stderr
// (WARN lines — e.g. the count of un-ID'd claims), so a helper that captured
// stderr only when the run failed could not assert on them at all.
function runChecker(dir, args = ['--layout']) {
  const r = spawnSync('node', [CHECKER, ...args], { cwd: dir, encoding: 'utf8' });
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function check(name, cond, detail) {
  if (cond) { console.log(`PASS  ${name}`); return; }
  failed++;
  console.log(`FAIL  ${name}`);
  if (detail) console.log(`      ${detail.split('\n').join('\n      ')}`);
}

// `opts.roadmap` fills the delta's `## Roadmap` block (the claim source the
// verification-markers check reads); `opts.allowlist` replaces the fenced
// l0-allowlist body. Both default to today's behaviour so every pre-existing
// call site is unchanged.
const delta = (layoutLines, opts = {}) => `# Governance Delta: fixture

Governance: agentic-governance v0.6

## Repository Layout

${layoutLines}

## Roadmap

Path: ${opts.roadmap ?? 'none. This fixture tracks no roadmap.'}

## L0 Path Allowlist

\`\`\`l0-allowlist
${opts.allowlist ?? 'allow llm/** link-target-only'}
\`\`\`
`;

// A complete Administrative Change Certification, so an --l0 run fails on the
// diff shape under test and not on a missing certification.
const CERT = `## Administrative Change Certification

- **Governance level:** L0
- **Declarations**
  - [x] Architecture
  - [x] Product meaning and requirements
  - [x] ADR meaning (content and decisions)
  - [x] Business rules
  - [x] Privacy and consent policy
  - [x] Security posture and controls
  - [x] Implementation behavior (code, schemas, migrations, executable configuration)
`;

// Commit `files` onto a feature branch, so the checker sees them as the PR's
// diff against `main`. Keys absent from `files` are left alone; a null value
// deletes the file.
function branchEdit(dir, files) {
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  git('checkout', '-q', '-b', 'feature');
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    if (body === null) fs.rmSync(abs, { force: true });
    else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, body);
    }
  }
  git('add', '-A');
  git('-c', 'user.email=t@e.invalid', '-c', 'user.name=t', 'commit', '-qm', 'the change under test');
}

// An --l0 run against `main`, with the certification supplied from a file so
// the cert check never masks the shape check.
function runL0(dir) {
  const certPath = path.join(dir, '.cert.md');
  fs.writeFileSync(certPath, CERT);
  return runChecker(dir, ['--l0', '--base', 'main', '--cert-file', certPath]);
}

// ---------------------------------------------------------------------------
// The bug: "Artifacts directory (the data plane)" must bind `artifacts`.
// A control-plane document under the DECLARED artifacts dir must be flagged.
// Before the fix, artifacts fell back to "docs", so `published/` went unscanned
// and the checker reported PASS.
// ---------------------------------------------------------------------------
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta(
      '- Governance directory: `llm/governance/`\n' +
      '- Artifacts directory (the data plane): `published/`'
    ),
    // a POLICY_BASENAME: control plane, must never sit in the artifacts tree
    'published/architecture-governance.md': '# nope\n',
    'docs/README.md': '# decoy: the OLD default artifacts dir, deliberately clean\n',
  });
  const { code, out } = runChecker(dir);
  check(
    'artifacts label containing "plane" binds artifacts, not plans',
    /FAIL {2}layout/.test(out) && out.includes('published/architecture-governance.md'),
    `exit=${code}\n${out}`
  );
  check(
    'the drift scan reads the DECLARED artifacts dir, not the default',
    !/docs\/README\.md/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// A declared path that does not exist must fail. This is the kgcs #8/#9
// collision: declaring `plans` over a directory nothing occupies.
// ---------------------------------------------------------------------------
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta(
      '- Governance directory: `llm/governance/`\n' +
      '- Plans directory: `llm/plans/`'
    ),
    'docs/README.md': '# artifacts\n',
  });
  const { out } = runChecker(dir);
  check(
    'a declared-but-missing path fails with the slot named',
    /FAIL {2}layout/.test(out) && /plans declared as "llm\/plans"/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// "Sprint plans directory" must bind sprints, not plans (v0.5.0 ordering).
// Asserted here so the \b-anchoring change cannot silently undo it.
// ---------------------------------------------------------------------------
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta(
      '- Governance directory: `llm/governance/`\n' +
      '- Sprint plans directory: `llm/sprints/`'
    ),
    'llm/sprints/README.md': '# sprints\n',
    'docs/README.md': '# artifacts\n',
  });
  const { out } = runChecker(dir);
  check(
    '"Sprint plans directory" binds sprints, not plans',
    /PASS {2}layout/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// No delta at all: a graded SKIP, never a bare PASS. A check that verifies
// nothing must say so.
// ---------------------------------------------------------------------------
{
  const dir = fixture({ 'docs/README.md': '# artifacts\n' });
  const { out } = runChecker(dir);
  check(
    'a missing delta reports SKIP, not PASS',
    /SKIP {2}layout/.test(out) && /NOT VERIFIED/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// adr-index / adr-status must NOT pass on a nonexistent ADR directory.
// Two repos (mats-12-application, agentic-kgis) ran for weeks with both checks
// green while the checker resolved ADR_REL to a directory that did not exist:
// adrFiles() returned [] and the empty set satisfied every assertion.
// ---------------------------------------------------------------------------
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta('- Governance directory: `llm/governance/`'),
    'docs/README.md': '# artifacts\n',
  });
  const { out } = runChecker(dir);
  check(
    'adr-index SKIPs when the ADR directory does not exist',
    /SKIP {2}adr-index/.test(out) && /no ADR was checked/.test(out),
    out
  );
  check(
    'adr-status SKIPs when the ADR directory does not exist',
    /SKIP {2}adr-status/.test(out),
    out
  );
  check(
    'neither ADR check reports a bare PASS on an absent directory',
    !/PASS {2}adr-index/.test(out) && !/PASS {2}adr-status/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// A directory that exists but holds no ADRs is also verifying nothing.
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta(
      '- Governance directory: `llm/governance/`\n' +
      '- ADR directory: `llm/governance/adr/`'
    ),
    'llm/governance/adr/README.md': '# Index\n',
    'docs/README.md': '# artifacts\n',
  });
  const { out } = runChecker(dir);
  check(
    'an ADR directory with no ADRs SKIPs rather than passing',
    /SKIP {2}adr-index/.test(out) && /contains no ADR files/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// A real ADR that agrees with its index row still passes — the guard must not
// turn every repo's ADR checks into a permanent SKIP.
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta(
      '- Governance directory: `llm/governance/`\n' +
      '- ADR directory: `llm/governance/adr/`'
    ),
    'llm/governance/adr/0001-a-real-decision.md': '# ADR-0001\n\nStatus: Accepted\n',
    'llm/governance/adr/README.md':
      '# Index\n\n| ADR | Title | Status |\n|---|---|---|\n' +
      '| [0001](0001-a-real-decision.md) | A real decision | Accepted |\n',
    'docs/README.md': '# artifacts\n',
  });
  const { out } = runChecker(dir);
  check(
    'a populated, consistent ADR directory still PASSes',
    /PASS {2}adr-index/.test(out) && /PASS {2}adr-status/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// A passing run must not print git's own error text. existsInBase probes the
// base with `cat-file -e` and handles the miss, but execFileSync inherits
// stderr as well as capturing it, so every absent file leaked a bare
// "fatal: Not a valid object name" into CI logs on an otherwise green run.
// ---------------------------------------------------------------------------
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta(
      '- Governance directory: `llm/governance/`\n' +
      '- ADR directory: `llm/governance/adr/`'
    ),
    'llm/governance/adr/0001-x.md': '# ADR-0001\n\nStatus: Accepted\n',
    'llm/governance/adr/README.md':
      '# Index\n\n| ADR | Title | Status |\n|---|---|---|\n| [0001](0001-x.md) | X | Accepted |\n',
    'docs/README.md': '# artifacts\n',
  });
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  git('checkout', '-q', '-b', 'feature');
  // files absent from the base: each one drives an expected-negative probe
  for (let i = 0; i < 4; i++) fs.writeFileSync(path.join(dir, `llm/governance/new-${i}.md`), `# new ${i}\n`);
  git('add', '-A');
  git('-c', 'user.email=t@e.invalid', '-c', 'user.name=t', 'commit', '-qm', 'add files absent from base');

  let stderr = '';
  try {
    execFileSync('node', [CHECKER, '--base', 'main', '--layout'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    stderr = e.stderr ?? '';
  }
  check(
    "git's own error text never reaches stderr",
    !/fatal:/.test(stderr),
    `stderr was:\n${stderr}`
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// exists -> declared. --layout verified declared->exists from the start, but
// never the inverse, so a repo could hold control-plane content in a canonical
// slot directory it never declared and still be told PASS. agentic-kg carried
// llm/plans/ with a file in it while its delta asserted "this repo has no such
// content", and all four checks passed.
// ---------------------------------------------------------------------------
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta('- Governance directory: `llm/governance/`'),
    'llm/plans/a-real-plan.md': '# a plan nobody declared\n',
    'docs/README.md': '# artifacts\n',
  });
  const { out } = runChecker(dir);
  check(
    'content in an undeclared canonical slot fails',
    /FAIL {2}layout/.test(out) && /"llm\/plans" exists and holds content.*plans slot is not declared/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// A directory with NO canonical slot is legitimate — canon documents such paths
// as deliberately outside the slot table (llm/session_notes/, llm/construction/).
// It must not false-positive.
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta('- Governance directory: `llm/governance/`'),
    'llm/session_notes/2026-09-10-a-note.md': '# journal\n',
    'docs/README.md': '# artifacts\n',
  });
  const { out } = runChecker(dir);
  check(
    'a directory with no canonical slot is not flagged',
    /PASS {2}layout/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// An undeclared artifacts slot must NOT be flagged: docs/ exists in nearly every
// repo for unrelated reasons, and the slot has a safe canonical default.
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta('- Governance directory: `llm/governance/`'),
    'docs/index.md': '# a published site\n',
  });
  const { out } = runChecker(dir);
  check(
    'an undeclared artifacts slot is not flagged',
    /PASS {2}layout/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// ===========================================================================
// The sixth L0 diff shape: `verification-marker` (design §3.5, §9.1;
// activity plan A2). The marker block on a claim line is APPEND-ONLY, and
// this shape is the enforcer — "Removal is a violation, and it is
// mechanically checkable".
//
// Every case below is a MODIFIED REPLAY: the passing case is stated once, and
// each following case perturbs exactly one thing that should break it. A shape
// check that cannot be made to fail proves nothing.
// ===========================================================================

const MARKER_LAYOUT =
  '- Governance directory: `llm/governance/`\n' +
  '- ADR directory: `llm/governance/adr/`';

const markerFixture = (roadmapBody, extra = {}) =>
  fixture({
    'llm/governance/governance-delta.md': delta(MARKER_LAYOUT, {
      roadmap: '`llm/master-roadmap.md`',
      // the roadmap line must precede any broader `llm/**` rule: first match wins
      allowlist: 'allow llm/master-roadmap.md verification-marker\nallow llm/** link-target-only',
    }),
    'llm/governance/adr/0001-x.md': '# ADR-0001\n\nStatus: Accepted\n',
    'llm/governance/adr/README.md':
      '# Index\n\n| ADR | Title | Status |\n|---|---|---|\n| [0001](0001-x.md) | X | Accepted |\n',
    'llm/master-roadmap.md': roadmapBody,
    'docs/README.md': '# artifacts\n',
    ...extra,
  });

const ROADMAP_BASE = `# Roadmap

## Phase 1

- [x] \`P1-AC-01\` A gate test asserts that no \`/p/**\` response carries \`public\` (ADR-0004)
  — AGENT VERIFIED (PR #22, 2026-09-16)
`;

// The permitted change: append one well-formed marker line. Nothing else.
{
  const dir = markerFixture(ROADMAP_BASE);
  branchEdit(dir, {
    'llm/master-roadmap.md': ROADMAP_BASE + '  — NEEDS REWORK (PR #23, 2026-09-18)\n',
  });
  const { out } = runL0(dir);
  check(
    'verification-marker: appending a well-formed marker passes --l0',
    /PASS {2}l0-paths/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: delete the existing marker line. This is the append-only
// violation the shape exists for, and the one `status-line-only` would permit.
{
  const dir = markerFixture(ROADMAP_BASE);
  branchEdit(dir, {
    'llm/master-roadmap.md': ROADMAP_BASE.replace('  — AGENT VERIFIED (PR #22, 2026-09-16)\n', ''),
  });
  const { code, out } = runL0(dir);
  check(
    'verification-marker: DELETING an existing marker line fails --l0',
    code !== 0 && /FAIL {2}l0-paths/.test(out) && /append-only/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: rewrite an existing marker in place (PR #22 -> PR #99).
// A 1:1 replacement is exactly what the other paired shapes allow, so this is
// the case that proves `verification-marker` is not one of them.
{
  const dir = markerFixture(ROADMAP_BASE);
  branchEdit(dir, {
    'llm/master-roadmap.md': ROADMAP_BASE.replace('PR #22, 2026-09-16', 'PR #99, 2026-09-18'),
  });
  const { code, out } = runL0(dir);
  check(
    'verification-marker: EDITING an existing marker in place fails --l0',
    code !== 0 && /FAIL {2}l0-paths/.test(out) && /append-only/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: change the claim TEXT while preserving its marker
// (activity plan A2-AC-03 — without this the shape would permit silent claim
// rewriting, which is the whole point of §5.4).
{
  const dir = markerFixture(ROADMAP_BASE);
  branchEdit(dir, {
    'llm/master-roadmap.md': ROADMAP_BASE.replace(
      'no `/p/**` response carries `public`',
      'no `/p/**` response carries `public` or `s-maxage`'
    ),
  });
  const { code, out } = runL0(dir);
  check(
    'verification-marker: editing the CLAIM TEXT fails --l0',
    code !== 0 && /FAIL {2}l0-paths/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: malformed appended markers (A2-AC-04) — free prose in the
// parenthetical, a missing PR citation, and a state word that is not one of
// the six.
for (const [label, line, expect] of [
  ['free prose in the parenthetical', '  — HUMAN VERIFIED (I checked it myself, PR #25)\n', /no free prose|missing the PR citation/],
  ['missing PR citation', '  — AGENT VERIFIED (2026-09-18)\n', /missing the PR citation/],
  ['unlisted state word', '  — TOTALLY VERIFIED (PR #25, 2026-09-18)\n', /state must be one of/],
  ['reset with no date', '  — NOT VERIFIED (artifact changed: tests/x.py)\n', /reason and a date/],
  ['hyphen instead of em dash', '  - AGENT VERIFIED (PR #25, 2026-09-18)\n', /em dash/],
]) {
  const dir = markerFixture(ROADMAP_BASE);
  branchEdit(dir, { 'llm/master-roadmap.md': ROADMAP_BASE + line });
  const { code, out } = runL0(dir);
  check(
    `verification-marker: a malformed marker (${label}) fails --l0`,
    code !== 0 && /FAIL {2}l0-paths/.test(out) && expect.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: the central attack. An agent, in the lane where an AI role
// may merge, appends `HUMAN VERIFIED` to a claim. The marker is perfectly
// well-formed; the assertion is not the agent's to make (§5.2, §5.3).
for (const state of ['HUMAN VERIFIED', 'HUMAN REVIEWED']) {
  const dir = markerFixture(ROADMAP_BASE);
  branchEdit(dir, {
    'llm/master-roadmap.md': ROADMAP_BASE + `  — ${state} (PR #25, 2026-09-18)\n`,
  });
  const { code, out } = runL0(dir);
  check(
    `verification-marker: an L0 diff asserting "${state}" fails --l0`,
    code !== 0 && /FAIL {2}l0-paths/.test(out) && /human-only state/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// A2-AC-06: the five pre-existing shapes are untouched. Neither of these was
// covered by a test before the sixth shape was added, so the claim "nothing
// regressed" rested on nothing.
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta(MARKER_LAYOUT, {
      allowlist:
        'allow llm/master-roadmap.md checkbox-only\n' +
        'allow llm/governance/adr/README.md index-table-rows\n' +
        'allow llm/governance/adr/[0-9][0-9][0-9][0-9]-*.md status-line-only',
    }),
    'llm/governance/adr/0001-x.md': '# ADR-0001\n\nStatus: Proposed\n',
    'llm/governance/adr/README.md':
      '# Index\n\n| ADR | Title | Status |\n|---|---|---|\n| [0001](0001-x.md) | X | Proposed |\n',
    'llm/master-roadmap.md': '# Roadmap\n\n- [ ] Ship the thing\n',
    'docs/README.md': '# artifacts\n',
  });
  branchEdit(dir, {
    'llm/master-roadmap.md': '# Roadmap\n\n- [x] Ship the thing\n',
    'llm/governance/adr/0001-x.md': '# ADR-0001\n\nStatus: Accepted (via PR #7, 2026-09-18)\n',
    'llm/governance/adr/README.md':
      '# Index\n\n| ADR | Title | Status |\n|---|---|---|\n| [0001](0001-x.md) | X | Accepted |\n',
  });
  const { out } = runL0(dir);
  check(
    'the pre-existing checkbox-only and status-line-only shapes still pass',
    /PASS {2}l0-paths/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// A checkbox toggle is NOT a marker append. Declaring `verification-marker`
// over a file buys append-only enforcement and gives up in-lane tick flips —
// stated here so the trade is a tested fact rather than a footnote.
{
  const dir = markerFixture('# Roadmap\n\n- [ ] `P1-AC-01` A claim\n');
  branchEdit(dir, { 'llm/master-roadmap.md': '# Roadmap\n\n- [x] `P1-AC-01` A claim\n' });
  const { code, out } = runL0(dir);
  check(
    'verification-marker: a bare checkbox flip is not an append and fails --l0',
    code !== 0 && /append-only/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// ===========================================================================
// Marker grammar and state validation over the declared claim source
// (design §3.4 grammar, §5.2 transitions, §5.3 mechanism 4 / §6.3 the
// determinism cap).
// ===========================================================================

// No claim source declared: SKIP, never a bare PASS.
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta(MARKER_LAYOUT),
    'llm/governance/adr/0001-x.md': '# ADR-0001\n\nStatus: Accepted\n',
    'llm/governance/adr/README.md':
      '# Index\n\n| ADR | Title | Status |\n|---|---|---|\n| [0001](0001-x.md) | X | Accepted |\n',
    'docs/README.md': '# artifacts\n',
  });
  const { code, out } = runChecker(dir);
  check(
    'verification-markers SKIPs when no claim source is declared',
    code === 0 && /SKIP {2}verification-markers/.test(out) && /NOT VERIFIED/.test(out),
    out
  );
  check(
    'verification-markers never reports a bare PASS on an undeclared source',
    !/PASS {2}verification-markers/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: the claim source is declared and absent. A declared source
// that is missing is a gap, and gaps are loud — never an empty PASS.
{
  const dir = markerFixture(ROADMAP_BASE);
  fs.rmSync(path.join(dir, 'llm/master-roadmap.md'), { force: true });
  execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['-c', 'user.email=t@e.invalid', '-c', 'user.name=t', 'commit', '-qm', 'drop roadmap'], { cwd: dir, stdio: 'pipe' });
  const { code, out } = runChecker(dir);
  check(
    'a declared-but-absent claim source FAILs rather than passing empty',
    code !== 0 && /FAIL {2}verification-markers/.test(out) && /does not exist/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// The happy path: well-formed grammar, a legal transition chain, L3 evidence
// under a HUMAN VERIFIED claim.
const EVIDENCE_L3 = 'def test_cache():\n    """P1-AC-01 — L3 deterministic replay of the cache gate."""\n';
const ROADMAP_HUMAN = `# Roadmap

- [x] \`P1-AC-01\` A gate test asserts that no \`/p/**\` response carries \`public\` (ADR-0004)
  — AGENT VERIFIED (PR #22, 2026-09-16)
  — HUMAN VERIFIED (PR #25, 2026-09-17)
`;
{
  const dir = markerFixture(ROADMAP_HUMAN, { 'tests/test_cache.py': EVIDENCE_L3 });
  const { code, out } = runChecker(dir);
  check(
    'a well-formed marker chain with L3 evidence PASSes',
    code === 0 && /PASS {2}verification-markers/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: the determinism cap, from the strong side. Same claim, same
// HUMAN VERIFIED marker — only the evidence's declared level drops from L3 to
// L1 (attested, the WEAKEST level, §14.1 as amended). This pair is also the
// guard against implementing the scale upside down: invert DETERMINISM_RANK
// and this test passes while the one above fails.
{
  const dir = markerFixture(ROADMAP_HUMAN, {
    'tests/test_cache.py': 'def test_cache():\n    """P1-AC-01 — L1 attested: I read the config and it looked right."""\n',
  });
  const { code, out } = runChecker(dir);
  check(
    'an L1-only claim reaching HUMAN VERIFIED FAILs (the determinism cap)',
    code !== 0 && /FAIL {2}verification-markers/.test(out) && /only evidence is L1/.test(out) && /AGENT VERIFIED/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: no evidence anywhere cites the claim, yet it is HUMAN
// VERIFIED. §6.3 caps a claim with no evidence at NOT VERIFIED.
{
  const dir = markerFixture(ROADMAP_HUMAN);
  const { code, out } = runChecker(dir);
  check(
    'a HUMAN VERIFIED claim with no evidence citation at all FAILs',
    code !== 0 && /no evidence anywhere in the tree cites it/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: evidence exists and cites the claim but declares no level.
// §14.1: an undeclared level is a gap marker, never a default — the safe-
// looking default would silently cap, the useful-looking one would launder.
{
  const dir = markerFixture(ROADMAP_HUMAN, {
    'tests/test_cache.py': 'def test_cache():\n    """P1-AC-01 — the cache gate."""\n',
  });
  const { code, out } = runChecker(dir);
  check(
    'evidence with no declared determinism level FAILs as a gap',
    code !== 0 && /no citing artifact declares a determinism level/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: an illegal transition per §5.2's exhaustive table. NEEDS
// REWORK has exactly one legal successor — the NOT VERIFIED reset — so
// re-promoting in place must be refused. L3 evidence is present, so the cap
// cannot be what fails here.
{
  const dir = markerFixture(
    `# Roadmap

- [x] \`P1-AC-01\` A gate test asserts the cache gate (ADR-0004)
  — NEEDS REWORK (PR #22, 2026-09-16)
  — HUMAN VERIFIED (PR #25, 2026-09-17)
`,
    { 'tests/test_cache.py': EVIDENCE_L3 }
  );
  const { code, out } = runChecker(dir);
  check(
    'an illegal transition (NEEDS REWORK -> HUMAN VERIFIED) FAILs',
    code !== 0 && /illegal transition "NEEDS REWORK" -> "HUMAN VERIFIED"/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// A reset APPENDS and is legal from any state; re-promotion after it is legal
// too. The control for the test above: the transition check must not simply
// reject every second marker.
{
  const dir = markerFixture(
    `# Roadmap

- [x] \`P1-AC-01\` A gate test asserts the cache gate (ADR-0004)
  — HUMAN VERIFIED (PR #25, 2026-09-17)
  — NOT VERIFIED (artifact changed: tests/test_cache.py, 2026-09-18)
  — AGENT VERIFIED (PR #26, 2026-09-19)
`,
    { 'tests/test_cache.py': EVIDENCE_L3 }
  );
  const { code, out } = runChecker(dir);
  check(
    'a reset marker, then re-verification, is a legal chain',
    code === 0 && /PASS {2}verification-markers/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: malformed grammar inside the claim file itself — the check
// must see it even when no diff is involved.
{
  const dir = markerFixture(
    '# Roadmap\n\n- [x] `P1-AC-01` A claim\n  — HUMAN VERIFIED (looked fine to me)\n',
    { 'tests/test_cache.py': EVIDENCE_L3 }
  );
  const { code, out } = runChecker(dir);
  check(
    'a malformed marker in the claim file FAILs the grammar check',
    code !== 0 && /malformed verification marker/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: a marker on a claim with no ID. Verification binds to an
// addressable claim; an un-ID'd claim cannot be cited by its evidence, so the
// marker asserts something nothing can check.
{
  const dir = markerFixture('# Roadmap\n\n- [x] A claim with no ID\n  — AGENT VERIFIED (PR #22, 2026-09-16)\n');
  const { code, out } = runChecker(dir);
  check(
    'a marker on an un-ID\'d claim FAILs',
    code !== 0 && /carries a verification marker but no claim ID/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: a marker orphaned from any claim — it reads to a human
// exactly like verification while binding to nothing.
{
  const dir = markerFixture('# Roadmap\n\n- [x] `P1-AC-01` A claim\n\n— AGENT VERIFIED (PR #22, 2026-09-16)\n');
  const { code, out } = runChecker(dir);
  check(
    'a marker attached to no claim FAILs',
    code !== 0 && /not attached to any claim/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// No false positives: an ordinary roadmap of un-ID'd, unmarked checkboxes is
// legal (adoption is incremental, absent marker = NOT VERIFIED) — but the
// un-ID'd claims must still be counted and reported, never silently dropped.
{
  const dir = markerFixture('# Roadmap\n\n- [x] Ship the thing\n- [ ] Ship the other thing\n');
  const { code, out } = runChecker(dir);
  check(
    'an unmarked, un-ID\'d roadmap PASSes and reports the un-ID\'d count',
    code === 0 && /PASS {2}verification-markers/.test(out) && /2 claim\(s\) carry no claim ID/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: the marker is crammed onto the claim line instead of onto
// its own line below it. §3.5 reads the state off the last marker LINE, so
// this asserts nothing — while reading to a human exactly like verification.
// Found by attacking the first implementation, which passed it silently.
{
  const dir = markerFixture(
    '# Roadmap\n\n- [x] `P1-AC-01` A claim — HUMAN VERIFIED (PR #25, 2026-09-17)\n'
  );
  const { code, out } = runChecker(dir);
  check(
    'a marker written on the claim line itself FAILs',
    code !== 0 && /written on the claim line itself/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// DEFECT INJECTED: one claim ID used twice, the first copy HUMAN VERIFIED with
// no evidence. A claim ID is an address; a duplicate lets a verified copy
// shadow an unverified one in every lookup. The first implementation keyed
// state by ID and dropped the first copy's cap check entirely.
{
  const dir = markerFixture(
    `# Roadmap

- [x] \`P1-AC-01\` The original
  — HUMAN VERIFIED (PR #25, 2026-09-17)
- [x] \`P1-AC-01\` The shadow
  — AGENT VERIFIED (PR #22, 2026-09-16)
`
  );
  const { code, out } = runChecker(dir);
  check(
    'a duplicated claim ID FAILs, and the shadowed copy is still cap-checked',
    code !== 0 &&
      /claim ID P1-AC-01 is already used/.test(out) &&
      /no evidence anywhere in the tree cites it/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// The two checks are layered, and the layering is load-bearing: the shape sees
// only diff lines, so a legally-shaped append that produces an ILLEGAL state
// chain passes `l0-paths` and is caught by `verification-markers` in the same
// run. Neither check alone is sufficient; the run is.
{
  const dir = markerFixture(ROADMAP_BASE);
  branchEdit(dir, {
    'llm/master-roadmap.md': ROADMAP_BASE + '  — AGENT VERIFIED (PR #23, 2026-09-18)\n',
  });
  const { code, out } = runL0(dir);
  check(
    'a well-shaped append producing an illegal transition still fails the run',
    code !== 0 &&
      /PASS {2}l0-paths/.test(out) &&
      /FAIL {2}verification-markers/.test(out) &&
      /illegal transition "AGENT VERIFIED" -> "AGENT VERIFIED"/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// An unfilled `## Roadmap` placeholder (the delta template ships one) must read
// as "undeclared" and SKIP — not resolve to the template's own example path and
// fail every repo that has not filled it in.
{
  const dir = fixture({
    'llm/governance/governance-delta.md': delta(MARKER_LAYOUT, {
      roadmap: '[e.g. `llm/master-roadmap.md`; "none" if the project has no roadmap document yet.]',
    }),
    'llm/governance/adr/0001-x.md': '# ADR-0001\n\nStatus: Accepted\n',
    'llm/governance/adr/README.md':
      '# Index\n\n| ADR | Title | Status |\n|---|---|---|\n| [0001](0001-x.md) | X | Accepted |\n',
    'docs/README.md': '# artifacts\n',
  });
  const { code, out } = runChecker(dir);
  check(
    'an unfilled Roadmap placeholder SKIPs instead of failing',
    code === 0 && /SKIP {2}verification-markers/.test(out),
    out
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(failed === 0 ? '\nall regression tests passed' : `\n${failed} regression test(s) failed`);
process.exit(failed === 0 ? 0 : 1);
