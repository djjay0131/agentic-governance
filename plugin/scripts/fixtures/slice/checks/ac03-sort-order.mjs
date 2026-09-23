#!/usr/bin/env node
// EVIDENCE P1-AC-03
// kind: test
// determinism: L3
// produced-by: fixture-builder (agent)
// produced-at: 2026-09-20
// pdatasets: S1-DS-01
// replay: node checks/ac03-sort-order.mjs
// replay-expect: pass
// replay-outcome: pass
// modified-replay: node checks/ac03-sort-order.mjs --perturb shuffle-output
// modified-replay-perturbation: reverse the transformation's output order
// modified-replay-expect: fail
// modified-replay-outcome: fail
//
// P1-AC-03 — one output row per accepted source record, rows sorted by
// normalized id.
//
// This check is sound and its modified replay fails as it should. The claim
// still ends up `NOT VERIFIED`, and not because the evidence is weak: the
// claim's *sentence* was edited after it was human-verified, so the
// verification no longer binds to the wording on the page (design §5.4).
// The reset is visible in the claim's marker block, which appends and never
// erases (design §3.5).

import fs from 'node:fs';
import { normalize, SOURCE_PATH } from '../transform.mjs';

const perturbIdx = process.argv.indexOf('--perturb');
const perturb = perturbIdx >= 0 ? process.argv[perturbIdx + 1] : undefined;
const label = perturb ? `MODIFIED REPLAY (--perturb ${perturb})` : 'REPLAY';

const { csv, accepted } = normalize(fs.readFileSync(SOURCE_PATH, 'utf8'));
let rows = csv.trim().split('\n').slice(1);
if (perturb === 'shuffle-output') rows = [...rows].reverse();

const failures = [];
if (rows.length !== accepted.length) {
  failures.push(`row count ${rows.length} !== accepted source record count ${accepted.length}`);
}
const ids = rows.map((r) => r.split(',')[0]);
const sorted = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
if (ids.join('\u0000') !== sorted.join('\u0000')) {
  failures.push(`output ids are not sorted ascending: ${ids.join(' ')}`);
}

if (failures.length) {
  process.stdout.write(`FAIL P1-AC-03 ${label}\n${failures.map((f) => `  - ${f}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`PASS P1-AC-03 ${label}: ${rows.length} rows, sorted ascending by normalized id\n`);
