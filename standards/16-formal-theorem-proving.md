# Standard 16 — Formal Theorem Proving

A proof assistant is the strongest verification instrument mathematics has, and it is also the easiest
to misreport. Four different things — a file that parses, a file that compiles, a helper theorem that
checks, and the target theorem proved unconditionally — produce roughly the same green output at a
glance, and only the last is what anyone means by "machine-checked". This standard keeps them apart.

Source: item 16 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies wherever Lean, Coq, Isabelle, or another proof assistant is used — the formal and
theorem-proving regimes of [Standard 1](01-applicability-and-scope.md).

## Requirements

### R1 — The four non-equivalences

Where Lean, Coq, Isabelle, or another proof assistant is used, the following must never be equated.

Reproduced verbatim from the source:

- parsing with proving
- compilation with proving the intended theorem
- proving a helper theorem with proving the target
- `sorry`/axiom/admit-dependent results with unconditional machine certification

Each has a specific failure behind it:

| Non-equivalence | What it looks like when confused |
| --- | --- |
| Parsing vs proving | The file is syntactically valid; nothing has been checked |
| Compilation vs the intended theorem | Everything checks, and the formal statement is not the theorem the paper claims — a quantifier moved, a hypothesis added, a special case formalised |
| Helper vs target | Twelve lemmas check; the main theorem is `sorry` |
| Placeholder-dependent vs certified | The target checks, and its proof chain passes through an admitted lemma |

The second is the subtlest and the least detectable: the formal artifact is entirely correct and
proves something other than what is being claimed for it. It is prohibited separately in the source
as claiming a formal theorem proves more than its actual statement.

### R2 — Track the trusted dependency chain

From the source:

> Track the trusted dependency chain.

A claim at `FORMALIZED_THEOREM` or `MACHINE_CHECKED_PROOF` MUST carry a `Formal` block recording what
is being trusted:

```markdown
- **Formal:**
  - assistant: lean4 4.9.0
  - file: `formal/GapTheorem.lean`
  - declaration: `gap_theorem`
  - axioms: propext, Classical.choice, Quot.sound
  - dependencies: mathlib @ 3f7a1c2
  - checked: 2026-08-09, `lake build` clean, `#print axioms gap_theorem` output committed
