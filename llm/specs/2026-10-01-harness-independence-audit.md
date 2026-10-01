# Harness Independence Audit and Target Architecture

Date: 2026-10-01
Status: Assessment and design input; implementation not started.

## Objective

Make Agentic Governance a harness-independent protocol that can execute with Claude Code, OpenCode, Codex, CI, or a future agent harness without changing governance semantics.

> Agentic Governance defines the protocol. A harness implements the protocol.

No harness-specific directory, plugin API, tool name, skill, agent format, or third-party workflow may be the only location where governance meaning exists.

## Executive finding

The repository is closer to harness independence than its current Claude Code packaging suggests. The canon under llm/governance is predominantly portable: governance levels, the L0 fast track, human approval boundaries, the two-plane repository model, governance deltas, design authority, bounded assignment contracts, evidence/provenance expectations, deterministic governance checks, and the Issue -> Branch -> Draft PR -> Review -> Merge lifecycle.

The runtime is strongly Claude-coupled. The current distribution mechanism is explicitly a Claude Code plugin. Agent definitions use Claude tool names and CLAUDE_PLUGIN_ROOT; skills depend on Claude plugin lifecycle, slash-command conventions, and AskUserQuestion; the Chief Architect explicitly requires Superpowers and Constellize workflows.

The protocol does not need to be rewritten. The runtime boundary needs to be extracted.

## Classification

| Current element | Classification | Target |
|---|---|---|
| llm/governance canon | Core protocol | Preserve as harness-neutral authority |
| Governance levels and L0 policy | Core protocol | Preserve |
| Governance delta and declared paths | Core protocol | Preserve and schema-validate |
| Human approval and merge boundaries | Core protocol | Preserve |
| Bounded Agent Assignment Contract | Core protocol | Promote as portable agent contract |
| Evidence and provenance | Core protocol | Preserve |
| governance-checks.mjs | Deterministic capability | Keep runnable without an LLM |
| AGENTS.md | Portable bootstrap, currently inverted | Make primary harness-neutral bootstrap |
| CLAUDE.md | Claude adapter/bootstrap | Thin projection; no unique policy |
| .claude-plugin manifests | Harness adapter | Claude distribution only |
| plugin/agents/*.md | Portable role plus adapter metadata | Split role semantics from tool/model metadata |
| plugin/skills/*/SKILL.md | Portable workflow plus adapter mechanics | Split workflow semantics from invocation mechanics |
| CLAUDE_PLUGIN_ROOT | Claude-only locator | Adapter-resolved framework_root |
| Claude tool names | Harness adapter | Canonical capabilities mapped by adapter |
| AskUserQuestion | Harness adapter | human.request_decision capability |
| governance slash commands | Adapter invocation | Canonical operation IDs plus native syntax |
| Superpowers | Capability provider | Require workflow outcomes, not provider |
| Constellize | Capability provider | Require specialist/lifecycle contracts, not provider |
| gh CLI | Environment provider | scm capability with CLI/API fallback |
| WebSearch/WebFetch | Harness-specific names | web.search and web.fetch capabilities |
| CI checks | Independent executor | First-class non-LLM adapter |

## Concrete coupling

### Bootstrap inversion

AGENTS.md currently redirects to CLAUDE.md and calls it the single instruction set. Target: AGENTS.md points directly to canonical llm authority. CLAUDE.md becomes a Claude-specific projection and owns no unique policy.

### Agent definitions mix semantics with runtime metadata

The Chief Architect charter contains durable governance behavior, but its front matter names Claude tools and its body resolves canon through CLAUDE_PLUGIN_ROOT. It also requires Superpowers and Constellize by name.

Target canonical agent definitions express role, purpose, inputs, outputs, required capabilities, prohibitions, independence requirements, governance gates, and evidence obligations. Adapters add model/tool/permission syntax.

### Third-party implementations are currently normative

Target: governance requires outcomes. A design-before-implementation workflow requires problem exploration, constraints, alternatives, recorded decision, implementation plan, and required approval. Claude may satisfy it with Superpowers; OpenCode may use native planning plus a portable skill; a generic adapter can run the framework implementation.

Specialist delegation should require capabilities such as architecture_review, requirements_analysis, qa_verification, or knowledge_stewardship. Constellize can be one provider.

### Skills combine portable procedures with Claude mechanics

