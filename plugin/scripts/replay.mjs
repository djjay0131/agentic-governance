#!/usr/bin/env node
// replay.mjs — the replay runner: it EXECUTES a declared REPLAY or MODIFIED
// REPLAY command as a subprocess and returns an execution record
// (agentic-governance design
// llm/specs/2026-09-18-human-verification-capability-design.md §14.2, §5.5).
//
// Why this file exists. Before it, `surface.mjs` derived `replay-outcome` and
// `modified-replay-outcome` from COMMENT LINES inside the very artifact whose
// soundness was in question. Nothing ran. One word in a comment
// (`pass` -> `fail`) promoted a deliberately vacuous check to
// `HUMAN VERIFIED`. An outcome nobody observed is testimony — `L1` by design
// §14.1 — and testimony can never satisfy a human state (§5.3 mechanism 4).
//
// The contract, stated so it can be attacked:
//
//   * Every outcome this module reports was OBSERVED. `outcome: 'pass'` means
//     a real child process exited 0; `'fail'` means it exited non-zero.
//   * A non-zero exit says only that the process died. It does not say the
//     check REACHED its assertion and refused it. `failure_shape` separates
//     the two: a child that produced nothing on stdout and wrote only to
//     stderr did not report a failure, it BROKE. The caller needs this
//     because design §14.4 makes a failing MODIFIED REPLAY a precondition for
//     `HUMAN VERIFIED`, and a check that fails because its input is missing
//     is not a check that failed because the perturbation worked.
//   * A command that CANNOT be executed is never a pass and never a silent
//     skip. It comes back `executed: false` with a stated `unexecuted_reason`,
//     which the caller must turn into a visible gap and a non-zero finding —
//     this repo's `SKIP — NOT VERIFIED` idiom.
//   * MODIFIED REPLAY must FAIL. That semantic lives in the caller
//     (`surface.mjs`); what lives here is the honest exit status it needs.
//
// Bounded execution. The declared command is an untrusted string from a file
// in the tree, so this module never hands it to a shell:
//
//   * `spawnSync` with `shell: false` — no globbing, no `;`, no pipes, no
//     substitution. A command containing shell metacharacters is REFUSED,
//     not sanitized.
//   * The program must be `node`. The allowlist is closed and small on
//     purpose: the surface engine's whole job is to execute in-repo checks.
//   * The script and every path-shaped argument must resolve INSIDE the
//     declared surface root, after `realpath`. An absolute path, a `..`
//     escape or a symlink out of the tree is REFUSED.
//   * A wall-clock timeout, a bounded output buffer and a pruned environment.
//
// Plain Node, ZERO dependencies, no network. `node:child_process` is a
// builtin, the same discipline as `governance-checks.mjs` and `surface.mjs`.
//
// Usage (as a CLI — the module form is what `surface.mjs` imports):
//   node replay.mjs --root <dir> --command "node checks/ac01-x.mjs"
//   node replay.mjs --root <dir> --command "node checks/ac01-x.mjs" --ledger /tmp/l.json
//
// Exit codes (CLI):
//   0  the command was executed; the record is on stdout (read `outcome`)
//   2  the command was refused or could not be executed; the record says why

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const REPLAY_SCHEMA = 'replay-record/v1';
export const DEFAULT_TIMEOUT_MS = 60000;
export const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

/** The closed program allowlist. Bounded execution, not arbitrary execution. */
const ALLOWED_PROGRAMS = new Set(['node']);

/**
 * Anything that would mean something to a shell. The runner never uses a
 * shell, so these characters cannot do what their author intended; a command
 * containing them is refused rather than silently executed with a different
 * meaning than it reads.
 */
