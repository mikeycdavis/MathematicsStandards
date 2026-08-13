/**
 * The compliance engine: catalog + policy + observed findings → a verdict.
 *
 *   observed finding + applicability + exceptions + assurance
 *       → COMPLIANT | COMPLIANT_WITH_EXCEPTIONS | NON_COMPLIANT | NOT_EVALUATED
 *                                                | BLOCKED_BY_INVARIANT
 *
 * This is where Standard 19 stops being documentation. Four properties of it are load-bearing:
 *
 *   1. Status is computed from rules, never from the score. There is no threshold at which a
 *      percentage grants or withdraws compliance.
 *   2. A rule nothing evaluated is `skipped`, never `passed`. Unknown is not a pass.
 *   3. The score's denominator is the rules that were actually evaluated, and the assurance
 *      breakdown ships beside it so the number cannot imply coverage it does not have.
 *   4. An observed violation of an invariant — a rule the catalog declares both `forbidden` and
 *      `nonExemptible` — produces BLOCKED_BY_INVARIANT, which outranks NON_COMPLIANT and which no
 *      exception, attestation, or level override can clear (Standard 21, Standard 22). The verdict
 *      exists so an AI agent has a conclusion that means "stop", distinct from "this project has
 *      failures": a caller may reasonably keep working on a NON_COMPLIANT project, and may not keep
 *      working past an invariant.
 */

import { resolve } from "./catalog.mjs";
import { inspectionFor } from "./surfaces.mjs";

const noDetectorInspection = () => inspectionFor("__no-detector__", () => []);

export const STATUS = {
  COMPLIANT: "COMPLIANT",
  COMPLIANT_WITH_EXCEPTIONS: "COMPLIANT_WITH_EXCEPTIONS",
  NON_COMPLIANT: "NON_COMPLIANT",
  BLOCKED_BY_INVARIANT: "BLOCKED_BY_INVARIANT",
  NOT_EVALUATED: "NOT_EVALUATED",
};

/**
 * An invariant is not a separate object in the catalog: it is the conjunction the standards already
 * express. `forbidden` says the behaviour must never happen; `nonExemptible` says no waiver reaches
 * it. A rule carrying both is what Standard 21 calls an invariant, and this predicate is the single
 * place that definition lives so the catalog, the verdict, and the documentation cannot disagree.
 */
export function isInvariant(rule) {
  return rule.level === "forbidden" && rule.nonExemptible === true;
}

const RESULT = { passed: "passed", failed: "failed", warning: "warning", skipped: "skipped" };

/**
 * @param catalog   from loadCatalog()
 * @param policy    a validated project-policy document, or null when the project declares none
 * @param findings  evaluator findings, each optionally carrying `rule` (a canonical id)
 * @param evaluated the set of rule ids the evaluator actually examined — the crucial input.
 *                  A rule absent from this set was not checked, and reporting it as passing
 *                  because nothing failed is the false green this whole framework exists to stop.
 * @param today     ISO date, for exception expiry
 */