Establish, audit, and migrate are useful operations independent of Claude. Target canonical operation IDs are governance.establish, governance.audit, governance.migrate, and governance.verify. Adapters expose native command syntax.

### Package discovery is Claude-specific

Replace CLAUDE_PLUGIN_ROOT with runtime context containing framework_root, project_root, governance_delta, and artifact_root. Adapters resolve physical paths.

## Target architecture

    Project / Research Repository
              |
              v
    Agentic Framework Core
      policy / workflows / roles
      evidence / verification / human gates
              |
              v
    Capability Contract
      filesystem.*   execution.*
      scm.*          agents.*
      human.*        web.*
      verification.* evidence.*
              |
       +------+---------+------+
       |                |      |
    Claude Code      OpenCode  CI
      adapter         adapter adapter

## Proposed canonical structure

    agentic-governance/
      protocol/
        capability.schema.yaml
        agent.schema.yaml
        workflow.schema.yaml
        evidence.schema.yaml
        governance.schema.yaml
      agents/
      workflows/
      skills/
      adapters/
        claude-code/
        opencode/
        codex/
        generic/
        ci/
      llm/
      tests/conformance/

Exact folder names should be decided during planning; the architectural separation is the requirement.

## Capability contract

Illustrative required capabilities:
- filesystem.read and filesystem.write
- execution.command
- scm.inspect, scm.branch, scm.pull_request
- agents.delegate
- human.request_decision
- verification.independent_review

Optional capabilities include web.search, web.fetch, lifecycle hooks, and MCP/integration support. A conformance command should report unsupported capabilities and approved fallbacks before work begins.

## Provider mapping

| Protocol need | Claude Code | OpenCode | Generic fallback |
|---|---|---|---|
| Portable instructions | AGENTS plus thin CLAUDE projection | AGENTS | AGENTS |
| Specialist agent | Claude subagent | OpenCode subagent | bounded sequential role |
| Skill | Claude plugin skill | native/portable skill | workflow runner |
| Design workflow | Superpowers provider | native/portable planning | framework workflow |
| Specialist personas | Constellize provider | native/framework agents | canonical roles |
| Human gate | Claude interaction | harness interaction | explicit stop and recorded decision |
| Deterministic checks | Node/shell | Node/shell | Node/shell/CI |
| Canon location | plugin root | adapter/package root | configured framework root |

## Conformance invariants

1. Deleting Claude-specific runtime files loses no governance meaning.
2. Claude runtime files can be regenerated from canonical definitions.
3. OpenCode runtime files can be generated from the same definitions.
4. The same work receives the same governance classification and gates regardless of harness.
5. Human approval authority is unchanged by harness.
6. Independent verification requirements are unchanged by harness.
7. Deterministic checks run without an LLM.
8. Missing optional capabilities cause explicit fallback or failure, never silent weakening.
9. Superpowers and Constellize may improve execution but are not required for semantic correctness.
10. Harness adapters cannot override canonical policy.

## CI as a first-class executor

CI should enforce checks that do not require semantic judgment: delta/schema validity, declared paths, evidence/provenance records, generator/input metadata, reproducibility command/config/seed requirements, required verification reports, implementer/verifier independence metadata, human approval evidence, and generated-adapter drift.

## Relationship to Agentic Research

Agentic Research should extend this protocol rather than define a separate harness model. Research roles, workflows, reproducibility, citation verification, dataset provenance, and experiment verification become extensions over the same capability contract.

## Migration boundaries for planning

1. Define protocol schemas and versioning.
2. Convert AGENTS.md into the portable bootstrap.
3. Extract canonical agent roles from Claude front matter.
4. Extract workflows from Claude skills.
5. Replace named Superpowers/Constellize requirements with capability/outcome contracts.
6. Implement a Claude adapter preserving behavior.
7. Implement OpenCode as the second conformance target.
8. Add adapter generation and drift checks.
9. Add harness capability/conformance checking.
10. Prove equivalence with cross-harness fixtures.
11. Migrate Agentic Research onto the same adapter model.
12. Only after parity, deprecate runtime-specific sources of truth.

## Non-goals

No current Claude behavior is removed. No Superpowers or Constellize integration is removed yet. No governance semantics are changed. No consumer repo is migrated. No adapter/compiler implementation is started.

The next artifact should be an implementation plan built from this audit and the Agentic Research companion audit.
