/**
 * FE-25 (#56): split-subject applicability, semantic layer.
 *
 * Design: design/fe25-split-subject-applicability.md ("Validation rules, per invariant" and
 * "Attestation-to-portion binding"). The schema cannot express the conditional rules (the vendored
 * evaluator has no oneOf / if-then), so they live here, in ONE module that `standards validate`,
 * `standards policy` and the compliance engine all call. Sharing it is what makes the three
 * commands give the same answer for the same file.
 *
 * Invalid declarations are configuration errors (exit 2). Incomplete classification is not an
 * error: it is the reported state `applicability-incomplete`, decided in the engine.
 *
 * What this does not do: judge whether a portion's basis is true, or whether a cited reference
 * supports its statement. It checks form and coverage, nothing more.
 */

import { resolve } from "./catalog.mjs";
import { hasReference } from "./attempts.mjs";

/** The scope statement carried with every split rule's result. */
export const SPLIT_SCOPE = "evaluated-portion-only";

export class ApplicabilityError extends Error {
  constructor(errors) {
    super(
      `invalid applicability declaration(s): ${errors.map((e) => `${e.id} at ${e.path}`).join("; ")}`,
    );
    this.name = "ApplicabilityError";
    this.errors = errors;
  }
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const subjectsOf = (entries) =>
  (Array.isArray(entries) ? entries : []).map((e) => (isObject(e) ? e.subject : undefined)).filter((s) => typeof s === "string");

/**
 * @param {object|null} document  a schema-valid project policy
 * @param {object|null} catalog   from loadCatalog(); without it a split cannot be shown to be on a
 *                                manual-review rule, so every split is refused (fail closed)
 * @param {{ splitOnly?: boolean }} [options]  `splitOnly` skips the status-declaration checks
 *        (`neither`, `missing-reason`) and reports only what involves a split. The engine uses it so
 *        that hand-built policies in unit tests are not newly rejected for unrelated reasons.
 * @returns {{ id: string, path: string, message: string }[]}
 */
export function validateApplicability(document, catalog, { splitOnly = false } = {}) {
  const errors = [];
  const add = (id, path, message) => errors.push({ id, path, message });
  const declarations = isObject(document?.applicability) ? document.applicability : {};

  for (const [ruleId, decl] of Object.entries(declarations)) {
    if (!isObject(decl)) continue; // the schema reports a non-object
    const at = `applicability[${ruleId}]`;
    const hasStatus = decl.status !== undefined;
    const hasMode = decl.mode !== undefined;

    if (hasStatus && hasMode) {
      add("applicability.status-and-mode", at, `'${ruleId}' carries both status and mode; a declaration is one or the other`);
    } else if (!hasStatus && !hasMode && !splitOnly) {
      add("applicability.neither", at, `'${ruleId}' carries neither status nor mode`);
    }
    if (hasStatus && !splitOnly && (typeof decl.reason !== "string" || decl.reason.trim() === "")) {
      add("applicability.missing-reason", `${at}.reason`, `'${ruleId}' declares a status with no reason`);
    }
    if (!hasMode) continue;

    // Invariant 1: both sets and the declared subject are present and non-empty.
    for (const key of ["declaredSubject", "appliesTo", "structurallyImpossibleFor"]) {
      if (!Array.isArray(decl[key]) || decl[key].length === 0) {
        add("applicability.split-incomplete", `${at}.${key}`, `'${ruleId}' is a split-subject declaration with no ${key}`);
      }
    }
    // revisitWhen is REQUIRED on a split (stricter than not-applicable, where it is a finding).
    if (typeof decl.revisitWhen !== "string" || decl.revisitWhen.trim() === "") {
      add("applicability.split-missing-revisit", `${at}.revisitWhen`, `'${ruleId}' is a split-subject declaration with no revisitWhen`);
    }
    // A split is valid only on a manual-review rule, so a detected failure is never suppressed.
    const rule = catalog ? resolve(catalog, ruleId) : null;
    if (!rule || rule.validationType !== "manual-review") {
      add(
        "applicability.split-on-detectable-rule",
        at,
        `'${ruleId}' is ${rule ? `a ${rule.validationType} rule` : "not a rule in the catalog"}; split-subject applies only to manual-review rules`,
      );
    }

    // Invariants 2 to 4, per array.
    const declared = new Set(Array.isArray(decl.declaredSubject) ? decl.declaredSubject : []);
    const seenIn = { appliesTo: new Set(), structurallyImpossibleFor: new Set() };
    for (const key of ["appliesTo", "structurallyImpossibleFor"]) {
      const entries = Array.isArray(decl[key]) ? decl[key] : [];
      entries.forEach((entry, i) => {
        if (!isObject(entry)) return;
        const where = `${at}.${key}[${i}]`;
        const subject = entry.subject;
        if (typeof subject === "string") {
          if (seenIn[key].has(subject)) {
            add("applicability.split-duplicate", where, `subject '${subject}' is repeated within ${key}`);
          }
          seenIn[key].add(subject);
          if (declared.size > 0 && !declared.has(subject)) {
            add("applicability.unknown-subject", where, `subject '${subject}' is not in declaredSubject`);
          }
        }
        const reference = entry.basis?.reference;
        if (reference !== undefined && !hasReference(reference)) {
          add(
            "applicability.reference-malformed",
            `${where}.basis.reference`,
            `'${reference}' is not a reference (a path, URL or 'commit <sha>')`,
          );
        }
      });
    }
    for (const subject of seenIn.appliesTo) {
      if (seenIn.structurallyImpossibleFor.has(subject)) {
        add("applicability.split-overlap", at, `subject '${subject}' is in both appliesTo and structurallyImpossibleFor`);
      }
    }
  }

  // Attestation-to-portion binding.
  const attestations = isObject(document?.attestations) ? document.attestations : {};
  for (const [ruleId, attestation] of Object.entries(attestations)) {
    if (!isObject(attestation)) continue;
    const portions = attestation.reviewedAgainst?.portions;
    const decl = declarations[ruleId];
    const at = `attestations[${ruleId}].reviewedAgainst.portions`;
    if (isObject(decl) && decl.mode !== undefined) {
      if (!Array.isArray(portions) || portions.length === 0) {
        add("attestation.portions-required", at, `'${ruleId}' has a split-subject declaration, so its attestation must list the portions reviewed`);
        continue;
      }
      const evaluated = new Set(subjectsOf(decl.appliesTo));
      for (const portion of portions) {
        if (!evaluated.has(portion)) {
          add("attestation.portion-not-evaluated", at, `portion '${portion}' is not a member of appliesTo for '${ruleId}'`);
        }
      }
    } else if (portions !== undefined) {
      add("attestation.portions-on-unsplit-rule", at, `'${ruleId}' has no split-subject declaration, so its attestation must not list portions`);
    }
  }
  return errors;
}

/** A pinned adopter citation: `path@<40-hex sha>` with optional `:line` or `:line-line`. */
const PINNED = /@[0-9a-f]{40}(?::\d+(?:-\d+)?)?$/;

/**
 * Where does a basis reference stand? Reported, never an error (design choice 4).
 *
 *   `reference-unresolved`  a repository path that is not in the file set, or a pinned adopter
 *                           citation (`path@<sha>:lines`), which names a file of ANOTHER repository
 *                           at a commit and so is never a file of this one. Accepted.
 *   `resolved`              a repository path that is in the file set
 *   `not-a-path`            a URL or `commit <sha>`; not resolved here
 *   `unchecked`             no file set was supplied
 */
export function referenceState(reference, files) {
  if (reference === undefined) return { state: "none" };
  const text = String(reference).trim();
  if (/\bhttps?:\/\/\S+/i.test(text) || /\bcommit:?\s+[0-9a-f]{7,40}\b/i.test(text)) return { state: "not-a-path" };
  const token = text.split(/[\s,;]+/).map((t) => t.replace(/^[("'`]+|[)"'`.,;:]+$/g, "")).find((t) => t.includes("/") || /\.[A-Za-z0-9]{1,6}(#|$|@)/.test(t)) ?? text;
  if (PINNED.test(token)) return { state: "reference-unresolved", pinned: true };
  if (!files) return { state: "unchecked" };
  const file = token.split("#")[0];
  return files.has(file) ? { state: "resolved" } : { state: "reference-unresolved", pinned: false };
}

/**
 * The classification of one split declaration, as the engine and the renderer read it.
 * Assumes the declaration passed `validateApplicability`.
 */
export function classifySplit(decl, files) {
  const declared = Array.isArray(decl.declaredSubject) ? decl.declaredSubject : [];
  const applies = Array.isArray(decl.appliesTo) ? decl.appliesTo : [];
  const impossible = Array.isArray(decl.structurallyImpossibleFor) ? decl.structurallyImpossibleFor : [];
  const classified = new Set([...subjectsOf(applies), ...subjectsOf(impossible)]);
  const unclassified = declared.filter((s) => !classified.has(s));
  const describe = (side) => (entry) => {
    const ref = referenceState(entry.basis?.reference, files);
    return {
      subject: entry.subject,
      side,
      statement: entry.basis?.statement ?? null,
      reference: entry.basis?.reference ?? null,
      referenceState: ref.state,
      ...(ref.pinned ? { pinned: true } : {}),
    };
  };
  return {
    mode: "split-subject",
    covered: unclassified.length === 0,
    unclassified,
    evaluated: applies.map(describe("appliesTo")),
    structurallyImpossible: impossible.map(describe("structurallyImpossibleFor")),
    scope: SPLIT_SCOPE,
    revisitWhen: decl.revisitWhen ?? null,
  };
}