export function evaluate({ catalog, policy, findings, evaluated, inspections, today, digests }) {
  const declaredRules = policy?.rules ?? {};
  const applicability = policy?.applicability ?? {};
  const exceptions = Array.isArray(policy?.exceptions) ? policy.exceptions : [];
  const attestations = policy?.attestations ?? {};
  const examined = new Set(evaluated ?? []);
  const currentDigests = digests ?? new Map();
  const inspectedByRule = inspections ?? new Map();

  const byRule = new Map();
  for (const finding of findings) {
    if (!finding.rule) continue;
    const rule = resolve(catalog, finding.rule);
    if (!rule) continue;
    if (!byRule.has(rule.id)) byRule.set(rule.id, []);
    byRule.get(rule.id).push(finding);
  }

  const activeExceptions = new Map();
  const expiredExceptions = [];
  const rejectedExceptions = [];
  for (const entry of exceptions) {
    const rule = resolve(catalog, entry.rule);
    if (!rule) continue;
    // A non-exemptible rule admits no exception. The waiver is REJECTED, not honoured and not
    // quietly ignored: an exception engine that can waive a rule its standard declared
    // non-exemptible has made the prohibition optional, which is not a prohibition
    // (Standard 20 R4). Order matters — this is checked before expiry, because a non-exemptible
    // waiver is invalid whether or not it has lapsed.
    if (rule.nonExemptible) {
      rejectedExceptions.push({ ...entry, rule: rule.id });
      continue;
    }
    if (entry.expires && entry.expires < today) expiredExceptions.push({ ...entry, rule: rule.id });
    else activeExceptions.set(rule.id, entry);
  }

  /** rule id → why an attestation stopped establishing it. Read by `base` a few lines later. */
  const unevaluatedBecause = new Map();

  const results = [];
  for (const rule of catalog.rules.values()) {
    const declared = declaredRules[rule.id];
    const level = declared?.level ?? rule.level;
    const applies = applicability[rule.id];

    // Not applicable: the rule's subject does not exist here. Visible, never a silent exclusion.
    if (applies?.status === "not-applicable") {
      results.push(base(rule, level, RESULT.skipped, "not-applicable", applies.reason, null,
        inspectedByRule.get(rule.id) ?? noDetectorInspection(), "not-applicable"));
      continue;
    }

    // A recorded human judgement (ADR 0005). Checked BEFORE not-evaluated, because an attestation
    // is precisely what turns "nobody looked" into "somebody looked" — but AFTER the automated
    // findings are collected, because it may never override one.
    const attestation = attestations[rule.id];
    if (attestation) {
      const hits = byRule.get(rule.id) ?? [];
      const verdict = judgeAttestation(
        rule,
        attestation,
        hits,
        today,
        currentDigests,
        inspectedByRule.get(rule.id) ?? noDetectorInspection(),
      );
      if (verdict && !verdict.fallThrough) {
        results.push(verdict);
        continue;
      }
      // The attestation did not establish the requirement. WHY it did not is carried forward: a
      // stale review and a rule nobody ever attested both land on `skipped / not-evaluated`, and
      // before this they landed there with the same message — "No implemented check evaluates X",
      // true of the detector and false about the history. Somebody did review this rule, recorded
      // what they read, and the thing they read has changed. Only one of the two is actionable.
      if (verdict?.fallThrough) unevaluatedBecause.set(rule.id, verdict.fallThrough);
      // Falls through: the attestation did not establish the requirement, so the rule is evaluated
      // normally and typically lands on not-evaluated. Silently ignoring it would be worse.
    }

    const hits = byRule.get(rule.id) ?? [];

    // A manual-review rule is never ESTABLISHED by an automated run. Without a valid attestation it
    // is not-evaluated, even if the evaluator examined it and found nothing — "no automated finding"
    // is not evidence for a requirement whose evaluator is a human.
    //
    // But `hits.length === 0` is load-bearing in that condition, and it was missing. An observation
    // is not nothing: if a check DID see a violation of a manual-review rule, skipping the rule
    // would discard the evidence and report "nobody looked" about something that was looked at and
    // found wanting. That is the false green in its other direction, and for an invariant it would
    // silently downgrade BLOCKED_BY_INVARIANT to COMPLIANT. Found by a test that planted a finding
    // against an invariant and got COMPLIANT back.
    const inspected = examined.has(rule.id)
      ? inspectedByRule.get(rule.id)
      : noDetectorInspection();
    if (hits.length === 0 && inspected?.state === "no-subject") {
      results.push(
        base(rule, level, RESULT.skipped, "not-evaluated",
          `The detector for ${rule.id} had no evidence surface to inspect.`, null, inspected, "no-subject"),
      );
      continue;
    }
    // Fail closed on evidence the framework could not reach.
    //
    // `blocked` is set when a surface the rule REQUIRES came back unresolved — in practice, an
    // artifact the project declared and the framework could not read. Three properties, and each is
    // a decision:
    //
    //   - it cannot PASS. A pointer that does not resolve establishes nothing, and a rule that
    //     passes because nothing contradicted it is the false green this engine exists to stop;
    //   - it cannot FAIL. Absence of evidence access is not evidence of violation. The project may
    //     be entirely compliant and have mistyped a path; a `failed` here asserts the framework
    //     knows which, and it does not;
    //   - it does not invent a status. "Evaluation could not establish this" already exists and is
    //     spelled `skipped / not-evaluated`; the pointer's own classification stays in the
    //     diagnostic. What that costs an adopter's score is a separate question, deliberately not
    //     answered here — see design/v1.2-evidence-provenance.md §11.
    if (hits.length === 0 && inspected?.blocked === true) {
      const why = inspected.surfaces
        .filter((s) => s.reason && inspected.unresolved.includes(s.surface))
        .map((s) => s.reason)
        .join(" ");
      results.push(
        base(rule, level, RESULT.skipped, "not-evaluated",
          `${rule.id} could not be evaluated: the evidence it was pointed at could not be read. ${why}`.trim(),
          null, inspected, "unresolved-evidence"),
      );
      continue;
    }
    if (hits.length === 0 && (rule.validationType === "manual-review" || !examined.has(rule.id))) {
      // A stale or expired attestation arrives here too, and must not be told it was never looked
      // at. The status is the same and the sentence is not.
      const lapsed = unevaluatedBecause.get(rule.id);
      const message = lapsed
        ? `${rule.id} was reviewed and the review no longer applies: ` +
          `${lapsed === "stale-attestation" ? "what was reviewed is not what is there now" : "the attestation has expired"}.`
        : `No implemented check evaluates ${rule.id}.`;
      results.push(
        base(rule, level, RESULT.skipped, "not-evaluated", message, null,
          inspected ?? noDetectorInspection(), lapsed ?? "no-detector"),
      );
      continue;
    }
    if (hits.length === 0) {
      results.push(base(rule, level, RESULT.passed, "evaluated", `No violation of ${rule.id} was observed.`, null,
        inspected));
      continue;
    }

    const exception = activeExceptions.get(rule.id);
    const outcome = level === "required" || level === "forbidden" ? RESULT.failed : RESULT.warning;
    const label = strongestLabel(hits);
    const result = base(rule, level, outcome, exception ? "excepted" : "evaluated", hits[0].message, label,
      inspected);

    // The Tier 1 ceiling, and the only place in the engine that applies it.
    //
    // It lives on this branch and nowhere else on purpose: this is the branch that evaluates a
    // detector finding, and a detector finding is the only kind of result that carries an
    // evidentiary classification. Attestations, exceptions, skips and passes are built elsewhere
    // and are not reached from here, so Tier 1 assigns no evidence meaning to result paths it did
    // not create.
    //
    // The predicate is written positively — elevation requires OBSERVED — rather than as
    // `label !== "OBSERVED"`. The two are equivalent on this branch and would not stay equivalent
    // if the check ever moved: `null` is not a weak label, it is the absence of the concept, and a
    // rejected attestation carrying `null` must keep blocking. Saying what earns the terminal
    // verdict is also the honest statement of the rule. An unlabelled finding does not earn it,
    // which is the acceptance rule for the whole milestone: no finding acquires evidentiary
    // certainty through a default.
    const mayElevateInvariant = result.invariant === true && label === "OBSERVED";
    if (result.status === RESULT.failed && result.invariant === true && !mayElevateInvariant) {
      // Explanatory metadata, not a second status. The result still fails, still counts toward
      // NON_COMPLIANT, and is still reported in full; what is recorded is the one consequence the
      // ceiling prevented. Absent whenever nothing was prevented — see summarise, which reads it
      // only to decide whether this result blocks.
      result.cappedFrom = STATUS.BLOCKED_BY_INVARIANT;
    }

    result.evidence = hits.flatMap((h) => h.evidence ?? []);
    result.files = result.evidence;
    if (exception) {
      result.exception = {
        reason: exception.reason,
        approvedBy: exception.approvedBy,
        approvedAt: exception.approvedAt,
        expires: exception.expires ?? null,
        reference: exception.reference ?? null,
      };
    }
    results.push(result);
  }

  for (const entry of rejectedExceptions) {
    const rule = resolve(catalog, entry.rule);
    results.push({
      ruleId: entry.rule,
      status: RESULT.failed,
      severity: "error",
      level: "required",
      validationType: "configuration",
      assurance: "full",
      disposition: "rejected-exception",
      label: null,
      message: `${entry.rule} is non-exemptible; the exception against it is rejected, not applied.`,
      evidence: ["project-policy.yml"],
      files: ["project-policy.yml"],
      inspected: policyInspection(),
      remediation:
        "Remove the exception and satisfy the rule. If the rule genuinely has no subject in this project, declare it not-applicable instead.",
      // Writing a waiver against an invariant is itself the attempt Standard 21 names: weakening a
      // standard because it prevents the desired conclusion. The verdict says so.
      invariant: rule ? isInvariant(rule) : false,
    });
  }

  for (const entry of expiredExceptions) {
    results.push({
      ruleId: entry.rule,
      status: RESULT.failed,
      severity: "error",
      level: "required",
      validationType: "configuration",
      assurance: "full",
      disposition: "expired-exception",
      label: null,
      message: `The exception for ${entry.rule} expired on ${entry.expires}.`,
      evidence: ["project-policy.yml"],
      files: ["project-policy.yml"],
      inspected: policyInspection(),
      remediation: "Renew the exception with a new approval, or satisfy the rule.",
    });
  }

  return summarise(results, policy);
}

