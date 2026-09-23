#!/usr/bin/env node
// Regression tests for surface.mjs, replay.mjs and surface-html.mjs
// (design §8: "surface.test.mjs").
//
// The three scripts of the G-3 slice shipped with no CI coverage at all. The
// independent verification of the first build (`fixtures/slice/VERIFIER-1-REPORT.md`)
// found that the verdict `HUMAN VERIFIED` was computed from self-declared
// strings nothing ever executed: flipping ONE WORD in ONE CODE COMMENT
// (`// modified-replay-outcome: pass` -> `fail`) promoted the fixture's
// deliberately vacuous check to `HUMAN VERIFIED` with zero findings and exit 0.
// Ten more defects sat beside it (D2-D11). `BUILDER-2-REPORT.md` fixed D1-D9 by
// making the generator RUN the declared replays and compare the §5.5
// identifiers against the manifest the markers were written against.
//
// Every one of those defects has a test below, and every assertion here was
// watched failing before it was kept — each one under a named defect injected
// into a throwaway copy of the script it tests. `BUILDER-5-REPORT.md` §2.2 is
// the table: assertion, the mutant that turned it red. A test nobody has seen
// fail is not evidence.
//
// Two of these tests exist to stop the suite proving the wrong thing. A tool
// that refuses everything would pass a suite made only of refusals, so the
// `HUMAN VERIFIED` gate is shown OPENING on honest evidence (§B4) and the
// baseline refusal is shown YIELDING to its documented escape hatch (§E4).
//
// Style follows governance-checks.test.mjs: plain Node, zero dependencies,
// temp dirs created and cleaned, one assertion helper, non-zero exit on
// failure. These are end-to-end — the real scripts, as subprocesses, over a
// COPY of the committed fixture. Nothing here writes to the fixture itself.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SURFACE = fileURLToPath(new URL('./surface.mjs', import.meta.url));
const SURFACE_HTML = fileURLToPath(new URL('./surface-html.mjs', import.meta.url));
const REPLAY = fileURLToPath(new URL('./replay.mjs', import.meta.url));
const FIXTURE = fileURLToPath(new URL('./fixtures/slice', import.meta.url));
const VERSION_FILE = fileURLToPath(new URL('../../VERSION', import.meta.url));

// Pinned so `generated_at` — the one field permitted to differ between runs —
// cannot make an assertion flaky. The determinism test deliberately omits it.
const PINNED = '2026-09-23T00:00:00.000Z';

let failed = 0;

function check(name, cond, detail) {
  if (cond) { console.log(`PASS  ${name}`); return; }
  failed++;
  console.log(`FAIL  ${name}`);
  if (detail) console.log(`      ${String(detail).split('\n').join('\n      ')}`);
}

// ---------------------------------------------------------------------------
// Fixture copies. The committed fixture is never touched.
// ---------------------------------------------------------------------------

// `<tmp>/slice` holds the copy; `<tmp>/VERSION` sits above it because
// `governance_version` is read from a VERSION file at or above `--root`, and
// without it a copy outside the repository yields a different `content_sha256`
// (fixture README, "The committed manifest").
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'surface-'));
  const root = path.join(dir, 'slice');
  fs.cpSync(FIXTURE, root, { recursive: true });
  if (fs.existsSync(VERSION_FILE)) fs.copyFileSync(VERSION_FILE, path.join(dir, 'VERSION'));
  return { dir, root };
}

const clean = (dir) => fs.rmSync(dir, { recursive: true, force: true });

// One textual edit in a fixture copy. `from` MUST occur exactly once: a silent
// no-op edit turns a regression test into a tautology, and an accidental second
// match is a real hazard here — Verifier 1's own `sed` for appending a marker to
// `P1-AC-04` also hit `S1-CL-01`, whose marker line is byte-identical.
function edit(root, rel, from, to) {
  const abs = path.join(root, rel);
  const parts = fs.readFileSync(abs, 'utf8').split(from);
  if (parts.length !== 2) {
    throw new Error(`edit(${rel}): expected exactly 1 occurrence of ${JSON.stringify(from)}, found ${parts.length - 1}`);
  }
  fs.writeFileSync(abs, parts.join(to));
}

function editJson(abs, fn) {
  const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
  fn(doc);
  fs.writeFileSync(abs, JSON.stringify(doc, null, 1));
}

