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
//   node governance-checks.mjs --claims llm/master-roadmap.md              # claim source override

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
// Resolve the diff base. `origin/main` is right in CI but does not exist in a
// repo with no remote — and governance:establish itself records "no remote" as a
// legitimate configuration, so crashing on it means the plugin fails a repo it
// just finished setting up. Fall back through plausible bases and say which one
// was used, rather than emitting a raw `fatal: ambiguous argument`.
const BASE = (() => {
  const explicit = argValue('--base', null);
  const refExists = (ref) => {
    try {
      execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { stdio: 'pipe' });
      return true;
    } catch { return false; }
  };
  if (explicit) {
    if (refExists(explicit)) return explicit;
    console.warn(`WARN: --base ${explicit} does not resolve; falling back.`);
  }
  for (const ref of ['origin/main', 'origin/master', 'main', 'master']) {
    if (refExists(ref)) {
      if (ref !== 'origin/main') console.warn(`WARN: origin/main not found; diffing against ${ref}.`);
      return ref;
    }
  }
  // No branch to compare against at all. Use the empty tree, so every tracked
  // file reads as added — the honest answer to "changed vs nothing".
  console.warn('WARN: no comparable base ref found (no remote, no main/master). ' +
    'Diffing against the empty tree — every tracked file counts as changed.');
  return '4b825dc642cb6eb9a060e54bf8d69288fbee4904'; // git empty tree
})();

// The target repo is the one the caller stands in, not the one holding this file.
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

// Slot -> label matcher for the delta's `## Repository Layout` bullet list
// (llm/governance/governance-delta-template.md §Repository Layout). Declared
// before use: `readLayout` runs while this module's constants initialize.
// Matched against the LABEL half of a "- <label>: <path>" line, in order;
// first match wins, and readLayout keeps the first declaration per slot.
//
// Every pattern is \b-anchored. Unanchored /plan/i matched the template's own
// "Artifacts directory (the data plane)" label — "plane" contains "plan" — so
// the artifacts declaration was swallowed by the plans slot and artifacts
// silently fell back to its default, pointing the drift scan at the wrong
// tree. Substring matching on prose labels is not safe; keep the anchors.
//
// Order still matters where one label legitimately contains another word:
// "Sprint plans directory" must bind sprints, not plans, so sprints is tested
// first (agentic-governance v0.5.0).
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

