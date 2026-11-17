# FE-33 design record: explicit point scope

**Status: DRAFT, owner-decided, awaiting freeze after fresh review.** The twelve choices below were decided by the owner on 2026-11-17 and this revision records them. They are decisions, not defaults awaiting a yes. One further owner choice (13, breadth of the contradiction vocabulary) was raised by review and is **open**; it does not change any of the twelve. The record is not frozen: a fresh review of this revision is required first, and implementation is not authorized until the owner then freezes it.
**Authority:** the owner-finalized criteria of 2026-11-16 (cmsg_01S962nAgzeF44i1MHDz4h1uY1YFLzdLBAfNL6C61NiNhq), recorded verbatim in `F:\GitHub Evidence\MathematicsStandards\evidence-64\decisions\finalized-criteria-2026-11-16.md`, the owner decision that this item is a design-only record, and the owner's twelve choice decisions of 2026-11-17 (section "Owner decisions"), which are authoritative over any earlier default in this record's history for an explicit structured `scope: point`. Issue: #64 (FE-33).
**Baseline:** `origin/main` at 11e6a14, VERSION 3.1.0. Main moved from 3475ec4 to 11e6a14 by one commit that only added `design/fe24-fe26-key-custody-packet.md`; `scripts/`, `rules/`, `standards/`, `templates/` and `test/` are byte-identical, so every code reference and baseline result below (taken at 3475ec4, re-run at 11e6a14 where marked) still holds. The gap check (`evidence-64/ac-gap-check/report.md`) was taken at 14562f6; every code location it cites was re-read at 3475ec4 and still holds (detector at `scripts/standards.mjs:1030-1038` and `1073-1077`, evidence parser at `scripts/claims.mjs:468-474`).

This record changes no code, schema, rule, fixture, `VERSION` or `CHANGELOG`. Everything below that looks like code, a fixture or a schema is a *proposal*, and the validation record shows each proposal was exercised in a scratch copy that is not committed.

## Criteria (verbatim, no others)

- **C1:** `computation.scope-declared` accepts an explicit structured `scope: point`.
- **C2:** Do not infer point scope by parsing the free-text `Quantifiers` field.
- **C3:** Missing scope remains a refusal condition.

No acceptance criterion is added here. Where this record has to decide something the criteria leave open, it is a numbered choice in "Owner decisions", each now decided by the owner (2026-11-17). Choice 7 adds a consistency check (`scope-contradiction`) that the 2026-11-16 draft had proposed to omit; it is a check on the declaration against explicit text in the same evidence item and is not an inference of point scope (see C2 below).

## How scope and `Quantifiers` are read today (re-verified at 3475ec4 and 11e6a14)

- `computation.scope-declared` is `required`, `error`, `document`, assurance `partial`, `introducedIn` 1.0.0 (`rules/computation.json`). It is evaluated by `detectComputationEvidence()` in `scripts/standards.mjs`.
- It looks at **evidence items**, not claims. For each ledger evidence item whose type can `is-computation` (`computational`, `numerical`), it passes only if the item's *detail text* both (a) states a range, meaning `looksBounded()` (`n <= 10^9`, `up to N`, `exhaustive up to`, ...) or one of the words `all`, `sample`, `random`, `exhaustive`, and (b) states an arithmetic word (`exact`, `integer`, `rational`, `interval`, `floating point`, `float`). Otherwise it adds `<ledger>:<claim line> <id> — <type> evidence states no range` (or `no arithmetic`).
- The finding is `INFERRED`, never `OBSERVED` (pinned by `test/audit.test.mjs` "heuristic findings are never labelled OBSERVED").
- The ledger has no structured scope field. `parseEvidence()` yields `{type, detail, artifacts, text}`. `applyField()` has cases for `status`, `statement`, `domain`, `quantifiers`, `relevance`, ... and a `default: break`, so an unknown `**Field:**` is silently ignored (probed: a `**Scope:** point` field changes nothing today).
- `Quantifiers` is stored as `entry.quantifiers`. It is read by `looksUniversal()` (`scripts/claims.mjs:659`, two call sites in `scripts/standards.mjs`, at 998 and 1115) and by `rigor.explicit-quantifiers` as a non-empty check (`scripts/standards.mjs:876-884`). **No scope logic reads it, and `computation.scope-declared` never does.** That is why C2 holds today by omission and why nothing yet pins it.
- "Refusal" today: `audit` reports an `error` finding (exit 0 by default, 1 under `--strict`). `validate` reports the rule as `status: failed`, `severity: error`, and a failed `required` rule prevents a compliant verdict. A scope-less fixture with no policy gives `validate` exit 2 / `NOT_EVALUATED` only because there is no policy, not because of this rule. The rule-level `failed` result is the refusal this record preserves.
- The case that motivated the item (RH CLM-0010, `design/v1.1-candidates.md` section 0f) is a certified interval-arithmetic bound at one parameter value. It states its arithmetic, has no range, and records the point only in `Quantifiers`.

## Proposed design

### Representation (owner-decided, Choices 1 and 2)

A **structured key at the head of a computational evidence item's detail**:

```markdown
- **Evidence:**
  - computational — scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
```

Grammar, exact (Choice 2: spelling, case, position and value are all required exactly):

- **Key.** The evidence item's detail (the text after the evidence type and the em/en dash or hyphen) is matched against `^scope:[ \t]*([^;,\s]*)[ \t]*(?:[;,]|$)`. The key is the lower-case literal `scope:` at character 0 of the detail. The first capture is the *scope value*. `Scope:`, `SCOPE:`, `scope :` and any other token before `scope:` are not the key. (Leading blanks are trimmed by `parseEvidence()` before the detail is stored, so blanks between the dash and `scope:` are harmless and are not "a token before".)
- **Value.** The only accepted value is the exact lower-case string `point`. `Point`, `points`, `range` and the empty value are not accepted (see "Classification of a detail" below for what is reported).
- **Terminator.** The value must be followed by optional blanks and then `;`, `,` or the end of the detail. `scope:point;` (no space after the colon) is accepted, because blanks after the colon are optional.
- **Position.** A `scope:` anywhere other than the start of the detail is prose and is never read.
- **Scope of the parser.** The sketched `parseEvidence()` is not type-gated: it yields `scope` for every evidence type, so `proof — scope: point; ...` parses with `scope === "point"`. Only the detector ignores it, because it reads `scope` only inside its computational/numerical branch (`evidenceCan(type, "is-computation")`). On any other evidence type the text is prose to every rule. (Gating the parser with `evidenceCan`, exported at `scripts/claims.mjs:170`, is an equivalent alternative; the tests hold either way.)
- Nothing about `Quantifiers`, `Statement` or `Domain` is consulted to decide scope. This is C2 (Choice 8 adds the mutation guard).

#### Classification of a detail (Choices 3 and 12)

Every computational/numerical evidence item falls into exactly one class, tested in this order, and yields at most **one** evidence line:

