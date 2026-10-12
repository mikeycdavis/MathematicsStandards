#!/usr/bin/env node
// Reproduces artifacts/adoption/sibling-yaml-reader-inventory.md.
//
//   node artifacts/adoption/sibling-yaml-reader-probe.mjs <empty scratch directory>
//
// Needs `gh` (authenticated) and `node`. For each repository in the table it fetches
// scripts/yaml.mjs at the recorded commit (not the current branch head), compares the git blob id
// with the recorded one, parses the same documents with the file's `parseYaml`, and compares each
// result (the parsed value, or the error message) with the exact result the inventory records for
// that family. It then compares the files' code: the C rows must be one body, and the H row must
// differ from it by exactly the `{}` branch and nothing else. The StandardsEnforcer row must have no
// such file. It exits 0 only when every recorded value is reproduced, and lists each difference
// otherwise. A final self-test applies deliberate alterations to the collected results and requires
// the checks to notice every one of them, so a probe that cannot fail is reported as broken.
//
// "Normalized" code, used for every code comparison below, is the file with block comments
// (/* ... */) removed, everything from `//` to the end of the line removed, trailing whitespace
// removed and blank lines dropped. Indentation and every other character are kept. The `//` rule is
// crude (it also cuts a `//` inside a string), but it is applied identically to every file, so equal
// normalized code means equal code apart from comments and blank lines.
//
// This file is a record, not part of the standards toolchain: nothing imports it and no gate runs it.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OWNER = "mikeycdavis";

// repository, recorded commit, recorded blob id (first twelve characters), recorded family.
const ROWS = [
  ["MathematicsStandards", "9dc7f4755b7bcf70ee04b112cabdafcd929dde15", "e431d60e0005", "M"],
  ["BettingStandards", "8601662a85ff1963ba99bd512f575680a716d15e", "dbc8b72fb4c1", "C"],
  ["StandardsOrchestrator", "91c065c245c545894e929668043d4050959e019e", "dbc8b72fb4c1", "C"],
  ["EngineeringStandards", "e341dba472110ff9e85d8cd3fae0fce60d83a31f", "abc2b9ff6515", "C"],
  ["FinancialStandards", "91ae2d7437b270dbb5a56cac7f623aeb5ef59929", "f52fc6364fad", "C"],
  ["PredictionStandards", "88cad415232245a54091530c1b549431d2831841", "edec30238a34", "C"],
  ["InnovationStandards", "e39fdfb59c3f99ba4e4d4c0592692f0451a3333c", "3604106b367a", "C"],
  ["MachineLearningStandards", "0a389fde0f584939225e32c5f78924298e97ebed", "4f4f208af6b2", "C"],
  ["UIUXDesignStandards", "19b13fec9f8b8a088a6bc0ae57c30d1b0520727d", "75caec7ee218", "C"],
  ["HealthAndFitnessAndNutritionStandards", "b23d43d0a08d0b25e0d81085f5b64f879e9a1f14", "2c0cd13c2f11", "H"],
  ["AIStandards", "de149bfa260b65461a01b5aa22d950fb8a97754c", "15aa4e978724", "Z"],
  ["StandardsEnforcer", "d1bc8e054e6743cffe3bcc65d6d599ccd270ffb1", null, "absent"],
];

const CASES = {
  literal: 'evidence: |\n  line "one"\n  line two\nnext: x\n',
  literalStrip: "evidence: |-\n  a\n  b\nnext: x\n",
  folded: "evidence: >\n  a\n  b\nnext: x\n",
  foldedStrip: "evidence: >-\n  a\n  b\nnext: x\n",
  keep: "evidence: |+\n  a\n\nnext: x\n",
  nested: "a:\n  evidence: |\n    x\n    y\n  b: 1\n",
  inList: "items:\n  - note: |\n      x\n    id: 1\n",
  oneline: "evidence: plain\nnext: x\n",
  emptyFlowSeq: "a: []\n",
  emptyFlowMap: "a: {}\n",
};

