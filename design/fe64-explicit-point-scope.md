# FE-33 design record: explicit point scope

**Status: DRAFT, awaiting owner freeze.** Implementation is not authorized until the owner freezes this record.
**Authority:** the owner-finalized criteria of 2026-11-16 (cmsg_01S962nAgzeF44i1MHDz4h1uY1YFLzdLBAfNL6C61NiNhq), recorded verbatim in `F:\GitHub Evidence\MathematicsStandards\evidence-64\decisions\finalized-criteria-2026-11-16.md`, and the owner decision that this item is a design-only record for an explicit structured `scope: point`. Issue: #64 (FE-33).
**Baseline:** `origin/main` at 3475ec4, VERSION 3.1.0. The gap check (`evidence-64/ac-gap-check/report.md`) was taken at 14562f6; every code location it cites was re-read at 3475ec4 and still holds (detector at `scripts/standards.mjs:1030-1038` and `1073-1077`, evidence parser at `scripts/claims.mjs:468-474`).

This record changes no code, schema, rule, fixture, `VERSION` or `CHANGELOG`. Everything below that looks like code, a fixture or a schema is a *proposal*, and the validation record shows each proposal was exercised in a scratch copy that is not committed.

## Criteria (verbatim, no others)

- **C1:** `computation.scope-declared` accepts an explicit structured `scope: point`.
- **C2:** Do not infer point scope by parsing the free-text `Quantifiers` field.
- **C3:** Missing scope remains a refusal condition.

No acceptance criterion is added here. Where this record has to decide something the criteria leave open, it is a numbered choice in "Choices for owner review", with a fail-closed default.

## How scope and `Quantifiers` are read today (re-verified at 3475ec4)

- `computation.scope-declared` is `required`, `error`, `document`, assurance `partial`, `introducedIn` 1.0.0 (`rules/computation.json`). It is evaluated by `detectComputationEvidence()` in `scripts/standards.mjs`.
- It looks at **evidence items**, not claims. For each ledger evidence item whose type can `is-computation` (`computational`, `numerical`), it passes only if the item's *detail text* both (a) states a range, meaning `looksBounded()` (`n <= 10^9`, `up to N`, `exhaustive up to`, ...) or one of the words `all`, `sample`, `random`, `exhaustive`, and (b) states an arithmetic word (`exact`, `integer`, `rational`, `interval`, `floating point`, `float`). Otherwise it adds `<ledger>:<claim line> <id> — <type> evidence states no range` (or `no arithmetic`).
- The finding is `INFERRED`, never `OBSERVED` (pinned by `test/audit.test.mjs` "heuristic findings are never labelled OBSERVED").
- The ledger has no structured scope field. `parseEvidence()` yields `{type, detail, artifacts, text}`. `applyField()` has cases for `status`, `statement`, `domain`, `quantifiers`, `relevance`, ... and a `default: break`, so an unknown `**Field:**` is silently ignored (probed: a `**Scope:** point` field changes nothing today).
- `Quantifiers` is stored as `entry.quantifiers`. It is read by `looksUniversal()` (`scripts/claims.mjs:659`, two call sites in `scripts/standards.mjs`, at 998 and 1115) and by `rigor.explicit-quantifiers` as a non-empty check (`scripts/standards.mjs:876-884`). **No scope logic reads it, and `computation.scope-declared` never does.** That is why C2 holds today by omission and why nothing yet pins it.
- "Refusal" today: `audit` reports an `error` finding (exit 0 by default, 1 under `--strict`). `validate` reports the rule as `status: failed`, `severity: error`, and a failed `required` rule prevents a compliant verdict. A scope-less fixture with no policy gives `validate` exit 2 / `NOT_EVALUATED` only because there is no policy, not because of this rule. The rule-level `failed` result is the refusal this record preserves.
- The case that motivated the item (RH CLM-0010, `design/v1.1-candidates.md` section 0f) is a certified interval-arithmetic bound at one parameter value. It states its arithmetic, has no range, and records the point only in `Quantifiers`.

## Proposed design

### Representation (recommended; see Choice 1)

A **structured key at the head of a computational evidence item's detail**:

```markdown
- **Evidence:**
  - computational — scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
```

Grammar, exact:

