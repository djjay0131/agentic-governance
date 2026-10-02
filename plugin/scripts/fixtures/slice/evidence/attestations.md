# Attested evidence (`L1`)

`L1` evidence is testimony: a human or an agent states something and there is
nothing to re-execute (design §14.1). It is counted and surfaced, it never
blocks — and a claim whose only evidence is `L1` **cannot** reach
`HUMAN VERIFIED` (design §6.3, §14.4). An agent's assertion about its own work
is `L1` by definition (design §5.3, mechanism 4).

Evidence binds by **claim ID cited in the evidence artifact** (design §6.1,
§6.2), so the record lives here, next to the words it attests, rather than in
a mapping file.

## `P1-AC-02` — normalization preserves the meaning of the source records

<!-- EVIDENCE P1-AC-02
kind: assertion
determinism: L1
produced-by: fixture-builder (agent)
produced-at: 2026-09-22
locator: evidence/attestations.md
replay: none
-->

> I read the transformation and the two datasets and, in my judgement, no
> record's meaning is altered by normalization: upper-casing an identifier,
> trimming a name and fixing a score to two decimals are presentational
> changes only.
>
> — `fixture-builder (agent)`, 2026-09-22

**Nobody can check that.** There is no command, no output to compare and no
perturbation that would falsify it: "preserves the meaning" is not an
executable predicate. That is exactly what makes it `L1`, and exactly why
`P1-AC-02` caps at `AGENT VERIFIED` no matter how confident the wording is.