// The exact result recorded for each family and document: { ok: true, value: <JSON> } for a parsed
// value, { ok: false, value: <message> } for a refusal.
const ok = (json) => ({ ok: true, value: JSON.stringify(json) });
const refused = (message) => ({ ok: false, value: message });
const sharedPlain = {
  oneline: ok({ evidence: "plain", next: "x" }),
  emptyFlowSeq: ok({ a: [] }),
};
const blockRefusedC = {
  literal: refused("line 1: block scalars are not supported"),
  literalStrip: refused("line 1: block scalars are not supported"),
  folded: refused("line 1: block scalars are not supported"),
  foldedStrip: refused("line 1: block scalars are not supported"),
  keep: refused("line 1: block scalars are not supported"),
  nested: refused("line 2: block scalars are not supported"),
  inList: refused("line 2: block scalars are not supported"),
};
const EXPECTED = {
  M: {
    literal: ok({ evidence: 'line "one"\nline two\n', next: "x" }),
    literalStrip: ok({ evidence: "a\nb", next: "x" }),
    folded: ok({ evidence: "a b\n", next: "x" }),
    foldedStrip: ok({ evidence: "a b", next: "x" }),
    keep: refused("line 1: keep chomping (`+`) on a block scalar is not supported; use `-` or none"),
    nested: ok({ a: { evidence: "x\ny\n", b: "1" } }),
    inList: ok({ items: [{ note: "x\n", id: "1" }] }),
    ...sharedPlain,
    emptyFlowMap: refused("line 1: flow mappings are not supported"),
  },
  C: { ...blockRefusedC, ...sharedPlain, emptyFlowMap: refused("line 1: flow mappings are not supported") },
  H: { ...blockRefusedC, ...sharedPlain, emptyFlowMap: ok({ a: {} }) },
  Z: {
    literal: refused("line 2: unexpected indentation inside a mapping"),
    literalStrip: refused("line 2: unexpected indentation inside a mapping"),
    folded: refused("line 2: unexpected indentation inside a mapping"),
    foldedStrip: refused("line 2: unexpected indentation inside a mapping"),
    keep: refused("line 2: unexpected indentation inside a mapping"),
    nested: refused("line 3: unexpected indentation inside a mapping"),
    inList: refused("line 3: unexpected indentation inside a sequence"),
    ...sharedPlain,
    emptyFlowMap: ok({ a: {} }),
  },
};

// The only code difference recorded between family C and family H, in normalized code: the single
// `{` line of C is replaced by the block that accepts exactly `{}`.
const H_DIFF = {
  removed: ['  if (first === "{") throw new YamlError("flow mappings are not supported", lineNo);'],
  added: [
    '  if (first === "{") {',
    '    if (value.replace(/\\s/g, "") !== "{}") {',
    '      throw new YamlError("flow mappings with content are not supported", lineNo);',
    "    }",
    "    return {};",
    "  }",
  ],
};

const normalize = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line !== "");

