#!/usr/bin/env node
// surface-html.mjs — the verification projection, rendered for a human.
//
// Input : a `surface-manifest/v1` document emitted by `surface.mjs`.
// Output: one self-contained static HTML page.
//
// `Renderer: none` (design §7.3). ZERO dependencies, plain Node, no network at
// build time and none at view time: no CDN, no webfont, no script, no image
// fetch. Everything the page needs is inline, and everything the page points
// at is a repo-relative path that resolves from disk.
//
// The execution boundary is explicit and it is the point (design §7.3 as
// amended 2026-09-23, reconciliation §4 C-2). An interactive console that
// executes code *in the page* stays deferred. What this generator emits is the
// exact REPLAY and MODIFIED REPLAY commands with their inputs, expected
// results and working directory, for the human to run in their own shell.
// The page renders commands. It does not run them, it never animates a result,
// and it never displays an outcome it did not read out of the manifest.
//
// Usage:
//   node plugin/scripts/surface-html.mjs
//   node plugin/scripts/surface-html.mjs --manifest <path> --out <path>
//   node plugin/scripts/surface-html.mjs --repo-root <dir>
//   node plugin/scripts/surface-html.mjs --quiet
//
// Exit codes:
//   0  page written; every emitted link resolved on disk
//   1  page written; at least one declared path is absent (rendered as a
//      visible gap marker, never silently dropped — design §4.2)
//   2  the generator could not run (bad flag, unreadable manifest), or the
//      absolute-URL guardrail tripped
//
// Determinism: this generator is `L3` (design §14.1). It reads no clock and no
// environment. Two runs over an unchanged manifest and an unchanged tree
// produce byte-identical HTML; `generated_at` on the page is the manifest's
// own field, not this run's wall time.

import fs from 'node:fs';
import path from 'node:path';

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
  process.stderr.write(`surface-html.mjs: ${message}\n`);
  process.exit(2);
}

const REPO_ROOT = path.resolve(value('--repo-root', '.'));
const MANIFEST_REL = value(
  '--manifest',
  'plugin/scripts/fixtures/slice/docs/verification/surface-manifest.json',
);
const OUT_REL = value('--out', 'docs/verification/index.html');
const QUIET = flag('--quiet');

const MANIFEST_ABS = path.resolve(REPO_ROOT, MANIFEST_REL);
const OUT_ABS = path.resolve(REPO_ROOT, OUT_REL);

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_ABS, 'utf8'));
} catch (err) {
  die(`cannot read manifest ${MANIFEST_REL}: ${err.message}`);
}
if (manifest.schema !== 'surface-manifest/v1') {
  die(`unexpected manifest schema \`${manifest.schema}\` (expected \`surface-manifest/v1\`)`);
}

// ---------------------------------------------------------------------------
// Canon's vocabulary. Not a local invention — design §5.1, §14.1.
// ---------------------------------------------------------------------------

const STATES = [
  ['NOT VERIFIED', 'default; no marker present', '—', 'notverified'],
  ['AGENT VERIFIED', 'an agent produced evidence satisfying the claim', 'Verifier agent', 'agent'],
  ['HUMAN REVIEWED', 'a human read the claim and its evidence and found it coherent', 'human', 'reviewed'],
  ['HUMAN VERIFIED', 'a human observed or replayed the evidence and affirms the claim', 'human', 'human'],
  ['VERIFICATION FAILED', 'evidence was produced and the claim is false', 'Verifier agent or human', 'failed'],
  ['NEEDS REWORK', 'evidence is insufficient or the claim is ill-formed; not a falsification', 'Verifier agent or human', 'rework'],
];
const STATE_CLASS = Object.fromEntries(STATES.map(([s, , , c]) => [s, c]));

const DETERMINISM = {
  L3: {
    name: 'Deterministic',
    definition: 'Same inputs produce byte-identical outputs.',
    verified_by: 'Re-execute; compare `sha256`.',
    ceiling: 'May reach HUMAN VERIFIED — but only with a MODIFIED REPLAY that failed as it should (design §14.4).',
  },
  L2: {
    name: 'Executable, non-deterministic',
    definition: 'Runs to a pass/fail, but the output is not byte-stable (timestamps, network, cloud state, LLM sampling).',
    verified_by: 'Re-execute; compare assertions, not bytes.',
    ceiling: 'May reach HUMAN VERIFIED — but only with a MODIFIED REPLAY that failed as it should (design §14.4).',
  },
  L1: {
    name: 'Attested',
    definition: 'A human or an agent states it. There is nothing to re-execute. It is testimony.',
    verified_by: 'Nothing. It cannot be re-executed.',
    ceiling: 'CANNOT reach HUMAN VERIFIED. A claim whose best evidence is L1 is capped at AGENT VERIFIED, no matter how confident the wording (design §6.3, §14.4).',
  },
};

// ---------------------------------------------------------------------------
// Escaping and small formatters
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const code = (s) => `<code>${esc(s)}</code>`;
const mono = (s) => `<span class="mono">${esc(s)}</span>`;
// Renders a value that may legitimately be absent. Absence is shown, never
// swallowed: a field the manifest left null is a fact about the manifest.
const orNull = (v, label = 'null') =>
  v === null || v === undefined || v === '' ? `<span class="null">${esc(label)}</span>` : esc(v);

// Finding messages and ceiling reasons are authored upstream as Markdown
// fragments. Escaping them and stopping there leaks literal `**` and backticks
// into the one panel a reader scans first. This escapes FIRST and then converts
// only the two inline forms the engine actually emits. It is a two-form
// converter, not a Markdown parser: nothing else is interpreted, so no manifest
// string can become markup.
const mdInline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

// A list of ids rendered as a count plus its members. `[]` is a result, not an
// absence: it is the check passing, and it must not read as "not performed".
const idList = (a) => !Array.isArray(a)
  ? orNull(a)
  : a.length === 0
    ? '<code>0</code>'
    : `<code>${a.length}</code> ${a.map((v) => `<code>${esc(typeof v === 'string' ? v : JSON.stringify(v))}</code>`).join(' ')}`;

// ---------------------------------------------------------------------------
// Links. Derived, never stored (design §4.2).
//
// `Pages mechanism: none` in this delta, so `link_resolution` is `local`:
// repo-relative paths only, resolving from wherever the page sits on disk.
// An absolute URL here would be fabricated, and fabricating one violates the
// guardrail this design inherits from the Design Surface spec. The guardrail
// at the bottom of this file enforces that mechanically rather than trusting
// the author of the template.
// ---------------------------------------------------------------------------

const posix = (p) => p.split(path.sep).join('/');
const SURFACE_ROOT = (manifest.root ?? '').replace(/\/+$/, '');
// From the output directory back to the repository root, e.g. `../..`.
const TO_ROOT = posix(path.relative(path.dirname(OUT_ABS), REPO_ROOT)) || '.';

const joinPosix = (...parts) => parts.filter((p) => p && p !== '.').join('/').replace(/\/{2,}/g, '/');

