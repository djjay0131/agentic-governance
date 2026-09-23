#!/usr/bin/env node
// surface.mjs — the surface engine: declared sources -> deterministic
// generator -> hashed manifest (agentic-governance design
// llm/specs/2026-09-18-human-verification-capability-design.md §2.1).
//
// Two projections, one engine, one manifest, one definition of "stale":
//   * design projection        — taxonomy, ADR index, module map (not built here)
//   * verification projection  — claims, states, evidence, determinism, PDatasets
//
// Plain Node, ZERO dependencies, no network, no git — the same discipline as
// governance-checks.mjs. The generator is itself `L3` (design §14.1): two runs
// over unchanged inputs produce byte-identical output apart from
// `generated_at`. `--generated-at` pins even that.
//
// Paths are declared, not hardcoded. Everything below is read from the target
// repo's governance delta `## Published Surface` block; CLI flags override.
//
// Usage:
//   node surface.mjs --root plugin/scripts/fixtures/slice
//   node surface.mjs --root <dir> --out /tmp/m.json
//   node surface.mjs --root <dir> --previous docs/verification/surface-manifest.json
//   node surface.mjs --root <dir> --claims llm/claims.md      # source override
//   node surface.mjs --root <dir> --generated-at 2026-09-23T00:00:00.000Z
//   node surface.mjs --root <dir> --print                     # manifest to stdout
//
// Exit codes:
//   0  manifest written, no `error`-severity findings
//   1  manifest written, at least one `error`-severity finding
//   2  the engine could not run (no delta, unreadable declared source, bad flag)
//
// A repo with no `## Published Surface` block is unaffected: exit 0, nothing
// emitted, `SKIP` reported (activity plan A3-AC-05).

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Vocabulary. Canon's, not a local invention.
// ---------------------------------------------------------------------------

// design §5.1 — six states, no others.
const STATES = [
  'NOT VERIFIED',
  'AGENT VERIFIED',
  'HUMAN REVIEWED',
  'HUMAN VERIFIED',
  'VERIFICATION FAILED',
  'NEEDS REWORK',
];

// The affirmative ladder, weakest first. `VERIFICATION FAILED` and
// `NEEDS REWORK` are deliberately NOT on it: they are outcomes, not rungs, and
// an evidence ceiling must never "cap" a failure into looking like a pass.
const LADDER = ['NOT VERIFIED', 'AGENT VERIFIED', 'HUMAN REVIEWED', 'HUMAN VERIFIED'];
const rung = (s) => LADDER.indexOf(s);

// design §14.1, as amended 2026-09-23 (slice reconciliation A-1).
//   L3 = deterministic  (STRONGEST)
//   L2 = executable, non-deterministic
//   L1 = attested       (WEAKEST — cannot reach HUMAN VERIFIED)
// There is no default. An undeclared level is a gap marker, because the
// safe-looking default (L1) would quietly cap claims and the useful-looking
// default (L3) would quietly launder assertions.
const DETERMINISM = ['L1', 'L2', 'L3'];
const strength = (d) => DETERMINISM.indexOf(d); // -1 for undeclared

const EVIDENCE_KINDS = ['test', 'command', 'artifact', 'pdataset', 'observation', 'assertion'];
const ACTOR_CLASSES = ['human', 'agent'];
const PUBLISHED_PAGES = ['jekyll', 'mkdocs', 'actions-pages'];

const SEVERITIES = ['error', 'warn', 'info'];

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
function value(name, fallback = null) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) die(`${name} requires a value`);
  return v;
}
function die(message) {
  process.stderr.write(`surface.mjs: ${message}\n`);
  process.exit(2);
}

const ROOT = path.resolve(value('--root', '.'));
const DELTA_REL = value('--delta', 'llm/governance/governance-delta.md');
const QUIET = flag('--quiet');
const PRINT = flag('--print');

// `generated_at` is the one field permitted to vary between runs. Pinning it
// makes even that vary-able field reproducible, which is how the determinism
// claim is checked rather than asserted.
const GENERATED_AT = value('--generated-at', new Date().toISOString());
if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(GENERATED_AT)) die(`--generated-at must be an ISO-8601 UTC timestamp`);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const posix = (p) => p.split(path.sep).join('/');
const underRoot = (rel) => path.join(ROOT, rel);
const exists = (abs) => { try { return fs.statSync(abs).isFile(); } catch { return false; } };
const readText = (abs) => fs.readFileSync(abs, 'utf8');

/** Collapse runs of whitespace and trim. The one normalization applied before hashing claim text. */
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

const findings = [];
const gaps = [];

/**
 * Record a finding. Findings are REPORTED, never auto-fixed
 * (Design Surface §4.3, inherited by design §5 and activity plan A5-AC-01).
 */
function finding(severity, code, subject, message, locator = null) {
  if (!SEVERITIES.includes(severity)) throw new Error(`bad severity ${severity}`);
  findings.push({ severity, code, subject, message, locator });
}

/**
 * Record a visible gap: a declared thing that is absent or undeclared.
 * A gap is never silent and never invented (design §4.2, Design Surface §7).
 */
function gap(subject, field, message, locator = null) {
  gaps.push({ subject, field, message, locator });
}

// ---------------------------------------------------------------------------
// The delta
// ---------------------------------------------------------------------------

const deltaAbs = underRoot(DELTA_REL);
if (!exists(deltaAbs)) die(`no governance delta at ${posix(path.relative(process.cwd(), deltaAbs))}`);
const deltaText = readText(deltaAbs);