| Class | Condition | Result |
| --- | --- | --- |
| `none` | detail does not start with the literal `scope:` | ordinary path, byte-for-byte today's behaviour (`states no range`, `states no arithmetic`, or accepted). Wrong-case keys (`Scope:`) and `scope:` in the middle of the text land here. |
| `malformed` | detail starts with the literal `scope:` and the key regex above does **not** match (for example `scope: point at s0 = 1/2; ...`, `scope: point exact interval ...`, `scope: point. exact ...`; also NBSP or any non-blank, non-`;`/`,` text after the value) | one `scope-malformed` line (wording in "Report wording"). The range and arithmetic tests are not run, and there is no fallback to range wording elsewhere in the detail. |
| `unrecognised` | key regex matches and the value is not exactly `point` (`points`, `range`, `Point`, empty, and a value with punctuation stuck to it: `point.`, `point:x`, `point/x`) | one `scope-unrecognised` line. No fallback: a word such as `all` elsewhere in the detail does not rescue it. |
| `point` | key regex matches and value is `point` | range test satisfied by the declaration; then the contradiction check below; then the arithmetic test, which is unchanged. |

**Probed boundary cases** (the key regex run over each string; value is the first capture). The punctuation-suffix rows are the ones an earlier draft of this record mis-classified: the value class `[^;,\s]*` runs to the next `;`, `,`, whitespace or end of detail, so `point.` is a *value* (unrecognised, with the value quoted in the message), not a malformed key. That is consistent with Choice 12, which only asks that a failed grammar or bad value get a dedicated message and never collapse into `states no range`; both classes do.

| Detail begins | Class | Why |
| --- | --- | --- |
| `scope: point;` / `scope:point;` / `scope: point,` / `scope: point` (end of detail) | `point` | value `point`, then `;`, `,` or end |
| `scope: point ; x` and `scope: point\t; x` | `point` | blanks (space or tab) before the terminator are allowed |
| `scope: point;;` | `point` | the first `;` terminates; the rest is ordinary text |
| `scope: point.` and `scope: point.; x` | `unrecognised`, value `point.` | punctuation is part of the value |
| `scope: point:x`, `scope: point/x` | `unrecognised`, values `point:x`, `point/x` | same |
| `scope: point. exact ...`, `scope: point at s0 = 1/2; ...` | `malformed` | after the value come non-blank text before any terminator |
| `scope: point` + NBSP (U+00A0) + `; x` | `malformed` | the blank class is `[ \t]`; NBSP is not a blank, and `\s` in the value class stops the value at it |
| `scope: ; x`, `scope:` | `unrecognised`, empty value | |
| `scope: Point;` | `unrecognised`, value `Point` | |
| `Scope: point;`, `x scope: point;`, `scope : point;` | `none` | the key is not the literal `scope:` at character 0 (leading blanks never reach the classifier: `parseEvidence()` trims the detail) |

Each row is pinned by a unit-table test on the classifier (C1.7) so the grammar cannot drift silently.

For a `point` item the order is contradiction first, then arithmetic, so an item with both defects shows the contradiction and the arithmetic line appears once the contradiction is fixed. This keeps one line per item, as the existing rule already does for range-then-arithmetic.

#### Contradiction check: `scope-contradiction` (Choice 7)

Owner decision: a structured point declaration may control scope, but explicit contradictory language in the same evidence item must not be silently accepted. This is consistency checking of the declaration against the item's own words. It never supplies, infers or widens point scope from any text, and it never reads `Quantifiers`, `Statement` or `Domain`; C2 is untouched.

