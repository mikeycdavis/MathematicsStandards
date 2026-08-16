# Claims ledger

§0c. Five entries, each isolating one property of how the framework recognises "this statement is an
approximation with no stated bound". Every one is a real shape from a frozen field trial, reduced to
the smallest ledger that exhibits it.

At v1.2.0 the recognition is two independently authored regexes over the same text — a trigger list
and a suppressor list — and nothing holds them to each other. CLM-0001, CLM-0003 and CLM-0004 are
false positives produced by that. CLM-0002 and CLM-0005 are the true positives that must survive the
repair, and they are here so the repair cannot be "delete the rule".

## CLM-0001 — The counting function's asymptotic

The marker that fires the trigger IS the required evidence. `O(` is declared an approximation marker,
and an asymptotic statement is not an approximation missing its bound: the `O` is the bound.
RiemannHypothesis's recorded case.

- **Status:** OBSERVATION
- **Statement:** The counting function satisfies pi(x) = Li(x) + O(x^{1/2} log x) for x >= 2.
- **Domain:** x real, x >= 2
- **Quantifiers:** none
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - citation — `external:vonmangoldt-1895`
- **Formal:** none
- **History:**
  - 2026-05-01 → OBSERVATION (registered, `notes/observations.md`)

## CLM-0002 — A constant, stated approximately and unbounded

The true positive. An approximation with no bound anywhere, from any marker. This one must still be
reported after the repair, and it is what stops C1 being satisfiable by weakening the rule.

- **Status:** NUMERICAL_OBSERVATION
- **Statement:** The constant equals approximately 2.5029078750.
- **Domain:** the constant
- **Quantifiers:** none
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - numerical — `notes/observations.md`
- **Formal:** none
- **History:**
  - 2026-05-01 → NUMERICAL_OBSERVATION (registered, `notes/observations.md`)

## CLM-0003 — An English preposition

`about` is a mathematical approximation marker only when it governs a quantity. Here it is the
ordinary preposition and the statement makes no approximation at all. PvsNP's recorded case.

- **Status:** OBSERVATION
- **Statement:** This lemma records a fact about the kernel of the transfer operator.
- **Domain:** the transfer operator
- **Quantifiers:** none
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - citation — `external:internal-note-4`
- **Formal:** none
- **History:**
  - 2026-05-01 → OBSERVATION (registered, `notes/observations.md`)

## CLM-0004 — The suppressor is narrower than the language

The statement says its bound in the plural. `\bbound\b` does not match `bounds`, because the word
boundary falls between `d` and `s`, so the trigger fires unsuppressed. PvsNP's recorded case: a
suppressor that does not match the word forms of the language it is written in.

- **Status:** OBSERVATION
- **Statement:** The truncated tail sum bounds the remainder.
- **Domain:** the tail sum
- **Quantifiers:** none
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - citation — `external:internal-note-5`
- **Formal:** none
- **History:**
  - 2026-05-01 → OBSERVATION (registered, `notes/observations.md`)

## CLM-0005 — The same word, governing a quantity

The second true positive, and the one that makes C2 a property rather than a deletion: `about` here
does mark an approximation, and nothing states its bound. It must still be reported.

- **Status:** NUMERICAL_OBSERVATION
- **Statement:** About 10^9 zeros were verified computationally.
- **Domain:** the first zeros
- **Quantifiers:** none
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - numerical — `notes/observations.md`
- **Formal:** none
- **History:**
  - 2026-05-01 → NUMERICAL_OBSERVATION (registered, `notes/observations.md`)

## References

- `external:vonmangoldt-1895` — von Mangoldt, 1895.
- `external:internal-note-4` — this project's note 4.
- `external:internal-note-5` — this project's note 5.