/**
 * Decide what an attestation establishes. Returns a result, or null to fall through to normal
 * evaluation — never a silent success.
 *
 * The rules are ADR 0005's, and the ordering is the interesting part: contradiction is checked
 * first, because a human saying a rule is satisfied does not change what a check observed. Evidence
 * outranks assertion (Standard 38 R4), and that is also why an attestation cannot bypass a
 * nonExemptible rule — not as a separate prohibition, but because the automated failure survives.
 */
function judgeAttestation(rule, attestation, hits, today, digests, detectorInspection) {
  const fail = (disposition, message, remediation) => ({
    ruleId: rule.id,
    status: RESULT.failed,
    severity: "error",
    level: "required",
    validationType: "configuration",
    assurance: "full",
    disposition,
    // Not a detector finding, so there is no detector label to carry. See the note on `base`:
    // `null` means "this result did not come from an evidence-labelled observation", which is a
    // different thing from an observation whose basis is unknown. The distinction matters at the
    // ceiling — a human's recorded review is not weaker evidence than a regex, and must not be
    // capped as though it were.
    label: null,
    message,
    evidence: ["project-policy.yml"],
    files: ["project-policy.yml"],
    inspected: policyInspection(),
    remediation,
    // A contradicted attestation on an invariant rule is still an invariant violation: the observed
    // finding did not go away because someone wrote a review note over it. Without this flag the
    // attestation would be a way to downgrade BLOCKED_BY_INVARIANT to NON_COMPLIANT, which is
    // exactly the manipulation Standard 21 prohibits.
    invariant: isInvariant(rule),
  });

  if (!rule.attestable) {
    return fail(
      "invalid-attestation",
      `${rule.id} is not attestable; the catalog says it is evaluated by ${rule.validationType}, not by human review.`,
      "Remove the attestation. A rule the catalog does not mark attestable cannot be satisfied by assertion.",
    );
  }

  if (hits.length > 0) {
    return fail(
      "contradicted-attestation",
      `${rule.id} is attested as approved, but an automated check found: ${hits[0].message}`,
      "Fix the finding. An attestation records human evidence; it never overrides what a check observed.",
    );
  }

  if (attestation.status === "rejected") {
    return fail(
      "attested-rejected",
      `${rule.id} was reviewed by ${attestation.reviewedBy} and found unmet.`,
      "Satisfy the rule, then re-attest. A recorded rejection is a failure, not silence.",
    );
  }

  // Both of the next two return the rule to not-evaluated rather than failing it — an expired or
  // stale review is unreviewed again, not refuted. They carry a reason out with them because the
  // status they land on is shared with "nobody ever looked", and those are different situations
  // with different remedies: one needs a reviewer, the other needs the same reviewer again.
  if (attestation.expires && attestation.expires < today) {
    return { fallThrough: "expired-attestation", reviewedBy: attestation.reviewedBy };
  }

  const against = attestation.reviewedAgainst;
  if (against?.digest) {
    const current = digests.get(rule.id);
    if (current && current !== against.digest) {
      return { fallThrough: "stale-attestation", reviewedBy: attestation.reviewedBy };
    }
  }

  return {
    ruleId: rule.id,
    status: RESULT.passed,
    severity: rule.severity,
    level: "required",
    validationType: "manual-review",
    // Human judgement establishes the requirement, and does so without a machine. `manualReview` in
    // the assurance breakdown is the honest home for it — never `automated`.
    assurance: "full",
    disposition: "attested",
    label: null,
    message: `Attested by ${attestation.reviewedBy} on ${attestation.reviewedAt}: ${attestation.evidence}`,
    evidence: against?.paths ?? [],
    files: against?.paths ?? [],
    inspected: against?.paths?.length
      ? {
          subject: "project",
          state: "inspected",
          surfaces: [{ surface: `declared:${rule.id}`, count: against.paths.length, paths: against.paths, declared: true }],
        }
      : detectorInspection,
    remediation: rule.remediation,
    attestation: {
      reviewedBy: attestation.reviewedBy,
      reviewedAt: attestation.reviewedAt,
      evidence: attestation.evidence,
      reference: attestation.reference ?? null,
      expires: attestation.expires ?? null,
      // §0e. The schema tells an operator to omit `digest` on a first pass "because the validator
      // reports the current digest so it can be recorded" — and the validator does report it, in the
      // human render, for every attestation, and nowhere else. RiemannHypothesis measured from
      // `--json`, found nothing, and wrote into its own policy that the validator does not report
      // it; the observation was right for the surface used and the mechanism inferred from it was
      // not. Either way its fourteen attestations can never go stale, because the value needed to
      // opt in is emitted only on the surface the operator was not reading.
      //
      // `currency` states the consequence rather than leaving it to be worked out from two nullable
      // fields. An attestation with no recorded digest is not fresh — it is of unknown currency, and
      // those look identical in v1.0.
      reviewedAgainst: {
        paths: against?.paths ?? [],
        digest: against?.digest ?? null,
        currentDigest: digests.get(rule.id) ?? null,
        currency: against?.digest ? "verified-current" : "unknown",
      },
    },
  };
}