*Text scanned.* Only for items of class `point`: the detail with (a) the leading key and its terminator removed and (b) every backtick code span (`` `[^`]*` ``, a separate step from the key regex and from `parseEvidence()`'s artifact extraction) replaced by a single space, so two words cannot fuse across it (so a program path such as `` `computations/exhaustive_all.py` `` is not read as language).

*Detection.* The item has a `scope-contradiction` if the scanned text matches any of the case-insensitive patterns below. Patterns are tried **in the order listed, and the first pattern that matches anywhere in the text wins** (not the leftmost match overall); the text it matched is the one quoted (see "What `<matched text>` is" under Report wording).

*Core set (the four patterns of the owner's Choice 7 wording).*

1. `\bexhaustive(?:ly)?\b`
2. universal quantification: `\b(?:for all|for every|for each|for any|universal(?:ly)?)\b` or `∀`
3. `all` over a domain word: `\ball\s+(?:\w+\s+){0,2}?(?:n|m|k|s|x|t|integers?|naturals?|reals?|values?|parameters?|inputs?|cases?|primes?|numbers?)\b`
4. an explicit range: the regular expression inside `looksBounded()` as it exists today (`n <= 10^9`, `up to 100`, `first 1000 primes`, `10^9`, `10**9`, `range 1`, `exhaustive up to`).

**What is in and out relative to the owner's wording.** Choice 7 lists the triggers as "`exhaustive`, `all`, an explicit range, universal quantification". Read literally, a bare `all` is a trigger. This record narrows it, deliberately and visibly: `all` is a trigger only when followed, within two words, by a domain word from pattern 3's list (`all values`, `all integers`, `all sufficiently large n`). A bare `all` that is not followed by a domain word (`all arithmetic is exact`, `all endpoints are exact`) is **out**. The reason is that a bare `all` is ordinary English in arithmetic descriptions and would reject honest declarations; but note the baseline detector counts a bare `all` as a *range word* (`/\ball\b/`), so today `all arithmetic is exact` makes an item pass the range test, and that is why CLM-0004 below is accepted on the baseline. If the owner wants the literal reading (every `all` contradicts a point), that is a one-line change to pattern 3 and a larger set of false positives; it is flagged under Choice 13.

**Owner choice 13 (open, flagged for the owner; not one of the twelve decided choices and not yet decided): breadth of the contradiction patterns.** Choice 7 fixes the principle, not the exact vocabulary. Probing the core set against realistic wording (Part 3) shows these gaps, and the text above says the vocabulary reuses `looksUniversal`/`looksBounded`, which the core set only partly does (`looksUniversal` also has `all sufficiently large`, `infinitely many`, which pattern 2 does not):

- *False negatives of the core set* (a point declaration is silently accepted next to these): `all points in [0,1] checked`, `all intervals tested`, `all of the subintervals` (domain words `points`, `intervals`, `subintervals` are missing from pattern 3); `every s in [0,1]` (`every` is only caught after `for`); `for arbitrary n`; `infinitely many`; `across the full range`, `entire interval`; `random sample`, `sampled on a grid` (the baseline treats `random` and `sample` as range words, so a non-point sampling claim passes the range test today, and the contradiction check, as written, would not see them).
- *False positives of the core set*: `exhaustive subdivision of the interval` (a technique of interval arithmetic at one parameter value), `for each endpoint`, `all inputs are exact rationals`.

Options for the owner: **13a** keep the core set exactly (smallest change, matches the owner's four words; gaps above are accepted and listed in the limits); **13b (recommended)** add the extension patterns below, which close the false negatives with the same reasoning as the core set, still lexical, still reporting only; **13c** 13b plus the three carve-outs below, which remove the three false positives at the cost of three extra, more fragile exceptions. Each addition is probed in Part 3. The recommendation is 13b: the extension patterns catch statements that are plainly not a point, while the carve-outs are narrow exceptions that are themselves lexical guesses. Until the owner decides, the C7 tests and the extended fixture treat 13b and 13c as conditional rows (labelled below), and the core set is the specification that is not conditional.

*Extension set (13b).* Pattern 2 is widened and patterns 5 to 7 are added; the order of the existing four is unchanged.

- 2 (widened): `\b(?:for all|for every|for each|for any|for arbitrar(?:y|ily)|universal(?:ly)?|all sufficiently large|infinitely many)\b` or `∀`
- 3 (widened): the domain list gains `points?`, `intervals?`, `subintervals?`.
- 5. `every` over a domain word: `\bevery\s+(?:\w+\s+){0,2}?(?:n|m|k|s|x|t|integers?|naturals?|reals?|values?|parameters?|inputs?|cases?|primes?|numbers?|points?)\b`. (`every interval is certified` stays out: `interval` is deliberately not in this list, so a per-interval certification statement is not read as a range.)
- 6. a stated whole domain: `\b(?:entire|whole|full)\s+(?:range|interval|domain)\b` or `\bacross\s+(?:the\s+)?(?:\w+\s+)?(?:range|interval|domain)\b`
- 7. sampling: `\brandom\s+sampl\w*` or `\bsampl(?:ed|ing)\s+(?:on|over|across|from)\b`

*Carve-outs (13c, only if 13b or 13c is chosen).* (i) pattern 1 becomes `\bexhaustive(?:ly)?\b(?!\s+(?:subdivision|bisection)\b)`; (ii) in pattern 2, `for each` and `for any` become triggers only when followed within two words by a pattern 3 domain word (`for each n`, `for any parameter value` still match; `for each endpoint` does not), while `for all` and `for every` stay unconditional; (iii) pattern 3 does not match when the domain word is followed by `is|are` and then `exact`, `exactly`, `rational…` or `integer…` (`all values are exact rationals` and `all inputs are exact rationals` do not match; `all values checked` still does).

The patterns reuse the vocabulary the framework already uses (`looksUniversal`, `looksBounded`); what is new is pattern 3, the code-span stripping and, under 13b/13c, the extension patterns and carve-outs.

*Consequence.* A contradicted item is reported and is **not** treated as declaring a point. Status and exit effect: the finding belongs to `computation.scope-declared`, so the rule result is the same refusal as today: `audit` reports an `error` finding, label `INFERRED` (exit 0 by default, 1 under `--strict`); `validate` reports the rule `failed`, `severity: error`, `level: required`, and a failed required rule prevents a compliant verdict. No new rule id, no new severity, no new verdict (Choice 10).

*Message.* See "Report wording".

*False-positive limits (stated, accepted, and the way out).*

- The check is lexical. `scope: point; all values are exact rationals, certified at s0 = 1/2` matches pattern 3 (`all values`) although the sentence is about arithmetic, `up to 50 digits of precision` matches pattern 4, `exhaustive subdivision of the interval` matches pattern 1, `for each endpoint` matches pattern 2, and `all inputs are exact rationals` matches pattern 3 (all probed, Part 3; the first three are removable by the 13c carve-outs). The message quotes the matched text so the author can rephrase; there is no suppression syntax, by design (a suppression key would be a second unaudited declaration).
- Not triggers under the core set, and pinned as such by tests: a bare `all` not followed by a domain word (`all arithmetic is exact`), `every` outside `for every`, `random`, `sample`, a tolerance such as `10^-9` (the pattern needs a digit directly after `^`), and anything inside backticks. Under 13b, `every` followed by a domain word and `random sample`/`sampled on` become triggers; a bare `every`, a bare `random`/`sample` (`random seed 7`, `sample point`) and a bare `all` stay out under every option.
- Not detected (false negatives, accepted under 13a; most closed by 13b): `all points in [0,1] checked`, `all intervals tested`, `all of the subintervals`, `every s in [0,1]`, `for arbitrary n`, `infinitely many`, `across the full range`, `entire interval`, `random sample`, `sampled on a grid`; and, under every option, a contradiction expressed only in `Statement`, `Domain` or `Quantifiers`. A point declaration beside a universally quantified claim is a claim-level question for the existing universal-claim rules, not for this check. CLM-0003 in the fixtures pins that `Quantifiers` is not read.
- Prose in a language other than English is not scanned.

Implementation sketch (illustrative; the real change is made only after freeze, and the contradiction and malformed branches have not been exercised yet: see "Validation record"):

- `scripts/claims.mjs` `parseEvidence()` returns one more field, `scope`, an object `{ kind: "none" | "malformed" | "unrecognised" | "point", value, rest }` (or equivalent), where `rest` is the detail after the key.
- `detectComputationEvidence()` branches on `item.scope.kind` exactly as the classification table says. For `none` the existing code runs untouched.

### What `scope: point` does and does not do

| Item | Effect |
| --- | --- |
| Range requirement | Satisfied by the declaration. No range text is needed. |
| Arithmetic requirement | **Still required** (Choice 4). `scope: point` with no arithmetic word is reported (`states no arithmetic`). |
| Contradictory language in the item | **Reported** (Choice 7). `scope: point; exhaustive up to 10^9, exact` is a `scope-contradiction`, not accepted. |
| Program, environment, seed, outcome (R1 items) | Unchanged. The rule never checked them and still does not. |
| The point's value | **Not a new required field and not machine-checked** (Choice 5). The declaration says the scope is a point; it does not say which, and the detector cannot verify that the program ran there. R1 still asks the author to record what was checked, and the rule's assurance stays `partial`. |
| Claim status, rank, other rules | None. The key is read by this one detector only. |
| Existing ledgers | No change. A ledger with no `scope:` key produces the same findings as before (by construction: class `none`, so no existing code path changes). |

### Why per evidence item, not per claim or in policy (alternatives considered)

- **A. Evidence-item key (owner-decided, Choice 1).** The rule iterates evidence items, so the declaration sits on the thing it excuses. A claim with a range computation and a point computation declares the point only where it applies. Fail-closed: a claim-wide declaration could never be wider than its evidence.
- **B. Claim field `- **Scope:** point` beside `Quantifiers`.** Reuses the ledger's existing field syntax, and `applyField` already ignores it harmlessly (probed). But it is claim-wide: one declaration would excuse every computational item on the claim, including a range computation that omitted its range. Also a field with the same visual weight as `Quantifiers` invites the reading C2 prohibits.
- **C. Policy declaration, e.g. `mathematics.computationScope: { CLM-0010: point }`.** Keeps the ledger grammar untouched, but moves a per-evidence fact into a second file, needs a schema change (fragment validated below), and a policy edit becomes the way to satisfy a ledger rule. The framework has been moving the other way (`relevance` is a ledger field, not policy).

### Schema and template fragments

**No schema change under the decided option.** `schemas/project-policy.schema.json` describes the policy file only; the ledger is Markdown and has no schema. Fragments proposed for the files that do change:

1. `templates/claims-ledger.md`, in the Evidence example for a point result (added after the existing CLM-0001 example, or as a commented block like CLM-0002):

   ```markdown
   - **Evidence:**
     - computational — scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
   ```

   plus one sentence in the numbered notes: "A computation at a single parameter value is declared with `scope: point;` as the first words of its evidence entry; it still names its arithmetic, and the entry must not also claim a range or an exhaustive or universal check. Saying 'single point' in `Quantifiers` is not a declaration."
2. `standards/10-computational-and-numerical-evidence.md` R1, after the table: "A computation that checks one point rather than a range declares `scope: point` as the first words of the evidence entry's description. It still records the arithmetic, the program and the other items above, and it does not also state a range, an exhaustive check or a universal claim (such a contradiction is reported). The declaration is read from that exact form; descriptions elsewhere (including `Quantifiers`) are not read as declarations." Also `standards/03-claims-ledger.md` (the ledger grammar) gains the same sentence under Evidence.
3. `rules/computation.json` `computation.scope-declared`: `description` gains "or declares `scope: point`"; `remediation` gains "for a single-point computation, begin the evidence entry with `scope: point;` (exact spelling, then `;` or `,`), still state the arithmetic, and do not also state a range or an exhaustive or universal check"; `$assuranceNote` gains "A `scope: point` declaration is accepted as stated; the detector does not check that the program ran at one point." Then `npm run assurance` regenerates `docs/assurance-report.md` (checked by `assurance:check`).
4. `CHANGELOG.md` Unreleased entry that records the behaviour change and states that the eventual behavioural release is classified MAJOR (4.0.0) (Choice 6). No `VERSION` change, tag or release action is part of this item now.
5. `design/v1.1-candidates.md` section 0f gets a pointer note only.

Alternative C schema fragment, **validated** against the vendored evaluator (`scripts/jsonschema.mjs`) in the scratch copy, kept here only so the owner can compare; it is not chosen:

```json
"computationScope": {
  "description": "Claims whose computational evidence is deliberately a single point. Keys are claim ids; the only value is `point`.",
  "type": "object",
  "propertyNames": { "type": "string", "pattern": "^CLM-[0-9]{4}$" },
  "additionalProperties": { "type": "string", "enum": ["point"] }
}
```

placed under `properties.mathematics.properties`. Evaluator results: `CLM-0010: point` valid; `CLM-0010: points` rejected (`must be one of 'point'`); `clm-10: point` rejected (`'clm-10' is not a valid key here`).

### Report wording (Choice 11)

Preserved verbatim, because RH adoption evidence under `artifacts/adoption/` quotes the first and no test asserts either: the rule message, `label: INFERRED`, severity `error`, and the existing evidence lines `states no range` and `states no arithmetic`. Three new scope-specific evidence lines are added. Each is one line per offending item; `<loc>` is `<ledger>:<claim line> <id>`.

| Kind | Line |
| --- | --- |
| `scope-unrecognised` | `<loc> — <type> evidence declares scope "<value>"; the only structured scope value is "point"` (an empty value reads `declares scope ""`) |
| `scope-malformed` | `<loc> — <type> evidence begins with "scope:" but is not a valid scope declaration; the key is written "scope: point;" or "scope: point," as the first words, followed by the rest of the description` |
| `scope-contradiction` | `<loc> — <type> evidence declares scope: point but also states "<matched text>"; a point declaration cannot be combined with a range, exhaustive or universal claim (scope-contradiction)` |

**What `<matched text>` is (exact, so C7.1 can be written).** Let `m` be the match of the first matching pattern (first in pattern order, leftmost within that pattern) on the scanned text, which is the detail after the key with code spans replaced by a single space. The quoted text is:

1. `m[0]`, exactly as written in the detail (original case and spacing; the scanned text is not lower-cased);
2. then *token extension*: while the next character of the scanned text is a Unicode letter, a digit, `_`, `^` or `*`, append it; also append a `.` when it is directly followed by a digit (so `1.5` is kept whole). Extension never crosses whitespace, a comma, a semicolon or any other punctuation;
3. then cut to at most 40 characters (the first 40; no ellipsis).

Worked cases: `n <= 1000` matches `n <= 1` and extends to `n <= 1000`; `n <= 10^9` matches `n <= 1` and extends to `n <= 10^9`; `up to 100` quotes `up to 100`; `up to 50 digits of precision` quotes `up to 50`; `first 1000 primes` matches whole and quotes `first 1000 primes` (the match already ends on a letter; extension adds nothing); `10^9` quotes `10^9`; `10**9` quotes `10**9`; `exhaustive check` quotes `exhaustive`; `exhaustively` quotes `exhaustively`; `for all n` quotes `for all`; `∀ s` quotes `∀`; `universally valid` quotes `universally`; `all values checked` quotes `all values`; `all sufficiently large n` (core pattern 3) quotes `all sufficiently large n`. Extension only ever lengthens the numeric matches; the `\b`-closed word patterns are already whole tokens. C7.1 asserts these strings. The existing `states no arithmetic` line is also used for a `point` item without an arithmetic word, unchanged. Choice 12: a detail that begins with `scope:` and fails the grammar gets the `scope-malformed` line and never collapses into `states no range`. Remediation text (catalog) additionally advertises the new form to an author who hit `states no range`.

The rule's aggregate `message` ("N computational evidence entr(ies) do not record their scope ...") is kept; it still reads correctly for all kinds.

Expected output for the fixtures is given in "Validation record" and is **proposed, not yet exercised** except where stated.

## Criteria mapped to tests, fixtures and wording

Test file: `test/fe64-point-scope.test.mjs`, written before the change, using `HOME` and `run` from `test/helpers/cli.mjs` and the repository's `audit --dir=<fixture> --json` convention (as `test/fe28-attempt-gates.test.mjs` does). Layers: unit (`parseLedger` and the contradiction pattern table) and CLI integration. Unit tests assert the parse shape sketched above (`scope.kind` and `scope.value`); that shape is part of what the owner freezes.

**Labelling.** "Baseline" is the result on `origin/main` (3475ec4, re-run at 11e6a14 with identical results; the engine files are unchanged between them). Every baseline label below was re-checked by running the fixtures and strings of this record through `audit` in a scratch copy of main (see Validation record, Part 3).

- **RED-FIRST**: fails on the baseline. These drive the change and are written and committed failing before any code.
- **PASS-TODAY**: passes on the baseline and must keep passing. These are characterization pins. C2 and C3 describe behaviour that must not change, so most of their tests guard against regression and are not red-first. They are not evidence that the change works, and the owner should not read them as such.
- **MUTATION**: fails only under a deliberate mutation of the implementation (Choice 8).

### C1 — `computation.scope-declared` accepts an explicit structured `scope: point`

| # | Test | Baseline label |
| --- | --- | --- |
| C1.1 | `parseLedger` on `computational — scope: point; certified interval arithmetic ...` gives `scope.kind === "point"`. | RED-FIRST (no such field) |
| C1.2 | `audit` on `scope-point-declared` reports no `computation.scope-declared` line naming CLM-0001 to CLM-0005. | RED-FIRST as a whole: CLM-0001 and CLM-0003 are reported today (`states no range`); CLM-0002, CLM-0004 and CLM-0005 are already accepted today (CLM-0004 by the bare word `all`, CLM-0005 by `exhaustive` inside the path) and only stay accepted. |
| C1.3 | `validate` on `scope-point-declared` gives `computation.scope-declared` `status: passed`. | RED-FIRST |
| C1.4a | `scope-point-malformed` CLM-0020 (`scope: point;` with no arithmetic word) is reported. | PASS-TODAY (reported today as `states no range`) |
| C1.4b | The CLM-0020 line is exactly the preserved `states no arithmetic` string. | RED-FIRST (today it says `states no range`) |
| C1.5a | The ordinary range claim CLM-0002 is still accepted. | PASS-TODAY |
| C1.5b | An evidence item with no `scope:` key gives `scope.kind === "none"`. | RED-FIRST |
| C1.5c | `scope:point;` (no space) and `scope: point,` parse as kind `point`. | RED-FIRST |
| C1.6 | A non-computational item (`proof — scope: point; ...`) adds no finding and exempts nothing. Asserts the finding set, not the parse value (the parser may or may not be type-gated). | PASS-TODAY |
| C1.7 | Data-driven unit test on the classifier over the "Probed boundary cases" table: each listed detail gives the listed class and, for `unrecognised`, the listed value (`point.`, `point:x`, `point/x`, `Point`, empty), including `scope: point;;`, `scope: point ; x`, NBSP before `;` (malformed) and `scope: point at s0 = 1/2` (malformed). | RED-FIRST (no classifier) |

### C2 — Do not infer point scope by parsing the free-text `Quantifiers` field

| # | Test | Baseline label |
| --- | --- | --- |
| C2.1 | `scope-point-missing` CLM-0010: `Quantifiers: single point`, no structured scope, is reported with the preserved `states no range` line. | PASS-TODAY |
| C2.2 | CLM-0011: `Quantifiers: scope: point` (structured text in the wrong field) is reported with `states no range`. | PASS-TODAY |
| C2.3 | CLM-0012: the point stated only in `Statement` and `Domain` is reported. | PASS-TODAY |
| C2.4 | `scope-point-declared` CLM-0003: structured `scope: point` with `Quantifiers: universal over n in the stated range` is accepted, so `Quantifiers` cannot change the outcome in either direction (and the contradiction check does not read it). | RED-FIRST (the baseline rejects CLM-0003 for lack of a range) |
| C2.5 | Mutation guard (Choice 8, specified below): if `Quantifiers` begins supplying point scope, the suite fails. | MUTATION |
| C2.6 | The key must be first and exactly cased: `scope-point-malformed` CLM-0022 (`Scope: point;`) and CLM-0023 (`... (this is scope: point)`) are reported with the preserved `states no range` line, not with `scope-malformed` (class `none`). | PASS-TODAY |

**Mutation guard (Choice 8, owner-decided).** One new entry in the `MUTATIONS` list in `scripts/mutation-check.mjs`:

- `name`: `scope: let Quantifiers supply point scope`.
- `file`: `scripts/standards.mjs`; `from`: a literal anchor at the line in `detectComputationEvidence()` that decides the `point` class (chosen at implementation, literal including newlines, per the file's own rule on anchors); `to`: the same line with `|| /single point|scope:\s*point/i.test(entry.quantifiers)` added to the point condition.
- `gate`: `() => runTest("fe64-point-scope.test.mjs")`, which must exit non-zero. Under this mutation only C2.1 (`Quantifiers: single point`) and C2.2 (`Quantifiers: scope: point`) fail. C2.3 (CLM-0012) stays green, because CLM-0012 has `Quantifiers: none` and the mutation reads only `Quantifiers`; C2.3 guards against a different regression (reading `Statement` or `Domain`), which this single mutation does not exercise. **Coverage limit:** the guard mutates the detector path only. A change that made the *parser* (`parseEvidence()` or a claim-level field) derive `scope` from `Quantifiers` would not be mutated by this entry; C2.1 and C2.2 would still catch it as a behaviour change when the suite runs, but `mutation-check` would not prove the suite able to notice it. A second entry on the parser is possible and is not proposed here, to keep the guard to what the owner decided in Choice 8.
- `test/mutation-targets.test.mjs` already asserts every listed anchor still reaches its target without running the suite; the new entry is covered by that existing test with no new test code.
- A mutation that makes the suite pass is a defect in the guard and fails `npm run mutation-check`.

### C3 — Missing scope remains a refusal condition

| # | Test | Baseline label |
| --- | --- | --- |
| C3.1 | `audit` on `scope-point-missing` reports exactly three lines, CLM-0010, CLM-0011, CLM-0012, each `error` / `INFERRED`. | PASS-TODAY (this is the test the gap check found missing) |
| C3.2 | `validate` on `scope-point-missing` reports `computation.scope-declared` as `status: failed`, `severity: error`, `level: required`. | PASS-TODAY |
| C3.3 | `scope-point-malformed` reports exactly one line per claim for CLM-0020 to CLM-0028 and accepts none. Preserved lines: 0020 `states no arithmetic`, 0022 and 0023 `states no range`. Dedicated lines: 0021, 0024, 0028 `scope-unrecognised` (values `points`, `range`, `Point`); 0025 `scope-unrecognised` with empty value; 0026, 0027 `scope-malformed`. | Exercised on the baseline: reported today are 0020, 0021, 0022, 0023, 0025, 0026, 0028, all as `states no range` (0020 as `states no range` too, because the range test runs first); accepted today are 0024 and 0027 (both state range wording). So: RED-FIRST for the wording of 0020, 0021, 0025, 0026, 0028 and for 0024 and 0027 being reported at all; PASS-TODAY for 0022 and 0023 (class `none`, same line before and after) |
| C3.4 | Choice 3, no fallback: 0024 (`scope: range; exhaustive up to 10^9, exact integer arithmetic`) and 0027 (`scope: point exact interval, exhaustive up to 10^9`) are reported although unrelated range wording is present. | RED-FIRST |
| C3.5 | Choice 12, no collapse: for 0026 and 0027 the line is the `scope-malformed` wording and does not contain `states no range`. | RED-FIRST |
| C3.6 | The rule's catalog entry is unchanged in `level`, `severity`, `validationType`, `nonExemptible`, `assurance`, and `introducedIn` (description, remediation and note text change). | PASS-TODAY |
| C3.7a | Choice 10: on `scope-point-missing`, `validate --json` contains no `BLOCKED` verdict and the refusal is the rule-level `failed` / `error`; `audit` exits 0 and `audit --strict` exits 1. | PASS-TODAY |
| C3.7b | The same assertions on `scope-point-malformed` (no `BLOCKED`, `failed` / `error`, exit 0, and 1 under `--strict`). | PASS-TODAY |
| C3.7c | The same assertions on `scope-point-contradictory` (no `BLOCKED`, rule `failed` / `error`, `audit` exit 0, `--strict` exit 1). | PASS-TODAY as whole-fixture exit-code and rule-status assertions: CLM-0033 (`universally valid`: no range word today) and CLM-0034 (no arithmetic word) are already reported on the baseline, so the rule is already `failed` and `audit --strict` already exits 1. Only the per-claim assertions are red-first (C7.1, C7.3). The exit-code check is kept as a characterization pin that the contradiction path adds no new verdict (Choice 10), not as evidence the change works. |

### C7 — Contradiction check (`scope-contradiction`, Choice 7)

This group is owner-decided and not tied to one of the three criteria; it is consistency checking of an explicit declaration. It is listed separately so no reader mistakes it for scope inference.

| # | Test | Baseline label |
| --- | --- | --- |
| C7.1 | `scope-point-contradictory` CLM-0030 (`exhaustive`), 0031 (`for all n`), 0032 (`n <= 1000`), 0033 (`universally`), 0035 (`all values`) are each reported with exactly one `scope-contradiction` line whose quoted text is, respectively, `exhaustive`, `for all`, `n <= 1000`, `universally`, `all values` (the exact `<matched text>` rule in Report wording). | RED-FIRST for the wording of all five. Membership: CLM-0030, 0031, 0032, 0035 are accepted today, so being reported at all is red-first; CLM-0033 is already reported today (as `states no range`) with different wording. |
| C7.2 | CLM-0034 (contradiction and no arithmetic) yields exactly one line, the contradiction; the `states no arithmetic` line does not also appear. | RED-FIRST for the wording (CLM-0034 is reported today, as `states no arithmetic`) |
| C7.3 | `validate` on `scope-point-contradictory`: `computation.scope-declared` `failed`, `error`, `required`; `audit` exit 0, `--strict` exit 1; and none of CLM-0030 to CLM-0035 is accepted as a point (each is reported). | The whole-fixture status and exit assertions are PASS-TODAY (same reasons as C3.7c). The per-claim "each is reported" is RED-FIRST for CLM-0030, 0031, 0032, 0035 only (accepted today); it holds today for 0033 and 0034. |
| C7.4 | Negative controls for the bare word `all` and for a tolerance: `scope-point-declared` CLM-0004 (`all arithmetic is exact rational`, `tolerance 10^-9`, citing the existing `computations/check.py`) is accepted. | PASS-TODAY (accepted today: the bare `all` counts as a range word and `exact rational` as arithmetic). It is a characterization pin that pattern 3 does not over-trigger on a bare `all`, **not** a red-first test. The red-first form of the same strings is the unit table in C7.5. |
| C7.4b | Dedicated backtick-stripping case: `scope-point-declared` CLM-0005 (`scope: point; exact interval arithmetic at s0 = 1/2, ` plus the existing path `` `computations/exhaustive_all.py` ``): the path contains `exhaustive` and `all`, nothing else in the detail does, and the item is accepted. | PASS-TODAY (accepted today because `exhaustive` inside the path counts as a range word). It is the only fixture-level pin of backtick stripping and is **mutation-sensitive**: removing the strip makes it a `scope-contradiction` after the change. A red-first form is the C7.5 backtick row. |
| C7.5 | Data-driven unit test on the pattern function over a table of strings. Core match (quoted text in parentheses where it differs from the whole row): `exhaustive check`, `exhaustively`, `for all n` (`for all`), `for every`, `∀ s` (`∀`), `universally valid` (`universally`), `all values`, `all integers`, `all sufficiently large n`, `n <= 100` (`n <= 100`), `n <= 10^9`, `up to 100`, `up to 50 digits of precision` (`up to 50`), `first 1000 primes`, `10^9`, `10**9`. Core no match: `all arithmetic is exact`, `all endpoints are exact`, `every interval is certified`, `random seed 7`, `sample point`, `tolerance 10^-9`, `` `computations/exhaustive_all.py` `` (the backtick row: it must not match once the code span is stripped), `up to` with no digit. | RED-FIRST |
| C7.5b | Conditional on Choice 13b/13c (not part of the specification until the owner decides): match `all points in [0,1] checked`, `all intervals tested`, `all of the subintervals`, `every s in [0,1]`, `for arbitrary n`, `infinitely many`, `across the full range`, `entire interval`, `random sample`, `sampled on a grid`; still no match: `every interval is certified`, `random seed 7`, `sample point`. Conditional on 13c: no match for `exhaustive subdivision of the interval`, `for each endpoint`, `all inputs are exact rationals`, `all values are exact rationals`; still match `exhaustive search`, `for each n`, `for any parameter value`, `all values checked`. | RED-FIRST (conditional) |
| C7.6 | The check runs only for class `point`: CLM-0002 (no key, range text) is accepted as today, and CLM-0027 (malformed key plus `exhaustive up to 10^9`) yields only the `scope-malformed` line, one line. | PASS-TODAY for 0002; RED-FIRST for 0027 (accepted today because it states a range word) |
| C7.7 | The check reads only the item's own detail after the key: the `Quantifiers`, `Statement` and `Domain` of CLM-0003 contain universal words and it is accepted (same test as C2.4). | RED-FIRST |

Known failing-by-design cases are recorded in "False-positive limits" above, not hidden: `all values are exact rationals`, `up to 50 digits of precision`, `exhaustive subdivision of the interval`, `for each endpoint` and `all inputs are exact rationals` are reported under the core set. The unit table in C7.5 includes them in a second list labelled "accepted false positives" so a future change to the patterns (including adopting 13c) shows up as a deliberate edit.

## Fixtures (full contents)

Four directories under `test/fixtures/`, each shaped like `numerics-as-proof` (`artifacts/claims-ledger.md` and a placeholder program). No `project-policy.yml` is needed, because `audit` reads the ledger without a policy and `validate` reports rule-level results either way (probed). Choice 9 (owner-decided) keeps the fixtures minimal with no policy file, so `validate` on these fixtures returns `NOT_EVALUATED` (no policy) and the tests assert the rule-level result, not a verdict. The placeholder program is the same in all four (`computations/check.py`); `scope-point-declared` also carries a second placeholder, `computations/exhaustive_all.py`, with the same body, for the backtick-stripping case CLM-0005. Every program a ledger cites exists in its fixture, so no `evidence.artifact-linked` or `computation.reproducible-runs` finding comes from a missing file:

```python
# fixture placeholder: this program is never run
print('checked')
```

### `test/fixtures/scope-point-declared/artifacts/claims-ledger.md`

````markdown
# Claims ledger

CLM-0001 checks one parameter value and declares scope: point; computation.scope-declared must NOT report it. CLM-0002 is an ordinary range claim and must also not be reported. CLM-0003 declares scope: point while its Quantifiers prose says otherwise; Quantifiers is never read, so it is not reported either. CLM-0004 is a negative control for the contradiction check: its bare `all` and its tolerance `10^-9` look like range language but are not contradictions, so it must not be reported. CLM-0005 is the backtick case: the only range-looking words are inside the cited program path, which is stripped before scanning, so it must not be reported.

## CLM-0001 — Certified bound at one parameter value

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** The interval-arithmetic bound B(s0) < 1 holds at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point, deliberately
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0002 — An ordinary range result

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** For all n with 1 <= n <= 10^9, G(n) < n.
- **Domain:** n in N, 1 <= n <= 10^9
- **Quantifiers:** universal over n in the stated range
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — exhaustive for all n <= 10^9, exact integer arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0003 — Declared point, Quantifiers prose says otherwise

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** The interval-arithmetic bound B(s0) < 1 holds at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** universal over n in the stated range
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0004 — Declared point, no contradiction (negative control)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; all arithmetic is exact rational, tolerance 10^-9, certified at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0005 — Declared point, range-looking words only inside the program path (backtick case)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exact interval arithmetic at s0 = 1/2, `computations/exhaustive_all.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/exhaustive_all.py`)
````

Plus the placeholder `test/fixtures/scope-point-declared/computations/check.py` (the body above) and `test/fixtures/scope-point-declared/computations/exhaustive_all.py` (the same two lines).

**Whole-fixture assertions that hold (exercised on the baseline for the baseline column, Part 3).** Baseline (main, with this fixture's files present): `audit` reports `computation.scope-declared` for CLM-0001 and CLM-0003 only (`states no range`), nothing for CLM-0002, 0004, 0005, and no other rule fires, so `audit --strict` exits 1 on the baseline because of that single finding. With the change: `audit` reports no finding at all (the whole `findings` array is empty), so `audit` and `audit --strict` both exit 0, and `validate` gives `computation.scope-declared` `passed`. The tests assert the empty findings array for this fixture; if a later change to another rule makes this fixture produce an unrelated finding, that assertion is the one to narrow to the rule id, not to delete.

### `test/fixtures/scope-point-missing/artifacts/claims-ledger.md`

````markdown
# Claims ledger

Every claim here is a point in fact and says so in prose. None declares a structured scope and none states a range, so computation.scope-declared must report each. Pins C2 (free-text Quantifiers is never read) and C3 (missing scope is still refused).

## CLM-0010 — Point stated only in Quantifiers

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** The interval-arithmetic bound B(s0) < 1 holds at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0011 — Quantifiers imitates the structured form

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** The interval-arithmetic bound B(s0) < 1 holds at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** scope: point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0012 — Point stated only in the statement and domain

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** At the single point s0 = 1/2, B(s0) < 1.
- **Domain:** the single point s = 1/2
- **Quantifiers:** none
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — certified interval arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)
````

### `test/fixtures/scope-point-malformed/artifacts/claims-ledger.md`

````markdown
# Claims ledger

Each claim attempts a structured scope and gets it wrong in one way, or (CLM-0022, CLM-0023) does not attempt the key at all. computation.scope-declared must report every one, with one line each. None may be treated as a declared point scope.

## CLM-0020 — Point declared, arithmetic not stated

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; checked at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0021 — Unrecognised scope value

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: points; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0022 — Scope key in the wrong case

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — Scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0023 — Scope mentioned in prose, not declared

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — certified interval arithmetic at s0 = 1/2 (this is scope: point), `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0024 — Scope value that is not a point, with range wording present (no fallback)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: range; exhaustive up to 10^9, exact integer arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0025 — Empty scope value

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: ; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0026 — Key begins with scope: but fails the grammar (words after the value)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point at s0 = 1/2; certified interval arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0027 — Malformed key with range wording present (no fallback)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point exact interval, exhaustive up to 10^9, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0028 — Right key, wrong case of the value

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: Point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)
````