// stdout AND stderr on every run: surface.mjs reports the baseline refusal on
// stderr, and a helper that captured it only on failure could not assert on it.
function surface(root, args = [], { pin = true } = {}) {
  const argv = [SURFACE, '--root', root, ...(pin ? ['--generated-at', PINNED] : []), ...args];
  const r = spawnSync('node', argv, { encoding: 'utf8' });
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

// A run that wrote nothing is a result, not a crash: the empty shape below
// makes every assertion over it go red with its own name attached, instead of
// throwing an ENOENT stack trace out of the harness.
const EMPTY_CLAIM = { evidence: [], markers: [], history: [], invalidation: { identifiers: [], changed: [] } };
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (err) {
    return {
      unreadable: err.message, findings: [], gaps: [], findings_by_severity: {}, replay: {},
      verification: {
        claims: [], pdatasets: [], unidentified_claims: [],
        coverage: { unexecuted_replays: [], failed_to_falsify: [], pdatasets_missing: [], unidentified_claim_lines: -1 },
      },
    };
  }
}
const claimOf = (m, id) => m.verification.claims.find((c) => c.id === id) ?? EMPTY_CLAIM;
const findingsOf = (m, code) => m.findings.filter((f) => f.code === code);
const codes = (m) => (m.unreadable ? `manifest unreadable: ${m.unreadable}` : '')
  + m.findings.map((f) => `${f.severity} ${f.code} ${f.subject}`).join('\n');

// ===========================================================================
// A. The control: the committed fixture, unmodified.
//
// Stated first because every refusal below is only meaningful against it. If
// this block ever goes red, no other result in this file means anything.
// ===========================================================================

{
  const { dir, root } = fixture();
  const out = path.join(dir, 'a1.json');
  const { code, out: log } = surface(root, ['--out', out]);
  const m = readJson(out);
  check(
    'the committed fixture passes its own default run (0 error, exit 0)',
    code === 0 && m.findings_by_severity.error === 0,
    `exit=${code}\n${log}`
  );
  check(
    'the five fixture verdicts are exactly what the fixture README documents',
    claimOf(m, 'P1-AC-01').state === 'HUMAN VERIFIED' &&
      claimOf(m, 'P1-AC-02').state === 'AGENT VERIFIED' &&
      claimOf(m, 'P1-AC-03').state === 'NOT VERIFIED' &&
      claimOf(m, 'P1-AC-04').state === 'AGENT VERIFIED' &&
      claimOf(m, 'S1-CL-01').state === 'HUMAN VERIFIED',
    m.verification.claims.map((c) => `${c.id} ${c.state}`).join('\n')
  );
  check(
    'every declared replay is EXECUTED, not believed',
    m.replay.commands_executed === 10 && m.replay.commands_unexecuted === 0 &&
      m.verification.coverage.unexecuted_replays.length === 0,
    JSON.stringify(m.replay)
  );
  // The committed manifest is its own baseline (§5.5), so a stale one would
  // silently disarm drift and invalidation detection for every later run.
  // A generator change that adds a manifest field lands here first.
  const committed = readJson(path.join(root, 'docs/verification/surface-manifest.json')).content_sha256;
  check(
    'the committed manifest is current: a regeneration reproduces its own content_sha256',
    m.content_sha256 === committed,
    `regenerated ${m.content_sha256}\ncommitted   ${committed}\n`
    + 'Regenerate it: node plugin/scripts/surface.mjs --root plugin/scripts/fixtures/slice'
  );
  clean(dir);
}

// ===========================================================================
// B. D1 — the critical defect. The verdict must be a function of a process
// that ran, never of a comment.
//
// Design §14.1 (testimony vs. execution), §14.2 (modified replay), §14.4.
// ===========================================================================

// The exact defect Verifier 1 injected: flip one word in one comment, then
// append a well-formed `HUMAN VERIFIED` marker. `--no-previous` isolates D1 —
// without it the refusal could be credited to D2's artifact invalidation
// instead, and the test would pass for the wrong reason.
{
  const { dir, root } = fixture();
  edit(root, 'checks/ac04-transform-runs.mjs',
    '// modified-replay-outcome: pass', '// modified-replay-outcome: fail');
  edit(root, 'llm/claims.md',
    '  — AGENT VERIFIED (PR #43, 2026-09-22)\n- [ ] The normalized',
    '  — AGENT VERIFIED (PR #43, 2026-09-22)\n  — HUMAN VERIFIED (PR #99, 2026-09-23)\n- [ ] The normalized');
  const out = path.join(dir, 'b1.json');
  const { code, out: log } = surface(root, ['--no-previous', '--out', out]);
  const m = readJson(out);
  const c = claimOf(m, 'P1-AC-04');

  check(
    'D1: flipping `modified-replay-outcome` does NOT reach HUMAN VERIFIED',
    code !== 0 && c.state === 'AGENT VERIFIED' && c.marker_state === 'HUMAN VERIFIED' &&
      c.state_source === 'capped-by-evidence',
    `exit=${code} state=${c.state}\n${log}`
  );
  check(
    'D1: the misreported outcome is named — `replay-outcome-misreported`',
    findingsOf(m, 'replay-outcome-misreported').some(
      (f) => f.subject === 'P1-AC-04' && /checks\/ac04-transform-runs\.mjs/.test(f.message)
    ),
    codes(m)
  );
  // The whole repair in one assertion: what the author SAYS is `attested`,
  // what the child process DID is `recorded`, and they are different fields.
  const mr = (c.evidence.find((e) => /ac04-transform-runs/.test(e.locator)) ?? {}).modified_replay ?? {};
  check(
    'D1: the comment is recorded as testimony and the exit status as evidence',
    mr.attested_outcome === 'fail' && mr.recorded_outcome === 'pass' &&
      mr.outcome_source === 'executed' && mr.as_expected === false &&
      mr.execution?.exit_status === 0 && mr.execution?.executed === true,
    JSON.stringify(mr, null, 1)
  );
  clean(dir);
}

