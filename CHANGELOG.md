# Changelog

All notable changes to the Mathematics Standards are recorded here. The version in `VERSION` is the
`standardVersion` a consuming project declares in its `project-policy.yml`.

Versioning follows the rule the framework enforces on itself: adding a `required` or `forbidden`
rule is MAJOR, adding a `recommended` or `optional` rule is MINOR, and removing, weakening, or
reclassifying any rule is MAJOR. A rule never disappears silently — it is marked `deprecatedIn`,
optionally `supersededBy`, and only then `removedIn`, and the removal is recorded here. That trail
is one of the arms protecting Standard 21 (see `standards/21-standards-integrity.md`).

## 1.0.0

Initial release.

- 22 standards, from the claim hierarchy through the standards-integrity invariant and the AI agent
  operation contract.
- The machine rule catalog, with every prohibition carrying `forbidden` + `nonExemptible` so no
  policy can waive one.
- The claims-ledger convention and its parser: statuses, dependencies, assumptions, obligations,
  evidence, formal status, and history.
- `init`, `audit`, `validate` (alias `check`), `explain`, and `status`.
- The fifth verdict, `BLOCKED_BY_INVARIANT`, which outranks `NON_COMPLIANT` and which no exception,
  attestation, or reclassification clears.
- `docs/assurance-report.md`, generated from the catalog, stating what the tooling establishes and
  what requires a mathematician.
- A mutation suite that attacks each gate with the defect it exists to catch.
