/**
 * The claims ledger: parser, status vocabulary, and the dependency graph (Standards 2 and 3).
 *
 * This module is the substrate every mathematical detector reads. It holds three things that must
 * exist in exactly one place:
 *
 *   1. STATUS_RANK — the epistemic ordering. The source's list of fifteen claim kinds is preserved
 *      verbatim as the vocabulary, but it is NOT a strength ordering, and a detector that treated it
 *      as one would reason confidently and wrongly. The ranking is declared here, once, and defended
 *      in standards/02-claim-hierarchy.md R3.
 *   2. parseLedger — the grammar. Deliberately a small line-oriented parser rather than a Markdown
 *      engine: the format exists to be read by people and checked by a machine, and a parser that
 *      accepted anything a Markdown renderer accepts would silently skip malformed entries.
 *   3. findReferences — the adjacency convention of Standard 3 R3, which is the false-positive
 *      control for silent-promotion detection. A bare identifier asserts nothing. Citing a claim is
 *      not promoting it, and a rule that fired on every mention would be turned off within a week.
 *
 * No third-party dependencies, matching the rest of scripts/.
 */

/**
 * The fifteen canonical statuses and their epistemic rank (Standard 2 R3).
 *
 * Rank 6 and above is *proved rank*: the claim asserts a proof exists. The step from 5 to 6 is the
 * line this whole framework is built around.
 *
 * Three entries deliberately depart from the source's listed order, because that order is a list of
 * kinds and not a ladder: EQUIVALENT_REFORMULATION is lateral movement, COMPUTATIONAL_VERIFICATION
 * is an evidence state, and UNRESOLVED_CLAIM sits outside the ladder entirely at −1, so that any
 * proof-status reference to it counts as a promotion. CONDITIONAL_THEOREM is listed after THEOREM in
 * the source and ranks below it here, because undischarged hypotheses make it weaker.
 */
export const STATUS_RANK = new Map([
  ["UNRESOLVED_CLAIM", -1],
  ["DEFINITION", 0],
  ["OBSERVATION", 1],
  ["NUMERICAL_OBSERVATION", 1],
  ["HEURISTIC", 2],
  ["HYPOTHESIS", 3],
  ["CONJECTURE", 4],
  ["EQUIVALENT_REFORMULATION", 4],
  ["COMPUTATIONAL_VERIFICATION", 5],
  ["LEMMA", 6],
  ["PROPOSITION", 6],
  ["CONDITIONAL_THEOREM", 7],
  ["THEOREM", 8],
  ["FORMALIZED_THEOREM", 9],
  ["MACHINE_CHECKED_PROOF", 10],
]);

/** The lowest rank at which a claim asserts that a proof exists. */
export const PROVED_RANK = 6;

export const rankOf = (status) => STATUS_RANK.get(status) ?? null;
export const isProvedRank = (status) => (STATUS_RANK.get(status) ?? -99) >= PROVED_RANK;

/**
 * Does this entry cap the status of everything that depends on it?
 *
 * Rank alone is the wrong test, and the compliant fixture is what showed it: a DEFINITION sits at
 * rank 0, so a naive rank comparison reported that every lemma resting on a definition was
 * over-claimed. A definition is not a weak claim — it is a different kind of thing, stipulated
 * rather than proved, and it cannot be promoted at all (Standard 2 R3).
 *
 * What a definition CAN carry is an unmet obligation: that the object it names exists, is unique, or
 * is well-defined. Those propagate exactly as an unproved lemma would (Standard 4 R2), so a
 * definition with an open obligation does cap, and one without does not.
 */
export function capsSupport(entry) {
  if (!entry || !entry.status) return false;
  const rank = STATUS_RANK.get(entry.status);
  if (rank === undefined) return false;
  if (entry.status === "DEFINITION") {
    return entry.obligations.some((o) => o.state === "open");
  }
  return rank < PROVED_RANK;
}

/**
 * Prose words that assert a status when they sit adjacent to a claim identifier (Standard 3 R3).
 *
 * `corollary` maps to THEOREM because a corollary asserts a proved result; nothing weaker is
 * conventionally called one. Words with no entry here — "result", "fact", "claim" — assert nothing,
 * which is the safe default.
 */
