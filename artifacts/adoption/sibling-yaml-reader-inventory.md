# Inventory — the YAML readers in the sibling standards repositories

Recorded 2026-10-11 against each repository's default branch (`main`). It replaces the unsupported
count that ADR 0005 and the `CHANGELOG.md` `Unreleased` entry used. It records
what exists; it makes no decision and proposes no propagation of this repository's block-scalar reader.

## What was inventoried

The `scripts/yaml.mjs` blob at each repository's default-branch head, fetched through the GitHub
contents API and compared by git blob id and by behaviour. Behaviour was probed by importing each
file's `parseYaml` and parsing the same small set of documents (literal, folded, strip and keep chomping,
nested, in a list, plain, `[]`, `{}`).

| Repository | Head | `scripts/yaml.mjs` blob | Family | Block scalar (`\|`, `>`) | `{}` |
| --- | --- | --- | --- | --- | --- |
| MathematicsStandards (this repository) | `9dc7f4755b7bcf70ee04b112cabdafcd929dde15` | `e431d60e0005` | own reader (this change's subject) | accepted (`\|`, `>`; `\|+` refused) | refused |
| BettingStandards | `8601662a85ff1963ba99bd512f575680a716d15e` | `dbc8b72fb4c1` | C | refused: "block scalars are not supported" | refused |
| StandardsOrchestrator | `91c065c245c545894e929668043d4050959e019e` | `dbc8b72fb4c1` | C (byte-identical to Betting) | refused | refused |
| EngineeringStandards | `e341dba472110ff9e85d8cd3fae0fce60d83a31f` | `abc2b9ff6515` | C | refused | refused |
| FinancialStandards | `91ae2d7437b270dbb5a56cac7f623aeb5ef59929` | `f52fc6364fad` | C | refused | refused |
| PredictionStandards | `88cad415232245a54091530c1b549431d2831841` | `edec30238a34` | C | refused | refused |
| InnovationStandards | `e39fdfb59c3f99ba4e4d4c0592692f0451a3333c` | `3604106b367a` | C | refused | refused |
| MachineLearningStandards | `0a389fde0f584939225e32c5f78924298e97ebed` | `4f4f208af6b2` | C | refused | refused |
| UIUXDesignStandards | `19b13fec9f8b8a088a6bc0ae57c30d1b0520727d` | `75caec7ee218` | C | refused | refused |
| HealthAndFitnessAndNutritionStandards | `b23d43d0a08d0b25e0d81085f5b64f879e9a1f14` | `2c0cd13c2f11` | H (C plus `{}` accepted) | refused | accepted as `{}` |
| AIStandards | `de149bfa260b65461a01b5aa22d950fb8a97754c` | `15aa4e978724` | Z (a separate implementation) | refused ("unexpected indentation inside a mapping") | accepted as `{}` |
| StandardsEnforcer | `d1bc8e054e6743cffe3bcc65d6d599ccd270ffb1` | none (`scripts/yaml.mjs` not found) | not applicable | not applicable | not applicable |

Families:

- **C (the rows marked C).** After stripping comments and blank lines the code is identical, byte for
  byte; only header and explanatory comments differ between them (Betting and Orchestrator are
  byte-identical files). A whole-file comparison of the code body, not a semantic proof.
- **H (the row marked H).** The C code with one change: a flow mapping that is exactly `{}` is accepted and returned
  as an empty object; any other flow mapping is refused.
- **Z (the row marked Z).** A different implementation with its own refusal table. It also refuses block scalars.
- Every sibling in the table except StandardsEnforcer carries a `scripts/yaml.mjs`; StandardsEnforcer
  carries none.

Every sibling reader in the table refuses block scalars. None accepts the block scalars this repository's reader accepts since
FE-32 (#63). This repository's reader is not propagated, and nothing here changes that.

## Divergence is recorded by the repositories themselves

Read at each repository's default branch (`main`) on 2026-10-11. Only repositories whose decision text
was opened are listed; the other siblings' decision records were not examined.

| Repository | Record | What it says (paraphrased from the text read) |
| --- | --- | --- |
| MathematicsStandards | `artifacts/adr/0005-vendored-not-shared.md` | Machinery is vendored and maintained here; a fix to the parser here does not reach the sibling repositories; that cost was accepted in exchange for independence. |
| BettingStandards | `artifacts/adr/0006-standalone-repository-with-vendored-machinery.md` | Keeping the machinery byte-identical for re-syncing was rejected ("A fork that cannot diverge is not a fork"); upstream bug fixes will not arrive, which is accepted as the cost of independence. |
| UIUXDesignStandards | `artifacts/adr/0001-vendor-the-neutral-core-rather-than-share-a-package.md` | Each repository vendors its own copy; "The copies are permitted to diverge"; a bug fix must be carried to the other repositories by hand and nothing mechanically notices a miss, accepted as a known cost. |
| InnovationStandards | `artifacts/adr/0001-vendored-engine-standalone-repo.md` | `yaml.mjs` copied unchanged; a defect fixed in the sibling's engine is not fixed here and nothing will say so, stated as a permanent maintenance cost. |
| MachineLearningStandards | `artifacts/adr/0001-standalone-domain-first-design.md` | `yaml.mjs` is vendored with a provenance header; the copies "may diverge", which is accepted, so a fix here does not wait on another repository and a change there does not arrive here unannounced. It does not say that upstream fixes will not arrive in those words. |

Any counts the repositories' own records state describe the family on the date each was written and
are not restated here.

## Reproduce

This reproduces the inventory as of the revisions in the `Head` column, not the current heads of the
default branches. The procedure is the checked-in script
[`sibling-yaml-reader-probe.mjs`](sibling-yaml-reader-probe.mjs), which carries the same
repository-and-commit list as the table. Run it from the root of this repository with `gh`
(authenticated) and `node`, giving it an empty scratch directory:

```text
node artifacts/adoption/sibling-yaml-reader-probe.mjs <empty scratch directory>
```

For each row it:

- fetches `scripts/yaml.mjs` at the recorded commit through the Contents API `ref` parameter, so later
  commits do not change what is fetched, and for StandardsEnforcer confirms that no such file exists;
- compares the git blob id of each file with the recorded one;
- parses the same documents with every file (literal, folded, strip and keep chomping, nested, inside a
  list, plain, `[]`, `{}`) and compares each result with the exact result recorded for its family:
  the parsed value for an accepted document, the error message for a refused one, including this
  repository's own refusals of `|+` and `{}`;
- compares the code. Rows marked C must be one body. The row marked H must differ from it by exactly
  the branch that accepts `{}` (one line replaced by that branch) and nothing else. The row marked Z
  must differ from C.

"Normalized" code, used for those comparisons, is the file with block comments removed, everything
from `//` to the end of the line removed, trailing whitespace removed and blank lines dropped.
Indentation and every other character are kept. The `//` rule is crude, since it also cuts a `//`
inside a string, but it is applied identically to every file, so equal normalized code means equal
code apart from comments and blank lines.

It prints one line per repository and exits 0 with "Every recorded value was reproduced." only when
every check holds; otherwise it lists each difference and exits 1. After the checks it applies
deliberate alterations to the collected results (a wrong value, a changed message, an extra code line,
a changed blob id and the like) and requires each to be noticed, so a probe that can no longer fail is
reported as broken.
A fetch that fails (an expired token, an unavailable revision) is listed in the same report and the run
exits 1; `--simulate-fetch-failure=<Repository>` exercises that path on demand.
