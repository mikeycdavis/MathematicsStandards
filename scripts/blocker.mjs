/**
 * FE-27 (#58): the programme's current blocker, as a section of problem.md.
 *
 * Design: design/fe27-fe28-blocker-and-attempt-gates.md, "Implementation clarifications".
 *
 * WHAT THIS DOES NOT DO, ON PURPOSE. It never reads order and never counts to one. A blocker is a
 * point or a set; RH's frontier is a point because its dependency structure is a chain, PvsNP's is a
 * set because its structure is an antichain, and the framework may not assume either (the
 * first-unproved-bridge falsification, design/v1.1-disposition.md). The only form it rejects is a line
 * carrying the label `First unproved bridge`, which is the rejected proposal written down, and the
 * rejection is by that label and by nothing about cardinality or position.
 *
 * Absence fails closed: no section, an empty section, or a body that is neither a list nor an explicit
 * `none` is a problem. An absent section is never read as `none`.
 */

export const BLOCKER_HEADING = "## Current Blocker";

/** The label that marks the rejected first-unproved-bridge form, after normalisation. */
export const REJECTED_LABEL = "first unproved bridge";

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])(?:\s+(.*))?$/;

/** Body text under the blocker heading, up to the next `## ` heading. Null when there is no heading. */
function blockerBody(text) {
  const lines = String(text).replace(/\r/g, "").split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === BLOCKER_HEADING.toLowerCase());
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body;
}

/** The label of a line (text before the first colon), normalised, or null if there is no colon. */
function labelOf(line) {
  const stripped = line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").replace(/[*`]/g, "");
  const colon = stripped.indexOf(":");
  if (colon === -1) return null;
  return stripped.slice(0, colon).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * @param {string} problemText the whole of a problem.md
 * @returns {{ status: "point"|"set"|"none"|"absent"|"empty"|"malformed", points: string[], rejected: string[], problems: string[] }}
 *   `problems` is empty exactly when the section is valid. `rejected` holds the marker lines.
 */
export function parseBlocker(problemText) {
  const body = blockerBody(problemText);
  if (body === null) {
    return {
      status: "absent",
      points: [],
      rejected: [],
      problems: [`no ${BLOCKER_HEADING} section; absence is not read as 'none' — write the blocker, or 'none' deliberately`],
    };
  }

  const nonBlank = body.filter((l) => l.trim() !== "");
  const rejected = nonBlank.filter((l) => labelOf(l) === REJECTED_LABEL).map((l) => l.trim());
  const problems = rejected.map(
    (l) =>
      `"${l}" is the rejected first-unproved-bridge form: it imposes an order and a single element. ` +
      `Name the blocker as a point or a set instead.`,
  );

  if (nonBlank.length === 0) {
    return {
      status: "empty",
      points: [],
      rejected,
      problems: [`${BLOCKER_HEADING} is empty; 'none' written deliberately is an answer, a blank is not`],
    };
  }

  const items = nonBlank.filter((l) => LIST_ITEM.test(l));
  if (items.length === 0) {
    if (/^none\b/i.test(nonBlank[0].trim())) return { status: "none", points: [], rejected, problems };
    return {
      status: "malformed",
      points: [],
      rejected,
      problems: [
        ...problems,
        `${BLOCKER_HEADING} is neither a list of points nor an explicit 'none'; name each point as a list item`,
      ],
    };
  }

  const points = [];
  const seen = new Set();
  for (const line of items) {
    const text = (LIST_ITEM.exec(line)[1] ?? "").trim();
    if (text === "") {
      problems.push(`${BLOCKER_HEADING} has an empty list item`);
      continue;
    }
    const key = text.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(key)) problems.push(`${BLOCKER_HEADING} names "${text}" more than once`);
    seen.add(key);
    points.push(text);
  }
  return { status: points.length > 1 ? "set" : "point", points, rejected, problems };
}