- After the evidence type and the em/en dash or hyphen, the detail text is matched against `^scope:[ \t]*([^;,\s]*)[ \t]*(?:[;,]|$)`. The first capture is the *scope value*. If the detail does not start with `scope:` the item has `scope: null`.
- The key is lower-case `scope:` and it must be the **first** token of the detail. A `scope:` anywhere else is prose and is never read. `Scope:`, `SCOPE:` and `scope :` are not the key.
- The only recognised value is the exact lower-case string `point`. Any other captured value (`points`, `range`, empty) is reported, not ignored.
- The key must be followed by `;`, `,` or the end of the detail. `scope:point;` (no space after the colon) **is** accepted. `scope: point at s0 = 1/2; ...` and `scope: point exact interval ...` do **not** match (the value is followed by a space and more words), so `scope` is `null` and the item falls to the ordinary range test and the existing `states no range` line, which is misleading for an author who believed they had declared a point. The catalog `remediation` therefore must say that the key is written `scope: point;` or `scope: point,` and followed by `;` or `,` before any other words (Choice 12 offers a dedicated message instead).
- The sketched `parseEvidence()` is **not** type-gated: it yields `scope` for every evidence type, so `proof — scope: point; ...` parses with `scope === "point"`. Only the detector ignores it, because it reads `scope` only inside its computational/numerical branch (`evidenceCan(type, "is-computation")`). On any other evidence type the text is prose to every rule. (Gating the parser with `evidenceCan`, exported at `scripts/claims.mjs:170`, is an equivalent alternative; the tests below hold either way.)
- Nothing about `Quantifiers`, `Statement` or `Domain` is consulted to decide scope. This is C2.

Implementation sketch (illustrative; the real change is made only after freeze):

- `scripts/claims.mjs` `parseEvidence()` returns one more field, `scope` (string or null).
- `detectComputationEvidence()`: when `item.scope === "point"`, the *range* test is satisfied by the declaration; the *arithmetic* test is unchanged. When `item.scope` is non-null and not `point`, the item is reported once with an unrecognised-scope line and the range/arithmetic tests are not also run for that item (so one item yields one evidence line). When `item.scope` is null, behaviour is byte-for-byte what it is today.

### What `scope: point` does and does not do

| Item | Effect |
| --- | --- |
| Range requirement | Satisfied by the declaration. No range text is needed. |
| Arithmetic requirement | **Still required.** `scope: point` with no arithmetic word is reported (`states no arithmetic`). |
| Program, environment, seed, outcome (R1 items) | Unchanged. The rule never checked them and still does not. |
| The point's value | **Not machine-checked.** The declaration says the scope is a point; it does not say which, and the detector cannot verify that the program ran there. R1 still asks the author to record what was checked, and the rule's assurance stays `partial`. |
| Claim status, rank, other rules | None. The key is read by this one detector only. |
| Existing ledgers | No change. A ledger with no `scope:` key produces the same findings as before (by construction: `scope` is `null`, so no existing code path changes). |

### Why per evidence item, not per claim or in policy (alternatives considered)

- **A. Evidence-item key (recommended).** The rule iterates evidence items, so the declaration sits on the thing it excuses. A claim with a range computation and a point computation declares the point only where it applies. Fail-closed: a claim-wide declaration could never be wider than its evidence.
- **B. Claim field `- **Scope:** point` beside `Quantifiers`.** Reuses the ledger's existing field syntax, and `applyField` already ignores it harmlessly (probed). But it is claim-wide: one declaration would excuse every computational item on the claim, including a range computation that omitted its range. Also a field with the same visual weight as `Quantifiers` invites the reading C2 prohibits.
- **C. Policy declaration, e.g. `mathematics.computationScope: { CLM-0010: point }`.** Keeps the ledger grammar untouched, but moves a per-evidence fact into a second file, needs a schema change (fragment validated below), and a policy edit becomes the way to satisfy a ledger rule. The framework has been moving the other way (`relevance` is a ledger field, not policy).

### Schema and template fragments

**No schema change under the recommended option.** `schemas/project-policy.schema.json` describes the policy file only; the ledger is Markdown and has no schema. Fragments proposed for the files that do change:

1. `templates/claims-ledger.md`, in the Evidence example for a point result (added after the existing CLM-0001 example, or as a commented block like CLM-0002):

   ```markdown
   - **Evidence:**
     - computational — scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
   ```

   plus one sentence in the numbered notes: "A computation at a single parameter value is declared with `scope: point` as the first words of its evidence entry; it still names its arithmetic. Saying 'single point' in `Quantifiers` is not a declaration."
