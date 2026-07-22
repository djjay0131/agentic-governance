# Design Surface Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in, default-disabled **Design Surface** capability to agentic-governance that mechanically generates a repo's Tier-1 design facts (taxonomy, ADR index, module map, status) plus a manifest, and governs an LLM-synthesized, PR-gated Tier-2 narrative — so a repo's published design view is always attributable to authoritative sources.

**Architecture:** A zero-dependency Node ES-module generator (`governance/scripts/design-surface.mjs`) reads the repo's `## Design Surface` delta declaration, emits deterministic Tier-1 artifacts + a content-hash manifest, and never fabricates (a missing declared source produces a visible gap marker and a non-zero exit). An audit function in the same module, wired into `governance-checks.mjs` behind a non-blocking `--design-surface` flag, compares the published manifest against current sources and the Tier-2 narrative's stamped input hash. A governance skill (`/governance:publish-design-surface`) produces the cited Tier-2 narrative, stamps its input hash, and opens a draft PR the AI never merges. Everything is exercised with the built-in `node:test` runner.

**Tech Stack:** Plain Node.js ES modules (`node:` imports only — `node:child_process`, `node:crypto`, `node:fs`, `node:path`, `node:url`), the built-in `node:test` runner (`node --test`), Markdown, GitHub Actions YAML. No third-party runtime or test dependencies; no `npm install`.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the approved spec (`docs/superpowers/specs/2026-07-21-design-surface-capability-design.md`).

- **Zero runtime dependencies.** `governance/scripts/design-surface.mjs` and the audit extension are plain Node ES modules using `node:` imports only, matching `governance/scripts/governance-checks.mjs`. Tests use the built-in `node:test` runner (`node --test`) — no test framework, no `npm install`.
- **The projection rule (spec §3, core invariant).** Every surface element is attributable to a source: Tier 1 is mechanically derived; Tier 2 cites. Nothing on the surface is a new hand-authored source of truth. The generator NEVER fabricates; a missing declared source produces a visible gap marker in the output AND a non-zero exit / audit finding — never silent, never fabricated.
- **Two tiers (spec §3).** Tier 1 (taxonomy inclusion, ADR index, module map, memory-bank + governance status, and the manifest) is deterministic and auto-published every build without review. Tier 2 (the LLM "what we built and why" narrative) is produced by the skill, carries inline citations, is always PR-gated, is never auto-published, and the AI never merges it.
- **Taxonomy = zero-dep refinement of spec §4.1.** The generator MUST NOT parse arbitrary YAML (no stdlib YAML parser exists and none may be added). Instead the delta declares a **pre-rendered taxonomy artifact path** (`Taxonomy rendered:`) — the repo already renders it with its own code (e.g. agentic-kg renders `topic-taxonomy.md` from `seed_taxonomy.yml`) — AND the raw **taxonomy source path** (`Taxonomy source:`) for hashing. The generator INCLUDES/links the rendered artifact verbatim and records the SOURCE file's content hash in the manifest; it does NOT re-render the taxonomy. `Taxonomy source: none` → omit the taxonomy section entirely.
- **Opt-in, default DISABLED.** The delta `## Design Surface` block ships `Status: DISABLED`. Repos that do not declare the block (or leave it DISABLED) are entirely unaffected — no artifacts, no findings, no version-pin move.
- **AI never merges the Tier-2 PR.** Consistent with `constitution/shared-principles.md`; the human review gate is the publish control for Tier 2.

## File Structure

Files created or modified by this plan (all paths relative to the agentic-governance repo root):

