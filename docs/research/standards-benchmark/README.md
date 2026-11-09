# Standards benchmark for agentic-governance

Status: Draft
Last updated: 2026-11-09
Owner: Project owner
Design authority: `llm/specs/2026-11-09-standards-completeness-study-design.md`
Tracking issue: #32

Research data for measuring how completely agentic-governance covers the
requirements of established software engineering and AI governance
standards, and how deeply it enforces what it covers.

## Files

| File | What it is |
|---|---|
| `requirements-catalog.csv` | 174 requirement rows from ten sources, each with clause or practice ID, a paraphrase, a preliminary scope screen, and a note on how far the clause numbering was confirmed |
| `coding-scheme.md` | The codebook: scope screen, the 0–5 depth scale, evidence and tie-break rules |
| `coding-CL.csv` | Single-coder pilot coding by Claude against canon commit `01c7d69` (v0.9.1). **Not a study result.** |
| `benchmark-landscape.md` | Which existing benchmarks apply (from Atharva's memory-benchmark survey), and the five we build |

## Sources in the catalog

| Source | Edition used | Rows | Granularity |
|---|---|---|---|
| ISO/IEC/IEEE 12207 | 2026 (published April 2026; numbering follows the 2017 structure, to confirm against the 2026 mapping annex) | 30 | Process |
| ISO/IEC/IEEE 29148 | 2018 (marked "to be revised"; DIS in progress) | 9 | Clause |
| ISO/IEC/IEEE 42010 | 2022 | 8 | Topic (clause numbers unconfirmed) |
| IEEE 1028 | 2008 (Inactive-Reserved, still the reference text) | 8 | Review type and cross-cutting rule |
| IEEE 828 | 2012 (Inactive-Reserved; P828 revision active) | 8 | CM activity |
| NIST SP 800-218 (SSDF) | v1.1 final; v1.2 draft row kept as sensitivity | 20 | Practice |
| NIST SP 800-218A | July 2024 | 9 | Task (new or augmented) |
| NIST AI RMF | AI 100-1, 1.0 (revision announced, no successor) | 19 | Category |
| ISO/IEC 42001 | 2023 | 45 | Clauses 4–10 and all 38 Annex A controls |
| OpenSSF Scorecard | v5, 18 checks | 18 | Check |

Requirements are **paraphrased**, never quoted, and identified by clause
or control number so a reader with the licensed text can check them. Rows
whose clause numbers have not been confirmed against the standard text say
so in `clause_check`.

## Preliminary picture (single coder, do not cite)

Computed from `coding-CL.csv` over rows screened `IN` or `PARTIAL`.
"Covered" is depth ≥ 2; "enforced" is depth ≥ 4. The study harness will
recompute these from the two independent codings.

| Standard | Rows | Covered | Enforced |
|---|---|---|---|
| IEEE 828 (configuration management) | 8 | 6 (75%) | 3 |
| IEEE 1028 (reviews and audits) | 8 | 5 (62%) | 0 |
| ISO/IEC 42001 | 36 | 22 (61%) | 1 |
| ISO/IEC/IEEE 12207 | 25 | 15 (60%) | 3 |
| ISO/IEC/IEEE 42010 | 7 | 4 (57%) | 1 |
| NIST SP 800-218A | 5 | 2 (40%) | 0 |
| NIST AI RMF 1.0 | 18 | 7 (39%) | 0 |
| ISO/IEC/IEEE 29148 | 9 | 2 (22%) | 0 |
| NIST SP 800-218 | 19 | 4 (21%) | 1 |
| OpenSSF Scorecard | 16 | 2 (12%) | 2 |

The shape is more informative than the numbers. The canon is strongest
where it was designed to be: decisions, change control, review and audit,
and AI roles and accountability. It is thin on requirements, security,
measurement and risk. And most of what it covers is *specified* or
*procedural*; only a handful of requirements reach a deterministic check or
a platform gate.

## Gap themes from the pilot

Each theme groups requirements coded 0 or 1 in scope. They are proposed as
backlog candidates in `llm/features/BACKLOG.md` (G-5 to G-10), to be
confirmed or dropped once two coders agree.

| Theme | Requirements behind it | Note |
|---|---|---|
| Requirement identity and traceability | 29148 5.2.4–6.6.1; 12207 6.4.2–6.4.3; 42001 A.6.2.2 | Already backlog **G-3**; the pilot adds standards evidence for it |
| Security baseline | SSDF PO.1, PO.4, PS.2, PW.4–PW.9, RV.1–RV.3; Scorecard Security-Policy, Dependency-Update-Tool, Token-Permissions, Pinned-Dependencies, SAST, Dangerous-Workflow | Most of these could be installed by `establish` and checked |
| Measurement | 12207 6.3.7; AI RMF MEASURE 1, 3, 4; 42001 clause 9 | The canon claims to spend human review well but never measures it |
| Risk management | 12207 6.3.4; 42001 clauses 6 and 8; AI RMF MAP 4–5, MANAGE 1 | Risks are listed per deliverable but never tracked |
| Agent provenance and supplier policy | 218A PS.3.2, PW.5.1, RV.1.1; 42001 A.6.2.8, A.10.3; AI RMF GOVERN 6, MAP 3 | Extends G-1: which model and harness produced what is not recorded |
| Release governance | 12207 6.4.10; IEEE 828 BUILD, RELEASE; SSDF PS.2, PS.3 | Canon versions itself but sets no release rules for adopters |
| Incident response | 42001 A.8.4; AI RMF MANAGE 4; SSDF RV.1–RV.3 | Only an emergency-repair exception exists |