2. `standards/10-computational-and-numerical-evidence.md` R1, after the table: "A computation that checks one point rather than a range declares `scope: point` as the first words of the evidence entry's description. It still records the arithmetic, the program and the other items above. The declaration is read from that exact form; descriptions elsewhere (including `Quantifiers`) are not read as declarations." Also `standards/03-claims-ledger.md` (the ledger grammar) gains the same sentence under Evidence.
3. `rules/computation.json` `computation.scope-declared`: `description` gains "or declares `scope: point`"; `remediation` gains "for a single-point computation, begin the evidence entry with `scope: point;` and still state the arithmetic"; `$assuranceNote` gains "A `scope: point` declaration is accepted as stated; the detector does not check that the program ran at one point." Then `npm run assurance` regenerates `docs/assurance-report.md` (checked by `assurance:check`).
4. `CHANGELOG.md` Unreleased entry; no `VERSION` change (see Choice 6).
5. `design/v1.1-candidates.md` section 0f gets a pointer note only.

Alternative C schema fragment, **validated** against the vendored evaluator (`scripts/jsonschema.mjs`) in the scratch copy, kept here only so the owner can compare; it is not recommended:

```json
"computationScope": {
  "description": "Claims whose computational evidence is deliberately a single point. Keys are claim ids; the only value is `point`.",
  "type": "object",
  "propertyNames": { "type": "string", "pattern": "^CLM-[0-9]{4}$" },
  "additionalProperties": { "type": "string", "enum": ["point"] }
}
```

placed under `properties.mathematics.properties`. Evaluator results: `CLM-0010: point` valid; `CLM-0010: points` rejected (`must be one of 'point'`); `clm-10: point` rejected (`'clm-10' is not a valid key here`).

### Report wording

Unchanged: the rule message, `label: INFERRED`, severity `error`, and the existing evidence lines `states no range` and `states no arithmetic` (RH adoption evidence under `artifacts/adoption/` quotes the first verbatim, and no test asserts either string). New evidence line, one per offending item:

```
<ledger>:<claim line> <id> — <type> evidence declares scope "<value>"; the only structured scope value is "point"
```

For an empty value the line reads `declares scope ""`. Remediation text (catalog) is the only place the new form is advertised to an author who hit `states no range`. Verified output, scratch copy, `scope-point-malformed`:

```
CLM-0020 — computational evidence states no arithmetic
CLM-0021 — computational evidence declares scope "points"; the only structured scope value is "point"
CLM-0022 — computational evidence states no range
CLM-0023 — computational evidence states no range
CLM-0024 — computational evidence declares scope "range"; the only structured scope value is "point"
CLM-0025 — computational evidence declares scope ""; the only structured scope value is "point"
```

The scratch prototype was adjusted so an unrecognised value yields that one line and skips the range and arithmetic tests for the item, giving the one-line-per-item behaviour specified above.

## Criteria mapped to tests, fixtures and wording

Test file: `test/fe64-point-scope.test.mjs`, written before the change, using `HOME` and `run` from `test/helpers/cli.mjs` and the repository's `audit --dir=<fixture> --json` convention (as `test/fe28-attempt-gates.test.mjs` does). Layers: unit (`parseLedger`) and CLI integration.

"Baseline" is the result on 3475ec4. **Red** means it fails before the change. Several C2/C3 tests are characterization pins that are **green on the baseline** by design: C2 and C3 describe behaviour that must not change, so their tests guard against regression rather than drive new code. They are marked so, and the owner should not read them as red-first.

### C1 — `computation.scope-declared` accepts an explicit structured `scope: point`

| # | Test | Baseline |
| --- | --- | --- |
| C1.1 | `parseLedger` on a ledger whose evidence is `computational — scope: point; certified interval arithmetic ...` gives that item `scope === "point"`. | red (no such field) |
| C1.2 | `audit` on `scope-point-declared` reports no `computation.scope-declared` finding naming CLM-0001. | red |
| C1.3 | `validate` on `scope-point-declared` gives `computation.scope-declared` `status: passed` (not `failed`). | red |
| C1.4 | `scope: point` with no arithmetic word (`scope-point-malformed`, CLM-0020) is still reported, as `states no arithmetic`. | green pin |
| C1.5a | The ordinary range claim in the same fixture (CLM-0002) is still accepted. | green pin |
| C1.5b | `parseLedger` on an evidence item with no `scope:` key gives `scope === null`. | red (baseline returns `undefined`) |
| C1.5c | `scope:point;` (no space) parses as `point`; `scope: point at s0 = 1/2; ...` and `scope: point exact interval` parse as `null` and are reported with the ordinary range line. | red for the first, green pin for the other two |
| C1.6 | A non-computational item (`proof — scope: point; ...`) adds no finding and does not exempt anything; at parse level it carries `scope === "point"` under the sketched parser (or `null` if the parser is type-gated), and the detector ignores it either way. Asserts the finding set, not the parse value. | green pin |

