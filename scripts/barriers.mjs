/**
 * FE-29 (#60): barrier profiles, as the `## Known Barriers` section of problem.md.
 *
 * Design: design/fe60-barrier-profiles.md (frozen).
 *
 * A barrier profile is DESCRIPTIVE EVIDENCE. It records what a result says, under which conditions,
 * what it rules out and what it does not, and where it is established. Nothing here derives, returns
 * or stores a verdict from a profile, and no field says an approach is prohibited, forbidden, closed
 * or allowed because of a barrier. The framework fixes no barrier names and reads no mathematics: it
 * checks structure only.
 *
 * Fail closed. A section that cannot be read as profiles or as an explicit `none` is reported. A
 * blank is never read as `none`.
 */
import { hasReference } from "./attempts.mjs";

export const BARRIERS_HEADING = "## Known Barriers";

/** The five field labels, lower-case. Order carries no meaning. */
export const FIELD_KEYS = ["statement", "scope", "rules out", "does not rule out", "evidence"];

// Labels that exist only to be refused (C3). `Status` is here because Terminated Approaches uses it.
const REFUSED_LABELS = new Set(["verdict", "prohibition", "prohibited", "forbidden", "banned", "status", "decision"]);

const KEY_OF = new Map([
  ["statement", "statement"],
  ["scope", "scope"],
  ["rules out", "rulesOut"],
  ["does not rule out", "doesNotRuleOut"],
  ["evidence", "evidence"],
]);
const EXCLUSION = new Set(["rules out", "does not rule out"]);

const NONE_LINE = /^none(?:\s+recorded)?\.?$/i;
const LIST_MARKER = /^(?:[-*+]|\d+[.)])\s+/;
const LABELLED = /^([^:\n]{1,40}?):(?:\s+(.*)|\s*)$/;
const NEVER_A_VERDICT = "a barrier profile is descriptive evidence and never a prohibition verdict";

/** The lines under the heading, up to the next `## ` heading. Null when there is no heading. */
function sectionLines(text) {
  const lines = String(text).replace(/\r/g, "").split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === BARRIERS_HEADING.toLowerCase());
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body;
}

const labelOf = (text) => {
  const found = LABELLED.exec(text);
  return found ? { label: found[1].trim().toLowerCase(), written: found[1].trim(), value: (found[2] ?? "").trim() } : null;
};

const isNone = (value) => NONE_LINE.test(value.trim());

function emptyProfile(name) {
  return { name, statement: "", scope: "", rulesOut: [], doesNotRuleOut: [], evidence: "", problems: [] };
}

