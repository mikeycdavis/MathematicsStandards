# Design — mapping RiemannHypothesis's records into the claims ledger

**Read-only.** No file in `RiemannHypothesis` is modified. No ledger entry is written, no compliance
run performed, and the open-problem structure is left unresolved on purpose. This specifies a mapping
and a significance boundary, tests the boundary against real declarations, disposes of the two
framework-authored artifacts, and starts the representation-cost measurement.

Prior records: [`rh-v1.0.0-pre-adoption.md`](rh-v1.0.0-pre-adoption.md) ·
[`rh-v1.0.0-post-init.md`](rh-v1.0.0-post-init.md) ·
[`rh-postinit-characterization.md`](rh-postinit-characterization.md) ·
[`rh-agent-contract-integration.md`](rh-agent-contract-integration.md)

---

## 1. The governing principle

> The claims ledger records claims the project epistemically relies upon or communicates as
> meaningful results. It is not an inventory of Lean declarations.

Everything below is an attempt to make that operational and then to find out where it breaks.

## 2. The obvious boundary fails, measured

The candidate recorded in v1.1 §1 was *declarations referenced by the project's research prose*. It
is the first thing anyone would try. Against this repository it is useless.

```text
theorem/lemma declarations                        987   (968 distinct, junk removed)
named somewhere in the project's markdown         781
named ONLY in STATUS.md / BUILD_LOG.md /
    FAILED_APPROACHES.md                          799
named in a decision document, graph excluded       54
named nowhere in prose                            218
```

Four-fifths of the development is "referenced by the project's prose" because a disciplined project
keeps a running status log, a build log, and a retraction index, and those documents name everything
that happened. **Being mentioned in an iteration wrap-up is not epistemic reliance.** The better the
project's record-keeping, the worse this boundary performs — the same inversion found in Part 1 of
the characterization record, arriving from a completely different direction.

`DEPENDENCY_GRAPH.md` has to be excluded too, and for a sharper reason: it names 134 declarations
because it *is* an inventory of the formal development. Admitting it would make the ledger a second
copy of the dependency graph, which is the degraded-mirror failure v1.1 §1 already names.

### The finding that decides the design

| Document | Declarations named |
| --- | --- |
| `Research/STATUS.md` | 584 |
| `Research/BUILD_LOG.md` | 383 |
| `Research/DEPENDENCY_GRAPH.md` | 134 |
| `Research/README.md` (root) | 24 |
| `Research/ATTACK_SURVEY.md` | 20 |
| `Research/CONTRACTS.md` | 18 |
| `Research/MODEL_ZOO.md` | 11 |
| **`Research/CLOSURE_MAP.md`** | **0** |
| **`Research/PROMOTION.md`** | **0** |
| **`CLAUDE.md`** | **0** |

The project's three highest-authority documents — the binding contract, the promotion gates, and the
closure map — **name no declarations at all.** They are written entirely in terms of contracts,
bridges, gates, barriers, and closures.

That is not an omission. It is what this project's epistemic units actually are. A ledger built by
promoting declarations, however well filtered, will index the wrong objects.

## 3. The significance boundary

A declaration earns a ledger entry when one of five things is true. Each is a fact about the
project's own records, checkable by a human in seconds, and none is a heuristic over prose.

1. **It is the target.** `RiemannHypothesis` in `Definitions.lean`.
2. **It is an equivalence to the target** — a labelled `iff`, the project's category 3.
3. **It is a barrier or instrument** that closes or screens a route: kernel-verified, cited in
   `CLOSURE_MAP.md` §3 or as a binding rejection rule.
4. **It is named in a contract field** in `CONTRACTS.md` — a bridge, a screening verdict, or a
   result a gate turned on.
5. **The project communicates it externally as a result**, i.e. it appears in the root `README.md`.

Explicitly **not** qualifying: appearing in the dependency graph, the build log, or an iteration
wrap-up; and being a step inside the proof of something that does qualify. Those are *intentionally
untracked*, and the ledger records that disposition once per file rather than once per lemma.

### Tested against the five roles

