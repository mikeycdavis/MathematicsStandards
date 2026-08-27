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
    // Not `state === "open"`, because `unrecognised` was `open` before the parser stopped guessing,
    // and narrowing this to recognised-open would quietly stop capping a definition whose obligation
    // the grammar cannot read. The honest test is "not known to be discharged": an obligation whose
    // state nobody established has not been met, and support propagation is the wrong place to give
    // it the benefit of the doubt. The uncertainty is reported where it belongs, by
    // proof.complete-with-open-obligations, which distinguishes the two.
    return entry.obligations.some((o) => o.state !== "discharged");
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

/**
 * §0d — what an evidence type is worth, declared once, for every rule that asks.
 *
 * THE DEFECT THIS REPLACES. `PROOF_EVIDENCE` used to be a hand-written set beside this comment, and
 * `detectCounterexampleSearch` re-decided the same question with an inline array of its own. They
 * disagreed in both directions: `citation` carried a claim to proved rank here and answered nothing
 * there, so RiemannHypothesis's theorem — published, with a proof, in 2005 — was asked to search for
 * counterexamples; and `computational` answered the search question there while being no proof here,
 * which is correct and was correct by accident, in a list that did not know this one existed.
 *
 * A capability is a question a rule asks of a type, not a rank. Ranks already exist, in
 * EVIDENCE_CEILING, and they answer "how far up the ladder can this carry a claim" — a different
 * question from "does this discharge that obligation", which is why one cannot be derived from the
 * other. `counterexample-search` discharges the search obligation completely and carries nothing.
 *
 * Detectors keep their own domain questions. What they may not keep is a private opinion about what
 * a declared type means; they ask here.
 */
export const EVIDENCE_CAPABILITIES = new Map([
  ["proof", ["establishes-proof", "discharges-counterexample-search"]],
  ["formal", ["establishes-proof", "discharges-counterexample-search"]],
  // Records prior work AND proves: a citation to a published proof is both the literature check and
  // the proof. Standard 14 R1 wants the first; Standard 7 wants the second; one token does both and
  // splitting it would make an adopter cite the same paper twice.
  ["citation", ["establishes-proof", "discharges-counterexample-search", "records-prior-work"]],
  ["literature-search", ["records-prior-work"]],
  // Answers the search question exactly, and nothing else. This is the type whose whole meaning is
  // one capability, and the reason capabilities are not derivable from EVIDENCE_CEILING's ranks.
  ["counterexample-search", ["discharges-counterexample-search"]],
  // A scan that found no counterexample is a counterexample search under another name. It proves
  // nothing beyond its range, which is what `bounded-range-only` records.
  ["computational", ["discharges-counterexample-search", "is-computation", "bounded-range-only"]],
  ["numerical", ["is-computation", "bounded-range-only"]],
  ["symbolic", []],
  ["proof-sketch", []],
  ["heuristic", []],
]);

/** Does this declared evidence type answer this question? The only way a detector may ask. */
export const evidenceCan = (type, capability) =>
  (EVIDENCE_CAPABILITIES.get(type) ?? []).includes(capability);

/** Every declared type that answers this question. */
export const evidenceTypesThatCan = (capability) =>
  new Set([...EVIDENCE_CAPABILITIES].filter(([, caps]) => caps.includes(capability)).map(([type]) => type));

/**
 * Evidence types that record a prior-work check (Standard 14 R1), whether or not they prove anything.
 * A view, not a second source: the moment this is written out by hand again it can disagree.
 */
export const LITERATURE_EVIDENCE = evidenceTypesThatCan("records-prior-work");

/** Evidence types that can carry a claim to proved rank on their own. A view, for the same reason. */
export const PROOF_EVIDENCE = evidenceTypesThatCan("establishes-proof");

/**
 * Does this entry carry a Formal block? The field is named `formal` and so is an evidence type and
 * so is an applicability regime; three vocabularies, one spelling. Encapsulated here so a reader —
 * and the contract test that forbids private evidence-type lists — can tell which one is meant.
 */