### `test/fixtures/scope-point-contradictory/artifacts/claims-ledger.md`

````markdown
# Claims ledger

Each claim has a well-formed `scope: point;` key and also says something in the same evidence entry that contradicts it. computation.scope-declared must report each with exactly one scope-contradiction line and must not accept any as a declared point. Quantifiers, Statement and Domain are never read by the check.

## CLM-0030 — Point and exhaustive

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exhaustive check, exact rational arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0031 — Point and for all

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; for all n, certified exact interval arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0032 — Point and an explicit range

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exact integer arithmetic, n <= 1000, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0033 — Point and universal

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exact interval arithmetic, universally valid, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0034 — Contradiction and no arithmetic (one line, the contradiction)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exhaustive check at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0035 — Point and all over a domain word

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; all values checked, exact rational arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)
````

The fixtures use block-style Markdown that the vendored ledger reader (`parseLedger`) accepts. They contain no YAML, so the vendored YAML reader's block-scalar rules do not come into play.

## Validation record

Two parts, kept apart so the owner can see what was and was not exercised.

**Part 1: exercised in the earlier draft (scratch copy, not committed).** A copy of `scripts/`, `rules/`, `schemas/`, `standards/`, `templates/`, `test/` at 3475ec4 was made in the session scratchpad and the first sketch (point key, unrecognised value) applied as two small edits to the scratch `scripts/claims.mjs` and `scripts/standards.mjs`. The repository was not touched.