const SHELL_METACHARACTERS = /[;&|<>$`\\"'(){}[\]\n\r\t*?~!#]/;

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const posix = (p) => p.split(path.sep).join('/');

/** Canonical JSON: keys sorted, so a hash depends on content and never on key order. */
function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
}

function realpathOrSelf(p) {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

/** Is `abs` inside `root`, after both have been resolved through any symlink? */
function inside(rootReal, abs) {
  const target = realpathOrSelf(abs);
  const rel = path.relative(rootReal, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Plan a declared command string into an argv the runner may execute.
 *
 * Returns `{ ok: true, program, argv, artifact }` or `{ ok: false, reason }`.
 * `artifact` is the executed script, root-relative and POSIX-separated: it is
 * the thing whose `sha256` the execution record binds (design §5.5).
 */
export function planCommand(command, root) {
  const rootReal = realpathOrSelf(root);
  if (typeof command !== 'string' || command.trim() === '') {
    return { ok: false, reason: 'no command declared' };
  }
  if (SHELL_METACHARACTERS.test(command)) {
    return {
      ok: false,
      reason: 'the command contains shell metacharacters; the runner spawns a program directly and '
        + 'never a shell, so it is refused rather than executed with a different meaning',
    };
  }
  const tokens = command.trim().split(/\s+/);
  const program = tokens[0];
  if (!ALLOWED_PROGRAMS.has(program)) {
    return {
      ok: false,
      reason: `program \`${program}\` is not in the execution allowlist (${[...ALLOWED_PROGRAMS].join(', ')}); `
        + 'execution is bounded to in-repo checks',
    };
  }
  const script = tokens[1];
  if (script === undefined || script.startsWith('-')) {
    return { ok: false, reason: `\`${program}\` was declared with no script to run` };
  }
  if (path.isAbsolute(script)) {
    return { ok: false, reason: `script \`${script}\` is an absolute path; commands are resolved inside the declared root` };
  }
  const scriptAbs = path.resolve(rootReal, script);
  if (!inside(rootReal, scriptAbs)) {
    return { ok: false, reason: `script \`${script}\` resolves outside the declared surface root` };
  }
  let isFile = false;
  try { isFile = fs.statSync(scriptAbs).isFile(); } catch { isFile = false; }
  if (!isFile) {
    return { ok: false, reason: `script \`${script}\` does not exist on disk` };
  }

  const args = tokens.slice(2);
  for (const arg of args) {
    if (path.isAbsolute(arg)) {
      return { ok: false, reason: `argument \`${arg}\` is an absolute path; arguments are resolved inside the declared root` };
    }
    if (arg.includes('/') && !inside(rootReal, path.resolve(rootReal, arg))) {
      return { ok: false, reason: `argument \`${arg}\` resolves outside the declared surface root` };
    }
  }

  return {
    ok: true,
    program,
    script,
    scriptAbs,
    args,
    artifact: posix(path.relative(rootReal, scriptAbs)),
    rootReal,
  };
}

/**
 * The path-shaped arguments a declared command names, root-relative.
 *
 * Tokenization lives here, beside `planCommand`, so a caller that wants to ask
 * "does the perturbed input this command names actually exist?" is reading the
 * same argument list the runner will execute, not a second parse of the same
 * string. The program and the script are excluded: `planCommand` already
 * refuses a script that is not on disk.
 *
 * `--flag=path` is split on the first `=`, because that is what a child
 * process does with it.
 */
export function commandInputPaths(command) {
  if (typeof command !== 'string' || command.trim() === '') return [];
  if (SHELL_METACHARACTERS.test(command)) return [];
  const out = [];
  for (const token of command.trim().split(/\s+/).slice(2)) {
    const candidate = token.startsWith('-') && token.includes('=')
      ? token.slice(token.indexOf('=') + 1)
      : token;
    if (candidate === '' || candidate.startsWith('-')) continue;
    if (!candidate.includes('/')) continue;
    out.push(candidate);
  }
  return out;
}

/**
 * Redact anything machine-specific or link-shaped out of a captured line.
 *
 * The manifest must be byte-identical between two machines, and under
 * `Pages mechanism: none` nothing in it may look like a published URL
 * (design §4.2). Captured output is the one place a stray absolute path
 * could get in, so it is scrubbed here rather than trusted.
 */
