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

const results = [];

async function mutate({ name, file, from, to, gate, expectFail = true }) {
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
      outcome: failed === expectFail ? `PASS — the gate ${failed ? "failed" : "passed"} as expected (exit ${code})` : `FAIL — the gate did NOT react (exit ${code})`,
    });
  } finally {
    await writeFile(full, original, "utf8");
  }
}

// 1. Renumber a spec item. The inventory must notice the series changed shape.
await mutate({
  name: "inventory: renumber a derived-spec item",
  file: "artifacts/prompts/mathematics-standards-spec.md",
  from: "\n13. Symbolic Manipulation\n",
  to: "\n14. Symbolic Manipulation\n",
  gate: () => run("inventory.mjs"),
});

// 2. Edit one character inside a block claimed as verbatim source.
await mutate({
  name: "fidelity: alter a quotation claimed as verbatim",
  file: "standards/20-must-never-rules.md",
  from: "- hide an unproved assumption\n",
  to: "- hide an unproven assumption\n",
  gate: () => run("fidelity.mjs"),
});

// 3. A camelCase rule id. The catalog must refuse to load rather than normalise it.
await mutate({
  name: "catalog: introduce a camelCase rule id",
  file: "rules/claims.json",
  from: '"id": "claims.silent-promotion"',
  to: '"id": "claims.silentPromotion"',
  gate: () => runTest("policy.test.mjs"),
});

// 4. Move `sorry` out of a Lean comment and into live code. The use-versus-mention regression must
//    now fire — this is the check that proves the comment-stripping is real and not incidental.
await mutate({
  name: "detector: turn a mentioned `sorry` into a used one",
  file: "test/fixtures/math-compliant/formal/Clean.lean",
  from: "  exact mul_self_nonneg x",
  to: "  sorry",
  gate: () => runTest("audit.test.mjs"),
});

// 5. Edit a source prompt. Fidelity would still pass — the digest is what catches it.
await mutate({
  name: "provenance: edit a source document",
  file: "artifacts/prompt/original-prompt.md",
  from: "* hide an unproved assumption",
  to: "* hide an unproved assumption (unless time-constrained)",
  gate: () => runTest("audit.test.mjs"),
});

// 6. Control: with no mutation, every gate is green. A mutation suite that never passes proves
//    nothing about the mutations.
results.push({
  name: "control: unmutated repository",
  outcome:
    run("inventory.mjs") === 0 && run("fidelity.mjs") === 0 && runTest("audit.test.mjs") === 0
      ? "PASS — all gates green when nothing is wrong"
      : "FAIL — a gate is red without any mutation",
});

for (const r of results) console.log(`${r.outcome.startsWith("PASS") ? "  ok" : "FAIL"}  ${r.name}\n      ${r.outcome}`);
process.exit(results.every((r) => r.outcome.startsWith("PASS")) ? 0 : 1);
