#!/usr/bin/env node
// governance-checks.mjs — lightweight convention checks cited by the canonical
// L0 Fast-Track Policy (agentic-governance llm/governance/l0-fast-track.md).
// Plain Node, no dependencies. See plugin/scripts/README.md.
//
// Runs against the adopting repository containing the current working
// directory (git toplevel), NOT against the directory holding this script —
// keep the canonical copy in agentic-governance and invoke it from any repo.
//
// Paths are declared, not hardcoded: where the target repo's governance delta
// carries a `## Repository Layout` block, the paths below are read from it.
// Precedence is CLI flag > delta block > canonical default.
//
// Usage:
//   node governance-checks.mjs                        # default checks (all PRs)
//   node governance-checks.mjs --l0                   # + fast-track checks
//   node governance-checks.mjs --layout               # + declared-layout check
//   node governance-checks.mjs --l0 --cert-file f.md  # cert from file (else stdin)
//   node governance-checks.mjs --delta llm/governance/governance-delta.md  # delta path override
//   node governance-checks.mjs --adr-dir llm/governance/adr                # ADR dir override
//   node governance-checks.mjs --base origin/main                          # base ref override

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const l0Mode = args.includes('--l0');
const layoutMode = args.includes('--layout');
function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}
const certFile = argValue('--cert-file', null);
const BASE = argValue('--base', 'origin/main');

// The target repo is the one the caller stands in, not the one holding this file.
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

// Slot -> label matcher for the delta's `## Repository Layout` bullet list
// (llm/governance/governance-delta-template.md §Repository Layout). Declared
// before use: `readLayout` runs while this module's constants initialize.
const LAYOUT_SLOTS = [
  ['adr', /\badrs?\b/i],
  ['constitution', /constitution/i],
  ['governance', /governance/i],
  ['spec', /spec/i],
  ['plans', /plan/i],
  ['features', /feature/i],
  ['memoryBank', /memory[\s_-]*bank/i],
  ['artifacts', /artifact/i],
];

// Canonical default paths (llm/governance/project-operating-system.md
// §Repository Areas). A repo overrides any of them by declaring it in its
// delta's `## Repository Layout` block; a flag overrides both.
const LAYOUT_DEFAULTS = {
  constitution: 'llm/constitution',
  governance: 'llm/governance',
  adr: 'llm/governance/adr',
  spec: 'llm/specs',
  plans: 'llm/plans',
  features: 'llm/features',
  memoryBank: 'llm/memory_bank',
  artifacts: 'docs',
};

const DELTA = argValue('--delta', `${LAYOUT_DEFAULTS.governance}/governance-delta.md`);
// Declared layout wins over the defaults; the flag wins over both.
const LAYOUT = readLayout(DELTA);
for (const w of LAYOUT.warnings) console.warn(`WARN: ${w}`);
const ADR_REL = argValue('--adr-dir', LAYOUT.declared.adr || LAYOUT_DEFAULTS.adr);
const CONSTITUTION_REL = LAYOUT.declared.constitution || LAYOUT_DEFAULTS.constitution;
const ADR_DIR = path.join(ROOT, ADR_REL);
const LEGAL_STATUSES = ['Proposed', 'Accepted', 'Superseded', 'Deprecated'];

// Hard denies (llm/governance/l0-fast-track.md §The Deny Rule): the governance
// delta (it contains the allowlist that judges the PR), repo-local governance
// policy docs and role charters, production code, scripts, the plugin payload,
// and CI config. These fail --l0 outright regardless of the repo's own
// allow/deny block.
//
// Deliberately NOT hard-denied: `llm/governance/**` as a prefix. It would
// swallow `llm/governance/adr/**` and kill the L0 lane for ADR status flips
// and index-row regeneration — the fast track's two primary uses
// (llm/governance/adr/0001-llm-control-plane-docs-data-plane.md §Risks).
// Policy documents are denied by basename instead, so they stay denied
// wherever a repo declares its governance directory.
//
// Role charters are denied at whatever path the delta declares as its
// constitution directory (§Repository Layout slot `constitution`), plus the
// two canonical locations, so the deny holds for a repo that binds it
// elsewhere. Duplicates collapse when a repo declares a canonical default.
const HARD_DENY = [...new Set([
  DELTA,
  '.github/**',
  'scripts/**',
  'plugin/**', // the plugin payload root: `scripts/**` never matched a nested one
  'src/**',
  'constitution/**',
  'llm/constitution/**',
  `${CONSTITUTION_REL}/**`,
  '**/governance-delta.md',
  '**/architecture-governance.md',
  '**/project-operating-system.md',
  '**/governance-levels.md',
  '**/l0-fast-track.md',
  '**/review-checklist.md',
  '**/definition-of-done.md',
  '**/branch-protection.md',
  '**/labels.md',
])];

