/**
 * What each rule reads, and whose property that is.
 *
 * `evaluated.mjs` answers *is there a check for this rule?* — a claim made when the detector was
 * written. Nothing anywhere answered *did the check have anything to look at?*, and the compliance
 * engine read the first as though it were the second. That conflation is §0: sixteen detectors open
 * with `if (!ledger) return;`, covering 27 rules, and a detector that returns early is
 * indistinguishable downstream from one that ran and found nothing. Both produce zero findings, and
 * zero findings is read as compliance.
 *
 * So every rule with a detector declares the evidence surfaces it reads. The surfaces are resolved
 * against the target repository on each run, and the union of a rule's resolved paths is what that
 * rule inspected — recorded on the result whether it passed, failed, or warned. A rule whose every
 * surface resolves empty had no subject, and reports `not-evaluated` instead of passing.
 *
 * Three things this file is not:
 *
 *   - It is not a claim that the detector read the file well. `inspected` records where a result's
 *     evidence came from. A rule that reads the right file and applies a bad regex will now say so
 *     precisely, which is an improvement on saying nothing and is not assurance.
 *   - It is not derivable from the detector functions. Several cover multiple rules
 *     (`detectFormal` covers seven), so the function boundary does not answer "which surface did
 *     rule X read". The declaration is per rule because the question is per rule.
 *   - It is not a second copy of `evaluated.mjs`. A test asserts the two have exactly the same keys,
 *     so a detector added to one and forgotten in the other fails rather than drifting.
 *
 * The vocabulary is closed. A surface the framework cannot name is a surface it cannot check, and
 * `assertSurfacesKnown` refuses an unknown one at load rather than resolving it to nothing — which
 * would read as `no-subject` and quietly skip the rule.
 */

/**
 * Whose property a result is about.
 *
 * §0h records four rules that "are not about this project at all" and treats them as one category.
 * They are two, and the detectors' own messages draw the line: `evidence.skipped-never-passed`
 * reports "a defect in the tool, not in the project", while `integrity.provenance-digest` certifies
 * that MathematicsStandards' source documents are unmodified. The first varies per run over this
 * project; the second is identical for every adopter and unreachable by any of them.
 *
 * The distinction earns its place because the two behave differently under change: an adopter can
 * make a `run` result move and can never make a `framework` result move. They behave identically
 * for the one decision that matters downstream — neither is a property of the project, so neither
 * belongs in a score that purports to describe it.
 */
export const SUBJECT = {
  /** The adopting repository's own mathematics, records, and configuration. */
  project: "project",
  /** The standards pack's own source documents and rule catalog. Same answer for every adopter. */
  framework: "framework",
  /** This evaluation's own output. About the tool's conduct on this project, not the project. */
  run: "run",
};

/**
 * The evidence surfaces. Each resolves, per run, to a list of repo-relative paths.
 *
 * `claims-ledger-location` is separate from `claims-ledger` and the separation is load-bearing.
 * `claims.ledger-exists` is the one rule whose subject is the *absence* of the ledger; resolving it
 * against the ledger's contents would make it `no-subject` in exactly the situation it exists to
 * report. Its surface is the declared location, which always resolves.
 */
export const SURFACES = new Set([
  "claims-ledger",
  "claims-ledger-location",
  "references",
  "cited-artifacts",
  "prose",
  "proof-sources",
  "open-problems",
  "repository-paths",
  "project-policy",
  "run-findings",
  "framework-home",
  "framework-catalog",
]);

const P = SUBJECT.project;
const F = SUBJECT.framework;
const R = SUBJECT.run;

/**
 * Rule → { subject, surfaces }.
 *
 * Read off the detector bodies in scripts/standards.mjs, not off the rule names. Where a rule has
 * arms reading different surfaces, every surface it can read is listed: the rule inspected the union,
 * and a rule is only `no-subject` when all of them are empty. Listing only the primary surface would
 * skip a rule whose secondary arm had real evidence.
 */
