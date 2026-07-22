#!/usr/bin/env node
// governance-checks.mjs — lightweight convention checks cited by the canonical
// L0 Fast-Track Policy (agentic-governance docs/l0-fast-track.md). Plain Node,
// no dependencies. See governance/scripts/README.md.
//
// Runs against the adopting repository containing the current working
// directory (git toplevel), NOT against the directory holding this script —
// keep the canonical copy in agentic-governance and invoke it from any repo.
//
// Usage:
//   node governance-checks.mjs                        # default checks (all PRs)
//   node governance-checks.mjs --l0                   # + fast-track checks
//   node governance-checks.mjs --l0 --cert-file f.md  # cert from file (else stdin)
//   node governance-checks.mjs --delta docs/governance-delta.md   # delta path override
//   node governance-checks.mjs --adr-dir docs/adr                 # ADR dir override
//   node governance-checks.mjs --base origin/main                 # base ref override

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseDeltaBlock, auditDesignSurface } from './design-surface.mjs';

const args = process.argv.slice(2);
const l0Mode = args.includes('--l0');
const designSurfaceMode = args.includes('--design-surface');
function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}
const certFile = argValue('--cert-file', null);
const DELTA = argValue('--delta', 'docs/governance-delta.md');
const ADR_REL = argValue('--adr-dir', 'docs/adr');
const BASE = argValue('--base', 'origin/main');

// The target repo is the one the caller stands in, not the one holding this file.
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const ADR_DIR = path.join(ROOT, ADR_REL);
const LEGAL_STATUSES = ['Proposed', 'Accepted', 'Superseded', 'Deprecated'];

// Hard denies (docs/l0-fast-track.md §The Deny Rule): the governance delta
// (it contains the allowlist that judges the PR), repo-local governance
// policy docs and role charters, production code, scripts, and CI config.
// These fail --l0 outright regardless of the repo's own allow/deny block.
const HARD_DENY = [
  DELTA,
  '.github/**',
  'scripts/**',
  'src/**',
  'constitution/**',
  'llm/constitution/**',
  '**/governance-delta.md',
  '**/architecture-governance.md',
  '**/project-operating-system.md',
  '**/governance-levels.md',
  '**/l0-fast-track.md',
  '**/review-checklist.md',
  '**/definition-of-done.md',
  '**/branch-protection.md',
  '**/labels.md',
];

const SHAPES = ['path-only', 'status-line-only', 'index-table-rows', 'checkbox-only', 'link-target-only'];

// ---------- helpers ----------

function git(...a) {
  return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });
}
function read(p) {
  return fs.readFileSync(p, 'utf8');
}
function rel(p) {
  return path.relative(ROOT, p);
}
function listMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listMd(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}
function adrFiles() {
  if (!fs.existsSync(ADR_DIR)) return [];
  return fs
    .readdirSync(ADR_DIR)
    .filter((f) => /^\d{4}-.*\.md$/.test(f) && f !== '0000-template.md');
}
// First word of the file's `Status:` line, e.g. "Accepted" from
// "Status: Accepted (via PR #18, 2026-07-09)".
function statusOf(file) {
  const m = read(file).match(/^Status:\s*(\w+)/m);
  return m ? m[1] : null;
}
function changedFiles() {
  return git('diff', '--name-only', BASE).split('\n').filter(Boolean);
}
// Added/removed content lines of one file's diff vs BASE.
function diffLines(file) {
  const out = git('diff', BASE, '--', file);
  const added = [];
  const removed = [];
  for (const line of out.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added.push(line.slice(1));
    else if (line.startsWith('-')) removed.push(line.slice(1));
  }
  return { added, removed };
}
function existsInBase(file) {
  try {
    git('cat-file', '-e', `${BASE}:${file}`);
    return true;
  } catch {
    return false;
  }
}
// Minimal glob: ** = any path, * = any non-slash run, [..] kept as a character class.
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
      } else re += '[^/]*';
    } else if (c === '[') {
      const end = glob.indexOf(']', i);
      re += glob.slice(i, end + 1);
      i = end;
    } else if ('\\^$.|?+(){}'.includes(c)) re += '\\' + c;
    else re += c;
  }
  return new RegExp('^' + re + '$');
}

// ---------- check 1: governance-links ----------

