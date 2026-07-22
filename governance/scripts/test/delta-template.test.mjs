import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseDeltaBlock } from '../design-surface.mjs';

test('delta template ships a parseable, DISABLED-by-default Design Surface block', () => {
  const tmpl = fs.readFileSync(path.join(process.cwd(), 'docs/governance-delta-template.md'), 'utf8');
  const decl = parseDeltaBlock(tmpl);
  assert.ok(decl, 'template must contain a ## Design Surface block');
  assert.equal(decl.status, 'DISABLED');
});