// The basenames above, used by --layout to spot a control-plane policy
// document sitting under the artifacts directory.
const POLICY_BASENAMES = HARD_DENY.filter((g) => /^\*\*\/[^/*]+$/.test(g)).map((g) => g.slice(3));

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
//
// `**/` matches ZERO or more path segments, not one or more. Compiling it to
// `.*/` required a slash, so `**/labels.md` matched `llm/governance/labels.md`
// but not a root-level `labels.md` — a repo keeping its policy documents at the
// repository root escaped every basename hard-deny. This is the same class of
// bug as `scripts/**` never matching the nested `plugin/scripts/` payload.
// A trailing or bare `**` (e.g. `plugin/**`) still compiles to `.*`.
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?'; // `**/` — zero or more leading segments
          i += 2; // consume the second `*` and the `/`
        } else {
          re += '.*';
          i++;
        }
      } else re += '[^/]*';
    } else if (c === '[') {
      const end = glob.indexOf(']', i + 1);
      // An unterminated class must fail loudly: setting i = -1 here restarts
      // the loop on the same character forever (the checker hangs instead of
      // reporting). See plugin/scripts/README.md §Glob Parsing.
      if (end === -1) throw new Error(`unparseable glob (unterminated "[" character class): "${glob}"`);
      re += glob.slice(i, end + 1);
      i = end;
    } else if ('\\^$.|?+(){}'.includes(c)) re += '\\' + c;
    else re += c;
  }
  try {
    return new RegExp('^' + re + '$');
  } catch (e) {
    throw new Error(`unparseable glob "${glob}": ${e.message}`);
  }
}

// ---------- declared repository layout ----------

// A declared value may still carry the template's bracketed default, its
// backticks, a `|`-separated menu of options, or a trailing slash. Anything
// left unfilled (angle-bracketed placeholder, "none", prose) declares nothing.
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

// Reads declared paths from the delta. Never throws: a missing delta, a
// missing block, or an unparseable one degrades to LAYOUT_DEFAULTS, with a
// warning whenever a delta exists but declares nothing usable.
function readLayout(deltaRel) {
  const out = { declared: {}, warnings: [], hasDelta: false, hasBlock: false };
  const abs = path.join(ROOT, deltaRel);
  let text;
  try {
    if (!fs.existsSync(abs)) return out; // no delta: canonical defaults, silently
    text = read(abs);
    out.hasDelta = true;
  } catch (e) {
    out.warnings.push(`${deltaRel}: unreadable (${e.message}) — using canonical default paths`);
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
  if (!out.hasBlock) {
    out.warnings.push(`${deltaRel}: no "## Repository Layout" block — using canonical default paths`);
  } else if (Object.keys(out.declared).length === 0) {
    out.warnings.push(`${deltaRel} §Repository Layout: no path declaration parsed — using canonical default paths`);
  }
  return out;
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

// ---------- check 4 (--layout): layout ----------

// Two-plane enforcement (llm/governance/project-operating-system.md
// §Repository Areas): every path the delta declares must exist, and no source
// of truth may live under the declared artifacts directory.
//
// This check must never print a bare PASS while having verified nothing. It
// used to: a missing delta (a typo'd `--delta`, a non-default governance
// directory, a pre-v0.3 repo) left `declared` empty, the loop over it did
// nothing, and the run reported `PASS layout`. "Verified nothing" and
// "verified and clean" printed identically. The two no-op cases are now graded
// differently, deliberately:
//
//   * No delta at `DELTA` — loud SKIP, exit code unaffected. The checker
//     cannot distinguish "this repo legitimately has no delta" (the canon
//     package itself is such a repo) from "you mistyped the path", so it
//     refuses to claim a PASS but does not manufacture a failure either. The
//     SKIP line names the exact path it looked for, which is what makes a typo
//     or a non-default governance directory obvious to the reader.
//   * A delta exists but binds no paths — no `## Repository Layout` block, or
//     a block from which nothing usable parsed — FAIL. Since v0.3 the template
//     always carries the block, so a delta that declares nothing is a real
//     governance defect: the repo has the binding mechanism and left the
//     two-plane rule unbound. The fix is in the repo's own hands, which is
//     what makes a hard failure fair here.
//
// The artifacts scan runs in every case, against the declared artifacts
// directory or the canonical default, so a source-of-truth document sitting in
// the data plane still FAILs even when no path is declared. A SKIP therefore
// means "the declared-path assertions could not run", not "nothing ran".
function checkLayout() {
  const failures = [];
  for (const [slot, p] of Object.entries(LAYOUT.declared)) {
    if (!fs.existsSync(path.join(ROOT, p))) {
      failures.push(`${DELTA} §Repository Layout: ${slot} declared as "${p}", which does not exist`);
    }
  }
  const artifacts = LAYOUT.declared.artifacts || LAYOUT_DEFAULTS.artifacts;
  const declaredNothing = Object.keys(LAYOUT.declared).length === 0;
  if (declaredNothing && LAYOUT.hasDelta) {
    failures.push(
      LAYOUT.hasBlock
        ? `${DELTA} §Repository Layout: block present but no path declaration parsed — this repo binds no layout path, so no declared path could be verified`
        : `${DELTA}: no "## Repository Layout" block — this repo binds no layout path, so no declared path could be verified (add the block from llm/governance/governance-delta-template.md)`
    );
  }
  for (const file of listMd(path.join(ROOT, artifacts))) {
    const name = path.basename(file);
    let kind = null;
    if (POLICY_BASENAMES.includes(name)) kind = 'a governance policy document';
    else if (/-design\.md$/.test(name)) kind = 'a design document';
    // ADR numbering only: an ISO-dated name (2026-08-18-...) is an ordinary
    // artifact filename, not a sequence number, and must not false-positive.
    else if (/^\d{4}-(?!\d{2}-\d{2}-).*\.md$/.test(name)) kind = 'an ADR';
    if (kind) {
      failures.push(
        `${rel(file)}: ${kind} under the declared artifacts directory "${artifacts}/" — source-of-truth content is control plane and belongs under the declared llm/ paths`
      );
    }
  }
  if (declaredNothing && !LAYOUT.hasDelta) {
    const note =
      `no governance delta at "${DELTA}": nothing is declared, so no declared path was verified ` +
      `(the artifacts scan of "${artifacts}/" still ran). ` +
      `Pass --delta <path> if this repo's delta lives elsewhere.`;
    // Any real violation the artifacts scan found still fails; the skip only
    // covers the assertions that could not run.
    if (failures.length > 0) return [note, ...failures];
    return { skipped: note };
  }
  return failures;
}

// ---------- check 5 (--l0): l0-paths ----------

// Reads the L0 Path Allowlist from the repo's governance delta: a fenced block
// whose info string is `l0-allowlist`, containing `allow <glob> <shape>` /
// `deny <glob>` lines (llm/governance/l0-fast-track.md §L0 Path Allowlist).
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
// parenthetical (llm/governance/l0-fast-track.md, shape `status-line-only`).
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

// ---------- check 6 (--l0): cert-present ----------

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

// ---------- runner ----------

const checks = [
  ['governance-links', checkLinks],
  ['adr-index', checkAdrIndex],
  ['adr-status', checkAdrStatus],
];
if (layoutMode) checks.push(['layout', checkLayout]);
if (l0Mode) checks.push(['l0-paths', checkL0Paths], ['cert-present', checkCert]);

// A check returns an array of failures, or `{ skipped: reason }` when it could
// not run at all. SKIP is printed as its own outcome and named in the summary:
// a reader must never mistake "verified nothing" for "verified and clean". A
// skip does not fail the run (see checkLayout for why that grading is right).
let failed = 0;
const skipped = [];
for (const [name, fn] of checks) {
  let failures;
  try {
    failures = fn();
  } catch (e) {
    failures = [`check error: ${e.message}`];
  }
  if (!Array.isArray(failures) && failures && failures.skipped) {
    skipped.push(name);
    console.log(`SKIP  ${name} — NOT VERIFIED`);
    console.log(`      - ${failures.skipped}`);
  } else if (failures.length === 0) {
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}`);
    for (const f of failures) console.log(`      - ${f}`);
  }
}
const skipNote = skipped.length ? ` ${skipped.length} check(s) SKIPPED, verifying nothing: ${skipped.join(', ')}.` : '';
console.log(
  failed === 0
    ? `\n${checks.length - skipped.length} of ${checks.length} checks passed, 0 failed.${skipNote}`
    : `\n${failed} of ${checks.length} check(s) failed.${skipNote}`
);
process.exit(failed === 0 ? 0 : 1);