export const STATUS_WORDS = new Map([
  ["definition", "DEFINITION"],
  ["observation", "OBSERVATION"],
  ["heuristic", "HEURISTIC"],
  ["hypothesis", "HYPOTHESIS"],
  ["conjecture", "CONJECTURE"],
  ["lemma", "LEMMA"],
  ["proposition", "PROPOSITION"],
  ["corollary", "THEOREM"],
  ["theorem", "THEOREM"],
  ["machine-checked", "MACHINE_CHECKED_PROOF"],
  ["machine checked", "MACHINE_CHECKED_PROOF"],
  ["formally verified", "MACHINE_CHECKED_PROOF"],
]);

/**
 * The closed evidence-type vocabulary of Standard 19 R2, and the highest rank each supports alone.
 *
 * `citation` and `literature-search` are separate types, and keeping them separate matters. A
 * citation says "this result is established in the literature, and that is why my claim holds" — it
 * can carry a claim to proved rank. A literature search says "I looked for prior work and here is
 * what I found", which is required before promotion and proves nothing about the claim itself.
 * Collapsing them, as an earlier draft of this catalog did, let a recorded search satisfy the
 * proof-evidence test: a THEOREM whose only support was a computation stopped being reported the
 * moment its author noted that they had searched MathSciNet.
 */
export const EVIDENCE_CEILING = new Map([
  ["proof", 8],
  ["formal", 10],
  ["citation", 10],
  ["counterexample-search", 4],
  ["literature-search", 4],
  ["proof-sketch", 4],
  ["computational", 5],
  ["numerical", 1],
  ["symbolic", 2],
  ["heuristic", 2],
]);

/** Evidence types that record a prior-work check (Standard 14 R1), whether or not they prove anything. */
export const LITERATURE_EVIDENCE = new Set(["citation", "literature-search"]);

/** Evidence types that can carry a claim to proved rank on their own. */
export const PROOF_EVIDENCE = new Set(["proof", "formal", "citation"]);

export const CLAIM_ID = /^CLM-\d{4}$/;
const CLAIM_ID_ANYWHERE = /CLM-\d{4}/g;
const EXTERNAL_ID = /^external:[a-z0-9][a-z0-9-]*$/;

const FIELD_LINE = /^\s*[-*]\s+\*\*([A-Za-z ]+):\*\*\s*(.*)$/;
const SUB_BULLET = /^\s{2,}[-*]\s+(.*)$/;
const HEADING = /^##\s+(CLM-\d{4})\s*(?:[—–-]\s*(.*))?$/;
const REFERENCES_HEADING = /^##\s+References\s*$/i;

