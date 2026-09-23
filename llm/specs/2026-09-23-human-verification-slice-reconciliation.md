# Human Verification — vertical-slice design reconciliation

Status: Accepted
Date: 2026-09-23
Owner: Orchestrator (Lead Architect role)

Reconciles the G-3 design artifacts against the vertical-slice brief of
2026-09-23, **before** any implementation. The rule applied throughout: prefer
amendment to replacement, and do not redesign what already has a sound design.

Authoritative inputs:

- `llm/specs/2026-09-18-human-verification-capability-design.md` (942 lines)
- `llm/specs/2026-09-18-human-verification-activity-plan.md` (411 lines)
- `llm/specs/2026-07-21-design-surface-capability-design.md`
- `plugin/scripts/governance-checks.mjs` (733 lines), `llm/governance/l0-fast-track.md`

---

## 1. Already fully represented — implement directly, change nothing

| Brief requirement | Where the design already settles it |
|---|---|
| Six verification states, no others | §5.1 — exactly the brief's six. The brief's "INCONCLUSIVE **if the existing spec supports it**" defers; it does not, and `NEEDS REWORK` covers it. **No new state name.** |
| No agent may self-promote to HUMAN VERIFIED | §5.3 — four independent mechanisms (tool separation, actor-class gate, independence, determinism cap) |
| `AGENT VERIFIED` is not a step toward `HUMAN VERIFIED` | §5.2 — stated explicitly in the transition table |
| Claim identity `P1-AC-01` | §3.2 — `<SCOPE>-<KIND>-<nn>`, `<KIND>` delta-bound |
| Exact-claim binding / invalidation on wording change | §5.4 — `text_sha256`, resets to `NOT VERIFIED` |
| Artifact invalidation beyond claim text | §5.5 — `commit_sha`, `artifact_sha256`, `dataset_sha256`, `execution_id` |
| Append-only history | §3.5 — marker block accumulates; current state is the **last** line; a reset appends |
| Determinism ≠ verification | §14.1 vs §5/§6 — two separate axes, never one boolean |
| REPLAY / MODIFIED REPLAY / INDEPENDENT VERIFICATION | §14.2, and §14.4 makes MODIFIED REPLAY **required** for `HUMAN VERIFIED` on L3/L2 |
| Vacuous-check detection | §14.3 and fixture claim `P1-AC-04` |
| PDataset record + provenance + honest links | §4.1, §4.2 — `derived_from` required, `link_resolution: published\|local\|missing`, never fabricate |
| Surface projection, not a separate registry | §2.1, §2.3 |
| Design Surface is unimplemented — does that block? | **No.** §17a **D-1**: "A3 builds the minimum engine. Design Surface is a consumer, not a prerequisite." |
| Fixture content | Activity plan §13.1 / §13.2 — already designed claim-by-claim |

## 2. Partially represented — build, but the design already names the seam

- **Machine verification.** §8 specifies `--surface` mode and a 6th diff shape.
  Neither exists: `governance-checks.mjs` has `--l0` and `--layout` only, and
  `l0-fast-track.md` line 313 says "beyond the **five** above". Build both.
- **Human-authored verification code.** The evidence model carries
  `produced_by` with an actor class (§3.1), so a human-authored check is
  *representable* — but no artifact, path or flow demonstrates one. The slice
  must produce one and keep it as evidence.
- **PDataset binding.** §4.3 records honestly that "there are **zero** data
  files across all six adopting repositories" and ships v1 with schema +
  fixture and "no real binding until a research adopter exists". The slice
  provides the first real binding, which is exactly what §4.3 anticipated.
- **Verifier role.** A8 specifies `plugin/agents/verifier.md`; it does not exist.

## 3. Missing from the current specification

**Nothing material.** The brief's requirements map onto the design almost
completely — which is the strongest evidence that the design is sound. Two
omissions are real but small, and are amended below rather than redesigned:

1. No guidance on **how a human executes** a replay from the interface (§5.1 below).
2. The plan designs **two** fixtures; the brief wants **one** that exercises
   both domains (§5.2 below).

## 4. Conflicts with the existing design

### C-1 — the determinism scale is INVERTED in two places. Load-bearing.

§14.1 defines the scale:

| | | |
|---|---|---|
| **L3** | Deterministic | strongest |
| **L2** | Executable, non-deterministic | |
| **L1** | Attested | weakest |

But two sections use "Level 3" to mean the **weakest**:

- §4.1: "A `manual` transformation is a **Level 3** operation by §14 regardless
  of how deterministic it looks." — intent is clearly *weakest*; §14 says L3 is
  *strongest*.