/** Read a `## <Heading>` section's body out of a Markdown document. */
function section(text, heading) {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, 'mi');
  const m = re.exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const end = /^##\s+/m.exec(rest);
  return end ? rest.slice(0, end.index) : rest;
}

/** `Key: value` lines at the top of a block, stopping at the first blank-then-prose. */
function declarations(body) {
  const out = new Map();
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line === '') { if (out.size) break; continue; }
    const m = /^([A-Za-z][A-Za-z0-9 _-]*):\s*(.*)$/.exec(line);
    if (!m) { if (out.size) break; continue; }
    out.set(m[1].trim().toLowerCase(), m[2].trim());
  }
  return out;
}

const psBody = section(deltaText, 'Published Surface');
if (psBody === null) {
  if (!QUIET) process.stdout.write('SKIP — no `## Published Surface` block; this repo has no surface.\n');
  process.exit(0);
}
const decl = declarations(psBody);

const surfaceStatus = (decl.get('status') ?? 'DISABLED').toUpperCase();
const designStatus = (decl.get('design surface') ?? 'DISABLED').toUpperCase();
const verificationStatus = (decl.get('verification') ?? 'DISABLED').toUpperCase();

if (surfaceStatus !== 'ENABLED') {
  if (!QUIET) process.stdout.write('SKIP — `## Published Surface` is DISABLED; nothing generated.\n');
  process.exit(0);
}

const surfaceRoot = decl.get('surface root') ?? null;  // repo-relative label, declared not derived
const pagesMechanism = (decl.get('pages mechanism') ?? 'none').toLowerCase();
const renderer = (decl.get('renderer') ?? 'none').toLowerCase();
const outputDir = decl.get('output dir') ?? 'docs/verification';
const claimKinds = (decl.get('claim kinds') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const claimsRel = value('--claims', decl.get('claims source') ?? null);
const pdatasetRel = value('--pdatasets', decl.get('pdataset source') ?? null);
const evidenceRels = (decl.get('evidence sources') ?? '')
  .split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);

if (surfaceRoot === null) {
  gap('delta', 'Surface root', 'no `Surface root:` declared; replay commands carry no working directory', DELTA_REL);
  finding('warn', 'undeclared-surface-root', 'delta',
    'the delta declares no `Surface root:`, so the manifest cannot state where a replay command runs', DELTA_REL);
}
if (claimKinds.length === 0) {
  finding('error', 'undeclared-claim-kinds', 'delta',
    '`Claim kinds:` is delta-bound and must be declared; canon does not enumerate kinds (design §3.2)', DELTA_REL);
}

// ---------------------------------------------------------------------------
// Claims (design §3.2, §3.4, §3.5)
// ---------------------------------------------------------------------------

const ID_RE = /^([A-Z][A-Z0-9]*)-([A-Z]+)-(\d{2,})$/;
const CLAIM_LINE_RE = /^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/;
const MARKER_LINE_RE = /^\s*—\s+(.*?)\s*$/;
const AUTHORITY_RE = /^(?:ADR-\d{3,4}|SEAM-\d+|[A-Za-z0-9._/-]+\s+§[0-9]+(?:\.[0-9]+)*)$/;

/**
 * Parse one marker line into a structured record.
 *
 * Grammar (design §3.4): `— <STATE> (PR #<n>[, YYYY-MM-DD])`, isomorphic to the
 * ADR `Status:` line, with no free prose in the parenthetical. The one
 * exception is the reset form of design §3.5 —
 * `— NOT VERIFIED (<reason>, YYYY-MM-DD)` — which the spec introduces for
 * drift and artifact invalidation.
 */