// The same flip WITHOUT the marker append. The misreport is a fact about the
// evidence, so it must be reported whether or not anybody is currently trying
// to cash it in for a state.
{
  const { dir, root } = fixture();
  edit(root, 'checks/ac04-transform-runs.mjs',
    '// modified-replay-outcome: pass', '// modified-replay-outcome: fail');
  const out = path.join(dir, 'b2.json');
  const { code } = surface(root, ['--no-previous', '--out', out]);
  const m = readJson(out);
  check(
    'D1: a misreported outcome is an error even with no state being claimed',
    code !== 0 && findingsOf(m, 'replay-outcome-misreported').length === 1,
    `exit=${code}\n${codes(m)}`
  );
  clean(dir);
}

// The vacuous check itself, reported as vacuous on the honest fixture: the
// MODIFIED REPLAY exits 0 when it must exit 1 (§14.3, §14.4).
{
  const { dir, root } = fixture();
  const out = path.join(dir, 'b3.json');
  surface(root, ['--out', out]);
  const m = readJson(out);
  check(
    'a check that passes under its own perturbation is reported `failed-to-falsify`',
    m.verification.coverage.failed_to_falsify.includes('P1-AC-04') &&
      claimOf(m, 'P1-AC-04').failed_to_falsify.includes('checks/ac04-transform-runs.mjs'),
    JSON.stringify(m.verification.coverage.failed_to_falsify)
  );
  clean(dir);
}

// ---------------------------------------------------------------------------
// B4. THE GATE IS NOT STUCK CLOSED.
//
// Everything above is a refusal, and a tool that refused everything would pass
// all of it. So: same tree, same appended `HUMAN VERIFIED` marker, one
// difference — the check is made GENUINELY FALSIFYING (it now asserts the
// output holds no duplicate ids, so the perturbation really does break it).
// The claim must reach `HUMAN VERIFIED` with zero errors and exit 0.
//
// This is also the modified replay of the D1 test above: the pair differs by
// exactly the thing under test.
// ---------------------------------------------------------------------------

const AC04_ASSERTION =
  "  const ids = csv.split('\\n').slice(1).filter((l) => l.trim() !== '').map((l) => l.split(',')[0]);\n" +
  '  if (new Set(ids).size !== ids.length) {\n' +
  "    process.stdout.write(`FAIL P1-AC-04 ${label}: duplicate ids in the output\\n`);\n" +
  '    process.exit(1);\n' +
  '  }';

{
  const { dir, root } = fixture();
  const anchor = "  const { csv } = normalize(fs.readFileSync(SOURCE_PATH, 'utf8'), { perturb });";
  edit(root, 'checks/ac04-transform-runs.mjs', anchor, `${anchor}\n${AC04_ASSERTION}`);
  edit(root, 'checks/ac04-transform-runs.mjs',
    '// modified-replay-outcome: pass', '// modified-replay-outcome: fail');
  edit(root, 'llm/claims.md',
    '  — AGENT VERIFIED (PR #43, 2026-09-22)\n- [ ] The normalized',
    '  — AGENT VERIFIED (PR #43, 2026-09-22)\n  — HUMAN VERIFIED (PR #99, 2026-09-23)\n- [ ] The normalized');
  const out = path.join(dir, 'b4.json');
  const { code, out: log } = surface(root, ['--no-previous', '--out', out]);
  const m = readJson(out);
  const c = claimOf(m, 'P1-AC-04');
  check(
    'the gate OPENS: a genuinely falsifying L3 check reaches HUMAN VERIFIED, exit 0',
    code === 0 && c.state === 'HUMAN VERIFIED' && m.findings_by_severity.error === 0,
    `exit=${code} state=${c.state}\n${log}`
  );
  check(
    'the reason names the execution, not the declaration',
    /MODIFIED REPLAY exited 1/.test(c.ceiling_reason) && c.failed_to_falsify.length === 0 &&
      m.verification.coverage.failed_to_falsify.length === 0,
    c.ceiling_reason
  );
  clean(dir);
}

// ===========================================================================
// C. The determinism cap (§14.1 as amended, §6.3, §5.3 mechanism 4).
//
// The scale runs L3 (deterministic, strongest) -> L2 -> L1 (attested,
// WEAKEST). `L1` is an actor's say-so with nothing to re-execute, and it can
// never carry a human state.
// ===========================================================================

