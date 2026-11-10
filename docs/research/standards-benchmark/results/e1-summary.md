# E1 standards completeness — PILOT

Run status: PILOT
Coders: CL
Canon ref(s): 01c7d69
Catalog rows: 174
Validation: passed

## Coverage and enforcement

Headline denominator: catalog scope `IN`. `PARTIAL` and `OUT` are excluded;
`DRAFT` is excluded from the headline and reported as sensitivity (c).
Covered = depth >= 2. Enforced = depth >= 4.

| Coder | Source | Total rows | In scope | Covered | Enforced | Coverage | Enforcement |
|---|---|---:|---:|---:|---:|---:|---:|
| CL | ALL | 174 | 116 | 66 | 11 | 0.569 | 0.095 |
| CL | IEEE 1028 | 8 | 6 | 5 | 0 | 0.833 | 0.000 |
| CL | IEEE 828 | 8 | 7 | 6 | 3 | 0.857 | 0.429 |
| CL | ISO/IEC 42001 | 45 | 26 | 21 | 1 | 0.808 | 0.038 |
| CL | ISO/IEC/IEEE 12207 | 30 | 19 | 13 | 3 | 0.684 | 0.158 |
| CL | ISO/IEC/IEEE 29148 | 9 | 9 | 2 | 0 | 0.222 | 0.000 |
| CL | ISO/IEC/IEEE 42010 | 8 | 5 | 4 | 1 | 0.800 | 0.200 |
| CL | NIST AI RMF 1.0 | 19 | 14 | 7 | 0 | 0.500 | 0.000 |
| CL | NIST SP 800-218 | 19 | 16 | 4 | 1 | 0.250 | 0.063 |
| CL | NIST SP 800-218A | 9 | 2 | 2 | 0 | 1.000 | 0.000 |
| CL | NIST SP 800-218r1 (draft) | 1 | 0 | 0 | 0 | n/a | n/a |
| CL | OpenSSF Scorecard | 18 | 12 | 2 | 2 | 0.167 | 0.167 |

## Depth histogram

| Coder | Source | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---:|---:|---:|---:|---:|---:|
| CL | ALL | 24 | 26 | 35 | 20 | 6 | 5 |
| CL | IEEE 1028 | 0 | 1 | 1 | 4 | 0 | 0 |
| CL | IEEE 828 | 1 | 0 | 3 | 0 | 2 | 1 |
| CL | ISO/IEC 42001 | 1 | 4 | 12 | 8 | 1 | 0 |
| CL | ISO/IEC/IEEE 12207 | 1 | 5 | 7 | 3 | 2 | 1 |
| CL | ISO/IEC/IEEE 29148 | 4 | 3 | 2 | 0 | 0 | 0 |
| CL | ISO/IEC/IEEE 42010 | 0 | 1 | 1 | 2 | 1 | 0 |
| CL | NIST AI RMF 1.0 | 2 | 5 | 5 | 2 | 0 | 0 |
| CL | NIST SP 800-218 | 7 | 5 | 3 | 0 | 0 | 1 |
| CL | NIST SP 800-218A | 0 | 0 | 1 | 1 | 0 | 0 |
| CL | NIST SP 800-218r1 (draft) | 0 | 0 | 0 | 0 | 0 | 0 |
| CL | OpenSSF Scorecard | 8 | 2 | 0 | 0 | 0 | 2 |

## Agreement

PILOT: no coder pair is available, so kappa is not computed.
The single status row in `e1-agreement.csv` records this; it is not a pair.

## Sensitivity (spec §3.1)

### CL

- (a) PARTIAL rows included: denominator 151 rows, coverage 0.457, enforcement 0.073.
- (c) SSDF v1.2 draft row included: denominator 117 rows, coverage 0.573, enforcement 0.094.
- (b) weakest-part coding: not computable from the supplied codings — no `weakest_part_depth` column is present.
- (d) G-3 re-code: not run — no coding file carries a canon_ref other than the primary ref.

## Method notes

- One catalog row is one unit. `scope` is the coder's value when the coding file
  carries a `scope` column, otherwise the catalog's preliminary value; the
  agreement table names which source was used.
- Kappa uses the fixed scope categories IN/PARTIAL/OUT/DRAFT and the fixed
  depth categories 0–5, so a category absent from a sample still counts in the
  expected matrix. A degenerate expected matrix yields no kappa rather than a
  fabricated 1.0.
- The pilot file `coding-CL.csv` is not a study coder. When it is the only
  coding present, every output is labelled PILOT.

## Limitations

- Depth is a measure of mechanization, not effectiveness (study §6).
- Single-portfolio evidence, paraphrased clause-level rows, and edition drift
  are threats stated in the design and are not resolved by this scorer.
- Uncertain classifications remain semantic and go to human review.