| Path | New/Mod | Responsibility |
| --- | --- | --- |
| `governance/scripts/design-surface.mjs` | New | Zero-dep generator + audit library: delta parsing, hashing, manifest, Tier-1 builders (`adr-index.md`, `taxonomy.md`, `architecture.md`, `status.md`), `auditDesignSurface`, CLI `main()`. |
| `governance/scripts/test/design-surface.test.mjs` | New | `node:test` coverage for parsing, hashing, manifest, and all Tier-1 builders against a temp fixture repo. |
| `governance/scripts/test/design-surface-audit.test.mjs` | New | `node:test` coverage for `auditDesignSurface` — fresh vs stale (taxonomy/ADR/memory changed), missing-source, stale-narrative. |
| `governance/scripts/governance-checks.mjs` | Mod | Add non-blocking `--design-surface` mode that calls `auditDesignSurface` and prints WARN findings. |
| `governance/scripts/README.md` | Mod | Document `design-surface.mjs`, its flags, and the `--design-surface` audit mode. |
| `governance/skills/publish-design-surface/SKILL.md` | New | Tier-2 skill: read delta, run generator, synthesize cited narrative, stamp input hash, open draft PR, never merge. |
| `docs/governance-delta-template.md` | Mod | Add the `## Design Surface` capability block (spec §6 + the `Taxonomy rendered:` refinement). |
| `governance/skills/establish/SKILL.md` | Mod | Offer to scaffold the Design Surface block during onboarding. |
| `governance/skills/audit/SKILL.md` | Mod | Run `--design-surface` and report currency findings. |
| `docs/templates/design-surface-ci-template.yml` | New | Reference CI workflow: checkout (fetch-depth 0), setup-node, run generator, deploy Tier-1 to Pages; Tier-2 untouched. |
| `docs/design-surface.md` | New | Canonical capability doc: two tiers, the projection rule, rollout. |
| `docs/adr/0000-template.md` | New | ADR template copy (first ADR file in agentic-governance's own ADR system). |
| `docs/adr/0001-design-surface-capability.md` | New | ADR recording the decision, the projection rule, and the taxonomy refinement. |
| `docs/adr/README.md` | New | ADR index (one row per ADR) for agentic-governance. |
| `VERSION` | Mod | `0.2.0` → `0.3.0`. |
| `CHANGELOG.md` | Mod | Add the `0.3.0` entry. |

**Module interface summary** (defined in Task 1 unless noted; later tasks consume these exact names):

- `sha256(buf) -> hex`, `hashString(s) -> hex`, `hashFile(absPath) -> hex`
- `gitToplevel(cwd?) -> absRoot`
- `governanceVersion() -> "X.Y.Z"`
- `section(text, name) -> string` (body of a `## name` markdown section)
- `parseArgs(argv) -> { delta, out, designSurface }`
- `parseDeltaBlock(deltaText) -> decl | null` where `decl = { status, taxonomySource, taxonomyRendered, adrDir, memoryBank, narrativeSources, outputDir, pagesMechanism, narrativeReview }`
- `adrFiles(root, adrRel) -> string[]`, `adrMeta(root, adrRel, file) -> { id, title, status, supersedes }` (Task 2)
- `adrSetHash(root, adrRel, gaps) -> hex|null`
- `memoryBankFiles(root, memRel) -> string[]`, `memoryBankRev(root, memRel, gaps) -> hex|null`
- `taxonomyHash(root, decl, gaps) -> hex|null`
- `computeManifest(root, decl, { now, gaps }) -> manifest`
- `buildAdrIndex(root, adrRel, gaps) -> markdown` (Task 2)
- `buildTaxonomy(root, decl, gaps) -> { filename, markdown } | null` (Task 3)
- `buildModuleMap(root, { ignore, outRel }) -> markdown` (Task 4)
- `buildStatus(root, decl, manifest) -> markdown` (Task 4)
- `generate(root, decl, outRel, { now }) -> { manifest, gaps }`
- `readPublishedManifest(root, outRel) -> manifest|null` (Task 5)
- `narrativeStampedHash(root, narrativePath) -> hex|null` (Task 5)
- `auditDesignSurface(root, decl, { out, narrative }) -> finding[]` where `finding = { kind, message }`, `kind ∈ { 'missing-source', 'tier-1-out-of-date', 'stale-narrative' }` (Task 5)
- `main(argv?) -> exitCode`

---

### Task 1: Generator scaffold + manifest

**Files:**
- Create: `governance/scripts/design-surface.mjs`
- Test: `governance/scripts/test/design-surface.test.mjs`

**Interfaces:**
- Consumes: nothing (first task). Reads `agentic-governance/VERSION` relative to the script for `governance_version`.
- Produces: all foundation helpers listed in the module interface summary above, plus `computeManifest`, `generate` (manifest-only for now), and CLI `main`. Later tasks extend `generate`.

Design notes for the implementer:
- `computeManifest` takes `{ now, gaps }`. `now` makes `generated_at` deterministic in tests; `gaps` is a caller-supplied array the helpers push missing-declared-source messages onto (the projection rule). Only three hashes are compared by the audit (`taxonomy_hash`, `adr_set_hash`, `memory_bank_rev`); `narrative_inputs_hash` is derived from those three; `generated_at`/`governance_version` are metadata.
- `parseDeltaBlock` reads the `## Design Surface` section body via `section()` and pulls `Key: value` lines, stripping trailing ` # comment`. Returns `null` if the block is absent. `taxonomySource`/`taxonomyRendered` normalize the literal `none` to `null`.

- [ ] **Step 1: Write the failing test**

Create `governance/scripts/test/design-surface.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test governance/scripts/test/design-surface.test.mjs`
Expected: FAIL — `Cannot find module '../design-surface.mjs'` (the module does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `governance/scripts/design-surface.mjs`:

```js
#!/usr/bin/env node
// design-surface.mjs — deterministic Tier-1 Design Surface generator + audit
// library for agentic-governance. Plain Node, zero dependencies (node: imports
// only), same style as governance-checks.mjs. Runs against the adopting repo
// (git toplevel of the cwd), NOT the directory holding this script.
//
// The generator NEVER fabricates: a missing declared source produces a visible
// gap and a non-zero exit (the projection rule, spec §3). See docs/design-surface.md.
//
// Usage:
//   node design-surface.mjs                          # generate Tier-1 + manifest
//   node design-surface.mjs --delta docs/governance-delta.md  # delta path override
//   node design-surface.mjs --out docs/design        # output dir override

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const SCRIPT_DIR = path.dirname(url.fileURLToPath(import.meta.url));

// ---------- hashing ----------

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}
export function hashString(s) {
  return sha256(Buffer.from(s, 'utf8'));
}
export function hashFile(absPath) {
  return sha256(fs.readFileSync(absPath));
}

// ---------- environment ----------

export function gitToplevel(cwd = process.cwd()) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
}
// The canonical package version this generator ships in (agentic-governance/VERSION),
// two levels up from governance/scripts/.
export function governanceVersion() {
  return fs.readFileSync(path.join(SCRIPT_DIR, '..', '..', 'VERSION'), 'utf8').trim();
}

// ---------- markdown + delta parsing ----------

// Body of a `## <name>` section, trimmed, up to the next `## ` heading or EOF.
export function section(text, name) {
  const lines = text.split('\n');
  let inSec = false;
  const out = [];
  for (const line of lines) {
    if (new RegExp(`^##\\s+${name}\\s*$`).test(line)) {
      inSec = true;
      continue;
    }
    if (inSec && /^##\s+/.test(line)) break;
    if (inSec) out.push(line);
  }
  return out.join('\n').trim();
}

function norm(v) {
  if (v === null || v === undefined) return null;
  return /^none$/i.test(v.trim()) ? null : v.trim();
}

export function parseDeltaBlock(deltaText) {
  if (!/^##\s+Design Surface\s*$/m.test(deltaText)) return null;
  const body = section(deltaText, 'Design Surface');
  const bodyLines = body.split('\n');
  const field = (label) => {
    for (const raw of bodyLines) {
      const l = raw.replace(/\s+#.*$/, '').trim(); // strip trailing " # comment"
      const m = l.match(new RegExp(`^${label}\\s*:\\s*(.*)$`, 'i'));
      if (m) return m[1].trim();
    }
    return null;
  };
  return {
    status: (field('Status') || 'DISABLED').toUpperCase(),
    taxonomySource: norm(field('Taxonomy source')),
    taxonomyRendered: norm(field('Taxonomy rendered')),
    adrDir: field('ADR dir') || 'docs/adr',
    memoryBank: norm(field('Memory bank')),
    narrativeSources: (field('Narrative sources') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    outputDir: field('Output dir') || 'docs/design',
    pagesMechanism: (field('Pages mechanism') || 'none').toLowerCase(),
    narrativeReview: field('Narrative review') || 'required',
  };
}

// ---------- Tier-1 source hashing ----------

export function adrFiles(root, adrRel) {
  const dir = path.join(root, adrRel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-.*\.md$/.test(f) && f !== '0000-template.md')
    .sort();
}
function adrStatus(root, adrRel, file) {
  const m = fs.readFileSync(path.join(root, adrRel, file), 'utf8').match(/^Status:\s*(\w+)/m);
  return m ? m[1] : null;
}
export function adrSetHash(root, adrRel, gaps) {
  const dir = path.join(root, adrRel);
  if (!fs.existsSync(dir)) {
    gaps.push(`missing ADR dir: ${adrRel}`);
    return null;
  }
  const parts = adrFiles(root, adrRel).map((f) => `${f.slice(0, 4)}:${adrStatus(root, adrRel, f) || '?'}`);
  return hashString(parts.join('|'));
}

export function memoryBankFiles(root, memRel) {
  const dir = path.join(root, memRel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
}
export function memoryBankRev(root, memRel, gaps) {
  if (!memRel) return null;
  const dir = path.join(root, memRel);
  if (!fs.existsSync(dir)) {
    gaps.push(`missing memory bank: ${memRel}`);
    return null;
  }
  const h = createHash('sha256');
  for (const f of memoryBankFiles(root, memRel)) {
    h.update(f);
    h.update('\0');
    h.update(fs.readFileSync(path.join(dir, f)));
  }
  return h.digest('hex');
}

export function taxonomyHash(root, decl, gaps) {
  if (!decl.taxonomySource) return null;
  const p = path.join(root, decl.taxonomySource);
  if (!fs.existsSync(p)) {
    gaps.push(`missing taxonomy source: ${decl.taxonomySource}`);
    return null;
  }
  return hashFile(p);
}

// ---------- manifest ----------

export function computeManifest(root, decl, opts = {}) {
  const gaps = opts.gaps || [];
  const now = opts.now || new Date().toISOString();
  const taxonomy_hash = taxonomyHash(root, decl, gaps);
  const adr_set_hash = adrSetHash(root, decl.adrDir, gaps);
  const memory_bank_rev = memoryBankRev(root, decl.memoryBank, gaps);
  const narrative_inputs_hash = hashString([taxonomy_hash, adr_set_hash, memory_bank_rev].join('|'));
  return {
    taxonomy_hash,
    adr_set_hash,
    memory_bank_rev,
    narrative_inputs_hash,
    generated_at: now,
    governance_version: governanceVersion(),
  };
}

// ---------- generate (Tier-1 orchestration; extended in later tasks) ----------

export function generate(root, decl, outRel, opts = {}) {
  const gaps = [];
  const manifest = computeManifest(root, decl, { now: opts.now, gaps });
  const outDir = path.join(root, outRel);
  fs.mkdirSync(outDir, { recursive: true });
  const write = (name, content) =>
    fs.writeFileSync(path.join(outDir, name), content.endsWith('\n') ? content : content + '\n');
  write('design-surface-manifest.json', JSON.stringify(manifest, null, 2));
  return { manifest, gaps };
}

// ---------- CLI ----------

export function parseArgs(argv) {
  const args = argv.slice(2);
  const val = (flag, fb) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : fb;
  };
  return {
    delta: val('--delta', 'docs/governance-delta.md'),
    out: val('--out', null),
    designSurface: args.includes('--design-surface'),
  };
}

export function main(argv = process.argv) {
  const opts = parseArgs(argv);
  const root = gitToplevel();
  const decl = parseDeltaBlock(fs.readFileSync(path.join(root, opts.delta), 'utf8'));
  if (!decl || decl.status !== 'ENABLED') {
    console.log('design-surface: capability DISABLED or not declared; nothing to do.');
    return 0;
  }
  const outRel = opts.out || decl.outputDir;
  const { gaps } = generate(root, decl, outRel);
  if (gaps.length) {
    console.error('design-surface: gaps found (missing declared sources — never fabricated):');
    for (const g of gaps) console.error(`  - ${g}`);
    return 1;
  }
  console.log(`design-surface: Tier-1 surface written to ${outRel}`);
  return 0;
}

if (process.argv[1] && url.fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(main());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test governance/scripts/test/design-surface.test.mjs`
Expected: PASS — all 8 tests pass (`# pass 8`, `# fail 0`).

- [ ] **Step 5: Commit**

```bash
git add governance/scripts/design-surface.mjs governance/scripts/test/design-surface.test.mjs
git commit -m "feat(design-surface): generator scaffold + manifest"
```

---

### Task 2: ADR index (Tier 1)

**Files:**
- Modify: `governance/scripts/design-surface.mjs` (add `adrMeta`, `buildAdrIndex`; extend `generate`)
- Test: `governance/scripts/test/design-surface.test.mjs` (append tests)

**Interfaces:**
- Consumes: `adrFiles`, `section`, `generate` (Task 1).
- Produces: `adrMeta(root, adrRel, file) -> { id, title, status, supersedes }` and `buildAdrIndex(root, adrRel, gaps) -> markdown`. `generate` now also writes `adr-index.md`.

Design notes:
- Title is the header text after `# ADR-NNNN: ` (or the first `# ` line). Status is the first word of the `Status:` line. `supersedes` is the first non-`None` line of the `## Supersedes` section, else `null`.
- A missing ADR dir is already gapped by `computeManifest`; `buildAdrIndex` renders a marker but does not double-push the gap.

- [ ] **Step 1: Write the failing test**

Append to `governance/scripts/test/design-surface.test.mjs`:

```js
import { adrMeta, buildAdrIndex } from '../design-surface.mjs';

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test governance/scripts/test/design-surface.test.mjs`
Expected: FAIL — `adrMeta`/`buildAdrIndex` are not exported yet (`... is not a function`), and `generate` writes no `adr-index.md`.

- [ ] **Step 3: Write the implementation**

In `governance/scripts/design-surface.mjs`, add these exports immediately after the `adrSetHash` function:

```js
export function adrMeta(root, adrRel, file) {
  const text = fs.readFileSync(path.join(root, adrRel, file), 'utf8');
  const id = (file.match(/^(\d{4})/) || [])[1] || '';
  const titleM = text.match(/^#\s*(?:ADR-\d+:\s*)?(.+?)\s*$/m);
  const statusM = text.match(/^Status:\s*(\w+)/m);
  const sup = section(text, 'Supersedes');
  const supersedes = !sup || /^none\.?$/i.test(sup) ? null : sup.replace(/^[-*]\s*/, '').split('\n')[0].trim();
  return {
    id,
    title: titleM ? titleM[1] : file,
    status: statusM ? statusM[1] : null,
    supersedes,
  };
}

export function buildAdrIndex(root, adrRel, gaps) {
  const files = adrFiles(root, adrRel);
  const head = '# ADR Index\n\n_Generated by design-surface.mjs (Tier 1) — do not edit by hand._\n';
  if (!fs.existsSync(path.join(root, adrRel))) {
    return `${head}\n> **GAP:** declared ADR dir \`${adrRel}\` is missing.\n`;
  }
  if (files.length === 0) {
    return `${head}\n_No ADRs found in \`${adrRel}\`._\n`;
  }
  const rows = files.map((f) => {
    const m = adrMeta(root, adrRel, f);
    return `| ${m.id} | ${m.title} | ${m.status || '?'} | ${m.supersedes || '—'} |`;
  });
  return `${head}\n| ADR | Title | Status | Supersedes |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n`;
}
```

Then, in `generate`, add the ADR-index write immediately after the manifest write:

```js
  write('design-surface-manifest.json', JSON.stringify(manifest, null, 2));
  write('adr-index.md', buildAdrIndex(root, decl.adrDir, gaps));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test governance/scripts/test/design-surface.test.mjs`
Expected: PASS — all tests pass (`# fail 0`).

- [ ] **Step 5: Commit**

```bash
git add governance/scripts/design-surface.mjs governance/scripts/test/design-surface.test.mjs
git commit -m "feat(design-surface): Tier-1 ADR index"
```

---

### Task 3: Taxonomy inclusion (Tier 1)

**Files:**
- Modify: `governance/scripts/design-surface.mjs` (add `buildTaxonomy`, wire into `generate`)
- Test: `governance/scripts/test/design-surface.test.mjs` (add cases)

**Interfaces:**
- Consumes: `decl` from `parseDeltaBlock` (Task 1) — `taxonomyRendered` (pre-rendered artifact path) and `taxonomySource` (raw source, hashed in Task 1). `gaps` array.
- Produces: `buildTaxonomy(root, decl, gaps) -> { filename, markdown } | null`.

Design note (the zero-dep taxonomy refinement, spec §4.1): the generator does NOT parse the taxonomy source (no stdlib YAML). The repo already renders its taxonomy (agentic-kg renders `topic-taxonomy.md` from `seed_taxonomy.yml`). The delta declares both `Taxonomy rendered:` (the artifact to include) and `Taxonomy source:` (hashed for drift). `buildTaxonomy` reads the rendered artifact and returns it as the surface's taxonomy page; returns `null` when `taxonomyRendered` is `none`/absent (taxonomy is domain-specific — the section is simply omitted). A declared-but-missing artifact records a gap and yields a visible placeholder.

- [ ] **Step 1: Write the failing test**

Add to `governance/scripts/test/design-surface.test.mjs`:

```js
import { buildTaxonomy } from '../design-surface.mjs';

test('buildTaxonomy includes the pre-rendered artifact when declared', () => {
  const root = fixture();
  const decl = parseDeltaBlock(
    fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8')
  );
  const gaps = [];
  const tax = buildTaxonomy(root, decl, gaps);
  assert.equal(tax.filename, 'taxonomy.md');
  assert.match(tax.markdown, /# Topics/);
  assert.match(tax.markdown, /Alpha/);
  assert.equal(gaps.length, 0);
});

test('buildTaxonomy returns null when taxonomy is "none"', () => {
  const decl = { taxonomyRendered: null, taxonomySource: null };
  assert.equal(buildTaxonomy('/nope', decl, []), null);
});

test('buildTaxonomy records a gap when the declared artifact is missing', () => {
  const root = fixture();
  fs.rmSync(path.join(root, 'docs', 'topic-taxonomy.md'));
  const decl = parseDeltaBlock(
    fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8')
  );
  const gaps = [];
  const tax = buildTaxonomy(root, decl, gaps);
  assert.match(tax.markdown, /_missing declared taxonomy artifact/i);
  assert.equal(gaps.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test governance/scripts/test/design-surface.test.mjs`
Expected: FAIL — `buildTaxonomy` is not exported.

- [ ] **Step 3: Add the implementation**

In `governance/scripts/design-surface.mjs`, add and export:

```js
export function buildTaxonomy(root, decl, gaps) {
  if (!decl.taxonomyRendered) return null; // domain-specific; omit the section
  const abs = path.join(root, decl.taxonomyRendered);
  if (!fs.existsSync(abs)) {
    gaps.push(`taxonomy: declared rendered artifact not found: ${decl.taxonomyRendered}`);
    return {
      filename: 'taxonomy.md',
      markdown: `# Taxonomy\n\n_missing declared taxonomy artifact: \`${decl.taxonomyRendered}\`_\n`,
    };
  }
  const body = fs.readFileSync(abs, 'utf8').trimEnd();
  const header = `<!-- Generated by design-surface.mjs from ${decl.taxonomyRendered} (source: ${decl.taxonomySource ?? 'n/a'}). Do not edit. -->\n\n`;
  return { filename: 'taxonomy.md', markdown: `${header}${body}\n` };
}
```

Then wire it into `generate` (extend the Task 1 body): after building the ADR index, call `buildTaxonomy(root, decl, gaps)` and, when non-null, write `path.join(root, outRel, tax.filename)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test governance/scripts/test/design-surface.test.mjs`
Expected: PASS (all taxonomy cases + prior tasks).

- [ ] **Step 5: Commit**

```bash
git add governance/scripts/design-surface.mjs governance/scripts/test/design-surface.test.mjs
git commit -m "feat(design-surface): Tier-1 taxonomy inclusion (rendered-artifact + source hash)"
```

---

### Task 4: Module map + status (Tier 1)

**Files:**
- Modify: `governance/scripts/design-surface.mjs` (add `buildModuleMap`, `buildStatus`, wire into `generate`)
- Test: `governance/scripts/test/design-surface.test.mjs` (add cases)

**Interfaces:**
- Consumes: `root`, `decl`, `manifest` (from `computeManifest`, Task 1).
- Produces:
  - `buildModuleMap(root, { ignore, outRel }) -> markdown` — a deterministic, sorted directory tree of the repo, excluding an ignore set (`.git`, `node_modules`, the output dir, dotfiles) and depth-limited.
  - `buildStatus(root, decl, manifest) -> markdown` — governance version pin, delta summary, memory-bank file list, `generated_at`.

- [ ] **Step 1: Write the failing test**

Add to the test file:

```js
import { buildModuleMap, buildStatus } from '../design-surface.mjs';

test('buildModuleMap renders a sorted, ignore-filtered tree', () => {
  const root = fixture();
  const md = buildModuleMap(root, { ignore: ['.git', 'node_modules', 'docs/design'], outRel: 'docs/design' });
  assert.match(md, /# Architecture/);
  assert.match(md, /docs\//);
  assert.match(md, /llm\//);
  assert.doesNotMatch(md, /node_modules/);
  // deterministic: same inputs -> same output
  assert.equal(md, buildModuleMap(root, { ignore: ['.git', 'node_modules', 'docs/design'], outRel: 'docs/design' }));
});

test('buildStatus reports version pin, memory-bank files, and generated_at', () => {
  const root = fixture();
  const decl = parseDeltaBlock(
    fs.readFileSync(path.join(root, 'docs', 'governance-delta.md'), 'utf8')
  );
  const manifest = computeManifest(root, decl, { now: '2026-07-22T00:00:00Z', gaps: [] });
  const md = buildStatus(root, decl, manifest);
  assert.match(md, /# Status/);
  assert.match(md, /activeContext\.md/);
  assert.match(md, /2026-07-22T00:00:00Z/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test governance/scripts/test/design-surface.test.mjs`
Expected: FAIL — `buildModuleMap`/`buildStatus` not exported.

- [ ] **Step 3: Add the implementation**

In `governance/scripts/design-surface.mjs`, add and export:

```js
function walkTree(absDir, relDir, ignore, depth, maxDepth, lines) {
  if (depth > maxDepth) return;
  const entries = fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .filter((e) => {
      const rel = relDir ? `${relDir}/${e.name}` : e.name;
      return !ignore.includes(e.name) && !ignore.includes(rel);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    const rel = relDir ? `${relDir}/${e.name}` : e.name;
    lines.push(`${'  '.repeat(depth)}- ${e.name}${e.isDirectory() ? '/' : ''}`);
    if (e.isDirectory()) {
      walkTree(path.join(absDir, e.name), rel, ignore, depth + 1, maxDepth, lines);
    }
  }
}

export function buildModuleMap(root, { ignore, outRel }) {
  const skip = [...new Set([...(ignore || []), '.git', 'node_modules', outRel])];
  const lines = [];
  walkTree(root, '', skip, 0, 3, lines);
  return `# Architecture\n\nDeterministic module/package tree (depth ≤ 3), generated from the repository layout.\n\n${lines.join('\n')}\n`;
}

export function buildStatus(root, decl, manifest) {
  const memFiles = memoryBankFiles(root, decl.memoryBank).map(
    (f) => `- \`${path.relative(root, f)}\``
  );
  return [
    '# Status',
    '',
    `- Governance version: \`${manifest.governance_version}\``,
    `- Design Surface: \`${decl.status}\``,
    `- Pages mechanism: \`${decl.pagesMechanism}\``,
    `- Generated at: \`${manifest.generated_at}\``,
    '',
    '## Memory bank',
    '',
    ...(memFiles.length ? memFiles : ['- _none declared_']),
    '',
  ].join('\n');
}
```

Wire both into `generate`: write `architecture.md` from `buildModuleMap(root, { ignore: [outRel], outRel })` and `status.md` from `buildStatus(root, decl, manifest)` into the output dir.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test governance/scripts/test/design-surface.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add governance/scripts/design-surface.mjs governance/scripts/test/design-surface.test.mjs
git commit -m "feat(design-surface): Tier-1 module map + status"
```

---

### Task 5: `--design-surface` drift audit (the teeth — spec §5)

**Files:**
- Modify: `governance/scripts/design-surface.mjs` (add `readPublishedManifest`, `narrativeStampedHash`, `auditDesignSurface`)
- Modify: `governance/scripts/governance-checks.mjs` (add non-blocking `--design-surface` mode)
- Test: `governance/scripts/test/design-surface-audit.test.mjs` (new)

**Interfaces:**
- Consumes: `computeManifest`, `parseDeltaBlock` (Task 1).
- Produces:
  - `readPublishedManifest(root, outRel) -> manifest|null`
  - `narrativeStampedHash(root, narrativePath) -> hex|null` (reads `narrative_inputs_hash:` from the narrative's HTML-comment front-matter)
  - `auditDesignSurface(root, decl, { out, narrative }) -> finding[]`, `finding = { kind, message }`, `kind ∈ { 'missing-source', 'tier-1-out-of-date', 'stale-narrative' }`.

Design note: the audit recomputes the current manifest, then (a) surfaces any `gaps` as `missing-source`, (b) compares the three source hashes against the published manifest → `tier-1-out-of-date` (CI did not run, or a generated file was hand-edited), (c) compares the narrative's stamped `narrative_inputs_hash` against the current one → `stale-narrative` (the important one: sources changed since the prose was written). Findings are advisory; the `--design-surface` mode prints `WARN` and exits 0 (non-blocking).

- [ ] **Step 1: Write the failing test**

Create `governance/scripts/test/design-surface-audit.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test governance/scripts/test/design-surface-audit.test.mjs`
Expected: FAIL — `auditDesignSurface` not exported.

- [ ] **Step 3: Add the implementation**

In `governance/scripts/design-surface.mjs`, add and export:

```js
export function readPublishedManifest(root, outRel) {
  const p = path.join(root, outRel, 'design-surface-manifest.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function narrativeStampedHash(root, narrativeRel) {
  const p = path.join(root, narrativeRel);
  if (!fs.existsSync(p)) return null;
  const m = fs.readFileSync(p, 'utf8').match(/narrative_inputs_hash:\s*([0-9a-f]+)/i);
  return m ? m[1] : null;
}

export function auditDesignSurface(root, decl, { out, narrative }) {
  const findings = [];
  const gaps = [];
  const current = computeManifest(root, decl, { now: '', gaps });
  for (const g of gaps) findings.push({ kind: 'missing-source', message: g });

  const published = readPublishedManifest(root, out);
  if (published) {
    for (const k of ['taxonomy_hash', 'adr_set_hash', 'memory_bank_rev']) {
      if (published[k] !== current[k]) {
        findings.push({ kind: 'tier-1-out-of-date', message: `${k} differs from published surface (regenerate Tier 1 in CI)` });
      }
    }
  }
  if (narrative) {
    const stamped = narrativeStampedHash(root, narrative);
    if (stamped !== current.narrative_inputs_hash) {
      findings.push({ kind: 'stale-narrative', message: 'narrative is stale vs current sources — run /governance:publish-design-surface' });
    }
  }
  return findings;
}
```

In `governance/scripts/governance-checks.mjs`, add a `--design-surface` branch: when present, read the delta's `## Design Surface` block via `design-surface.mjs`, call `auditDesignSurface`, print each finding as `WARN  design-surface: <message>`, and **exit 0** (advisory). If the block is absent, print `SKIP design-surface (not declared)` and exit 0.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test governance/scripts/test/design-surface-audit.test.mjs`
Expected: PASS (clean + stale-narrative cases).

- [ ] **Step 5: Commit**

```bash
git add governance/scripts/design-surface.mjs governance/scripts/governance-checks.mjs governance/scripts/test/design-surface-audit.test.mjs
git commit -m "feat(design-surface): --design-surface drift audit (advisory)"
```

---

### Task 6: Skill `/governance:publish-design-surface` (Tier 2, review-gated)

**Files:**
- Create: `governance/skills/publish-design-surface/SKILL.md`

**Interfaces:**
- Consumes: the generator (Task 1–4), the delta `## Design Surface` block, the repo's ADRs/memory-bank/spec as narrative sources.
- Produces: a skill an executive persona runs to regenerate Tier-1 and synthesize the cited Tier-2 narrative into a **draft PR**. This is a documentation deliverable — its "test" is a structural checklist verified by grep, not `node:test`.

- [ ] **Step 1: Write the failing check**

Create `governance/scripts/test/skill-publish-design-surface.test.mjs`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test governance/scripts/test/skill-publish-design-surface.test.mjs`
Expected: FAIL — the SKILL.md does not exist.

- [ ] **Step 3: Write the skill**

Create `governance/skills/publish-design-surface/SKILL.md`:

```markdown
---
name: publish-design-surface
description: Regenerate a repo's Design Surface - deterministic Tier-1 facts plus a cited "what was built and why" narrative - and open a review-gated draft PR. Never merges; never fabricates.
argument-hint: "[repo-path (default: cwd)]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# governance:publish-design-surface

Regenerate the Design Surface for the target repo (argument, else cwd) and
open a **draft PR**. Announce each step. This skill NEVER merges and NEVER
publishes Tier-2 prose directly — a human merges the PR.

## Preconditions
- The repo's `docs/governance-delta.md` has a `## Design Surface` block with
  `Status: ENABLED`. If absent or DISABLED, stop and report.

## Steps
1. **Read the declaration.** Parse the delta `## Design Surface` block for the
   sources, output dir, and Pages mechanism.
2. **Regenerate Tier 1.** Run
   `node ~/code/agentic-governance/governance/scripts/design-surface.mjs --delta docs/governance-delta.md --out <output-dir>`.
   This refreshes the deterministic artifacts and the manifest (incl.
   `narrative_inputs_hash`). Never hand-edit generated files.
3. **Synthesize the Tier-2 narrative** from Tier-1 + ADRs + memory bank + spec.
   Every claim MUST carry an inline citation to its source (ADR id, memory-bank
   file, or spec anchor). A claim you cannot cite is omitted, not written —
   record it as a gap instead. This is the projection rule.
4. **Stamp the narrative.** Write the current manifest's `narrative_inputs_hash`
   into the narrative's front-matter (`<!-- narrative_inputs_hash: ... -->`) so
   the drift audit can detect staleness later.
5. **Citation self-check.** Verify every narrative section cites a source; if any
   claim is uncited, fix or remove it before proceeding.
6. **Open a draft PR** on a branch, declaring the governance level. Do NOT mark
   ready until the self-check passes. **Never merge** — the human owner merges,
   which is the publish gate.
7. **Report** what was regenerated, the gaps recorded, and the PR URL.
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test governance/scripts/test/skill-publish-design-surface.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add governance/skills/publish-design-surface/SKILL.md governance/scripts/test/skill-publish-design-surface.test.mjs
git commit -m "feat(design-surface): publish-design-surface skill (Tier-2, review-gated)"
```

---

### Task 7: Delta template block + establish/audit wiring

**Files:**
- Modify: `docs/governance-delta-template.md` (add the `## Design Surface` block)
- Modify: `governance/skills/establish/SKILL.md` (offer to scaffold it)
- Modify: `governance/skills/audit/SKILL.md` (run `--design-surface`)
- Test: `governance/scripts/test/delta-template.test.mjs` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces: the opt-in declaration surface (spec §6), default DISABLED.

- [ ] **Step 1: Write the failing test**

Create `governance/scripts/test/delta-template.test.mjs`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test governance/scripts/test/delta-template.test.mjs`
Expected: FAIL — no `## Design Surface` block yet.

- [ ] **Step 3: Add the block + wiring**

Append to `docs/governance-delta-template.md`:

```markdown
## Design Surface

Status: DISABLED                            # ENABLED to publish a design surface
Taxonomy source: none                       # path to raw taxonomy (hashed), or none
Taxonomy rendered: none                     # path to the repo's pre-rendered taxonomy artifact, or none
ADR dir: docs/adr
Memory bank: <memory-bank-path>
Narrative sources: docs/adr, <memory-bank-path>
Output dir: docs/design                     # published surface root
Pages mechanism: none                        # jekyll | mkdocs | actions-pages | none
Narrative review: required                   # Tier-2 is always PR-gated
```

In `governance/skills/establish/SKILL.md`, add a step: offer to scaffold this
block (default DISABLED) and point at `docs/design-surface.md`. In
`governance/skills/audit/SKILL.md`, add: run
`node .../governance-checks.mjs --design-surface` and report currency findings.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test governance/scripts/test/delta-template.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/governance-delta-template.md governance/skills/establish/SKILL.md governance/skills/audit/SKILL.md governance/scripts/test/delta-template.test.mjs
git commit -m "feat(design-surface): delta block (default DISABLED) + establish/audit wiring"
```

---

### Task 8: Reference CI workflow template

**Files:**
- Create: `docs/templates/design-surface-ci-template.yml`
- Test: `governance/scripts/test/ci-template.test.mjs` (new)

**Interfaces:**
- Consumes: the generator CLI.
- Produces: a copy-paste CI workflow adopters adapt to their Pages mechanism. Publishes Tier 1 only; Tier 2 stays PR-gated.

- [ ] **Step 1: Write the failing test**

Create `governance/scripts/test/ci-template.test.mjs`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test governance/scripts/test/ci-template.test.mjs`
Expected: FAIL — template file missing.

- [ ] **Step 3: Write the template**

Create `docs/templates/design-surface-ci-template.yml`:

```yaml
# Reference: publish the Tier-1 Design Surface on every push to main.
# Tier-2 (the LLM narrative) is NOT published here — it lands via the
# /governance:publish-design-surface skill's review-gated PR. Adapt the
# "Deploy" step to your Pages mechanism (jekyll / mkdocs / actions-pages).
name: design-surface
on:
  push:
    branches: [main]
jobs:
  design-surface:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # design-surface + governance-checks diff against origin/main
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Generate Tier-1 surface
        run: node governance/scripts/design-surface.mjs --delta docs/governance-delta.md --out docs/design
      # - name: Deploy to Pages   # <-- adapt to your mechanism
      #   run: ...
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test governance/scripts/test/ci-template.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/templates/design-surface-ci-template.yml governance/scripts/test/ci-template.test.mjs
git commit -m "feat(design-surface): reference CI workflow template (Tier-1 publish)"
```

---

### Task 9: Canonical doc + ADR (bootstraps agentic-governance's own ADR system)

**Files:**
- Create: `docs/design-surface.md`
- Create: `docs/adr/0000-template.md` (copy from `docs/templates/adr-template.md`)
- Create: `docs/adr/0001-design-surface-capability.md`
- Create: `docs/adr/README.md`
- Test: covered by the final `governance-checks` gate (adr-index / adr-status).

**Interfaces:**
- Consumes: nothing new.
- Produces: the capability's authoritative docs. agentic-governance had no `docs/adr/` of its own; this bootstraps it with the first ADR.

- [ ] **Step 1: Write `docs/design-surface.md`**

```markdown
# Design Surface

A published rendering of a repo's design where **every element is
attributable to an authoritative source** — a view, never a new source of
truth (it sits at the bottom of the design-authority hierarchy).

## Two tiers
- **Tier 1 — derived facts (deterministic, auto-published):** taxonomy
  (included from the repo's pre-rendered artifact + source hash), ADR index,
  module map, memory-bank/governance status, and a manifest of source hashes.
  Regenerated every build by `governance/scripts/design-surface.mjs`.
- **Tier 2 — synthesized narrative (LLM, review-gated):** the cited "what was
  built and why" essay, produced by `/governance:publish-design-surface` into a
  draft PR. Published only when a human merges it.

## The projection rule
Tier 1 is mechanically derived; Tier 2 cites. Nothing is hand-authored and
authoritative. A Tier-2 claim without a source anchor is omitted, not written.

## Drift
`node governance/scripts/governance-checks.mjs --design-surface` (advisory)
flags a `stale-narrative` when sources changed since the narrative was last
generated, plus `tier-1-out-of-date` and `missing-source`.

## Adopting
Add the `## Design Surface` block to your delta (default DISABLED → ENABLED),
declare your sources + Pages mechanism, and copy
`docs/templates/design-surface-ci-template.yml`. Pilot: agentic-kg.
```

- [ ] **Step 2: Bootstrap the ADR system**

Copy `docs/templates/adr-template.md` → `docs/adr/0000-template.md`. Create
`docs/adr/0001-design-surface-capability.md` (Status: Accepted) recording: the
decision to add the capability, the **projection rule** as the binding
invariant, the **C split** (Tier-1 auto / Tier-2 review-gated), and the
**taxonomy refinement** (generator includes a pre-rendered artifact and hashes
the source rather than parsing YAML — preserving zero-dependency). Create
`docs/adr/README.md` as the index with one row for 0001.

- [ ] **Step 3: Verify the ADR system is consistent**

Run: `node governance/scripts/governance-checks.mjs`
Expected: `PASS adr-index`, `PASS adr-status` (the new ADR is indexed with a legal status).

- [ ] **Step 4: Commit**

```bash
git add docs/design-surface.md docs/adr/
git commit -m "docs(design-surface): canonical doc + ADR-0001 (bootstraps agentic-governance ADRs)"
```

---

### Task 10: Release — VERSION 0.3.0 + CHANGELOG + final gate

**Files:**
- Modify: `VERSION` (`0.2.0` → `0.3.0`)
- Modify: `CHANGELOG.md` (add the `0.3.0` entry)
- Modify: `governance/scripts/README.md` (document `design-surface.mjs` + `--design-surface`)

**Interfaces:**
- Consumes: everything above.
- Produces: the released capability. The delta-pin move to `v0.3` is **opt-in** — only repos that adopt the Design Surface bump their pin; non-adopters stay put.

- [ ] **Step 1: Bump VERSION**

Set `VERSION` to `0.3.0`.

- [ ] **Step 2: CHANGELOG entry**

Add a `## 0.3.0 — 2026-07-22` entry summarizing: new **Design Surface** capability (two-tier generate/publish/verify), the `publish-design-surface` skill, the `design-surface.mjs` generator, the `--design-surface` advisory audit, the delta block (default DISABLED), the reference CI template, `docs/design-surface.md`, and ADR-0001. Note the pin move is opt-in.

- [ ] **Step 3: Document the script**

Add a `design-surface.mjs` section to `governance/scripts/README.md`: its flags (`--delta`, `--out`, `--design-surface`), zero-dependency + `node:test`, and that it generates Tier 1 only (Tier 2 is the skill).

- [ ] **Step 4: Full gate**

Run: `node --test governance/scripts/test/*.test.mjs && node governance/scripts/governance-checks.mjs`
Expected: all tests pass; governance checks `PASS` (links/adr-index/adr-status).

- [ ] **Step 5: Commit**

```bash
git add VERSION CHANGELOG.md governance/scripts/README.md
git commit -m "release(design-surface): agentic-governance v0.3.0"
```

---

## Definition of Done

- `node --test governance/scripts/test/*.test.mjs` — all green.
- `node governance/scripts/governance-checks.mjs` — `PASS` links/adr-index/adr-status.
- `node governance/scripts/design-surface.mjs --delta docs/governance-delta.md --out docs/design` runs on a fixture/enabled repo and emits `adr-index.md`, `taxonomy.md` (when declared), `architecture.md`, `status.md`, and `design-surface-manifest.json`.
- `--design-surface` audit reports `stale-narrative` after a source change and nothing on a fresh surface.
- The `publish-design-surface` skill file passes its structural checklist (citations, hash stamp, draft-PR, never-merge, gaps).
- Delta template ships the `## Design Surface` block **DISABLED** by default; establish/audit reference it.
- VERSION = `0.3.0`; CHANGELOG has the `0.3.0` entry; `docs/design-surface.md` + ADR-0001 present and indexed.
- Zero runtime dependencies introduced; the generator and audit are plain Node.
- The projection rule holds: no generated file is hand-authored-authoritative; missing sources surface as gaps, never fabrications.
