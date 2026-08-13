/**
 * §0c — what counts as a stated approximation, and what counts as its bound, declared once.
 *
 * THE DEFECT THIS REPLACES. At v1.2.0 the recognition was two regex literals inside one detector:
 * an `approximate` trigger tested against the claim's statement, and a `bounded` suppressor tested
 * against the statement *plus* the evidence details. Two lists, authored separately, evaluated over
 * two different texts, with nothing holding either pair together. Both frozen field trials found it:
 *
 *   - `\bO\(` was a member of the trigger list, so an asymptotic statement was an approximation
 *     missing its bound — when the asymptotic notation IS the bound (RiemannHypothesis).
 *   - `\babout\b` matched the English preposition, so a statement that approximated nothing was an
 *     approximation; and `\bbound\b` did not match `bounds`, because the word boundary falls between
 *     `d` and `s`, so a statement that gave its bound in the plural was unsuppressed (PvsNP).
 *
 * THE MODEL. A marker is declared once, with what it *is*: what it asserts, and what it carries. A
 * finding requires that something asserts an approximation and that nothing carries the bound — and
 * because both halves are read from one table in one pass over one text, a marker that carries what
 * it triggers can never be the sole cause of a finding about it. That is the property; it is not a
 * fix to two regexes, and it holds for markers nobody has written yet.
 *
 * WHAT IS DELIBERATELY NOT HERE. No marker has a weight, and there is no ordering over markers. The
 * question this table answers is whether a form of evidence is *present in the text*, which is a
 * yes-or-no fact about language. How much that evidence is worth is Standard 19's question and is
 * answered by the capability declaration in `claims.mjs`, over a closed vocabulary rather than over
 * prose. The two were paired in the disposition and are kept apart deliberately: a recogniser over
 * English and a capability table over nine tokens are different mechanisms, and the object that
 * served both would be a union type wearing a model's name.
 */

/**
 * What discharges each assertion. One entry today; it is a map rather than a constant because the
 * closure check below is what makes a second one safe to add.
 */
export const OBLIGATION_OF = Object.freeze({ approximation: "bound" });

/**
 * A quantity, near enough to a marker to be the thing it qualifies.
 *
 * `about` is the marker this exists for: it is a mathematical approximation marker when it governs a
 * quantity and an ordinary English preposition otherwise, and no amount of tuning the word itself
 * distinguishes those. The window is short on purpose — "about the kernel, whose 10^9 entries…"
 * should not read as an approximation of the kernel.
 */
