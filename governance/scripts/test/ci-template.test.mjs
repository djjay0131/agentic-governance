import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('CI template fetches full history, runs the generator, and leaves Tier-2 alone', () => {
  const t = fs.readFileSync(path.join(process.cwd(), 'docs/templates/design-surface-ci-template.yml'), 'utf8');
  assert.match(t, /fetch-depth:\s*0/);
  assert.match(t, /design-surface\.mjs/);
  assert.match(t, /pages/i);
  assert.match(t, /Tier[- ]2/i); // a comment noting Tier-2 is not published here
});
