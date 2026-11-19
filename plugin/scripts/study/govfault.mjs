#!/usr/bin/env node
// E2 GovFault harness for the standards-completeness study.
//
// Builds one fixed git repository per fault class F1-F12 plus a clean control
// for each, then runs governance-checks.mjs in default, --layout and --l0
// modes. Fixtures use a fixed author, email and GIT_*_DATE, so their SHAs are
// stable across reruns. No timestamps or absolute paths are written to results.
//
// Usage:
//   node govfault.mjs build [--work <dir>]
//   node govfault.mjs run   [--work <dir>] [--data <dir>]
//
// --data points at the standards-benchmark directory; without it the directory
// is resolved from the delta's declared artifacts tree plus
// research/standards-benchmark/. --work defaults to a stable temp path.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  gitRoot, gitSha, resolveDataDir, sha256File, stableStringify, toCsv,
} from './lib.mjs';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const CHECKER = path.resolve(HARNESS_DIR, '..', 'governance-checks.mjs');
const DEFAULT_WORK = path.join(os.tmpdir(), 'agentic-governance-govfault');

const AUTHOR = {
  GIT_AUTHOR_NAME: 'GovFault Fixture',
  GIT_AUTHOR_EMAIL: 'govfault@example.invalid',
  GIT_COMMITTER_NAME: 'GovFault Fixture',
  GIT_COMMITTER_EMAIL: 'govfault@example.invalid',
};
const BASE_DATE = '2000-01-01T00:00:00 +0000';
const CASE_DATE = '2000-03-01T00:00:00 +0000';
const extraDate = (n) => `2000-02-${String(n).padStart(2, '0')}T00:00:00 +0000`;

const DELTA = `# Governance Delta: GovFault fixture

Status: Active

## Repository Layout

- Governance directory: \`llm/governance/\`
- ADR directory: \`llm/governance/adr/\`
- Memory-bank path: \`llm/memory_bank/\`
- Artifacts directory: \`docs/\`

## L0 Path Allowlist

\`\`\`l0-allowlist
# Fixture instance. Specific DOCS/ADR rules first so the fault classes stay
# isolated; docs/** is path-only so F7, F8 and F12 are not caught by an
# unrelated allowlist-shape failure.
allow docs/checklist.md checkbox-only
allow llm/governance/adr/README.md index-table-rows
allow llm/governance/adr/[0-9][0-9][0-9][0-9]-*.md status-line-only
allow llm/** link-target-only
allow docs/** path-only
deny src/**
deny .github/**
deny llm/governance/governance-delta.md
\`\`\`
`;

const ADR_0001 = `# ADR-0001: A fixture decision

Status: Accepted

Context: a fixed fixture.

Decision: keep the fixture simple.

Consequences: none.
`;

const ADR_INDEX = `# ADR index

| ADR | Title | Status | Date |
|---|---|---|---|
| [0001](0001-a-decision.md) | A fixture decision | Accepted | 2000-01-01 |
`;

const BASE_FILES = {
  'llm/governance/governance-delta.md': DELTA,
  'llm/governance/adr/0001-a-decision.md': ADR_0001,
  'llm/governance/adr/README.md': ADR_INDEX,
  'llm/memory_bank/activeContext.md': '# Active context\n\nFixture state.\n',
  'docs/README.md': '# Docs\n\nSee the [guide](guide.md) for details.\n',
  'docs/guide.md': '# Guide\n\nA guide.\n',
  'docs/other.md': '# Other\n\nAnother document.\n',
  'docs/checklist.md': '# Checklist\n\n- [ ] Confirm evidence\n',
};

const VALID_CERT = `## Administrative Change Certification

- [x] Architecture
- [x] Product meaning and requirements
- [x] ADR meaning
- [x] Business rules
- [x] Privacy and consent policy
- [x] Security posture and controls
- [x] Implementation behavior
`;
const INVALID_CERT = VALID_CERT.replace('- [x] Product meaning and requirements', '- [ ] Product meaning and requirements');

const MODES = [
  ['default', []],
  ['layout', ['--layout']],
  ['l0', ['--l0', '--cert-file', '.cert.md']],
];

function git(dir, args, env = {}) {
  return execFileSync('git', args, {
    cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...AUTHOR, ...env },
  });
}