### C2 — Do not infer point scope by parsing the free-text `Quantifiers` field

| # | Test | Baseline |
| --- | --- | --- |
| C2.1 | `scope-point-missing` CLM-0010: `Quantifiers: single point`, no structured scope, is reported. | green pin |
| C2.2 | CLM-0011: `Quantifiers: scope: point` (the structured text placed in the wrong field) is reported. | green pin |
| C2.3 | CLM-0012: the point stated only in `Statement` and `Domain` is reported. | green pin |
| C2.4 | `scope-point-declared` CLM-0003: structured `scope: point` with `Quantifiers: universal over n in the stated range` is accepted, so `Quantifiers` cannot change the outcome in either direction. | red (the baseline rejects CLM-0003 for lack of a range) |
| C2.5 | Mutation guard: in a temp copy, the detector is changed to also accept a ledger whose `Quantifiers` matches `/single point/`; tests C2.1 to C2.3 must then fail. Added to the repository's mutation-check list if the owner wants it (Choice 8). | n/a |
| C2.6 | The evidence-item key must be first: CLM-0023 (`... (this is scope: point)`) and CLM-0022 (`Scope: point`, wrong case) are reported. | green pin |

### C3 — Missing scope remains a refusal condition

| # | Test | Baseline |
| --- | --- | --- |
| C3.1 | `audit` on `scope-point-missing` reports exactly three findings lines, CLM-0010, CLM-0011, CLM-0012, each `error` / `INFERRED`. | green pin (this is the test the gap check found missing) |
| C3.2 | `validate` on `scope-point-missing` reports `computation.scope-declared` as `status: failed`, `severity: error`, `level: required`. | green pin |
| C3.3 | `scope-point-malformed`: all six claims are reported; none is accepted. Unrecognised values (`points`, `range`, empty) are reported with the unrecognised-scope wording, exactly one line per item. | red for the wording and the one-line rule, green for the six being reported |
| C3.4 | The rule's catalog entry is unchanged in `level`, `severity`, `validationType`, `nonExemptible`, `assurance` (a regression guard on "remains a refusal condition"; the description, remediation and note text change). | green pin |

## Fixtures (full contents)

Three directories under `test/fixtures/`, each shaped like `numerics-as-proof` (`artifacts/claims-ledger.md` and a placeholder program). No `project-policy.yml` is needed, because `audit` reads the ledger without a policy and `validate` reports rule-level results either way (probed). If the owner prefers `validate` to return a verdict instead of `NOT_EVALUATED`, Choice 9 adds a policy; it was left out so the fixtures stay minimal. The placeholder program is the same in all three (`computations/check.py`):

```python
# fixture placeholder: this program is never run
print('checked')
```

### `test/fixtures/scope-point-declared/artifacts/claims-ledger.md`

````markdown
# Claims ledger

CLM-0001 checks one parameter value and declares scope: point; computation.scope-declared must NOT report it. CLM-0002 is an ordinary range claim and must also not be reported. CLM-0003 declares scope: point while its Quantifiers prose says otherwise; Quantifiers is never read, so it is not reported either.

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
````

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

Each claim attempts a structured scope and gets it wrong in one way. computation.scope-declared must report every one. None may be treated as a declared point scope.

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

## CLM-0024 — Scope value of a kind that is not a point

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: range; certified interval arithmetic at s0 = 1/2, `computations/check.py`
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
````

The fixtures use block-style Markdown that the vendored ledger reader (`parseLedger`) accepts. They contain no YAML, so the vendored YAML reader's block-scalar rules do not come into play.

## Validation record (scratch copy, not committed)

A copy of `scripts/`, `rules/`, `schemas/`, `standards/`, `templates/`, `test/` at 3475ec4 was made in the session scratchpad. The sketch above was applied as two small edits (about 10 lines) to the scratch `scripts/claims.mjs` and `scripts/standards.mjs`. The repository was not touched.

| Fixture | Baseline (3475ec4) | With the sketch |
| --- | --- | --- |
| `scope-point-declared` | CLM-0001 `states no range`; CLM-0003 `states no range` (red) | no finding |
| `scope-point-missing` | CLM-0010, CLM-0011, CLM-0012 `states no range` | same three, unchanged |
| `scope-point-malformed` | six items, all `states no range` (wording differs for 0020/0021/0024/0025 with the sketch) | six items reported; none accepted |