| Fixture | Baseline (3475ec4) | With the first sketch |
| --- | --- | --- |
| `scope-point-declared` (CLM-0001..0003) | CLM-0001 `states no range`; CLM-0003 `states no range` | no finding |
| `scope-point-missing` | CLM-0010, CLM-0011, CLM-0012 `states no range` | same three, unchanged |
| `scope-point-malformed` (CLM-0020..0025) | six items, all `states no range` | six items reported; none accepted |

Other probes then: `validate` on `scope-point-declared` gave `computation.scope-declared` `passed/evaluated`; on `scope-point-missing` `failed`, `error`, `required`, `INFERRED`. A claim-level `**Scope:** point` field on the baseline is ignored without any finding. The alternative C schema fragment was run through `scripts/jsonschema.mjs` with the results listed above. The full existing suite was not run against the scratch copy (it omits files some tests read, such as `INSTRUCTIONS.md`); running it is part of the implementation step.

**Part 2: added by the 2026-11-17 revision.** Not run against the repository and not run in a scratch copy of the detector. What was checked is only the classification and the four contradiction patterns, by running the regular expressions given above over the evidence strings of the fixtures in a throwaway script (no repository code). It gave, for the key grammar and patterns as specified:

| Evidence string (abbreviated) | Class and result |
| --- | --- |
| CLM-0001 `scope: point; certified interval arithmetic ...` | point, accepted |
| CLM-0004 `scope: point; all arithmetic is exact rational, tolerance 10^-9, ... \`computations/check.py\`` | point, accepted (no false positive) |
| CLM-0005 `scope: point; exact interval arithmetic at s0 = 1/2, \`computations/exhaustive_all.py\`` | point, accepted only because the code span is stripped before scanning |
| CLM-0020 `scope: point; checked at ...` | point, `states no arithmetic` |
| CLM-0021 `scope: points; ...` | unrecognised (`points`) |
| CLM-0022 `Scope: point; ...` | none (ordinary path, `states no range`) |
| CLM-0024 `scope: range; exhaustive up to 10^9, exact integer ...` | unrecognised (`range`), no fallback |
| CLM-0025 `scope: ; ...` | unrecognised (empty) |
| CLM-0026 `scope: point at s0 = 1/2; ...` | malformed |
| CLM-0027 `scope: point exact interval, exhaustive up to 10^9, ...` | malformed, no fallback |
| CLM-0028 `scope: Point; ...` | unrecognised (`Point`) |
| CLM-0030 `exhaustive`; 0031 `for all`; 0032 `n <= 1` (extended to `n <= 1000` by the token-extension rule); 0033 `universally`; 0034 `exhaustive`; 0035 `all values` | contradiction, matching the quoted text |