function parseMarker(body) {
  const m = /^([A-Z][A-Z ]*[A-Z])\s*\((.*)\)$/.exec(body);
  if (!m) return { ok: false, raw: body, reason: 'not `<STATE> (<parenthetical>)`' };
  const state = m[1].trim();
  const paren = m[2].trim();
  if (!STATES.includes(state)) return { ok: false, raw: body, reason: `unknown state \`${state}\`` };

  const pr = /^PR #(\d+)(?:,\s*(\d{4}-\d{2}-\d{2}))?$/.exec(paren);
  if (pr) return { ok: true, raw: body, state, pr: Number(pr[1]), date: pr[2] ?? null, reason_text: null };

  // The reset form. Permitted for NOT VERIFIED only: everywhere else, free
  // prose in the parenthetical is exactly what the grammar forbids.
  const reset = /^([a-z][a-z0-9 :._#-]*),\s*(\d{4}-\d{2}-\d{2})$/.exec(paren);
  if (reset && state === 'NOT VERIFIED') {
    return { ok: true, raw: body, state, pr: null, date: reset[2], reason_text: reset[1].trim() };
  }
  return { ok: false, raw: body, state, reason: 'parenthetical must be `PR #<n>[, YYYY-MM-DD]`' };
}

/** Extract the trailing `(authority)` citation, if the trailing parenthetical is one. */
function splitAuthority(text) {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(text);
  if (m && AUTHORITY_RE.test(m[2].trim())) return { text: m[1].trim(), authority: m[2].trim() };
  return { text: text.trim(), authority: null };
}

const claims = [];
const unidentified = [];

if (!claimsRel) {
  finding('error', 'undeclared-claims-source', 'delta',
    'no `Claims source:` declared and no --claims override; no claims can be discovered', DELTA_REL);
} else if (!exists(underRoot(claimsRel))) {
  gap('claims', 'Claims source', `declared claims source is absent on disk: ${claimsRel}`, claimsRel);
  finding('error', 'missing-declared-source', 'claims',
    `declared \`Claims source: ${claimsRel}\` does not exist — never silent, never invented (design §4.2)`, claimsRel);
} else {
  const text = readText(underRoot(claimsRel));
  const srcLines = text.split('\n');
  for (let i = 0; i < srcLines.length; i += 1) {
    const cm = CLAIM_LINE_RE.exec(srcLines[i]);
    if (!cm) continue;
    const indent = cm[1].length;
    const checkbox = cm[2].toLowerCase() === 'x' ? 'x' : ' ';
    let body = cm[3];
    const lineNo = i + 1;

    // Gather continuation lines: wrapped claim text first, then the marker
    // block. A marker line ends the text; any subsequent non-marker
    // continuation ends the claim.
    const markerLines = [];
    let j = i + 1;
    let sawMarker = false;
    for (; j < srcLines.length; j += 1) {
      const nxt = srcLines[j];
      if (nxt.trim() === '') break;
      const nextIndent = nxt.length - nxt.trimStart().length;
      if (nextIndent <= indent && CLAIM_LINE_RE.test(nxt)) break;
      if (/^\s*[-*]\s/.test(nxt) && nextIndent <= indent) break;
      if (/^#{1,6}\s/.test(nxt)) break;
      const mm = MARKER_LINE_RE.exec(nxt);
      if (mm) { sawMarker = true; markerLines.push({ body: mm[1], line: j + 1 }); continue; }
      if (sawMarker) break;           // prose after a marker is not part of the claim
      body += ` ${nxt.trim()}`;       // wrapped claim text
    }
    i = j - 1;

    const idMatch = /^`([^`]+)`\s+(.*)$/.exec(collapse(body));
    if (!idMatch || !ID_RE.test(idMatch[1])) {
      // design §3.2: adoption is incremental. An ID-less criterion is invisible
      // to the projection, and the audit reports how many there are. It must
      // NEVER be silently omitted — "a reader must never mistake 'verified
      // nothing' for 'verified and clean.'"
      unidentified.push({
        path: claimsRel,
        line: lineNo,
        checkbox,
        text: splitAuthority(collapse(body)).text,
        state: 'NOT VERIFIED',
        note: 'no claim ID — counted and reported, never silently dropped (design §3.2)',
      });
      continue;
    }

    const id = idMatch[1];
    const [, scope, kind] = ID_RE.exec(id);
    const { text: claimText, authority } = splitAuthority(idMatch[2]);

    if (claimKinds.length && !claimKinds.includes(kind)) {
      finding('error', 'undeclared-claim-kind', id,
        `kind \`${kind}\` is not in the delta's \`Claim kinds: ${claimKinds.join(', ')}\``, `${claimsRel}:${lineNo}`);
    }
    if (!authority) {
      gap(id, 'authority', 'no cited authority on the claim line', `${claimsRel}:${lineNo}`);
      finding('warn', 'missing-authority', id,
        'no cited ADR or design-doc section (design §3.1)', `${claimsRel}:${lineNo}`);
    }

    // The marker block, in file order. Append-only: current state is the LAST
    // line, history is the lines above it (design §3.5).
    const markers = markerLines.map((ml) => {
      const parsed = parseMarker(ml.body);
      if (!parsed.ok) {
        finding('error', 'malformed-marker', id,
          `marker \`— ${ml.body}\` is malformed: ${parsed.reason} (design §3.4)`, `${claimsRel}:${ml.line}`);
      }
      return {
        line: ml.line,
        raw: `— ${ml.body}`,
        state: parsed.ok ? parsed.state : null,
        pr: parsed.ok ? parsed.pr : null,
        date: parsed.ok ? parsed.date : null,
        reason: parsed.ok ? parsed.reason_text : null,
        well_formed: parsed.ok,
      };
    });
    const wellFormed = markers.filter((m) => m.well_formed);
    const current = wellFormed.length ? wellFormed[wellFormed.length - 1] : null;

    claims.push({
      id,
      scope,
      kind,
      text: claimText,
      text_sha256: sha256(Buffer.from(claimText, 'utf8')),
      authority,
      source: { path: claimsRel, line: lineNo },
      checkbox,
      // Absent marker = NOT VERIFIED. Never assume a state (design §3.4).
      marker_state: current ? current.state : 'NOT VERIFIED',
      marker_state_source: current ? 'marker' : 'absent-marker-default',
      current_marker: current ? current.raw : null,
      history: markers.slice(0, markers.length ? markers.length - 1 : 0).map((m) => m.raw),
      markers,
    });
  }
}

// ---------------------------------------------------------------------------
// Evidence (design §3.1, §6.1, §6.2)
// ---------------------------------------------------------------------------
//
// Evidence binds by CLAIM ID CITED IN THE EVIDENCE ARTIFACT, not by a mapping
// file: a mapping file would rot silently and would be a second source of
// truth about which check proves what. The generator greps for claim IDs
// exactly as a human greps for `ADR-0004`.
//
// The citation block is a run of comment lines:
//
//     EVIDENCE <CLAIM-ID>
//     kind: test
//     determinism: L3
//     produced-by: <actor> (human|agent)
//     produced-at: YYYY-MM-DD
//     replay: <command>            | none
//     replay-expect: pass|fail
//     replay-outcome: pass|fail|unrecorded
//     modified-replay: <command>   | none
//     modified-replay-perturbation: <what was broken on purpose>
//     modified-replay-expect: fail
//     modified-replay-outcome: pass|fail|unrecorded
//
// Comment punctuation (`//`, `#`, `*`, `<!--`, `-->`) is stripped, so the same
// block works in .mjs, .py, .md and .yml.