```

The axiom list is not decoration. Every proof assistant admits axioms, and the difference between the
standard three in Lean and one the project added itself is the difference between an ordinary
formalisation and a proof of something under an assumption nobody outside the project holds. An
undisclosed `axiom` declaration is a hidden assumption
([Standard 6](06-assumptions-and-hidden-conjectures.md)) with a compiler's blessing on it.

The trusted base includes more than the axioms: the assistant's kernel, the external libraries at
their pinned revisions, and any construct that steps outside the kernel — `native_decide` in Lean,
extraction in Coq, code generation in Isabelle. Those are legitimate tools and their use is not
prohibited; what is required is that they be recorded, because a reader entitled to know what a
machine-checked claim rests on cannot find out otherwise.

### R3 — Placeholders and the claims that cite them

`sorry`, `admit`, `Admitted`, and `oops` are the assistants' honest way of saying "not yet". Their
presence is not a violation; a formalisation in progress is supposed to have them, and a standard that
punished them would push projects to delete the markers rather than the gaps.

What is prohibited is the combination. A claim at `MACHINE_CHECKED_PROOF` whose cited artifact
contains a placeholder — anywhere the target's proof depends on — is claiming machine verification
while unproved placeholders remain in the relevant dependency chain, which the source prohibits by
name. The same applies to a claim citing no formal artifact at all, or citing one that does not exist.

`FORMALIZED_THEOREM` (rank 9) and `MACHINE_CHECKED_PROOF` (rank 10) are separated for exactly this
reason: the first says the statement has been written down formally and the development builds, the
second says the target is proved with no placeholder in its chain and the axiom set is disclosed. A
project part-way through formalisation sits honestly at rank 9.

### R4 — Formalization gaps are inventoried

From the source, the standards must cover:

- formalization gaps

Where a project formalises part of its mathematics, it MUST maintain an inventory of what is
formalised and what is not, so that "we have a Lean development" cannot be read as "the results are
machine-checked". The inventory lives in the ledger: every claim's `Formal` field is either a block as
in R2 or the token `none`, and the gap is the set of claims with `none`.

The gap that matters most is the boundary between the formal statement and the informal one. Every
formalisation makes modelling choices — how a structure is encoded, which definition of a standard
object is used, whether an edge case is included — and a mismatch there means the machine checked
something adjacent to the claim. This is R1's second non-equivalence, and no tool detects it.

### R5 — Machine-checking status is a claim about a specific declaration

From the source, the standards must cover:

- machine-checking status

The `Formal` block names a declaration, not a file. "It is in the Lean development" is not a status;
`gap_theorem` in `formal/GapTheorem.lean`, checked on a stated date against a pinned library revision,
is. Where the development changes, the check is re-run and the date updated — a formal status recorded
once and never revisited is an assertion about the past.

## Additions this standard makes beyond the source

- R1's table mapping each non-equivalence to the way it presents in practice.
- The whole `Formal` block format in R2, and the treatment of the trusted base as including kernel,
  pinned libraries, and kernel-bypassing constructs. The source says to track the trusted dependency
  chain and does not say what recording one looks like.
- R3's separation of `FORMALIZED_THEOREM` from `MACHINE_CHECKED_PROOF` on the placeholder criterion,
  and the argument that placeholders themselves must not be penalised.
- R4's identification of the statement-mismatch gap as the one that matters most.
- R5's declaration-level granularity and re-check requirement.

## Relationship to other standards

[Standard 2](02-claim-hierarchy.md) R4 sets what ranks 9 and 10 require.
[Standard 6](06-assumptions-and-hidden-conjectures.md) is what an undisclosed axiom becomes.
[Standard 8](08-dependency-traceability.md) is the informal analogue of R2's chain.
[Standard 13](13-symbolic-manipulation.md) R5 treats formalisation as the escalation for
manipulation-heavy proofs. [Standard 20](20-must-never-rules.md) holds R1's prohibitions.

## Implementation

Detectors, all operating on comment- and string-stripped source so that a comment reading
`-- TODO: remove the sorry in Draft.lean` cannot fire — reporting a mention as a use would be this
repository overstating a finding, in a repository about not overstating findings:

- `formal.placeholder-inventory` — placeholder tokens exist, per file, per assistant. A warning:
  it is information, not a violation.
- `formal.placeholder-in-chain` — the flagship rule. A claim at rank 9 or 10 whose cited artifact
  bears a placeholder, cites nothing, or cites a missing file. `forbidden`, `nonExemptible`, and
  therefore a rule whose violation produces `BLOCKED_BY_INVARIANT` rather than ordinary
  non-compliance.
- `formal.axiom-disclosure` — `axiom` declarations in project sources that no `Formal` block lists.
- `formal.trusted-chain-tracked` and `formal.status-declared` — the block exists and is complete;
  proof-assistant files exist and some claim accounts for them.
- `formal.trusted-base-enlarged` — `native_decide`, `@[extern]`, extraction. Informational.

Coq detection is gated: a `.v` file is treated as Coq only when it also contains Coq structure
(`Qed.`, `Proof.`, `Require Import`), because `.v` is equally a Verilog extension and a false Coq
finding in a hardware project would be exactly the kind of unearned confidence this standard exists to
suppress.

**What none of this establishes.** These are text scans. They do not run the assistant, do not trace
the dependency graph through imported libraries, and cannot see a placeholder introduced by a
dependency the project does not contain. A clean `formal.placeholder-in-chain` is therefore not
certification; it is the absence of the most obvious contradiction. Certification requires running the
assistant and printing the axioms — `#print axioms` in Lean, `Print Assumptions` in Coq — and
committing that output as the evidence artifact. R1's second non-equivalence, whether the formal
statement is the intended theorem, is `manual-review` with assurance `none` and always will be: it is
a question about the relationship between mathematics and its encoding, and there is nothing in the
repository that could answer it.
