# Standard 14 — Literature and Novelty

Two failures live here and they pull in opposite directions. One is claiming something new that is
already in the literature — usually not dishonesty, just a search that stopped early. The other is
citing something that does not exist, or that exists and does not say what it is cited for. The second
is the characteristic failure of language models, which produce references with the exact surface
features of real ones: plausible authors, a plausible journal, a well-formed identifier, and no
underlying paper.

Source: item 14 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every external reference and to every claim of novelty, in every regime.

## Requirements

### R1 — Compare against known results

From the source, the standards must cover:

- literature/known-result comparison

Before a claim is promoted to proved rank, it MUST be compared against what is already known, and the
comparison recorded. The record states what was searched and what was found — including, where that is
the answer, that nothing matching was found and where the search looked. A recorded negative search is
evidence with limits; an absent one is indistinguishable from not having looked, which is the same
principle [Standard 9](09-edge-cases-and-counterexamples.md) R2 applies to counterexamples.

The comparison has three possible outcomes and all three are useful: the result is known (record the
citation and stop), the result is new (record the search), or the result is a special case or
generalisation of something known (record which, because that relationship is usually the interesting
part).

### R2 — References resolve

Every `external:` reference in the ledger MUST carry enough to find the work: authors, title, year,
venue, and where one exists a DOI or arXiv identifier. A reference that cannot be resolved to a real
document MUST NOT be cited.

Fabricating a citation or a known result is prohibited outright. The prohibition needs stating even
though it sounds too obvious to need it, because the failure mode is not deliberate invention — it is
an agent generating a reference that fits the shape of the argument, and a human reading past it
because it looks exactly like the citations around it.

### R3 — A real reference can still be wrong

The harder failure is `literature.citation-statement-drift`: a genuine paper cited for a stronger
statement than it proves. The paper exists, the identifier resolves, the authors are correct, and the
theorem in it has an extra hypothesis, a smaller domain, or a weaker conclusion than the citing work
needs. This is more dangerous than fabrication precisely because every mechanical check passes.

A cited result therefore enters the ledger with the statement *as the source gives it*, not as the
citing work needs it. Where the citing work needs more, the gap is a proof obligation, not a
citation.

### R4 — Novelty claims require a recorded check

Claiming novelty without checking prior work is prohibited where novelty matters. It matters when the
claim is being published, when priority is being asserted, or when the project's value depends on the
result being new. It does not matter for internal lemmas nobody is claiming credit for, and a standard
that demanded a literature search for every routine step would be ignored.

Where novelty is claimed, the `Evidence` field carries an entry of type `literature-search` recording
the search: the databases, the terms, the date, and the outcome. That type is distinct from
`citation` precisely so that recording a search cannot be mistaken — by a reader or by a detector —
for citing a result that proves something ([Standard 19](19-evidence-requirements.md) R2).

### R5 — Known results are dependencies

A cited theorem the project relies on is a dependency under
[Standard 8](08-dependency-traceability.md) R1 and appears in the `Depends` field. Its status in the
ledger reflects its actual standing: a textbook theorem and an unrefereed preprint are both external
references, and a project resting on the second is in a materially different position from one resting
on the first. Recording which is which costs one line and is the only way that difference stays
visible downstream.

## Additions this standard makes beyond the source

- R1's three outcomes and the requirement to record a negative search.
- R3 in full. `literature.citation-statement-drift` is one of the additional anti-patterns the source
  invites, and the argument that it is more dangerous than fabrication because it passes every
  mechanical check is authored.
- R4's account of when novelty matters, which is a narrowing of the source's "when novelty matters"
  into something a reviewer can apply.
- R5's treatment of external references as dependencies carrying their own standing.

## Relationship to other standards

[Standard 8](08-dependency-traceability.md) governs the dependency edges R5 creates.
[Standard 9](09-edge-cases-and-counterexamples.md) R2 applies the same recorded-negative-search
principle. [Standard 15](15-equivalent-reformulations.md) covers the case where the known result is
equivalent to the project's target rather than merely related.
[Standard 17](17-open-problems.md) requires the same comparison at a higher bar, because on a famous
problem the probability that an approach is already known is very high.
[Standard 20](20-must-never-rules.md) holds the prohibitions in R2 and R4.

## Implementation

The detector `literature.resolvable-identifiers` checks that DOI and arXiv identifiers are
well-formed, and that every `external:` id used in a `Depends` or `Assumptions` field is defined in
the ledger's `## References` section. `literature.unchecked-novelty` fires when a claim's statement
asserts novelty and no `citation`-type evidence records a search.

The assurance boundary here is unusually stark and worth stating without softening. A well-formed
identifier for a paper that does not exist passes `literature.resolvable-identifiers`, because the
check is offline and syntactic: this repository has no network access and would not gain the right to
make network calls during an audit merely because it would be convenient. So the rule catches
malformed references and typos, and catches nothing at all of the failure the standard is actually
about.

`literature.fabricated-citation` and `literature.citation-statement-drift` are `manual-review` with
assurance `none`. What establishes them is a person opening the cited paper and reading the theorem —
and the honest thing for the tooling to do is to say so, record the attestation when it happens, and
let the attestation go stale when the citing text changes.
