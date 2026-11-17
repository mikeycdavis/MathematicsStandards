/**
 * FE-30 (#61): adopter verification gates, recorded and reported, never credited.
 *
 * Design: design/fe61-adopter-verification-gates.md (frozen), Option A.
 *
 * THE FRAMEWORK RUNS NOTHING AND NAMES NOTHING. A gate is whatever the project calls it. This module
 * reads the project's own record of a check it says it ran, classifies the record, and reports it.
 * A test fails if this file ever names an adopter's gate.
 *
 * CREDIT-INERT BY CONSTRUCTION. Nothing in this module produces a hit, a score, a disposition or an
 * assurance count. `evidence.adopter-gates-recorded` has a surface that always resolves empty, so the
 * engine reports it `skipped / not-evaluated / no-subject` for every input. What the records feed is
 * the surface `reason` and the `audit` report.
 *
 * FAIL CLOSED. A record that is incomplete or inconsistent is `invalid`. It is never reported as
 * `passed` and never as `failed`; it is counted on its own, and a declared failure is also counted
 * under `declaredFailed`, so a recorded failure is not hidden by being malformed.
 *
 * What this does not establish: that a gate was run, that a cited reference exists (a reference is
 * checked for its shape, not resolved), that a subject commit is the one audited, or that a result is
 * correct.
 */

import { hasReference } from "./attempts.mjs";

/** The three labels, exactly. `framework-executed` is reachable only through classifyGates' 2nd argument. */
export const GATE_LABELS = Object.freeze(["adopter-asserted", "unexecuted", "framework-executed"]);

/** The four reported results, exactly. `valid` is a separate boolean. */
export const GATE_RESULTS = Object.freeze(["passed", "failed", "not-recorded", "invalid"]);

const PLACEHOLDER_VERSIONS = new Set(["latest", "unknown", "none", "n/a", "tbd", "head", "main", "master", "current", "x", "?"]);

const PLACEHOLDER_WORDS = new Set([
  "n", "a", "na", "and", "or", "yes", "no", "none", "tbd", "todo", "unknown", "pass", "fail", "ok", "true", "false", "-", "?",
]);

export const GATE_LEGEND =
  "Adopter-asserted means the project recorded it. The framework did not run it and gives it no assurance credit.";

/**
 * Is this value a reference to a record of a run: an http(s) URL, `commit <sha>`, or a path to a file?
 *
 * A wrapper over FE-28's `hasReference`, applied in addition to it and not instead: `hasReference`
 * accepts any whitespace-separated token that looks path-shaped, so `n/a` and `yes/no` pass it. A gate
 * record is stricter. The whole value must be one reference. The check is of shape only; nothing is
 * resolved, so `notes.txt` is accepted though no such file need exist.
 */
export function isGateReference(value) {
  const text = String(value ?? "").trim();
  if (text === "" || !hasReference(text)) return false;
  if (/^https?:\/\/\S+$/i.test(text)) return true;
  if (/^commit:? [0-9a-f]{7,40}$/i.test(text)) return true;
  if (/\s/.test(text)) return false;
  const token = text.replace(/[.,;:!]+$/, "");
  const segments = token.split("/").filter((s) => s !== "");
  if (segments.length === 0) return false;
  if (!/\.[A-Za-z][A-Za-z0-9]{0,7}$/.test(segments[segments.length - 1])) return false;
  return !segments.every((s) => PLACEHOLDER_WORDS.has(s.toLowerCase()));
}

const foldId = (id) => String(id ?? "").trim().toLowerCase();
const present = (v) => v !== undefined && v !== null && String(v).trim() !== "";

function isRealDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

const EXECUTION_KEYS = ["state", "by", "at", "subject", "command", "evidence"];
const RESULT_KEYS = ["outcome", "evidence"];
const pick = (source, keys) => Object.fromEntries(keys.filter((k) => source?.[k] !== undefined).map((k) => [k, source[k]]));

