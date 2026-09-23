#!/usr/bin/env node
// transform.mjs — the slice fixture's deterministic normalization step.
//
//   data/source.csv  ──►  data/generated.csv
//
// Plain Node, zero dependencies, no network, no clock, no randomness: the
// same source bytes always produce the same output bytes. That is what makes
// the evidence resting on it `L3` (design §14.1).
//
// Normalization rules, stated so the claims above it are falsifiable:
//   1. A record is VALID when it has exactly four fields, a non-empty `id`,
//      a non-empty `name`, and a `score` that parses as a finite number.
//   2. A source `id` seen more than once is REJECTED — the first occurrence
//      and every later one. A duplicate id is an integrity fault in the
//      source, not a tie to be broken.
//   3. `id` is upper-cased; `name` is trimmed and has internal whitespace
//      collapsed to a single space; `score` is formatted to two decimals;
//      `recorded_at` passes through unchanged.
//   4. Output rows are sorted by normalized `id`, ascending, byte-wise.
//
// Usage:
//   node transform.mjs                  # rewrite data/generated.csv
//   node transform.mjs --check          # verify the committed output matches
//
// `--perturb <name>` exists for MODIFIED REPLAY (design §14.2). It never
// touches a committed file; it changes behaviour in memory only.
//   --perturb accept-duplicates   stop rejecting duplicate source ids

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SOURCE_PATH = path.join(HERE, 'data', 'source.csv');
export const GENERATED_PATH = path.join(HERE, 'data', 'generated.csv');

export const HEADER = 'id,name,score,recorded_at';

/** Split a CSV text into trimmed, non-empty physical lines. */
function lines(text) {
  return text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
}

/**
 * Normalize source CSV text into generated CSV text.
 *
 * @param {string} sourceText raw bytes of data/source.csv, as UTF-8
 * @param {{perturb?: string}} [opts]
 * @returns {{csv: string, accepted: object[], rejected: object[]}}
 */
export function normalize(sourceText, opts = {}) {
  const acceptDuplicates = opts.perturb === 'accept-duplicates';
  const rows = lines(sourceText);
  const header = rows.shift();
  if (header !== HEADER) throw new Error(`source header must be "${HEADER}", got "${header}"`);

  const parsed = rows.map((line, i) => {
    const fields = line.split(',');
    return { line: i + 2, fields, raw: line };
  });

  // Rule 1 — validity.
  const rejected = [];
  const valid = [];
  for (const rec of parsed) {
    const [id, name, score, recordedAt] = rec.fields;
    const ok = rec.fields.length === 4
      && (id ?? '').trim() !== ''
      && (name ?? '').trim() !== ''
      && (score ?? '').trim() !== ''
      && Number.isFinite(Number(score))
      && (recordedAt ?? '').trim() !== '';
    if (!ok) rejected.push({ ...rec, reason: 'invalid record' });
    else valid.push({ ...rec, id: id.trim(), name, score, recordedAt });
  }

  // Rule 2 — duplicate source ids are rejected.
  const seen = new Map();
  for (const rec of valid) seen.set(rec.id, (seen.get(rec.id) ?? 0) + 1);
  const accepted = [];
  for (const rec of valid) {
    if (!acceptDuplicates && seen.get(rec.id) > 1) {
      rejected.push({ ...rec, reason: 'duplicate source id' });
      continue;
    }
    accepted.push(rec);
  }

  // Rules 3 and 4 — normalize, then sort.
  const out = accepted.map((rec) => [
    rec.id.toUpperCase(),
    rec.name.trim().replace(/\s+/g, ' '),
    Number(rec.score).toFixed(2),
    rec.recordedAt.trim(),
  ].join(','));
  out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  return { csv: `${HEADER}\n${out.join('\n')}\n`, accepted, rejected };
}

function main(argv) {
  const perturbIdx = argv.indexOf('--perturb');
  const perturb = perturbIdx >= 0 ? argv[perturbIdx + 1] : undefined;
  const sourceText = fs.readFileSync(SOURCE_PATH, 'utf8');
  const { csv, accepted, rejected } = normalize(sourceText, { perturb });

  if (argv.includes('--check')) {
    const committed = fs.readFileSync(GENERATED_PATH, 'utf8');
    if (committed !== csv) {
      process.stdout.write('FAIL transform --check: data/generated.csv does not match the transform output\n');
      return 1;
    }
    process.stdout.write(`PASS transform --check: ${accepted.length} accepted, ${rejected.length} rejected\n`);
    return 0;
  }

  fs.writeFileSync(GENERATED_PATH, csv);
  process.stdout.write(`wrote data/generated.csv: ${accepted.length} accepted, ${rejected.length} rejected\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