export const RULE_SURFACES = new Map([
  // Claims. All read the parsed ledger; two also scan prose for references to registered claims.
  ["claims.ledger-exists", { subject: P, surfaces: ["claims-ledger-location"] }],
  ["claims.ledger-parse-valid", { subject: P, surfaces: ["claims-ledger"] }],
  ["claims.status-vocabulary", { subject: P, surfaces: ["claims-ledger"] }],
  ["claims.history-complete", { subject: P, surfaces: ["claims-ledger"] }],
  ["claims.definitions-first", { subject: P, surfaces: ["claims-ledger"] }],
  ["claims.inline-label-consistency", { subject: P, surfaces: ["claims-ledger", "prose"] }],
  // Two arms with genuinely different surfaces, and Tier 1 already gave them different labels: the
  // ledger arm reads the History block (OBSERVED), the prose arm scores a text window (INFERRED).
  ["claims.silent-promotion", { subject: P, surfaces: ["claims-ledger", "prose"] }],
  ["claims.status-exceeds-support", { subject: P, surfaces: ["claims-ledger"] }],
  ["claims.conditional-as-unconditional", { subject: P, surfaces: ["claims-ledger"] }],

  // Rigor. Field presence on ledger entries at HYPOTHESIS rank or above.
  ["rigor.explicit-domain", { subject: P, surfaces: ["claims-ledger"] }],
  ["rigor.explicit-quantifiers", { subject: P, surfaces: ["claims-ledger"] }],
  ["rigor.explicit-assumptions", { subject: P, surfaces: ["claims-ledger"] }],
  ["rigor.conjecture-registered", { subject: P, surfaces: ["claims-ledger"] }],

  // Proof structure. The dependency graph and the obligation lines, both inside the ledger.
  ["proof.obligations-enumerated", { subject: P, surfaces: ["claims-ledger"] }],
  ["proof.dependency-traceability", { subject: P, surfaces: ["claims-ledger"] }],
  ["proof.circular-dependency", { subject: P, surfaces: ["claims-ledger"] }],
  ["proof.complete-with-open-obligations", { subject: P, surfaces: ["claims-ledger"] }],
  ["proof.counterexample-search-recorded", { subject: P, surfaces: ["claims-ledger"] }],

  // Computation. Two of these open the cited program and read it, which is a second surface.
  ["computation.scope-declared", { subject: P, surfaces: ["claims-ledger"] }],
  ["computation.reproducible-runs", { subject: P, surfaces: ["claims-ledger", "cited-artifacts"] }],
  ["computation.error-bounds-stated", { subject: P, surfaces: ["claims-ledger"] }],
  ["computation.evidence-as-proof", { subject: P, surfaces: ["claims-ledger", "prose"] }],
  ["computation.finite-case-generalization", { subject: P, surfaces: ["claims-ledger"] }],
  ["computation.float-as-exact", { subject: P, surfaces: ["claims-ledger", "cited-artifacts"] }],

  // Literature. The identifier arm reads the ledger's References section specifically.
  ["literature.known-result-comparison", { subject: P, surfaces: ["claims-ledger"] }],
  ["literature.resolvable-identifiers", { subject: P, surfaces: ["claims-ledger", "references"] }],
  ["literature.unchecked-novelty", { subject: P, surfaces: ["claims-ledger"] }],

  // Formal. Placeholder and axiom scanning read the proof sources; the Formal-block rules read the
  // ledger; placeholder-in-chain resolves the file a claim cites and reads that.
  ["formal.status-declared", { subject: P, surfaces: ["proof-sources", "claims-ledger"] }],
  ["formal.trusted-chain-tracked", { subject: P, surfaces: ["claims-ledger"] }],
  ["formal.axiom-disclosure", { subject: P, surfaces: ["proof-sources", "claims-ledger"] }],
  ["formal.gap-inventory", { subject: P, surfaces: ["claims-ledger"] }],
  ["formal.placeholder-inventory", { subject: P, surfaces: ["proof-sources"] }],
  ["formal.placeholder-in-chain", { subject: P, surfaces: ["claims-ledger", "cited-artifacts"] }],
  ["formal.trusted-base-enlarged", { subject: P, surfaces: ["proof-sources"] }],

  // Open problems. Every one reads a required section of an open-problem record.
  ["problems.tracking-file", { subject: P, surfaces: ["open-problems", "project-policy"] }],
  ["problems.proved-vs-conjectural", { subject: P, surfaces: ["open-problems"] }],
  ["problems.known-result-check", { subject: P, surfaces: ["open-problems"] }],
  ["problems.equivalence-tracking", { subject: P, surfaces: ["open-problems"] }],
  ["problems.difficulty-location", { subject: P, surfaces: ["open-problems"] }],
  ["problems.barriers-recorded", { subject: P, surfaces: ["open-problems"] }],

  // Lifecycle. `failed-routes-preserved` reads PATH NAMES rather than content — which is §0m stated
  // as a surface: a rule looking for a record of abandoned work is matching the shape of a path.
  // `repository-paths` is named honestly here so the repair has something to replace.
  ["lifecycle.failed-routes-preserved", { subject: P, surfaces: ["repository-paths", "open-problems"] }],
  ["lifecycle.terminated-approaches", { subject: P, surfaces: ["open-problems"] }],
  ["lifecycle.reopening-evidence", { subject: P, surfaces: ["open-problems"] }],
  ["lifecycle.stopping-criteria", { subject: P, surfaces: ["open-problems"] }],

  // Evidence.
  ["evidence.applicability-declared", { subject: P, surfaces: ["project-policy"] }],
  ["evidence.type-vocabulary", { subject: P, surfaces: ["claims-ledger"] }],
  ["evidence.artifact-linked", { subject: P, surfaces: ["claims-ledger", "cited-artifacts"] }],
  ["evidence.equivalence-direction-proved", { subject: P, surfaces: ["claims-ledger"] }],

  // The run's own conduct. These read the findings this invocation produced, and their subject is
  // the tool. `skipped-never-passed` says so in its own message: "a defect in the tool, not in the
  // project". Reported inside an adopter's run because that is where the defect would appear.
  ["evidence.labels", { subject: R, surfaces: ["run-findings"] }],
  ["evidence.skipped-never-passed", { subject: R, surfaces: ["run-findings"] }],
  ["agent.explainable-findings", { subject: R, surfaces: ["run-findings"] }],

  // The framework's own integrity. §0h. Both read MathematicsStandards' home, and both are about
  // MathematicsStandards: the catalog text of the first is "the SHA-256 of each file listed in
  // artifacts/provenance-digests.json", meaning this pack's source documents, and the second is
  // about this pack's rule catalog. An adopter owns neither, which is why the repair is to say whose
  // property the result is about rather than to point the rules at the adopter's root.
  ["integrity.provenance-digest", { subject: F, surfaces: ["framework-home"] }],
  ["integrity.rule-lifecycle-honest", { subject: F, surfaces: ["framework-catalog"] }],
]);

