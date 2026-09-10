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

import { execFileSync } from 'node:child_process';
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

function runChecker(dir, args = ['--layout']) {
  try {
    return { code: 0, out: execFileSync('node', [CHECKER, ...args], { cwd: dir, encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function check(name, cond, detail) {
  if (cond) { console.log(`PASS  ${name}`); return; }
  failed++;
  console.log(`FAIL  ${name}`);
  if (detail) console.log(`      ${detail.split('\n').join('\n      ')}`);
}

const delta = (layoutLines) => `# Governance Delta: fixture

Governance: agentic-governance v0.6

## Repository Layout

${layoutLines}

## L0 Path Allowlist

\`\`\`l0-allowlist
allow llm/** link-target-only
\`\`\`
`;

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

console.log(failed === 0 ? '\nall regression tests passed' : `\n${failed} regression test(s) failed`);
process.exit(failed === 0 ? 0 : 1);
