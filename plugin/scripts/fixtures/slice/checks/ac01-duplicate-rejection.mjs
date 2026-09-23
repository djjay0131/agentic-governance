#!/usr/bin/env node
// EVIDENCE P1-AC-01
// kind: test
// determinism: L3
// produced-by: fixture-builder (agent)
// produced-at: 2026-09-22
// pdatasets: S1-DS-01
// replay: node checks/ac01-duplicate-rejection.mjs
// replay-expect: pass
// replay-outcome: pass
// modified-replay: node checks/ac01-duplicate-rejection.mjs --perturb accept-duplicates
// modified-replay-perturbation: stop rejecting duplicate source ids in the transformation
// modified-replay-expect: fail
// modified-replay-outcome: fail
//
// P1-AC-01 — "Every valid source record produces exactly one normalized output
// record, and duplicate source IDs are rejected."
//
// Three assertions, each of which a broken transformation would trip:
//   A. every valid, uniquely-identified source record appears exactly once;
//   B. the duplicated source id appears zero times in the output;
//   C. the output contains no id the source did not contain.
//
// Assertion B is the one MODIFIED REPLAY perturbs. Run with
// `--perturb accept-duplicates` this check MUST fail; a pass would mean the
// check does not depend on the behaviour it claims to assert.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, SOURCE_PATH } from '../transform.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const perturbIdx = process.argv.indexOf('--perturb');
const perturb = perturbIdx >= 0 ? process.argv[perturbIdx + 1] : undefined;

const sourceText = fs.readFileSync(SOURCE_PATH, 'utf8');
const sourceRows = sourceText.trim().split('\n').slice(1).map((l) => l.split(','));

const counts = new Map();
const validIds = [];
for (const [id, name, score, at] of sourceRows) {
  const ok = (id ?? '').trim() && (name ?? '').trim() && (score ?? '').trim()
    && Number.isFinite(Number(score)) && (at ?? '').trim();
  if (!ok) continue;
  const key = id.trim();
  counts.set(key, (counts.get(key) ?? 0) + 1);
  validIds.push(key);
}
const uniqueValid = [...counts.entries()].filter(([, n]) => n === 1).map(([id]) => id);
const duplicated = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);

const { csv } = normalize(sourceText, { perturb });
const outIds = csv.trim().split('\n').slice(1).map((l) => l.split(',')[0]);

const failures = [];

// A. exactly one output record per valid, uniquely-identified source record
for (const id of uniqueValid) {
  const n = outIds.filter((o) => o === id.toUpperCase()).length;
  if (n !== 1) failures.push(`A: source id ${id} produced ${n} output records, expected exactly 1`);
}

// B. duplicate source ids are rejected
if (duplicated.length === 0) {
  failures.push('B: the source fixture contains no duplicate id — this check would be vacuous');
}
for (const id of duplicated) {
  const n = outIds.filter((o) => o === id.toUpperCase()).length;
  if (n !== 0) failures.push(`B: duplicate source id ${id} produced ${n} output records, expected 0 (rejected)`);
}

// C. no invented ids
for (const id of outIds) {
  if (!validIds.some((v) => v.toUpperCase() === id)) failures.push(`C: output id ${id} is not in the source`);
}

const label = perturb ? `MODIFIED REPLAY (--perturb ${perturb})` : 'REPLAY';
if (failures.length) {
  process.stdout.write(`FAIL P1-AC-01 ${label}\n${failures.map((f) => `  - ${f}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(
  `PASS P1-AC-01 ${label}: ${uniqueValid.length} unique valid source records -> ${outIds.length} output records; `
  + `${duplicated.length} duplicated source id(s) rejected\n`,
);
void HERE;