function checkLinks() {
  const files = listMd(ROOT);
  const failures = [];
  for (const file of files) {
    const text = read(file)
      .replace(/```[\s\S]*?```/g, '') // ignore fenced code blocks
      .replace(/`[^`\n]*`/g, ''); // ignore inline code spans
    for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      let target = m[1];
      if (/^(https?:|mailto:|#|\/)/.test(target)) continue; // external, anchor-only, absolute
      target = target.split('#')[0]; // anchors ignored
      if (!target.endsWith('.md')) continue; // only .md links are validated
      const resolved = path.resolve(path.dirname(file), decodeURI(target));
      if (rel(resolved).split(path.sep).includes('samples')) continue; // skip samples/
      if (!fs.existsSync(resolved)) failures.push(`${rel(file)}: broken link -> ${m[1]}`);
    }
  }
  return failures;
}

// ---------- check 2: adr-index ----------

function checkAdrIndex() {
  const indexPath = path.join(ADR_DIR, 'README.md');
  if (!fs.existsSync(indexPath)) {
    return adrFiles().length === 0 ? [] : [`${ADR_REL}/README.md: missing, but ADR files exist`];
  }
  const failures = [];
  const rows = new Map(); // filename -> status cell
  for (const line of read(indexPath).split('\n')) {
    const m = line.match(/^\|\s*\[\d{4}\]\(([^)]+)\)\s*\|[^|]*\|\s*([^|]+?)\s*\|/);
    if (m) rows.set(m[1], m[2]);
  }
  const files = adrFiles();
  for (const f of files) {
    const rowStatus = rows.get(f);
    const fileStatus = statusOf(path.join(ADR_DIR, f));
    if (rowStatus === undefined) {
      failures.push(`${ADR_REL}/${f}: no row in the ${ADR_REL}/README.md index`);
    } else if (rowStatus !== fileStatus) {
      failures.push(
        `${ADR_REL}/README.md: row for ${f} says "${rowStatus}" but the file's Status line starts with "${fileStatus}"`
      );
    }
  }
  for (const f of rows.keys()) {
    if (!files.includes(f)) failures.push(`${ADR_REL}/README.md: index row for ${f}, but no such ADR file exists`);
  }
  return failures;
}

// ---------- check 3: adr-status ----------

const ADR_FILE_RE = new RegExp(`^${ADR_REL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d{4}-.*\\.md$`);

function checkAdrStatus() {
  const failures = [];
  for (const f of adrFiles()) {
    const st = statusOf(path.join(ADR_DIR, f));
    if (!st || !LEGAL_STATUSES.includes(st)) {
      failures.push(
        `${ADR_REL}/${f}: Status line missing or "${st}" is not one of ${LEGAL_STATUSES.join('/')}`
      );
    }
  }
  // A status flip on a pre-existing ADR must be status-line-only to be L0.
  for (const file of changedFiles()) {
    if (!ADR_FILE_RE.test(file) || file.endsWith('0000-template.md')) continue;
    if (!existsInBase(file)) continue; // newly created ADR: not a status flip
    const { added, removed } = diffLines(file);
    const statusChanged = [...added, ...removed].some((l) => /^Status:/.test(l));
    const otherChanged = [...added, ...removed].filter((l) => !/^Status:/.test(l));
    if (statusChanged && otherChanged.length > 0) {
      failures.push(
        `${file}: Status changed vs ${BASE} together with ${otherChanged.length} other changed line(s) — a status flip must be status-line-only to be L0`
      );
    }
  }
  return failures;
}

// ---------- check 4 (--l0): l0-paths ----------

