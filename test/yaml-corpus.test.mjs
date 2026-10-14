/**
 * Before/after corpus for the policy reader (FE-32, GitHub #63, criterion C10): input the reader
 * accepted before block scalars were added (PR #109) parses to the same value now.
 *
 * The expected values are a committed fixture, test/fixtures/yaml-pre-109-corpus.json, computed once
 * from the pre-#109 reader (scripts/yaml.mjs at 0288fce, read from git history and not vendored)
 * by test/fixtures/generate-yaml-pre-109-corpus.mjs. To regenerate, from a full clone:
 *
 *   node test/fixtures/generate-yaml-pre-109-corpus.mjs
 *
 * The corpus holds only inputs the old reader accepted; it makes no claim about inputs it refused.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseYaml } from "../scripts/yaml.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(readFileSync(path.join(HERE, "fixtures/yaml-pre-109-corpus.json"), "utf8"));

test("the corpus is non-trivial and includes the repository's real policy files", () => {
  assert.match(corpus.oracle, /^scripts\/yaml\.mjs at [0-9a-f]{40}$/);
  assert.ok(corpus.cases.length >= 30, `corpus has ${corpus.cases.length} cases`);
  assert.ok(corpus.cases.some((c) => /project-policy\.yml$/.test(c.name)), "no real policy file in the corpus");
  assert.ok(corpus.cases.some((c) => c.input.includes("\r\n")), "no CRLF case in the corpus");
});

for (const { name, input, expected } of corpus.cases) {
  test(`input the pre-#109 reader accepted parses to the same value: ${name}`, () => {
    assert.deepEqual(parseYaml(input), expected);
  });
}
