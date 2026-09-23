#!/usr/bin/env node
// EVIDENCE S1-CL-01
// kind: test
// determinism: L3
// produced-by: fixture-owner (human)
// produced-at: 2026-09-23
// replay: node checks/cl01-record-count.mjs
// replay-expect: pass
// replay-outcome: pass
// modified-replay: node checks/cl01-record-count.mjs --perturb source-score
// modified-replay-perturbation: alter one score in the source dataset in memory; the recomputed generated dataset must change
// modified-replay-expect: fail
// modified-replay-outcome: fail
//
// S1-CL-01 — "The generated dataset contains exactly nine normalized records,
// one for each source record that is both valid and uniquely identified."
//
// The research-side analogue of P1-AC-04's lesson (activity plan §13.2): the
// MODIFIED REPLAY perturbs the SOURCE DATA rather than the code, and the
// evidence must change. If the recomputed result survived a changed input,
// the claim would not actually depend on the dataset it cites — the single
// most common way a reproducible-looking pipeline is broken.
//
// This check is written against the DATA, not against the transformation's
// internals: it recomputes the generated dataset from the source and compares
// it, byte for byte, with the committed data/generated.csv.

import crypto from 'node:crypto';
import fs from 'node:fs';
import { normalize, SOURCE_PATH, GENERATED_PATH } from '../transform.mjs';

const EXPECTED_RECORDS = 9;

const perturbIdx = process.argv.indexOf('--perturb');
const perturb = perturbIdx >= 0 ? process.argv[perturbIdx + 1] : undefined;
const label = perturb ? `MODIFIED REPLAY (--perturb ${perturb})` : 'REPLAY';

let sourceText = fs.readFileSync(SOURCE_PATH, 'utf8');
if (perturb === 'source-score') {
  // One byte-level change to one accepted record's score.
  sourceText = sourceText.replace('s-002,Katherine Johnson,99', 's-002,Katherine Johnson,42');
} else if (perturb === 'source-drop-row') {
  sourceText = sourceText.replace(/^s-011,.*\n/m, '');
}

const { csv } = normalize(sourceText);
const committed = fs.readFileSync(GENERATED_PATH, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

const failures = [];
const rows = csv.trim().split('\n').slice(1);
if (rows.length !== EXPECTED_RECORDS) {
  failures.push(`recomputed record count ${rows.length} !== ${EXPECTED_RECORDS}`);
}
if (sha(csv) !== sha(committed)) {
  failures.push(`recomputed dataset sha256 ${sha(csv)} !== committed ${sha(committed)}`);
}

if (failures.length) {
  process.stdout.write(`FAIL S1-CL-01 ${label}\n${failures.map((f) => `  - ${f}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(
  `PASS S1-CL-01 ${label}: ${rows.length} records, recomputed sha256 ${sha(csv)} matches data/generated.csv\n`,
);
