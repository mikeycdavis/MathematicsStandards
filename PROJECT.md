# MathematicsStandards — project manifest

## What this project is

A standalone, independently maintained standards repository for mathematical reasoning, proof, and
theorem work. It defines what mathematical rigour means in a form a machine can check part of and a
human must judge the rest of, and it ships the command that does the checking.

It is not a mathematical research project. It makes no mathematical claims, which is why most of its
own rules are declared not-applicable in `project-policy.yml` — each with a reason and a condition
that would end the declaration.

## Sources

| Document | Role |
| --- | --- |
| `artifacts/prompt/original-prompt.md` | The mathematical requirements. Source of standards 1–20 |
| `artifacts/prompt/standards-repository-charter.md` | The repository-design requirements. Source of standards 21–22, the CLI design, and the concept investigation |
| `artifacts/prompts/mathematics-standards-spec.md` | The derived numbered spec the inventory and fidelity gates check against |
| `artifacts/provenance-digests.json` | Digests of the two source documents, so editing one fails CI |

Both source documents are committed unmodified. Where the derived spec and an original disagree, the
original governs.

## Where things live

| Artifact | Path |
| --- | --- |
| Normative standards | `standards/NN-<kebab-title>.md` |
| Machine rule catalog | `rules/*.json` |
| Policy schema | `schemas/project-policy.schema.json` |
| CLI and gates | `scripts/` |
| Templates written by `init` | `templates/` |
| Tests and fixture research repositories | `test/` |
| Architecture and diagrams | `docs/architecture.md`, `docs/*.mmd` |
| Generated assurance report | `docs/assurance-report.md` |
| Design reasoning | `design/concept-decisions.md`, `design/cli.md` |
| Decisions | `artifacts/adr/` |
| Canonical enumeration | `artifacts/standards-source-inventory.json` |

## Current state

| Deliverable | State |
| --- | --- |
| 22 standards documents | Complete; inventory and fidelity gates green |
| Rule catalog | Complete; loads without error, every rule carries an assurance note |
| Claims-ledger parser and detectors | Complete |
| CLI: init, audit, validate, check, explain, status | Complete |
| Policy schema, templates, own policy | Complete |
| Tests and fixtures | Complete; the suite is green |
| Documentation, ADRs, design docs | Complete |
| CI | Complete |

Figures that would go stale are not written here. Run `npm run status` for coverage, and read
`docs/assurance-report.md` for the breakdown by what the automation establishes.

## Constraints this project holds itself to

- **No dependency on any other standards repository**, at run time, build time, or test time. The
  shared machinery was vendored, not linked (ADR 0005).
- **Zero runtime dependencies.** CI has no install step, which is what makes it structural.
- **No count in prose.** Every coverage figure is computed or asserted by a test.
- **No hand-authored SVG.** Mermaid `.mmd` is canonical and the embedded copies are checked.
- **The integrity invariant is not self-attested.** `integrity.no-self-serving-modification` reports
  `not-evaluated` in every run. An attestation by the authors that the authors did not weaken a
  standard for their own convenience establishes nothing, and recording one would be the error the
  rule names.

## How to verify it

```bash
npm run inventory && npm run fidelity && npm run policy && npm run diagrams && npm test && npm run audit && npm run validate
```

All eight gates run in CI in that order.

Separately, and deliberately not in CI because it writes to tracked files:

```bash
npm run mutation-check
```

It reintroduces the defect each gate exists to catch and confirms the gate fails, then restores the
file. Run it after changing a gate, a detector, or the comment-stripping logic.