// Reads the L0 Path Allowlist from the repo's governance delta: a fenced block
// whose info string is `l0-allowlist`, containing `allow <glob> <shape>` /
// `deny <glob>` lines (docs/l0-fast-track.md §L0 Path Allowlist).
function parseAllowlist() {
  // Security property 1: the allowlist is read from the base ref, never from
  // the working tree, so an L0 PR cannot amend the allowlist that judges it.
  // Fallback to the worktree only if the base delta predates the block
  // (bootstrap), with a loud warning.
  let doc;
  try {
    doc = git('show', `${BASE}:${DELTA}`);
    if (!doc.includes('```l0-allowlist')) doc = null;
  } catch {
    doc = null;
  }
  if (doc === null) {
    console.warn(`WARN: reading L0 allowlist from working tree (absent on ${BASE} — bootstrap only)`);
    doc = read(path.join(ROOT, DELTA));
  }
  const fenced = doc.match(/```l0-allowlist\n([\s\S]*?)```/);
  if (!fenced) throw new Error(`no \`\`\`l0-allowlist fenced block found in ${DELTA}`);
  const allow = []; // [glob, shape]
  const deny = [];
  for (const raw of fenced[1].split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const m = line.match(/^(allow|deny)\s+(\S+)(?:\s+(\S+))?$/);
    if (!m) throw new Error(`unparseable l0-allowlist line: "${line}"`);
    if (m[1] === 'deny') {
      deny.push(m[2]);
    } else {
      if (!SHAPES.includes(m[3])) {
        throw new Error(`allow line for "${m[2]}" needs a shape (one of ${SHAPES.join(', ')}): "${line}"`);
      }
      allow.push([m[2], m[3]]);
    }
  }
  if (allow.length === 0) throw new Error(`parsed no allow rules from the l0-allowlist block in ${DELTA}`);
  return { allow, deny };
}

// Constrained legal shape for an added ADR Status line — no free prose in the
// parenthetical (docs/l0-fast-track.md, shape `status-line-only`).
const LEGAL_STATUS_LINE = /^Status: (Proposed|Accepted|Superseded|Deprecated)( \(via (review and merge of )?PR #\d+(, \d{4}-\d{2}-\d{2})?\))?$/;

// Security property 2 (paired-diff shape constraints): pair every removed line
// with exactly one added line under a transform rule. Returns failures for
// unpaired lines or pairs violating the rule.
function pairedConstraint(file, removed, added, normalize, ruleName) {
  const failures = [];
  if (removed.length !== added.length) {
    failures.push(`${file}: unpaired diff lines (${removed.length} removed vs ${added.length} added) — L0 ${ruleName} edits must be 1:1 line replacements`);
    return failures;
  }
  const pool = added.map(normalize);
  for (const r of removed) {
    const idx = pool.indexOf(normalize(r));
    if (idx === -1) {
      failures.push(`${file}: removed line has no ${ruleName}-equivalent added counterpart: "${r.slice(0, 80)}"`);
    } else {
      pool.splice(idx, 1);
    }
  }
  return failures;
}

function shapeConstraint(file, shape) {
  if (shape === 'path-only') return [];
  const { added, removed } = diffLines(file);
  const changed = [...added, ...removed];
  if (shape === 'status-line-only') {
    const bad = changed.filter((l) => !/^Status:/.test(l));
    if (bad.length) return [`${file}: diff must be Status-line-only for L0 (${bad.length} other changed line(s))`];
    const shapeBad = added.filter((l) => !LEGAL_STATUS_LINE.test(l.trim()));
    if (shapeBad.length)
      return [`${file}: Status line must match "Status: <Legal> (via PR #n[, YYYY-MM-DD])": "${shapeBad[0].slice(0, 90)}"`];
    return [];
  }
  if (shape === 'index-table-rows') {
    const bad = changed.filter((l) => l.trim() !== '' && !l.startsWith('|'));
    if (bad.length) return [`${file}: L0 diff must be confined to index-table rows (${bad.length} non-table line(s))`];
    return [];
  }
  if (shape === 'checkbox-only') {
    const bad = changed.filter((l) => !/^\s*[-*]\s+\[( |[xX])\]\s/.test(l));
    if (bad.length) return [`${file}: L0 diff must be checkbox list items only (${bad.length} non-checkbox line(s))`];
    // Each removed/added pair must be identical except the checkbox toggle.
    return pairedConstraint(file, removed, added, (l) => l.replace(/\[( |[xX])\]/, '[·]'), 'checkbox-toggle');
  }
  if (shape === 'link-target-only') {
    const bad = changed.filter((l) => l.trim() !== '' && !/\]\([^)]*\)/.test(l));
    if (bad.length)
      return [`${file}: L0 changes here are link fixes only; ${bad.length} changed line(s) contain no Markdown link`];
    // Each pair must be identical except Markdown link TARGETS —
    // link text and all surrounding prose must be unchanged.
    return pairedConstraint(file, removed, added, (l) => l.replace(/\]\([^)]*\)/g, '](·)'), 'link-target');
  }
  return [`${file}: unknown shape "${shape}"`];
}