The pre-existing items (CLM-0001..0003, 0010..0012, 0020..0025) keep the fixture text they had in the earlier draft except CLM-0024, whose evidence now carries range wording. The detector change, the parser change, the messages, the exit and status effects, the mutation guard and every test in this record are **unexercised design**. Before freeze the reviewer should ask for Part 2 to be exercised in a scratch copy, as Part 1 was; this record does not claim it has been.

**Part 3: re-check of the baseline labels after review (this revision).** A review of the previous revision found baseline labels that were wrong. Every baseline label in this record was therefore re-derived by running the real engine: the fixtures of this record were extracted verbatim from this file into a scratch directory and run through `scripts/standards.mjs audit` (default and `--strict`) and `validate` from a scratch copy of main at 11e6a14 (the engine files are identical to 3475ec4), plus single-evidence probes, and the scratch copy was deleted afterwards. Results that changed this record:

| Probe on the baseline | Result | Consequence here |
| --- | --- | --- |
| `scope: point; all arithmetic is exact rational, tolerance 10^-9, ...` (citing an existing file) | accepted: bare `all` is a range word, `exact rational` an arithmetic word | C7.4 is PASS-TODAY, not RED-FIRST |
| same string citing the non-existent `computations/exhaustive_all.py` | scope rule accepts, but `evidence.artifact-linked` (error) and `computation.reproducible-runs` (warning) fire | CLM-0004 now cites `check.py`; CLM-0005 cites an `exhaustive_all.py` that the fixture provides |
| `scope-point-declared`, whole fixture, existing files | only CLM-0001 and CLM-0003 reported (`states no range`); `audit` exit 0, `--strict` 1; `validate` rule `failed`/`error`/`required` | C1.2 relabelled; the fixture's whole-fixture assertions are stated under it |
| `scope-point-contradictory` | CLM-0033 (`states no range`) and CLM-0034 (`states no arithmetic`) already reported; CLM-0030, 0031, 0032, 0035 accepted | C3.7c, C7.3 exit and status assertions are PASS-TODAY; per-claim assertions for 0030, 0031, 0032, 0035 and all wording assertions are red-first |
| `scope-point-malformed` | reported: 0020, 0021, 0022, 0023, 0025, 0026, 0028; accepted: 0024, 0027 | C3.3 relabelled |
| `scope-point-missing` | 0010, 0011, 0012 reported; `audit` exit 0, `--strict` 1; `validate` `failed`/`error`/`required`, `INFERRED`, `NOT_EVALUATED` (no policy) | as recorded |
| key regex over the boundary strings | table under "Probed boundary cases" | `scope: point.` is `unrecognised`, not `malformed` |
| contradiction patterns over about 35 strings, core set and 13b/13c variants | core set: matches and non-matches as listed in C7.5; gaps and false positives as listed under Choice 13; 13b/13c variants close them as listed in C7.5b | Choice 13 |

