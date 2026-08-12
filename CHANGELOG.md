# Changelog

All notable changes to the Mathematics Standards are recorded here. The version in `VERSION` is the
`standardVersion` a consuming project declares in its `project-policy.yml`.

Versioning follows the rule the framework enforces on itself: adding a `required` or `forbidden`
rule is MAJOR, adding a `recommended` or `optional` rule is MINOR, and removing, weakening, or
reclassifying any rule is MAJOR. A rule never disappears silently — it is marked `deprecatedIn`,
optionally `supersededBy`, and only then `removedIn`, and the removal is recorded here. That trail
is one of the arms protecting Standard 21 (see `standards/21-standards-integrity.md`).

## Unreleased

**§0a — unknown or invalid arguments fail closed. Correctness fix, no evaluator semantic change.**

`--dry-run` was tested by exact presence, so `--dryrun`, `--dry_run` and `--dry-run=true` parsed as a
bare `init` and **applied**. `--help` was recognised only as a subcommand, so `init --help` applied
against a real repository. Both were produced independently by the two v1.0.0 field trials, and in
both the command exited 0, so an operator who believed they were previewing had instead scaffolded.

Every command now rejects an argument it does not recognise, before reading or writing anything, with
exit 2 — the invocation-error code, unchanged. `--help` is accepted anywhere and does nothing else.

The refusal is uniform across commands rather than confined to `init`, which is a decision and not an
oversight: a flag silently ignored on a read-only command is how a CI job comes to believe it ran
`--strict` when it did not. The three ways an argument can be wrong — unknown, misplaced, or given
the wrong shape — are distinguished in the message, because the spelling that produced this defect
was a near miss rather than a random string.

The no-overwrite default is untouched. It is the guard that held when the argument parsing failed,
and the existence of a second guard is not a reason to relax the first.

Verdicts are unaffected: both frozen adopter specimens produce byte-identical results.

## 1.0.1

**Interoperability metadata. No normative or evaluator semantic change.**

Adds `standards-adapter.json`, a machine-readable declaration of how this pack is invoked and how its
result is read, against the schema owned by StandardsEnforcer. It states what was already true: the
authoritative verdict comes from `validate`, the target is given as `--dir=<path>`, and the status
vocabulary is the five values this pack has always emitted.

Declaring the verdict command explicitly matters here because `check` is an alias for `validate` in
this pack and is *not* an alias in others. An orchestrator that learned a preference across packs
would be right here and wrong elsewhere. Nothing is inferred from this array — no aliasing, no
ordering, no fallback.

`test/adapter-contract.test.mjs` builds the invocation from the contract, runs it, runs the
documented invocation directly, and requires the two to be identical, so a declaration that drifts
from the CLI fails this pack's own suite.

### Why a new release rather than a retag

The contract did not exist at `v1.0.0`, and a consumer reads the declaration out of the pinned
checkout rather than from `main`. A released product acquired a new public machine-readable
interface, so a new release publishes that interface.

### Unchanged

Every standard, rule, level, severity, disposition and assurance value; the verdict vocabulary; the
scoring; the exit codes. The adapter declaration and its fidelity test are the only substantive
changes since `v1.0.0`. Also present are the RiemannHypothesis pre-adoption baseline artifacts under
`artifacts/adoption/` and the `design/v1.1-candidates.md` register — evidence and forward-looking
design, neither of which the evaluator reads. 79 tests pass, as at `v1.0.0`.

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
