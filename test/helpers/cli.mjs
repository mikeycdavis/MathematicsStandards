/**
 * The only path in the test suite from which a mutating command may be invoked.
 *
 * Why it exists: a cross-product test in the §0a work swept every command over `--dir=<repo root>`,
 * which pointed `init` at this repository and scaffolded three files into it. That is the operator
 * error §0a was written to prevent, produced by the test written to prevent it. The no-overwrite
 * default is the only reason it was three new files rather than an overwritten policy.
 *
 * Fixing that one test would leave the hazard: any future test can call `execFileSync` with `init`
 * and a real path. So the requirement is structural rather than local —
 *
 *     a test that invokes a mutating command receives a fresh disposable directory,
 *     and no code path in the suite can aim one at the repository.
 *
 * `runMutating` refuses any target that is not inside the OS temp directory, and
 * `test/harness-safety.test.mjs` refuses any test file that reaches a mutating command without
 * coming through here. Both halves are needed: the first cannot be bypassed by accident, the second
 * cannot be bypassed on purpose.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const CLI = path.join(HOME, "scripts/standards.mjs");

/** Commands that can write. Keep in step with the CLI; a new one belongs here on the same day. */
export const MUTATING_COMMANDS = new Set(["init"]);

/** Run the CLI and return { code, out }. A non-zero exit is data here, not a test failure. */
export function run(args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" }) };
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

/** A fresh empty directory under the OS temp root. The caller disposes of it. */
export function scratch() {
  return realpathSync(mkdtempSync(path.join(tmpdir(), "ms-test-")));
}

/** Where would this invocation write? `--dir=` wins, then the first positional, then cwd. */
function effectiveTarget(args) {
  const dirFlag = args.find((a) => a.startsWith("--dir="));
  if (dirFlag) return path.resolve(dirFlag.slice("--dir=".length));
  const positional = args.slice(1).find((a) => !a.startsWith("-"));
  return path.resolve(positional ?? process.cwd());
}

function insideTemp(target) {
  const root = realpathSync(tmpdir());
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Invoke a mutating command. Throws unless the target is a disposable directory under the OS temp
 * root — before spawning anything, so a refusal cannot itself have written.
 */
export function runMutating(args) {
  const subcommand = args[0];
  if (!MUTATING_COMMANDS.has(subcommand)) {
    throw new Error(
      `runMutating is for ${[...MUTATING_COMMANDS].join(", ")}; '${subcommand}' does not write. Use run().`,
    );
  }
  const target = effectiveTarget(args);
  if (!insideTemp(target)) {
    throw new Error(
      `refusing to run '${subcommand}' against ${target}: a mutating command in this suite may only ` +
        `target a disposable directory under ${realpathSync(tmpdir())}. Use scratch().`,
    );
  }
  return run(args);
}

/** Give `fn` a fresh scratch directory and remove it afterwards, pass or fail. */
export function withScratch(fn) {
  const dir = scratch();
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
