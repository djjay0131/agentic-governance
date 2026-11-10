#!/usr/bin/env node
// E1 scorer for the standards-completeness study.
//
// Validates requirements-catalog.csv and every coding-*.csv, then computes
// coverage, enforcement, per-source depth histograms, pairwise Cohen's kappa
// (unweighted on scope, linear-weighted on depth), and the four sensitivity
// variants in the study design §3.1. Outputs are byte-identical for the same
// inputs: sorted keys, fixed decimals, no timestamps, no absolute paths.
//
// Usage:
//   node score.mjs [--data <dir>] [--g3-ref <sha>] [--root <dir>]
//
// --data points at the standards-benchmark directory (the one containing
// requirements-catalog.csv); without it the directory is resolved from the
// delta's declared artifacts tree plus research/standards-benchmark/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  gitRoot, gitSha, parseCsv, resolveDataDir, sha256File, stableStringify, toCsv,
} from './lib.mjs';

const CATALOG_COLUMNS = [
  'req_id', 'standard', 'edition', 'clause', 'title',
  'requirement_paraphrase', 'scope', 'scope_reason', 'clause_check', 'source',
];
const CODING_COLUMNS = [
  'req_id', 'coder', 'canon_ref', 'depth', 'depth_label', 'evidence', 'rationale', 'gap',
];
const LEGAL_SCOPES = ['IN', 'PARTIAL', 'OUT', 'DRAFT'];
const DEPTHS = [0, 1, 2, 3, 4, 5];
const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));

function argValue(args, flag, fallback = null) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}

function readTable(file, required, label) {
  const parsed = parseCsv(fs.readFileSync(file, 'utf8'));
  if (parsed.length === 0) throw new Error(`${label}: empty file`);
  const header = parsed[0].map((h) => h.trim());
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length > 0) throw new Error(`${label}: missing column(s): ${missing.join(', ')}`);
  const rows = [];
  for (let i = 1; i < parsed.length; i++) {
    const raw = parsed[i];
    if (raw.length === 1 && raw[0] === '') continue;
    const obj = {};
    header.forEach((h, j) => { obj[h] = (raw[j] ?? '').trim(); });
    rows.push({ obj, line: i + 1 });
  }
  return { header, rows };
}

function isIntegerDepth(value) {
  return /^\d+$/.test(value) && DEPTHS.includes(Number(value));
}

function validateCatalog(table) {
  const errors = [];
  const byId = new Map();
  for (const { obj, line } of table.rows) {
    if (!obj.req_id) { errors.push(`requirements-catalog.csv:${line}: empty req_id`); continue; }
    if (byId.has(obj.req_id)) errors.push(`requirements-catalog.csv:${line}: duplicate req_id "${obj.req_id}"`);
    if (!LEGAL_SCOPES.includes(obj.scope)) {
      errors.push(`requirements-catalog.csv:${line}: illegal scope "${obj.scope}" (legal: ${LEGAL_SCOPES.join(', ')})`);
    }
    byId.set(obj.req_id, obj);
  }
  return { errors, byId, order: table.rows.map(({ obj }) => obj) };
}

function validateCoding(file, table, catalog) {
  const errors = [];
  const label = path.basename(file);
  const byId = new Map();
  const coders = new Set();
  const refs = new Set();
  let scopeColumn = table.header.includes('scope');
  let weakestColumn = table.header.includes('weakest_part_depth');

  for (const { obj, line } of table.rows) {
    if (!obj.req_id) { errors.push(`${label}:${line}: empty req_id`); continue; }
    if (!catalog.byId.has(obj.req_id)) {
      errors.push(`${label}:${line}: req_id "${obj.req_id}" is not in requirements-catalog.csv`);
    }
    if (byId.has(obj.req_id)) errors.push(`${label}:${line}: duplicate req_id "${obj.req_id}"`);
    if (!isIntegerDepth(obj.depth)) {
      errors.push(`${label}:${line}: depth "${obj.depth}" is not an integer from 0 to 5`);
    } else if (Number(obj.depth) >= 1 && obj.evidence === '') {
      errors.push(`${label}:${line}: depth ${obj.depth} requires an evidence pointer`);
    }
    if (scopeColumn && obj.scope !== '' && !LEGAL_SCOPES.includes(obj.scope)) {
      errors.push(`${label}:${line}: illegal scope "${obj.scope}" (legal: ${LEGAL_SCOPES.join(', ')})`);
    }
    if (weakestColumn && obj.weakest_part_depth !== '' && !isIntegerDepth(obj.weakest_part_depth)) {
      errors.push(`${label}:${line}: weakest_part_depth "${obj.weakest_part_depth}" is not an integer from 0 to 5`);
    }
    if (!obj.coder) errors.push(`${label}:${line}: empty coder`);
    else coders.add(obj.coder);
    if (!obj.canon_ref) errors.push(`${label}:${line}: empty canon_ref`);
    else refs.add(obj.canon_ref);
    byId.set(obj.req_id, {
      ...obj,
      depth: Number(obj.depth),
      scope: obj.scope || null,
      weakestPartDepth: obj.weakest_part_depth === '' ? null : Number(obj.weakest_part_depth),
    });
  }

  const catalogIds = new Set(catalog.byId.keys());
  const codingIds = new Set(byId.keys());
  for (const id of catalogIds) if (!codingIds.has(id)) errors.push(`${label}: missing catalog row "${id}"`);
  for (const id of codingIds) if (!catalogIds.has(id)) errors.push(`${label}: extra row "${id}" not in the catalog`);
  if (coders.size > 1) errors.push(`${label}: contains more than one coder (${[...coders].sort().join(', ')}) — one file is one coder`);
  if (refs.size > 1) errors.push(`${label}: contains more than one canon_ref (${[...refs].sort().join(', ')})`);
  if (!scopeColumn) scopeColumn = false;

  return {
    file: label,
    coder: [...coders][0] || label,
    canonRef: [...refs][0] || null,
    byId,
    scopeColumn,
    weakestColumn,
    errors,
  };
}

