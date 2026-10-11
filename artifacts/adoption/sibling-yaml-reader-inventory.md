# Inventory — the YAML readers in the sibling standards repositories

Recorded 2026-10-11 against each repository's default branch (`main`). It replaces the unsupported
count ("five sibling copies") that ADR 0005 and the `CHANGELOG.md` `Unreleased` entry used. It records
what exists; it makes no decision and proposes no propagation of this repository's block-scalar reader.

## What was inventoried

The `scripts/yaml.mjs` blob at each repository's default-branch head, fetched through the GitHub
contents API and compared by git blob id and by behaviour. Behaviour was probed by importing each
file's `parseYaml` and parsing the same ten small documents (literal, folded, strip and keep chomping,
nested, in a list, plain, `[]`, `{}`).

| Repository | Head | `scripts/yaml.mjs` blob | Family | Block scalar (`\|`, `>`) | `{}` |
| --- | --- | --- | --- | --- | --- |
| MathematicsStandards (this repository) | `9dc7f47` | `e431d60e0005` | own reader (this change's subject) | accepted (`\|`, `>`; `\|+` refused) | refused |
| BettingStandards | `8601662` | `dbc8b72fb4c1` | C | refused: "block scalars are not supported" | refused |
| StandardsOrchestrator | `91c065c` | `dbc8b72fb4c1` | C (byte-identical to Betting) | refused | refused |
| EngineeringStandards | `e341dba` | `abc2b9ff6515` | C | refused | refused |
| FinancialStandards | `91ae2d7` | `f52fc6364fad` | C | refused | refused |
| PredictionStandards | `88cad41` | `edec30238a34` | C | refused | refused |
| InnovationStandards | `e39fdfb` | `3604106b367a` | C | refused | refused |
| MachineLearningStandards | `0a389fd` | `4f4f208af6b2` | C | refused | refused |
| UIUXDesignStandards | `19b13fe` | `75caec7ee218` | C | refused | refused |
| HealthAndFitnessAndNutritionStandards | `b23d43d` | `2c0cd13c2f11` | H (C plus `{}` accepted) | refused | accepted as `{}` |
| AIStandards | `de149bf` | `15aa4e978724` | Z (a separate implementation) | refused ("unexpected indentation inside a mapping") | accepted as `{}` |
| StandardsEnforcer | `d1bc8e0` | none (`scripts/yaml.mjs` not found) | not applicable | not applicable | not applicable |

Families:

- **C (eight repositories).** After stripping comments and blank lines the code is identical, byte for
  byte; only header and explanatory comments differ between them (Betting and Orchestrator are
  byte-identical files). A whole-file comparison of the code body, not a semantic proof.
- **H (one).** The C code with one change: a flow mapping that is exactly `{}` is accepted and returned
  as an empty object; any other flow mapping is refused.
- **Z (one).** A different implementation with its own refusal table. It also refuses block scalars.
- Ten sibling repositories carry a `scripts/yaml.mjs`; StandardsEnforcer carries none.

All ten refuse block scalars. None accepts the block scalars this repository's reader accepts since
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

The repositories' own counts in those records ("eight sibling repositories", "nine repositories")
describe the family on the date each was written and are not restated here.

## Reproduce

```text
gh api repos/mikeycdavis/<Repo>/contents/scripts/yaml.mjs --jq .sha
node -e "import('./yaml.mjs').then(m => console.log(m.parseYaml('evidence: |\n  a\n  b\nnext: x\n')))"
```

The first prints the blob id compared above; the second is accepted by this repository's reader and
throws a `YamlError` in every sibling's.