| Role | Sample | Where it is named | Verdict |
| --- | --- | --- | --- |
| **Target** | `RiemannHypothesis` (`Definitions.lean`) | quoted verbatim in `CLAUDE.md` | **claim** — `UNRESOLVED_CLAIM` |
| **Equivalence** | `riemannHypothesis_iff_liPair_nonneg` (`EquivalentForms/LiCriterion.lean`) | README, ATTACK_SURVEY | **claim** — `EQUIVALENT_REFORMULATION`, direction `iff` |
| **Barrier** | `zeroSum_criticalLine_vacuous` (`Obstructions/ReflectionVacuity.lean`) | binding rejection rule 2 in `CLAUDE.md`; B14 in `CLOSURE_MAP.md` | **claim** — `MACHINE_CHECKED_PROOF` |
| **Bridge-support** | `galerkin_antitone`, `galerkin_le` (`Candidates/GalerkinConvergence.lean`) | C7 contract; this is C7-A's Proposition 1 | **claim** — `MACHINE_CHECKED_PROOF` |
| **Infrastructure** | `differentiableAt_Gamma`, `hasDerivAt_conj_comp` (`PartialResults/`) | dependency graph only | **untracked** |
| **Borderline** | `abs_re_digamma_sub_log_le` (`PartialResults/DigammaAsymptotic.lean`) | ATTACK_SURVEY, dependency graph | **untracked** — a technical estimate inside the Riemann–von Mangoldt chain, not a result the project relies on or communicates |

The borderline case is the one that matters, and rule 5's "step inside a proof of something that
qualifies" is what decides it. Without that clause the boundary readmits most of `PartialResults/`
through `ATTACK_SURVEY.md`. With it, the boundary makes the same call on all four estimates sampled
from that chain.

**Estimated ledger size from declarations: 50–60**, against 987 declarations — roughly 5%. The
remaining 906 `PartialResults` declarations are a proof of Riemann–von Mangoldt and its supporting
analysis, which is category 2 in the project's own key: standard published unconditional mathematics,
correct, formalized, and explicitly not progress.

## 4. What actually goes in the ledger

Declarations are the minority of it. The full mapping, by source record:

| RH record | Count | Ledger disposition | Status |
| --- | --- | --- | --- |
| Target statement | 1 | one claim | `UNRESOLVED_CLAIM` |
| Contracts `C1, C2a, C2b, C3, C4, C5, C6, C7, C8` | 9 | **the bridge** becomes a claim; the contract itself does not fit — §5 | `CONJECTURE` / `UNRESOLVED_CLAIM` |
| Kernel-verified barriers `B12`–`B24` | 13 | one claim each | `MACHINE_CHECKED_PROOF` or `THEOREM` |
| Equivalences (Li, orbit-escape, BBM, dBN `Λ ≤ 0`, Báez-Duarte) | ~5 | one claim each, with direction and the proving claim | `EQUIVALENT_REFORMULATION` |
| Proved intermediate results named in contracts | ~12 | one claim each | `MACHINE_CHECKED_PROOF` / `THEOREM` |
| C7-A, C7-B paper proofs | 2 | one claim each; `Formal:` records G5-partial | `THEOREM` |
| C8 certified positivity at `c = 5` | 1 | one claim | `COMPUTATIONAL_VERIFICATION` |
| Model-zoo runs `Z1`–`Z17` | 17 | **evidence, not claims** | — |
| Retractions `R1`–`R15` | 15 | History entries on the claims they retracted | — |
| Search programmes `D1`, `F1`, `SECTOR_HODGE` | 3 | outcomes become claims; the programmes do not fit | mixed |
| `PartialResults` chain | 906 | intentionally untracked, one disposition per file | — |

**Roughly 55–65 entries.** That is a ledger a person can read, which is the only test that matters
for an artifact whose purpose is to be read.

Two mapping decisions worth stating because they could easily go the other way:

- **Zoo runs are evidence, not claims.** `Z8` did not assert a mathematical statement; it executed a
  falsification test that closed `C1`. It belongs in the `Evidence:` field of the bridge claim it
  killed, as `counterexample-search`, with the run's date and output. Making zoo entries claims would
  register seventeen assertions the project does not make.
- **Retractions are History, not entries.** `R13` is not a claim; it is the record that a claim moved
  down. The ledger's History field is the correct home and preserves what the retraction index
  exists to preserve.

## 5. Where the model has nowhere honest to put things

This is the substance of the phase. Six things RH maintains have no ledger field, and inventing one
would be worse than recording the gap.