function loadInputs(dataDir) {
  const catalogPath = path.join(dataDir, 'requirements-catalog.csv');
  if (!fs.existsSync(catalogPath)) throw new Error(`missing ${catalogPath}`);
  const catalogTable = readTable(catalogPath, CATALOG_COLUMNS, 'requirements-catalog.csv');
  const catalog = validateCatalog(catalogTable);
  const codingFiles = fs.readdirSync(dataDir)
    .filter((f) => /^coding-.*\.csv$/.test(f))
    .sort();
  if (codingFiles.length === 0) throw new Error(`no coding-*.csv files in ${dataDir}`);
  const codings = codingFiles.map((f) => validateCoding(path.join(dataDir, f),
    readTable(path.join(dataDir, f), CODING_COLUMNS, f), catalog));
  const errors = [...catalog.errors, ...codings.flatMap((c) => c.errors)];
  if (errors.length > 0) throw new Error(errors.join('\n'));
  return { catalog, codings, files: ['requirements-catalog.csv', ...codingFiles] };
}

function rate(numerator, denominator) {
  return denominator === 0 ? '' : (numerator / denominator).toFixed(6);
}

function matrix(a, b, categories) {
  const n = a.length;
  const index = new Map(categories.map((c, i) => [c, i]));
  const m = categories.map(() => categories.map(() => 0));
  let matches = 0;
  for (let i = 0; i < n; i++) {
    const ai = index.get(a[i]);
    const bi = index.get(b[i]);
    if (ai === undefined || bi === undefined) continue;
    m[bi][ai]++;
    if (a[i] === b[i]) matches++;
  }
  return { m, n, matches };
}

export function observedAgreement(a, b) {
  if (a.length === 0 || a.length !== b.length) return null;
  return a.filter((v, i) => v === b[i]).length / a.length;
}

export function unweightedKappa(a, b, categories) {
  if (a.length === 0 || a.length !== b.length || categories.length < 2) return null;
  const { m, n } = matrix(a, b, categories);
  const row = m.map((r) => r.reduce((s, v) => s + v, 0));
  const col = categories.map((_, j) => m.reduce((s, r) => s + r[j], 0));
  const po = m.reduce((s, r, i) => s + r[i], 0) / n;
  const pe = row.reduce((s, r, i) => s + (r * col[i]) / (n * n), 0);
  if (Math.abs(1 - pe) < 1e-15) return null;
  return (po - pe) / (1 - pe);
}

export function linearWeightedKappa(a, b, categories) {
  if (a.length === 0 || a.length !== b.length || categories.length < 2) return null;
  const { m, n } = matrix(a, b, categories);
  const k = categories.length;
  const weight = (i, j) => 1 - Math.abs(i - j) / (k - 1);
  const row = m.map((r) => r.reduce((s, v) => s + v, 0));
  const col = categories.map((_, j) => m.reduce((s, r) => s + r[j], 0));
  let observed = 0;
  let expected = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      observed += weight(i, j) * m[i][j] / n;
      expected += weight(i, j) * (row[i] * col[j]) / (n * n);
    }
  }
  if (Math.abs(1 - expected) < 1e-15) return null;
  return (observed - expected) / (1 - expected);
}