function checkGate(gate, duplicated) {
  const errors = [];
  const execution = gate.execution ?? {};
  const result = gate.result ?? {};
  const state = execution.state;
  const outcome = result.outcome;

  if (duplicated) errors.push(`id '${String(gate.id).trim()}' is used by more than one gate`);

  const version = String(gate.version ?? "").trim();
  if (version === "") errors.push("version is empty");
  else if (PLACEHOLDER_VERSIONS.has(version.toLowerCase())) errors.push(`version '${version}' names no version`);

  if (state === "unrun") {
    for (const field of ["by", "at", "subject", "command", "evidence"]) {
      if (present(execution[field])) errors.push(`an unrun gate records execution.${field}`);
    }
    if (outcome !== "not-recorded") errors.push(`an unrun gate records outcome '${outcome}'; it must be not-recorded`);
    if (present(result.evidence)) errors.push("an unrun gate records result.evidence");
  } else if (state === "executed") {
    for (const field of ["by", "at", "subject", "command"]) {
      if (!present(execution[field])) errors.push(`an executed gate records no ${field}`);
    }
    if (present(execution.at) && !isRealDate(execution.at)) errors.push(`at '${execution.at}' is not a real calendar date`);
    if (present(execution.subject) && !/^commit:? [0-9a-f]{7,40}$/.test(String(execution.subject))) {
      errors.push(`subject '${execution.subject}' is not 'commit <sha>'`);
    }
    if (!present(execution.evidence)) errors.push("an executed gate records no execution evidence");
    else if (!isGateReference(execution.evidence)) {
      errors.push(`execution evidence '${execution.evidence}' is not a path, a URL or 'commit <sha>'`);
    }
    if (outcome !== "passed" && outcome !== "failed") {
      errors.push(`an executed gate records outcome '${outcome}'; it must be passed or failed`);
    }
    if (!present(result.evidence)) errors.push(`an executed gate with outcome '${outcome}' records no result evidence`);
    else if (!isGateReference(result.evidence)) {
      errors.push(`result evidence '${result.evidence}' is not a path, a URL or 'commit <sha>'`);
    }
  } else {
    errors.push(`state '${state}' is not one of unrun, executed`);
  }
  return errors;
}

/**
 * Classify every recorded gate. `frameworkRuns` maps a folded gate id to a record of a run the
 * framework itself made. The framework makes none, so no production caller passes it; it exists so the
 * `framework-executed` label has exactly one way in, and it is the only one.
 */
export function classifyGates(gates, frameworkRuns = new Map()) {
  const list = Array.isArray(gates) ? gates : [];
  const counts = new Map();
  for (const g of list) counts.set(foldId(g?.id), (counts.get(foldId(g?.id)) ?? 0) + 1);

  return list.map((raw) => {
    const gate = raw !== null && typeof raw === "object" ? raw : {};
    const errors = checkGate(gate, counts.get(foldId(gate.id)) > 1);
    const state = gate.execution?.state;
    const valid = errors.length === 0;
    const label = frameworkRuns.has(foldId(gate.id))
      ? "framework-executed"
      : state === "executed"
        ? "adopter-asserted"
        : "unexecuted";
    const outcome = gate.result?.outcome;
    const reported = !valid ? "invalid" : state === "unrun" ? "not-recorded" : outcome;
    const execution = pick(gate.execution, EXECUTION_KEYS);
    const result = pick(gate.result, RESULT_KEYS);
    if (state === "unrun" && valid) {
      execution.state = "unrun";
      result.outcome = "not-recorded";
    }
    return {
      id: gate.id === undefined ? null : String(gate.id),
      version: gate.version === undefined ? null : String(gate.version),
      reported,
      valid,
      label,
      declared: { state: state === undefined ? null : String(state), outcome: outcome === undefined ? null : String(outcome) },
      execution,
      result,
      errors,
    };
  });
}

/** The `audit --json` shape: how many the framework ran (never any here), the counts, the records. */
export function buildGateReport(classified) {
  const count = (fn) => classified.filter(fn).length;
  return {
    executedByFramework: count((g) => g.label === "framework-executed"),
    summary: {
      passed: count((g) => g.reported === "passed"),
      failed: count((g) => g.reported === "failed"),
      notRecorded: count((g) => g.reported === "not-recorded"),
      invalid: count((g) => g.reported === "invalid"),
      declaredFailed: count((g) => g.declared.outcome === "failed"),
    },
    gates: classified,
  };
}

/** The human render, as lines, beside the research-attempt block. */
export function renderGateLines(report) {
  const n = report.gates.length;
  if (n === 0) return ["  Adopter-run gates: none referenced"];
  const ran = report.executedByFramework;
  const lines = [
    `  Adopter-run gates: ${n} referenced; the framework executed ${ran === 0 ? "none of them" : `${ran} of them`}`,
  ];
  for (const g of report.gates) {
    const name = `${g.id}@${g.version}`;
    if (g.reported === "invalid") {
      const declared = g.declared.outcome === null ? "" : `, declared ${g.declared.outcome}`;
      lines.push(`    ${name}: invalid${declared} (${g.label}; ${g.errors.join("; ")})`);
    } else if (g.reported === "not-recorded") {
      lines.push(`    ${name}: not run (${g.label})`);
    } else {
      const e = g.execution;
      lines.push(`    ${name}: ${g.reported} (${g.label}; ran ${e.at} by ${e.by} against ${e.subject})`);
    }
  }
  lines.push(`  ${GATE_LEGEND}`);
  return lines;
}

/** The surface `reason`: counts only, null when nothing is recorded. */
export function gateSurfaceReason(gates) {
  const report = buildGateReport(classifyGates(gates));
  const n = report.gates.length;
  if (n === 0) return null;
  const { failed, invalid, declaredFailed } = report.summary;
  const hidden = declaredFailed - failed;
  const note = hidden > 0 ? `, ${hidden} of the invalid declared failed` : "";
  return `${n} adopter-run gate(s) recorded (${failed} failed, ${invalid} invalid${note}); adopter-asserted records are not framework evidence and earn no credit`;
}