function checkL0Paths() {
  const failures = [];
  const { allow, deny } = parseAllowlist();
  const hardDenyRe = HARD_DENY.map((g) => [g, globToRegExp(g)]);
  const denyRe = deny.map((g) => [g, globToRegExp(g)]);
  const allowRe = allow.map(([g, shape]) => [g, globToRegExp(g), shape]);
  for (const file of changedFiles()) {
    const hard = hardDenyRe.find(([, re]) => re.test(file));
    if (hard) {
      failures.push(`${file}: matches always-denied pattern "${hard[0]}" (canonical deny rule) — fails --l0 outright`);
      continue;
    }
    const denied = denyRe.find(([, re]) => re.test(file));
    if (denied) {
      failures.push(`${file}: matches disallowed pattern "${denied[0]}" — fails --l0 outright`);
      continue;
    }
    const allowed = allowRe.find(([, re]) => re.test(file));
    if (!allowed) {
      failures.push(`${file}: matches no L0 allowlist pattern`);
      continue;
    }
    failures.push(...shapeConstraint(file, allowed[2]));
  }
  return failures;
}

// ---------- check 5 (--l0): cert-present ----------

const DECLARATIONS = [
  'Architecture',
  'Product meaning and requirements',
  'ADR meaning',
  'Business rules',
  'Privacy and consent policy',
  'Security posture and controls',
  'Implementation behavior',
];

function checkCert() {
  let text;
  if (certFile) {
    if (!fs.existsSync(certFile)) return [`--cert-file ${certFile}: file not found`];
    text = read(certFile);
  } else if (!process.stdin.isTTY) {
    text = fs.readFileSync(0, 'utf8');
  } else {
    return ['no certification supplied: pass --cert-file <path> or pipe the PR body on stdin'];
  }
  const failures = [];
  if (!/Administrative Change Certification/.test(text)) {
    failures.push('missing "Administrative Change Certification" heading');
  }
  for (const d of DECLARATIONS) {
    if (!new RegExp(`\\[[xX]\\]\\s+${d}`).test(text)) {
      failures.push(`declaration not present and checked ("[x] ${d}")`);
    }
  }
  return failures;
}

// ---------- design-surface audit (--design-surface; advisory, spec §5) ----------
//
// Non-blocking: prints findings and always exits 0. This mode does NOT run
// alongside the other checks above — it is a separate, self-contained report
// on the opt-in Design Surface capability (governance/scripts/design-surface.mjs).

function runDesignSurfaceAudit() {
  const deltaPath = path.join(ROOT, DELTA);
  if (!fs.existsSync(deltaPath)) {
    console.log('SKIP  design-surface (not declared)');
    return;
  }
  const decl = parseDeltaBlock(read(deltaPath));
  if (!decl) {
    console.log('SKIP  design-surface (not declared)');
    return;
  }
  if (decl.status !== 'ENABLED') {
    console.log('SKIP  design-surface (disabled)');
    return;
  }
  const narrativeRel = path.join(decl.outputDir, 'narrative.md');
  const findings = auditDesignSurface(ROOT, decl, { out: decl.outputDir, narrative: narrativeRel });
  if (findings.length === 0) {
    console.log('PASS  design-surface (fresh)');
    return;
  }
  for (const f of findings) {
    console.log(`WARN  design-surface: ${f.message}`);
  }
}

if (designSurfaceMode) {
  runDesignSurfaceAudit();
  process.exit(0);
}

// ---------- runner ----------

const checks = [
  ['governance-links', checkLinks],
  ['adr-index', checkAdrIndex],
  ['adr-status', checkAdrStatus],
];
if (l0Mode) checks.push(['l0-paths', checkL0Paths], ['cert-present', checkCert]);

let failed = 0;
for (const [name, fn] of checks) {
  let failures;
  try {
    failures = fn();
  } catch (e) {
    failures = [`check error: ${e.message}`];
  }
  if (failures.length === 0) {
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}`);
    for (const f of failures) console.log(`      - ${f}`);
  }
}
console.log(failed === 0 ? `\nAll ${checks.length} checks passed.` : `\n${failed} of ${checks.length} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
