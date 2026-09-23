#!/usr/bin/env node
// EVIDENCE P1-AC-04
// kind: test
// determinism: L3
// produced-by: fixture-builder (agent)
// produced-at: 2026-09-22
// pdatasets: S1-DS-01
// replay: node checks/ac04-transform-runs.mjs
// replay-expect: pass
// replay-outcome: pass
// modified-replay: node checks/ac04-transform-runs.mjs --perturb accept-duplicates
// modified-replay-perturbation: stop rejecting duplicate source ids in the transformation
// modified-replay-expect: fail
// modified-replay-outcome: pass
//
// ******************************************************************
// THIS CHECK IS DELIBERATELY VACUOUS. It is the fixture's reason to
// exist (activity plan §13.1). Do not "fix" it.
// ******************************************************************
//
// P1-AC-04 — "The transformation runs to completion without error on the
// committed source dataset."
//
// The claim is true, the check passes, and the check asserts nothing about
// what the transformation produced. REPLAY passes. MODIFIED REPLAY breaks
// the transformation's duplicate-rejection rule and this check STILL PASSES
// — it fails to fail. `surface.mjs` must therefore report P1-AC-04 as
// `unfalsified`: verified to run, not verified to matter (design §14.4).
//
// The `modified-replay-outcome: pass` header line above records that
// observed outcome honestly — but the detector no longer BELIEVES it. Since
// 2026-09-23 `surface.mjs` runs `replay.mjs` over both commands and reads the
// exit status, so this line is `attested_outcome` and the exit status is
// `recorded_outcome`. Editing this line to `fail` does not promote the claim;
// it produces a `replay-outcome-misreported` error naming the file, because
// the MODIFIED REPLAY still exits 0 when it is actually run. That is the
// whole point: a verdict must not be a function of a comment.

import fs from 'node:fs';
import { normalize, SOURCE_PATH } from '../transform.mjs';

const perturbIdx = process.argv.indexOf('--perturb');
const perturb = perturbIdx >= 0 ? process.argv[perturbIdx + 1] : undefined;
const label = perturb ? `MODIFIED REPLAY (--perturb ${perturb})` : 'REPLAY';

try {
  const { csv } = normalize(fs.readFileSync(SOURCE_PATH, 'utf8'), { perturb });
  // The vacuity: the only thing asserted is that a string came back.
  if (typeof csv !== 'string' || csv.length === 0) {
    process.stdout.write(`FAIL P1-AC-04 ${label}: transformation produced no output\n`);
    process.exit(1);
  }
} catch (err) {
  process.stdout.write(`FAIL P1-AC-04 ${label}: transformation threw: ${err.message}\n`);
  process.exit(1);
}
process.stdout.write(`PASS P1-AC-04 ${label}: the transformation ran to completion\n`);