/** Refuse an unknown surface at load. Resolving one to nothing would read as `no-subject`. */
export function assertSurfacesKnown() {
  for (const [rule, decl] of RULE_SURFACES) {
    for (const surface of decl.surfaces) {
      if (!SURFACES.has(surface)) {
        throw new Error(`${rule} declares unknown evidence surface '${surface}'`);
      }
    }
    if (!Object.values(SUBJECT).includes(decl.subject)) {
      throw new Error(`${rule} declares unknown subject '${decl.subject}'`);
    }
  }
}

/** How many paths a surface lists before it reports a count instead. Keeps the envelope bounded. */
export const MAX_SURFACE_PATHS = 12;

/**
 * The inspection record for a result no detector produced.
 *
 * Every result carries the key, including the ones the engine hand-builds — attestations, rejected
 * and expired exceptions, and rules with no detector at all. Tier 1 learned this the expensive way:
 * `label` was omitted from four hand-built result objects, and the gap surfaced only when auditing
 * a real repository showed `label=undefined` on two blockers. An absent key and a key saying
 * "nothing was inspected" are different propositions, and only one of them is auditable.
 *
 * `state: "no-detector"` rather than `"no-subject"`. The distinction is the whole point of §0: a
 * rule nothing implements and a rule with nothing to read are both reported `skipped /
 * not-evaluated`, and until now they were indistinguishable in the output as well as in the engine.
 */
export function noDetectorInspection() {
  return { subject: SUBJECT.project, state: "no-detector", surfaces: [] };
}

/**
 * The inspection record for one rule.
 *
 * @param ruleId   canonical rule id
 * @param resolve  (surfaceName) => string[] of repo-relative paths this run found for that surface
 *
 * `no-detector` and `no-subject` are both reported as `skipped / not-evaluated` by the engine, and
 * that is deliberate — a fourth disposition would break every consumer switching on the field in
 * order to record something this state already carries. The distinction has to be legible somewhere;
 * it is legible here.
 */
export function inspectionFor(ruleId, resolve) {
  const declaration = RULE_SURFACES.get(ruleId);
  if (!declaration) {
    return { subject: SUBJECT.project, state: "no-detector", surfaces: [] };
  }
  const surfaces = declaration.surfaces.map((surface) => {
    const paths = resolve(surface) ?? [];
    return {
      surface,
      count: paths.length,
      paths: paths.slice(0, MAX_SURFACE_PATHS),
      declared: false,
    };
  });
  return {
    subject: declaration.subject,
    state: surfaces.some((s) => s.count > 0) ? "inspected" : "no-subject",
    surfaces,
  };
}