// The differing region between two line arrays: the longest common prefix and suffix are removed.
function lineDiff(a, b) {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  return { removed: a.slice(head, a.length - tail), added: b.slice(head, b.length - tail) };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// All checks, over collected results. Returns the list of differences (empty means reproduced).
function evaluate(results) {
  const problems = [];
  for (const [repo] of ROWS) {
    if (!results.some((r) => r.repo === repo)) problems.push(`${repo}: no result was collected for this row`);
  }
  for (const r of results) {
    if (r.family === "absent") {
      if (!r.absent) problems.push(`${r.repo}: expected no scripts/yaml.mjs at the recorded commit`);
      continue;
    }
    if (!r.blob.startsWith(r.recordedBlob)) {
      problems.push(`${r.repo}: blob ${r.blob.slice(0, 12)} differs from recorded ${r.recordedBlob}`);
    }
    for (const [name, want] of Object.entries(EXPECTED[r.family])) {
      const got = r.probe[name];
      if (!got || got.ok !== want.ok || got.value !== want.value) {
        const show = (x) => (x ? `${x.ok ? "accepted" : "refused"} ${x.value}` : "nothing");
        problems.push(`${r.repo} (${r.family}) ${name}: expected ${show(want)}; got ${show(got)}`);
      }
    }
  }
  const present = results.filter((r) => r.family !== "absent");
  const family = (f) => present.filter((r) => r.family === f);
  const c = family("C");
  const h = family("H");
  const z = family("Z");
  if (c.length === 0) return problems; // the code comparisons need a family C row; its absence is reported above
  for (const r of c.slice(1)) {
    if (!same(r.source, c[0].source)) problems.push(`${r.repo}: normalized code differs from ${c[0].repo}`);
  }
  for (const r of h) {
    const diff = lineDiff(c[0].source, r.source);
    if (!same(diff, H_DIFF)) {
      problems.push(
        `${r.repo}: code differs from family C by more or other than the {} branch: ` +
          `removed ${JSON.stringify(diff.removed)}, added ${JSON.stringify(diff.added)}`,
      );
    }
  }
  for (const r of z) {
    if (same(r.source, c[0].source)) problems.push(`${r.repo}: expected code different from family C`);
  }
  return problems;
}

// Deliberate alterations of otherwise-reproduced results; each must be noticed by `evaluate`.
function selfTest(results) {
  const clone = () => JSON.parse(JSON.stringify(results));
  const find = (rs, repo) => rs.find((r) => r.repo === repo);
  const mutations = [
    ["H returns {} as a string", (rs) => (find(rs, "HealthAndFitnessAndNutritionStandards").probe.emptyFlowMap.value = '"{}"')],
    ["a C refusal message changes", (rs) => (find(rs, "BettingStandards").probe.literal.value = "line 1: something else")],
    ["Z refuses with another message", (rs) => (find(rs, "AIStandards").probe.nested.value = "line 3: other")],
    ["a sibling accepts a block scalar", (rs) => (find(rs, "FinancialStandards").probe.folded = { ok: true, value: '{"evidence":"a b\\n"}' })],
    ["M accepts keep chomping", (rs) => (find(rs, "MathematicsStandards").probe.keep = { ok: true, value: "{}" })],
    ["M accepts {}", (rs) => (find(rs, "MathematicsStandards").probe.emptyFlowMap = { ok: true, value: "{}" })],
    ["M returns wrong block content", (rs) => (find(rs, "MathematicsStandards").probe.literal.value = '{"evidence":"x"}')],
    ["a plain scalar parses wrongly", (rs) => (find(rs, "EngineeringStandards").probe.oneline.value = '{"evidence":"other"}')],
    ["H code gains an unrelated line", (rs) => find(rs, "HealthAndFitnessAndNutritionStandards").source.push("  extra();")],
    ["H changes inside the {} branch", (rs) => {
      const s = find(rs, "HealthAndFitnessAndNutritionStandards").source;
      s[s.indexOf("    return {};")] = "    return null;";
    }],
    ["a C row differs by one line", (rs) => find(rs, "InnovationStandards").source.push("  other();")],
    ["Z code equals C", (rs) => (find(rs, "AIStandards").source = [...find(rs, "BettingStandards").source])],
    ["a blob id differs", (rs) => (find(rs, "PredictionStandards").blob = "0".repeat(40))],
    ["StandardsEnforcer has the file", (rs) => (find(rs, "StandardsEnforcer").absent = false)],
  ];
  const failures = [];
  if (results.length !== ROWS.length) return { failures: ["results are incomplete; self-test skipped"], total: mutations.length };
  if (evaluate(clone()).length !== 0) failures.push("the unaltered results do not pass");
  for (const [name, alter] of mutations) {
    const copy = clone();
    alter(copy);
    if (evaluate(copy).length === 0) failures.push(`not noticed: ${name}`);
  }
  return { failures, total: mutations.length };
}

const outDir = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!outDir) {
  console.error("usage: node sibling-yaml-reader-probe.mjs <empty scratch directory>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
if (readdirSync(outDir).length > 0) {
  console.error(`refusing to use a non-empty directory: ${outDir}`);
  process.exit(2);
}

// A fetcher has two lookups, both returning { status, body, error }: `commit` asks whether the
// pinned repository and revision are accessible at all, and `file` fetches scripts/yaml.mjs at it.
// A 404 on the file means "absent" only when the commit lookup succeeded: GitHub also answers 404
// for a repository or revision the token cannot see, so a path-level 404 alone proves nothing.
function ghCall(args) {
  const result = spawnSync("gh", ["api", ...args], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 });
  return { status: result.status, body: result.stdout, error: String(result.stderr ?? "") };
}
const ghFetcher = {
  commit: (repo, sha) => ghCall([`repos/${OWNER}/${repo}/commits/${sha}`, "--jq", ".sha"]),
  file: (repo, sha) =>
    ghCall([`repos/${OWNER}/${repo}/contents/scripts/yaml.mjs?ref=${sha}`, "-H", "Accept: application/vnd.github.raw"]),
};

const gitBlobId = (bytes) =>
  createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");

// Fetch every row with `fetcher`, write each file under `dir` and probe it. A row that cannot be
// fetched or imported is recorded in `fetchProblems` and left out of `results`; nothing here throws
// for such a row, so the caller always reaches its report.
async function collect(fetcher, dir) {
  const results = [];
  const fetchProblems = [];
  const call = (which, repo, sha) => {
    try {
      return fetcher[which](repo, sha);
    } catch (error) {
      return { status: 1, body: Buffer.alloc(0), error: String(error?.message ?? error) };
    }
  };
  for (const [repo, sha, recordedBlob, family] of ROWS) {
    const commit = call("commit", repo, sha);
    if (commit.status !== 0) {
      fetchProblems.push(`${repo}: could not access commit ${sha}: ${commit.error.trim() || "no response"}`);
      continue;
    }
    const got = call("file", repo, sha);
    if (family === "absent") {
      const missing = got.status !== 0 && /404|Not Found/i.test(got.error);
      if (got.status !== 0 && !missing) fetchProblems.push(`${repo}: fetch failed for another reason: ${got.error.trim()}`);
      if (got.status === 0) results.push({ repo, family, absent: false });
      else if (missing) results.push({ repo, family, absent: true });
      continue;
    }
    if (got.status !== 0) {
      fetchProblems.push(`${repo}: could not fetch scripts/yaml.mjs at ${sha}: ${got.error.trim()}`);
      continue;
    }
    try {
      const file = path.resolve(dir, `${repo}.mjs`);
      writeFileSync(file, got.body);
      const mod = await import(pathToFileURL(file).href);
      const probe = {};
      for (const [name, doc] of Object.entries(CASES)) {
        try {
          probe[name] = { ok: true, value: JSON.stringify(mod.parseYaml(doc)) };
        } catch (error) {
          probe[name] = { ok: false, value: String(error.message) };
        }
      }
      results.push({ repo, family, recordedBlob, blob: gitBlobId(got.body), probe, source: normalize(got.body.toString("utf8")) });
    } catch (error) {
      fetchProblems.push(`${repo}: the fetched file could not be loaded: ${String(error?.message ?? error).split("\n")[0]}`);
    }
  }
  return { results, fetchProblems };
}

// `--simulate-fetch-failure=<Repository>` makes that repository's commit lookup fail, to exercise the
// failure path of this script.
const simulate = process.argv.find((a) => a.startsWith("--simulate-fetch-failure="))?.split("=")[1];
const bodies = new Map(); // repository -> bytes, kept so the fetch self-tests need no network
const recordingFetcher = {
  commit: (repo, sha) =>
    repo === simulate ? { status: 1, body: Buffer.alloc(0), error: "simulated fetch failure" } : ghFetcher.commit(repo, sha),
  file: (repo, sha) => {
    const got = ghFetcher.file(repo, sha);
    if (got.status === 0) bodies.set(repo, got.body);
    return got;
  },
};
const { results, fetchProblems } = await collect(recordingFetcher, outDir);

const problems = [...fetchProblems, ...evaluate(results)];

console.log("repository".padEnd(40), "blob".padEnd(13), "fam", "literal ", "|+      ", "{}");
for (const r of results) {
  if (r.family === "absent") {
    console.log(r.repo.padEnd(40), "(no scripts/yaml.mjs at the recorded commit)");
    continue;
  }
  console.log(
    r.repo.padEnd(40),
    r.blob.slice(0, 12).padEnd(13),
    r.family.padEnd(3),
    (r.probe.literal.ok ? "accepted" : "refused ").padEnd(8),
    (r.probe.keep.ok ? "accepted" : "refused ").padEnd(8),
    r.probe.emptyFlowMap.ok ? "accepted" : "refused",
  );
}

const test = selfTest(results);
if (results.length === ROWS.length && fetchProblems.length === 0) {
  // Fetch paths, with injected fetchers. Every case must complete without throwing:
  //   one file fetch fails          -> that failure is reported and the row is flagged missing;
  //   a commit lookup 404s (absent row) -> NOT reproduced (a path 404 there proves nothing);
  //   a commit lookup 404s (present row) -> reported and the row is flagged missing;
  //   commit 200 and file 404 (absent row) -> accepted as absent, no problem at all.
  const dir = path.join(outDir, "_failure-selftest");
  mkdirSync(dir, { recursive: true });
  const served = (repo) => ({
    status: bodies.has(repo) ? 0 : 1,
    body: bodies.get(repo) ?? Buffer.alloc(0),
    error: bodies.has(repo) ? "" : "Not Found (HTTP 404)",
  });
  const commitOk = () => ({ status: 0, body: Buffer.alloc(0), error: "" });
  const commit404 = () => ({ status: 1, body: Buffer.alloc(0), error: "Not Found (HTTP 404)" });
  const scenarios = [
    ["a file fetch fails", { commit: commitOk, file: (r) => (r === "BettingStandards" ? { status: 1, body: Buffer.alloc(0), error: "injected failure" } : served(r)) },
      (o) => o.some((p) => p.startsWith("BettingStandards: could not fetch")) && o.some((p) => p.startsWith("BettingStandards: no result was collected"))],
    ["commit lookup 404 for the absent row", { commit: (r) => (r === "StandardsEnforcer" ? commit404() : commitOk()), file: served },
      (o) => o.some((p) => p.startsWith("StandardsEnforcer: could not access commit")) && o.some((p) => p.startsWith("StandardsEnforcer: no result was collected"))],
    ["commit lookup 404 for a present row", { commit: (r) => (r === "AIStandards" ? commit404() : commitOk()), file: served },
      (o) => o.some((p) => p.startsWith("AIStandards: could not access commit")) && o.some((p) => p.startsWith("AIStandards: no result was collected"))],
    ["commit 200 and file 404 for the absent row", { commit: commitOk, file: served }, (o) => o.length === 0],
  ];
  for (const [name, fetcher, expected] of scenarios) {
    test.total += 1;
    try {
      const sub = await collect(fetcher, dir);
      if (!expected([...sub.fetchProblems, ...evaluate(sub.results)])) test.failures.push(`fetch scenario not handled: ${name}`);
    } catch (error) {
      test.failures.push(`fetch scenario threw (${name}): ${error?.message ?? error}`);
    }
  }
}
for (const failure of test.failures) problems.push(`self-test: ${failure}`);

if (problems.length > 0) {
  console.log("\nNOT REPRODUCED:");
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log("\nEvery recorded value was reproduced.");
console.log(`Self-test: every one of ${test.total} deliberate alterations was noticed.`);
