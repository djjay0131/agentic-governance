#!/usr/bin/env node
// Tests for the E1 scoring harness (score.mjs).
//
// The study contract requires two things of this file before the harness is
// written: a determinism test that runs the command twice and compares outputs
// byte for byte, and a kappa test against hand-computed 2x2 and 6x6 examples.
// The examples below are worked by hand in the comments so a reviewer can check
// the expected numbers without running the implementation.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linearWeightedKappa, unweightedKappa } from './score.mjs';
import { parseCsv, toCsv } from './lib.mjs';

const SCORE = fileURLToPath(new URL('./score.mjs', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const PILOT = path.join(REPO_ROOT, 'docs', 'research', 'standards-benchmark');
const OUTPUTS = ['e1-coverage.csv', 'e1-agreement.csv', 'e1-summary.md', 'manifest.json'];

let failed = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`PASS  ${name}`); return; }
  failed++;
  console.log(`FAIL  ${name}`);
  if (detail) console.log(`      ${detail.split('\n').join('\n      ')}`);
}
function close(actual, expected, tolerance = 1e-12) {
  return typeof actual === 'number' && Math.abs(actual - expected) <= tolerance;
}
function runScore(args) {
  try {
    return { code: 0, out: execFileSync('node', [SCORE, ...args], {
      cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}
function pilotData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'study-score-'));
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ['requirements-catalog.csv', 'coding-CL.csv']) {
    fs.copyFileSync(path.join(PILOT, f), path.join(dir, f));
  }
  return dir;
}

// ---------------------------------------------------------------------------
// 2x2 unweighted kappa, hand-computed.
//
//   a = 1 1 1 0 0 0
//   b = 1 1 0 0 0 0
//
// Confusion matrix: [[3,0],[1,2]] (rows = b, cols = a; symmetric here).
// po = (3 + 2) / 6 = 5/6.
// Row marginals: 3,3. Column marginals: 2,4.
// pe = (3/6)(2/6) + (3/6)(4/6) = 1/6 + 1/3 = 1/2.
// kappa = (5/6 - 1/2) / (1 - 1/2) = (1/3) / (1/2) = 2/3.
// ---------------------------------------------------------------------------
{
  const k = unweightedKappa([1, 1, 1, 0, 0, 0], [1, 1, 0, 0, 0, 0], [0, 1]);
  check('2x2 unweighted kappa = 2/3', close(k, 2 / 3), `got ${k}`);
}

// ---------------------------------------------------------------------------
// 6x6 linear-weighted kappa, hand-computed on the 0..5 depth scale.
//
//   a = 0 0 0 1 1 1 2 2 2 3 3 3 4 4 4 5 5 5   (3 of each)
//   b = 0 0 1 1 1 2 2 2 3 3 3 4 4 4 5 5 5 5
//
// Confusion matrix: diagonal 2 for 0..4 and 3 for 5 = 13 agreements;
// one off-by-one in each of the five adjacent pairs = 5 disagreements.
// n = 18. Weights w_ij = 1 - |i-j|/5.
// po_w = (13*1 + 5*4/5) / 18 = 17/18.
// Column marginals q = [1/9, 1/6, 1/6, 1/6, 1/6, 2/9].
// Sum over i of w_ij by column = [3, 3.8, 4.2, 4.2, 3.8, 3].
// pe_w = (1/6) * sum_j q_j * sum_i w_ij = (1/6)(11/3) = 11/18.
// kappa_w = (17/18 - 11/18) / (1 - 11/18) = (6/18)/(7/18) = 6/7.
// ---------------------------------------------------------------------------
{
  const a = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5];
  const b = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5];
  const k = linearWeightedKappa(a, b, [0, 1, 2, 3, 4, 5]);
  check('6x6 linear-weighted kappa = 6/7', close(k, 6 / 7), `got ${k}`);
}

// ---------------------------------------------------------------------------
// Validation: an illegal depth and missing evidence for a non-zero depth must
// stop the run and name both defects. The catalog and IDs stay valid so only
// the two field rules are under test.
// ---------------------------------------------------------------------------
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'study-score-bad-'));
  fs.copyFileSync(path.join(PILOT, 'requirements-catalog.csv'), path.join(dir, 'requirements-catalog.csv'));
  const rows = parseCsv(fs.readFileSync(path.join(PILOT, 'coding-CL.csv'), 'utf8'));
  const header = rows[0];
  const idAt = header.indexOf('req_id');
  const depthAt = header.indexOf('depth');
  const evidenceAt = header.indexOf('evidence');
  for (const row of rows.slice(1)) {
    if (row[idAt] === '12207-6.2.1') row[depthAt] = '9';
    if (row[idAt] === '12207-6.2.5') row[evidenceAt] = '';
  }
  fs.writeFileSync(path.join(dir, 'coding-BAD.csv'), toCsv(rows));
  const { code, out } = runScore(['--data', dir]);
  check('an illegal depth fails validation', code !== 0 && /depth "9" is not an integer from 0 to 5/.test(out), out);
  check('missing evidence at depth >= 1 fails validation', /depth 2 requires an evidence pointer/.test(out), out);
  check('validation failure writes no results directory', !fs.existsSync(path.join(dir, 'results')), out);
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Determinism: same inputs twice -> byte-identical outputs. Run once in each of
// two different data directories, so an absolute path leaking into an output is
// caught as well as an unstable ordering.
// ---------------------------------------------------------------------------
{
  const dataA = pilotData();
  const dataB = pilotData();
  const first = runScore(['--data', dataA]);
  check('score exits 0 on the pilot data', first.code === 0, first.out);

  const a = new Map(OUTPUTS.map((f) => [f, fs.readFileSync(path.join(dataA, 'results', f))]));
  const again = runScore(['--data', dataA]);
  check('score rerun in the same directory exits 0', again.code === 0, again.out);
  for (const f of OUTPUTS) {
    const b = fs.readFileSync(path.join(dataA, 'results', f));
    check(`${f} is byte-identical on rerun`, a.get(f).equals(b), `${a.get(f).length} vs ${b.length} bytes`);
  }

  const other = runScore(['--data', dataB]);
  check('score run in a second data directory exits 0', other.code === 0, other.out);
  for (const f of OUTPUTS) {
    const b = fs.readFileSync(path.join(dataB, 'results', f));
    check(`${f} does not depend on the data directory path`, a.get(f).equals(b), `${a.get(f).length} vs ${b.length} bytes`);
  }

  for (const f of ['e1-coverage.csv', 'e1-agreement.csv', 'e1-summary.md']) {
    const text = fs.readFileSync(path.join(dataA, 'results', f), 'utf8');
    check(`${f} is labelled PILOT`, /PILOT/.test(text), text.slice(0, 120));
  }

  fs.rmSync(dataA, { recursive: true, force: true });
  fs.rmSync(dataB, { recursive: true, force: true });
}

console.log(failed === 0 ? '\nall score tests passed' : `\n${failed} score test(s) failed`);
process.exit(failed === 0 ? 0 : 1);