function computeForRows(rows, { includePartial = false, includeDraft = false, depthOf = (r) => r.depth } = {}) {
  const totalRows = rows.length;
  const inScope = rows.filter((r) => r.scope === 'IN').length;
  const partialRows = rows.filter((r) => r.scope === 'PARTIAL').length;
  const draftRows = rows.filter((r) => r.scope === 'DRAFT').length;
  const denominator = rows.filter((r) =>
    r.scope === 'IN'
    || (includePartial && r.scope === 'PARTIAL')
    || (includeDraft && r.scope === 'DRAFT'));
  const histogram = DEPTHS.map(() => 0);
  let covered = 0;
  let enforced = 0;
  for (const row of denominator) {
    const depth = depthOf(row);
    histogram[depth]++;
    if (depth >= 2) covered++;
    if (depth >= 4) enforced++;
  }
  return { totalRows, inScope, partialRows, draftRows, rows: denominator.length, covered, enforced, histogram };
}

function joinedRows(catalog, coding) {
  return catalog.order.map((cat) => {
    const code = coding.byId.get(cat.req_id);
    return { ...cat, ...code, scope: code.scope || cat.scope };
  });
}

function primaryRef(codings) {
  const counts = new Map();
  for (const c of codings) if (c.canonRef) counts.set(c.canonRef, (counts.get(c.canonRef) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
}

function coverageRecords(catalog, codings, g3Ref) {
  const sources = [...new Set(catalog.order.map((r) => r.standard))].sort();
  const primary = primaryRef(codings);
  const alternateRefs = new Set(codings.map((c) => c.canonRef).filter((r) => r && r !== primary));
  const records = [];
  for (const coding of [...codings].sort((a, b) => a.coder.localeCompare(b.coder))) {
    const all = joinedRows(catalog, coding);
    const g3Eligible = g3Ref ? Boolean(coding.canonRef && coding.canonRef.startsWith(g3Ref))
      : alternateRefs.has(coding.canonRef);
    const groups = [['ALL', all], ...sources.map((s) => [s, all.filter((r) => r.standard === s)])];
    for (const [source, rows] of groups) {
      const headline = computeForRows(rows);
      const partialIn = computeForRows(rows, { includePartial: true });
      const draftIn = computeForRows(rows, { includeDraft: true });
      const weakest = coding.weakestColumn
        ? computeForRows(rows, { depthOf: (r) => r.weakestPartDepth ?? r.depth })
        : null;
      const g3 = g3Eligible ? computeForRows(rows) : null;
      records.push({ coder: coding.coder, source, headline, partialIn, draftIn, weakest, g3 });
    }
  }
  return records;
}

function agreementRecords(catalog, codings) {
  const sorted = [...codings].sort((a, b) => a.coder.localeCompare(b.coder));
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const rows = catalog.order;
      const scopeA = rows.map((r) => a.byId.get(r.req_id).scope || r.scope);
      const scopeB = rows.map((r) => b.byId.get(r.req_id).scope || r.scope);
      const depthA = rows.map((r) => a.byId.get(r.req_id).depth);
      const depthB = rows.map((r) => b.byId.get(r.req_id).depth);
      const explicit = (c) => c.scopeColumn && catalog.order.every((r) => c.byId.get(r.req_id).scope);
      out.push({
        a: a.coder,
        b: b.coder,
        n: rows.length,
        scopeSource: explicit(a) && explicit(b) ? 'coding' : 'catalog-fallback',
        kappaScope: unweightedKappa(scopeA, scopeB, LEGAL_SCOPES),
        kappaDepth: linearWeightedKappa(depthA, depthB, DEPTHS),
        observedScope: observedAgreement(scopeA, scopeB),
        observedDepth: observedAgreement(depthA, depthB),
      });
    }
  }
  return out;
}

function numberCell(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(6) : '';
}

function fmtRate(num, den) {
  return den === 0 ? 'n/a' : (num / den).toFixed(3);
}