// Canonical default paths (llm/governance/project-operating-system.md
// §Repository Areas). A repo overrides any of them by declaring it in its
// delta's `## Repository Layout` block; a flag overrides both.
const LAYOUT_DEFAULTS = {
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

const DELTA = argValue('--delta', `${LAYOUT_DEFAULTS.governance}/governance-delta.md`);
// Declared layout wins over the defaults; the flag wins over both.
const LAYOUT = readLayout(DELTA);
for (const w of LAYOUT.warnings) console.warn(`WARN: ${w}`);
const ADR_REL = argValue('--adr-dir', LAYOUT.declared.adr || LAYOUT_DEFAULTS.adr);
const CONSTITUTION_REL = LAYOUT.declared.constitution || LAYOUT_DEFAULTS.constitution;
const ADR_DIR = path.join(ROOT, ADR_REL);
const LEGAL_STATUSES = ['Proposed', 'Accepted', 'Superseded', 'Deprecated'];
// Where this repo's claims live. Same precedence as every other path here:
// CLI flag > delta declaration (`## Roadmap` / `Path:`) > nothing. There is no
// canonical default: a repo with no roadmap has no claims, and guessing one
// would manufacture either a false PASS or a false FAIL.
const CLAIMS_REL = argValue('--claims', readClaimsPath(DELTA));

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

const SHAPES = [
  'path-only',
  'status-line-only',
  'index-table-rows',
  'checkbox-only',
  'link-target-only',
  'verification-marker',
];

// ---------- verification markers (human-verification capability) ----------
//
// A claim line carries an append-only marker block
// (llm/specs/2026-09-18-human-verification-capability-design.md §3.4, §3.5):
//
//   - [x] `P3-AC-04` A gate test asserts that no `/p/**` response carries
//     `public` (ADR-0004)
//     — AGENT VERIFIED (PR #22, 2026-09-16)
//     — HUMAN VERIFIED (PR #25, 2026-09-17)
//
// Deliberately isomorphic to the ADR `Status:` line, which this script already
// validates and every contributor already reads. Two consequences the rest of
// this section depends on:
//
//   * **Current state is the LAST marker line; history is the lines above it.**
//   * **An absent marker block means `NOT VERIFIED`** — the default cannot be
//     forged by omission, and costs nothing to adopt.

// The five asserted states (§5.1). `NOT VERIFIED` is not here: it is the
// default, and its only written form is the reset marker below.
const MARKER_STATES = [
  'AGENT VERIFIED',
  'HUMAN REVIEWED',
  'HUMAN VERIFIED',
  'VERIFICATION FAILED',
  'NEEDS REWORK',
];

// States only a human may assert (§5.2 transition table, §5.3 mechanism 2).
const HUMAN_ONLY_STATES = ['HUMAN REVIEWED', 'HUMAN VERIFIED'];

// Constrained legal marker form — no free prose in the parenthetical, exactly
// as LEGAL_STATUS_LINE enforces for ADRs (§3.4).
const LEGAL_MARKER = new RegExp(
  `^—\\s(${MARKER_STATES.join('|')})\\s\\(PR #\\d+(, \\d{4}-\\d{2}-\\d{2})?\\)$`
);
// The reset form §3.5 appends on invalidation: `— NOT VERIFIED (<reason>, DATE)`.
// The reason is the one place prose is legal, because §5.5 writes machine-
// generated text into it (`artifact changed: <identifier>`); the date is not
// optional here, because a reset with no date cannot be ordered against the
// marker it invalidates.
const LEGAL_RESET_MARKER = /^—\sNOT VERIFIED \([^()]+, \d{4}-\d{2}-\d{2}\)$/;

// A claim line: a Markdown checkbox item, optionally carrying a backticked
// claim ID as its first token (§3.2 `<SCOPE>-<KIND>-<nn>`). `<KIND>` is
// delta-bound and deliberately not enumerated here — canon must not learn what
// a "study" is (activity plan A1-AC-04).
const CLAIM_LINE = /^\s*[-*]\s+\[( |[xX])\]\s+(.*)$/;
const CLAIM_ID = /^`([A-Z][A-Z0-9]*-[A-Z]+-\d+)`/;

// A marker written on the claim line itself instead of below it. §3.5 reads
// the current state off the LAST marker LINE, so an inline marker asserts
// nothing while looking to a reader exactly like verification.
const INLINE_MARKER = new RegExp(`\\s—\\s*(NOT VERIFIED|${MARKER_STATES.join('|')})\\b`);

// Anything that is *trying* to be a marker. Kept wider than LEGAL_MARKER so
// that a malformed attempt is reported as malformed rather than silently
// ignored — silence would let an unparseable line sit under a claim looking to
// a human reader exactly like verification.
//
// But only wider in the ways an *attempted marker* is wider. The first cut
// matched a state word ANYWHERE on a line, which read ordinary prose about
// verification as a malformed marker — and a claims file explaining its own
// convention ("**An absent marker means `NOT VERIFIED`**", "Done means
// `HUMAN VERIFIED`, not ticked") is exactly the prose an adopting repo writes.
// The shipped slice fixture failed on three of its own paragraphs (V-5). A
// state word in mid-sentence prose is not an attempted marker, so a candidate
// must now START like one:
//
//   * a dash-like leader (em dash, en dash, horizontal bar) — the real form
//     and its lookalikes; hyphen-minus is deliberately NOT a leader here,
//     because every Markdown bullet begins with one; or
//   * a state word at the head of the line, optionally behind a list bullet —
//     which is how the hyphen-instead-of-em-dash and no-dash-at-all attempts
//     present, and both must still be caught and named.
//
// A marker crammed onto the claim line is covered separately by INLINE_MARKER.
const MARKER_CANDIDATE = new RegExp(
  `(^\\s*[—–―]\\s)|(^\\s*[-*+]?\\s*(NOT VERIFIED|${MARKER_STATES.join('|')})\\b)`
);

// An added L0 diff line that ASSERTS a human-only state in marker form, at the
// head of a line or appended to a claim line. Wider than LEGAL_MARKER on
// purpose — a forgery does not have to be well-formed to read to a human as a
// human sign-off — and narrower than "the line mentions HUMAN VERIFIED", so an
// index row or a sentence about the policy is not caught. Dash lookalikes and
// the non-breaking space are both inside it (`\s` accepts U+00A0 in JS).
const HUMAN_STATE_ASSERTION = new RegExp(
  `(?:^|\\s)[—–―-]\\s*(${HUMAN_ONLY_STATES.join('|')})\\b`
);

// Legal transitions, §5.2, exhaustively. The table is the authority; this is a
// transcription of it, and nothing may be added here that is not in it.
// `any -> NOT VERIFIED` is the automatic reset row (§5.4/§5.5), so every state
// carries it. There is no row *out of* VERIFICATION FAILED or NEEDS REWORK
// other than that reset: rework resets, it does not re-promote in place.
const LEGAL_TRANSITIONS = {
  'NOT VERIFIED': ['AGENT VERIFIED', 'HUMAN REVIEWED', 'HUMAN VERIFIED', 'VERIFICATION FAILED', 'NEEDS REWORK', 'NOT VERIFIED'],
  'AGENT VERIFIED': ['HUMAN REVIEWED', 'HUMAN VERIFIED', 'VERIFICATION FAILED', 'NEEDS REWORK', 'NOT VERIFIED'],
  'HUMAN REVIEWED': ['HUMAN VERIFIED', 'VERIFICATION FAILED', 'NEEDS REWORK', 'NOT VERIFIED'],
  'HUMAN VERIFIED': ['VERIFICATION FAILED', 'NEEDS REWORK', 'NOT VERIFIED'],
  'VERIFICATION FAILED': ['NOT VERIFIED'],
  'NEEDS REWORK': ['NOT VERIFIED'],
};

// Determinism levels, §14.1 — and the direction matters more than anything
// else in this file. **L3 is the STRONGEST (deterministic) and L1 the WEAKEST
// (attested).** §4.1 and §5.5 of the design once said "Level 3" where they
// meant `L1`; the amendment recorded at §14.1 (2026-09-23) makes this table
// canonical. Implementing the cap below against an inverted scale would invert
// the single mechanism (§5.3 mechanism 4) that stops an agent's own say-so
// being laundered into HUMAN VERIFIED, so the ordering is asserted explicitly
// rather than inferred from the string.
const DETERMINISM_RANK = { L1: 1, L2: 2, L3: 3 };
// (The level is read from an `EVIDENCE <id>` block's `determinism:` key, not
// from a bare token on the citing line — see evidenceCitations.)
// §6.3 — achievable state is capped by best evidence.
const EVIDENCE_CEILING = { none: 'NOT VERIFIED', L1: 'AGENT VERIFIED', L2: 'HUMAN VERIFIED', L3: 'HUMAN VERIFIED' };

// ---------- helpers ----------

// stdio stderr:'pipe' is deliberate. execFileSync both captures stderr on the
// thrown error AND inherits it to the parent, so existsInBase's
// expected-negative `cat-file -e` probe printed a bare
// "fatal: Not a valid object name <base>:<file>" line into the log for every
// file absent from the base — around twenty lines on a passing run in one
// adopting repo. Piping keeps the text on e.stderr for real diagnostics while
// keeping predictable, handled probes out of CI output. A check that cries
// "fatal" while passing teaches people to stop reading its output.
function git(...a) {
  return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
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

// Reads the claim source from the delta. Returns null — never a guess — when
// the repo declares nothing, declares "none", or has left the template's
// instructional placeholder in place. Never throws: an unreadable delta means
// "undeclared", which the check reports as a SKIP.
//
// TWO declarations are accepted, and that is the fix for V-4 rather than a
// convenience. The checker read only `## Roadmap` → `Path:`; the projection
// engine (`surface.mjs`) reads only `## Published Surface` → `Claims source:`.
// The slice fixture declares the latter, so the `verification-markers` check
// SKIPped on the one repository built to exercise this capability end to end,
// and had never run against it. Two halves of one capability must not disagree
// about where the claim source is declared, so the checker now resolves it the
// way the engine does *and* keeps the canonical roadmap binding:
//
//   * `## Published Surface` → `Claims source:` — the engine's declaration,
//     and therefore the one that wins when both are present;
//   * `## Roadmap` → `Path:` — the delta template's declaration, used by every
//     repo that publishes no surface.
//
// When both are declared and they disagree, the checker warns and follows the
// engine, because a checker that verifies a different file from the one the
// surface publishes is worse than no checker.
//
// The template's placeholder is `[e.g. \`llm/master-roadmap.md\`; "none" if …]`,
// which contains a backticked path. cleanLayoutValue would happily extract it
// and point the check at a file that does not exist in this repo, turning an
// unfilled template into a hard failure. Anything still carrying `e.g.` is
// therefore read as unfilled.
function readDeltaDeclaration(text, heading, key) {
  const headingRe = new RegExp(`^##\\s+${heading}\\s*$`, 'i');
  const keyRe = new RegExp(`^\\s*(?:[-*]\\s+)?${key}:\\s*(.+?)\\s*$`, 'i');
  let inBlock = false;
  for (const line of text.split('\n')) {
    if (/^##\s+\S/.test(line)) {
      inBlock = headingRe.test(line.trim());
      continue;
    }
    if (!inBlock) continue;
    const m = line.match(keyRe);
    if (!m) continue;
    const v = m[1];
    if (/\be\.g\.\s/i.test(v)) return null; // unfilled template placeholder
    if (/^\[?\s*(none|n\/a|tbd)\b/i.test(v)) return null; // declared: nothing here
    return cleanLayoutValue(v);
  }
  return null;
}

function readClaimsPath(deltaRel) {
  const abs = path.join(ROOT, deltaRel);
  let text;
  try {
    if (!fs.existsSync(abs)) return null;
    text = read(abs);
  } catch {
    return null;
  }
  const fromSurface = readDeltaDeclaration(text, 'Published Surface', 'Claims source');
  const fromRoadmap = readDeltaDeclaration(text, 'Roadmap', 'Path');
  if (fromSurface && fromRoadmap && fromSurface !== fromRoadmap) {
    console.warn(
      `WARN: ${deltaRel} declares two different claim sources — ` +
        `"## Published Surface / Claims source: ${fromSurface}" and "## Roadmap / Path: ${fromRoadmap}". ` +
        `Using "${fromSurface}", the one surface.mjs publishes. Reconcile the delta: one claim source, declared once.`
    );
  }
  return fromSurface ?? fromRoadmap;
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
  // A nonexistent ADR directory used to PASS here: adrFiles() returned [] and
  // the empty set satisfied every assertion. Two repos ran for weeks with
  // adr-index and adr-status green while the checker was resolving ADR_REL to a
  // directory that did not exist. A check that verifies nothing must say so.
  if (!fs.existsSync(ADR_DIR)) {
    return { skipped: `no ADR directory at "${ADR_REL}": no ADR was checked. Declare the ADR directory in the delta's §Repository Layout, or pass --adr-dir <path>.` };
  }
  if (adrFiles().length === 0) {
    return { skipped: `"${ADR_REL}" contains no ADR files (NNNN-*.md): no ADR was checked.` };
  }
  if (!fs.existsSync(indexPath)) {
    return [`${ADR_REL}/README.md: missing, but ADR files exist`];
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
  if (!fs.existsSync(ADR_DIR)) {
    return { skipped: `no ADR directory at "${ADR_REL}": no ADR status was checked. Declare the ADR directory in the delta's §Repository Layout, or pass --adr-dir <path>.` };
  }
  if (adrFiles().length === 0) {
    return { skipped: `"${ADR_REL}" contains no ADR files (NNNN-*.md): no ADR status was checked.` };
  }
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
  // The inverse direction. Above verifies declared -> exists; this verifies
  // exists -> declared. Without it a repo can hold control-plane content in a
  // canonical slot directory it never declared and still be told PASS, which is
  // exactly the drift ADR-0001 exists to catch. agentic-kg carried
  // llm/plans/ with a file in it while its delta asserted "this repo has no
  // such content", and every check passed.
  //
  // Only the canonical DEFAULT path of an undeclared slot is flagged. A
  // directory with no canonical slot at all (llm/session_notes/,
  // llm/construction/) is legitimate and documented as outside the slot table,
  // so it must not false-positive here.
  //
  // Two exclusions, both deliberate:
  //
  // - `artifacts`. Its default (`docs/`) exists in nearly every repo for
  //   unrelated reasons — a published site, a Jekyll build — and the slot has a
  //   safe canonical default the drift scan above already uses. The violation
  //   worth failing on is control-plane content in an undeclared CONTROL-plane
  //   slot, not the presence of a docs directory.
  // - A repo with no delta at all. That is already reported as a graded SKIP
  //   (v0.6.0), and turning it into a list of per-slot failures would undo that
  //   deliberate design: a repo that declares nothing has one problem, not eight.
  if (LAYOUT.hasDelta && Object.keys(LAYOUT.declared).length > 0) {
    for (const [slot, def] of Object.entries(LAYOUT_DEFAULTS)) {
      if (slot === 'artifacts') continue;
      if (slot in LAYOUT.declared) continue;
      const abs = path.join(ROOT, def);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue;
      if (listMd(abs).length === 0) continue; // empty: nothing to govern yet
      failures.push(
        `${DELTA} §Repository Layout: "${def}" exists and holds content, but the ${slot} slot is not declared — an undeclared path in use is a violation. Declare it, or move the content.`
      );
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
  if (shape === 'verification-marker') {
    // Append-only, and that is the entire reason this shape exists
    // (design §3.5: "Removal is a violation, and it is mechanically
    // checkable"). Deliberately NOT a pairedConstraint: `status-line-only` and
    // `checkbox-only` permit a 1:1 line REPLACEMENT, which is exactly what
    // append-only forbids. A marker block that can be rewritten in place is
    // the opposite of a record — the one event a reader most needs to see is
    // the verification that was later withdrawn, and rewriting hides it.
    const failures = [];
    if (removed.length > 0) {
      failures.push(
        `${file}: the verification-marker shape is append-only — ${removed.length} line(s) removed or edited vs ${BASE}. ` +
          `Deleting or editing an existing marker line, or changing a claim's text, is a violation (§3.5); a reset APPENDS "— NOT VERIFIED (<reason>, YYYY-MM-DD)". ` +
          `First offending line: "${removed[0].trim().slice(0, 90)}"`
      );
    }
    for (const line of added) {
      const m = classifyMarker(line);
      if (!m.ok) {
        failures.push(
          `${file}: added line is not a well-formed verification marker — ${m.why}: "${line.trim().slice(0, 90)}"`
        );
        continue;
      }
      // The human-only state guard used to live HERE, inside this branch, and
      // that placement was the single defect this whole capability rested on:
      // `shapeConstraint` returns `[]` for `path-only` before it ever reads the
      // diff, so a claims file allowlisted `path-only` — one word from a
      // plausible steward mistake, and canonically the memory-bank shape — took
      // an agent-authored `— HUMAN VERIFIED (PR #n, date)` through a full --l0
      // run at exit 0. A guard that a declaration can route around is not a
      // guard. It is now enforced lane-wide in checkL0Paths, before any shape
      // is dispatched; see humanStateGuard.
    }
    return failures;
  }
  return [`${file}: unknown shape "${shape}"`];
}

// The human-only state guard, applied to EVERY L0 diff whatever shape the path
// declares (§5.2, §5.3 mechanism 2).
//
// `HUMAN REVIEWED` and `HUMAN VERIFIED` are human-only assertions, and the L0
// fast track is the one lane in which an AI role may merge
// (l0-fast-track.md §Purpose). An L0 diff asserting a human state is therefore
// an agent asserting a human's finding about its own work — the precise failure
// §5.3 exists to prevent — and it is semantic by condition 2, so it leaves the
// fast track either way.
//
// Enforcement point, and why it is here rather than in the shape:
//
//   * The rule is a property of the LANE ("no agent may mark its own work
//     HUMAN VERIFIED"), not a property of one diff shape. Binding it to the
//     shape made a repo's allowlist — a single word in a document the PR is
//     hard-denied from touching, but which a steward writes by hand — the
//     thing that decides whether the rule applies at all.
//   * Every added line of every allowed file is inspected, so there is no
//     "weaker shape" to opt into. `path-only` returns early from the shape
//     check; it does not return early from this one.
//   * It is deliberately redundant with the `verification-marker` shape rather
//     than replacing it: that shape also enforces append-only and marker
//     grammar, which this guard says nothing about.
function humanStateGuard(file) {
  const { added } = diffLines(file);
  const failures = [];
  const seen = new Set();
  for (const line of added) {
    const m = line.match(HUMAN_STATE_ASSERTION);
    if (!m || seen.has(m[1])) continue;
    seen.add(m[1]);
    failures.push(
      `${file}: added marker asserts "${m[1]}", a human-only state (§5.2). The L0 fast track is the agent lane; a human verification assertion is semantic and takes human review. Agents may append AGENT VERIFIED, VERIFICATION FAILED, NEEDS REWORK or a NOT VERIFIED reset.`
    );
  }
  return failures;
}

// Does this file carry verification markers — in the base tree, or in the
// lines this PR adds? Used to decide whether the declared claim source is
// obliged to be allowlisted under the shape that guards markers.
function carriesMarkers(file, added) {
  const isMarker = (l) => MARKER_CANDIDATE.test(l) && classifyMarker(l).ok;
  if (added.some(isMarker)) return true;
  try {
    return git('show', `${BASE}:${file}`).split('\n').some(isMarker);
  } catch {
    return false;
  }
}

// The second half of the V-1 fix, and it closes a hole the state guard above
// cannot reach. `path-only` waives the APPEND-ONLY rule as well: under it an
// agent may delete a `— NOT VERIFIED (artifact changed…)` reset line and
// restore a stale `HUMAN VERIFIED` without adding a single human state.
//
// So a marker-bearing claim source must be allowlisted under the shape that
// guards it. Deliberately conditional on the file actually carrying markers:
// adoption is incremental, and a repo whose roadmap has no markers at all is
// entitled to keep `allow <roadmap> checkbox-only` and flip ticks in the lane
// (l0-fast-track.md §Template Allowlist states the replacement rule).
function claimSourceShapeGuard(file, shape, added) {
  if (!CLAIMS_REL || file !== CLAIMS_REL) return [];
  if (shape === 'verification-marker') return [];
  if (!carriesMarkers(file, added)) return [];
  return [
    `${file}: this repo's declared claim source carries verification markers but is allowlisted "${shape}" — ` +
      `only the verification-marker shape enforces the append-only marker rule (§3.5). ` +
      `Replace the allow line with "allow ${file} verification-marker" (l0-fast-track.md §Template Allowlist).`,
  ];
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
    // Lane-wide first, shape second. The human-state guard must not be
    // reachable-around by declaring a weaker shape for the path (V-1).
    failures.push(...humanStateGuard(file));
    failures.push(...claimSourceShapeGuard(file, allowed[2], diffLines(file).added));
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

// ---------- check 7: verification-markers ----------

// Classify one candidate marker line. Returns the asserted state, or the
// specific reason it is malformed — "malformed" with no reason is useless to
// the person who has to fix it.
function classifyMarker(rawLine) {
  const s = rawLine.trim();
  const legal = s.match(LEGAL_MARKER);
  if (legal) return { ok: true, state: legal[1] };
  if (LEGAL_RESET_MARKER.test(s)) return { ok: true, state: 'NOT VERIFIED' };
  if (!/^—\s/.test(s)) {
    return { ok: false, why: 'a marker line is "— <STATE> (PR #<n>[, YYYY-MM-DD])" and must begin with an em dash (U+2014)' };
  }
  const body = s.replace(/^—\s+/, '');
  const all = [...MARKER_STATES, 'NOT VERIFIED'];
  const state = all.find((st) => body.startsWith(st));
  if (!state) {
    return { ok: false, why: `state must be one of ${all.join(', ')}` };
  }
  const rest = body.slice(state.length).trim();
  if (state === 'NOT VERIFIED') {
    return { ok: false, why: 'the reset form is "— NOT VERIFIED (<reason>, YYYY-MM-DD)" — a reason and a date are both required (§3.5)' };
  }
  if (!/^\(.*\)$/.test(rest) || !/PR #\d+/.test(rest)) {
    return { ok: false, why: 'missing the PR citation — the form is "(PR #<n>[, YYYY-MM-DD])"' };
  }
  return { ok: false, why: 'no free prose in the parenthetical — it holds "PR #<n>[, YYYY-MM-DD]" and nothing else (§3.4)' };
}

// Claims and their marker blocks, in file order. A marker belongs to the claim
// above it and to no other; a blank line, a heading or a fence ends the block,
// so a marker orphaned from any claim is reported rather than silently
// reassigned to a claim further up the file.
//
// A fence hides what it encloses, so an UNBALANCED fence is reported rather
// than trusted (V-2). One stray ``` line above a claim removed that claim from
// the check entirely — reported `PASS`, exit 0, with a forged `HUMAN VERIFIED`
// sitting below it — and the same line at the top of the file degraded the
// whole check to `SKIP`, exit 0. That contradicts §3.2's own rule that a claim
// is never silently omitted, and it is an ordinary accident as well as an
// attack: one mis-indented fence and a claims file quietly stops being checked.
// `unclosedFenceAt` is the line that opened the fence that never closed.
function parseClaims(text, fileRel) {
  const claims = [];
  const orphans = [];
  let current = null;
  let fenced = false;
  let fenceOpenedAt = null;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '');
    const at = `${fileRel}:${i + 1}`;
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      fenceOpenedAt = fenced ? `${fileRel}:${i + 1}` : null;
      current = null;
      continue;
    }
    if (fenced) continue;
    const cm = line.match(CLAIM_LINE);
    if (cm) {
      const idm = cm[2].match(CLAIM_ID);
      current = { id: idm ? idm[1] : null, at, text: cm[2], markers: [], inline: null };
      // A marker crammed onto the end of the claim line. It reads to a human
      // exactly like a marker block and is invisible to "the state is the last
      // marker line", so it must be reported rather than ignored — silently
      // ignoring it is how an unverified claim comes to look verified.
      const inline = cm[2].match(INLINE_MARKER);
      if (inline) current.inline = inline[1];
      claims.push(current);
      continue;
    }
    if (line.trim() === '' || /^#{1,6}\s/.test(line) || /^\s*\|/.test(line)) {
      current = null;
      continue;
    }
    if (!MARKER_CANDIDATE.test(line)) continue;
    const m = { at, raw: line, ...classifyMarker(line) };
    if (current) current.markers.push(m);
    else orphans.push(m);
  }
  return { claims, orphans, unclosedFenceAt: fenced ? fenceOpenedAt : null };
}

// Evidence citations for a set of claim IDs: every line of a tracked,
// non-narrative file in the repo that names the claim, outside the claim files
// themselves. This is §6.1's binding-by-citation, read the only way a
// dependency-free checker can read it.
//
// Three things the first cut got wrong, each of which made the determinism cap
// answerable by something other than evidence (V-3):
//
//  1. **The level was read from the citing line only.** The project's own
//     evidence declares the claim on one line and the level three lines below
//     it — the `EVIDENCE <id>` header block documented in surface.mjs §Evidence
//     and used by every artifact in the slice fixture. So the honest format
//     declared nothing, the cap was stuck CLOSED against a legitimate `L3`
//     claim, and it passed only because two narrative reports happened to
//     carry `P1-AC-01 … L3` on one line. The level is now read from the
//     `determinism:` key of the header block, exactly as the engine reads it:
//     the two halves of this capability must parse evidence the same way.
//  2. **Any line mentioning the ID could carry the level.** A *negation* —
//     `// P1-AC-01 has no L3 evidence and was never replayed.` — unlocked the
//     cap. A level now has to be DECLARED (an `EVIDENCE <id>` header with a
//     `determinism:` key), not merely mentioned near the ID. Prose about
//     evidence is not evidence.
//  3. **Untracked files counted.** `--untracked` made a scratch file that is
//     not in the PR and will not exist in CI satisfy a local run whose output
//     the fast track accepts as the checks-pass artifact. Dropped: the cap now
//     reads only what the PR actually contains.
//
// Honest limit, unchanged and stated here because the cap rests on it: the
// scan cannot tell a truthful `determinism: L3` from a false one — nothing
// textual can. It closes the *omission* path (no evidence, no level, prose
// instead of a declaration) and leaves the *fabrication* path to §5.3's other
// three mechanisms and to the auditor. Best-level-wins across a claim's
// declarations still means one fabricated `L3` block outranks honest `L1`
// ones; what changed is that the fabrication now has to be a structured
// declaration in a tracked evidence artifact, which is a thing a reviewer can
// be pointed at.

// Narrative files describe evidence; they are not evidence. A builder's or
// verifier's report quoting an `EVIDENCE …/determinism: L3` block in a fenced
// example is not a citation artifact, and `fixtures/slice/BUILDER-1-REPORT.md`
// contains exactly that. Excluding them is also what makes the cap honest for
// an adopter, who carries the evidence and not the reports.
const NARRATIVE_FILE = /(^|\/)(README|CHANGELOG|CONTRIBUTING|AGENTS|CLAUDE)\.md$|-REPORT\.md$/i;

// How far below an `EVIDENCE <id>` header the `determinism:` key may sit. The
// documented block is ten-odd keys long; the scan stops early at a blank line
// or at the next EVIDENCE header, so the window is a backstop, not the rule.
const EVIDENCE_BLOCK_WINDOW = 16;

// Comment punctuation stripped the same way surface.mjs strips it, so one
// block form works in .mjs, .py, .md and .yml.
function stripCommentPunct(line) {
  let s = line.trim();
  s = s.replace(/^<!--\s?/, '').replace(/-->\s*$/, '');
  s = s.replace(/^(\/\/+|#+|\*+|--)\s?/, '');
  return s.trim();
}

const EVIDENCE_HEADER = /^EVIDENCE\s+([A-Z][A-Z0-9]*-[A-Z]+-\d+)\b/;
const DETERMINISM_KEY = /^determinism\s*:\s*(L[123])\b/i;

// Levels declared by the `EVIDENCE <id>` header block that STARTS at `idx`.
// Returns [] for a line that merely mentions the ID: a mention is a citation,
// never a declaration.
function declaredLevelsAt(lines, idx, id) {
  const head = stripCommentPunct(lines[idx]);
  const hm = head.match(EVIDENCE_HEADER);
  if (!hm || hm[1] !== id) return [];
  const levels = [];
  for (let i = idx + 1; i < Math.min(lines.length, idx + 1 + EVIDENCE_BLOCK_WINDOW); i++) {
    const s = stripCommentPunct(lines[i]);
    if (s === '') break; // a blank line ends the header block
    if (EVIDENCE_HEADER.test(s)) break; // the next declaration begins
    const dm = s.match(DETERMINISM_KEY);
    if (dm) levels.push(dm[1].toUpperCase()); // `l3` is the same level as `L3`
  }
  return levels;
}

function evidenceCitations(ids, claimFiles) {
  const out = new Map(ids.map((id) => [id, []]));
  if (ids.length === 0) return out;
  let raw;
  try {
    // Tracked files only — see (3) above.
    raw = git('grep', '-n', '-I', '-F', ...ids.flatMap((id) => ['-e', id]));
  } catch (e) {
    if (e.status === 1) return out; // git grep: no matches
    throw new Error(`evidence scan failed: ${e.message}`);
  }
  const fileLines = new Map();
  const linesOf = (file) => {
    if (!fileLines.has(file)) {
      let text = '';
      try { text = read(path.join(ROOT, file)); } catch { text = ''; }
      fileLines.set(file, text.split('\n'));
    }
    return fileLines.get(file);
  };
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^:]+):(\d+):([\s\S]*)$/);
    if (!m) continue;
    const [, file, lineNo, content] = m;
    if (claimFiles.includes(file)) continue; // the claim's own home is not evidence for it
    if (NARRATIVE_FILE.test(file)) continue; // a report about evidence is not evidence
    for (const id of ids) {
      if (!content.includes(id)) continue;
      const levels = declaredLevelsAt(linesOf(file), Number(lineNo) - 1, id);
      out.get(id).push({ file, lineNo, levels });
    }
  }
  return out;
}

// Best (strongest) declared level across a claim's citations. L3 > L2 > L1,
// per §14.1 as amended — see DETERMINISM_RANK.
function bestEvidenceLevel(citations) {
  let best = null;
  for (const c of citations) {
    for (const lv of c.levels) {
      if (best === null || DETERMINISM_RANK[lv] > DETERMINISM_RANK[best]) best = lv;
    }
  }
  return best;
}

function checkVerificationMarkers() {
  if (!CLAIMS_REL) {
    return {
      skipped:
        `no claim source declared: neither the delta's "## Published Surface" block ("Claims source:") nor its ` +
        `"## Roadmap" block ("Path:") binds a path (or both declare "none"), ` +
        `so no claim, marker or verification state was checked. Pass --claims <path> if this repo's claims live elsewhere.`,
    };
  }
  const abs = path.join(ROOT, CLAIMS_REL);
  if (!fs.existsSync(abs)) {
    return [
      `${CLAIMS_REL}: declared as this repo's claim source but does not exist — a declared source that is absent is a gap, not an empty result`,
    ];
  }
  const files = fs.statSync(abs).isDirectory() ? listMd(abs) : [abs];
  const claimFiles = files.map((f) => rel(f));
  const failures = [];
  const claims = [];
  let markerCount = 0;
  for (const f of files) {
    const parsed = parseClaims(read(f), rel(f));
    claims.push(...parsed.claims);
    markerCount += parsed.claims.reduce((n, c) => n + c.markers.length, 0);
    if (parsed.unclosedFenceAt) {
      failures.push(
        `${parsed.unclosedFenceAt}: unbalanced code fence — everything below it is inside a fence that never closes, ` +
          `so those claims and markers were not checked. A claim is never silently omitted (§3.2): close the fence.`
      );
    }
    for (const o of parsed.orphans) {
      failures.push(
        `${o.at}: verification marker is not attached to any claim — a marker belongs on the claim line it verifies (§3.3): "${o.raw.trim().slice(0, 90)}"`
      );
    }
  }
  if (claims.length === 0 && failures.length === 0) {
    return {
      skipped: `${claimFiles.join(', ')}: no claim checkbox items found, so no marker grammar or verification state was checked.`,
    };
  }

  // 1. Grammar, and the ID a marker needs in order to mean anything.
  const unidentified = [];
  const seen = new Map(); // claim id -> first `at`
  for (const c of claims) {
    if (c.inline) {
      failures.push(
        `${c.at}: "${c.inline}" is written on the claim line itself — a marker belongs on its own line below the claim, because the current state is the LAST marker line (§3.5). As written it asserts nothing while reading like verification.`
      );
    }
    if (c.id) {
      // A duplicated ID is not an address. Two claims sharing one would also
      // let a verified copy stand in for an unverified one in every downstream
      // lookup, evidence scan and cap check.
      if (seen.has(c.id)) {
        failures.push(
          `${c.at}: claim ID ${c.id} is already used at ${seen.get(c.id)} — a claim ID is an address (§3.2) and must be unique`
        );
      } else {
        seen.set(c.id, c.at);
      }
    }
    if (!c.id && c.markers.length === 0) {
      unidentified.push(c.at);
      continue;
    }
    if (!c.id && c.markers.length > 0) {
      failures.push(
        `${c.at}: carries a verification marker but no claim ID — verification binds to an addressable claim (§3.2), and an un-ID'd claim cannot be cited by its evidence`
      );
    }
    for (const m of c.markers) {
      if (!m.ok) {
        failures.push(`${m.at}: malformed verification marker — ${m.why}: "${m.raw.trim().slice(0, 90)}"`);
      }
    }
  }

  // 2. Transitions. History is the marker block read top to bottom from the
  //    implicit `NOT VERIFIED`; the current state is the last line (§3.5).
  // A list, not a map keyed by ID: a duplicated ID is reported above, but it
  // must not also make one copy of the claim disappear from the cap check
  // below — that would let a verified duplicate shadow an unverified original.
  const states = [];
  for (const c of claims) {
    let state = 'NOT VERIFIED';
    for (const m of c.markers) {
      if (!m.ok) continue; // already reported; an unparseable line asserts nothing
      const legal = LEGAL_TRANSITIONS[state] || [];
      if (!legal.includes(m.state)) {
        failures.push(
          `${m.at}: illegal transition "${state}" -> "${m.state}"${c.id ? ` on ${c.id}` : ''} — §5.2's table permits only ${legal.join(', ')} from "${state}"`
        );
        continue; // do not advance: an illegal edge does not move the state
      }
      if (HUMAN_ONLY_STATES.includes(m.state) && !/PR #\d+/.test(m.raw)) {
        failures.push(
          `${m.at}: "${m.state}" is a human-only state and must cite the PR carrying the human approval (§5.3 mechanism 2)`
        );
      }
      state = m.state;
    }
    if (c.id) states.push({ id: c.id, state, claim: c });
  }

  // 3. The determinism cap (§5.3 mechanism 4, §6.3, §14.4). A claim whose only
  //    evidence is `L1` — attested, the WEAKEST level — cannot reach a human
  //    state. `L1` is an agent's own say-so by definition, so this is the
  //    mechanism that stops say-so being laundered into human verification.
  //    Read §14.1 before touching the direction of this comparison.
  const humanStateClaims = states.filter((s) => HUMAN_ONLY_STATES.includes(s.state));
  if (humanStateClaims.length > 0) {
    const citations = evidenceCitations([...new Set(humanStateClaims.map((s) => s.id))], claimFiles);
    for (const { id, state, claim } of humanStateClaims) {
      const cites = citations.get(id) || [];
      const best = bestEvidenceLevel(cites);
      if (cites.length === 0) {
        failures.push(
          `${claim.at}: ${id} is "${state}" but no evidence anywhere in the tree cites it — §6.3 caps a claim with no evidence at NOT VERIFIED`
        );
        continue;
      }
      if (best === null) {
        failures.push(
          `${claim.at}: ${id} is "${state}" but no citing artifact DECLARES a determinism level — §14.1: an undeclared level is a gap marker, never a default. ` +
            `A level is declared by an evidence header block ("EVIDENCE ${id}" followed by "determinism: L1|L2|L3"), not by a mention of the level near the ID ` +
            `(${cites.length} citation(s): ${cites.slice(0, 3).map((c) => `${c.file}:${c.lineNo}`).join(', ')})`
        );
        continue;
      }
      const ceiling = EVIDENCE_CEILING[best];
      if (best === 'L1') {
        failures.push(
          `${claim.at}: ${id} is "${state}" but its only evidence is L1 (attested — the WEAKEST level, §14.1) — §6.3/§14.4 cap an L1-only claim at "${ceiling}". An agent's assertion about its own work is L1 by definition; it is testimony, not verification.`
        );
      }
    }
  }

  if (unidentified.length > 0) {
    // Counted and reported, never silently dropped (§3.2). Not a failure:
    // adoption is incremental and an ID-less criterion is simply invisible to
    // the projection — but it must never disappear from the output.
    console.warn(
      `WARN: ${unidentified.length} claim(s) carry no claim ID and no marker, so they are invisible to verification: ${unidentified.slice(0, 5).join(', ')}${unidentified.length > 5 ? ', …' : ''}`
    );
  }
  // What was examined, printed even on PASS (V-2). A silent `PASS` cannot be
  // told apart from a `PASS` over a file whose claims have been hidden; a drop
  // from twelve claims to one is visible in a diff of the CI log.
  failures.note = `${claims.length} claim(s), ${markerCount} marker(s)`;
  return failures;
}

// ---------- runner ----------

const checks = [
  ['governance-links', checkLinks],
  ['adr-index', checkAdrIndex],
  ['adr-status', checkAdrStatus],
  ['verification-markers', checkVerificationMarkers],
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
    // A check may attach a `note` to its (empty) failure array to say WHAT it
    // examined. "PASS" over nothing and "PASS" over twelve claims must not
    // print identically — see checkVerificationMarkers.
    console.log(`PASS  ${name}${failures.note ? ` (${failures.note})` : ''}`);
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