| RH concept | Why the ledger cannot hold it |
| --- | --- |
| **Gate state `G1`–`G5`** | An evidence-*acquisition* stage, orthogonal to evidence strength. A bridge at G2 and a bridge at G4 can both be `CONJECTURE` |
| **Outcome `OPEN` / `DECIDED-barrier <ID>` / `instrument`** | Standard 18 has termination-with-reopening; it has no notion of a route reclassified into an instrument, which is what happened to `C4` |
| **First unproved bridge** | `Obligations:` is a *list* of what remains. A bridge is a distinguished *frontier pointer* — the one statement the screening rules are applied to. Flattening it into the list loses which one is the frontier, and the screening rule has nothing to point at |
| **Rejection-rule verdicts** (RH-in-disguise / B14 filter / leverage) | Pre-registered screens applied to a bridge *before* work. No field, and no evidence type: they are neither counterexample searches nor proofs |
| **Relevance-to-target category 0/1/2/3** | Orthogonal to status, and the reason 906 declarations are correct, formal, and not progress. Without it the ledger cannot express "MACHINE_CHECKED_PROOF, category 2" |
| **The 12-field scope manifest** | Standards 10 and 12 require scope and error bounds; neither requires enumerating omitted sectors or declaring what was *not* certified, which is what R15 turned on |

Recording these as `intentionally untracked` would be false — they are not unimportant, they are
unrepresentable. The honest disposition is that the ledger is a **partial index** over RH's records,
and the records remain authoritative for everything in this table. The integration section designed
for `CLAUDE.md` already says the contract governs where the standards are silent; this table is what
that clause is for.

## 6. Disposition of `CLM-0001`

**Delete it, and record why rather than deleting silently.**

`CLM-0001 — Squares are nonnegative over the reals`, status `THEOREM`, evidence
`proof — proofs/clm-0001.md`, was written into `artifacts/claims-ledger.md` by `init`. The reasons it
cannot stay are cumulative, and the weakest one is the one usually given:

1. **It is false as a record.** The ledger asserts that this project claims a theorem, with a
   promotion history dated January 2026, citing a proof file that does not exist. Every one of those
   is untrue of RiemannHypothesis.
2. **It is already producing findings.** Two of the three post-init failures —
   `evidence.artifact-linked` and `literature.known-result-comparison` — are about `CLM-0001` and
   nothing else. A project reading its own audit would be remediating the framework's example.
3. **It is upstream of the invariant block.** Its mere existence made `ledger` non-null, which
   started the repo-wide prose scan inside the same gated function, which produced
   `BLOCKED_BY_INVARIANT`. Traced in the characterization record, Part 2.
4. **It is the generalizable point.** No framework-authored mathematical assertion should survive as
   an adopter claim. A standards system whose subject is provenance must not manufacture the
   provenance it then evaluates.

The deletion is not a fix to the framework and must not be recorded as one. v1.1 §0 keeps the open
question — *what epistemic assertions, if any, may initialization create on behalf of an adopter?* —
and deleting one example in one adopter does not answer it.

## 7. Disposition of `PROJECT.md`

The question is not how to fill the template. It is: **does this artifact carry an authoritative
concept RH does not already maintain?**

**Determined from tool behaviour, not assumed.** Grepping `scripts/`, `rules/` and `schemas/` for
`PROJECT.md` returns exactly one hit — [`init.mjs:46`](../../scripts/init.mjs), the artifact list —
plus a mention in `templates/AGENTS.md`'s load order. **No rule requires it, no detector reads it, no
schema references it.** v1.0 permits it not to exist, at zero compliance cost.

What the template contains, against what RH already has:

| Template section | RH already has | Verdict |
| --- | --- | --- |
| What this project is trying to establish | `## Definition of success — NEVER CHANGES`, pinned to Mathlib's proposition verbatim | **duplicate, and weaker** |
| Current position / highest honestly-held status | `Research/PROJECT_STATE_2026-08-02.md`; `AGENTS.md` ends with the target `UNSTATED` and RH `UNPROVED` | **duplicate** |
| Regimes | genuinely new — belongs in `project-policy.yml`, where the schema puts it | **redundant with the policy** |
| Where things live | names `proofs/`, `computations/`, `formal/`, `research/abandoned/` — **none of which exist here** | **actively false** |
| Stopping criteria | `PROMOTION.md`, `CLOSURE_MAP.md` per-route reopening conditions | **duplicate, and weaker** |
| How to check it | the command | trivial |

