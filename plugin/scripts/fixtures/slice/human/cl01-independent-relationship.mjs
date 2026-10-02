#!/usr/bin/env node
// EVIDENCE S1-CL-01
// kind: test
// determinism: L3
// produced-by: fixture-owner (human)
// produced-at: 2026-09-23
// pdatasets: S1-DS-01, S1-DS-02
// replay: node human/cl01-independent-relationship.mjs
// replay-expect: pass
// replay-outcome: pass
// modified-replay: node human/cl01-independent-relationship.mjs --perturb drop-generated-row
// modified-replay-perturbation: delete one row from the generated dataset in memory, so the relationship between the two datasets no longer holds
// modified-replay-expect: fail
// modified-replay-outcome: fail
//
// THE HUMAN-AUTHORED VARIATION (design §14.2, INDEPENDENT VERIFICATION;
// activity plan §13.2). Preserved as evidence, not as a comment about
// evidence.
//
// S1-CL-01 — "The generated dataset contains exactly nine normalized records,
// one for each source record that is both valid and uniquely identified."
//
// How this differs from `checks/cl01-record-count.mjs`, which is the agent's
// check for the same claim:
//
//   * That check imports `normalize()` from `transform.mjs` — the agent's own
//     helper — recomputes the output with it, and compares bytes. If the
//     helper's idea of the rules is wrong, the check is wrong in exactly the
//     same way, and agrees with itself.
//   * This check imports NOTHING from the pipeline. It opens `data/source.csv`
//     and `data/generated.csv` as two independent tables and computes the
//     relationship the claim sentence describes, from the sentence: which
//     source records are valid, which ids are unique, and whether the
//     generated table holds exactly one row for each and nothing else.
//   * It compares the score NUMERICALLY (`Number(a) === Number(b)`) rather
//     than reproducing `toFixed(2)`. Re-deriving the agent's formatting would
//     be re-running the agent's code by hand. What the claim asserts is that
//     no record's identity was lost, not that a particular formatting was
//     applied.
//
// MODIFIED REPLAY (`--perturb drop-generated-row`) deletes one generated row
// in memory. Nothing on disk is touched. The check MUST fail; if it passed,
// it would not actually depend on the dataset it cites.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SLICE = path.resolve(HERE, '..');
const SOURCE_CSV = path.join(SLICE, 'data', 'source.csv');
const GENERATED_CSV = path.join(SLICE, 'data', 'generated.csv');

const EXPECTED_RECORDS = 9;
const HEADER = 'id,name,score,recorded_at';

const perturbIdx = process.argv.indexOf('--perturb');
const perturb = perturbIdx >= 0 ? process.argv[perturbIdx + 1] : undefined;
const label = perturb ? `MODIFIED REPLAY (--perturb ${perturb})` : 'REPLAY';

/** Read a CSV into header + row objects. No dependency, no shared helper. */
function table(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const rows = text.split('\n').filter((l) => l.trim() !== '');
  const header = rows.shift();
  return {
    header,
    rows: rows.map((line, i) => {
      const [id, name, score, recordedAt] = line.split(',');
      return { line: i + 2, id, name, score, recordedAt, raw: line };
    }),
  };
}

const failures = [];
const source = table(SOURCE_CSV);
const generated = table(GENERATED_CSV);

if (source.header !== HEADER) failures.push(`source header is "${source.header}", expected "${HEADER}"`);
if (generated.header !== HEADER) failures.push(`generated header is "${generated.header}", expected "${HEADER}"`);

// --- the claim's own predicate, read off the sentence -----------------------
//     "...one for each source record that is both valid and uniquely identified"
const isValid = (r) => [r.id, r.name, r.score, r.recordedAt].every((f) => (f ?? '').trim() !== '')
  && Number.isFinite(Number(r.score));

const occurrences = new Map();
for (const r of source.rows) {
  const key = (r.id ?? '').trim().toUpperCase();
  if (!isValid(r)) continue;
  occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
}
const tolerateDuplicates = perturb === 'tolerate-duplicates';
const expected = new Map();
for (const r of source.rows) {
  if (!isValid(r)) continue;
  const key = r.id.trim().toUpperCase();
  if (!tolerateDuplicates && occurrences.get(key) > 1) continue;
  if (!expected.has(key)) expected.set(key, r);
}

// --- the generated table, perturbed only in memory --------------------------
let generatedRows = generated.rows;
if (perturb === 'drop-generated-row') generatedRows = generatedRows.slice(0, -1);

// A. the stated count
if (generatedRows.length !== EXPECTED_RECORDS) {
  failures.push(`generated dataset holds ${generatedRows.length} records, the claim says ${EXPECTED_RECORDS}`);
}
if (expected.size !== EXPECTED_RECORDS) {
  failures.push(`${expected.size} source records are valid and uniquely identified, the claim says ${EXPECTED_RECORDS}`);
}

// B. one generated row per qualifying source record, and nothing else
const seen = new Map();
for (const g of generatedRows) {
  const key = (g.id ?? '').trim();
  seen.set(key, (seen.get(key) ?? 0) + 1);
  if (!expected.has(key)) {
    failures.push(`generated id ${key} has no valid, uniquely-identified source record`);
  }
}
for (const [key, n] of seen) {
  if (n !== 1) failures.push(`generated id ${key} appears ${n} times, expected exactly 1`);
}
for (const key of expected.keys()) {
  if (!seen.has(key)) failures.push(`source record ${key} is valid and unique but has no generated row`);
}

// C. the relationship itself: the generated row must still BE that record.
for (const [key, src] of expected) {
  const g = generatedRows.find((r) => (r.id ?? '').trim() === key);
  if (!g) continue;
  const squash = (s) => (s ?? '').trim().replace(/\s+/g, ' ');
  if (squash(g.name) !== squash(src.name)) {
    failures.push(`${key}: generated name "${g.name}" is not the source name "${src.name}"`);
  }
  if (Number(g.score) !== Number(src.score)) {
    failures.push(`${key}: generated score ${g.score} is not the source score ${src.score}`);
  }
  if (squash(g.recordedAt) !== squash(src.recordedAt)) {
    failures.push(`${key}: generated recorded_at ${g.recordedAt} is not the source ${src.recordedAt}`);
  }
}

if (failures.length) {
  process.stdout.write(`FAIL S1-CL-01 ${label}\n${failures.map((f) => `  - ${f}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(
  `PASS S1-CL-01 ${label}: ${generatedRows.length} generated records match the ${expected.size} valid, `
  + 'uniquely-identified source records one-for-one, computed independently of transform.mjs\n',
);