const stripTicks = (s) => s.replace(/`/g, "").trim();
const isNone = (s) => /^none$/i.test(s.trim());

/**
 * Blank out HTML comments, preserving line numbering.
 *
 * Use versus mention, in the ledger parser. A commented-out entry — which is exactly what the
 * shipped template uses to show the fields that only appear at higher ranks — is an example, not a
 * claim. Parsing it registers claims the project never made, and the audit then reports findings
 * about mathematics that does not exist. This was found by running the audit against a freshly
 * scaffolded project: it reported three claims, all of them from the template's own examples.
 *
 * Lines are replaced rather than removed so that every reported line number still points at the
 * right line of the real file.
 */
function blankHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (block) => "\n".repeat((block.match(/\n/g) ?? []).length));
}

/** Split a comma- or semicolon-separated identifier list, tolerating `none` and trailing prose. */
function idList(raw) {
  if (!raw || isNone(raw)) return [];
  return raw
    .split(/[,;]/)
    .map((part) => stripTicks(part).replace(/\(.*$/, "").trim())
    .filter(Boolean);
}

/**
 * Parse a claims ledger.
 *
 * Returns { entries, malformed, references, order }. `malformed` is a first-class result rather than
 * an exception: a ledger with one broken entry should still be checkable, and silently dropping the
 * broken one would remove a claim from scrutiny while leaving it in the document.
 */
export function parseLedger(text) {
  const entries = new Map();
  const malformed = [];
  const references = new Map();
  const order = [];

  const lines = blankHtmlComments(text.replace(/\r/g, "")).split("\n");
  let current = null;
  let currentField = null;
  let inReferences = false;
  let inFence = false;

  const finish = () => {
    if (!current) return;
    if (!current.status) {
      malformed.push({ id: current.id, line: current.line, reason: "no Status field" });
    } else if (!STATUS_RANK.has(current.status)) {
      // Kept in `entries` so the vocabulary detector can report the actual value it found.
      entries.set(current.id, current);
      order.push(current.id);
      current = null;
      return;
    }
    if (!current.statement) {
      malformed.push({ id: current.id, line: current.line, reason: "no Statement field" });
    }
    entries.set(current.id, current);
    order.push(current.id);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (REFERENCES_HEADING.test(line)) {
      finish();
      inReferences = true;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      finish();
      inReferences = false;
      const id = heading[1];
      if (entries.has(id)) {
        malformed.push({ id, line: i + 1, reason: "duplicate claim identifier" });
      }
      current = {
        id,
        title: (heading[2] ?? "").trim(),
        line: i + 1,
        status: null,
        statement: "",
        domain: "",
        quantifiers: "",
        assumptions: [],
        depends: [],
        obligations: [],
        equivalences: [],
        evidence: [],
        formal: null,
        history: [],
        fields: new Set(),
      };
      currentField = null;
      continue;
    }

    if (inReferences) {
      const ref = /^\s*[-*]\s+(external:[a-z0-9-]+)\s*[—–-]\s*(.+)$/i.exec(line);
      if (ref) references.set(ref[1].toLowerCase(), ref[2].trim());
      continue;
    }

    if (!current) continue;

    const field = FIELD_LINE.exec(line);
    if (field) {
      const name = field[1].trim().toLowerCase();
      const value = field[2].trim();
      current.fields.add(name);
      currentField = name;
      applyField(current, name, value);
      continue;
    }

    const sub = SUB_BULLET.exec(line);
    if (sub && currentField) {
      applySubBullet(current, currentField, sub[1].trim(), i + 1);
      continue;
    }

    // A non-empty, non-bullet line ends the field block; anything after it is prose.
    if (line.trim() !== "" && !/^\s*[-*]/.test(line)) currentField = null;
  }
  finish();

  return { entries, malformed, references, order };
}

function applyField(entry, name, value) {
  switch (name) {
    case "status":
      entry.status = stripTicks(value).toUpperCase();
      break;
    case "statement":
      entry.statement = value;
      break;
    case "domain":
      entry.domain = value;
      break;
    case "quantifiers":
      entry.quantifiers = value;
      break;
    case "assumptions":
      entry.assumptions = idList(value);
      break;
    case "depends":
      entry.depends = idList(value);
      break;
    case "obligations":
      if (!isNone(value) && value) entry.obligations.push(parseObligation(value, null));
      break;
    case "equivalences":
      if (!isNone(value) && value) entry.equivalences.push(parseEquivalence(value));
      break;
    case "evidence":
      if (!isNone(value) && value) entry.evidence.push(parseEvidence(value));
      break;
    case "formal":
      if (!isNone(value) && value) entry.formal = { ...(entry.formal ?? {}), raw: value };
      break;
    case "history":
      if (!isNone(value) && value) entry.history.push(parseHistory(value));
      break;
    default:
      break;
  }
}

function applySubBullet(entry, field, textLine, lineNo) {
  switch (field) {
    case "obligations":
      entry.obligations.push(parseObligation(textLine, lineNo));
      break;
    case "equivalences":
      entry.equivalences.push(parseEquivalence(textLine));
      break;
    case "evidence":
      entry.evidence.push(parseEvidence(textLine));
      break;
    case "formal": {
      const kv = /^([A-Za-z]+)\s*:\s*(.+)$/.exec(textLine);
      if (kv) {
        entry.formal = entry.formal ?? {};
        entry.formal[kv[1].toLowerCase()] = stripTicks(kv[2]);
      }
      break;
    }
    case "history":
      entry.history.push(parseHistory(textLine));
      break;
    default:
      break;
  }
}

/** `OB-1 base case n = 2 — discharged (proofs/x.md#base)` or `OB-4 degenerate case — open`. */
function parseObligation(textLine, lineNo) {
  const state = /\bdischarged\b/i.test(textLine) ? "discharged" : "open";
  const id = /^(OB-\d+)/i.exec(textLine)?.[1] ?? null;
  const dischargedBy = /\(([^)]+)\)\s*$/.exec(textLine)?.[1] ?? null;
  return { id, text: textLine, state, dischargedBy: state === "discharged" ? stripTicks(dischargedBy ?? "") : null, line: lineNo };
}

/** `CLM-0021 (iff, proved by CLM-0023)` or `CLM-0030 (implies — the converse is open)`. */
function parseEquivalence(textLine) {
  const target = CLAIM_ID_ANYWHERE.exec(textLine)?.[0] ?? null;
  CLAIM_ID_ANYWHERE.lastIndex = 0;
  const direction = /\biff\b/i.test(textLine)
    ? "iff"
    : /\bimplied[- ]by\b/i.test(textLine)
      ? "implied-by"
      : /\bimplies\b/i.test(textLine)
        ? "implies"
        : null;
  const proved = /proved by\s+(CLM-\d{4})/i.exec(textLine)?.[1] ?? null;
  return { target, direction, provedBy: proved, text: textLine };
}

/** `proof — `proofs/clm-0001.md`` or `numerical — verified for n <= 10^9 via `scripts/check.py``. */
function parseEvidence(textLine) {
  const split = /^([A-Za-z-]+)\s*[—–-]\s*(.*)$/.exec(textLine);
  const type = (split ? split[1] : textLine.split(/\s/)[0]).toLowerCase();
  const detail = split ? split[2].trim() : "";
  const artifacts = [...detail.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter(isPathShaped);
  return { type, detail, artifacts, text: textLine };
}

/**
 * A backticked token is treated as a repository path when it looks like one. Anything with
 * whitespace, a URL scheme, or a drive letter is a citation or an inline expression, not a path —
 * resolving those against the filesystem would manufacture findings out of prose.
 */
export function isPathShaped(token) {
  if (!token || /\s/.test(token)) return false;
  if (/^[a-z]+:\/\//i.test(token) || /^[A-Za-z]:[\\/]/.test(token) || token.startsWith("~")) return false;
  return token.includes("/") || /\.[A-Za-z0-9]{1,6}(#|$)/.test(token);
}

/** `2026-08-05 OBSERVATION → THEOREM (proof written, proofs/x.md)` or `2026-08-01 → OBSERVATION (...)`. */
function parseHistory(textLine) {
  const date = /^(\d{4}-\d{2}-\d{2})/.exec(textLine)?.[1] ?? null;
  const arrow = /([A-Z_]+)?\s*(?:→|->)\s*([A-Z_]+)/.exec(textLine);
  const paren = /\(([^)]*)\)\s*$/.exec(textLine)?.[1] ?? "";
  const evidence = paren.split(",").slice(1).join(",").trim() || null;
  return {
    date,
    from: arrow?.[1] ?? null,
    to: arrow?.[2] ?? null,
    reason: paren.split(",")[0]?.trim() || null,
    evidence,
    text: textLine,
  };
}

/**
 * Every identifier a claim rests on: proved inputs (Depends) and hypotheses (Assumptions) together.
 *
 * Both fields are walked because the closure has to include both — a proved lemma that itself
 * assumes a conjecture transmits that conjecture upward (Standard 8 R2).
 */
export function edgesOf(entry) {
  return [...(entry?.depends ?? []), ...(entry?.assumptions ?? [])];
}

/**
 * Transitive closure of a claim's dependencies. The starting id is included only when it is
 * genuinely reachable from itself, which is exactly the circularity case.
 */
export function dependencyClosure(entries, id) {
  const seen = new Set();
  const stack = [...edgesOf(entries.get(id))];
  while (stack.length > 0) {
    const next = stack.pop();
    if (seen.has(next)) continue;
    seen.add(next);
    const entry = entries.get(next);
    if (entry) stack.push(...edgesOf(entry));
  }
  return seen;
}

/**
 * Every dependency cycle, each reported as the path that closes it.
 *
 * Reporting the whole path rather than the claim that happened to be noticed first matters: the
 * interesting cycles are not adjacent, and "CLM-0010 is circular" without the route through
 * CLM-0011 and CLM-0014 gives a reader nothing to act on.
 */
export function findCycles(entries) {
  const cycles = [];
  const state = new Map();
  const path = [];

  const visit = (id) => {
    const mark = state.get(id);
    if (mark === "done") return;
    if (mark === "open") {
      const start = path.indexOf(id);
      if (start !== -1) cycles.push([...path.slice(start), id]);
      return;
    }
    state.set(id, "open");
    path.push(id);
    for (const next of edgesOf(entries.get(id))) {
      if (entries.has(next)) visit(next);
    }
    path.pop();
    state.set(id, "done");
  };

  for (const id of entries.keys()) visit(id);

  // The same cycle is reachable from every node on it; keep one representative of each.
  const seen = new Set();
  return cycles.filter((cycle) => {
    const key = [...cycle.slice(0, -1)].sort().join(">");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Identifiers in a Depends/Assumptions field that resolve to neither a ledger entry nor a reference. */
export function danglingEdges(entries, references) {
  const dangling = [];
  for (const entry of entries.values()) {
    for (const edge of edgesOf(entry)) {
      if (entries.has(edge)) continue;
      if (EXTERNAL_ID.test(edge) && references.has(edge.toLowerCase())) continue;
      dangling.push({ from: entry.id, edge, line: entry.line, external: edge.startsWith("external:") });
    }
  }
  return dangling;
}

/**
 * Claim references in a document, with the status the surrounding prose asserts (Standard 3 R3).
 *
 * A status word adjacent to the identifier asserts that status; a bare identifier asserts nothing.
 * That asymmetry is the entire false-positive control, and widening it — treating any nearby word as
 * an assertion — would make the silent-promotion rule unusable.
 *
 * Fenced code blocks are skipped: an example ledger entry inside a fence in the documentation is a
 * mention, not an assertion, and this is the same use-versus-mention discipline the source scanners
 * apply to comments.
 */
export function findReferences(text) {
  const out = [];
  const words = [...STATUS_WORDS.keys()].sort((a, b) => b.length - a.length).join("|");
  const before = new RegExp(`(?:^|[^A-Za-z])(${words})\\b[\\s*_:()\\[\\]—–-]*$`, "i");
  const after = new RegExp(`^[\\s]*[(\\[]?\\s*(${words})\\b`, "i");

  const lines = blankHtmlComments(text.replace(/\r/g, "")).split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    for (const match of line.matchAll(CLAIM_ID_ANYWHERE)) {
      const start = match.index ?? 0;
      const lead = line.slice(Math.max(0, start - 48), start);
      const trail = line.slice(start + match[0].length, start + match[0].length + 48);
      const word = before.exec(lead)?.[1] ?? after.exec(trail)?.[1] ?? null;
      out.push({
        id: match[0],
        assertedStatus: word ? STATUS_WORDS.get(word.toLowerCase()) ?? null : null,
        line: i + 1,
        text: line.trim(),
      });
    }
  }
  return out;
}

/** True when a statement quantifies over an unbounded domain, as far as informal text can show. */
export function looksUniversal(entry) {
  const text = `${entry.statement} ${entry.quantifiers}`;
  return /\b(for all|for every|for each|for any|all sufficiently large|infinitely many|universal)\b/i.test(text) || /∀/.test(text);
}

/** True when evidence text describes a bounded, finite check. */
export function looksBounded(detail) {
  return /\b(n\s*(?:<=|≤|<)\s*\d|up to\s+\d|first\s+\d+\s+\w+|10\^\d|10\*\*\d|exhaustive(?:ly)?\s+(?:up to|to)\b|range\s+\d)/i.test(detail);
}