function policyInspection() {
  return {
    subject: "project",
    state: "inspected",
    surfaces: [{ surface: "project-policy", count: 1, paths: ["project-policy.yml"], declared: true }],
  };
}

/** The validated evidence labels of Standard 19 R5. */
export const EVIDENCE_LABELS = ["OBSERVED", "INFERRED", "CONFIRMED_BY_OWNER", "UNKNOWN"];

/**
 * One rule can fire more than once in a run, and the arms need not agree — `claims.silent-promotion`
 * has a prose arm and a ledger arm with genuinely different bases. The result takes the *strongest*
 * label present, so a real observed violation is never masked by an inferred one sharing its rule.
 * An unrecognised label counts for nothing rather than for something.
 */
export function strongestLabel(hits) {
  const present = hits.map((h) => h.label).filter((l) => EVIDENCE_LABELS.includes(l));
  if (present.length === 0) return null;
  return present.includes("OBSERVED") ? "OBSERVED" : present[0];
}

/**
 * `label` is the evidentiary classification the detector supplied, carried into the result.
 *
 * It was previously discarded here, and that is half of §0b: the finding's own statement of what it
 * rests on reached the human render and never reached the verdict. Threading it through changes no
 * behaviour on its own — nothing reads it yet — but it makes the classification a property of the
 * result rather than something that exists only in the audit output.
 *
 * `null` on any result not derived from a finding. A rule that passed, was skipped, or was attested
 * has no finding to classify, and giving it a label would be manufacturing certainty in the other
 * direction.
 */
