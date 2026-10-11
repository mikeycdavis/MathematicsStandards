#!/usr/bin/env node
// Reproduces artifacts/adoption/sibling-yaml-reader-inventory.md.
//
//   node artifacts/adoption/sibling-yaml-reader-probe.mjs <empty scratch directory>
//
// Needs `gh` (authenticated) and `node`. For each repository in the table it fetches
// scripts/yaml.mjs at the recorded commit (not the current branch head), compares the git blob id
// with the recorded one, probes the file's `parseYaml` with the same documents, groups the files by
// code with comments and blank lines stripped, and checks the StandardsEnforcer row (no such file).
// It exits 0 only when every recorded value is reproduced, and prints each difference otherwise.
//
// This file is a record, not part of the standards toolchain: nothing imports it and no gate runs it.
// The comment stripping is deliberately crude (it also cuts "//" inside strings); it is applied the
// same way to every file, so equal results mean equal code, and a difference means a difference.

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
const BLOCK_CASES = ["literal", "literalStrip", "folded", "foldedStrip", "keep", "nested", "inList"];

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node sibling-yaml-reader-probe.mjs <empty scratch directory>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
if (readdirSync(outDir).length > 0) {
  console.error(`refusing to use a non-empty directory: ${outDir}`);
  process.exit(2);
}

const problems = [];
const note = (message) => problems.push(message);

function fetchRaw(repo, sha) {
  const result = spawnSync(
    "gh",
    ["api", `repos/${OWNER}/${repo}/contents/scripts/yaml.mjs?ref=${sha}`, "-H", "Accept: application/vnd.github.raw"],
    { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 },
  );
  return { status: result.status, body: result.stdout, error: String(result.stderr ?? "") };
}

const gitBlobId = (bytes) =>
  createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");

const stripped = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line !== "")
    .join("\n");

const results = [];
for (const [repo, sha, recordedBlob, family] of ROWS) {
  const got = fetchRaw(repo, sha);
  if (family === "absent") {
    if (got.status === 0) note(`${repo}: expected no scripts/yaml.mjs at ${sha}, but one exists`);
    else if (!/404|Not Found/i.test(got.error)) note(`${repo}: fetch failed for another reason: ${got.error.trim()}`);
    results.push({ repo, family, absent: got.status !== 0 });
    continue;
  }
  if (got.status !== 0) {
    note(`${repo}: could not fetch scripts/yaml.mjs at ${sha}: ${got.error.trim()}`);
    continue;
  }
  const file = path.resolve(outDir, `${repo}.mjs`);
  writeFileSync(file, got.body);
  const blob = gitBlobId(got.body);
  if (!blob.startsWith(recordedBlob)) note(`${repo}: blob ${blob.slice(0, 12)} differs from recorded ${recordedBlob}`);
  const mod = await import(pathToFileURL(file).href);
  const probe = {};
  for (const [name, doc] of Object.entries(CASES)) {
    try {
      probe[name] = { ok: true, value: JSON.stringify(mod.parseYaml(doc)) };
    } catch (error) {
      probe[name] = { ok: false, value: String(error.message) };
    }
  }
  results.push({
    repo,
    family,
    blob: blob.slice(0, 12),
    probe,
    code: createHash("sha256").update(stripped(got.body.toString("utf8"))).digest("hex").slice(0, 12),
  });
}

const present = results.filter((r) => !r.absent && r.probe);

// What each family is recorded to do.
for (const r of present) {
  if (r.family === "M") {
    for (const name of ["literal", "literalStrip", "folded", "foldedStrip", "nested", "inList"]) {
      if (!r.probe[name].ok) note(`${r.repo}: expected ${name} to be accepted`);
    }
    if (r.probe.keep.ok) note(`${r.repo}: expected keep chomping (|+) to be refused`);
    continue;
  }
  for (const name of BLOCK_CASES) {
    if (r.probe[name].ok) note(`${r.repo}: expected ${name} to be refused, it was accepted`);
  }
  if (!r.probe.oneline.ok) note(`${r.repo}: expected a plain scalar to parse`);
  const wantsEmptyMap = r.family === "H" || r.family === "Z";
  if (r.probe.emptyFlowMap.ok !== wantsEmptyMap) {
    note(`${r.repo}: expected {} to be ${wantsEmptyMap ? "accepted" : "refused"}`);
  }
}

// Family grouping: the C rows share one code hash; H and Z each differ from it and from each other.
const byFamily = (f) => present.filter((r) => r.family === f);
const cCodes = new Set(byFamily("C").map((r) => r.code));
if (cCodes.size !== 1) note(`family C is not one code body: ${[...cCodes].join(", ")}`);
const [cCode] = cCodes;
for (const f of ["H", "Z"]) {
  for (const r of byFamily(f)) {
    if (r.code === cCode) note(`${r.repo}: expected code different from family C`);
  }
}
const hCode = byFamily("H")[0]?.code;
const zCode = byFamily("Z")[0]?.code;
if (hCode && hCode === zCode) note("families H and Z have identical code; expected them to differ");

console.log("repository".padEnd(40), "blob".padEnd(13), "fam", "code".padEnd(13), "literal", "|+", "{}");
for (const r of results) {
  if (r.absent) {
    console.log(r.repo.padEnd(40), "(no scripts/yaml.mjs at the recorded commit)");
    continue;
  }
  console.log(
    r.repo.padEnd(40),
    r.blob.padEnd(13),
    r.family.padEnd(3),
    r.code.padEnd(13),
    (r.probe.literal.ok ? "accepted" : "refused").padEnd(8),
    (r.probe.keep.ok ? "accepted" : "refused").padEnd(8),
    r.probe.emptyFlowMap.ok ? "accepted" : "refused",
  );
}

if (problems.length > 0) {
  console.log("\nNOT REPRODUCED:");
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log("\nEvery recorded value was reproduced.");
