#!/usr/bin/env node
/**
 * Generates test/fixtures/yaml-pre-109-corpus.json (FE-32, GitHub #63, criterion C10).
 *
 * The corpus is a set of YAML inputs that the policy reader ACCEPTED before PR #109 added block
 * scalars, each with the value that reader returned. The reader is read from git history, never
 * vendored: this script runs `git show 0288fce:scripts/yaml.mjs` (the main commit immediately before
 * the merge of #109), imports that copy from a temporary file, parses every input with it, and keeps
 * only the inputs it accepted. test/yaml-corpus.test.mjs then asserts the current reader returns the
 * same value for every one of them.
 *
 *   node test/fixtures/generate-yaml-pre-109-corpus.mjs     (run from the repository root)
 *
 * Inputs: the hand-written cases below, plus every project-policy.yml and
 * templates/project-policy.yml as they were at that commit (so real files are covered at their
 * pre-change text). The output is committed; this script only needs re-running if the corpus
 * should change, and it requires a clone with the full history.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ORACLE = "0288fce";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const handWritten = {
  "bare scalars": "a: 1\nb: hello world\nc: 2026-12-31\n",
  "double quoted": 'a: "x: y # not a comment"\nb: "say hi"\n',
  "single quoted": "a: 'it is'\nb: 'x # y'\n",
  "indicator characters inside quoted and bare values": 'a: "|"\nb: ">"\nc: x>y\nd: a|b\ne: "- item"\n',
  "comments and blank lines": "# top\n\na: 1 # trailing\n\n  # indented comment\nb: 2\n",
  "nested mappings": "a:\n  b:\n    c: 1\n  d: 2\ne: 3\n",
  "sequence of mappings": "items:\n  - id: one\n    v: 1\n  - id: two\n    v: 2\n",
  "empty inline sequence": "a: []\nb: 1\n",
  "empty value": "a:\nb: 1\n",
  "colon in quoted key value": 'url: "https://example.org/x?y=1"\n',
  "CRLF document": "a: 1\r\nb:\r\n  c: two\r\n",
  "no final newline": "a: 1\nb: 2",
  "quoted string ending in indicator-like text": 'reason: "reviewed; see > below"\n',
  "key that looks like a block header word": "literal: yes\nfolded: no\n",
};

const tmp = mkdtempSync(path.join(tmpdir(), "yaml-oracle-"));
try {
  const file = path.join(tmp, "old-yaml.mjs");
  writeFileSync(file, git("show", `${ORACLE}:scripts/yaml.mjs`));
  const { parseYaml } = await import(pathToFileURL(file).href);

  const inputs = { ...handWritten };
  const files = git("ls-tree", "-r", "--name-only", ORACLE).split("\n")
    .filter((f) => /(^|\/)project-policy\.yml$/.test(f));
  for (const f of files) inputs[`${ORACLE}:${f}`] = git("show", `${ORACLE}:${f}`);

  const cases = [];
  const refused = [];
  for (const [name, input] of Object.entries(inputs)) {
    try {
      cases.push({ name, input, expected: parseYaml(input) });
    } catch (error) {
      refused.push(`${name}: ${error.message}`);
    }
  }
  const out = { oracle: `scripts/yaml.mjs at ${git("rev-parse", ORACLE).trim()}`, cases };
  writeFileSync("test/fixtures/yaml-pre-109-corpus.json", JSON.stringify(out, null, 2) + "\n");
  process.stdout.write(`${cases.length} accepted by the oracle, ${refused.length} refused (not in the corpus)\n`);
  for (const r of refused) process.stdout.write(`  refused: ${r}\n`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