{
  const { dir, root } = fixture();
  // P1-AC-02's only evidence is the agent's prose attestation in
  // evidence/attestations.md: `determinism: L1`, `replay: none`.
  edit(root, 'llm/claims.md',
    '(design §6.3)\n  — AGENT VERIFIED (PR #41, 2026-09-22)\n',
    '(design §6.3)\n  — AGENT VERIFIED (PR #41, 2026-09-22)\n  — HUMAN VERIFIED (PR #99, 2026-09-23)\n');
  const out = path.join(dir, 'c1.json');
  const { code, out: log } = surface(root, ['--no-previous', '--out', out]);
  const m = readJson(out);
  const c = claimOf(m, 'P1-AC-02');
  check(
    'L1-only evidence cannot reach HUMAN VERIFIED — the asserted state is REFUSED',
    code !== 0 && c.marker_state === 'HUMAN VERIFIED' && c.state === 'AGENT VERIFIED' &&
      findingsOf(m, 'state-cap-violation').some((f) => f.subject === 'P1-AC-02'),
    `exit=${code} state=${c.state}\n${log}`
  );
  // The guard against implementing the scale upside down. Invert the ranking
  // and this line goes red while the one above stays green: in the SAME run,
  // L1 is capped and L3 is not.
  check(
    'the scale is not inverted: L1 is capped in the same run in which L3 passes',
    c.best_determinism === 'L1' && c.ceiling === 'AGENT VERIFIED' &&
      claimOf(m, 'P1-AC-01').best_determinism === 'L3' &&
      claimOf(m, 'P1-AC-01').state === 'HUMAN VERIFIED',
    `P1-AC-02 best=${c.best_determinism} ceiling=${c.ceiling} | P1-AC-01 best=${claimOf(m, 'P1-AC-01').best_determinism} state=${claimOf(m, 'P1-AC-01').state}`
  );
  clean(dir);
}

// ===========================================================================
// D. D2 — §5.5 artifact invalidation. "If any bound identifier changes,
// `--surface` appends an invalidation marker."
// ===========================================================================

{
  const { dir, root } = fixture();
  // One score, in the bound source PDataset S1-DS-01. Nothing else.
  edit(root, 'data/source.csv', 's-002,Katherine Johnson,99', 's-002,Katherine Johnson,42');
  const out = path.join(dir, 'd1.json');
  const { code, out: log } = surface(root, ['--out', out]);
  const m = readJson(out);
  const c = claimOf(m, 'S1-CL-01');
  check(
    'D2: mutating a bound dataset invalidates the claim it carried',
    code !== 0 && c.marker_state === 'HUMAN VERIFIED' && c.state === 'NOT VERIFIED' &&
      c.state_source === 'artifact-invalidation',
    `exit=${code} state=${c.state}\n${log}`
  );
  check(
    'D2: the finding NAMES the identifier and the dataset that moved',
    findingsOf(m, 'artifact-invalidated').some(
      (f) => f.subject === 'S1-CL-01' && /dataset_sha256/.test(f.message) && /S1-DS-01/.test(f.message)
    ) && c.invalidation.identifiers.includes('dataset_sha256') &&
      c.invalidation.changed.some((x) => x.subject === 'S1-DS-01'),
    JSON.stringify(c.invalidation, null, 1)
  );
  // §3.5: the reset is PROPOSED, never written. The generator does not edit
  // the claims file, and the marker it proposes must be one the parser accepts.
  check(
    'D2: the reset marker is proposed in the §3.4 grammar, not written into the claims file',
    /^— NOT VERIFIED \(artifact changed: [^,]+, \d{4}-\d{2}-\d{2}\)$/.test(c.invalidation.proposed_marker ?? '') &&
      c.invalidation.acknowledged === false &&
      fs.readFileSync(path.join(root, 'llm/claims.md'), 'utf8') ===
        fs.readFileSync(path.join(FIXTURE, 'llm/claims.md'), 'utf8'),
    c.invalidation.proposed_marker
  );
  // Two independent mechanisms catch this, which is the point: the hash
  // comparison AND the human-authored check, which genuinely reads the data.
  check(
    'D2: the executed replay fails independently of the hash comparison',
    findingsOf(m, 'replay-outcome-misreported').some((f) => /human\/cl01-independent-relationship\.mjs/.test(f.message)),
    codes(m)
  );
  clean(dir);
}

// ===========================================================================
// E. D3 — the baseline. A default run used to overwrite the only record of
// what was verified, so ONE run laundered a claim-text edit permanently.
// ===========================================================================

const BASELINE_REL = 'docs/verification/surface-manifest.json';

