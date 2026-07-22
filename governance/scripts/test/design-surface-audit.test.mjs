import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseDeltaBlock,
  computeManifest,
  generate,
  auditDesignSurface,
} from '../design-surface.mjs';

function fixtureWithSurface() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsa-'));
  fs.mkdirSync(path.join(root, 'docs', 'adr'), { recursive: true });
  fs.mkdirSync(path.join(root, 'llm', 'memory-bank'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs', 'governance-delta.md'),
    [
      '## Design Surface', '', 'Status: ENABLED',
      'Taxonomy source: none', 'Taxonomy rendered: none',
      'ADR dir: docs/adr', 'Memory bank: llm/memory-bank',
      'Narrative sources: docs/adr', 'Output dir: docs/design',
      'Pages mechanism: none', 'Narrative review: required', '',
    ].join('\n')
  );
  fs.writeFileSync(path.join(root, 'docs', 'adr', '0001-x.md'), '# ADR-0001: X\n\nStatus: Accepted\n');
  fs.writeFileSync(path.join(root, 'llm', 'memory-bank', 'a.md'), 'v1\n');
  return root;
}

test('audit is clean immediately after generate + a current narrative', () => {
  const root = fixtureWithSurface();
  const decl = parseDeltaBlock(fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8'));
  const { manifest } = generate(root, decl, 'docs/design', { now: '2026-07-22T00:00:00Z' });
  const narr = path.join(root, 'docs', 'design', 'narrative.md');
  fs.writeFileSync(narr, `<!-- narrative_inputs_hash: ${manifest.narrative_inputs_hash} -->\n\n# What we built\n`);
  const findings = auditDesignSurface(root, decl, { out: 'docs/design', narrative: 'docs/design/narrative.md' });
  assert.deepEqual(findings, []);
});

test('audit flags a stale narrative after a source changes', () => {
  const root = fixtureWithSurface();
  const decl = parseDeltaBlock(fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8'));
  const { manifest } = generate(root, decl, 'docs/design', { now: '2026-07-22T00:00:00Z' });
  const narr = path.join(root, 'docs', 'design', 'narrative.md');
  fs.writeFileSync(narr, `<!-- narrative_inputs_hash: ${manifest.narrative_inputs_hash} -->\n\n# What we built\n`);
  // A new ADR lands after the narrative was written.
  fs.writeFileSync(path.join(root, 'docs', 'adr', '0002-y.md'), '# ADR-0002: Y\n\nStatus: Proposed\n');
  const findings = auditDesignSurface(root, decl, { out: 'docs/design', narrative: 'docs/design/narrative.md' });
  assert.ok(findings.some((f) => f.kind === 'stale-narrative'));
});
