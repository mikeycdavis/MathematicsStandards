/**
 * The policy reader's block scalars (FE-32, GitHub #63).
 *
 * An attestation's `evidence` is expert reasoning, and reasoning at length does not fit on one
 * physical line with no double quotes. The reader now accepts `|` and `>` (with the clip default or
 * `-` chomping) as the value of a mapping key, and still refuses everything else — including the
 * block-scalar forms it does not implement. The issue's own constraint is that "a reader that
 * quietly ignores a construct is worse than one that refuses it", so most of this file is about what
 * must still throw, and says which message, so a refusal cannot be replaced by a different one.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseYaml, YamlError } from "../scripts/yaml.mjs";
import { checkPolicy } from "../scripts/policy.mjs";

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = path.join(HOME, "schemas/project-policy.schema.json");

const refuses = (yaml, pattern) =>
  assert.throws(
    () => parseYaml(yaml),
    (error) => error instanceof YamlError && pattern.test(error.message),
    `expected a YamlError matching ${pattern}`,
  );

test("`>-` folds lines into one string and keeps embedded double quotes and `#`", () => {
  const doc = parseYaml(
    [
      "evidence: >-",
      '  Checked "every" cancellation in proofs/clm-0002.md; see item #3',
      "  and the note: the denominator is non-vanishing.",
      "next: after",
      "",
    ].join("\n"),
  );
  assert.equal(
    doc.evidence,
    'Checked "every" cancellation in proofs/clm-0002.md; see item #3 and the note: the denominator is non-vanishing.',
  );
  assert.equal(doc.next, "after");
});

test("`|` keeps newlines, blank lines, and relative indentation; clip adds one final newline", () => {
  const doc = parseYaml("a: |\n  one\n\n    two \"q\" # not a comment\n  three\n\n\nb: x\n");
  assert.equal(doc.a, 'one\n\n  two "q" # not a comment\nthree\n');
  assert.equal(doc.b, "x");
});

test("`|-` strips the final newline", () => {
  assert.equal(parseYaml("a: |-\n  one\n  two\n").a, "one\ntwo");
});

test("a blank line in a folded scalar becomes a newline", () => {
  assert.equal(parseYaml("a: >-\n  one\n  two\n\n  three\n").a, "one two\nthree");
});

test("body lines may hold `---`, `: `, quotes, and odd indentation without being parsed as YAML", () => {
  const doc = parseYaml("a: |-\n  ---\n  key: value\n   'x' \"y\"\n     deeper\nb: 1\n");
  assert.equal(doc.a, "---\nkey: value\n 'x' \"y\"\n   deeper");
  assert.equal(doc.b, "1");
});

test("a header comment is allowed; a comment line indented under the key is body text", () => {
  const doc = parseYaml("a: >- # why\n  one\n  # two\nb: y\n");
  assert.equal(doc.a, "one # two");
});

test("a block scalar nests under mappings and inside a sequence entry's mapping", () => {
  const doc = parseYaml(
    ["top:", "  inner:", "    note: >-", "      long", "      text", "    other: z", "list:", "  - name: n", "    why: |-", "      a", "      b", "    after: k", ""].join(
      "\n",
    ),
  );
  assert.equal(doc.top.inner.note, "long text");
  assert.equal(doc.top.inner.other, "z");
  assert.deepEqual(doc.list, [{ name: "n", why: "a\nb", after: "k" }]);
});

test("a block scalar is a string, like every scalar", () => {
  assert.equal(typeof parseYaml("a: |-\n  1\n").a, "string");
});

test("`+` chomping is refused", () => {
  refuses("a: |+\n  x\n", /keep chomping/);
  refuses("a: >+\n  x\n", /keep chomping/);
});

test("explicit indentation indicators are refused", () => {
  refuses("a: |2\n    x\n", /indentation indicators/);
  refuses("a: >-2\n    x\n", /indentation indicators/);
  refuses("a: |2-\n    x\n", /indentation indicators/);
});

test("a header with trailing text is refused rather than read as a scalar", () => {
  refuses("a: |- text\n  x\n", /unsupported block scalar header/);
  refuses("a: >foo\n  x\n", /unsupported block scalar header/);
});

test("an empty block scalar is refused", () => {
  refuses("a: |-\nb: 1\n", /non-empty body/);
  refuses("a: >-\n\n\nb: 1\n", /non-empty body/);
  refuses("a: |-\n", /non-empty body/);
});

test("a block scalar as a sequence entry is refused", () => {
  refuses("a:\n  - |-\n    x\n", /sequence entry/);
  refuses("a:\n  - >\n    x\n", /sequence entry/);
});

test("tabs are refused inside a block scalar", () => {
  refuses("a: |-\n  one\n\ttwo\n", /tabs/);
  refuses("a: |-\n  one\t\n", /tabs/);
});

test("a body line indented less than the first body line is refused", () => {
  refuses("a: |-\n    deep\n  shallow\nb: 1\n", /less than the first line/);
});

test("more-indented lines inside a folded scalar are refused", () => {
  refuses("a: >-\n  one\n    two\n", /more-indented/);
});

// A whitespace-only line is the corner the first review of FE-32 found: the reader turned it into an
// empty line whatever its width, so a literal scalar lost content the header promises to keep
// verbatim and a folded scalar accepted what it documents as unsupported (PR #109, review comment
// https://github.com/mikeycdavis/MathematicsStandards/pull/109#discussion_r4187202375).
test("a whitespace-only line deeper than the body keeps its extra spaces in a literal scalar", () => {
  assert.deepEqual(parseYaml("a: |-\n  one\n    \n  two\n"), { a: "one\n  \ntwo" });
  assert.deepEqual(parseYaml("a: |\n  one\n   \n  two\n"), { a: "one\n \ntwo\n" });
});

test("the same line in a CRLF document is preserved without its carriage return", () => {
  assert.deepEqual(parseYaml("a: |-\r\n  one\r\n    \r\n  two\r\n"), { a: "one\n  \ntwo" });
});

test("a whitespace-only line deeper than the body is refused in a folded scalar, with its line number", () => {
  refuses("a: >-\n  one\n    \n  two\n", /line 3: more-indented/);
  refuses("a: >\n  one\n\n     \n  two\n", /line 4: more-indented/);
});

test("a whitespace-only line at or under the body indent is an empty line in both styles", () => {
  assert.deepEqual(parseYaml("a: |-\n  one\n  \n  two\n"), { a: "one\n\ntwo" });
  assert.deepEqual(parseYaml("a: |-\n  one\n \n  two\n"), { a: "one\n\ntwo" });
  assert.deepEqual(parseYaml("a: >-\n  one\n  \n  two\n"), { a: "one\ntwo" });
  assert.deepEqual(parseYaml("a: >-\n  one\n \n  two\n"), { a: "one\ntwo" });
});

// The second review of FE-32 (PR #110, review comment
// https://github.com/mikeycdavis/MathematicsStandards/pull/110#discussion_r4189245269) found the
// same corner at the end of the body: a trailing whitespace-only line wider than the body's indent
// was dropped by chomping. YAML 1.2 chomping removes only *empty* trailing lines (l-chomped-empty:
// at most the body's indent in spaces); a line with spaces beyond the indent is a content line made
// of spaces (l-nb-literal-text), so `-` strips only its final line break and the spaces stay.
test("a trailing whitespace-only line deeper than the body keeps its extra spaces in a literal scalar", () => {
  assert.deepEqual(parseYaml("a: |-\n  one\n    \n"), { a: "one\n  " });
  assert.deepEqual(parseYaml("a: |\n  one\n    \n"), { a: "one\n  \n" });
  assert.deepEqual(parseYaml("a: |-\n  one\n    \n      \n"), { a: "one\n  \n    " });
  assert.deepEqual(parseYaml("a: |\n  one\n    \nb: 1\n"), { a: "one\n  \n", b: "1" });
});

test("only truly empty trailing lines are chomped, whichever side of a deeper whitespace line they fall", () => {
  assert.deepEqual(parseYaml("a: |-\n  one\n    \n\n\n"), { a: "one\n  " });
  assert.deepEqual(parseYaml("a: |-\n  one\n    \n  \n \n"), { a: "one\n  " });
  assert.deepEqual(parseYaml("a: |-\n  one\n\n    \n"), { a: "one\n\n  " });
  assert.deepEqual(parseYaml("a: |-\n  one\n\n  \n \n"), { a: "one" });
  assert.deepEqual(parseYaml("a: |\n  one\n\n  \n \n"), { a: "one\n" });
  assert.deepEqual(parseYaml("a: >-\n  one\n\n  \n \n"), { a: "one" });
  assert.deepEqual(parseYaml("a: >\n  one\n  \n"), { a: "one\n" });
});

test("a trailing whitespace-only line is judged the same in a CRLF document and with no final newline", () => {
  assert.deepEqual(parseYaml("a: |-\r\n  one\r\n    \r\n"), { a: "one\n  " });
  assert.deepEqual(parseYaml("a: |-\r\n  one\r\n  \r\n"), { a: "one" });
  assert.deepEqual(parseYaml("a: |-\n  one\n    "), { a: "one\n  " });
  assert.deepEqual(parseYaml("a: |\n  one\n    "), { a: "one\n  \n" });
  assert.deepEqual(parseYaml("a: |-\n  one\n  "), { a: "one" });
  assert.deepEqual(parseYaml("a: |-\n  one\n"), { a: "one" });
  refuses("a: >-\n  one\n    ", /line 3: more-indented/);
});

test("a trailing whitespace-only line deeper than the body is refused in a folded scalar", () => {
  refuses("a: >-\n  one\n    \n", /line 3: more-indented/);
  refuses("a: >\n  one\n    \n", /line 3: more-indented/);
  refuses("a: >-\n  one\n\n    \n\n", /line 4: more-indented/);
  refuses("a: >-\n  one\n    \nb: 1\n", /line 3: more-indented/);
});

test("a trailing whitespace-only line at or under the body indent is an empty line", () => {
  assert.deepEqual(parseYaml("a: |-\n  one\n  \n"), { a: "one" });
  assert.deepEqual(parseYaml("a: |\n  one\n \nb: 1\n"), { a: "one\n", b: "1" });
  assert.deepEqual(parseYaml("a: >-\n  one\n  \n"), { a: "one" });
  assert.deepEqual(parseYaml("a: >\n  one\n \n"), { a: "one\n" });
});

// YAML 1.2 section 8.1.1.1: leading empty lines are empty lines only up to the first body line's
// indent; a wider one is an error, not text. The reader used to flatten it to an empty line.
test("a leading whitespace-only line at or under the body indent is an empty line, a wider one is refused", () => {
  assert.deepEqual(parseYaml("a: |-\n  \n  one\n"), { a: "\none" });
  assert.deepEqual(parseYaml("a: |-\n \n  one\n"), { a: "\none" });
  assert.deepEqual(parseYaml("a: >-\n  \n  one\n"), { a: "\none" });
  refuses("a: |-\n    \n  one\n", /line 2: .*leading whitespace-only line/);
  refuses("a: >-\n    \n  one\n", /line 2: .*leading whitespace-only line/);
  refuses("a: |-\n  \n      \n  one\n", /line 3: .*leading whitespace-only line/);
});

// Whitespace in YAML is the space and the tab. JavaScript's `trim()` and `\s` also strip a no-break
// space and other Unicode spaces, which are content: a line holding only one is not empty.
test("a Unicode-space-only line is content, not an empty line", () => {
  assert.deepEqual(parseYaml("a: |-\n  one\n  \u00a0\n"), { a: "one\n\u00a0" });
  assert.deepEqual(parseYaml("a: |-\n  \u00a0\n  one\n"), { a: "\u00a0\none" });
  assert.deepEqual(parseYaml("a: >-\n  one\n  \u00a0two\n"), { a: "one \u00a0two" });
});

test("a tab-only line is still refused", () => {
  refuses("a: |-\n  one\n\t\n  two\n", /tabs/);
  refuses("a: >-\n  one\n  \t\n  two\n", /tabs/);
});

test("anchors and aliases are still refused, with or without a block scalar", () => {
  refuses("a: &x |-\n  one\n", /anchors/);
  refuses("a: *x\n", /anchors/);
});

test("a dedented `---` after the body is still a document marker", () => {
  refuses("a: |-\n  one\n---\nb: 1\n", /document markers/);
});

test("the block ends at a line no deeper than its key, and the key after it still parses", () => {
  const doc = parseYaml("a:\n  x: |-\n    one\n  y: 2\nz: 3\n");
  assert.deepEqual(doc, { a: { x: "one", y: "2" }, z: "3" });
});

test("everything outside the subset still throws", () => {
  refuses("a: {b: 1}\n", /flow mappings/);
  refuses("a: [1, 2]\n", /flow sequences/);
  refuses("a: 1\na: 2\n", /duplicate key/);
  refuses("a:\n   b: 1\n", /multiple of 2/);
  refuses("a:\n\tb: 1\n", /tabs/);
});

test("a policy whose attestation reasons at length, with double quotes, passes `math-standards policy`", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mathstd-yaml-"));
  const file = path.join(dir, "project-policy.yml");
  await writeFile(
    file,
    [
      'standardVersion: "1.0.0"',
      'project: "t"',
      "attestations:",
      "  rigor.unjustified-division:",
      "    status: approved",
      '    reviewedBy: "me"',
      '    reviewedAt: "2026-01-15"',
      "    evidence: >-",
      '      Checked every cancellation in proofs/clm-0002.md; each "denominator" is non-vanishing',
      "      on the stated domain by Lemma CLM-0005 (see #7).",
      "",
      "      Second paragraph: the case x = 0 is handled separately in section 4.",
      "",
    ].join("\n"),
    "utf8",
  );
  try {
    const result = await checkPolicy(file, SCHEMA, "2026-08-09");
    assert.equal(result.status, "ok", JSON.stringify(result.errors));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
