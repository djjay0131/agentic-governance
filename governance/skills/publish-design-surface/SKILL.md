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
   sources, **Output dir**, and Pages mechanism.
2. **Regenerate Tier 1.** Run `node ~/code/agentic-governance/governance/scripts/design-surface.mjs --delta docs/governance-delta.md --out <output-dir>`.
   This refreshes the deterministic artifacts and the manifest
   (`<output-dir>/design-surface-manifest.json`, incl. `narrative_inputs_hash`).
   Never hand-edit generated files.
3. **Synthesize the Tier-2 narrative** from Tier-1 + ADRs + memory bank + spec.
   Every claim MUST carry an inline citation to its source (ADR id, memory-bank
   file, or spec anchor). A claim you cannot cite is omitted, not written —
   record it as a gap instead. This is the projection rule. Write the
   narrative to **exactly `<output-dir>/narrative.md`** (the same `Output dir`
   read in Step 1) — this is the one, fixed filename the `--design-surface`
   drift audit reads via `narrativeStampedHash`; any other path or filename
   makes the audit report a permanent false-positive `stale-narrative` finding
   because it can never find a stamp to compare.
4. **Stamp the narrative.** At the top of `<output-dir>/narrative.md`, write
   an HTML-comment front-matter line with the **current** manifest's
   `narrative_inputs_hash` (the one just produced in Step 2 — re-read
   `<output-dir>/design-surface-manifest.json` if the narrative is written in
   a later turn than the regenerate step):
   ```
   <!-- narrative_inputs_hash: <value-from-design-surface-manifest.json> -->
   ```
   This must be the first line of the file, before the narrative's own
   heading, so the drift audit can parse it and detect staleness later.
5. **Citation self-check.** Verify every narrative section cites a source; if any
   claim is uncited, fix or remove it before proceeding.
6. **Open a draft PR** on a branch, declaring the governance level. Do NOT mark
   ready until the self-check passes. **Never merge** — the human owner merges,
   which is the publish gate.
7. **Report** what was regenerated, the gaps recorded, and the PR URL.
