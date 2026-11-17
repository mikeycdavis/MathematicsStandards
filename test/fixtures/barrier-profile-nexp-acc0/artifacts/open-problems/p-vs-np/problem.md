# P versus NP (fixture)

The mathematical wording in this record is the fixture's own recorded content. The framework checks
its structure and asserts none of it.

## Target Statement

P is not equal to NP.

## What Is Proved

Nothing about the target itself.

## What Remains Conjectural

The whole statement.

## Known Results

See the literature survey.

## Equivalences

None recorded.

## Where the Difficulty Lives

In getting past the known barriers together.

## Known Barriers

### Natural proofs
Statement: A natural combinatorial property, one that is constructive and large, cannot prove strong lower bounds against a circuit class that contains strong pseudorandom generators.
Scope: Circuit lower-bound arguments that proceed through a property of the truth table. Conditional on the existence of the pseudorandom generators named in the statement.
Rules out:
- Lower-bound arguments whose key property is both constructive and large, against a class that contains such generators.
Does not rule out:
- Arguments whose key property is not constructive, or not large.
- The algorithmic method behind NEXP not in ACC0, recorded here as an argument the profile does not cover, not as a counterexample to the profile's own statement.
Evidence: notes/natural-proofs.md (Razborov and Rudich, "Natural proofs", 1997); notes/nexp-not-in-acc0.md (Williams, ACC lower bounds, CCC 2011 / J. ACM 2014)

### Relativization
Statement: There are oracles relative to which P equals NP and oracles relative to which it does not.
Scope: Proof techniques that hold unchanged relative to every oracle.
Rules out: Diagonalization and simulation arguments that relativize.
Does not rule out: Arguments that use the structure of the computation and not only black-box access to it.
Evidence: notes/relativization.md (Baker, Gill and Solovay, 1975)

## Current Blocker

- A lower-bound technique that the profiles above do not describe.

## Terminated Approaches

### Direct diagonalization

Status: terminated 2026-01-05
Why: it relativizes; see notes/relativization.md
Evidence required to reopen: a non-relativizing diagonal argument.

## Stopping Criteria

A published proof, or a barrier result covering every remaining route.