const EVIDENCE_RE = /EVIDENCE\s+([A-Z][A-Z0-9]*-[A-Z]+-\d{2,})\s*$/;
const TEXT_EXT = new Set(['.mjs', '.js', '.cjs', '.ts', '.py', '.md', '.txt', '.yml', '.yaml', '.json', '.sh', '.r']);

function walk(abs, out = []) {
  let entries;
  try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return out; }
  // Sorted: directory iteration order must not leak into the manifest.
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const child = path.join(abs, e.name);
    if (e.isDirectory()) walk(child, out);
    else if (e.isFile()) out.push(child);
  }
  return out;
}

function stripComment(line) {
  let s = line.trim();
  s = s.replace(/^<!--\s?/, '').replace(/-->\s*$/, '');
  s = s.replace(/^(\/\/+|#+|\*+|--)\s?/, '');
  return s.trim();
}

const evidence = [];

for (const rel of evidenceRels) {
  const abs = underRoot(rel);
  const isFile = exists(abs);
  let dirOk = false;
  try { dirOk = fs.statSync(abs).isDirectory(); } catch { dirOk = false; }
  if (!isFile && !dirOk) {
    gap('evidence', 'Evidence sources', `declared evidence source is absent on disk: ${rel}`, rel);
    finding('error', 'missing-declared-source', 'evidence',
      `declared \`Evidence sources\` entry \`${rel}\` does not exist (design §4.2)`, rel);
    continue;
  }
  const files = isFile ? [abs] : walk(abs);
  for (const file of files) {
    if (!TEXT_EXT.has(path.extname(file).toLowerCase())) continue;
    const relFile = posix(path.relative(ROOT, file));
    const text = readText(file);
    const fileSha = sha256(fs.readFileSync(file));
    const srcLines = text.split('\n');
    for (let i = 0; i < srcLines.length; i += 1) {
      const em = EVIDENCE_RE.exec(stripComment(srcLines[i]));
      if (!em) continue;
      const claimId = em[1];
      const fields = new Map();
      for (let j = i + 1; j < srcLines.length; j += 1) {
        const raw = srcLines[j];
        if (raw.trim() === '') break;
        const s = stripComment(raw);
        if (s === '' || s === '-->') break;
        const kv = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(s);
        if (!kv) break;
        fields.set(kv[1], kv[2].trim());
        i = j;
      }

      const locator = fields.get('locator') ?? relFile;
      const locAbs = underRoot(locator);
      const locOk = exists(locAbs);
      if (!locOk) {
        gap(claimId, 'locator', `evidence locator is absent on disk: ${locator}`, relFile);
        finding('error', 'missing-declared-source', claimId,
          `evidence locator \`${locator}\` does not exist (design §4.2)`, relFile);
      }

      // Determinism is DECLARED, never defaulted (design §14.1, A6-AC-01).
      const rawDet = fields.get('determinism') ?? null;
      let determinism = null;
      if (rawDet === null) {
        gap(claimId, 'determinism', `evidence ${relFile} declares no determinism level`, relFile);
        finding('error', 'undeclared-determinism', claimId,
          `evidence \`${locator}\` declares no determinism level. There is no default: `
          + `L1 would quietly cap the claim and L3 would quietly launder an assertion (design §14.1)`, relFile);
      } else if (!DETERMINISM.includes(rawDet)) {
        finding('error', 'undeclared-determinism', claimId,
          `evidence \`${locator}\` declares determinism \`${rawDet}\`, which is not one of ${DETERMINISM.join(', ')}`,
          relFile);
      } else {
        determinism = rawDet;
      }

      const kind = fields.get('kind') ?? null;
      if (kind !== null && !EVIDENCE_KINDS.includes(kind)) {
        finding('warn', 'unknown-evidence-kind', claimId,
          `evidence kind \`${kind}\` is not one of ${EVIDENCE_KINDS.join(', ')} (design §3.1)`, relFile);
      }

      const rawProducedBy = fields.get('produced-by') ?? null;
      let producedBy = null;
      const pb = rawProducedBy ? /^(.+?)\s*\((human|agent)\)$/.exec(rawProducedBy) : null;
      if (pb) producedBy = { actor: pb[1].trim(), class: pb[2] };
      else {
        gap(claimId, 'produced_by', `evidence ${relFile} declares no \`<actor> (human|agent)\``, relFile);
        finding('warn', 'undeclared-actor-class', claimId,
          `evidence \`${locator}\` does not declare \`produced-by: <actor> (${ACTOR_CLASSES.join('|')})\` (design §3.1)`,
          relFile);
      }

      const mode = (cmdKey, expectKey, outcomeKey, perturbKey, defaultExpect) => {
        const cmd = fields.get(cmdKey) ?? null;
        if (cmd === null || cmd === 'none') return null;
        const expect = fields.get(expectKey) ?? defaultExpect;
        const outcome = fields.get(outcomeKey) ?? 'unrecorded';
        const rec = {
          command: cmd,
          cwd: surfaceRoot,
          expect,
          recorded_outcome: outcome,
          as_expected: outcome === 'unrecorded' ? null : outcome === expect,
        };
        if (perturbKey) rec.perturbation = fields.get(perturbKey) ?? null;
        return rec;
      };

      evidence.push({
        claim_id: claimId,
        kind,
        determinism,
        locator,
        sha256: locOk ? sha256(fs.readFileSync(locAbs)) : null,
        produced_by: producedBy,
        produced_at: fields.get('produced-at') ?? null,
        // design §14.2 — REPLAY re-executes and expects the recorded result.
        replay: mode('replay', 'replay-expect', 'replay-outcome', null, 'pass'),
        // design §14.2 — MODIFIED REPLAY perturbs and EXPECTS FAILURE.
        modified_replay: mode('modified-replay', 'modified-replay-expect', 'modified-replay-outcome',
          'modified-replay-perturbation', 'fail'),
        declared_in: relFile,
        declared_in_sha256: fileSha,
      });
    }
  }
}

evidence.sort((a, b) => {
  const k = `${a.claim_id}\u0000${a.locator}\u0000${a.declared_in}`;
  const l = `${b.claim_id}\u0000${b.locator}\u0000${b.declared_in}`;
  return k < l ? -1 : k > l ? 1 : 0;
});

// ---------------------------------------------------------------------------
// Bind evidence to claims; compute the ceiling and the effective state
// ---------------------------------------------------------------------------

const byId = new Map(claims.map((c) => [c.id, c]));
for (const e of evidence) {
  if (!byId.has(e.claim_id)) {
    finding('warn', 'evidence-for-unknown-claim', e.claim_id,
      `evidence in \`${e.declared_in}\` cites claim \`${e.claim_id}\`, which no claims file declares`, e.declared_in);
  }
}

for (const c of claims) {
  const own = evidence.filter((e) => e.claim_id === c.id);
  c.evidence = own.map((e) => {
    const { claim_id, ...rest } = e;
    void claim_id;
    return rest;
  });

  const levels = own.map((e) => e.determinism).filter(Boolean);
  c.best_determinism = levels.length
    ? levels.reduce((a, b) => (strength(b) > strength(a) ? b : a))
    : null;

  // design §14.4 — MODIFIED REPLAY is REQUIRED for any claim reaching
  // HUMAN VERIFIED on L3/L2 evidence. A replay with no modified replay, or a
  // modified replay that failed to fail, is "unfalsified": verified to run,
  // not verified to matter.
  const executable = own.filter((e) => e.determinism === 'L3' || e.determinism === 'L2');
  const withReplay = executable.filter((e) => e.replay);
  const falsifying = executable.filter((e) => e.modified_replay && e.modified_replay.as_expected === true);
  const failedToFail = executable.filter((e) => e.modified_replay && e.modified_replay.as_expected === false);
  const noModified = withReplay.filter((e) => !e.modified_replay);

  let ceiling;
  let ceilingReason;
  if (own.length === 0) {
    ceiling = 'NOT VERIFIED';
    ceilingReason = 'no evidence cites this claim';
  } else if (executable.length === 0) {
    // design §6.3 — attested only. Nobody can check it; it is testimony.
    ceiling = 'AGENT VERIFIED';
    ceilingReason = 'best evidence is `L1` (attested): an agent\'s say-so is never enough (design §6.3, §5.3 mechanism 4)';
  } else if (falsifying.length > 0) {
    ceiling = 'HUMAN VERIFIED';
    ceilingReason = `${c.best_determinism} evidence with a MODIFIED REPLAY that failed as it should (design §14.4)`;
  } else {
    ceiling = 'AGENT VERIFIED';
    ceilingReason = failedToFail.length
      ? 'MODIFIED REPLAY did not fail: the check passes while the thing it asserts is broken (design §14.3)'
      : 'REPLAY recorded but no MODIFIED REPLAY: verified to run, not verified to matter (design §14.4)';
  }
  c.ceiling = ceiling;
  c.ceiling_reason = ceilingReason;

  c.unfalsified = executable.length > 0 && falsifying.length === 0;
  c.unfalsified_reason = c.unfalsified
    ? (failedToFail.length
      ? 'modified replay failed to fail'
      : (noModified.length ? 'replay recorded, no modified replay' : 'no replay recorded'))
    : null;

  // The effective state. A marker asserting more than the evidence can carry
  // is REFUSED, not honoured: that is the determinism cap of design §5.3
  // mechanism 4, and it is the whole reason an agent cannot self-promote.
  let state = c.marker_state;
  let stateSource = c.marker_state_source;
  if (LADDER.includes(state) && rung(state) > rung(ceiling)) {
    finding('error', 'state-cap-violation', c.id,
      `marker asserts \`${state}\` but the evidence ceiling is \`${ceiling}\` — ${ceilingReason}. `
      + `The asserted state is refused; the claim is presented as \`${ceiling}\`.`,
      `${c.source.path}:${c.source.line}`);
    state = ceiling;
    stateSource = 'capped-by-evidence';
  }
  c.state = state;
  c.state_source = stateSource;

  if (c.unfalsified) {
    finding('warn', 'unfalsified', c.id,
      `reported **unfalsified** — ${c.unfalsified_reason} (design §14.4)`, `${c.source.path}:${c.source.line}`);
  }
  if (own.length === 0) {
    gap(c.id, 'evidence', 'no evidence cites this claim', `${c.source.path}:${c.source.line}`);
    finding('warn', 'no-evidence', c.id, 'no evidence artifact cites this claim ID (design §6.4)',
      `${c.source.path}:${c.source.line}`);
  } else if (executable.length === 0) {
    finding('info', 'l1-only', c.id,
      'only `L1` (attested) evidence: capped at `AGENT VERIFIED` and can never reach `HUMAN VERIFIED` (design §6.3)',
      `${c.source.path}:${c.source.line}`);
  }
}

claims.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

// ---------------------------------------------------------------------------
// Claim-text drift (design §5.4) — computed against a previous manifest
// ---------------------------------------------------------------------------
//
// "`text_sha256` is recorded in the manifest at the moment a marker is
// written. If the claim sentence is edited, its hash changes and the state
// resets to NOT VERIFIED."  The manifest is the record, so drift is derived by
// comparing this run's hashes against a previous run's — not by trusting the
// tree to tell us what changed. The reset is REPORTED and never applied to the
// file: the generator never auto-fixes (A5-AC-01). What it emits instead is
// `proposed_marker`, the exact line a human or the checker may APPEND
// (design §3.5 — a reset appends, it does not erase).

const previousRel = value('--previous', null);
let previousInfo = null;
if (previousRel) {
  const prevAbs = path.resolve(previousRel);
  if (!exists(prevAbs)) die(`--previous ${previousRel} does not exist`);
  let prev;
  try { prev = JSON.parse(readText(prevAbs)); } catch (err) { die(`--previous ${previousRel} is not JSON: ${err.message}`); }
  const prevClaims = new Map((prev?.verification?.claims ?? []).map((c) => [c.id, c]));
  previousInfo = {
    path: posix(previousRel),
    content_sha256: prev?.content_sha256 ?? null,
    claims_compared: 0,
    drifted: [],
  };
  const today = GENERATED_AT.slice(0, 10);
  for (const c of claims) {
    const p = prevClaims.get(c.id);
    if (!p) { c.drift = null; continue; }
    previousInfo.claims_compared += 1;
    if (p.text_sha256 === c.text_sha256) { c.drift = null; continue; }

    // The claim sentence changed. Was the reset already recorded?
    const acknowledged = c.markers.some(
      (m) => m.well_formed && m.state === 'NOT VERIFIED' && m.reason !== null,
    ) && c.marker_state === 'NOT VERIFIED';

    c.drift = {
      previous_text_sha256: p.text_sha256,
      previous_text: p.text,
      previous_state: p.state,
      acknowledged,
      proposed_marker: acknowledged ? null : `— NOT VERIFIED (claim text edited, ${today})`,
    };
    previousInfo.drifted.push(c.id);

    if (acknowledged) {
      finding('info', 'claim-text-drift', c.id,
        'claim text was edited since the previous manifest; the marker block already records the reset (design §3.5)',
        `${c.source.path}:${c.source.line}`);
    } else {
      finding('error', 'claim-text-drift', c.id,
        `claim text was edited since the previous manifest (${p.text_sha256.slice(0, 12)} -> `
        + `${c.text_sha256.slice(0, 12)}) while the marker block still reads \`${c.marker_state}\`. `
        + `Verification binds to the exact wording, so the state resets to \`NOT VERIFIED\` (design §5.4). `
        + `Append: — NOT VERIFIED (claim text edited, ${today})`,
        `${c.source.path}:${c.source.line}`);
      c.state = 'NOT VERIFIED';
      c.state_source = 'drift-reset';
    }
  }
  previousInfo.drifted.sort();
} else {
  for (const c of claims) c.drift = null;
}

// ---------------------------------------------------------------------------
// PDatasets (design §4.1, §4.2)
// ---------------------------------------------------------------------------

const pdatasets = [];
if (pdatasetRel) {
  const abs = underRoot(pdatasetRel);
  if (!exists(abs)) {
    gap('pdatasets', 'PDataset source', `declared PDataset source is absent on disk: ${pdatasetRel}`, pdatasetRel);
    finding('error', 'missing-declared-source', 'pdatasets',
      `declared \`PDataset source: ${pdatasetRel}\` does not exist (design §4.2)`, pdatasetRel);
  } else {
    const text = readText(abs);
    const srcLines = text.split('\n');
    for (let i = 0; i < srcLines.length; i += 1) {
      const h = /^#{2,4}\s+`([^`]+)`\s*(?:[—-]\s*(.*))?$/.exec(srcLines[i]);
      if (!h || !ID_RE.test(h[1])) continue;
      const id = h[1];
      const title = (h[2] ?? '').trim() || null;
      const lineNo = i + 1;
      const fields = new Map();
      for (let j = i + 1; j < srcLines.length; j += 1) {
        if (/^#{1,6}\s/.test(srcLines[j])) break;
        const kv = /^\s*[-*]\s+([a-z][a-z0-9_]*):\s*(.*)$/.exec(srcLines[j]);
        if (kv) fields.set(kv[1], kv[2].trim());
      }

      const dpath = fields.get('path') ?? null;
      const dAbs = dpath ? underRoot(dpath) : null;
      const present = dAbs ? exists(dAbs) : false;

      // design §4.2 — links are DERIVED, never stored, from `Pages mechanism`.
      // A declared path absent on disk is `missing`, a visible gap marker and a
      // non-zero finding. Never silent, never invented.
      let linkResolution;
      if (!dpath) linkResolution = 'missing';
      else if (!present) linkResolution = 'missing';
      else if (PUBLISHED_PAGES.includes(pagesMechanism)) linkResolution = 'published';
      else linkResolution = 'local';

      if (!dpath) {
        gap(id, 'path', 'no `path:` declared', `${pdatasetRel}:${lineNo}`);
        finding('error', 'missing-declared-source', id,
          'PDataset declares no `path:` (design §4.1 — required)', `${pdatasetRel}:${lineNo}`);
      } else if (!present) {
        gap(id, 'path', `declared path absent on disk: ${dpath}`, `${pdatasetRel}:${lineNo}`);
        finding('error', 'missing-declared-source', id,
          `declared path \`${dpath}\` is absent on disk — \`link_resolution: missing\`, never a fabricated link `
          + `(design §4.2)`, `${pdatasetRel}:${lineNo}`);
      }

      let urlBase = null;
      if (linkResolution === 'local') {
        // Repo-relative only. `Pages mechanism: none` is generate-only, so an
        // absolute URL here would be a fabrication (design §4.2, A7-AC-03).
        urlBase = surfaceRoot ? `${surfaceRoot}/${dpath}` : dpath;
      } else if (linkResolution === 'published') {
        urlBase = `${outputDir.replace(/\/+$/, '')}/${dpath}`;
      }

      const transformation = fields.get('transformation') ?? null;
      const isManual = transformation !== null && /^manual\b/.test(transformation);
      const declaredDet = fields.get('determinism') ?? null;
      let det = null;
      let detSource = null;
      if (isManual) {
        // design §4.1, as amended: a `manual` transformation is an `L1`
        // (attested) operation regardless of how deterministic it looks.
        det = 'L1';
        detSource = 'derived: `manual` transformation is `L1` (design §4.1)';
        if (declaredDet && declaredDet !== 'L1') {
          finding('error', 'manual-transformation-determinism', id,
            `transformation is \`manual\` but determinism is declared \`${declaredDet}\`. `
            + `A manual operation is \`L1\` (attested) by design §4.1 no matter how deterministic it looks.`,
            `${pdatasetRel}:${lineNo}`);
        }
      } else if (declaredDet === null) {
        gap(id, 'determinism', 'no determinism level declared for a non-manual transformation',
          `${pdatasetRel}:${lineNo}`);
        finding('error', 'undeclared-determinism', id,
          'no determinism level declared. There is no default (design §14.1)', `${pdatasetRel}:${lineNo}`);
      } else if (!DETERMINISM.includes(declaredDet)) {
        finding('error', 'undeclared-determinism', id,
          `determinism \`${declaredDet}\` is not one of ${DETERMINISM.join(', ')}`, `${pdatasetRel}:${lineNo}`);
      } else {
        det = declaredDet;
        detSource = 'declared';
      }

      const rawDerived = fields.get('derived_from') ?? null;
      if (rawDerived === null) {
        gap(id, 'derived_from', 'provenance not stated; `none` must be written, not omitted',
          `${pdatasetRel}:${lineNo}`);
        finding('error', 'unstated-provenance', id,
          '`derived_from` is required and `none` must be STATED, so a root dataset is distinguishable from one '
          + 'whose provenance was never recorded (design §4.1)', `${pdatasetRel}:${lineNo}`);
      }
      const derivedFrom = rawDerived === null || rawDerived === 'none'
        ? []
        : rawDerived.split(',').map((s) => s.trim()).filter(Boolean);

      let bytes = null;
      let rows = null;
      let fileSha = null;
      if (present) {
        const buf = fs.readFileSync(dAbs);
        bytes = buf.length;
        fileSha = sha256(buf);
        if (path.extname(dpath).toLowerCase() === '.csv') {
          const body = buf.toString('utf8').replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
          rows = Math.max(0, body.length - 1);
        }
      }

      const schema = (fields.get('schema') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        .map((s) => {
          const [name, type] = s.split(':').map((x) => x.trim());
          return { name, type: type ?? null };
        });

      pdatasets.push({
        id,
        title,
        path: dpath,
        sha256: fileSha,
        bytes,
        produced_by: fields.get('produced_by') ?? null,
        derived_from: derivedFrom,
        derived_from_declared: rawDerived,
        transformation,
        transformation_determinism: det,
        transformation_determinism_source: detSource,
        produced_at: fields.get('produced_at') ?? null,
        schema: schema.length ? schema : null,
        rows,
        license: fields.get('license') ?? null,
        view_url: urlBase,
        download_url: urlBase,
        link_resolution: linkResolution,
        source: { path: pdatasetRel, line: lineNo },
      });
    }
  }
}

// Provenance chains, and referential integrity of `derived_from`.
const dsById = new Map(pdatasets.map((d) => [d.id, d]));
for (const d of pdatasets) {
  for (const parent of d.derived_from) {
    if (!dsById.has(parent)) {
      finding('error', 'unknown-provenance', d.id,
        `\`derived_from: ${parent}\` names a PDataset that is not declared`, `${d.source.path}:${d.source.line}`);
    }
  }
  const chain = [];
  const seen = new Set();
  let cursor = d;
  while (cursor) {
    if (seen.has(cursor.id)) {
      finding('error', 'provenance-cycle', d.id, `provenance chain revisits \`${cursor.id}\``,
        `${d.source.path}:${d.source.line}`);
      break;
    }
    seen.add(cursor.id);
    chain.unshift(cursor.id);
    cursor = cursor.derived_from.length === 1 ? dsById.get(cursor.derived_from[0]) : null;
  }
  d.provenance_chain = chain;
  d.provenance_root = d.derived_from.length === 0;
}
pdatasets.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

// ---------------------------------------------------------------------------
// Coverage — the three questions nothing can answer today (design §6.4)
// ---------------------------------------------------------------------------

const ids = (pred) => claims.filter(pred).map((c) => c.id).sort();
const tally = (keys, pick) => {
  const out = {};
  for (const k of keys) out[k] = 0;
  for (const c of claims) {
    const k = pick(c);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
};

const coverage = {
  claims_total: claims.length,
  claims_with_no_evidence: ids((c) => c.evidence.length === 0),
  claims_l1_only: ids((c) => c.evidence.length > 0 && c.best_determinism === 'L1'),
  agent_verified_not_human_verified: ids((c) => c.state === 'AGENT VERIFIED'),
  unfalsified: ids((c) => c.unfalsified),
  drifted: ids((c) => c.drift !== null),
  capped_by_evidence: ids((c) => c.state_source === 'capped-by-evidence'),
  by_state: tally(STATES, (c) => c.state),
  by_marker_state: tally(STATES, (c) => c.marker_state),
  by_best_determinism: tally([...DETERMINISM, 'none'], (c) => c.best_determinism ?? 'none'),
  unidentified_claim_lines: unidentified.length,
  evidence_records: evidence.length,
  pdatasets_total: pdatasets.length,
  pdatasets_missing: pdatasets.filter((d) => d.link_resolution === 'missing').map((d) => d.id).sort(),
};

// ---------------------------------------------------------------------------
// Assemble, hash, write
// ---------------------------------------------------------------------------

const SEV_RANK = { error: 0, warn: 1, info: 2 };
findings.sort((a, b) => {
  const k = `${SEV_RANK[a.severity]}\u0000${a.code}\u0000${a.subject}\u0000${a.message}`;
  const l = `${SEV_RANK[b.severity]}\u0000${b.code}\u0000${b.subject}\u0000${b.message}`;
  return k < l ? -1 : k > l ? 1 : 0;
});
gaps.sort((a, b) => {
  const k = `${a.subject}\u0000${a.field}\u0000${a.message}`;
  const l = `${b.subject}\u0000${b.field}\u0000${b.message}`;
  return k < l ? -1 : k > l ? 1 : 0;
});

const counts = { error: 0, warn: 0, info: 0 };
for (const f of findings) counts[f.severity] += 1;

const verificationProjection = {
  status: verificationStatus,
  claim_kinds: claimKinds,
  claims_source: claimsRel,
  pdataset_source: pdatasetRel,
  evidence_sources: evidenceRels,
  claims,
  unidentified_claims: unidentified,
  pdatasets,
  coverage,
};

// design §5.5 — the identities a verification rests on. `commit_sha` is
// supplied by the caller (this engine does not shell out to git, so it can run
// from a `git archive` with no repository anywhere above it, A3-AC-03).
const bound = {
  commit_sha: value('--commit', null),
  claims_source_sha256: claimsRel && exists(underRoot(claimsRel))
    ? sha256(fs.readFileSync(underRoot(claimsRel))) : null,
  pdataset_source_sha256: pdatasetRel && exists(underRoot(pdatasetRel))
    ? sha256(fs.readFileSync(underRoot(pdatasetRel))) : null,
  delta_sha256: sha256(fs.readFileSync(deltaAbs)),
};

const manifest = {
  schema: 'surface-manifest/v1',
  generator: 'plugin/scripts/surface.mjs',
  governance_version: readGovernanceVersion(),
  generated_at: GENERATED_AT,
  content_sha256: null,
  root: surfaceRoot,
  delta: {
    path: DELTA_REL,
    surface_status: surfaceStatus,
    renderer: renderer,
    pages_mechanism: pagesMechanism,
    output_dir: outputDir,
  },
  bound,
  projections: {
    design: { status: designStatus, sha256: null },
    verification: { status: verificationStatus, sha256: null },
  },
  verification: verificationStatus === 'ENABLED' ? verificationProjection : null,
  previous: previousInfo,
  gaps,
  findings,
  findings_by_severity: counts,
};

manifest.projections.verification.sha256 = manifest.verification
  ? sha256(Buffer.from(stable(manifest.verification), 'utf8')) : null;

// `content_sha256` covers everything the generator derived from the inputs —
// deliberately excluding `generated_at`, the single permitted difference
// between two runs. Two runs over unchanged inputs must agree on this hash.
manifest.content_sha256 = sha256(Buffer.from(stable({
  ...manifest, generated_at: null, content_sha256: null,
}), 'utf8'));

/** Canonical JSON: keys sorted, so a hash depends on content and never on key order. */
function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
}

/** The pinned governance version, read from a VERSION file at or above the root. */
function readGovernanceVersion() {
  let dir = ROOT;
  for (let i = 0; i < 8; i += 1) {
    const f = path.join(dir, 'VERSION');
    if (exists(f)) return readText(f).trim();
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

// Guardrail, checked rather than trusted: under `Pages mechanism: none` the
// output is repo-relative and nothing may look like a published URL
// (design §4.2, A7-AC-03 — "a fabricated URL is the failure this criterion
// exists to catch").
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
if (!PUBLISHED_PAGES.includes(pagesMechanism)) {
  const urls = [...pdatasets.map((d) => d.view_url), ...pdatasets.map((d) => d.download_url)]
    .filter((u) => typeof u === 'string' && /^[a-z][a-z0-9+.-]*:\/\//i.test(u));
  if (urls.length) {
    process.stderr.write(`surface.mjs: refusing to emit absolute URLs under \`Pages mechanism: ${pagesMechanism}\`: `
      + `${urls.join(', ')}\n`);
    process.exit(2);
  }
}

const outPath = value('--out', null)
  ?? path.join(ROOT, outputDir.replace(/\/+$/, ''), 'surface-manifest.json');
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(path.resolve(outPath), serialized);

if (PRINT) process.stdout.write(serialized);

if (!QUIET) {
  const line = (s) => process.stdout.write(`${s}\n`);
  line(`surface: ${posix(path.relative(process.cwd(), path.resolve(outPath)))}`);
  line(`  claims ${claims.length}  evidence ${evidence.length}  pdatasets ${pdatasets.length}`
    + `  un-ID'd claim lines ${unidentified.length}`);
  for (const c of claims) {
    const det = c.best_determinism ?? '--';
    line(`  ${c.id.padEnd(10)} ${c.state.padEnd(20)} ${det}  ${c.unfalsified ? 'unfalsified' : ''}`);
  }
  for (const u of unidentified) line(`  (un-ID'd)  ${u.path}:${u.line}  "${u.text}"`);
  line(`  gaps ${gaps.length}  findings: ${counts.error} error, ${counts.warn} warn, ${counts.info} info`);
}

process.exit(counts.error > 0 ? 1 : 0);