Every section is a duplicate, a redundancy, or false. And the first one is the dangerous kind: a
second unversioned statement of the target, sitting beside a binding contract whose most emphatic
heading is `NEVER CHANGES`. That is precisely the hazard `AGENTS.md` was reduced to a pointer to
avoid, reintroduced by the bootstrap.

**Recommendation: delete `PROJECT.md`.** Not fill it, and not even reduce it to a pointer — a pointer
file is justified when a tool looks for that name by convention, and nothing here does. If a later
version of the framework makes it load-bearing, it can be reintroduced then, as a pointer to
`CLAUDE.md` and `PROJECT_STATE`.

**Retaining it would reduce integrity**, which is the sharper way to put the general rule this case
establishes:

> An adopted artifact that restates something the adopter already maintains authoritatively is not
> neutral overhead. It is a second copy that can drift, and it dilutes which document is binding.

## 8. The open-problem structure stays unresolved

Standard 17 wants one `artifacts/open-problems/<slug>/problem.md` with nine H2 sections. RH has one
target and nine contract entities, each with its own bridge, screening verdicts, gate state and
outcome, plus three search programmes and a frozen roll-up.

```text
RH target
  ├── C1   bridge · screens · G2 · CLOSED–barrier B18
  ├── C2a  bridge · screens · G2 · CLOSED–barrier B19
  ├── C2b  bridge · screens · G3 · OPEN
  ├── C3   bridge · screens · G2 · OPEN, detection wall B21
  ├── C4   no bridge, and that is the point · reclassified to instrument
  ├── C5   bridge · screens · G2 · OPEN, narrowed by B22
  ├── C6   bridge · screens · G2 · OPEN, selects C2b
  ├── C7   bridge · screens · G1 · OPEN — first non-RH-equivalent target
  └── C8   CLOSED, 8 of 8, capped
```

Forcing this into nine H3 blocks under `## Terminated Approaches` and `## Where the Difficulty Lives`
would flatten away gate state, screening verdicts, and the outcome vocabulary — the three things §5
already identifies as unrepresentable. **Deliberately not attempted.** How badly it fits is the
measurement; a mapping invented to satisfy the template would destroy it.

## 9. Representation cost — baseline

Starting the metric now, before any translation, so the first manual commit has something to be
measured against.

| Dimension | Baseline |
| --- | --- |
| **Existing RH records to translate** | 9 contracts · 13 barriers · 17 zoo entries · 15 retractions · 3 programmes · ~5 equivalences · 1 target = **63 source items** |
| **Ledger claims projected** | **55–65** |
| **Declarations, total → tracked** | 987 → ~50–60 (**~5%**) |
| **Duplicated vs referenced** | Target statement duplicated once (unavoidable — the ledger needs an entry). Everything else *referenced* by path; no barrier, zoo run, or contract text copied |
| **Fields RH did not previously maintain** | `Status` (the 15-token ladder) · `Domain` · `Quantifiers` · `Obligations` as an enumerated list · `History` with dated transitions = **5 per claim** |
| **RH information with nowhere honest to go** | **6 concepts** — gate state, outcome vocabulary, first-unproved-bridge as frontier pointer, rejection-rule verdicts, relevance-to-target category, scope manifest (§5) |
| **Framework fields adding no information** | `Obligations` (contracts already carry the bridge, more precisely) · `Assumptions` for barriers (kernel-verified, the axiom list is stronger) · counterexample-search evidence (the zoo is stronger and dated) = **3** |

The question this metric exists to answer, restated so a later reading can check it:

> Does adoption create a useful epistemic index over existing research, or force researchers to
> maintain a second representation of the same truth?

The baseline leans toward *index*: 63 source items to ~60 claims, almost all by reference, is not a
second representation. The pressure is in the last two rows — five new manual fields per claim, and
six concepts that must stay in the source records because the ledger cannot hold them. If those six
grow, the ledger becomes a partial mirror of the authoritative records, which is v1.1 §1's named
failure mode arriving from the other side.

## 10. State

Nothing applied. `RiemannHypothesis` at `b54cdf1`, no tracked modification; the three untracked
artifacts `init` created are still exactly as written, including `CLM-0001`. No compliance run since
the post-init measurement. The framework is unchanged: no standard, rule, detector, schema, template,
or test touched.

Next, when authorized: the first manual integration commit — the `CLAUDE.md` section from
[`rh-agent-contract-integration.md`](rh-agent-contract-integration.md) §6, deleting `CLM-0001` and
`PROJECT.md`, and the first ledger entries. Stopping before it.