/** Parse the lines of one profile (those after its `###` heading). */
function parseProfile(name, lines) {
  const profile = emptyProfile(name);
  const problems = profile.problems;
  const seen = new Set();
  const raw = new Map(); // label -> { inline, continuation: string[], items: string[] }
  let current = null; // a raw entry, SINK to swallow lines of a refused or unknown field, or null

  const SINK = { sink: true };
  for (const line of lines) {
    if (line.trim() === "") continue; // blank lines inside a value are allowed
    const atColumnZero = !/^\s/.test(line);
    const isItem = LIST_MARKER.test(line.trim()) && (!atColumnZero || current !== null);

    if (atColumnZero && !LIST_MARKER.test(line)) {
      const lab = labelOf(line);
      if (lab && FIELD_KEYS.includes(lab.label)) {
        if (seen.has(lab.label)) {
          problems.push(`repeats the field '${lab.label}:'`);
          current = SINK;
        } else {
          seen.add(lab.label);
          current = { inline: lab.value, continuation: [], items: [] };
          raw.set(lab.label, current);
        }
        continue;
      }
      if (lab && REFUSED_LABELS.has(lab.label)) {
        problems.push(`'${lab.written}:' is a verdict label; ${NEVER_A_VERDICT}. Record what it rules out and what it does not.`);
        current = SINK;
        continue;
      }
      if (lab) {
        problems.push(`unknown field '${lab.label}:'; a profile has ${FIELD_KEYS.map((k) => `'${k}:'`).join(", ")}`);
        current = SINK;
        continue;
      }
      problems.push(`text outside any field: '${line.trim().slice(0, 60)}'`);
      current = SINK;
      continue;
    }

    // An indented line or a list item: a continuation of the current field.
    if (current === null) {
      problems.push(`text outside any field: '${line.trim().slice(0, 60)}'`);
      current = SINK;
      continue;
    }
    const stripped = line.trim().replace(LIST_MARKER, "");
    const lab = labelOf(stripped);
    if (lab && (FIELD_KEYS.includes(lab.label) || REFUSED_LABELS.has(lab.label))) {
      problems.push(`'${lab.written}:' is indented or bulleted; a field label must start at column 0`);
      continue;
    }
    if (current.sink) continue;
    if (isItem) current.items.push(stripped);
    else if (current.items.length > 0) current.items[current.items.length - 1] += ` ${stripped}`;
    else current.continuation.push(stripped);
  }

  for (const label of FIELD_KEYS) {
    const entry = raw.get(label);
    const key = KEY_OF.get(label);
    const inline = entry?.inline ?? "";
    const body = [inline, ...(entry?.continuation ?? [])].filter((s) => s !== "").join(" ");
    const items = entry?.items ?? [];

    if (!entry || (body === "" && items.length === 0)) {
      problems.push(`missing field '${label}:'`);
      continue;
    }

    if (EXCLUSION.has(label)) {
      if (items.length === 0 && isNone(body)) continue; // a deliberate none: no items
      if (isNone(inline) && items.length > 0) {
        problems.push(`'${label}:' none contradicts the items that follow`);
        profile[key] = items;
        continue;
      }
      profile[key] = [...(body === "" ? [] : [body]), ...items];
      continue;
    }

    const value = [body, ...items].filter((s) => s !== "").join(" ");
    profile[key] = value;
    if (label === "evidence") {
      if (!hasReference(value)) problems.push("evidence states no reference (a URL, a path, or 'commit <sha>')");
    } else if (isNone(value)) {
      problems.push(`'${label}:' cannot be none`);
    }
  }
  return profile;
}

/**
 * @param {string} problemText the whole of a problem.md
 * @returns {{ status: "profiles"|"none"|"prose"|"absent"|"empty", profiles: object[], problems: string[] }}
 *   `problems` is empty exactly when the section is valid. It holds the section's own problems and
 *   each profile's, the latter prefixed with the barrier's name. An absent or empty section is
 *   reported here, and the audit leaves those two to `problems.barriers-recorded`.
 */
export function parseBarriers(problemText) {
  const body = sectionLines(problemText);
  if (body === null) {
    return { status: "absent", profiles: [], problems: [`no ${BARRIERS_HEADING} section`] };
  }
  const nonBlank = body.filter((l) => l.trim() !== "");
  if (nonBlank.length === 0) {
    return {
      status: "empty",
      profiles: [],
      problems: [`${BARRIERS_HEADING} is empty; 'none' written deliberately is an answer, a blank is not`],
    };
  }

  const heading = (l) => /^###\s+\S/.test(l);
  const first = body.findIndex(heading);
  if (first === -1) {
    if (nonBlank.length === 1 && isNone(nonBlank[0])) return { status: "none", profiles: [], problems: [] };
    return {
      status: "prose",
      profiles: [],
      problems: [
        "is prose with no '### <barrier>' profile and not an explicit 'none' (a lone line 'none' or 'none recorded')",
      ],
    };
  }

  const problems = [];
  if (body.slice(0, first).some((l) => l.trim() !== "")) {
    problems.push("text before the first profile; nothing but blank lines may precede the first '### <barrier>' heading");
  }

  const profiles = [];
  for (let i = first; i < body.length; ) {
    let end = i + 1;
    while (end < body.length && !heading(body[end])) end++;
    profiles.push(parseProfile(body[i].replace(/^###\s+/, "").trim(), body.slice(i + 1, end)));
    i = end;
  }

  const names = new Map();
  for (const p of profiles) {
    const key = p.name.toLowerCase();
    names.set(key, (names.get(key) ?? 0) + 1);
  }
  for (const p of profiles) {
    if (names.get(p.name.toLowerCase()) > 1) p.problems.push(`duplicate barrier name '${p.name}' (names are compared case-insensitively)`);
    for (const message of p.problems) problems.push(`barrier '${p.name}' ${message}`);
  }
  return { status: "profiles", profiles, problems };
}