const QUANTITY = /^[\s~≈(]*(?:\d|10\s*[\^*]|one|two|three|ten|a hundred|a thousand|a million)/i;
const QUANTITY_WINDOW = 24;

/**
 * The declaration.
 *
 * `asserts` — this form states an approximation.
 * `carries` — this form states the obligation named. A marker may do both; the asymptotic one does.
 * `requiresQuantity` — this form is ambiguous in the surrounding natural language and counts only
 *   when it governs a quantity. A property of the marker, so it lives on the marker.
 */
export const APPROXIMATION_MARKERS = Object.freeze([
  {
    name: "asymptotic",
    pattern: /\b[OoΘΩo]\(|\bO\b(?=\s*\()/g,
    asserts: "approximation",
    carries: "bound",
    why: "Asymptotic notation states the size of the error it introduces. The O is the bound; " +
      "reading it as an approximation whose bound is missing is §0c exactly.",
  },
  {
    name: "approximately-equal",
    pattern: /≈|~=|≈/g,
    asserts: "approximation",
    carries: null,
    why: "States that two quantities are close and says nothing about how close.",
  },
  {
    name: "approximately",
    pattern: /\bapproximate(?:ly|d|s)?\b/gi,
    asserts: "approximation",
    carries: null,
    why: "The explicit English form. Unambiguous, so it needs no quantity context.",
  },
  {
    name: "about",
    // Case-insensitive, like every prose marker here. Dropping the flag while porting these from
    // the v1.2.0 literals cost one true positive — "About 10^9 zeros" stopped being an
    // approximation because the sentence began with it — which is the same class of defect as the
    // `bound`/`bounds` gap: a recogniser that does not match the forms its own language uses.
    pattern: /\babout\b/gi,
    asserts: "approximation",
    carries: null,
    requiresQuantity: true,
    why: "A preposition in English and an approximation marker in mathematics. PvsNP's recorded " +
      "false positive was 'a statement about the kernel'.",
  },
  {
    name: "truncation",
    pattern: /\btruncat\w*/gi,
    asserts: "approximation",
    carries: null,
    why: "A truncated series approximates the series; the tail is the error it does not state.",
  },
  {
    name: "stated-bound",
    pattern: /\b(?:error|bound\w*|interval\w*|tolerance\w*|precision|accurac\w+)\b|\bwithin\b|\bat most\b|\bno more than\b/gi,
    asserts: null,
    carries: "bound",
    why: "The English forms that state an error bound. Stems rather than exact words: the v1.2.0 " +
      "suppressor accepted 'bound' and not 'bounds', which is a recogniser failing to match the " +
      "word forms of the language it is written in.",
  },
]);

/**
 * Does this marker count, here?
 *
 * Separated from the table so the quantity rule is applied in one place. A marker that needed its
 * context checked at each call site would be the private-list defect in another costume.
 */
function occurs(marker, text) {
  const re = new RegExp(marker.pattern.source, marker.pattern.flags.includes("g") ? marker.pattern.flags : `${marker.pattern.flags}g`);
  let match;
  while ((match = re.exec(text)) !== null) {
    if (!marker.requiresQuantity) return true;
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + QUANTITY_WINDOW);
    if (QUANTITY.test(after)) return true;
  }
  return false;
}

/**
 * What this text asserts and what it carries — both from the same table, in one pass, over the same
 * string. The single-text rule is not incidental: at v1.2.0 the trigger read the statement and the
 * suppressor read the statement plus the evidence, so a marker could assert over one text and be
 * unable to discharge over the other. Callers pass everything a reader would consider, once.
 */
export function assessApproximation(text) {
  const asserts = new Set();
  const carries = new Set();
  for (const marker of APPROXIMATION_MARKERS) {
    if (!occurs(marker, text)) continue;
    if (marker.asserts) asserts.add(marker.asserts);
    if (marker.carries) carries.add(marker.carries);
  }
  return { asserts, carries };
}

/** The assertions this text makes whose obligation nothing in it discharges. */
export function undischargedAssertions(text) {
  const { asserts, carries } = assessApproximation(text);
  return [...asserts].filter((a) => !carries.has(OBLIGATION_OF[a]));
}

/**
 * The table's own invariants, checked at load rather than in a test, so a marker added by someone
 * who never opens the test file still cannot break them.
 *
 * Closure is the one that matters: every obligation a marker claims to carry must be the obligation
 * of something a marker asserts. Without it, a marker could carry `bound` while the assertion side
 * called the same thing `error-bound`, and the discharge would silently never apply — which is the
 * two-vocabularies defect regenerating inside the fix.
 */
export function assertMarkerTableSound(markers = APPROXIMATION_MARKERS) {
  const obligations = new Set(Object.values(OBLIGATION_OF));
  for (const marker of markers) {
    if (!marker.asserts && !marker.carries) {
      throw new Error(`marker '${marker.name}' neither asserts nor carries anything`);
    }
    if (marker.asserts && !(marker.asserts in OBLIGATION_OF)) {
      throw new Error(`marker '${marker.name}' asserts '${marker.asserts}', which has no declared obligation`);
    }
    if (marker.carries && !obligations.has(marker.carries)) {
      throw new Error(`marker '${marker.name}' carries '${marker.carries}', which is nobody's obligation`);
    }
    if (!marker.why || marker.why.length < 20) {
      throw new Error(`marker '${marker.name}' records no reason; a recogniser nobody can argue with is one nobody will correct`);
    }
  }
  for (const assertion of Object.keys(OBLIGATION_OF)) {
    const discharger = markers.some((m) => m.carries === OBLIGATION_OF[assertion]);
    if (!discharger) {
      throw new Error(`nothing can discharge '${OBLIGATION_OF[assertion]}', so every '${assertion}' is a finding`);
    }
  }
  return true;
}

assertMarkerTableSound();