Other probes: `validate` on `scope-point-declared` with the sketch gave `computation.scope-declared` `passed/evaluated`; on `scope-point-missing` `failed`, `error`, `required`, `INFERRED`. A claim-level `**Scope:** point` field on the baseline is ignored without any finding (so Option B needs a parser change too). The alternative C schema fragment was run through `scripts/jsonschema.mjs` with the results listed above. The full existing suite was not run against the scratch copy, because the copy omits files some tests read (`INSTRUCTIONS.md`); running it is part of the implementation step.

## Choices for owner review (fail-closed defaults)

None of these adds an acceptance criterion; each fills a gap the three criteria leave. The default is the stricter reading in every choice except 5, 6 and 7. In 5 (the point's value is not required) and 7 (no contradiction cross-check: `scope: point; exhaustive up to 10^9, exact` is accepted) the default is deliberately **looser** and is flagged as such; Choice 6 is a classification question, not a strictness one.

1. **Where the declaration lives.** Default: A, a leading `scope: point` key on the computational evidence item. Alternatives: B claim field, C policy. Fail-closed reason: the declaration cannot be wider than the evidence it excuses.
2. **Strictness of the key.** Default: exact lower-case `scope:` first in the detail, value exactly `point`; case variants, later positions and unknown values do not count. Alternative: accept `Scope: Point` case-insensitively. Looser forms add forms to explain and test; a missed variant is reported, not silently passed.
3. **Unrecognised value.** Default: reported as an error (`points`, `range`, empty), even when range text is also present. Alternative: ignore the key and fall back to the range test. Default chosen so a typo is not silently rescued by an unrelated word like `all`.
4. **Arithmetic under a point.** Default: still required. Alternative: a point declaration also waives the arithmetic test. R1 asks for the arithmetic regardless of scope.
5. **The point's value.** Default: not required and not checked (the criteria say only that a declared point is valid). Alternative: require `scope: point at <value>` and fail without it. That would add a requirement not in C1.
6. **Rule edit versus new rule, and version.** Default: modify `computation.scope-declared` in place, no new rule id, `required` and `error` unchanged, `introducedIn` stays 1.0.0. **The version bump is UNDECIDED and owner-held; no `VERSION` change is made here.** `CHANGELOG.md` lines 7-8 say "removing, weakening, or reclassifying any rule is MAJOR", and accepting a new form on a `required` rule arguably weakens it, so MAJOR, MINOR and no bump are all live readings. Alternative: a separate rule; rejected here because it would make a point claim pass one rule and need another, which is the duplication the standards avoid.
7. **Contradiction check.** Default: no cross-check. `scope: point` is accepted even if the evidence text elsewhere says `exhaustive` or `all n`, and even if `Quantifiers` says universal (test C2.4). Reading free text to overrule the declaration would be inferring from it, which C2 forbids in spirit. Alternative: a separate warning when the detail also states a range. Recorded because it can hide a claim that is mislabelled as a point.
8. **Mutation guard C2.5.** Default: include it in `scripts/mutation-check.mjs` targets so a future edit that reads `Quantifiers` is caught mechanically. Alternative: behavioural pins only (C2.1 to C2.3).
9. **Fixtures with a policy.** Default: no policy file (minimal). Alternative: add a `project-policy.yml` per fixture so `validate` returns a verdict (`NON_COMPLIANT`) rather than `NOT_EVALUATED`; it adds three policy files to maintain.
10. **What "refusal" means.** Default: the existing meaning, a rule-level `failed` / `error` finding that prevents a compliant verdict. Alternative: also surface a `BLOCKED` verdict, which would be a new behaviour and is not proposed.
11. **Evidence-line wording.** Default: existing strings unchanged; only the new unrecognised-scope line is added; the new form is advertised in `remediation`. Alternative: append `(a single point is declared with scope: point)` to `states no range`, which edits a string the RH adoption record quotes.
12. **Near-miss key.** Default: a `scope:` key that does not match the grammar (e.g. `scope: point at s0 = 1/2;`) falls to the ordinary `states no range` line, with the fix explained in `remediation`. Alternative: report a dedicated line when the detail starts with `scope:` but does not match, which is clearer but adds a message form.

## Delivery rules once frozen

Red-first tests (above), then fixtures, then the detector and parser change, then the standards, template, catalog and assurance-report updates, then a CHANGELOG entry under Unreleased. No `VERSION` change, tag or release. #55 to #57, #60 and #61 stay deferred; nothing here implements them.