{
  const { dir, root } = fixture();
  const baseline = path.join(root, BASELINE_REL);
  const before = fs.readFileSync(baseline);
  // The claim now says the OPPOSITE of what was verified. Marker untouched.
  edit(root, 'llm/claims.md',
    'duplicate source IDs are rejected.', 'duplicate source IDs are silently merged.');

  // Default invocation: no --out, no --previous. This is what the fixture
  // README documents, and the invocation the defect lived in.
  const r1 = surface(root);
  check(
    'D3: a default run after a claim-text edit REFUSES to overwrite the baseline',
    r1.code !== 0 && /refusing to overwrite the baseline/.test(r1.out) &&
      /NOT WRITTEN/.test(r1.out) && Buffer.compare(before, fs.readFileSync(baseline)) === 0,
    `exit=${r1.code}\n${r1.out}`
  );
  check(
    'D3: the drift is named and the §3.5 marker to append is proposed',
    /P1-AC-01/.test(r1.out) && /— NOT VERIFIED \(claim text edited, \d{4}-\d{2}-\d{2}\)/.test(r1.out),
    r1.out
  );

  // Verifier 1's laundering sequence was: run once with defaults, then compare.
  const r2 = surface(root);
  check(
    'D3: repetition does not launder it — the second run refuses identically',
    r2.code !== 0 && /refusing to overwrite the baseline/.test(r2.out) &&
      Buffer.compare(before, fs.readFileSync(baseline)) === 0,
    `exit=${r2.code}\n${r2.out}`
  );

  // -------------------------------------------------------------------------
  // F. Append-only (§3.5). The resolution path: append the proposed reset. The
  // prior HUMAN VERIFIED line must still be there afterwards — a reset appends,
  // it never erases.
  // -------------------------------------------------------------------------
  edit(root, 'llm/claims.md',
    '  — HUMAN VERIFIED (PR #42, 2026-09-23)\n',
    '  — HUMAN VERIFIED (PR #42, 2026-09-23)\n  — NOT VERIFIED (claim text edited, 2026-09-23)\n');
  const out3 = path.join(dir, 'e3.json');
  const r3 = surface(root, ['--out', out3]);
  const m3 = readJson(out3);
  const c3 = claimOf(m3, 'P1-AC-01');
  check(
    'append-only: acknowledging the drift by APPENDING clears it, exit 0',
    r3.code === 0 && c3.state === 'NOT VERIFIED' &&
      c3.current_marker === '— NOT VERIFIED (claim text edited, 2026-09-23)',
    `exit=${r3.code}\n${r3.out}`
  );
  check(
    'append-only: the prior HUMAN VERIFIED marker is still visible in history',
    c3.history.includes('— HUMAN VERIFIED (PR #42, 2026-09-23)') &&
      c3.history.includes('— AGENT VERIFIED (PR #41, 2026-09-22)') &&
      c3.markers.length === 3,
    JSON.stringify(c3.history)
  );
  clean(dir);
}

// E4. The refusal is not a tool that never writes. The documented escape hatch
// must actually work, out loud — otherwise the baseline could never be rebuilt
// after a legitimate re-verification.
{
  const { dir, root } = fixture();
  const baseline = path.join(root, BASELINE_REL);
  const before = fs.readFileSync(baseline);
  edit(root, 'llm/claims.md',
    'duplicate source IDs are rejected.', 'duplicate source IDs are silently merged.');
  const { out: log } = surface(root, ['--accept-baseline-rewrite']);
  check(
    'D3: --accept-baseline-rewrite does overwrite — the refusal has a stated way out',
    Buffer.compare(before, fs.readFileSync(baseline)) !== 0 && !/NOT WRITTEN/.test(log),
    log
  );
  clean(dir);
}

