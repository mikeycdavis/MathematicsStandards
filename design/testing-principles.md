# Testing principles

How this repository is tested, and why the shape of the test suite is unusual. These are not
aspirations — every one of them is already in force, and each earned its place by finding a defect
that the conventional alternative did not.

A standards framework has a failure mode ordinary software does not: it can be wrong in a direction
that looks like success. A detector that never fires reports a clean run. A guard that cannot fail
reports green. Both look exactly like a healthy project, and neither has a complainant. So the suite
is built around three principles that target that asymmetry directly.

## 1. Honest-fixture testing

**Construct a realistic, genuinely compliant research project and assert that the framework does not
manufacture violations against it.**

`test/fixtures/math-compliant/` is a small number-theory project where every claim holds the status
its evidence supports: a definition, a lemma with a discharged obligation, a conjecture backed by a
recorded counterexample search, and a conditional theorem that rests on the conjecture and says so.
It is not a happy-path smoke test. It is an adversary for the *other* failure direction.

Three of the four design bugs found during v1.0.0 came from it, and none would have been caught by a
test that asserted a detector fires:

- A `DEFINITION` sits at rank 0, so a naive rank comparison reported every lemma resting on a
  definition as over-claimed. Definitions are stipulated, not unproved; only their open obligations
  propagate.
- `claims.status-exceeds-support` fired on `CONDITIONAL_THEOREM` — its own remedy. A rule that fires
  at the state it tells you to move to is impossible to satisfy, and an impossible rule gets switched
  off, at which point it catches nothing at all.
- The ledger parser read claims out of HTML comments, so the shipped template's own commented-out
  examples registered as real claims. Use versus mention, committed by the parser.

The general lesson: a framework that cries wolf gets disabled, and a disabled rule still counts
toward the coverage figure. False positives are not a lesser problem than false negatives here —
they are the mechanism by which false negatives eventually arrive.

## 2. Adversarial mutation testing

**Introduce exactly the defect a guard claims to prevent, and prove the guard changes the outcome.**

`npm run mutation-check` applies five mutations and asserts each gate fails, then restores the file.
It also runs an unmutated control, because a mutation suite that never passes proves nothing about
the mutations.

| Mutation | Gate that must fail |
| --- | --- |
| Renumber an item in the derived spec | `inventory` |
| Alter one word inside a block claimed as verbatim source | `fidelity` |
| Introduce a camelCase rule id | catalog load |
| Turn a mentioned `sorry` into a used one | the placeholder detector |
| Edit a source prompt after the fact | `integrity.provenance-digest` |

The fourth found the bug that mattered most. `'` was being treated as a string delimiter in Lean
sources, so the first primed identifier — `sq_nonneg'`, and primes are everywhere in mathematics —
opened a "string" that never closed, blanking the rest of the file out of the structural view. The
placeholder detector then reported a file containing `sorry` as clean.

No existing test could have found it. Every test touching that detector asserted that something did
**not** fire, and the bug satisfied all of them perfectly. It is precisely a false green produced by
the machinery that exists to prevent false greens, and only deliberately introducing the defect
revealed it.

The suite is deliberately not part of `npm test`: it writes to tracked files, restoring them
immediately, and that should be something a person runs on purpose. Run it after changing a gate, a
detector, or the comment-stripping logic.

## 3. Coverage honesty

**Never convert an expert-judgment rule into a weak detector to improve `frameworkCoverage`.**

Twenty-nine rules in the catalog have no detector and report `not-evaluated` in every run. Every one
could be given a regex tomorrow — a scan for `\bclearly\b`, a pattern for suspicious WLOG, a
heuristic for citation drift. Each would raise the coverage number, and each would fire on prose it
cannot read.

That trade is always bad, and it is bad in a specific way worth naming: a noisy rule gets suppressed,
a suppressed rule stops being read, and a suppressed rule *still counts as covered*. The coverage
figure would rise while the actual assurance fell. The 29 are load-bearing precisely as absences —
`docs/assurance-report.md` enumerates them, names who does establish each, and is generated from the
catalog so the claim cannot drift from the tooling.

Three practices follow:

- No count describing coverage is written into prose anywhere. Every figure is computed at run time
  or asserted by a test — a hand-maintained count is a fact about someone's memory.
- A rule with no detector reports `not-evaluated`, never `passed`, and never counts toward the score.
- A heuristic detection is labelled `INFERRED`, never `OBSERVED`. Reporting a phrase match as an
  observation is the tool fabricating certainty about its own output — the same error as presenting
  numerical evidence as proof, committed by the checker instead of the mathematician.

## The pattern behind all three

Ordinary detector tests ask *does the check fire on a violation?* That question alone admits a
framework that fires on everything, a framework whose guards cannot fail, and a framework whose
coverage number describes ambition rather than capability.

The three questions worth asking instead:

1. Does an honest project survive evaluation unharmed?
2. Does each guard actually fail when its protected defect is introduced?
3. Does the reported coverage describe what the tooling establishes, or what its authors hoped?