function redact(text, rootReal) {
  let s = String(text).replace(/\r/g, '');
  const firstLine = s.split('\n').find((l) => l.trim() !== '') ?? '';
  s = firstLine;
  for (const prefix of [rootReal, process.cwd()]) {
    if (prefix) s = s.split(prefix).join('.');
  }
  s = s.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<url>');
  s = s.replace(/(^|\s)(\/[^\s]+)/g, '$1<path>');
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return s.length > 200 ? `${s.slice(0, 197)}...` : s;
}

/**
 * WHICH KIND of failure a non-zero exit was.
 *
 * `'asserted'` — the check ran far enough to say something on stdout and then
 * exited non-zero. That is a check reporting a refusal: the shape a MODIFIED
 * REPLAY must have for design §14.2's "it failed as it must" to mean anything.
 *
 * `'crashed'` — the process produced NOTHING of its own on stdout and wrote
 * only to stderr. A missing input file, an unresolved import, a syntax error:
 * the harness broke before it could assert. Graded as a falsification, this is
 * the cheapest way in the world to satisfy §14.4 — declare a perturbation
 * input that was never committed and let `ENOENT` do the work.
 *
 * The discriminator is deliberately a property of the OBSERVED streams and not
 * of the stderr text: parsing a stack trace would make the grade a function of
 * Node's diagnostic wording. The caller decides what to do with the shape;
 * this module only reports what it saw.
 *
 * It errs toward `'crashed'`: a check that reports its refusal on stderr alone
 * is indistinguishable here from one that died, and the safe reading of an
 * ambiguous failure is that nothing was falsified. A check that wants to be
 * read as asserting says so on stdout, which every check in this repo does.
 */
function failureShape(status, stdout, stderr) {
  if (status === 0) return null;
  return stdout.length === 0 && stderr.length > 0 ? 'crashed' : 'asserted';
}

function identify(record) {
  return sha256(Buffer.from(stable({
    command: record.command,
    cwd: record.cwd,
    artifact: record.artifact,
    artifact_sha256: record.artifact_sha256,
    executed: record.executed,
    unexecuted_reason: record.unexecuted_reason,
    exit_status: record.exit_status,
    signal: record.signal,
    stdout_sha256: record.stdout_sha256,
    stderr_sha256: record.stderr_sha256,
  }), 'utf8'));
}

function unexecuted(command, cwdLabel, reason, extra = {}) {
  const rec = {
    schema: REPLAY_SCHEMA,
    command,
    cwd: cwdLabel,
    artifact: null,
    artifact_sha256: null,
    executed: false,
    unexecuted_reason: reason,
    exit_status: null,
    signal: null,
    timed_out: false,
    // Never a pass, never a silent skip: an outcome nobody observed is `null`.
    outcome: null,
    outcome_source: 'unexecuted',
    // Nothing ran, so there is no failure to shape. See `failureShape`.
    failure_shape: null,
    stdout_sha256: null,
    stderr_sha256: null,
    stdout_bytes: null,
    stderr_bytes: null,
    stdout_first_line: null,
    ...extra,
  };
  rec.execution_id = identify(rec);
  return rec;
}

/**
 * EXECUTE one declared command and return an execution record.
 *
 * @param {object} opts
 * @param {string} opts.root      the directory execution is bound to
 * @param {string} opts.command   the declared command string, verbatim
 * @param {string} [opts.cwdLabel] the repo-relative label recorded as `cwd`
 * @param {number} [opts.timeoutMs]
 * @returns {object} the execution record. `timing` carries `duration_ms`,
 *   `started_at` and `finished_at`; they vary between runs and callers that
 *   hash their output must keep them out of that hash.
 */