// F2. D4 — marker-block mutation. Deleting a marker line hides exactly the
// event that matters most, and §3.5 says removal "is mechanically checkable".
{
  const { dir, root } = fixture();
  edit(root, 'llm/claims.md',
    '(activity-plan §13.1)\n  — AGENT VERIFIED (PR #41, 2026-09-22)\n  — HUMAN VERIFIED (PR #42, 2026-09-23)\n',
    '(activity-plan §13.1)\n  — HUMAN VERIFIED (PR #42, 2026-09-23)\n');
  const out = path.join(dir, 'f2.json');
  const { code } = surface(root, ['--out', out]);
  const m = readJson(out);
  check(
    'append-only: DELETING a prior marker line is caught as `marker-history-mutated`',
    code !== 0 && findingsOf(m, 'marker-history-mutated').some(
      (f) => f.subject === 'P1-AC-01' && /AGENT VERIFIED \(PR #41, 2026-09-22\)/.test(f.message)
    ),
    codes(m)
  );
  clean(dir);
}

// ===========================================================================
// G. Determinism (§14.1 L3). Ten real subprocesses now run on every
// invocation, and the manifest must still be a pure function of its inputs.
// Run with the REAL clock: pinning `--generated-at` would make this vacuous.
// ===========================================================================

{
  const { dir, root } = fixture();
  const p1 = path.join(dir, 'g1.json');
  const p2 = path.join(dir, 'g2.json');
  surface(root, ['--out', p1, '--quiet'], { pin: false });
  surface(root, ['--out', p2, '--quiet'], { pin: false });
  const a = fs.readFileSync(p1, 'utf8').split('\n');
  const b = fs.readFileSync(p2, 'utf8').split('\n');
  const differing = a.map((l, i) => [i, l, b[i]]).filter(([, l, r]) => l !== r);
  check(
    'two runs over identical inputs differ in `generated_at` and nothing else',
    a.length === b.length && differing.length === 1 && /"generated_at"/.test(differing[0][1]),
    differing.map(([i, l, r]) => `line ${i + 1}:\n  < ${l}\n  > ${r}`).join('\n') || '(no differing lines at all)'
  );
  check(
    'content_sha256 is identical across runs, even though real processes ran',
    readJson(p1).content_sha256 === readJson(p2).content_sha256 &&
      readJson(p1).generated_at !== readJson(p2).generated_at,
    `${readJson(p1).content_sha256}\n${readJson(p2).content_sha256}`
  );
  // Durations are real and therefore vary; they are kept out of the manifest
  // rather than excluded from the hash, so a two-run diff stays one line long.
  check(
    'wall-clock timings are not in the manifest at all',
    !/"duration_ms"|"started_at"|"finished_at"/.test(fs.readFileSync(p1, 'utf8')),
    'a timing field reached the manifest'
  );
  clean(dir);
}

// ===========================================================================
// H. No fabrication (§4.2 "never silent, never invented"; the fixture delta's
// `Pages mechanism: none`).
// ===========================================================================

{
  const { dir, root } = fixture();
  const out = path.join(dir, 'h1.json');
  surface(root, ['--out', out, '--quiet']);
  const text = fs.readFileSync(out, 'utf8');
  check(
    'no absolute URL appears in the manifest under `Pages mechanism: none`',
    !/[a-z][a-z0-9+.-]*:\/\//i.test(text),
    (text.match(/[a-z][a-z0-9+.-]*:\/\/\S{0,60}/gi) ?? []).slice(0, 5).join('\n')
  );
  clean(dir);
}

// DEFECT INJECTED: an absolute `Surface root:` under `Pages mechanism: none`.
// Proving the guardrail CAN fire — otherwise the assertion above is just a
// statement that the fixture happens to contain no URLs.
{
  const { dir, root } = fixture();
  edit(root, 'llm/governance/governance-delta.md',
    'Surface root: plugin/scripts/fixtures/slice', 'Surface root: https://example.org/pub');
  const out = path.join(dir, 'h2.json');
  const { code, out: log } = surface(root, ['--no-previous', '--out', out]);
  check(
    'the URL guardrail refuses to write the manifest at all (exit 2)',
    code === 2 && /refusing to emit absolute URLs/.test(log) && !fs.existsSync(out),
    `exit=${code} written=${fs.existsSync(out)}\n${log}`
  );
  clean(dir);
}

// DEFECT INJECTED: a declared PDataset path that is absent on disk. The
// requirement is `missing` plus a visible gap — never a fabricated hash, link,
// byte count or row count, and never silence.
{
  const { dir, root } = fixture();
  edit(root, 'llm/pdatasets.md', '- path: data/source.csv', '- path: data/nowhere.csv');
  const out = path.join(dir, 'h3.json');
  const { code } = surface(root, ['--no-previous', '--out', out, '--quiet']);
  const m = readJson(out);
  const d = m.verification.pdatasets.find((x) => x.id === 'S1-DS-01');
  check(
    'a missing declared path resolves to `missing` with every derived field null',
    code !== 0 && d.link_resolution === 'missing' &&
      d.sha256 === null && d.bytes === null && d.rows === null &&
      d.view_url === null && d.download_url === null,
    JSON.stringify(d, null, 1)
  );
  check(
    'a missing declared path is a finding AND a gap AND in coverage — never silence',
    findingsOf(m, 'missing-declared-source').some((f) => f.subject === 'S1-DS-01') &&
      m.gaps.some((g) => g.subject === 'S1-DS-01' && g.field === 'path') &&
      m.verification.coverage.pdatasets_missing.includes('S1-DS-01'),
    `${codes(m)}\ngaps: ${JSON.stringify(m.gaps)}`
  );
  clean(dir);
}

// The same rule on the other declared-source path: an evidence `locator:` that
// does not exist.
{
  const { dir, root } = fixture();
  edit(root, 'evidence/attestations.md',
    'locator: evidence/attestations.md', 'locator: evidence/does-not-exist.md');
  const out = path.join(dir, 'h4.json');
  const { code } = surface(root, ['--no-previous', '--out', out, '--quiet']);
  const m = readJson(out);
  check(
    'a dangling evidence locator is a finding and a gap',
    code !== 0 &&
      findingsOf(m, 'missing-declared-source').some((f) => f.subject === 'P1-AC-02') &&
      m.gaps.some((g) => g.subject === 'P1-AC-02' && g.field === 'locator'),
    `${codes(m)}\ngaps: ${JSON.stringify(m.gaps)}`
  );
  clean(dir);
}

// ===========================================================================
// I. Un-ID'd claims (§3.2). Adoption is incremental, so a claim line with no
// ID is legal — but it must be COUNTED and REPORTED, never quietly dropped.
// ===========================================================================

{
  const { dir, root } = fixture();
  const out = path.join(dir, 'i1.json');
  const { out: log } = surface(root, ['--out', out]);
  const m = readJson(out);
  check(
    "an un-ID'd claim is carried, counted and printed",
    m.verification.coverage.unidentified_claim_lines === 1 &&
      m.verification.unidentified_claims.length === 1 &&
      /published to the project website/.test(m.verification.unidentified_claims[0].text) &&
      /\(un-ID'd\)/.test(log),
    log
  );
  clean(dir);
}

// DEFECT INJECTED: a second un-ID'd line. If the count were a constant, or the
// list were truncated to the first, this is where it shows.
{
  const { dir, root } = fixture();
  fs.appendFileSync(path.join(root, 'llm/claims.md'),
    '- [ ] A second claim line carrying no claim ID at all.\n');
  const out = path.join(dir, 'i2.json');
  surface(root, ['--no-previous', '--out', out, '--quiet']);
  const m = readJson(out);
  check(
    "a second un-ID'd claim is counted too — the tally is derived, not fixed",
    m.verification.coverage.unidentified_claim_lines === 2 &&
      m.verification.unidentified_claims.length === 2 &&
      m.verification.unidentified_claims.some((c) => /no claim ID at all/.test(c.text)),
    JSON.stringify(m.verification.unidentified_claims)
  );
  clean(dir);
}

// ===========================================================================
// J. replay.mjs — the runner. `surface.mjs` now executes command strings read
// out of files in the tree it is auditing, so the boundary is load-bearing.
// ===========================================================================

function replay(root, command) {
  const r = spawnSync('node', [REPLAY, '--root', root, '--command', command], { encoding: 'utf8' });
  // Same principle as readJson: a runner that printed no record is a result,
  // so the assertions below go red by name rather than throwing.
  let record = {};
  try { record = JSON.parse(r.stdout); } catch { /* left empty */ }
  return { code: r.status ?? 1, record, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

{
  const { dir, root } = fixture();
  const ok = replay(root, 'node checks/ac01-duplicate-rejection.mjs');
  check(
    'replay: a real in-root check runs and its outcome comes from the exit status',
    ok.code === 0 && ok.record.executed === true && ok.record.outcome === 'pass' &&
      ok.record.outcome_source === 'executed' && ok.record.exit_status === 0 &&
      typeof ok.record.artifact_sha256 === 'string',
    ok.out
  );

  // DEFECT INJECTED: a command that would need a shell. Refused, not
  // sanitized, and never reported as a pass.
  const sh = replay(root, 'bash -c "echo pass"');
  check(
    'replay: a command with shell metacharacters is REFUSED, never executed',
    sh.record.executed === false && sh.record.outcome === null &&
      sh.record.outcome_source === 'unexecuted' && /shell metacharacters/.test(sh.record.unexecuted_reason),
    sh.out
  );

  // DEFECT INJECTED: a path escape out of the declared surface root.
  const esc = replay(root, 'node ../../../../../etc/passwd');
  check(
    'replay: a script resolving outside the surface root is REFUSED',
    esc.record.executed === false && esc.record.outcome === null &&
      /outside the declared surface root/.test(esc.record.unexecuted_reason),
    esc.out
  );
  clean(dir);
}

// An unexecutable replay must never soften into a pass: surface.mjs turns it
// into a gap and an error, and no claim keeps a human state on it.
{
  const { dir, root } = fixture();
  const out = path.join(dir, 'j2.json');
  const { code } = surface(root, ['--no-previous', '--no-execute', '--out', out, '--quiet']);
  const m = readJson(out);
  check(
    '--no-execute produces gaps and errors, and lifts no claim above AGENT VERIFIED',
    code !== 0 && findingsOf(m, 'replay-not-executed').length > 0 && m.gaps.length > 0 &&
      !m.verification.claims.some((c) => c.state === 'HUMAN VERIFIED'),
    m.verification.claims.map((c) => `${c.id} ${c.state}`).join('\n')
  );
  clean(dir);
}

// ===========================================================================
// K. surface-html.mjs — the projection. `Renderer: none` (design §7.3): one
// self-contained page, no script, no network at build time and none at view
// time, and byte-identical over an unchanged manifest.
// ===========================================================================

// A repo-shaped tree, because the page's links are repo-relative and their
// resolution is what its exit code reports.
function htmlRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'surfhtml-'));
  fs.mkdirSync(path.join(dir, 'plugin/scripts/fixtures'), { recursive: true });
  fs.cpSync(FIXTURE, path.join(dir, 'plugin/scripts/fixtures/slice'), { recursive: true });
  return dir;
}

const PAGE_REL = 'docs/verification/index.html';

function renderHtml(repo, args = []) {
  const r = spawnSync('node', [SURFACE_HTML, '--repo-root', repo, '--out', PAGE_REL, ...args], { encoding: 'utf8' });
  const abs = path.join(repo, PAGE_REL);
  return {
    code: r.status ?? 1,
    out: `${r.stdout ?? ''}${r.stderr ?? ''}`,
    page: fs.existsSync(abs) ? fs.readFileSync(abs) : null,
  };
}

{
  const repo = htmlRepo();

  // The fixture copy alone is missing the repo files the manifest cites
  // (the design spec, the generators). Those must be REPORTED, not dropped.
  const partial = renderHtml(repo);
  const missing = [...partial.out.matchAll(/^\s+MISSING\s+(\S+)$/gm)].map((m) => m[1]);
  check(
    'html: an unresolved link is reported, rendered as a gap marker, and sets exit 1',
    partial.code === 1 && missing.length > 0 && partial.page !== null &&
      (partial.page.toString().match(/MISSING ON DISK/g) ?? []).length === missing.length,
    `exit=${partial.code} missing=${JSON.stringify(missing)}\n${partial.out}`
  );

  // Materialise exactly the paths it named. If the report were noise, this
  // would not clear it.
  for (const rel of missing) {
    const abs = path.join(repo, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (!fs.existsSync(abs)) fs.writeFileSync(abs, '');
  }

  const a = renderHtml(repo);
  const b = renderHtml(repo);
  // A refused render writes no page; keep that a red assertion, not a TypeError.
  const pageA = a.page ?? Buffer.alloc(0);
  const pageB = b.page ?? Buffer.alloc(0);
  check(
    'html: creating exactly the reported paths clears every unresolved link, exit 0',
    a.code === 0 && /0 unresolved/.test(a.out) && !/MISSING ON DISK/.test(pageA.toString()),
    `exit=${a.code}\n${a.out}`
  );
  check(
    'html: two runs over an unchanged manifest are byte-identical',
    a.page !== null && b.page !== null && Buffer.compare(pageA, pageB) === 0,
    `${pageA.length} bytes vs ${pageB.length} bytes`
  );
  const page = pageA.toString();
  check(
    'html: the page emits no <script> and no absolute URL',
    !/<script/i.test(page) && !/[a-z][a-z0-9+.-]*:\/\//i.test(page),
    (page.match(/<script[^>]*>|[a-z][a-z0-9+.-]*:\/\/\S{0,60}/gi) ?? []).slice(0, 5).join('\n')
  );
  clean(repo);
}

// DEFECT INJECTED: an absolute URL smuggled into the manifest the renderer
// consumes. `Pages mechanism: none` must hold for the page too, and the
// renderer must refuse rather than emit it.
{
  const repo = htmlRepo();
  editJson(path.join(repo, 'plugin/scripts/fixtures/slice', BASELINE_REL), (m) => {
    m.verification.pdatasets[0].view_url = 'https://example.org/data/source.csv';
  });
  const r = renderHtml(repo);
  check(
    'html: an absolute URL in the manifest is refused, and no page is written',
    r.code === 2 && /refusing to emit absolute URLs/.test(r.out) && r.page === null,
    `exit=${r.code} written=${r.page !== null}\n${r.out}`
  );
  clean(repo);
}

// DEFECT INJECTED: a <script> tag smuggled through a claim sentence. The page
// is built from text the repository authors control, so the escaping is a
// guardrail and not a formality.
{
  const repo = htmlRepo();
  editJson(path.join(repo, 'plugin/scripts/fixtures/slice', BASELINE_REL), (m) => {
    m.verification.claims[0].text = '<script>alert(1)</script> smuggled';
  });
  const r = renderHtml(repo);
  const page = r.page === null ? '' : r.page.toString();
  check(
    'html: a <script> tag in claim text is escaped, never emitted as markup',
    r.page !== null && !/<script/i.test(page) && page.includes('&lt;script&gt;'),
    (page.match(/<script[^>]*>/gi) ?? []).join('\n') || 'the escaped form was not found either'
  );
  clean(repo);
}

console.log(failed === 0 ? '\nall regression tests passed' : `\n${failed} regression test(s) failed`);
process.exit(failed === 0 ? 0 : 1);