The pattern and key-regex probes ran the regular expressions in a throwaway script; the detector, parser, messages, mutation entry and every test remain unwritten and unexercised.

## Owner decisions (2026-11-17)

All twelve choices were decided by the owner on 2026-11-17. They are recorded here as decisions, not defaults awaiting a yes. They add no acceptance criterion. The record remains a draft: it awaits a fresh review of this revision and then the owner's freeze.

| # | Decision | Where specified |
| --- | --- | --- |
| 1 | The declaration is a leading lower-case `scope: point;` key on the computational evidence item (option A; claim field B and policy C rejected). | Representation, alternatives |
| 2 | Exact spelling, case, position and value are required. `Scope:`, later positions, `Point`, and other values do not count. | Grammar |
| 3 | An unknown or empty value is an error. There is no fallback to unrelated range wording elsewhere in the detail. | Classification table, C3.4 |
| 4 | Arithmetic remains required under a point. | Table, C1.4 |
| 5 | The point's own value is not a new required field and is not checked. | Table |
| 6 | Modify `computation.scope-declared` in place: no new rule id, `required`, `error` and `introducedIn` unchanged. The eventual behavioural release is classified MAJOR (4.0.0). No `VERSION` change, tag or release action now; the CHANGELOG Unreleased entry records the classification only. | Schema and template fragments (4), C3.6 |
| 7 | The proposed "no contradiction check" is **rejected**. A structured point declaration may control scope, but explicit contradictory language in the same evidence item is not silently accepted: a `scope-contradiction` finding for clear range or universal claims (`exhaustive`, `all`, an explicit range, universal quantification). This is consistency checking, not inference of point scope from `Quantifiers`. | Contradiction check, Report wording, C7 |
| 8 | A mutation guard fails the suite if `Quantifiers` begins supplying point scope. | C2.5 and "Mutation guard" |
| 9 | Fixtures stay minimal, with no policy file. | Fixtures |
| 10 | The existing `failed` / `error` refusal behaviour is preserved. `BLOCKED` is not introduced. | Contradiction check (consequence), C3.7 |
| 11 | Existing evidence strings are preserved; the new scope-specific messages are added. | Report wording |
| 12 | A detail beginning with `scope:` that fails the grammar gets a dedicated `scope-malformed` message and does not collapse into `states no range`. | Classification table, Report wording, C3.5 |
| 13 | **OPEN, not decided, raised by review.** Breadth of the `scope-contradiction` vocabulary beyond Choice 7's wording: 13a core set only; 13b (recommended) core plus extension patterns; 13c 13b plus three false-positive carve-outs. Also confirms the narrowing of Choice 7's bare `all` to `all` + domain word. | Contradiction check, C7.5 and C7.5b |

Residual points the reviewer may want to confirm, none of which changes a decision above:

- Choice 2 means `Scope: point;` (wrong case) still falls to the ordinary `states no range` line, because the owner's rule for the dedicated message is strings beginning with the exact `scope:`. An author who mis-cases the key sees the older, less helpful line; the remediation text covers it.
- The contradiction check scans only the evidence item's own detail. A point declaration next to a universally quantified claim (as in CLM-0003) is accepted by this rule, by design and by C2.
- Choice 6 records the owner's MAJOR (4.0.0) classification as stated; this record does not argue it and takes no release action.

## Delivery rules once frozen

Freeze requires a fresh review of this revision first. Then: red-first tests (above, those labelled RED-FIRST failing on the baseline, PASS-TODAY pins committed alongside), then fixtures, then the detector and parser change, then the mutation-check entry, then the standards, template, catalog and assurance-report updates, then a CHANGELOG entry under Unreleased that records the MAJOR (4.0.0) classification. No `VERSION` change, tag or release. #55 to #57, #60 and #61 stay deferred; nothing here implements them.
