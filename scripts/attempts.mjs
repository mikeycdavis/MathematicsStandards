/**
 * FE-28 (#59): gates on a research attempt, orthogonal to any claim's status.
 *
 * Design: design/fe27-fe28-blocker-and-attempt-gates.md, "Implementation clarifications".
 *
 * THE FRAMEWORK FIXES NO CONTENT. There is no gate list in this file and there must not be one: the
 * two adopters' attempt-level checks replicate in role and not at all in content (the design record
 * names them), so a framework that named gates would be wrong for both. A gate is whatever name the
 * project gives it. What the framework fixes is the *state vocabulary* and what each state must be
 * able to show. A test fails if this file ever names an adopter's gate.
 *
 * FAIL CLOSED. A gate that is missing the evidence its state requires is `invalid`. It is never
 * reported as its declared state and never as `passed`, and `invalid` is not a kind of pass. An
 * attempt is "all passed" only when it has at least one gate and every gate is validly `passed`; an
 * attempt with no gates is reported as having none.
 *
 * What this does not establish: that a gate was actually run, that a cited reference exists (a
 * reference is checked for being a reference, not resolved), or that a verdict is correct.
 */

import { isPathShaped } from "./claims.mjs";

/** The four gate states, exactly. `executed` means it ran and no verdict has been recorded. */
export const GATE_STATES = Object.freeze(["unrun", "executed", "passed", "failed"]);

const FIELDS = new Map([
  ["state", "state"],
  ["execution evidence", "execution"],
  ["verdict evidence", "verdict"],
]);

/** Text under `## Gates`, up to the next `## ` heading, as lines. Empty when there is no section. */
function gatesSection(text) {
  const lines = String(text).replace(/\r/g, "").split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === "## gates");
  if (start === -1) return [];
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body;
}

/** Is this one token a path? A slash, or a short alphabetic extension of at least two letters. */
function isPathToken(token) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(token)) return false;
  if (!isPathShaped(token)) return false;
  if (token.includes("/")) return true;
  // No slash: a file name. An extension of one letter (`e.g`, `i.e`) or one starting with a digit
  // (`v1.2`) is prose, not a file.
  return /^[\w.-]+\.[A-Za-z][A-Za-z0-9]{1,5}(#.*)?$/.test(token);
}

/**
 * Does this field value state a reference — a URL, a path, or a commit — rather than only prose?
 *
 * A commit must be written `commit <sha>` or `commit: <sha>`. Bare hex is refused because ordinary
 * words (`defaced`, `decade`) are valid hexadecimal.
 */
export function hasReference(value) {
  const text = String(value ?? "").trim();
  if (text === "") return false;
  if (/\bhttps?:\/\/\S+/i.test(text)) return true;
  if (/\bcommit:?\s+[0-9a-f]{7,40}\b/i.test(text)) return true;
  return text
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^[("'`]+|[)"'`.,;:]+$/g, ""))
    .some((t) => t !== "" && isPathToken(t));
}

/** Evidence fields spelt `none` mean no evidence is claimed. */
const claimsEvidence = (value) => value !== undefined && !/^none\b\.?$/i.test(value.trim()) && value.trim() !== "";

function checkGate(gate) {
  const errors = [];
  const { state, execution, verdict } = gate;

  if (gate.repeated.length > 0) {
    errors.push(`repeats the field${gate.repeated.length > 1 ? "s" : ""} ${gate.repeated.join(", ")}`);
  }
  if (state === undefined) {
    errors.push(`has no State line; it must be one of ${GATE_STATES.join(", ")}`);
    return errors;
  }
  if (!GATE_STATES.includes(state)) {
    errors.push(`has State '${gate.rawState}', which is not one of ${GATE_STATES.join(", ")}`);
    return errors;
  }

  const execClaimed = claimsEvidence(execution);
  const verdictClaimed = claimsEvidence(verdict);

  if (state === "unrun") {
    if (execClaimed) errors.push("is unrun but carries execution evidence; an unrun gate has none");
    if (verdictClaimed) errors.push("is unrun but carries verdict evidence; an unrun gate has none");
    return errors;
  }

  if (!execClaimed) errors.push(`is ${state} with no execution evidence`);
  else if (!hasReference(execution)) {
    errors.push(`is ${state} and its execution evidence '${execution.trim()}' is not a reference (a path, URL or commit)`);
  }

  if (state === "executed") {
    if (verdictClaimed) {
      errors.push("is executed but carries verdict evidence; an executed gate has execution evidence only — record passed or failed");
    }
  } else if (!verdictClaimed) {
    errors.push(`is ${state} with no verdict evidence`);
  } else if (!hasReference(verdict)) {
    errors.push(`is ${state} and its verdict evidence '${verdict.trim()}' is not a reference (a path, URL or commit)`);
  }
  return errors;
}

/**
 * @typedef {object} Gate
 * @property {string} name
 * @property {string|undefined} state    the declared state, lower-cased, when it is one of the four
 * @property {string} reported           the state this gate is reported as: its state, or `invalid`
 * @property {string[]} errors
 */

/**
 * Parse one attempt.md.
 *
 * @param {string} text
 * @returns {{ gates: Gate[], errors: string[] }} `errors` are attempt-level (duplicate names).
 */
export function parseAttempt(text) {
  const lines = gatesSection(text);
  const raw = [];
  let current = null;
  for (const line of lines) {
    const heading = /^###\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { name: heading[1], repeated: [] };
      raw.push(current);
      continue;
    }
    if (!current) continue;
    const field = /^\s*([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/.exec(line);
    const key = field && FIELDS.get(field[1].toLowerCase());
    if (!key) continue;
    if (key in current) {
      if (!current.repeated.includes(field[1])) current.repeated.push(field[1]);
      continue;
    }
    current[key] = field[2];
  }

  const gates = raw.map((g) => {
    const rawState = g.state?.trim();
    const state = rawState?.toLowerCase();
    const errors = checkGate({
      state,
      rawState,
      execution: g.execution,
      verdict: g.verdict,
      repeated: g.repeated,
    });
    return {
      name: g.name,
      state: GATE_STATES.includes(state) ? state : undefined,
      declared: rawState ?? null,
      reported: errors.length > 0 ? "invalid" : state,
      errors,
    };
  });

  const errors = [];
  const byName = new Map();
  for (const g of gates) {
    const key = g.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(g);
  }
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const message = `duplicate gate name: ${group.map((g) => `'${g.name}'`).join(", ")} — names must be unique within an attempt`;
    errors.push(message);
    // Fail closed: every gate sharing a name is unreliable, so none of them can be reported as passed.
    for (const g of group) {
      g.errors.push(`shares its name with another gate in this attempt`);
      g.reported = "invalid";
    }
  }
  return { gates, errors };
}

/**
 * The roll-up an audit prints. `all-passed` needs at least one gate, every gate validly passed, and no
 * attempt-level error. A zero-gate attempt is `no-gates`, and nothing else turns into a pass.
 */
export function rollup(attempt) {
  const counts = { unrun: 0, executed: 0, passed: 0, failed: 0, invalid: 0 };
  for (const g of attempt.gates) counts[g.reported] += 1;
  let status;
  if (attempt.gates.length === 0) status = "no-gates";
  else if (counts.passed === attempt.gates.length && attempt.errors.length === 0) status = "all-passed";
  else status = "not-all-passed";
  return { status, counts };
}
