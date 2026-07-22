import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SKILL = path.join(process.cwd(), 'governance/skills/publish-design-surface/SKILL.md');

test('publish-design-surface skill has required front-matter and clauses', () => {
  const text = fs.readFileSync(SKILL, 'utf8');
  assert.match(text, /^---[\s\S]*name:\s*publish-design-surface/m);
  assert.match(text, /description:/);
  // core behaviors the skill MUST state
  for (const clause of [
    /run .*design-surface\.mjs/i,        // regenerate Tier 1
    /cit(e|ation)/i,                      // citations required
    /narrative_inputs_hash/,              // stamp the hash
    /draft (pull request|PR)/i,           // open a draft PR
    /never merge/i,                       // AI never merges
    /gap/i,                               // record gaps, never fabricate
  ]) {
    assert.match(text, clause, `missing clause: ${clause}`);
  }
});
