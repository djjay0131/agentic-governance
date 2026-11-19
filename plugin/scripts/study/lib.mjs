// Shared helpers for the standards-completeness study harness.
// Plain Node, no dependencies. CSV, hashing, stable JSON, and the declared-path
// resolution rule the harness shares with governance-checks.mjs.

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function gitRoot(cwd = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return cwd;
  }
}

export function gitSha(root, ref = 'HEAD') {
  try {
    return execFileSync('git', ['rev-parse', ref], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

export function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// RFC4180-ish CSV parser: quoted fields, escaped quotes, commas and newlines
// inside quotes. Returns an array of rows (each an array of strings).
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (c === '\r') {
      if (text[i + 1] === '\n') continue;
      row.push(field); rows.push(row); row = []; field = '';
      continue;
    }
    field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  while (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
  return rows;
}

function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) || s.trim() !== s ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortValue(value[key]);
    return out;
  }
  return value;
}

export function stableStringify(value, indent = 2) {
  return JSON.stringify(sortValue(value), null, indent) + '\n';
}

// The same slot labels and canonical defaults governance-checks.mjs uses. Kept
// in step deliberately: a path this harness resolves differently from the
// checker would score the wrong tree.
const LAYOUT_SLOTS = [
  ['adr', /\badrs?\b/i],
  ['constitution', /\bconstitution\b/i],
  ['governance', /\bgovernance\b/i],
  ['spec', /\bspecs?\b/i],
  ['sprints', /\bsprints?\b/i],
  ['plans', /\bplans?\b/i],
  ['features', /\bfeatures?\b/i],
  ['memoryBank', /\bmemory[\s_-]*bank\b/i],
  ['artifacts', /\bartifacts?\b/i],
];

export const LAYOUT_DEFAULTS = {
  constitution: 'llm/constitution',
  governance: 'llm/governance',
  adr: 'llm/governance/adr',
  spec: 'llm/specs',
  sprints: 'llm/sprints',
  plans: 'llm/plans',
  features: 'llm/features',
  memoryBank: 'llm/memory_bank',
  artifacts: 'docs',
};

function cleanLayoutValue(raw) {
  let v = raw.trim();
  if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1).trim();
  v = v.split('|')[0].trim();
  const backticked = v.match(/`([^`]+)`/);
  if (backticked) v = backticked[1].trim();
  v = v.replace(/\/+$/, '');
  if (v === '' || /[<>\s`]/.test(v)) return null;
  if (/^(none|n\/a|tbd|other)$/i.test(v)) return null;
  return v;
}

// Reads declared paths from the delta. Mirrors governance-checks.mjs
// §readLayout: missing delta or block degrades to canonical defaults and never
// throws. The harness only needs the precedence rule, not the warnings.
export function readLayoutPaths(root, deltaRel = `${LAYOUT_DEFAULTS.governance}/governance-delta.md`) {
  const out = { declared: {}, hasDelta: false, hasBlock: false, warnings: [] };
  const abs = path.join(root, deltaRel);
  let text;
  try {
    if (!fs.existsSync(abs)) return out;
    text = fs.readFileSync(abs, 'utf8');
    out.hasDelta = true;
  } catch (e) {
    out.warnings.push(`${deltaRel}: unreadable (${e.message})`);
    return out;
  }
  let inBlock = false;
  for (const line of text.split('\n')) {
    if (/^##\s+\S/.test(line)) {
      inBlock = /^##\s+Repository Layout\s*$/i.test(line.trim());
      if (inBlock) out.hasBlock = true;
      continue;
    }
    if (!inBlock) continue;
    const m = line.match(/^\s*[-*]\s+([^:]+):\s*(.+?)\s*$/);
    if (!m) continue;
    const slot = LAYOUT_SLOTS.find(([, re]) => re.test(m[1]));
    const value = cleanLayoutValue(m[2]);
    if (!slot || value === null) continue;
    if (!(slot[0] in out.declared)) out.declared[slot[0]] = value;
  }
  return out;
}

// The harness data directory: the delta's declared artifacts tree plus
// research/standards-benchmark/. --data overrides the whole resolution for
// tests and fixtures (owner's standing rule: never hardcode the data path).
export function resolveDataDir({ data = null, root = null } = {}) {
  if (data) return path.resolve(data);
  const repo = root ? path.resolve(root) : gitRoot();
  const layout = readLayoutPaths(repo);
  const artifacts = layout.declared.artifacts || LAYOUT_DEFAULTS.artifacts;
  return path.join(repo, artifacts, 'research', 'standards-benchmark');
}
