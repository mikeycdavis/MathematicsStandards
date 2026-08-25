/**
 * Mutation checks: reintroduce the defect each gate exists to catch, and confirm the gate FAILS.
 *
 * A check whose failure path can be stepped around by the very edit it guards against is worse than
 * no check, because it reports green. Each mutation is applied, the gate is run, and the file is
 * restored — the restore is in a finally block, so a failing assertion cannot leave the repository
 * mutated.
 *
 * WHY THIS IS NOT PART OF `npm test`. It writes to tracked files. That is safe here and is undone
 * immediately, but a suite that mutates the working tree should be something a person runs
 * deliberately, not something that fires on every save. Run it after changing a gate, a detector, or
 * the comment-stripping logic:
 *
 *   npm run mutation-check
 *
 * It has already earned its place twice. It found that `'` was being treated as a string delimiter
 * in Lean sources, so the first primed identifier — `sq_nonneg'`, and primes are everywhere in
 * mathematics — blanked the rest of the file out of the structural view and the placeholder detector
 * reported clean. That is a false green produced by the machinery that exists to prevent false
 * greens, and no ordinary test would have found it: every existing test asserted that something did
 * NOT fire, which the bug satisfied perfectly.
 */
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(script, args = []) {
  try {
    execFileSync(process.execPath, [path.join(HOME, "scripts", script), ...args], {
      cwd: HOME,
      encoding: "utf8",
      stdio: "pipe",
    });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
}

function runTest(file) {
  try {
    execFileSync(process.execPath, ["--test", `test/${file}`], { cwd: HOME, encoding: "utf8", stdio: "pipe" });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
}

/**
 * The advertised attacks, as data.
 *
 * Exported so that `test/mutation-targets.test.mjs` can assert every one of them still reaches its
 * target without running the suite. That test is the falsifier for the failure this list actually
 * suffered: inside the CI container two of these searched for a string the tree did not contain and
 * reported SETUP FAILED, so the inventory and fidelity gates went unattacked while the command that
 * attacks them reported four passes. A suite that can silently stop reaching two of its six targets
 * needs a check on its own reach, and it must be a check that runs where the suite runs.
 *
 * The anchors here are deliberately literal — including the newlines. They are not to be loosened to
 * tolerate other line endings: the tree they run against is guaranteed byte-identical to the commit
 * (scripts/tree-fidelity.mjs), and a mutator that matched either ending would hide the day that
 * stops being true.
 */
export const MUTATIONS = Object.freeze([
// 1. Renumber a spec item. The inventory must notice the series changed shape.
Object.freeze({
  name: "inventory: renumber a derived-spec item",
  file: "artifacts/prompts/mathematics-standards-spec.md",
  from: "\n13. Symbolic Manipulation\n",
  to: "\n14. Symbolic Manipulation\n",
  gate: () => run("inventory.mjs"),
}),

// 2. Edit one character inside a block claimed as verbatim source.
Object.freeze({
  name: "fidelity: alter a quotation claimed as verbatim",
  file: "standards/20-must-never-rules.md",
  from: "- hide an unproved assumption\n",
  to: "- hide an unproven assumption\n",
  gate: () => run("fidelity.mjs"),
}),

// 3. A camelCase rule id. The catalog must refuse to load rather than normalise it.
Object.freeze({
  name: "catalog: introduce a camelCase rule id",
  file: "rules/claims.json",
  from: '"id": "claims.silent-promotion"',
  to: '"id": "claims.silentPromotion"',
  gate: () => runTest("policy.test.mjs"),
}),

// 4. Move `sorry` out of a Lean comment and into live code. The use-versus-mention regression must
//    now fire — this is the check that proves the comment-stripping is real and not incidental.
Object.freeze({
  name: "detector: turn a mentioned `sorry` into a used one",
  file: "test/fixtures/math-compliant/formal/Clean.lean",
  from: "  exact mul_self_nonneg x",
  to: "  sorry",
  gate: () => runTest("audit.test.mjs"),
}),

// 5. Edit a source prompt. Fidelity would still pass — the digest is what catches it.
Object.freeze({
  name: "provenance: edit a source document",
  file: "artifacts/prompt/original-prompt.md",
  from: "* hide an unproved assumption",
  to: "* hide an unproved assumption (unless time-constrained)",
  gate: () => runTest("audit.test.mjs"),
}),

// 6. Remove the attribute that makes a checkout preserve committed line endings. This is the defect
//    EP-12 was opened for: without it, `git worktree add` transcribes the commit on the way into the
//    CI image, and two of the mutations above stop reaching their gate while reporting nothing.
Object.freeze({
  name: "tree fidelity: drop the global eol=lf attribute",
  file: ".gitattributes",
  from: "\n* text=auto eol=lf\n",
  to: "\n# * text=auto eol=lf\n",
  gate: () => runTest("tree-fidelity.test.mjs"),
}),

// 7. Remove the export-boundary check itself. The attribute is a file and can be edited away, so the
//    guarantee is asserted at the boundary too; this proves the assertion is load-bearing rather than
//    decorative.
Object.freeze({
  name: "tree fidelity: stop comparing the export to the commit",
  file: "scripts/ci.mjs",
  from: "    const drift = commitToTreeDrift(ROOT, target.commit, target.worktree);",
  to: "    const drift = [];",
  gate: () => runTest("tree-fidelity.test.mjs"),
}),

// 8. Point a mutation at a string its target does not contain. The suite's reach must be checked by
//    something other than the suite, or the day it goes blind is the day nothing says so.
Object.freeze({
  name: "mutation reach: aim an attack at a string that is not there",
  file: "scripts/mutation-check.mjs",
  from: "  from: \"  exact mul_self_nonneg x\",",
  to: "  from: \"  exact mul_self_nonneg_typo x\",",
  gate: () => runTest("mutation-targets.test.mjs"),
}),
]);

/**
 * Apply one mutation, run its gate, restore the file.
 *
 * The restore is in a `finally`, so a failing gate cannot leave the tree mutated. The reachability
 * test happens before any write: a target that cannot be found is reported as a setup failure rather
 * than as a passing gate, because a mutation that never landed proves nothing about the gate it was
 * aimed at.
 */
async function mutate({ name, file, from, to, gate, expectFail = true }, results) {
  const full = path.join(HOME, file);
  const original = await readFile(full, "utf8");
  if (!original.includes(from)) {
    results.push({ name, outcome: "SETUP FAILED — mutation target not found" });
    return;
  }
  try {
    await writeFile(full, original.replace(from, to), "utf8");
    const code = gate();
    const failed = code !== 0;
    results.push({
      name,
      outcome:
        failed === expectFail
          ? `PASS — the gate ${failed ? "failed" : "passed"} as expected (exit ${code})`
          : `FAIL — the gate did NOT react (exit ${code})`,
    });
  } finally {
    await writeFile(full, original, "utf8");
  }
}

async function main() {
  const results = [];
  for (const mutation of MUTATIONS) await mutate(mutation, results);

  // Control: with no mutation, every gate is green. A mutation suite that never passes proves
  // nothing about the mutations.
  results.push({
    name: "control: unmutated repository",
    outcome:
      run("inventory.mjs") === 0 && run("fidelity.mjs") === 0 && runTest("audit.test.mjs") === 0
        ? "PASS — all gates green when nothing is wrong"
        : "FAIL — a gate is red without any mutation",
  });

  for (const r of results) console.log(`${r.outcome.startsWith("PASS") ? "  ok" : "FAIL"}  ${r.name}
      ${r.outcome}`);
  process.exit(results.every((r) => r.outcome.startsWith("PASS")) ? 0 : 1);
}

// Importable without running: `test/mutation-targets.test.mjs` reads MUTATIONS to prove every attack
// still reaches its target, and a suite that mutates tracked files on import would be intolerable.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
