# L0 Fast-Track Policy

Status: Active
Last updated: 2026-07-11
Owner: Project owner (canonical governance)
Applies to: all repos adopting agentic-governance (see each repo's `docs/governance-delta.md`)

## Purpose

This document is the single source of truth for the L0 fast-track lane: the
twelve eligibility conditions, the Administrative Change Certification
standard, the L0 path allowlist model, the ordered artifact chain, the
honest-gaps declaration requirement, and per-repo activation. Other
documents cite this one; they must not restate this policy.

The fast track is the only lane in which an AI role (the Repository Steward)
may merge. It exists for one purpose: stop spending human review on changes
that are mechanically verifiable as meaning-preserving. It is deliberately
narrow; anything that falls out of it lands in normal human review, which is
never a failure.

## Scope

Fast-track eligibility, certification, allowlisting, merge procedure, and
activation. Classification itself (the L0 definition, semantic test,
conservative default, escalation rules) lives in
`docs/governance-levels.md`. Steward duties and prohibitions live in the
Repository Steward charter (`governance/agents/repository-steward.md`).

## Delta Parameters

This policy is parameterized per repo. Each adopting repo's
`docs/governance-delta.md` declares (fields defined in
`docs/governance-delta-template.md`):

- **Governance check command** — the command that runs the repo's
  governance checks (canonical script: `governance/scripts/governance-checks.mjs`
  in this repo, installed or referenced per repo).
- **Design-authority document** — the document name/path substituted where
  this policy says "design-authority document."
- **Memory-bank path** and **roadmap path**.
- **L0 Path Allowlist** — the fenced `l0-allowlist` block the check command
  parses.
- **Platform Enforcement Reality** — what the hosting platform actually
  enforces vs what is convention-only.
- **Steward Activation Status** — see Per-Repo Activation below.

Delta-parameterized fields are project facts, not policy: the policy in
this document does not vary per repo.

## Per-Repo Activation

**Steward merge authority ships inert.** Adopting agentic-governance —
including running `/governance:establish` — never grants the Repository
Steward merge authority. In every adopting repo the fast track is INACTIVE
until both of the following exist:

1. A repo-local ADR recording the decision to grant the steward L0
   fast-track merge authority, with the repo's platform-enforcement reality
   and identity model documented in its context.
2. A human-approved, human-merged activation PR that flips the repo's
   governance delta to `Steward Activation Status: ACTIVE`, citing that ADR.

This policy activates only after that activation PR is human-approved and
merged by the project owner. Until then, no fast-track merges occur,
regardless of classification. While inactive, L0 PRs take human merge; the
certification and independent audit may still be produced as review
accelerators, but they authorize nothing.

Deactivation is a human-owner statement on an issue or PR plus a delta flip
back to INACTIVE; no ADR is required to revoke.

## Eligibility — the Twelve Conditions

A PR may be fast-track merged only when **all twelve** conditions are true.
Any single condition failing routes the PR to normal review rules for its
level.

1. The PR is classified **L0** under the Governance Classification Model
   (`docs/governance-levels.md`).
2. Every diff line is **non-semantic** per the Semantic vs Non-Semantic
   Test (`docs/governance-levels.md`).
3. **No production code** is touched.
4. **No executable schema or migration** is touched.
5. **No behavioral configuration change** — nothing whose value alters
   runtime, CI/CD, tooling, or agent behavior.
6. **No new ADR** is created and **no ADR content** is changed.
7. Any **ADR status change** records a decision already approved in a
   **merged PR, cited by number** in the diff or PR body.
8. **No design-authority-document, domain, product, privacy, security, or
   business-rule change** (the design-authority document is named in the
   repo's delta).
9. The required automated checks pass: the repo's governance check command
   (declared in the delta), including its `--l0` mode, which validates
   every changed path against the repo's L0 Path Allowlist.
10. An **independent Governance Auditor audits the classification and
    records PASS** — a separately-run audit agent session whose **audit
    PASS/REJECT** is recorded as a PR comment (only the steward
    *certifies*; the auditor *audits*). Where all agent identities share
    one platform token (see the delta's Platform Enforcement Reality), the
    audit must be a distinct recorded **artifact**, not a distinct
    identity: separation is temporal and artifactual.
11. The PR body contains the **Administrative Change Certification**
    (standard below).
12. There are **no unresolved review findings** on the PR — every comment
    thread resolved, every auditor or check flag addressed or escalated.

## L0 Path Allowlist

Each repo's delta carries a fenced `l0-allowlist` block that the governance
check command parses in `--l0` mode. The check fails the fast track if any
changed path falls outside the allowlist, or if a path-specific diff-shape
constraint is violated. Where the check cannot mechanically verify intent,
the residual verification belongs to the Governance Auditor.

### Block Format

One rule per line inside a fenced block whose info string is
`l0-allowlist`:

```text
allow <glob> <shape>
deny <glob>
```

Globs: `**` (any path), `*` (any non-slash run), `[...]` character classes.
Deny rules are checked first. `<shape>` is one of the diff-shape constraints
below and is required on every `allow` line.

| Shape | Permitted change | Mechanical check (`--l0`) | Residual (auditor) |
|---|---|---|---|
| `path-only` | Sync to already-merged, already-approved work | Path match only | Content records merged reality; no new decisions |
| `status-line-only` | An ADR's `Status:` line **only**, in the constrained form `Status: <Proposed\|Accepted\|Superseded\|Deprecated> (via PR #n[, YYYY-MM-DD])` — no free prose in the parenthetical | Every removed and every added line in the file's diff matches `/^Status:/`, and each added line matches the constrained form; any other changed line fails | Cited PR really approved the decision (condition 7) |
| `index-table-rows` | Index regeneration; status/date cells of index rows | Diff confined to index-table rows | Rows match the indexed files' actual statuses |
| `checkbox-only` | Status checkboxes | Every changed line is a checkbox list item, and each removed/added pair differs only in `[ ]` vs `[x]` | Checked items are verifiably complete via merged work |
| `link-target-only` | Link/cross-reference path fixes only | Every changed line contains a Markdown link, and each removed/added pair is identical except link targets | The fix corrects a path — it never substitutes **which** document is referenced |

### Template Allowlist

The starting-point block for a new repo (instantiate in the delta with the
repo's real paths):

```l0-allowlist
allow <memory-bank path>/** path-only
allow docs/adr/README.md index-table-rows
allow docs/adr/[0-9][0-9][0-9][0-9]-*.md status-line-only
allow <roadmap path> checkbox-only
allow docs/** link-target-only
deny src/**
deny scripts/**
deny .github/**
deny docs/governance-delta.md
deny docs/adr/0000-template.md
```

### The Deny Rule

The following are **always denied**, whether or not a repo's block lists
them — the check command enforces this unconditionally:

- The repo's governance delta (`docs/governance-delta.md`) — it contains
  the allowlist itself, and an L0 PR must never amend the rules that judge
  it.
- Governance policy documents: any repo-local counterpart of the canonical
  governance docs (architecture governance, operating system, review
  checklist, definition of done, labels, branch protection) and role
  charters/constitutions.
- Production code, scripts (including the governance check script itself),
  and CI/workflow configuration (`.github/**`).

Typo-only fixes in denied paths may still be L0-*classifiable* per the L0
category list, but the check cannot mechanically distinguish prose from
behavior there, so they always leave the fast-track lane and take human
review.

### The Read-From-Base Rule

The check reads this allowlist from `origin/main`, never from the PR's own
tree, so an L0 PR can never amend the rules that judge it. (Bootstrap
exception: if the delta on `origin/main` predates the allowlist block, the
check may fall back to the working tree with a loud warning — and the PR
that introduces the block is itself semantic, L1.)

Where the allowlist and the mechanical capability of the check command
diverge, the check's stricter behavior wins: if the check cannot verify a
constraint, the change is not fast-track eligible.

## Administrative Change Certification

Every fast-track PR body carries this block, copied and completed.
Boilerplate rationale ("routine sync") fails audit; the non-semantic
argument must be specific to the diff.

````markdown
## Administrative Change Certification

- **Governance level:** L0 (administrative, non-semantic)
- **Why this change is non-semantic (specific to this diff):**
  <e.g., "Flips ADR-0011 Status from Proposed to Accepted, recording the decision
  approved in merged PR #18; the status line is the only changed line.">
- **Files changed:**
  - `<path>` — <one-line administrative description>
- **Automated checks performed and results:**
  - `<governance check command> --l0` — PASS (<CI run link, or link to the
    PR comment containing the pasted local run output>)
- **Auditor result:** PASS — <link to the Governance Auditor's PR comment>
- **Approved-decision citation** (required for any ADR status flip): PR #<n>
- **Declarations** — I certify each of the following is unchanged by this PR:
  - [ ] Architecture
  - [ ] Product meaning and requirements
  - [ ] ADR meaning (content and decisions)
  - [ ] Business rules
  - [ ] Privacy and consent policy
  - [ ] Security posture and controls
  - [ ] Implementation behavior (code, schemas, migrations, executable configuration)
- **Certified by:** Repository Steward, session of <date>
````

## Ordered Artifact Chain and Merge Procedure

Where the platform enforces little or nothing (see the repo delta's
Platform Enforcement Reality), role separation is reconstructed as
**ordered, recorded artifacts on the PR itself**. The Repository Steward may
merge only after all three artifacts exist on the PR, in this order:

1. **Checks-pass evidence.** The governance checks ran and passed — as a CI
   run if the repo can run them there, or, if not, a local run whose output
   is pasted as a PR comment is the accepted equivalent. **No recorded
   result, no fast-track.**
2. **Administrative Change Certification** in the PR body (standard above).
3. **Independent auditor PASS as a PR comment**, created before merge by an
   audit agent run as a **separate session** from the authoring/steward
   session. A steward session may never author its own audit; any doubt
   about the audit session's independence forces human review.

Formal platform approvals are required only where the repo's Platform
Enforcement Reality says they bind anything; where they bind nothing, they
are neither required nor relied on — the artifact chain is the record.

**Merge mechanics.** With the chain complete, the Repository Steward merges
with `gh pr merge <n> --squash --delete-branch` (pass `--delete-branch`
explicitly unless the repo auto-deletes), closes linked issues whose
acceptance criteria are verifiably met by the merged work, and records the
operation per the audit-trail mechanism in the Repository Steward charter.

**Failure handling.** Any missing, failed, or unproducible artifact; any
non-PASS audit; any check failure; or any classification uncertainty ⇒ the
PR leaves the fast track and takes normal review rules (see the escalation
rules in `docs/governance-levels.md` — the auditor's rejection is final for
this lane). The Governance Auditor audits solely against the twelve
conditions and the repo's allowlist; `docs/review-checklist.md` remains the
L1–L3 review instrument and gains no L0 subsection.

## Honest-Gaps Declaration

Every adopting repo must state honestly what its checks enforce and what
rests on discipline. The canonical baseline:

Mechanically verifiable by the governance check command in `--l0` mode:

- Changed paths fall inside the allowlist and outside the denied set.
- Diff shapes match their declared constraints (status-line-only,
  index-table-rows, checkbox-only, link-target-only).
- Presence of the certification block heading and checked declarations in
  the PR body (when the body is supplied).

**Not** mechanically verifiable — these rest on the auditor, the steward's
discipline, and post-hoc detectability:

- Whether a change is actually meaning-preserving (conditions 2, 5, 8) —
  the semantic test itself is judgment.
- Whether the cited merged PR actually approved an ADR's decision
  (condition 7).
- Whether a link fix preserves *which* document is referenced.
- Whether the audit session was genuinely independent of the
  authoring/steward session (condition 10).
- Artifact ordering — unless the platform blocks it, nothing prevents a
  merge before the chain is complete.
- Anything the repo's Platform Enforcement Reality section says the
  platform cannot gate.

The repo's delta must record, in its Platform Enforcement Reality section,
which conventions its platform can convert into hard gates (required
checks, branch protection, distinct identities) and which remain
convention-only — plus the hardening path if one exists. The fast track
adds no new exposure class where enforcement is absent — only automation
acting inside the existing exposure, plus artifacts that make misuse
detectable after the fact.

## Assumptions

- The canonical check script (`governance/scripts/governance-checks.mjs`)
  implements the block format and shapes above; a repo may substitute an
  equivalent command, declared in its delta, provided it preserves both
  security properties: the read-from-base allowlist and the paired
  diff-shape constraints.
- Until a repo's governance check command exists and runs, condition 9
  cannot be satisfied and no fast-track merge can occur there.

## Open Questions

- Whether canonical shapes beyond the five above will be needed (e.g., a
  generated-file shape verified by regeneration). Add shapes here and in
  the script together; repos must not invent local shapes.

## Cross-References

- `docs/governance-levels.md` — classification model, escalation rules
- `docs/governance-delta-template.md` — the delta fields this policy reads
- `governance/scripts/governance-checks.mjs` + `governance/scripts/README.md`
  — the canonical check implementation and its honest limits
- `governance/agents/repository-steward.md` — steward charter, audit trail
- `governance/agents/chief-reviewer.md` — Governance Auditor duty
- `constitution/shared-principles.md` — the single-exception merge rule
- `docs/patterns/prompt-patterns.md` — steward/L0 and audit prompt patterns