function renderSummary({ runStatus, catalog, codings, records, agreements, refs, g3Ref }) {
  const lines = [];
  lines.push(`# E1 standards completeness — ${runStatus}`);
  lines.push('');
  lines.push(`Run status: ${runStatus}`);
  lines.push(`Coders: ${[...new Set(codings.map((c) => c.coder))].sort().join(', ')}`);
  lines.push(`Canon ref(s): ${refs.join(', ')}`);
  lines.push(`Catalog rows: ${catalog.order.length}`);
  lines.push('Validation: passed');
  lines.push('');
  lines.push('## Coverage and enforcement');
  lines.push('');
  lines.push('Headline denominator: catalog scope `IN`. `PARTIAL` and `OUT` are excluded;');
  lines.push('`DRAFT` is excluded from the headline and reported as sensitivity (c).');
  lines.push('Covered = depth >= 2. Enforced = depth >= 4.');
  lines.push('');
  lines.push('| Coder | Source | Total rows | In scope | Covered | Enforced | Coverage | Enforcement |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|');
  for (const r of records) {
    lines.push(`| ${r.coder} | ${r.source} | ${r.headline.totalRows} | ${r.headline.inScope} | `
      + `${r.headline.covered} | ${r.headline.enforced} | `
      + `${fmtRate(r.headline.covered, r.headline.rows)} | ${fmtRate(r.headline.enforced, r.headline.rows)} |`);
  }
  lines.push('');
  lines.push('## Depth histogram');
  lines.push('');
  lines.push('| Coder | Source | 0 | 1 | 2 | 3 | 4 | 5 |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|');
  for (const r of records) {
    lines.push(`| ${r.coder} | ${r.source} | ${r.headline.histogram.join(' | ')} |`);
  }
  lines.push('');
  lines.push('## Agreement');
  lines.push('');
  if (agreements.length === 0) {
    lines.push(`${runStatus}: no coder pair is available, so kappa is not computed.`);
    lines.push('The single status row in `e1-agreement.csv` records this; it is not a pair.');
  } else {
    lines.push('Unweighted kappa on scope and linear-weighted kappa on depth (0–5).');
    lines.push('');
    lines.push('| Coder A | Coder B | Rows | Scope source | Kappa (scope) | Kappa (depth) |');
    lines.push('|---|---|---:|---|---:|---:|');
    for (const a of agreements) {
      lines.push(`| ${a.a} | ${a.b} | ${a.n} | ${a.scopeSource} | `
        + `${a.kappaScope === null ? 'n/a' : a.kappaScope.toFixed(3)} | `
        + `${a.kappaDepth === null ? 'n/a' : a.kappaDepth.toFixed(3)} |`);
    }
  }
  lines.push('');
  lines.push('## Sensitivity (spec §3.1)');
  lines.push('');
  for (const coder of [...new Set(records.map((r) => r.coder))].sort()) {
    const all = records.find((r) => r.coder === coder && r.source === 'ALL');
    lines.push(`### ${coder}`);
    lines.push('');
    lines.push(`- (a) PARTIAL rows included: denominator ${all.partialIn.rows} rows, `
      + `coverage ${fmtRate(all.partialIn.covered, all.partialIn.rows)}, `
      + `enforcement ${fmtRate(all.partialIn.enforced, all.partialIn.rows)}.`);
    lines.push(`- (c) SSDF v1.2 draft row included: denominator ${all.draftIn.rows} rows, `
      + `coverage ${fmtRate(all.draftIn.covered, all.draftIn.rows)}, `
      + `enforcement ${fmtRate(all.draftIn.enforced, all.draftIn.rows)}.`);
    if (all.weakest) {
      lines.push(`- (b) weakest-part coding: denominator ${all.weakest.rows} rows, `
        + `coverage ${fmtRate(all.weakest.covered, all.weakest.rows)}, `
        + `enforcement ${fmtRate(all.weakest.enforced, all.weakest.rows)}.`);
    } else {
      lines.push('- (b) weakest-part coding: not computable from the supplied codings — no `weakest_part_depth` column is present.');
    }
    if (all.g3) {
      lines.push(`- (d) G-3 re-code: denominator ${all.g3.rows} rows, `
        + `coverage ${fmtRate(all.g3.covered, all.g3.rows)}, `
        + `enforcement ${fmtRate(all.g3.enforced, all.g3.rows)}.`);
    } else {
      const why = g3Ref
        ? `no coding file carries canon_ref matching ${g3Ref}`
        : 'no coding file carries a canon_ref other than the primary ref';
      lines.push(`- (d) G-3 re-code: not run — ${why}.`);
    }
    lines.push('');
  }
  lines.push('## Method notes');
  lines.push('');
  lines.push('- One catalog row is one unit. `scope` is the coder\'s value when the coding file');
  lines.push('  carries a `scope` column, otherwise the catalog\'s preliminary value; the');
  lines.push('  agreement table names which source was used.');
  lines.push('- Kappa uses the fixed scope categories IN/PARTIAL/OUT/DRAFT and the fixed');
  lines.push('  depth categories 0–5, so a category absent from a sample still counts in the');
  lines.push('  expected matrix. A degenerate expected matrix yields no kappa rather than a');
  lines.push('  fabricated 1.0.');
  lines.push('- The pilot file `coding-CL.csv` is not a study coder. When it is the only');
  lines.push('  coding present, every output is labelled PILOT.');
  lines.push('');
  lines.push('## Limitations');
  lines.push('');
  lines.push('- Depth is a measure of mechanization, not effectiveness (study §6).');
  lines.push('- Single-portfolio evidence, paraphrased clause-level rows, and edition drift');
  lines.push('  are threats stated in the design and are not resolved by this scorer.');
  lines.push('- Uncertain classifications remain semantic and go to human review.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const dataDir = resolveDataDir({
    data: argValue(args, '--data'),
    root: argValue(args, '--root') || gitRoot(),
  });
  const g3Ref = argValue(args, '--g3-ref');
  if (!fs.existsSync(dataDir)) throw new Error(`data directory does not exist: ${dataDir}`);

  const { catalog, codings, files } = loadInputs(dataDir);
  const runStatus = codings.length < 2 ? 'PILOT' : 'STUDY';
  const records = coverageRecords(catalog, codings, g3Ref);
  const agreements = agreementRecords(catalog, codings);
  const refs = [...new Set(codings.map((c) => c.canonRef).filter(Boolean))].sort();

  const coverageRows = [[
    'run_status', 'coder', 'source', 'total_rows', 'in_scope', 'partial_rows', 'draft_rows',
    'covered', 'enforced', 'coverage', 'enforcement',
    'depth_0', 'depth_1', 'depth_2', 'depth_3', 'depth_4', 'depth_5',
    'coverage_partial_in', 'enforcement_partial_in',
    'coverage_draft_in', 'enforcement_draft_in',
    'coverage_weakest', 'enforcement_weakest',
    'coverage_g3', 'enforcement_g3',
  ]];
  for (const r of records) {
    coverageRows.push([
      runStatus, r.coder, r.source, r.headline.totalRows, r.headline.inScope,
      r.headline.partialRows, r.headline.draftRows, r.headline.covered, r.headline.enforced,
      rate(r.headline.covered, r.headline.rows), rate(r.headline.enforced, r.headline.rows),
      ...r.headline.histogram,
      rate(r.partialIn.covered, r.partialIn.rows), rate(r.partialIn.enforced, r.partialIn.rows),
      rate(r.draftIn.covered, r.draftIn.rows), rate(r.draftIn.enforced, r.draftIn.rows),
      r.weakest ? rate(r.weakest.covered, r.weakest.rows) : '',
      r.weakest ? rate(r.weakest.enforced, r.weakest.rows) : '',
      r.g3 ? rate(r.g3.covered, r.g3.rows) : '',
      r.g3 ? rate(r.g3.enforced, r.g3.rows) : '',
    ]);
  }

  const agreementRows = [[
    'run_status', 'coder_a', 'coder_b', 'n_rows', 'scope_source',
    'unweighted_kappa_scope', 'linear_weighted_kappa_depth',
    'observed_agreement_scope', 'observed_agreement_depth',
  ]];
  if (agreements.length === 0) {
    agreementRows.push([runStatus, 'NA', 'NA', String(catalog.order.length), 'NA', '', '', '', '']);
  } else {
    for (const a of agreements) {
      agreementRows.push([
        runStatus, a.a, a.b, String(a.n), a.scopeSource,
        numberCell(a.kappaScope), numberCell(a.kappaDepth),
        numberCell(a.observedScope), numberCell(a.observedDepth),
      ]);
    }
  }

  const harnessRoot = gitRoot(HARNESS_DIR);
  const inputs = {};
  for (const f of files) inputs[f] = sha256File(path.join(dataDir, f));
  const manifest = {
    run_status: runStatus,
    experiment: 'E1',
    coders: [...new Set(codings.map((c) => c.coder))].sort(),
    canon_sha: gitSha(harnessRoot, primaryRef(codings)) || primaryRef(codings),
    canon_refs: refs,
    harness_sha: gitSha(harnessRoot, 'HEAD'),
    node_version: process.version,
    catalog_rows: catalog.order.length,
    inputs,
  };

  const outDir = path.join(dataDir, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'e1-coverage.csv'), toCsv(coverageRows));
  fs.writeFileSync(path.join(outDir, 'e1-agreement.csv'), toCsv(agreementRows));
  fs.writeFileSync(path.join(outDir, 'e1-summary.md'),
    renderSummary({ runStatus, catalog, codings, records, agreements, refs, g3Ref }));
  fs.writeFileSync(path.join(outDir, 'manifest.json'), stableStringify(manifest));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(`score: ${e.message}`);
    process.exit(1);
  }
}