function commit(dir, message, date) {
  execFileSync('git', [
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null',
    'commit', '-q', '-m', message,
  ], {
    cwd: dir, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...AUTHOR, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
}

function writeFiles(dir, files) {
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
}

function initRepo(dir) {
  fs.mkdirSync(dir, { recursive: true });
  writeFiles(dir, BASE_FILES);
  git(dir, ['init', '-q', '.']);
  git(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  git(dir, ['config', 'user.email', AUTHOR.GIT_AUTHOR_EMAIL]);
  git(dir, ['config', 'user.name', AUTHOR.GIT_AUTHOR_NAME]);
  git(dir, ['config', 'core.autocrlf', 'false']);
  git(dir, ['add', '-A']);
  commit(dir, 'base', BASE_DATE);
}

function appendDocs(dir, line) {
  fs.appendFileSync(path.join(dir, 'docs', 'README.md'), line);
}

function applyControl(dir) {
  appendDocs(dir, '\nA benign documentation edit.\n');
}

function applyF1(dir) {
  const adr = path.join(dir, 'llm/governance/adr/0001-a-decision.md');
  fs.writeFileSync(adr, ADR_0001
    .replace('Status: Accepted', 'Status: Superseded')
    .replace('Decision: keep the fixture simple.', 'Decision: the decision text is edited too.'));
  const index = path.join(dir, 'llm/governance/adr/README.md');
  fs.writeFileSync(index, ADR_INDEX.replace('| A fixture decision | Accepted |', '| A fixture decision | Superseded |'));
}

function applyF2(dir) {
  const adr = path.join(dir, 'llm/governance/adr/0002-new-decision.md');
  fs.writeFileSync(adr, '# ADR-0002: A new decision\n\nStatus: Accepted\n\nContext: new.\n\nDecision: new.\n\nConsequences: none.\n');
}

function applyF3(dir) {
  const spec = path.join(dir, 'docs/superpowers/specs/2026-11-09-fixture-design.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# A design document in the data plane\n');
}

function editDelta(dir, transform) {
  const file = path.join(dir, 'llm/governance/governance-delta.md');
  fs.writeFileSync(file, transform(fs.readFileSync(file, 'utf8')));
}

function applyF4(dir) {
  editDelta(dir, (text) => text.replace(
    '- Artifacts directory: `docs/`',
    '- Artifacts directory: `docs/`\n- Plans directory: `llm/plans/`',
  ));
}

function applyF5(dir) {
  editDelta(dir, (text) => text.replace(
    'allow docs/** path-only',
    'allow docs/extra.md path-only\nallow docs/** path-only',
  ));
}

function applyF7(dir) {
  const file = path.join(dir, 'docs/README.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('[guide](guide.md)', '[guide](other.md)'));
}

function applyF8(dir) {
  const file = path.join(dir, 'docs/checklist.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('- [ ] Confirm evidence', '- [x] Confirm evidence'));
}

function applyF12(dir) {
  appendDocs(dir, '\nA moved path is `moved.md`.\n');
}

// Fault classes. `external` means the expected catcher is the platform or the
// audit skill, which E2 deliberately does not run; the deterministic checker
// therefore cannot match it. `none` means the honest-gaps declaration says no
// mechanical catcher exists, so a clean run is the match.
const FAULTS = [
  { id: 'F1', expected: 'adr-status', apply: applyF1 },
  { id: 'F2', expected: 'adr-index', apply: applyF2 },
  { id: 'F3', expected: 'layout', apply: applyF3 },
  { id: 'F4', expected: 'layout', apply: applyF4 },
  { id: 'F5', expected: 'l0-paths', apply: applyF5 },
  { id: 'F6', expected: 'cert-present', apply: applyControl, cert: 'invalid' },
  { id: 'F7', expected: 'none', apply: applyF7 },
  { id: 'F8', expected: 'none', apply: applyF8 },
  { id: 'F9', expected: 'platform (audit check 3)', external: true, directMain: true, apply: applyControl },
  {
    id: 'F10',
    expected: 'audit check 6',
    external: true,
    apply: applyControl,
    baseExtra: {
      '.github/workflows/ci.yml': 'name: ci\non: [push, pull_request]\njobs:\n  governance-checks:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: node plugin/scripts/governance-checks.mjs --layout\n',
    },
  },
  { id: 'F11', expected: 'audit check 9', external: true, mainExtraCommits: 5, apply: applyControl },
  { id: 'F12', expected: 'none', apply: applyF12 },
];

function buildCase(spec, work, { control = false } = {}) {
  const id = control ? `C-${spec.id}` : spec.id;
  const dir = path.join(work, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const extra = control ? {} : (spec.baseExtra || {});
  writeFiles(dir, { ...BASE_FILES, ...extra });
  git(dir, ['init', '-q', '.']);
  git(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  git(dir, ['config', 'user.email', AUTHOR.GIT_AUTHOR_EMAIL]);
  git(dir, ['config', 'user.name', AUTHOR.GIT_AUTHOR_NAME]);
  git(dir, ['config', 'core.autocrlf', 'false']);
  git(dir, ['add', '-A']);
  commit(dir, 'base', BASE_DATE);

  const extraCommits = control ? 0 : (spec.mainExtraCommits || 0);
  for (let i = 1; i <= extraCommits; i++) {
    appendDocs(dir, `\nPost-adoption change ${i}.\n`);
    git(dir, ['add', '-A']);
    commit(dir, `post-adoption-${i}`, extraDate(i));
  }
  const mainSha = git(dir, ['rev-parse', 'HEAD']).trim();

  const directMain = !control && Boolean(spec.directMain);
  if (!directMain) git(dir, ['checkout', '-q', '-b', 'case']);
  const apply = control ? applyControl : spec.apply;
  apply(dir);
  git(dir, ['add', '-A']);
  commit(dir, directMain ? 'direct commit to main' : 'case', CASE_DATE);
  const caseSha = git(dir, ['rev-parse', 'HEAD']).trim();

  const cert = control || spec.cert !== 'invalid' ? VALID_CERT : INVALID_CERT;
  fs.writeFileSync(path.join(dir, '.cert.md'), cert);
  return { dir, mainSha, caseSha };
}

function buildAll(work) {
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  const fixtures = {};
  for (const spec of FAULTS) {
    fixtures[spec.id] = buildCase(spec, work);
    fixtures[`C-${spec.id}`] = buildCase(spec, work, { control: true });
  }
  return fixtures;
}

function runChecker(dir, modeArgs) {
  try {
    const out = execFileSync('node', [CHECKER, '--base', 'main', ...modeArgs], {
      cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function failingChecks(out) {
  return [...out.matchAll(/^FAIL\s+(\S+)/gm)].map((m) => m[1]);
}

function judge(expected, failing, external) {
  if (expected === 'none') return failing.length === 0 ? 'yes' : 'no';
  if (external) return 'no';
  return failing.includes(expected) ? 'yes' : 'no';
}

function runAll(work, dataDir) {
  const fixtures = buildAll(work);
  const rows = [[
    'row_type', 'fault', 'mode', 'exit_code', 'failing_checks', 'expected_catcher', 'match',
  ]];
  const fixtureShas = {};
  for (const spec of FAULTS) {
    for (const control of [false, true]) {
      const id = control ? `C-${spec.id}` : spec.id;
      const built = fixtures[id];
      fixtureShas[id] = { main_sha: built.mainSha, case_sha: built.caseSha };
      for (const [mode, modeArgs] of MODES) {
        const result = runChecker(built.dir, modeArgs);
        const failing = failingChecks(result.out);
        const expected = control ? 'none' : spec.expected;
        rows.push([
          control ? 'control' : 'fault', id, mode, result.code,
          failing.join(';'), expected,
          judge(expected, failing, control ? false : Boolean(spec.external)),
        ]);
      }
    }
  }

  const inputs = {
    'governance-checks.mjs': sha256File(CHECKER),
    'govfault.mjs': sha256File(fileURLToPath(import.meta.url)),
    'lib.mjs': sha256File(path.join(HARNESS_DIR, 'lib.mjs')),
  };
  const harnessRoot = gitRoot(HARNESS_DIR);
  const manifest = {
    experiment: 'E2',
    canon_sha: gitSha(harnessRoot, 'HEAD'),
    harness_sha: gitSha(harnessRoot, 'HEAD'),
    node_version: process.version,
    inputs,
    fixtures: fixtureShas,
  };

  const resultsDir = path.join(dataDir, 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(path.join(resultsDir, 'e2-detection.csv'), toCsv(rows));
  fs.writeFileSync(path.join(resultsDir, 'manifest-e2.json'), stableStringify(manifest));
  return rows.length - 1;
}

function argValue(args, flag, fallback = null) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const work = path.resolve(argValue(args, '--work', DEFAULT_WORK));
  if (command === 'build') {
    const fixtures = buildAll(work);
    console.log(`built ${Object.keys(fixtures).length} fixture repositories under ${work}`);
    return;
  }
  if (command === 'run') {
    const dataDir = resolveDataDir({ data: argValue(args, '--data'), root: gitRoot() });
    fs.mkdirSync(dataDir, { recursive: true });
    const count = runAll(work, dataDir);
    console.log(`wrote e2-detection.csv with ${count} rows`);
    return;
  }
  console.error('usage: node govfault.mjs build|run [--work <dir>] [--data <dir>]');
  process.exit(2);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(`govfault: ${e.message}`);
    process.exit(1);
  }
}
