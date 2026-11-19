#!/usr/bin/env node
// Tests for the E2 GovFault harness (govfault.mjs).
//
// Required by the study contract: run the command twice and assert byte-
// identical outputs; every clean control must pass; F1-F6 must be detected by
// the named check. F7, F8 and F12 are reported, not asserted: the contract says
// an unexpected detection is a finding to record, not a fixture to adjust.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOVFAULT = fileURLToPath(new URL('./govfault.mjs', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const OUTPUTS = ['e2-detection.csv', 'manifest-e2.json'];
const EXPECTED = {
  F1: 'adr-status',
  F2: 'adr-index',
  F3: 'layout',
  F4: 'layout',
  F5: 'l0-paths',
  F6: 'cert-present',
};

let failed = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`PASS  ${name}`); return; }
  failed++;
  console.log(`FAIL  ${name}`);
  if (detail) console.log(`      ${detail.split('\n').join('\n      ')}`);
}
function runGovfault(work, data) {
  try {
    return { code: 0, out: execFileSync('node', [GOVFAULT, 'run', '--work', work, '--data', data], {
      cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000,
    }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}
// The CSV this harness writes contains no commas inside fields, so a split is
// safe here; the harness itself uses the shared RFC4180 parser.
function readRows(file) {
  const lines = fs.readFileSync(file, 'utf8').trimEnd().split('\n');
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'study-govfault-'));
const work = path.join(tmp, 'work');
const data = path.join(tmp, 'bench');
fs.mkdirSync(data, { recursive: true });

const first = runGovfault(work, data);
check('govfault run exits 0', first.code === 0, first.out);
const snapshot = new Map(OUTPUTS.map((f) => [f, fs.readFileSync(path.join(data, 'results', f))]));

const second = runGovfault(work, data);
check('govfault rerun exits 0', second.code === 0, second.out);
for (const f of OUTPUTS) {
  const next = fs.readFileSync(path.join(data, 'results', f));
  check(`${f} is byte-identical on rerun`, snapshot.get(f).equals(next),
    `${snapshot.get(f).length} vs ${next.length} bytes`);
}

const rows = readRows(path.join(data, 'results', 'e2-detection.csv'));
const controls = rows.filter((r) => r.row_type === 'control');
check('every clean control was run in all three modes', controls.length === 12 * 3,
  `got ${controls.length} control rows`);
const badControls = controls.filter((r) => r.exit_code !== '0' || r.failing_checks !== '');
check('every clean control passes in every mode', badControls.length === 0,
  badControls.map((r) => `${r.fault}/${r.mode}: exit=${r.exit_code} failing=${r.failing_checks}`).join('\n'));

for (const [fault, expected] of Object.entries(EXPECTED)) {
  const faultRows = rows.filter((r) => r.row_type === 'fault' && r.fault === fault);
  const hit = faultRows.find((r) => r.failing_checks.split(';').includes(expected));
  check(`${fault} is detected by ${expected}`,
    Boolean(hit),
    faultRows.map((r) => `${r.mode}: exit=${r.exit_code} failing=${r.failing_checks || '-'}`).join('\n'));
}

for (const fault of ['F7', 'F8', 'F12']) {
  const faultRows = rows.filter((r) => r.row_type === 'fault' && r.fault === fault);
  const detected = faultRows.filter((r) => r.failing_checks !== '');
  console.log(`INFO  ${fault} deterministic-layer detections: ${detected.length === 0 ? 'none (as expected)' : detected.map((r) => `${r.mode}=${r.failing_checks}`).join(', ')}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed === 0 ? '\nall govfault tests passed' : `\n${failed} govfault test(s) failed`);
process.exit(failed === 0 ? 0 : 1);