function base(
  rule,
  level,
  status,
  disposition,
  message,
  label = null,
  inspected = noDetectorInspection(),
  // Why this result was not evaluated, or null when it was. Six values share one status, and the
  // remedy differs for each: no-detector needs an implementer, no-subject needs the project to
  // acquire the thing, unresolved-evidence needs a corrected pointer, stale-attestation needs the
  // same reviewer again, expired-attestation needs a renewal, not-applicable needs nothing.
  notEvaluatedBecause = null,
) {
  return {
    ruleId: rule.id,
    status,
    severity: rule.severity,
    level,
    validationType: rule.validationType,
    assurance: status === RESULT.skipped ? "none" : rule.assurance,
    disposition,
    label,
    inspected,
    notEvaluatedBecause,
    message,
    evidence: [],
    files: [],
    remediation: rule.remediation,
    // Carried on every result, not only failures, so a reader can see which rules are invariants
    // even when they pass. The flag describes the rule, not the outcome.
    invariant: isInvariant(rule),
  };
}

function summarise(results, policy) {
  const counts = { passed: 0, failed: 0, warnings: 0, skipped: 0 };
  for (const r of results) {
    if (r.status === RESULT.passed) counts.passed++;
    else if (r.status === RESULT.failed) counts.failed++;
    else if (r.status === RESULT.warning) counts.warnings++;
    else counts.skipped++;
  }

  // Assurance accounts for every applicable rule, and the three MUST sum (Standard 30 R4).
  const assurance = { automated: 0, manualReview: 0, notEvaluated: 0 };
  for (const r of results) {
    if (r.disposition === "not-applicable") continue;
    if (r.status === RESULT.skipped) assurance.notEvaluated++;
    else if (r.validationType === "manual-review") assurance.manualReview++;
    else assurance.automated++;
  }

  // Normalised here rather than at each construction site. Four results are hand-built — rejected
  // and expired exceptions, contradicted and invalid attestations — and Tier 1 lost real time to a
  // field that was added to `base` and forgotten on exactly those four. A key that is absent on some
  // results and present on others cannot be relied on by any consumer.
  for (const r of results) if (r.notEvaluatedBecause === undefined) r.notEvaluatedBecause = null;

  const applicable = results.filter((r) => r.disposition !== "not-applicable");

  /**
   * Whose property is this result about?
   *
   * §0h, and the reason it reaches the score. `integrity.provenance-digest` certifies
   * MathematicsStandards' own source documents: the answer is the same for every adopter and no
   * adopter can change it. A row nobody being measured can affect is not a measurement of them, and
   * five such rows in a denominator of forty are free marks. Results with no inspection record are
   * the project's by default — that is what `noDetectorInspection` reports, and treating an unknown
   * subject as foreign would silently shrink the denominator.
   */
  const isProjectSubject = (r) => (r.inspected?.subject ?? "project") === "project";
  const foreign = applicable.filter((r) => !isProjectSubject(r));

  /**
   * The denominator, and the one entry in it that can never be earned.
   *
   * An unresolved REQUIRED surface occupies a slot and scores nothing. That is the whole of step 5's
   * monotonicity property: without it, declaring a pointer at a file that does not exist moves the
   * rule from `failed` (0/1) to `skipped` (out of the denominator entirely), and a repository's
   * score RISES because it made an assertion that is not true. Measured on the fixture pair before
   * this change: NON_COMPLIANT / 97 became COMPLIANT / 100.
   *
   * Keeping the slot is preferable to restoring the failure. The framework still does not know
   * whether the project preserves its failed routes; what it knows is that it was told where to look
   * and could not, and an unearnable slot says exactly that without claiming more.
   */
  const isRequired = (r) => r.level === "required";
  const unresolvedRequired = applicable.filter(
    (r) => isProjectSubject(r) && isRequired(r) && r.inspected?.blocked === true,
  );
  const scored = applicable.filter(
    (r) =>
      isProjectSubject(r) &&
      isRequired(r) &&
      (r.status !== RESULT.skipped || r.inspected?.blocked === true),
  );
  const scoredIds = new Set(scored.map((r) => r.ruleId));
  for (const r of results) r.scored = scoredIds.has(r.ruleId);
  const scoredPassed = scored.filter((r) => r.status === RESULT.passed).length;
  const score = scored.length === 0 ? null : Math.round((scoredPassed / scored.length) * 100);

  const notEvaluated = { noDetector: 0, noSubject: 0, unresolvedRequired: 0, staleAttestation: 0, expiredAttestation: 0 };
  const BUCKET = {
    "no-detector": "noDetector",
    "no-subject": "noSubject",
    "unresolved-evidence": "unresolvedRequired",
    "stale-attestation": "staleAttestation",
    "expired-attestation": "expiredAttestation",
  };
  for (const r of applicable) {
    const bucket = BUCKET[r.notEvaluatedBecause];
    if (bucket) notEvaluated[bucket]++;
  }

  // The adopter's failures are the adopter's. A framework- or run-subject failure is real and is
  // reported — `foreignFailures`, and its own block in the render — but it is not this project's
  // non-compliance, and putting it here was how `§0h` produced a verdict about the wrong repository.
  const requiredFailures = results.filter(
    (r) => r.status === RESULT.failed && !(r.disposition === "excepted") && isProjectSubject(r),
  );
  const foreignFailures = foreign
    .filter((r) => r.status === RESULT.failed)
    .map((r) => ({ rule: r.ruleId, subject: r.inspected.subject, message: r.message }));
  const excepted = results.filter((r) => r.disposition === "excepted");

  // Invariant violations are read off the results, not recomputed, so a rule can only block if it
  // actually failed an evaluation. `excepted` is deliberately not subtracted here: the exception
  // engine already rejects waivers on non-exemptible rules, and honouring one at this layer would
  // reintroduce the bypass through the back door.
  //
  // `cappedFrom` is subtracted, and it is not the same kind of subtraction. An exception is a
  // request to disregard a rule; a cap is the engine declining to draw a conclusion its evidence
  // does not support. The result still fails and still makes the run NON_COMPLIANT — the cap
  // removes the terminal verdict, never the finding.
  const blocking = results.filter(
    (r) => r.status === RESULT.failed && r.invariant === true && r.cappedFrom === undefined,
  );

  let status;
  if (!policy) status = STATUS.NOT_EVALUATED;
  else if (blocking.length > 0) status = STATUS.BLOCKED_BY_INVARIANT;
  else if (requiredFailures.length > 0) status = STATUS.NON_COMPLIANT;
  // The aggregate condition that closes the escape hatch on the terminal status, as it is closed on
  // the score. A project that declares where its evidence is and points at nothing has a defect in
  // its records; the framework will not call that compliance. It is deliberately NOT a claim that
  // the underlying rule is violated — the rule's own result still says `skipped / not-evaluated`,
  // and `blockedBy` stays empty because nothing here is an invariant.
  else if (unresolvedRequired.length > 0) status = STATUS.NON_COMPLIANT;
  else if (excepted.length > 0) status = STATUS.COMPLIANT_WITH_EXCEPTIONS;
  else status = STATUS.COMPLIANT;

  return {
    status,
    score,
    summary: counts,
    assurance,
    denominator: {
      total: results.length,
      applicable: applicable.length,
      scored: scored.length,
      // Named parts rather than one number, because "37 of 82" invites the reader to assume the
      // other 45 were merely unimplemented. They were five different things.
      frameworkSubject: foreign.filter((r) => r.inspected.subject === "framework").length,
      runSubject: foreign.filter((r) => r.inspected.subject === "run").length,
      noSubject: notEvaluated.noSubject,
      noDetector: notEvaluated.noDetector,
      unresolvedRequired: notEvaluated.unresolvedRequired,
      staleAttestation: notEvaluated.staleAttestation,
      expiredAttestation: notEvaluated.expiredAttestation,
      basis: "required-level rules about this project that were evaluated, plus those whose required evidence could not be read",
    },
    // Failures that are real and are not this project's. Empty on a healthy run, and present rather
    // than absent so a consumer can distinguish "none" from "this build does not report them".
    foreignFailures,
    // Named so a consumer — especially an agent deciding whether to continue — can see WHICH
    // invariant stopped it without scanning every result.
    blockedBy: blocking.map((r) => ({ rule: r.ruleId, message: r.message })),
    results,
  };
}

