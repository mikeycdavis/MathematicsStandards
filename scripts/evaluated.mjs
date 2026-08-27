/**
 * The rules the evaluator actually examines.
 *
 * This set is the difference between "no violation was observed" and "nothing looked". Every rule in
 * the catalog that is NOT here is reported `skipped / not-evaluated` rather than passing
 * (Standard 19 R4).
 *
 * It lives in its own module rather than inside scripts/standards.mjs because three consumers need
 * it and only one of them wants the CLI to run: the audit command, scripts/assurance.mjs, and the
 * test that asserts this list and the implemented detectors agree. Importing the CLI to read a
 * constant would execute an audit as a side effect.
 *
 * Adding a detector means adding its rule id here. `assertBindings` throws if a detector reports an
 * id the catalog does not define, and a test asserts that every id here is catalogued and that no
 * detector reports against an id that is missing — so the three cannot drift apart silently.
 *
 * The length of this array is deliberately not written down anywhere. A hand-maintained count is a
 * fact about someone's memory; every coverage figure is computed from the array itself.
 */
export const EVALUATED_RULES = [
  "claims.ledger-exists",
  "claims.ledger-parse-valid",
  "claims.status-vocabulary",
  "claims.history-complete",
  "claims.definitions-first",
  "claims.inline-label-consistency",
  "claims.relevance-vocabulary",
  "claims.silent-promotion",
  "claims.status-exceeds-support",
  "claims.conditional-as-unconditional",
  "rigor.explicit-domain",
  "rigor.explicit-quantifiers",
  "rigor.explicit-assumptions",
  "rigor.conjecture-registered",
  "proof.obligations-enumerated",
  "proof.dependency-traceability",
  "proof.circular-dependency",
  "proof.complete-with-open-obligations",
  "proof.counterexample-search-recorded",
  "computation.scope-declared",
  "computation.reproducible-runs",
  "computation.error-bounds-stated",
  "computation.evidence-as-proof",
  "computation.finite-case-generalization",
  "computation.float-as-exact",
  "literature.known-result-comparison",
  "literature.resolvable-identifiers",
  "literature.unchecked-novelty",
  "formal.status-declared",
  "formal.trusted-chain-tracked",
  "formal.axiom-disclosure",
  "formal.gap-inventory",
  "formal.placeholder-inventory",
  "formal.placeholder-in-chain",
  "formal.trusted-base-enlarged",
  "problems.tracking-file",
  "problems.proved-vs-conjectural",
  "problems.known-result-check",
  "problems.equivalence-tracking",
  "problems.difficulty-location",
  "problems.barriers-recorded",
  "lifecycle.failed-routes-preserved",
  "lifecycle.terminated-approaches",
  "lifecycle.reopening-evidence",
  "lifecycle.stopping-criteria",
  "evidence.applicability-declared",
  "evidence.type-vocabulary",
  "evidence.artifact-linked",
  "evidence.locator-fragment-resolves",
  "evidence.labels",
  "evidence.skipped-never-passed",
  "evidence.equivalence-direction-proved",
  "integrity.provenance-digest",
  "integrity.rule-lifecycle-honest",
  "agent.explainable-findings",
];
