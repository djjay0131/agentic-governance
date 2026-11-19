#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './lib.mjs';

const CENSUS = fileURLToPath(new URL('./census.mjs', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const FIXTURE = path.join(REPO_ROOT, 'plugin', 'scripts', 'study', 'fixtures', 'census');
const MANIFEST = path.join(FIXTURE, 'manifest.json');
const CACHE = path.join(FIXTURE, 'cache');
const BLOCKER = path.join(FIXTURE, 'network-blocker.cjs');
const OUTPUTS = ['e4-census.csv', 'e4-ledger.csv', 'manifest-e4.json'];

let failed = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`PASS  ${name}`);
    return;
  }
  failed++;
  console.log(`FAIL  ${name}`);
  if (detail) console.log(`      ${String(detail).split('\n').join('\n      ')}`);
}

function run(args, extraEnv = {}) {
  try {
    return {
      code: 0,
      out: execFileSync('node', [CENSUS, ...args], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120000,
        env: { ...process.env, ...extraEnv },
      }),
    };
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

function freshDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'census-test-'));
}

function runArgs(data) {
  return ['run', '--manifest', MANIFEST, '--cache', CACHE, '--offline', '--data', data];
}

function table(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const header = rows[0];
  return rows.slice(1).map((row) => Object.fromEntries(header.map((name, i) => [name, row[i] ?? ''])));
}

const dataA = freshDir();
const first = run(runArgs(dataA));
check('census run --offline exits 0', first.code === 0, first.out);
const snapshot = new Map(OUTPUTS.map((file) => [file, fs.readFileSync(path.join(dataA, 'results', file))]));

const second = run(runArgs(dataA));
check('census rerun --offline exits 0', second.code === 0, second.out);
for (const file of OUTPUTS) {
  const next = fs.readFileSync(path.join(dataA, 'results', file));
  check(`${file} is byte-identical on rerun`, snapshot.get(file).equals(next),
    `${snapshot.get(file).length} vs ${next.length} bytes`);
}

const dataB = freshDir();
const third = run(runArgs(dataB));
check('census run in a second data directory exits 0', third.code === 0, third.out);
for (const file of OUTPUTS) {
  const next = fs.readFileSync(path.join(dataB, 'results', file));
  check(`${file} does not depend on the data directory path`, snapshot.get(file).equals(next),
    `${snapshot.get(file).length} vs ${next.length} bytes`);
}

const dataC = freshDir();
const baseOptions = process.env.NODE_OPTIONS || '';
const blockedOptions = `${baseOptions}${baseOptions ? ' ' : ''}--require ${BLOCKER}`;
const blocked = run(runArgs(dataC), { NODE_OPTIONS: blockedOptions });
check('run --offline exits 0 with network access disabled', blocked.code === 0, blocked.out);
for (const file of OUTPUTS) {
  check(`run --offline writes ${file} with network disabled`,
    fs.existsSync(path.join(dataC, 'results', file)));
}

const census = table(path.join(dataA, 'results', 'e4-census.csv'));
const ledger = table(path.join(dataA, 'results', 'e4-ledger.csv'));
check('census has two adopter rows', census.length === 2, JSON.stringify(census));
const alpha = census.find((row) => row.repo === 'example-alpha/standard-adopter');
const beta = census.find((row) => row.repo === 'example-beta/floating-adopter');

check('pinned SHA is recorded', alpha && alpha.commit_sha === '5c407785eeb9c9f9e556fa7ddfc66cff2f28d1ee', alpha && alpha.commit_sha);
check('declared check passes for the standard adopter', alpha && alpha.check_status === 'pass', alpha && alpha.check_status);
check('required status check is detected', alpha && alpha.required_status_check === 'yes', alpha && alpha.required_status_check);
check('branch protection is detected', alpha && alpha.branch_protection === 'protected', alpha && alpha.branch_protection);
check('CI workflow presence is detected', alpha && alpha.ci_workflow_present === 'yes', alpha && alpha.ci_workflow_present);
check('direct commits after adoption are counted', alpha && alpha.direct_commits_after_adoption === '1', alpha && alpha.direct_commits_after_adoption);
check('pinned version is compared with current', alpha && alpha.pinned_canon_version === 'v0.8.0'
  && alpha.current_canon_version === 'v0.9.1' && alpha.pin_status === 'behind', alpha && JSON.stringify(alpha));

check('declared check failure is recorded', beta && beta.check_status === 'fail', beta && beta.check_status);
check('failing check name is recorded', beta && beta.check_failing_checks === 'layout', beta && beta.check_failing_checks);
check('missing branch protection is recorded', beta && beta.branch_protection === 'none', beta && beta.branch_protection);
check('missing CI workflow is recorded', beta && beta.ci_workflow_present === 'no', beta && beta.ci_workflow_present);

check('ledger has three merged PR rows', ledger.length === 3, JSON.stringify(ledger));
const pr10 = ledger.find((row) => row.repo === 'example-alpha/standard-adopter' && row.pr_number === '10');
const pr11 = ledger.find((row) => row.repo === 'example-alpha/standard-adopter' && row.pr_number === '11');
const pr20 = ledger.find((row) => row.repo === 'example-beta/floating-adopter' && row.pr_number === '20');

check('declared level is read from the title', pr10 && pr10.declared_level === 'L3' && pr10.level_source === 'title', pr10 && JSON.stringify(pr10));
check('agent author is detected from a trailer', pr10 && pr10.author_type === 'agent' && pr10.author_marker.includes('co-authored-by'), pr10 && pr10.author_marker);
check('human reviews exclude bots and the author', pr10 && pr10.human_reviews === '2', pr10 && pr10.human_reviews);
check('time to first review is recorded', pr10 && pr10.hours_open_to_first_review === '12.000', pr10 && pr10.hours_open_to_first_review);
check('time to merge is recorded', pr10 && pr10.hours_open_to_merge === '54.000', pr10 && pr10.hours_open_to_merge);
check('downward reclassification is detected', pr10 && pr10.reclassified_downward === 'yes'
  && pr10.reclassification_from === 'L3' && pr10.reclassification_to === 'L2', pr10 && JSON.stringify(pr10));

check('human author with no marker is recorded', pr11 && pr11.author_type === 'human' && pr11.author_marker === 'none', pr11 && JSON.stringify(pr11));
check('no reclassification is recorded', pr11 && pr11.reclassified_downward === 'no', pr11 && pr11.reclassified_downward);

check('Claude-Session marker is recorded', pr20 && pr20.author_type === 'agent' && pr20.author_marker.includes('claude-session'), pr20 && pr20.author_marker);
check('no human review yields an empty duration', pr20 && pr20.human_reviews === '0' && pr20.hours_open_to_first_review === '', pr20 && JSON.stringify(pr20));

for (const dir of [dataA, dataB, dataC]) fs.rmSync(dir, { recursive: true, force: true });
console.log(failed === 0 ? '\nall census tests passed' : `\n${failed} census test(s) failed`);
process.exit(failed === 0 ? 0 : 1);
