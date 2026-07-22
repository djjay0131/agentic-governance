import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  hashString,
  section,
  parseDeltaBlock,
  computeManifest,
  generate,
  adrMeta,
  buildAdrIndex,
} from '../design-surface.mjs';

// Build a throwaway fixture repo. Returns its absolute root.
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-'));
  fs.mkdirSync(path.join(root, 'docs', 'adr'), { recursive: true });
  fs.mkdirSync(path.join(root, 'llm', 'memory-bank'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs', 'governance-delta.md'),
    [
      '# Governance Delta: Fixture',
      '',
      '## Design Surface',
      '',
      'Status: ENABLED',
      'Taxonomy source: docs/seed_taxonomy.yml',
      'Taxonomy rendered: docs/topic-taxonomy.md',
      'ADR dir: docs/adr',
      'Memory bank: llm/memory-bank',
      'Narrative sources: docs/adr, llm/memory-bank',
      'Output dir: docs/design',
      'Pages mechanism: jekyll',
      'Narrative review: required',
      '',
      '## Related Repos',
      '',
      'none',
      '',
    ].join('\n')
  );
  fs.writeFileSync(path.join(root, 'docs', 'seed_taxonomy.yml'), 'topics:\n  - alpha\n  - beta\n');
  fs.writeFileSync(path.join(root, 'docs', 'topic-taxonomy.md'), '# Topics\n\n- Alpha\n- Beta\n');
  fs.writeFileSync(
    path.join(root, 'docs', 'adr', '0001-first.md'),
    '# ADR-0001: First Decision\n\nStatus: Accepted\n\n## Supersedes\n\nNone.\n'
  );
  fs.writeFileSync(path.join(root, 'llm', 'memory-bank', 'activeContext.md'), 'ctx v1\n');
  return root;
}

test('section extracts a markdown section body', () => {
  const body = section('## A\n\nalpha\n\n## B\n\nbeta\n', 'A');
  assert.equal(body, 'alpha');
});

test('parseDeltaBlock reads the Design Surface declaration', () => {
  const root = fixture();
  const decl = parseDeltaBlock(fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8'));
  assert.equal(decl.status, 'ENABLED');
  assert.equal(decl.taxonomySource, 'docs/seed_taxonomy.yml');
  assert.equal(decl.taxonomyRendered, 'docs/topic-taxonomy.md');
  assert.equal(decl.adrDir, 'docs/adr');
  assert.equal(decl.memoryBank, 'llm/memory-bank');
  assert.deepEqual(decl.narrativeSources, ['docs/adr', 'llm/memory-bank']);
  assert.equal(decl.outputDir, 'docs/design');
  assert.equal(decl.pagesMechanism, 'jekyll');
});

test('parseDeltaBlock returns null when the block is absent', () => {
  assert.equal(parseDeltaBlock('# Delta\n\n## Mission\n\nx\n'), null);
});

test('parseDeltaBlock normalizes "none" taxonomy to null', () => {
  const decl = parseDeltaBlock('## Design Surface\n\nStatus: ENABLED\nTaxonomy source: none\n');
  assert.equal(decl.taxonomySource, null);
});

test('computeManifest is deterministic for fixed inputs and now', () => {
  const root = fixture();
  const decl = parseDeltaBlock(fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8'));
  const gaps = [];
  const m1 = computeManifest(root, decl, { now: '2026-07-21T00:00:00Z', gaps });
  const m2 = computeManifest(root, decl, { now: '2026-07-21T00:00:00Z', gaps: [] });
  assert.equal(m1.taxonomy_hash, hashString(fs.readFileSync(path.join(root, 'docs', 'seed_taxonomy.yml')).toString()));
  assert.equal(m1.generated_at, '2026-07-21T00:00:00Z');
  assert.match(m1.governance_version, /^\d+\.\d+\.\d+$/);
  assert.equal(m1.narrative_inputs_hash, m2.narrative_inputs_hash);
  assert.equal(gaps.length, 0);
});

test('computeManifest records a gap for a missing declared source', () => {
  const root = fixture();
  fs.rmSync(path.join(root, 'docs', 'seed_taxonomy.yml'));
  const decl = parseDeltaBlock(fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8'));
  const gaps = [];
  const m = computeManifest(root, decl, { now: 'x', gaps });
  assert.equal(m.taxonomy_hash, null);
  assert.ok(gaps.some((g) => /taxonomy source/.test(g)));
});

test('generate writes the manifest to the output dir', () => {
  const root = fixture();
  const decl = parseDeltaBlock(fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8'));
  const { manifest, gaps } = generate(root, decl, 'docs/design', { now: 'x' });
  const written = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'design', 'design-surface-manifest.json'), 'utf8'));
  assert.equal(written.narrative_inputs_hash, manifest.narrative_inputs_hash);
  assert.equal(gaps.length, 0);
});

test('adrMeta parses id, title, status, and supersedes', () => {
  const root = fixture();
  fs.writeFileSync(
    path.join(root, 'docs', 'adr', '0002-second.md'),
    '# ADR-0002: Second Decision\n\nStatus: Superseded\n\n## Supersedes\n\n0001-first.md\n'
  );
  const m = adrMeta(root, 'docs/adr', '0002-second.md');
  assert.equal(m.id, '0002');
  assert.equal(m.title, 'Second Decision');
  assert.equal(m.status, 'Superseded');
  assert.equal(m.supersedes, '0001-first.md');
});

test('adrMeta returns null supersedes when the section says None', () => {
  const root = fixture();
  const m = adrMeta(root, 'docs/adr', '0001-first.md');
  assert.equal(m.supersedes, null);
});

test('buildAdrIndex renders a table row per ADR, sorted by id', () => {
  const root = fixture();
  fs.writeFileSync(
    path.join(root, 'docs', 'adr', '0002-second.md'),
    '# ADR-0002: Second Decision\n\nStatus: Accepted\n\n## Supersedes\n\nNone.\n'
  );
  const md = buildAdrIndex(root, 'docs/adr', []);
  assert.match(md, /\| 0001 \| First Decision \| Accepted \| — \|/);
  assert.match(md, /\| 0002 \| Second Decision \| Accepted \| — \|/);
  assert.ok(md.indexOf('0001') < md.indexOf('0002'));
});

test('buildAdrIndex handles an empty ADR dir without crashing', () => {
  const root = fixture();
  for (const f of fs.readdirSync(path.join(root, 'docs', 'adr'))) {
    fs.rmSync(path.join(root, 'docs', 'adr', f));
  }
  const md = buildAdrIndex(root, 'docs/adr', []);
  assert.match(md, /No ADRs found/);
});

test('generate writes adr-index.md', () => {
  const root = fixture();
  const decl = parseDeltaBlock(fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8'));
  generate(root, decl, 'docs/design', { now: 'x' });
  const md = fs.readFileSync(path.join(root, 'docs', 'design', 'adr-index.md'), 'utf8');
  assert.match(md, /First Decision/);
});