/** A locator relative to the surface root -> a path relative to the repo root. */
const fromSurfaceRoot = (p) => joinPosix(SURFACE_ROOT, String(p ?? '').replace(/^\.\//, ''));

const linkLedger = [];
/**
 * Build an href for a repo-relative path, recording whether it resolves.
 * Missing paths are rendered as a visible gap marker (design §4.2) and set the
 * exit code — never silent, never invented.
 */
function link(repoRelPath, { label = null, download = false, hash = null } = {}) {
  const rel = String(repoRelPath).replace(/^\/+/, '');
  const exists = fs.existsSync(path.resolve(REPO_ROOT, rel));
  const href = encodeURI(joinPosix(TO_ROOT, rel)) + (hash ? `#${encodeURIComponent(hash)}` : '');
  linkLedger.push({ rel, href, exists });
  const text = esc(label ?? rel);
  if (!exists) {
    return `<span class="gap" title="declared path absent on disk">${text} <span class="gap-tag">MISSING ON DISK</span></span>`;
  }
  const dl = download ? ' download' : '';
  return `<a class="path" href="${href}"${dl}>${text}</a>`;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function stateBadge(state) {
  const cls = STATE_CLASS[state] ?? 'notverified';
  return `<span class="state state-${cls}">${esc(state)}</span>`;
}

function detBadge(level) {
  if (!level || !DETERMINISM[level]) {
    return `<span class="det det-none" title="undeclared level is a gap marker, not an assumption (design §14.1)">${esc(level ?? 'undeclared')}</span>`;
  }
  return `<span class="det det-${level}">${esc(level)}</span>`;
}

/**
 * A command block. This is the whole execution path under `Renderer: none`:
 * the exact string, its working directory, the full `replay-record/v1` the
 * runner produced when it executed the command, and — separately, never merged
 * into it — what the artifact itself attests. The page does not run anything.
 */
function commandBlock(title, spec, { kindClass = '' } = {}) {
  if (!spec) return '';
  const outcomeClass = spec.as_expected === false ? 'outcome-bad'
    : spec.as_expected === true ? 'outcome-ok' : 'outcome-none';
  const x = spec.execution ?? {};
  const R = manifest.replay ?? {};
  const runner = R.runner ?? null;
  const executed = x.executed === true;
  const attested = spec.attested_outcome ?? null;
  const recorded = spec.recorded_outcome ?? null;
  const disagrees = attested !== null && recorded !== null && attested !== recorded;

  // WHO OBSERVED THIS, AND WHEN. Not "its producer": the producer wrote the
  // artifact and the `// replay-outcome:` comment in it. The outcome below was
  // obtained by the engine's runner, which executed this exact command while
  // this manifest was being generated. Attributing an observed result to the
  // actor whose work it examines is the laundering that `attested_outcome` vs
  // `recorded_outcome` exists to prevent, and restating it here would undo the
  // whole mechanism at the last step (design §14.2).
  const provenance = executed
    ? `<span class="hint">observed by <code>${esc(runner ?? 'the manifest generator')}</code>, which executed this command when the manifest was generated (<code>${esc(manifest.generated_at)}</code>). Not by this page, and not by the artifact's producer.</span>`
    : `<span class="hint"><strong>NOT OBSERVED.</strong> ${mdInline(x.unexecuted_reason ?? 'no execution record is present')} &mdash; nobody ran this command. Any value beside it is the artifact's own claim about itself, not a result.</span>`;

  // An attested outcome that disagrees with the observed one is the single most
  // important fact this block can carry: it is a claim the machine contradicted.
  const mismatch = disagrees
    ? `<p class="cmd-mismatch"><strong>ATTESTED &ne; OBSERVED.</strong> The artifact attests <code>${esc(attested)}</code>.
        Running it produced <code>${esc(recorded)}</code>. <strong>The observed value governs</strong> &mdash; a verdict must
        not be a function of a comment (design §14.2). Everything this page says about this command is derived from
        <code>${esc(recorded)}</code>, and the disagreement itself is evidence about the artifact.</p>`
    : '';

  const execRows = executed
    ? `
        <tr><th><code>exit_status</code></th><td><code>${esc(x.exit_status)}</code>${x.signal ? ` <span class="hint">signal <code>${esc(x.signal)}</code></span>` : ''}${x.timed_out ? ' <span class="outcome-bad">TIMED OUT</span>' : ''} <span class="hint">the mechanical basis of the outcome above</span></td></tr>
        <tr><th><code>stdout_first_line</code></th><td><pre class="shell inline out">${esc(x.stdout_first_line ?? '(no output)')}</pre><span class="hint">run the command yourself and compare this line against your own terminal</span></td></tr>
        <tr><th><code>stdout_sha256</code></th><td><code class="hash">${esc(x.stdout_sha256)}</code> <span class="hint">over ${esc(x.stdout_bytes)} bytes of captured output</span></td></tr>
        <tr><th><code>execution_id</code></th><td><code class="hash">${esc(x.execution_id)}</code> <span class="hint">identifies this one execution inside the <code>${esc(R.schema ?? 'replay-record/v1')}</code> record</span></td></tr>`
    : `
        <tr><th><code>execution.executed</code></th><td><code>false</code> <span class="hint">${mdInline(x.unexecuted_reason ?? 'no execution record is present')}. There is no exit status, no output and no <code>execution_id</code>, because nothing ran.</span></td></tr>`;

  return `
    <div class="cmd ${kindClass}">
      <div class="cmd-head"><span class="cmd-title">${esc(title)}</span>${
    spec.perturbation ? `<span class="cmd-perturb">perturbation: ${esc(spec.perturbation)}</span>` : ''
  }</div>
      <div class="cmd-cwd">run from working directory ${code(spec.cwd ?? '(not recorded)')}${
    spec.cwd ? ` &nbsp;&rarr;&nbsp; ${link(fromSurfaceRoot('').replace(/\/$/, '') || '.', { label: SURFACE_ROOT })}` : ''
  }</div>
      <pre class="shell"><span class="prompt">$ </span>${esc(spec.command)}</pre>
      ${mismatch}
      <table class="kv kv-tight">
        <tr><th>expected result</th><td>${code(spec.expect ?? 'not recorded')} <span class="hint">what this command must do for the evidence to hold</span></td></tr>
        <tr><th><code>attested_outcome</code> <span class="hint">what the artifact says</span></th><td>${code(attested ?? 'not attested')} <span class="hint">read out of the artifact's own <code>// replay-outcome:</code> header &mdash; testimony, never a result</span></td></tr>
        <tr><th><code>recorded_outcome</code> <span class="hint">what running it produced</span></th><td><span class="${outcomeClass}">${code(recorded ?? 'not recorded')}</span> ${provenance}</td></tr>
        <tr><th><code>outcome_source</code></th><td>${code(spec.outcome_source ?? 'not recorded')} <span class="hint">${spec.outcome_source === 'executed' ? 'the outcome above was observed, not copied from the artifact' : 'the outcome above was not observed by a runner'}</span></td></tr>
        <tr><th>as expected</th><td><span class="${outcomeClass}">${esc(String(spec.as_expected))}</span> <span class="hint">${spec.as_expected === null || spec.as_expected === undefined ? 'unknown: nothing was observed, so nothing can be compared against the expectation' : 'compares the observed outcome against the expectation above'}</span></td></tr>${execRows}
      </table>
    </div>`;
}

/**
 * What a test establishes, and what it does NOT.
 *
 * Every sentence below is derived from fields that are present in the
 * manifest — determinism level, replay/modified-replay expectations and
 * recorded outcomes, and the producing actor's class. Nothing here is a
 * judgement about the code; the judgement is the reader's, which is the whole
 * reason the page refuses to let a green result stand in for one.
 */
function scopeOfTest(claim, ev) {
  const yes = [];
  const no = [];
  // Items that must lead the `does NOT establish` column whatever else is
  // added after them: a replay that failed or never ran outranks every other
  // caveat on the record.
  const noLead = [];
  const actor = ev.produced_by ? `${ev.produced_by.actor} (${ev.produced_by.class})` : 'unrecorded';

  if (!ev.replay) {
    yes.push(`<strong>Nothing executable.</strong> This evidence record is <code>${esc(ev.determinism)}</code> and carries <code>replay: null</code>. There is no command, so there is nothing for you to re-run and nothing to compare. It is testimony by <code>${esc(actor)}</code> (design §14.1).`);
    no.push(`<strong>That the claim is true.</strong> An assertion is not a check. Nobody &mdash; including you &mdash; can falsify it from this page.`);
    no.push(`<strong>That the claim could ever reach <code>HUMAN VERIFIED</code> on this evidence.</strong> A claim whose best evidence is <code>L1</code> is capped at <code>AGENT VERIFIED</code> (design §6.3, §14.4). Reaching a higher state requires new, executable evidence &mdash; not a more confident sentence.`);
    if (ev.produced_by?.class === 'agent') {
      no.push(`<strong>Independence.</strong> The attesting actor's class is <code>agent</code>. An agent's assertion about its own work is <code>L1</code> by definition (design §5.3, mechanism 4).`);
    }
    return { yes, no };
  }

  // The expectation is not the result. Whether a command reproduces is a fact
  // about what happened when it was run, so this sentence is derived from
  // `as_expected` and `recorded_outcome` and never from `expect` alone. A
  // failing replay and an unexecuted one each establish nothing, and saying so
  // belongs in the `does NOT establish` column, not this one (design §14.2).
  const rCmd = `<code>${esc(ev.replay.command)}</code>`;
  const rCwd = `<code>${esc(ev.replay.cwd)}</code>`;
  const rRunner = manifest.replay?.runner ?? 'the manifest generator';
  const rWhy = ev.replay.execution?.unexecuted_reason
    ? ` (${mdInline(ev.replay.execution.unexecuted_reason)})`
    : '';
  if (ev.replay.as_expected === true) {
    yes.push(`<strong>REPLAY.</strong> ${rCmd} was executed from ${rCwd} by <code>${esc(rRunner)}</code> when this manifest was generated, and it <code>${esc(ev.replay.recorded_outcome)}</code>ed &mdash; which is what was expected (<code>${esc(ev.replay.expect)}</code>). It reproduces: the recorded artifact can be regenerated rather than merely described (design §14.2).`);
  } else if (ev.replay.as_expected === false) {
    noLead.push(`<strong>That the artifact reproduces.</strong> REPLAY ${rCmd} was expected to <code>${esc(ev.replay.expect)}</code> and, when it was run, it <code>${esc(ev.replay.recorded_outcome ?? 'produced no recorded outcome')}</code>ed instead. <em>The replay did not reproduce.</em> Nothing downstream of this command can be relied on until that is explained &mdash; a failing replay is a result to investigate, not evidence to stand on (design §14.2).`);
  } else {
    noLead.push(`<strong>That the artifact reproduces.</strong> REPLAY ${rCmd} was <strong>never executed</strong>${rWhy}. Its outcome is <code>${esc(ev.replay.recorded_outcome ?? 'not recorded')}</code> and nothing about it has been observed by anyone. The command is printed so that you can be the first to run it; until somebody does, reproduction is an open question, not a property (design §14.2).`);
  }
  if (ev.determinism === 'L3') {
    yes.push(`<strong>Byte-stability.</strong> The level is <code>L3</code>: same inputs, byte-identical outputs. A hash comparison over the result is therefore meaningful (design §14.1).`);
  } else if (ev.determinism === 'L2') {
    yes.push(`<strong>Assertion-stability only.</strong> The level is <code>L2</code>: it runs to a pass/fail but the output is not byte-stable, so compare assertions, not bytes (design §14.1).`);
  }

  if (ev.modified_replay && ev.modified_replay.as_expected === true) {
    yes.push(`<strong>MODIFIED REPLAY.</strong> With the deliberate perturbation &ldquo;${esc(ev.modified_replay.perturbation)}&rdquo; the check is expected to <code>${esc(ev.modified_replay.expect)}</code>, and the manifest records that it did. The check is <em>not vacuous</em> with respect to that one perturbation (design §14.2, §14.3).`);
  }

  if (ev.modified_replay && ev.modified_replay.as_expected === false) {
    no.unshift(`<strong>Nothing about the claim &mdash; the check may be vacuous.</strong> MODIFIED REPLAY ran <code>${esc(ev.modified_replay.command)}</code>, which perturbs the code by &ldquo;${esc(ev.modified_replay.perturbation)}&rdquo;. It was expected to <code>${esc(ev.modified_replay.expect)}</code> and the manifest records that it <code>${esc(ev.modified_replay.recorded_outcome)}</code>ed. <em>The modified replay failed to fail.</em> The check passes while the behaviour it asserts is broken, so a passing REPLAY above tells you the script runs &mdash; and nothing more (design §14.3, §14.4).`);
  } else if (!ev.modified_replay) {
    no.unshift(`<strong>That the check would notice if the claim were false.</strong> No MODIFIED REPLAY is recorded for this evidence, so nothing here demonstrates the check is non-vacuous. MODIFIED REPLAY is <em>required</em> for <code>HUMAN VERIFIED</code> on <code>L3</code>/<code>L2</code> evidence (design §14.4).`);
  } else if (ev.modified_replay.as_expected !== true) {
    // `as_expected` is neither true nor false: a MODIFIED REPLAY is recorded
    // but its outcome was never observed. Saying nothing here would be the
    // worst option available, because silence in this column reads as "fine"
    // (design §14.3, §14.4).
    no.unshift(`<strong>Whether the check is vacuous &mdash; <em>unknown</em>.</strong> A MODIFIED REPLAY is recorded (<code>${esc(ev.modified_replay.command)}</code>, perturbing the code by &ldquo;${esc(ev.modified_replay.perturbation ?? 'unrecorded perturbation')}&rdquo;) but it was <strong>never executed</strong>${ev.modified_replay.execution?.unexecuted_reason ? ` (${mdInline(ev.modified_replay.execution.unexecuted_reason)})` : ''}, so its outcome was not observed. Nothing here shows the check would notice if the claim were false. Unknown is not the same as fine, and it is not the same as non-vacuous (design §14.3, §14.4).`);
  }

  no.push(`<strong>That the claim is true.</strong> A deterministic script can be consistently wrong. REPLAY proves the script reproduces; it does not prove the script asserts the right thing, and a green result is not proof of correctness.`);
  if (ev.modified_replay && (ev.modified_replay.as_expected === true || ev.modified_replay.as_expected === false)) {
    // Only meaningful once a perturbation was actually observed. Asserting it
    // over an unexecuted MODIFIED REPLAY would presuppose the very observation
    // that did not happen.
    no.push(`<strong>That the check catches anything beyond the one perturbation recorded here.</strong> MODIFIED REPLAY falsifies a check against a single, chosen way of breaking it. Other defects may pass unnoticed.`);
  }
  no.push(`<strong>That the claim's wording is the requirement anyone cares about.</strong> A check binds to the sentence above, verbatim and by <code>text_sha256</code>. Whether that sentence is the right sentence is a human judgement, and it is exactly why re-running something can never by itself produce <code>HUMAN VERIFIED</code>.`);
  if (ev.produced_by?.class === 'agent') {
    no.push(`<strong>Independence.</strong> <code>produced_by</code> is <code>${esc(actor)}</code>. INDEPENDENT VERIFICATION requires a distinct actor, in a distinct session, with no access to the builder's reasoning (design §14.2). That has not happened for this record.`);
  } else if (ev.produced_by?.class === 'human') {
    yes.push(`<strong>Actor class.</strong> <code>produced_by</code> is <code>${esc(actor)}</code> &mdash; this check was authored by a human, not by the agent whose work it examines.`);
  }
  return { yes, no: [...noLead, ...no] };
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const V = manifest.verification ?? {};
const claims = V.claims ?? [];
const pdatasets = V.pdatasets ?? [];
const unidentified = V.unidentified_claims ?? [];
const coverage = V.coverage ?? {};
const findings = manifest.findings ?? [];

const CLAIMS_SOURCE_REL = fromSurfaceRoot(V.claims_source ?? 'llm/claims.md');
const PDATASET_SOURCE_REL = fromSurfaceRoot(V.pdataset_source ?? 'llm/pdatasets.md');
const DELTA_REL = fromSurfaceRoot(manifest.delta?.path ?? 'llm/governance/governance-delta.md');
const MANIFEST_REPO_REL = posix(path.relative(REPO_ROOT, MANIFEST_ABS));
const DESIGN_SPEC = 'llm/specs/2026-09-18-human-verification-capability-design.md';
const RECONCILIATION_SPEC = 'llm/specs/2026-09-23-human-verification-slice-reconciliation.md';

function renderProvenance() {
  return `
  <section id="provenance" class="panel panel-quiet">
    <h2>What this page is, and what it is not</h2>
    <p class="lede">This is a <strong>generated view in the data plane</strong> (<code>docs/</code>). It is not a source of truth.
      It projects control-plane documents, and per <code>CLAUDE.md</code> &sect;&nbsp;the two-plane rule &mdash; <em>&ldquo;any view placed
      there must name the <code>llm/</code> document it projects&rdquo;</em> &mdash; here they are, by name and by link:</p>
    <table class="kv">
      <tr><th>claims &amp; verification markers (authoritative)</th><td>${link(CLAIMS_SOURCE_REL)}</td></tr>
      <tr><th>PDataset declarations (authoritative)</th><td>${link(PDATASET_SOURCE_REL)}</td></tr>
      <tr><th>governance delta &mdash; the <code>## Published Surface</code> block that declares all of this</th><td>${link(DELTA_REL)}</td></tr>
      <tr><th>design authority</th><td>${link(DESIGN_SPEC)}</td></tr>
      <tr><th>slice reconciliation (amendments A-1, A-2, A-4)</th><td>${link(RECONCILIATION_SPEC)}</td></tr>
      <tr><th>the manifest this page renders</th><td>${link(MANIFEST_REPO_REL)} &nbsp;<span class="hint">read it directly &mdash; every value below came from it</span></td></tr>
      <tr><th>manifest generator</th><td>${link(manifest.generator ?? 'plugin/scripts/surface.mjs')}</td></tr>
      <tr><th>page generator</th><td>${link('plugin/scripts/surface-html.mjs')}</td></tr>
    </table>
    <p class="fine">If this page and those documents ever disagree, <strong>those documents are right and this page is stale.</strong>
      Regenerate rather than edit: this file is written by a generator and hand-edits are lost.</p>
  </section>`;
}

function renderBoundary() {
  return `
  <section id="boundary" class="panel panel-boundary">
    <h2>The execution boundary</h2>
    <p class="big">
      <strong>This page renders commands. It does not run them.</strong>
    </p>
    <ul class="boundary-list">
      <li>Nothing on this page executes. There is no script on this page at all &mdash; no JavaScript, no network request at view time, no embedded runtime.</li>
      <li>Every <code>expect</code> and <code>outcome</code> shown below was <em>read out of the manifest</em>. <strong>No result on this page was obtained by this page.</strong>
        The manifest distinguishes two of them and so does every command block below: <code>attested_outcome</code> is what the artifact's own comment claims, and
        <code>recorded_outcome</code> is what happened when <code>${esc(manifest.replay?.runner ?? 'the manifest generator')}</code> actually executed the command while the manifest was being generated
        (<code>${esc(manifest.generated_at)}</code>, <code>${esc(manifest.replay?.commands_executed ?? 0)}</code> commands executed).
        An asserted outcome and an observed one are never shown as the same thing &mdash; that conflation is the defect this record exists to prevent (design §14.2).</li>
      <li>There is no spinner, no simulated output and no <code>PASS</code> this page produced. A page that animated a result would be worse than one that runs nothing (design §7.3, as amended 2026-09-23).</li>
      <li><strong>To verify anything here, you run the command yourself</strong>, in your own shell, from the working directory the command block names. That is the required execution path under <code>Renderer: none</code>; an interactive in-page console remains deferred, deliberately.</li>
    </ul>
    <p class="fine">Recompute the manifest itself the same way &mdash; from the repository root, per <code>surface.mjs</code>'s usage header:</p>
    <pre class="shell"><span class="prompt">$ </span>node plugin/scripts/surface.mjs --root ${esc(SURFACE_ROOT)} --generated-at ${esc(manifest.generated_at)} --print</pre>
    <p class="fine">and regenerate this page from it:</p>
    <pre class="shell"><span class="prompt">$ </span>node plugin/scripts/surface-html.mjs --manifest ${esc(MANIFEST_REPO_REL)} --out ${esc(posix(path.relative(REPO_ROOT, OUT_ABS)))}</pre>
  </section>`;
}

function renderSummary() {
  const byState = coverage.by_state ?? {};
  const byDet = coverage.by_best_determinism ?? {};
  const sev = manifest.findings_by_severity ?? {};
  const list = (arr) => (arr && arr.length)
    ? arr.map((id) => `<a class="chip" href="#claim-${encodeURIComponent(id)}">${esc(id)}</a>`).join(' ')
    : '<span class="null">none</span>';

  return `
  <section id="summary" class="panel">
    <h2>Summary</h2>
    <p class="fine">Every number here is a count of something rendered in full further down. Follow it; do not take it on trust.</p>

    <h3>Claims by verification state <span class="h3note">(design §5.1 &mdash; six states, no others)</span></h3>
    <div class="tiles">
      ${STATES.map(([s]) => `
      <div class="tile tile-${STATE_CLASS[s]}">
        <div class="tile-n">${esc(byState[s] ?? 0)}</div>
        <div class="tile-l">${esc(s)}</div>
      </div>`).join('')}
    </div>

    <h3>Best evidence by determinism level <span class="h3note">(design §14.1 &mdash; a separate axis from verification state, never one boolean)</span></h3>
    <div class="tiles tiles-4">
      ${['L3', 'L2', 'L1', 'none'].map((d) => `
      <div class="tile tile-det-${d}">
        <div class="tile-n">${esc(byDet[d] ?? 0)}</div>
        <div class="tile-l">${esc(d)}${d === 'L1' ? ' &mdash; capped' : ''}</div>
      </div>`).join('')}
    </div>

    <h3>Coverage, verbatim from <code>verification.coverage</code></h3>
    <table class="kv">
      <tr><th>claims total</th><td>${esc(coverage.claims_total ?? 0)}</td></tr>
      <tr><th>evidence records</th><td>${esc(coverage.evidence_records ?? 0)}</td></tr>
      <tr><th>PDatasets</th><td>${esc(coverage.pdatasets_total ?? 0)} <span class="hint">missing: ${list(coverage.pdatasets_missing)}</span></td></tr>
      <tr><th>claims with no evidence</th><td>${list(coverage.claims_with_no_evidence)}</td></tr>
      <tr><th>claims with <code>L1</code>-only evidence <span class="hint">cannot reach <code>HUMAN VERIFIED</code></span></th><td>${list(coverage.claims_l1_only)}</td></tr>
      <tr><th>unfalsified <span class="hint">modified replay failed to fail</span></th><td>${list(coverage.unfalsified)}</td></tr>
      <tr><th><code>AGENT VERIFIED</code> and not <code>HUMAN VERIFIED</code></th><td>${list(coverage.agent_verified_not_human_verified)}</td></tr>
      <tr><th>drifted <span class="hint">claim text changed since verification</span></th><td>${list(coverage.drifted)}</td></tr>
      <tr><th>capped by evidence</th><td>${list(coverage.capped_by_evidence)}</td></tr>
      <tr><th>un-ID'd claim lines</th><td><a class="chip" href="#unidentified">${esc(coverage.unidentified_claim_lines ?? 0)}</a> <span class="hint">counted, never silently dropped</span></td></tr>
      <tr><th>findings</th><td><a class="chip" href="#findings">${esc(sev.error ?? 0)} error &middot; ${esc(sev.warn ?? 0)} warn &middot; ${esc(sev.info ?? 0)} info</a></td></tr>
    </table>
  </section>`;
}

function renderFindings() {
  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...findings].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  const explain = (f) => {
    if (f.code === 'unfalsified') {
      return `<p class="finding-why"><strong>What this means.</strong> The MODIFIED REPLAY for this claim was expected to <em>fail</em> and it passed &mdash; <em>the modified replay failed to fail</em>.
        The check runs green while the behaviour it asserts is broken, so <strong>the check may be vacuous</strong>: it may be asserting nothing.
        A passing REPLAY on this claim tells you the script executes. It does not tell you the claim holds. This is precisely the defect class MODIFIED REPLAY exists to expose (design §14.3), and it is why this claim's ceiling is
        <code>AGENT VERIFIED</code> rather than <code>HUMAN VERIFIED</code>.</p>`;
    }
    if (f.code === 'l1-only') {
      return `<p class="finding-why"><strong>What this means, and why it is capped.</strong> The only evidence for this claim is <code>L1</code> (attested): somebody stated it and there is nothing to re-execute &mdash; no command, no output to compare, no perturbation that could falsify it.
        <code>L1</code> is testimony, and an agent's assertion about its own work is <code>L1</code> by definition (design §5.3 mechanism 4).
        A claim whose best evidence is <code>L1</code> is therefore capped at <code>AGENT VERIFIED</code> and <strong>can never reach <code>HUMAN VERIFIED</code></strong> (design §6.3, §14.4) &mdash; not because nobody has looked yet, but because there is nothing a human could look at.
        Lifting the cap requires new executable evidence, not a more confident sentence.</p>`;
    }
    return '';
  };
  return `
  <section id="findings" class="panel">
    <h2>Findings</h2>
    ${sorted.length === 0 ? '<p class="null">No findings.</p>' : sorted.map((f) => `
    <div class="finding finding-${esc(f.severity)}">
      <div class="finding-head">
        <span class="sev sev-${esc(f.severity)}">${esc(f.severity)}</span>
        <span class="finding-code">${esc(f.code)}</span>
        <a class="chip" href="#claim-${encodeURIComponent(f.subject)}">${esc(f.subject)}</a>
      </div>
      <p class="finding-msg">${mdInline(f.message)}</p>
      ${explain(f)}
      <p class="fine">locator: ${(() => {
        const [p, ln] = String(f.locator ?? '').split(':');
        return link(fromSurfaceRoot(p), { label: `${fromSurfaceRoot(p)}${ln ? `:${ln}` : ''}` });
      })()}</p>
    </div>`).join('')}
  </section>`;
}

function renderMarkerChain(claim) {
  const markers = claim.markers ?? [];
  const last = markers.length - 1;
  const rows = markers.map((m, i) => `
      <li class="marker ${i === last ? 'marker-current' : 'marker-history'}">
        <div class="marker-line">
          <span class="marker-ln">line ${esc(m.line)}</span>
          <code class="marker-raw">${esc(m.raw)}</code>
          ${i === last ? '<span class="marker-tag">CURRENT &mdash; last line of the block</span>' : '<span class="marker-tag marker-tag-hist">history</span>'}
        </div>
        <div class="marker-parsed">
          parsed: state ${stateBadge(m.state)}
          &middot; PR ${m.pr === null ? '<span class="null">none</span>' : `<code>#${esc(m.pr)}</code>`}
          &middot; date <code>${esc(m.date ?? 'none')}</code>
          &middot; reason ${m.reason ? `<code>${esc(m.reason)}</code>` : '<span class="null">none</span>'}
          &middot; well-formed <code>${esc(String(m.well_formed))}</code>
        </div>
      </li>`).join('');

  const lastMarker = markers[last];
  const priorAffirmative = markers.slice(0, last).map((m) => m.state)
    .filter((s) => s === 'HUMAN VERIFIED' || s === 'HUMAN REVIEWED' || s === 'AGENT VERIFIED').pop();

  let whatHappened = '';
  if (lastMarker && lastMarker.state === 'NOT VERIFIED' && lastMarker.reason) {
    whatHappened = `
      <div class="callout callout-drift">
        <h4>What happened here</h4>
        <p>This claim is <code>NOT VERIFIED</code> <strong>because of an event, not because of an absence.</strong>
          On ${code(lastMarker.date)} a marker was <em>appended</em> reading ${code(lastMarker.raw)}.
          ${priorAffirmative ? `The line above it still reads <code>${esc(priorAffirmative)}</code>, and it was not erased.` : ''}</p>
        <p>Reason recorded: <code>${esc(lastMarker.reason)}</code>. Under design §5.4, editing a claim's sentence changes its
          <code>text_sha256</code>, and a verification bound to the old wording stops binding. The earlier verification was
          real; it simply no longer applies to the sentence now written. Nobody withdrew it and nothing was overwritten &mdash;
          the marker block is append-only (design §3.5), so the whole chain above is still visible. Deleting it would hide
          exactly the event that matters most.</p>
        <p class="fine">Re-verification starts from the current sentence. It is not a resumption of the old one.</p>
      </div>`;
  }

  return `
    <h4 class="sub">Verification marker chain <span class="h3note">append-only; current state is the last line (design §3.5)</span></h4>
    ${markers.length === 0
      ? `<p class="null">No markers on this claim. <strong>An absent marker means <code>NOT VERIFIED</code></strong> (design §3.4) &mdash; the default cannot be forged by omission.</p>`
      : `<ol class="markers">${rows}</ol>`}
    <p class="fine">Chain read from ${link(fromSurfaceRoot(claim.source.path), { label: `${fromSurfaceRoot(claim.source.path)}:${claim.source.line}` })}.
      State resolved from <code>state_source: ${esc(claim.state_source)}</code>${claim.marker_state_source ? `, marker state from <code>${esc(claim.marker_state_source)}</code>` : ''}.
      <code>drift</code> field on this claim: ${orNull(claim.drift)}.</p>
    ${whatHappened}`;
}

function renderEvidence(claim) {
  const evs = claim.evidence ?? [];
  if (evs.length === 0) {
    return `<h4 class="sub">Evidence</h4><p class="gap">No evidence records. Nothing supports this claim.</p>`;
  }
  return `
    <h4 class="sub">Evidence <span class="h3note">${evs.length} record${evs.length === 1 ? '' : 's'} &mdash; open the files; do not take this page's word for any of it</span></h4>
    ${evs.map((ev, i) => {
    const d = DETERMINISM[ev.determinism];
    const scope = scopeOfTest(claim, ev);
    const repoRel = fromSurfaceRoot(ev.locator);
    return `
      <div class="evidence">
        <div class="ev-head">
          <span class="ev-kind">${esc(ev.kind)}</span>
          ${detBadge(ev.determinism)}
          <span class="ev-loc">${link(repoRel, { label: ev.locator })}</span>
          <span class="ev-dl">${link(repoRel, { label: 'open', download: true })}</span>
        </div>
        <div class="det-explain">
          <strong>${esc(ev.determinism)} &mdash; ${esc(d ? d.name : 'undeclared')}.</strong>
          ${d ? esc(d.definition) : 'No level declared. An undeclared level is a gap marker, not an assumption (design §14.1).'}
          <span class="det-verify">Verified by: ${d ? mdInline(d.verified_by) : '&mdash;'}</span>
          <span class="det-ceiling ${ev.determinism === 'L1' ? 'det-ceiling-cap' : ''}">${d ? mdInline(d.ceiling) : ''}</span>
        </div>
        <table class="kv">
          <tr><th>locator</th><td>${link(repoRel)} <span class="hint">repo-relative; <code>link_resolution: local</code></span></td></tr>
          <tr><th><code>sha256</code></th><td><code class="hash">${esc(ev.sha256)}</code></td></tr>
          <tr><th>confirm that hash yourself</th><td><pre class="shell inline"><span class="prompt">$ </span>sha256sum ${esc(repoRel)}</pre></td></tr>
          <tr><th><code>produced_by</code></th><td><code>${esc(ev.produced_by?.actor ?? 'unrecorded')}</code> <span class="actor actor-${esc(ev.produced_by?.class ?? 'none')}">${esc(ev.produced_by?.class ?? 'class unrecorded')}</span></td></tr>
          <tr><th><code>produced_at</code></th><td><code>${esc(ev.produced_at)}</code></td></tr>
          <tr><th>declared in</th><td>${link(fromSurfaceRoot(ev.declared_in), { label: ev.declared_in })} <span class="hint">evidence binds by claim ID cited in the artifact (design §6.1)</span></td></tr>
          <tr><th>declared-in <code>sha256</code></th><td><code class="hash">${esc(ev.declared_in_sha256)}</code></td></tr>
        </table>

        <h5 class="sub2">Executable verification &mdash; run these yourself</h5>
        ${ev.replay
        ? commandBlock('REPLAY — re-execute the recorded command with the recorded inputs; expect the recorded result. Proves the artifact is reproducible.', ev.replay, { kindClass: 'cmd-replay' })
        : `<p class="null">No REPLAY command: <code>replay: null</code>. There is nothing to execute for this record.</p>`}
        ${ev.modified_replay
        ? commandBlock('MODIFIED REPLAY — re-execute with a deliberate perturbation that should change the outcome. EXPECT FAILURE. Proves the check is not vacuous.', ev.modified_replay, { kindClass: ev.modified_replay.as_expected === false ? 'cmd-modified cmd-bad' : 'cmd-modified' })
        : (ev.replay ? `<p class="gap">No MODIFIED REPLAY recorded. MODIFIED REPLAY is required for <code>HUMAN VERIFIED</code> on <code>L3</code>/<code>L2</code> evidence (design §14.4).</p>` : '')}

        <div class="scope">
          <div class="scope-col scope-yes">
            <h5>What this establishes</h5>
            <ul>${scope.yes.map((s) => `<li>${s}</li>`).join('')}</ul>
          </div>
          <div class="scope-col scope-no">
            <h5>What this does <em>not</em> establish</h5>
            <ul>${scope.no.map((s) => `<li>${s}</li>`).join('')}</ul>
          </div>
        </div>

        <details class="code-peek" open>
          <summary>The code that is run &mdash; read it before you trust its result</summary>
          <p>The command above runs ${link(repoRel, { label: repoRel })}. This page deliberately does not paste an excerpt:
            an excerpt is a summary, and a summary of the code is exactly the thing you should not be verifying against.
            Open the file. Its hash is <code class="hash">${esc(ev.sha256)}</code>; the command in the row above recomputes it.</p>
        </details>
      </div>`;
  }).join('')}`;
}

function renderDecision(claim) {
  const file = fromSurfaceRoot(claim.source.path);
  const markers = claim.markers ?? [];
  const appendAfter = markers.length ? markers[markers.length - 1].line : claim.source.line;
  const ceilingBlocked = claim.ceiling !== 'HUMAN VERIFIED';
  const replays = (claim.evidence ?? []).filter((e) => e.replay);
  return `
    <details class="decision" open>
      <summary>Record your decision on ${esc(claim.id)} &mdash; what to write, where</summary>
      <div class="decision-body">
        <p class="warnline"><strong>This page does not write your decision, and no agent may write one for you.</strong>
          An agent writing a human verification state is the precise thing this capability exists to forbid (design §5.3).
          You edit the file yourself, in a pull request, with your own hands.</p>
        <table class="kv">
          <tr><th>file to edit</th><td>${link(file)}</td></tr>
          <tr><th>where in it</th><td>append a new line <strong>immediately after line ${esc(appendAfter)}</strong>${markers.length ? ` (the current last marker, ${code(markers[markers.length - 1].raw)})` : ` (the claim line itself &mdash; this claim has no markers yet)`}, as a continuation line indented to match the claim's existing lines</td></tr>
          <tr><th>what not to do</th><td><strong>Do not edit or delete any existing line.</strong> The marker block is append-only; a diff that removes or rewrites a marker is malformed and mechanically rejected (design §3.5)</td></tr>
          <tr><th>grammar</th><td><code>&mdash; &lt;STATE&gt; (PR #&lt;n&gt;, YYYY-MM-DD)</code> &mdash; no free prose in the parenthetical (design §3.4)</td></tr>
        </table>
        <p class="fine">The exact line to append &mdash; copy one row, substituting your PR number and today's date:</p>
        <table class="states-table">
          <thead><tr><th>if your decision is</th><th>append exactly this line</th><th>who may assert it</th></tr></thead>
          <tbody>
            ${STATES.map(([s, meaning, who]) => {
    const lineText = s === 'NOT VERIFIED'
      ? '  — NOT VERIFIED (&lt;reason&gt;, YYYY-MM-DD)'
      : `  — ${esc(s)} (PR #&lt;n&gt;, YYYY-MM-DD)`;
    const note = s === 'NOT VERIFIED'
      ? 'a <em>reset</em>, appended on claim-text drift (§5.4) or artifact invalidation (§5.5). An absent marker already means <code>NOT VERIFIED</code>, so this line is only ever written to record that something <em>stopped</em> being verified'
      : esc(meaning);
    return `<tr><td>${stateBadge(s)}</td><td><code class="appendline">${lineText}</code><div class="hint">${note}</div></td><td>${esc(who)}</td></tr>`;
  }).join('\n            ')}
          </tbody>
        </table>
        ${replays.length ? `<p class="fine"><strong>Before you may write <code>HUMAN VERIFIED</code> on ${esc(claim.id)}</strong>, run both of these yourself from <code>${esc(replays[0].replay.cwd)}</code> and check the outcomes with your own eyes &mdash; the second one must <em>fail</em> (design §14.4):</p>
        <pre class="shell">${replays.map((e) => `<span class="prompt">$ </span>${esc(e.replay.command)}   <span class="cmt"># expect ${esc(e.replay.expect)}</span>${e.modified_replay ? `\n<span class="prompt">$ </span>${esc(e.modified_replay.command)}   <span class="cmt"># expect ${esc(e.modified_replay.expect)}</span>` : ''}`).join('\n')}</pre>` : ''}
        ${ceilingBlocked ? `<p class="warnline"><strong><code>HUMAN VERIFIED</code> is not available for this claim.</strong>
          Its evidence ceiling is <code>${esc(claim.ceiling)}</code>: ${mdInline(claim.ceiling_reason)}.
          Appending <code>HUMAN VERIFIED</code> here would assert more than the evidence can carry. Fix the evidence first.</p>` : ''}
        <p class="fine"><strong>An absent marker already means <code>NOT VERIFIED</code></strong> (design §3.4), so you never write that line to mean
          &ldquo;nobody has looked yet&rdquo;. The only reason to append it is to record that something <em>stopped</em> being verified (design §5.4, §5.5).
          And note the two axes: the checkbox says the work was done; the marker says whether it was verified.
          Done means <code>HUMAN VERIFIED</code>, not ticked.</p>
      </div>
    </details>`;
}

function renderClaim(claim) {
  const cls = STATE_CLASS[claim.state] ?? 'notverified';
  const flags = [];
  if (claim.unfalsified) {
    flags.push(`<span class="flag flag-bad" title="${esc(claim.unfalsified_reason ?? '')}">UNFALSIFIED &mdash; ${esc(claim.unfalsified_reason ?? 'modified replay failed to fail')}</span>`);
  }
  if (claim.best_determinism === 'L1') {
    flags.push('<span class="flag flag-cap">L1 ONLY &mdash; capped below HUMAN VERIFIED</span>');
  }
  if (claim.ceiling !== 'HUMAN VERIFIED') {
    flags.push(`<span class="flag flag-cap">CEILING: ${esc(claim.ceiling)}</span>`);
  }

  return `
  <article class="claim claim-${cls}" id="claim-${encodeURIComponent(claim.id)}">
    <header class="claim-head">
      <div class="claim-id"><span class="cid">${esc(claim.id)}</span>
        <span class="claim-meta">${esc(claim.scope)} &middot; kind ${esc(claim.kind)}</span></div>
      <div class="claim-state">${stateBadge(claim.state)} ${detBadge(claim.best_determinism)}</div>
    </header>
    ${flags.length ? `<div class="flags">${flags.join('')}</div>` : ''}

    <h4 class="sub">Requirement, verbatim</h4>
    <blockquote class="req">${esc(claim.text)}</blockquote>
    <table class="kv">
      <tr><th><code>text_sha256</code></th><td><code class="hash">${esc(claim.text_sha256)}</code> <span class="hint">binds the verification to this exact wording; edit the sentence and the binding breaks (design §5.4)</span></td></tr>
      <tr><th>authority</th><td>${code(claim.authority)}</td></tr>
      <tr><th>source</th><td>${link(fromSurfaceRoot(claim.source.path), { label: `${fromSurfaceRoot(claim.source.path)}:${claim.source.line}` })}</td></tr>
      <tr><th>checkbox</th><td><code>[${esc(claim.checkbox)}]</code> <span class="hint">a different axis from the verification state: ticked means the work was done, not that it was verified</span></td></tr>
      <tr><th>current state</th><td>${stateBadge(claim.state)} <span class="hint">from <code>${esc(claim.state_source)}</code></span></td></tr>
      <tr><th>evidence ceiling</th><td>${stateBadge(claim.ceiling)} <span class="hint">${mdInline(claim.ceiling_reason)}</span></td></tr>
      <tr><th>unfalsified</th><td><code>${esc(String(claim.unfalsified))}</code>${claim.unfalsified_reason ? ` <span class="hint">${esc(claim.unfalsified_reason)}</span>` : ''}</td></tr>
    </table>

    ${renderMarkerChain(claim)}
    ${renderEvidence(claim)}
    ${renderDecision(claim)}
  </article>`;
}

function renderUnidentified() {
  return `
  <section id="unidentified" class="panel">
    <h2>Claim lines without an ID <span class="h3note">${unidentified.length} of them &mdash; counted, never silently dropped (design §3.2)</span></h2>
    ${unidentified.length === 0 ? '<p class="null">None.</p>' : unidentified.map((u) => `
    <div class="unid">
      <blockquote class="req">${esc(u.text)}</blockquote>
      <table class="kv">
        <tr><th>location</th><td>${link(fromSurfaceRoot(u.path), { label: `${fromSurfaceRoot(u.path)}:${u.line}` })}</td></tr>
        <tr><th>checkbox</th><td><code>[${esc(u.checkbox)}]</code></td></tr>
        <tr><th>state</th><td>${stateBadge(u.state)}</td></tr>
        <tr><th>note recorded by the generator</th><td>${esc(u.note)}</td></tr>
      </table>
      <p class="fine">Without an ID of the form <code>&lt;SCOPE&gt;-&lt;KIND&gt;-&lt;nn&gt;</code> nothing can bind evidence to this line, so it can carry no
        verification state beyond the default. It is shown here so that the coverage numbers above cannot quietly exclude it.</p>
    </div>`).join('')}
  </section>`;
}

function renderPDatasets() {
  return `
  <section id="pdatasets" class="panel">
    <h2>PDatasets <span class="h3note">${pdatasets.length} &mdash; the data itself, not a description of it</span></h2>
    <p class="fine">A PDataset is a named, hashed, addressable data bundle (design §4).
      <code>link_resolution</code> is <code>local</code> throughout, because the delta declares <code>Pages mechanism: none</code>:
      there is no published site, so there is no absolute URL to give, and inventing one would be fabrication (design §4.2).
      The links below are repo-relative and resolve when this page is opened from disk.</p>
    ${pdatasets.map((ds) => {
    const det = DETERMINISM[ds.transformation_determinism];
    return `
    <article class="pds" id="pds-${encodeURIComponent(ds.id)}">
      <header class="pds-head">
        <div><span class="cid">${esc(ds.id)}</span> <span class="pds-title">${esc(ds.title)}</span></div>
        <div class="pds-actions">
          ${link(ds.view_url, { label: 'VIEW' })}
          ${link(ds.download_url, { label: 'DOWNLOAD', download: true })}
        </div>
      </header>
      <table class="kv">
        <tr><th>path</th><td>${link(ds.view_url, { label: ds.view_url })}</td></tr>
        <tr><th>rows</th><td><code>${esc(ds.rows)}</code> <span class="hint"><strong>data rows, excluding the header line.</strong> A plain <code>wc -l</code> over this file returns one more than this number; the command below skips the header so that it reproduces exactly the figure printed here.</span></td></tr>
        <tr><th>bytes</th><td><code>${esc(ds.bytes)}</code></td></tr>
        <tr><th><code>sha256</code></th><td><code class="hash">${esc(ds.sha256)}</code></td></tr>
        <tr><th>confirm hash, rows and bytes yourself</th><td><pre class="shell inline"><span class="prompt">$ </span>sha256sum ${esc(ds.view_url)}
<span class="prompt">$ </span>tail -n +2 ${esc(ds.view_url)} | wc -l   <span class="cmt"># ${esc(ds.rows)} &mdash; data rows, header skipped</span>
<span class="prompt">$ </span>wc -c ${esc(ds.view_url)}   <span class="cmt"># ${esc(ds.bytes)} bytes</span></pre><span class="hint">Run these from the repository root. Each one reproduces exactly the value printed above it &mdash; a confirmation command that disagrees with the page would be worse than none.</span></td></tr>
        <tr><th><code>produced_by</code></th><td><code>${esc(ds.produced_by)}</code></td></tr>
        <tr><th><code>produced_at</code></th><td><code>${esc(ds.produced_at)}</code></td></tr>
        <tr><th><code>derived_from</code></th><td>${ds.derived_from && ds.derived_from.length
      ? ds.derived_from.map((id) => `<a class="chip" href="#pds-${encodeURIComponent(id)}">${esc(id)}</a>`).join(' ')
      : `<code>${esc(ds.derived_from_declared)}</code> <span class="hint">stated, not omitted &mdash; a root dataset must be distinguishable from one whose provenance was never recorded (design §4.1)</span>`}</td></tr>
        <tr><th><code>transformation</code></th><td><code>${esc(ds.transformation)}</code> ${detBadge(ds.transformation_determinism)}</td></tr>
        <tr><th>why that level</th><td>${mdInline(ds.transformation_determinism_source)}${det ? ` <span class="hint">${esc(det.definition)}</span>` : ''}</td></tr>
        <tr><th>provenance chain</th><td class="chain">${(ds.provenance_chain ?? []).map((id) => `<a class="chip" href="#pds-${encodeURIComponent(id)}">${esc(id)}</a>`).join(' <span class="arrow">&rarr;</span> ')} ${ds.provenance_root ? '<span class="hint">this one is the root</span>' : ''}</td></tr>
        <tr><th><code>link_resolution</code></th><td><code>${esc(ds.link_resolution)}</code> <span class="hint">repo-relative paths only; no absolute URL is emitted anywhere on this page</span></td></tr>
        <tr><th>license</th><td><code>${esc(ds.license)}</code></td></tr>
        <tr><th>declared in</th><td>${link(fromSurfaceRoot(ds.source.path), { label: `${fromSurfaceRoot(ds.source.path)}:${ds.source.line}` })}</td></tr>
      </table>
      <h5 class="sub2">Schema</h5>
      <table class="schema">
        <thead><tr><th>column</th><th>type</th></tr></thead>
        <tbody>${(ds.schema ?? []).map((c) => `<tr><td><code>${esc(c.name)}</code></td><td><code>${esc(c.type)}</code></td></tr>`).join('')}</tbody>
      </table>
      <p class="fine">The row count and the schema above are a <em>summary</em>. The file beside them is the data.
        If the two ever disagree, the file is right &mdash; ${link(ds.view_url, { label: 'open it' })}.</p>
    </article>`;
  }).join('')}
  </section>`;
}

function renderStatesReference() {
  return `
  <section id="states" class="panel">
    <h2>How a human records a decision</h2>
    <p class="warnline"><strong>This page cannot record your decision, and neither can any agent.</strong>
      Tool separation, an actor-class gate, an independence requirement and a determinism cap all exist for one reason:
      an agent must never be able to promote work to <code>HUMAN VERIFIED</code> (design §5.3). A page that offered a button
      would be that promotion with extra steps. You edit the claims file yourself, in a pull request.</p>

    <h3>The six states &mdash; there are no others (design §5.1)</h3>
    <table class="states-table">
      <thead><tr><th>state</th><th>meaning</th><th>who may assert it</th></tr></thead>
      <tbody>
        ${STATES.map(([s, meaning, who]) => `<tr><td>${stateBadge(s)}</td><td>${esc(meaning)}</td><td>${esc(who)}</td></tr>`).join('')}
      </tbody>
    </table>
    <p class="fine"><code>AGENT VERIFIED</code> is <strong>not</strong> a step toward <code>HUMAN VERIFIED</code>. It is a different
      assertion by a different actor, and it neither advances toward nor substitutes for a human's judgement (design §5.2).</p>

    <h3>The marker grammar (design §3.4)</h3>
    <pre class="shell append">— &lt;STATE&gt; (PR #&lt;n&gt;, YYYY-MM-DD)</pre>
    <ul class="boundary-list">
      <li>Append it as a continuation line under the claim, in ${link(CLAIMS_SOURCE_REL)}, indented to match the lines already there.</li>
      <li><strong>Append only.</strong> Never edit and never delete an existing marker. The current state is the <em>last</em> line; the lines above it are the history, and that history is the record (design §3.5).</li>
      <li>An <strong>absent</strong> marker means <code>NOT VERIFIED</code>. That default costs nothing to adopt and cannot be forged by omission (design §3.4).</li>
      <li>No free prose inside the parentheses. A reason is permitted only on a reset, as the existing <code>— NOT VERIFIED (claim text edited, …)</code> line shows.</li>
      <li>Before writing <code>HUMAN VERIFIED</code>: run the REPLAY <em>and</em> the MODIFIED REPLAY yourself, and check that the modified one <em>failed</em>. On <code>L3</code>/<code>L2</code> evidence a MODIFIED REPLAY that failed as it should is required (design §14.4). On <code>L1</code> evidence the state is unavailable at any price.</li>
    </ul>

    <h3>The three verification modes (design §14.2)</h3>
    <table class="kv">
      <tr><th>REPLAY</th><td>Re-execute the recorded command with the recorded inputs; expect the recorded result. <strong>Proves the artifact is reproducible.</strong></td></tr>
      <tr><th>MODIFIED REPLAY</th><td>Re-execute with a deliberate perturbation that <em>should</em> change the outcome &mdash; mutate an input, break a precondition, delete the thing being asserted about. <strong>Expect failure.</strong> Proves the check is not vacuous. A check that passes under perturbation is asserting nothing.</td></tr>
      <tr><th>INDEPENDENT VERIFICATION</th><td>A distinct actor, in a distinct session, with no access to the builder's reasoning, produces evidence from the claim text alone. <strong>Proves the result is not an artifact of how it was built.</strong> Independence here is temporal and artifactual, not identity-based.</td></tr>
    </table>

    <h3>The three determinism levels (design §14.1)</h3>
    <table class="states-table">
      <thead><tr><th>level</th><th>name</th><th>definition</th><th>verified by</th></tr></thead>
      <tbody>
        ${['L3', 'L2', 'L1'].map((l) => `<tr><td>${detBadge(l)}</td><td>${esc(DETERMINISM[l].name)}</td><td>${mdInline(DETERMINISM[l].definition)}</td><td>${mdInline(DETERMINISM[l].verified_by)}</td></tr>`).join('')}
      </tbody>
    </table>
    <p class="fine">Determinism and verification are <strong>two axes, never one boolean.</strong> A deterministic check can be
      consistently wrong, and an attested claim can be true. The level bounds what re-execution can tell you; it does not
      tell you whether the claim holds.</p>
  </section>`;
}

function renderBinding() {
  const b = manifest.bound ?? {};
  const p = manifest.projections ?? {};
  const R = manifest.replay ?? {};
  const prev = manifest.previous ?? null;
  // The baseline comparison is the mechanical half of §3.5. `markers_mutated`
  // is the enforcement result: an empty list means every marker present in the
  // baseline is still present and unaltered. Stringifying the object threw that
  // away and printed a sentence the manifest contradicts, which is the exact
  // failure mode this page exists to refuse.
  const previousCell = prev
    ? `${link(fromSurfaceRoot(prev.path), { label: prev.path })} <span class="hint">${esc(prev.source ?? 'baseline')}</span>
        <table class="kv kv-tight">
          <tr><th><code>claims_compared</code></th><td><code>${esc(prev.claims_compared)}</code> <span class="hint">claims matched against the baseline by id</span></td></tr>
          <tr><th><code>drifted</code></th><td>${idList(prev.drifted)} <span class="hint">claims whose text changed since the baseline. <code>0</code> is a comparison that ran and found none, not a comparison that was skipped (design §5.4)</span></td></tr>
          <tr><th><code>invalidated</code></th><td>${idList(prev.invalidated)} <span class="hint">claims whose evidence artifact changed since the baseline. <code>0</code> is a comparison that ran and found none (design §5.5)</span></td></tr>
          <tr><th><strong><code>markers_mutated</code></strong></th><td>${idList(prev.markers_mutated)} <span class="hint"><strong>the append-only enforcement result.</strong> A marker block may only be appended to. Any marker present in the baseline that is now missing, reordered or rewritten appears here. An empty list is the guarantee holding &mdash; mechanically checked against the baseline, not asserted (design §3.5).</span></td></tr>${prev.content_sha256_source ? `
          <tr><th><code>content_sha256</code></th><td>${orNull(prev.content_sha256)} <span class="hint">${mdInline(prev.content_sha256_source)}</span></td></tr>` : ''}
        </table>`
    : `<span class="null">null</span> <span class="hint">no prior manifest to diff against</span>`;
  return `
  <section id="binding" class="panel panel-quiet">
    <h2>Binding and generator provenance</h2>
    <p class="fine">What this page was generated from, hash by hash. Recompute any of them with the commands in
      <a href="#boundary">the execution boundary</a> above.</p>
    <table class="kv">
      <tr><th>manifest schema</th><td><code>${esc(manifest.schema)}</code></td></tr>
      <tr><th>governance version</th><td><code>${esc(manifest.governance_version)}</code></td></tr>
      <tr><th><code>generated_at</code> <span class="hint">the manifest's field &mdash; not this page's run time</span></th><td><code>${esc(manifest.generated_at)}</code></td></tr>
      <tr><th>manifest <code>content_sha256</code></th><td><code class="hash">${esc(manifest.content_sha256)}</code></td></tr>
      <tr><th>surface root</th><td>${link(SURFACE_ROOT || '.', { label: SURFACE_ROOT })}</td></tr>
      <tr><th><code>bound.commit_sha</code></th><td>${orNull(b.commit_sha)} <span class="hint">null: this manifest is not pinned to a commit</span></td></tr>
      <tr><th><code>bound.claims_source_sha256</code></th><td><code class="hash">${esc(b.claims_source_sha256)}</code></td></tr>
      <tr><th><code>bound.pdataset_source_sha256</code></th><td><code class="hash">${esc(b.pdataset_source_sha256)}</code></td></tr>
      <tr><th><code>bound.delta_sha256</code></th><td><code class="hash">${esc(b.delta_sha256)}</code></td></tr>
      <tr><th>design projection</th><td><code>${esc(p.design?.status)}</code>, sha256 ${orNull(p.design?.sha256)}</td></tr>
      <tr><th>verification projection</th><td><code>${esc(p.verification?.status)}</code>, sha256 <code class="hash">${esc(p.verification?.sha256)}</code></td></tr>
      <tr><th>replay runner</th><td>${R.runner ? link(R.runner) : '<span class="null">none</span>'} <span class="hint">execution <code>${esc(R.execution ?? 'unrecorded')}</code> &middot; <code>${esc(R.commands_executed ?? 0)}</code> commands executed, <code>${esc(R.commands_unexecuted ?? 0)}</code> unexecuted &middot; timeout <code>${esc(R.timeout_ms)}</code> ms &middot; record schema <code>${esc(R.schema ?? 'replay-record/v1')}</code>. Every <code>recorded_outcome</code> on this page was observed by this runner at <code>${esc(manifest.generated_at)}</code>.</span></td></tr>${R.timing_excluded ? `
      <tr><th>timing fields</th><td><span class="hint">${mdInline(R.timing_excluded)}</span></td></tr>` : ''}
      <tr><th><code>previous</code> <span class="hint">the baseline this manifest was compared against</span></th><td>${previousCell}</td></tr>
      <tr><th><code>gaps</code></th><td>${(manifest.gaps ?? []).length === 0 ? '<span class="null">none</span>' : esc(JSON.stringify(manifest.gaps))}</td></tr>
      <tr><th>delta declarations</th><td><code>Renderer: ${esc(manifest.delta?.renderer)}</code> &middot;
        <code>Pages mechanism: ${esc(manifest.delta?.pages_mechanism)}</code> &middot;
        <code>Output dir: ${esc(manifest.delta?.output_dir)}</code> &middot;
        <code>Status: ${esc(manifest.delta?.surface_status)}</code></td></tr>
      <tr><th>evidence sources</th><td>${(V.evidence_sources ?? []).map((s) => link(fromSurfaceRoot(s), { label: s })).join(' &middot; ')}</td></tr>
      <tr><th>claim kinds <span class="hint">delta-bound, not enumerated in canon</span></th><td>${(V.claim_kinds ?? []).map((k) => `<code>${esc(k)}</code>`).join(' ')}</td></tr>
    </table>
  </section>`;
}

// ---------------------------------------------------------------------------
// CSS. Inline, system fonts only, no fetch of any kind, light and dark.
// ---------------------------------------------------------------------------

const CSS = `
:root{
  --bg:#faf9f7; --panel:#fff; --panel2:#f6f4f1; --ink:#16181d; --muted:#5d6472;
  --line:#e3e0db; --line2:#cfcbc4; --codebg:#f2f0ec; --codeink:#25282f;
  --accent:#3a4aa8; --shadow:0 1px 2px rgba(20,22,28,.06),0 6px 18px rgba(20,22,28,.05);
  --s-human-fg:#0d6b46; --s-human-bg:#e2f2e9; --s-human-bd:#9ed3b8;
  --s-reviewed-fg:#1a548f; --s-reviewed-bg:#e4eefa; --s-reviewed-bd:#a5c6e8;
  --s-agent-fg:#8a5300; --s-agent-bg:#fbefd8; --s-agent-bd:#e5c489;
  --s-notverified-fg:#4a5160; --s-notverified-bg:#ebedf1; --s-notverified-bd:#c3c8d2;
  --s-failed-fg:#9c1f1c; --s-failed-bg:#fae7e6; --s-failed-bd:#e8b0ad;
  --s-rework-fg:#63369b; --s-rework-bg:#f0e8fb; --s-rework-bd:#cdb4ea;
  --bad-fg:#9c1f1c; --bad-bg:#fbeceb; --bad-bd:#e09e9b;
  --ok-fg:#0d6b46; --warn-fg:#8a5300;
}
@media (prefers-color-scheme:dark){:root{
  --bg:#121418; --panel:#1a1d23; --panel2:#15181d; --ink:#e7e9ee; --muted:#9aa2b2;
  --line:#2a2f38; --line2:#3a414d; --codebg:#0f1116; --codeink:#d7dbe3;
  --accent:#8fa3ff; --shadow:0 1px 2px rgba(0,0,0,.4),0 6px 18px rgba(0,0,0,.3);
  --s-human-fg:#5fd6a0; --s-human-bg:#0f2a20; --s-human-bd:#2d6a4f;
  --s-reviewed-fg:#7fb6f2; --s-reviewed-bg:#11222f; --s-reviewed-bd:#2f5a80;
  --s-agent-fg:#e8b95e; --s-agent-bg:#2b2213; --s-agent-bd:#6d5423;
  --s-notverified-fg:#a6adbb; --s-notverified-bg:#1e2128; --s-notverified-bd:#3b414d;
  --s-failed-fg:#f08e89; --s-failed-bg:#2c1615; --s-failed-bd:#70322f;
  --s-rework-fg:#c3a0ef; --s-rework-bg:#221a2e; --s-rework-bd:#513c72;
  --bad-fg:#f08e89; --bad-bg:#2c1615; --bad-bd:#70322f;
  --ok-fg:#5fd6a0; --warn-fg:#e8b95e;
}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  font-size:15.5px;line-height:1.55;}
.wrap{max-width:1080px;margin:0 auto;padding:28px 20px 96px}
.mono,code,pre,.hash{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace}
code{background:var(--codebg);color:var(--codeink);padding:.08em .35em;border-radius:4px;font-size:.88em;
  word-break:break-word;border:1px solid var(--line)}
.hash{font-size:.8em;letter-spacing:-.01em;word-break:break-all}
a{color:var(--accent)}
a.path{text-decoration:none;border-bottom:1px solid var(--line2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.86em;word-break:break-all}
a.path:hover{border-bottom-color:var(--accent)}

header.masthead{border-bottom:2px solid var(--ink);padding-bottom:18px;margin-bottom:8px}
header.masthead h1{font-size:1.9rem;margin:0 0 4px;letter-spacing:-.02em}
header.masthead .sub{color:var(--muted);margin:0;font-size:.98rem}
.plane{display:inline-block;margin-top:10px;font-size:.74rem;letter-spacing:.09em;text-transform:uppercase;
  border:1px solid var(--line2);border-radius:999px;padding:3px 10px;color:var(--muted)}

nav.toc{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0 26px}
nav.toc a{font-size:.83rem;text-decoration:none;border:1px solid var(--line);background:var(--panel);
  border-radius:999px;padding:4px 11px;color:var(--ink)}
nav.toc a:hover{border-color:var(--accent);color:var(--accent)}

.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:20px 22px;margin:0 0 22px;box-shadow:var(--shadow)}
.panel-quiet{background:var(--panel2);box-shadow:none}
.panel-boundary{border:2px solid var(--ink);background:var(--panel)}
.panel h2{margin:0 0 12px;font-size:1.22rem;letter-spacing:-.01em}
.panel h3{margin:22px 0 8px;font-size:1rem}
.panel h3:first-of-type{margin-top:6px}
.h3note{font-weight:400;color:var(--muted);font-size:.82rem;letter-spacing:0}
h4.sub{margin:20px 0 7px;font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
h5.sub2{margin:16px 0 6px;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
p.lede{margin-top:0}
p.fine{color:var(--muted);font-size:.87rem}
p.big{font-size:1.08rem}
.hint{color:var(--muted);font-size:.82em}
.null{color:var(--muted);font-style:italic}

table.kv{width:100%;border-collapse:collapse;margin:8px 0 4px}
table.kv th{text-align:left;font-weight:600;vertical-align:top;padding:5px 12px 5px 0;width:27%;
  color:var(--muted);font-size:.85rem;border-bottom:1px solid var(--line)}
table.kv td{padding:5px 0;vertical-align:top;border-bottom:1px solid var(--line);font-size:.9rem}
table.kv tr:last-child th,table.kv tr:last-child td{border-bottom:none}
table.kv-tight th,table.kv-tight td{padding:2px 10px 2px 0;border-bottom:none;font-size:.84rem}

.state{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.07em;padding:2px 8px;
  border-radius:4px;border:1px solid;white-space:nowrap}
.state-human{color:var(--s-human-fg);background:var(--s-human-bg);border-color:var(--s-human-bd)}
.state-reviewed{color:var(--s-reviewed-fg);background:var(--s-reviewed-bg);border-color:var(--s-reviewed-bd)}
.state-agent{color:var(--s-agent-fg);background:var(--s-agent-bg);border-color:var(--s-agent-bd)}
.state-notverified{color:var(--s-notverified-fg);background:var(--s-notverified-bg);border-color:var(--s-notverified-bd)}
.state-failed{color:var(--s-failed-fg);background:var(--s-failed-bg);border-color:var(--s-failed-bd)}
.state-rework{color:var(--s-rework-fg);background:var(--s-rework-bg);border-color:var(--s-rework-bd)}

.det{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.05em;padding:2px 7px;border-radius:4px;border:1px solid}
.det-L3{color:var(--s-human-fg);background:var(--s-human-bg);border-color:var(--s-human-bd)}
.det-L2{color:var(--s-reviewed-fg);background:var(--s-reviewed-bg);border-color:var(--s-reviewed-bd)}
.det-L1{color:var(--s-agent-fg);background:var(--s-agent-bg);border-color:var(--s-agent-bd);border-style:dashed}
.det-none{color:var(--bad-fg);background:var(--bad-bg);border-color:var(--bad-bd);border-style:dashed}

.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0 4px}
.tiles-4{grid-template-columns:repeat(4,1fr)}
.tile{border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:var(--panel2)}
.tile-n{font-size:1.5rem;font-weight:700;line-height:1.1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.tile-l{font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:2px}
.tile-human{border-left:4px solid var(--s-human-bd)} .tile-human .tile-n{color:var(--s-human-fg)}
.tile-reviewed{border-left:4px solid var(--s-reviewed-bd)} .tile-reviewed .tile-n{color:var(--s-reviewed-fg)}
.tile-agent{border-left:4px solid var(--s-agent-bd)} .tile-agent .tile-n{color:var(--s-agent-fg)}
.tile-notverified{border-left:4px solid var(--s-notverified-bd)} .tile-notverified .tile-n{color:var(--s-notverified-fg)}
.tile-failed{border-left:4px solid var(--s-failed-bd)} .tile-failed .tile-n{color:var(--s-failed-fg)}
.tile-rework{border-left:4px solid var(--s-rework-bd)} .tile-rework .tile-n{color:var(--s-rework-fg)}
.tile-det-L3{border-left:4px solid var(--s-human-bd)} .tile-det-L2{border-left:4px solid var(--s-reviewed-bd)}
.tile-det-L1{border-left:4px solid var(--s-agent-bd)} .tile-det-none{border-left:4px solid var(--line2)}
.chip{display:inline-block;font-size:.78rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  border:1px solid var(--line2);border-radius:5px;padding:1px 7px;text-decoration:none;color:var(--accent);background:var(--panel2)}
.chip:hover{border-color:var(--accent)}

.finding{border:1px solid var(--line);border-left-width:5px;border-radius:8px;padding:12px 14px;margin:10px 0;background:var(--panel2)}
.finding-error{border-left-color:var(--s-failed-bd)}
.finding-warn{border-left-color:var(--s-agent-bd)}
.finding-info{border-left-color:var(--s-reviewed-bd)}
.finding-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sev{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;border-radius:4px;border:1px solid}
.sev-error{color:var(--s-failed-fg);background:var(--s-failed-bg);border-color:var(--s-failed-bd)}
.sev-warn{color:var(--s-agent-fg);background:var(--s-agent-bg);border-color:var(--s-agent-bd)}
.sev-info{color:var(--s-reviewed-fg);background:var(--s-reviewed-bg);border-color:var(--s-reviewed-bd)}
.finding-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.84rem;font-weight:600}
.finding-msg{margin:8px 0 0}
.finding-why{margin:8px 0 0;font-size:.9rem;border-top:1px dashed var(--line2);padding-top:8px}

article.claim{background:var(--panel);border:1px solid var(--line);border-left-width:5px;border-radius:10px;
  padding:18px 22px;margin:0 0 20px;box-shadow:var(--shadow)}
.claim-human{border-left-color:var(--s-human-bd)}
.claim-reviewed{border-left-color:var(--s-reviewed-bd)}
.claim-agent{border-left-color:var(--s-agent-bd)}
.claim-notverified{border-left-color:var(--s-notverified-bd)}
.claim-failed{border-left-color:var(--s-failed-bd)}
.claim-rework{border-left-color:var(--s-rework-bd)}
.claim-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;
  border-bottom:1px solid var(--line);padding-bottom:10px}
.cid{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:1.05rem;font-weight:700;letter-spacing:-.01em}
.claim-meta{color:var(--muted);font-size:.8rem;margin-left:8px}
.claim-state{display:flex;gap:6px;align-items:center}
.flags{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 0}
.flag{font-size:.72rem;font-weight:700;letter-spacing:.05em;padding:3px 9px;border-radius:4px;border:1px solid}
.flag-bad{color:var(--bad-fg);background:var(--bad-bg);border-color:var(--bad-bd)}
.flag-cap{color:var(--s-agent-fg);background:var(--s-agent-bg);border-color:var(--s-agent-bd)}
blockquote.req{margin:0;padding:12px 16px;border-left:3px solid var(--line2);background:var(--panel2);
  border-radius:0 6px 6px 0;font-size:1rem}

ol.markers{list-style:none;margin:6px 0;padding:0;border-left:2px solid var(--line2);}
li.marker{padding:8px 0 8px 14px;position:relative}
li.marker::before{content:"";position:absolute;left:-6px;top:15px;width:9px;height:9px;border-radius:50%;
  background:var(--line2);border:2px solid var(--panel)}
li.marker-current::before{background:var(--ink)}
.marker-history{opacity:.82}
.marker-line{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap}
.marker-ln{font-size:.72rem;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;min-width:54px}
.marker-raw{font-size:.87rem}
.marker-tag{font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink);border:1px solid var(--line2);border-radius:3px;padding:1px 6px}
.marker-tag-hist{color:var(--muted);border-style:dashed}
.marker-parsed{font-size:.8rem;color:var(--muted);margin-top:4px;margin-left:63px}

.callout{border:1px solid var(--line2);border-radius:8px;padding:12px 15px;margin:12px 0;background:var(--panel2)}
.callout h4{margin:0 0 6px;font-size:.92rem}
.callout p{margin:6px 0;font-size:.91rem}
.callout-drift{border-left:5px solid var(--s-notverified-bd)}

.evidence{border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin:8px 0 14px;background:var(--panel2)}
.ev-head{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.ev-kind{font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;border:1px solid var(--line2);border-radius:4px;padding:2px 8px}
.ev-loc{flex:1 1 auto;min-width:0}
.det-explain{font-size:.88rem;border:1px dashed var(--line2);border-radius:6px;padding:9px 12px;margin-bottom:8px}
.det-verify,.det-ceiling{display:block;color:var(--muted);font-size:.85em;margin-top:3px}
.det-ceiling-cap{color:var(--warn-fg);font-weight:600}
.actor{font-size:.68rem;letter-spacing:.07em;text-transform:uppercase;border-radius:3px;padding:1px 6px;border:1px solid}
.actor-agent{color:var(--s-agent-fg);background:var(--s-agent-bg);border-color:var(--s-agent-bd)}
.actor-human{color:var(--s-human-fg);background:var(--s-human-bg);border-color:var(--s-human-bd)}
.actor-none{color:var(--muted);border-color:var(--line2)}

.cmd{border:1px solid var(--line2);border-radius:8px;padding:11px 13px;margin:8px 0;background:var(--panel)}
.cmd-replay{border-left:4px solid var(--s-reviewed-bd)}
.cmd-modified{border-left:4px solid var(--s-agent-bd)}
.cmd-bad{border-left:4px solid var(--bad-bd);background:var(--bad-bg)}
.cmd-head{display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;margin-bottom:5px}
.cmd-title{font-size:.84rem;font-weight:600}
.cmd-perturb{font-size:.79rem;color:var(--muted)}
.cmd-cwd{font-size:.79rem;color:var(--muted);margin-bottom:6px}
.cmd-mismatch{border:2px solid var(--bad-bd);background:var(--bad-bg);color:var(--ink);border-radius:6px;
  padding:9px 12px;margin:8px 0 2px;font-size:.87rem}
.cmd-mismatch strong:first-child{letter-spacing:.02em}
pre.shell{background:var(--codebg);color:var(--codeink);border:1px solid var(--line);border-radius:6px;
  padding:9px 12px 9px 28px;margin:6px 0;overflow-x:auto;font-size:.86rem;line-height:1.5;
  white-space:pre-wrap;word-break:break-word}
pre.shell.inline{margin:0;padding:5px 9px 5px 25px;font-size:.8rem;background:var(--codebg)}
pre.shell.inline.out{padding-left:9px;white-space:pre-wrap;word-break:break-word}
pre.shell.append{font-size:.82rem}
.prompt{display:inline-block;width:16px;margin-left:-16px;color:var(--muted);user-select:none}
.cmt{color:var(--muted)}
.outcome-ok{color:var(--ok-fg);font-weight:700}
.outcome-bad{color:var(--bad-fg);font-weight:700}
.outcome-none{color:var(--muted)}

.scope{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
.scope-col{border:1px solid var(--line2);border-radius:8px;padding:10px 13px;background:var(--panel)}
.scope-col h5{margin:0 0 6px;font-size:.76rem;letter-spacing:.08em;text-transform:uppercase}
.scope-yes{border-left:4px solid var(--s-human-bd)} .scope-yes h5{color:var(--s-human-fg)}
.scope-no{border-left:4px solid var(--bad-bd)} .scope-no h5{color:var(--bad-fg)}
.scope-col ul{margin:0;padding-left:17px}
.scope-col li{margin:5px 0;font-size:.87rem}

details.code-peek,details.decision{border:1px solid var(--line2);border-radius:8px;padding:9px 13px;margin-top:10px;background:var(--panel)}
details.decision{margin-top:16px;border-style:dashed}
summary{cursor:pointer;font-size:.85rem;font-weight:600}
.decision-body{margin-top:10px}
.warnline{border:1px solid var(--bad-bd);background:var(--bad-bg);color:var(--ink);border-radius:6px;padding:9px 13px;font-size:.9rem}

code.appendline{display:inline-block;white-space:pre;font-size:.84rem}
.gap{color:var(--bad-fg);font-weight:600;font-size:.86rem}
.gap-tag{font-size:.66rem;letter-spacing:.08em;border:1px solid var(--bad-bd);border-radius:3px;padding:1px 5px}

article.pds{border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin:12px 0;background:var(--panel2)}
.pds-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline;
  border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:6px}
.pds-title{color:var(--muted);margin-left:6px}
.pds-actions{display:flex;gap:6px}
.pds-actions a.path{border:1px solid var(--line2);border-radius:5px;padding:3px 11px;font-size:.74rem;
  letter-spacing:.07em;font-weight:700;text-decoration:none;background:var(--panel)}
.chain .arrow{color:var(--muted)}
table.schema,table.states-table{border-collapse:collapse;width:100%;margin:6px 0;font-size:.87rem}
table.schema th,table.schema td,table.states-table th,table.states-table td{
  border:1px solid var(--line);padding:5px 9px;text-align:left;vertical-align:top}
table.schema th,table.states-table th{background:var(--panel2);font-size:.78rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.unid{border:1px solid var(--line);border-left:5px solid var(--s-notverified-bd);border-radius:8px;padding:12px 15px;background:var(--panel2)}
ul.boundary-list{margin:8px 0;padding-left:19px}
ul.boundary-list li{margin:6px 0}
footer.foot{color:var(--muted);font-size:.83rem;border-top:1px solid var(--line);padding-top:14px;margin-top:8px}

@media (max-width:720px){
  .tiles,.tiles-4{grid-template-columns:repeat(2,1fr)}
  .scope{grid-template-columns:1fr}
  table.kv th{width:auto;display:block;border-bottom:none;padding-bottom:0}
  table.kv td{display:block;padding-top:2px}
  .marker-parsed{margin-left:0}
}
@media print{body{background:#fff}.panel,article.claim{box-shadow:none;break-inside:avoid}}
`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Human Verification Surface</title>
<meta name="generator" content="plugin/scripts/surface-html.mjs — Renderer: none, zero dependencies">
<meta name="description" content="Verification projection of the governance surface manifest: claims, marker chains, evidence, determinism, replay commands and PDatasets.">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">

<header class="masthead">
  <h1>Human Verification Surface</h1>
  <p class="sub">${esc(coverage.claims_total ?? 0)} claims &middot; ${esc(coverage.evidence_records ?? 0)} evidence records &middot; ${esc(coverage.pdatasets_total ?? 0)} PDatasets &middot; ${esc(unidentified.length)} un-ID'd claim line${unidentified.length === 1 ? '' : 's'} &middot; generated from a manifest dated <span class="mono">${esc(manifest.generated_at)}</span></p>
  <span class="plane">Data plane &mdash; generated view &mdash; not a source of truth</span>
</header>

<nav class="toc">
  <a href="#boundary">Execution boundary</a>
  <a href="#provenance">What this projects</a>
  <a href="#summary">Summary</a>
  <a href="#findings">Findings</a>
  <a href="#claims">Claims</a>
  ${claims.map((c) => `<a href="#claim-${encodeURIComponent(c.id)}">${esc(c.id)}</a>`).join('\n  ')}
  <a href="#unidentified">Un-ID'd</a>
  <a href="#pdatasets">PDatasets</a>
  <a href="#states">Recording a decision</a>
  <a href="#binding">Binding</a>
</nav>

${renderBoundary()}
${renderProvenance()}
${renderSummary()}
${renderFindings()}

<section id="claims" class="panel panel-quiet">
  <h2>Claims</h2>
  <p class="fine">Each claim below carries its requirement <strong>verbatim</strong>, the hash that binds a verification to that exact
    wording, its full append-only marker chain, and every evidence record with a working link to the file itself.
    Nothing here is summarised without the thing it summarises sitting beside it.</p>
</section>
${claims.map(renderClaim).join('')}

${renderUnidentified()}
${renderPDatasets()}
${renderStatesReference()}
${renderBinding()}

<footer class="foot">
  <p>Generated by <code>plugin/scripts/surface-html.mjs</code> from <code>${esc(MANIFEST_REPO_REL)}</code>.
  <code>Renderer: none</code> &mdash; plain Node, zero dependencies, no network at build time and none at view time.
  This page contains no script and makes no external request; every link on it is repo-relative and resolves from disk.</p>
  <p>Hand-edits to this file are lost on the next generation. The authoritative documents are named under
  <a href="#provenance">What this projects</a>.</p>
</footer>

</div>
</body>
</html>
`;

// ---------------------------------------------------------------------------
// Guardrails, enforced rather than asserted
// ---------------------------------------------------------------------------

// design §4.2 / activity plan A7-AC-03: under `Pages mechanism: none` the link
// resolution is `local` and no absolute URL may be emitted. The generator
// refuses rather than shipping a fabricated one. `surface.mjs` applies the same
// refusal to the manifest; this is its counterpart for the rendered page.
const ABSOLUTE = /\b[a-z][a-z0-9+.-]*:\/\//gi;
const offenders = [...new Set(html.match(ABSOLUTE) ?? [])];
if (offenders.length) {
  process.stderr.write(
    `surface-html.mjs: refusing to emit absolute URLs under \`Pages mechanism: ${manifest.delta?.pages_mechanism}\`: ${offenders.join(', ')}\n`,
  );
  process.exit(2);
}
// No script of any kind: the execution boundary is a property of the artifact,
// not a promise in its prose.
if (/<script|\son[a-z]+\s*=/i.test(html)) {
  process.stderr.write('surface-html.mjs: refusing to emit script or inline event handlers\n');
  process.exit(2);
}

fs.mkdirSync(path.dirname(OUT_ABS), { recursive: true });
fs.writeFileSync(OUT_ABS, html);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const unresolved = linkLedger.filter((l) => !l.exists);
const distinct = new Map(linkLedger.map((l) => [l.rel, l]));

if (!QUIET) {
  const line = (s) => process.stdout.write(`${s}\n`);
  line(`surface-html: ${posix(path.relative(REPO_ROOT, OUT_ABS))}  ${Buffer.byteLength(html)} bytes`);
  line(`  manifest ${MANIFEST_REPO_REL}  content_sha256 ${manifest.content_sha256}`);
  line(`  claims ${claims.length}  evidence ${coverage.evidence_records ?? 0}  pdatasets ${pdatasets.length}`
    + `  un-ID'd ${unidentified.length}  findings ${findings.length}`);
  line(`  links: ${linkLedger.length} emitted, ${distinct.size} distinct targets, ${unresolved.length} unresolved`);
  line(`  absolute URLs: 0 (guardrail enforced)   script tags: 0 (guardrail enforced)`);
  for (const [rel, l] of distinct) line(`    ${l.exists ? 'ok     ' : 'MISSING'} ${rel}`);
}

process.exit(unresolved.length > 0 ? 1 : 0);