- §5.5: "**Level 3** cannot bind an output. For nondeterministic operations the
  manifest binds the *inputs*…" — again *weakest*, i.e. L1.

An implementer following §4.1 or §5.5 literally would classify attested,
manual and LLM work as **deterministic** — inverting the one cap that stops an
agent's say-so reaching `HUMAN VERIFIED` (§5.3 mechanism 4). This is the single
most dangerous defect found in reconciliation and it **must** be amended before
any code reads a determinism level.

**Resolution: amend §4.1 and §5.5 to say `L1`.** §14.1's scale is canonical and
is cited correctly everywhere else (§5.3, §6.3, §14.4).

### C-2 — "Executable UI is deferred entirely" (§7.3) vs the brief's execution requirement

§7.2/§7.3 reject Quarto as a dependency — **correctly**, and the brief's
instruction to re-evaluate rather than assume Quarto reaches the same answer:
Quarto, R, Rscript, jupyter and pandoc are absent; `governance-checks.mjs` is
deliberately zero-dependency. `Renderer: none | quarto` stands.

But §7.3 then defers *executable UI* entirely, while the brief requires the
human be able to rerun and modify a verification.

**This is reconcilable without touching the architecture.** The brief itself
lists "generated commands launched in the repository environment" as an
acceptable implementation, and demands the **execution boundary be explicit**
and that we "do not create fake browser execution". Static HTML that emits
exact, copy-pasteable REPLAY and MODIFIED REPLAY commands satisfies the brief
*and* keeps `Renderer: none` zero-dependency. What remains deferred is an
interactive console, which is what §7.3 was actually protecting against.

**Resolution: amend §7.3** to distinguish *deferred interactive console* from
*required generated-command execution path*.

### C-3 — §9.1's code sketch contradicts §3.5's append-only rule

Found during implementation, not during the first read. §9.1 resolves the
`checkbox-only` collision with a sixth shape and sketches it as:

```js
return pairedConstraint(file, removed, added, (l) => l.replace(/\[( |[xX])\]/, '[·]')
```

Wrong twice:

1. **`pairedConstraint` permits a 1:1 removed/added replacement** — precisely
   the in-place rewrite §3.5 forbids: *"Removal is a violation, and it is
   mechanically checkable."*
2. **Its filter requires every changed line to be a checkbox list item**, but
   markers are continuation lines beginning with `—` (§3.4). The sketch would
   reject the lines it exists to permit.

**Resolution: amend §9.1 to defer to §3.5.** Implemented as: no line removed or
edited versus base; every added line a well-formed marker; no added marker
asserting a human state, since the L0 lane is the agent lane.

## 5. Requires an amendment (no ADR needed)

| # | Amendment | File | Why not an ADR |
|---|---|---|---|
| A-1 | `Level 3` → `L1` in §4.1 and §5.5 | capability design | Correcting a typo'd citation of §14.1, not deciding anything |
| A-2 | §7.3 gains the generated-command execution path; interactive console stays deferred | capability design | Clarifies scope the section already intended |
| A-3 | One merged slice fixture drawn from §13.1 + §13.2 | activity plan | Scope note for the slice; both fixture designs stand |
| A-4 | §9.1's sketch defers to §3.5 (C-3) | capability design | Correcting a sketch against the rule it was meant to implement |

**No ADR is required for the slice.** §8 already anticipates ADR-0002 and
ADR-0003 for the *full* capability; the slice neither settles nor pre-empts
them. Writing an ADR now would decide, on a vertical slice's evidence, a
question the full implementation should decide on its own.

## 6. Implementable directly from the current spec

Everything in §1, plus the amended §4.1/§5.5/§7.3. Concretely the slice builds:

1. `plugin/scripts/surface.mjs` — the minimum engine per **D-1**: parse claims
   and markers, compute `text_sha256`, bind artifacts, emit a manifest.
2. Verification projection → **static HTML**, `Renderer: none`, zero deps.
3. One merged fixture: source dataset → deterministic transformation →
   generated dataset, both as PDatasets with provenance and hashes.
4. REPLAY and MODIFIED REPLAY as real executable artifacts.
5. A human-authored independent check, preserved as evidence.
6. `--surface` mode in `governance-checks.mjs` + the 6th diff shape.
7. Negative fixtures proving each check can fail.

## Scope held deliberately

Not built here, per the brief's scope control and §8's full list: the
`verify-claim` skill, the Verifier agent charter, `llm/governance/verification.md`,
the eleven integration points, ADR-0002/0003, Design Surface Tier 2, adopter
migration. G-3 stays **SPECIFIED** until the slice is human-verified.