export const hasFormalBlock = (entry) => entry.fields.has("formal");

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
        // null rather than "" — absent and "declared as nothing in particular" are different, and
        // an adopter that declares no scale must not be told its claims are unassessed.
        relevance: null,
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
    // A1. Read, carried, and read by nothing that ranks. Both frozen adopters recorded this axis in
    // prose beside a status that could not express it — RiemannHypothesis's CLM-0009 is a
    // MACHINE_CHECKED_PROOF that is "correct, unconditional, irrelevant to RH"; PvsNP's CLM-0011 is
    // a MACHINE_CHECKED_PROOF that "constrains nothing about P/poly". Neither demoted the status to
    // say so, and this field exists so neither has to.
    case "relevance":
      entry.relevance = isNone(value) ? null : stripTicks(value);
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

/**
 * `OB-1 base case n = 2 — discharged (proofs/x.md#base)` or `OB-4 degenerate case — open`.
 *
 * Three states, and the third one is the point. This used to read
 *
 *     const state = /\bdischarged\b/i.test(textLine) ? "discharged" : "open";
 *
 * which gave every line the parser did not understand the semantic state `open` — and `open`
 * obligations on a proved-rank claim violate `proof.complete-with-open-obligations`, an invariant.
 * So an obligation written in a spelling the grammar does not cover produced an unwaivable verdict
 * about a proposition nobody had established. That is §0i, and it is §0b's defect reached through
 * the parser instead of through a default argument: in both, a value nobody chose was treated as
 * one somebody asserted.
 *
 * `unrecognised` is not a fourth kind of obligation. It is the parser declining to invent a state,
 * and it is deliberately not an evidence label: this layer reports what it read, and the detector
 * decides what that is worth. Keeping the evidence vocabulary out of the syntax layer is what stops
 * the two from drifting into a single fuzzy notion of confidence.
 */
function parseObligation(textLine, lineNo) {
  const discharged = /\bdischarged\b/i.test(textLine);
  const open = /\bopen\b/i.test(textLine);
  // Both words, or neither, is not a state — it is a line this grammar cannot read. Reporting the
  // ambiguity is cheap; guessing at it is what produced the defect.
  const state = discharged === open ? "unrecognised" : discharged ? "discharged" : "open";
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

/**
 * The containing file named by a locator, with any `#fragment` removed.
 *
 * FE-42. The ledger grammar of Standard 3 lets an adopter write `proofs/clm-0002.md#base` or
 * `formal/Squares.lean#sq_nonneg`, and four consumers each cut that at the `#` with their own copy
 * of `split("#")[0]`. Four copies of one rule is how the copies stop agreeing: a fifth site compared
 * `Formal.file` to the file set *without* cutting, so an anchored `file:` matched nothing and
 * vanished from `inspected.surfaces` — the ledger cited an artifact and the envelope reported it had
 * inspected none. Same locator, two spellings, opposite errors.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not resolve the fragment. Stripping it is the
 * published contract of `evidence.artifact-linked`, stated in the catalog since the first commit
 * that created it: the reference resolves "with any anchor suffix removed before resolution".
 * Whether an unresolvable anchor ought to fail is a real and open question — `scripts/pointers.mjs`
 * takes the opposite view for the pointers it handles — but answering it would amend a published
 * rule description, which is a release decision rather than a repair. This function exists to make
 * the four file-level consumers agree with each other and with what the catalog already promises.
 *
 * It is also NOT for the placeholder scanner (`formal.placeholder-in-chain`), whose contract is
 * intentionally different: Standard 16 R3 prohibits a placeholder "anywhere the target's proof
 * depends on", and since nothing here traces that chain, the containing file is the conservative
 * envelope. Narrowing it to the anchor would trade over-firing for missed violations on a rule that
 * gates BLOCKED_BY_INVARIANT.
 */
export function containingFile(locator) {
  if (typeof locator !== "string") return "";
  const hash = locator.indexOf("#");
  return (hash === -1 ? locator : locator.slice(0, hash)).trim();
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