export function executeCommand({ root, command, cwdLabel = null, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const label = cwdLabel ?? '.';
  const plan = planCommand(command, root);
  if (!plan.ok) return unexecuted(command, label, plan.reason);

  const artifactSha = sha256(fs.readFileSync(plan.scriptAbs));
  const startedAt = new Date().toISOString();
  const t0 = process.hrtime.bigint();
  const res = spawnSync(process.execPath, [plan.scriptAbs, ...plan.args], {
    cwd: plan.rootReal,
    shell: false,
    timeout: timeoutMs,
    maxBuffer: MAX_OUTPUT_BYTES,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      TMPDIR: process.env.TMPDIR ?? '',
      LANG: 'C',
      LC_ALL: 'C',
      TZ: 'UTC',
    },
  });
  const durationMs = Number((process.hrtime.bigint() - t0) / 1000000n);
  const finishedAt = new Date(Date.parse(startedAt) + durationMs).toISOString();
  const timing = { duration_ms: durationMs, started_at: startedAt, finished_at: finishedAt };

  const base = {
    artifact: plan.artifact,
    artifact_sha256: artifactSha,
    timing,
  };

  if (res.error) {
    const timedOut = res.error.code === 'ETIMEDOUT' || res.signal === 'SIGTERM';
    return unexecuted(command, label,
      timedOut
        ? `the command did not finish within ${timeoutMs}ms and was killed`
        : `the command could not be run: ${res.error.code ?? res.error.message}`,
      { ...base, timed_out: timedOut });
  }
  if (res.signal) {
    return unexecuted(command, label, `the command was killed by signal ${res.signal}`,
      { ...base, signal: res.signal });
  }

  const stdout = res.stdout ?? Buffer.alloc(0);
  const stderr = res.stderr ?? Buffer.alloc(0);
  const rec = {
    schema: REPLAY_SCHEMA,
    command,
    cwd: label,
    artifact: plan.artifact,
    artifact_sha256: artifactSha,
    executed: true,
    unexecuted_reason: null,
    exit_status: res.status,
    signal: null,
    timed_out: false,
    // The whole point of this module: the outcome is OBSERVED, not declared.
    outcome: res.status === 0 ? 'pass' : 'fail',
    outcome_source: 'executed',
    // `null` on a pass; on a failure, WHICH KIND of failure it was.
    failure_shape: failureShape(res.status, stdout, stderr),
    stdout_sha256: sha256(stdout),
    stderr_sha256: sha256(stderr),
    stdout_bytes: stdout.length,
    stderr_bytes: stderr.length,
    stdout_first_line: redact(stdout.toString('utf8'), plan.rootReal),
    timing,
  };
  rec.execution_id = identify(rec);
  return rec;
}

/**
 * The deterministic projection of an execution record.
 *
 * `timing` is dropped: durations and wall-clock timestamps vary between two
 * runs over identical inputs, and the surface manifest's whole determinism
 * claim is that two runs differ only in `generated_at`. The timings are kept
 * in the replay ledger, which is a log and says so.
 */
export function manifestRecord(rec) {
  if (!rec) return null;
  const { timing, ...rest } = rec;
  void timing;
  return rest;
}

/** Write the full execution records, timings included, as a replay ledger. */
export function writeLedger(records, outPath, meta = {}) {
  const ledger = {
    schema: 'replay-ledger/v1',
    note: 'A LOG, not a manifest: `timing` varies between runs by design. '
      + 'The surface manifest carries the deterministic projection of these records.',
    ...meta,
    records,
  };
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outPath), `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  const value = (name, fallback = null) => {
    const i = argv.indexOf(name);
    if (i < 0) return fallback;
    const v = argv[i + 1];
    if (v === undefined) {
      process.stderr.write(`replay.mjs: ${name} requires a value\n`);
      process.exit(2);
    }
    return v;
  };
  const root = path.resolve(value('--root', '.'));
  const command = value('--command', null);
  if (!command) {
    process.stderr.write('replay.mjs: --command "<node script args>" is required\n');
    return 2;
  }
  const timeoutMs = Number(value('--timeout', String(DEFAULT_TIMEOUT_MS)));
  const rec = executeCommand({
    root,
    command,
    cwdLabel: value('--cwd-label', null),
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
  });
  const ledger = value('--ledger', null);
  if (ledger) writeLedger([rec], ledger, { root: posix(path.basename(root)) });
  process.stdout.write(`${JSON.stringify(rec, null, 2)}\n`);
  return rec.executed ? 0 : 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