/** The Standard 25 envelope. `schemaVersion` versions this format, independent of the others. */
export function envelope({ verdict, project, standardVersion, auditedAt, repo, frameworkCoverage, claims }) {
  return {
    schemaVersion: "1.0",
    standardVersion: standardVersion ?? null,
    project: project ?? repo ?? null,
    /**
     * A1. The claim-level facts that are not about compliance.
     *
     * Relevance lives here rather than on a result because it is not the outcome of a rule: it is
     * something the project declared about its own work, and no rule reads it for anything but
     * membership. Putting it on results would invite a consumer to correlate it with a status, which
     * is the coupling this axis exists to prevent. Absent when the ledger is.
     */
    claims: claims ?? null,
    // The other half of `audit`'s declaration. A field that appears on one command and is absent on
    // the other is read as "this build does not emit it" — the declaration only distinguishes if
    // both commands make it.
    verdictComputed: true,
    status: verdict.status,
    score: verdict.score,
    /**
     * Which aggregation rules produced that number.
     *
     * A score is only meaningful against other scores computed the same way, and this framework has
     * now changed the way once. RiemannHypothesis reads 89 under version 1 and 88 under version 2,
     * from the same commit of the same repository, with no mathematics and no records altered: five
     * rules that were never about that project left the denominator. A reader comparing the two
     * numbers across the change sees a regression that did not happen.
     *
     * Recording the basis is the cheap half of the fix; the expensive half would be a migration
     * nobody can perform, since the old numbers were computed by code that no longer exists. So the
     * contract is narrow and honest: two scores are comparable when their `scoreBasis.version`
     * agrees, and are not otherwise.
     */
    scoreBasis: {
      id: "project-subject-required",
      version: 2,
      since: "1.2.0",
      note:
        "Version 2 scores required-level rules whose subject is this project, and counts a rule " +
        "whose required evidence could not be read as an unearnable denominator entry. Version 1 " +
        "scored every evaluated required rule, including rules about the framework and about the " +
        "validator's own run. Scores from different versions are not comparable.",
    },
    summary: verdict.summary,
    assurance: verdict.assurance,
    denominator: verdict.denominator,
    // Empty on every other verdict. Non-empty exactly when status is BLOCKED_BY_INVARIANT, so a
    // consumer can branch on the array without parsing the status string.
    blockedBy: verdict.blockedBy ?? [],
    // §0h in the envelope. A failure that is the framework's or this run's own is reported here and
    // nowhere in the adopter's status or score — visible, and not charged to the wrong repository.
    foreignFailures: verdict.foreignFailures ?? [],
    // Framework maturity, sitting outside the verdict on purpose. It says how much of the framework
    // has been turned into rules — never how compliant this project is.
    frameworkCoverage: frameworkCoverage ?? null,
    auditedAt,
    results: verdict.results,
  };
}
