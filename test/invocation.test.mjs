/**
 * §0a — unknown or invalid arguments must fail closed before any mutation.
 *
 * Two independent adopters produced this defect. RiemannHypothesis: `init --help` parsed as a bare
 * `init` with an ignored flag and applied against a real repository. PvsNP: `init <dir> --dryrun`,
 * one character off `--dry-run`, wrote all seven paths and exited 0.
 *
 * The tests that matter are the mutation ones — a near-miss spelling of `--dry-run` must leave the
 * target directory empty. The rest establish that the refusal is uniform and that the guard did not
 * cost the invocations that are supposed to work.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyArg, declaredFlags, COMMANDS } from "../scripts/invocation.mjs";

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(HOME, "scripts/standards.mjs");

function run(args) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
    return { code: 0, out: stdout };
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

/** A fresh empty directory, so "wrote nothing" is checkable by counting entries. */
function scratch() {
  return mkdtempSync(path.join(tmpdir(), "ms-invocation-"));
}

const EXIT_INVOCATION = 2;

// --- the defect itself: a near-miss spelling must not mutate ---------------------------------

for (const nearMiss of ["--dryrun", "--dry_run", "--dry-run=true", "--Dry-Run", "--no-such-flag"]) {
  test(`init ${nearMiss} refuses and writes nothing`, () => {
    const dir = scratch();
    try {
      const { code, out } = run(["init", dir, nearMiss]);
      assert.equal(code, EXIT_INVOCATION, "must exit on the invocation contract, not 0");
      assert.deepEqual(readdirSync(dir), [], "the target directory must be untouched");
      assert.match(out, /nothing was read and nothing was written/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("init --help prints usage and writes nothing", () => {
  const dir = scratch();
  try {
    const { code, out } = run(["init", dir, "--help"]);
    assert.equal(code, 0, "--help is a correct invocation");
    assert.deepEqual(readdirSync(dir), [], "the target directory must be untouched");
    assert.match(out, /Usage: math-standards/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- the guard must not have broken the invocations that work --------------------------------

test("init --dry-run still previews and still writes nothing", () => {
  const dir = scratch();
  try {
    const { code } = run(["init", dir, "--dry-run"]);
    assert.equal(code, 0);
    assert.deepEqual(readdirSync(dir), [], "a dry run writes nothing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("init with no flags still applies", () => {
  const dir = scratch();
  try {
    const { code } = run(["init", dir]);
    assert.equal(code, 0);
    assert.ok(readdirSync(dir).length > 0, "a bare init still scaffolds");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the documented flags are still accepted where they belong", () => {
  assert.equal(run(["audit", `--dir=${HOME}`, "--json"]).code, 0);
  // --strict is accepted; it exits 1 here because this repository has findings, which is the
  // documented contract and not an invocation error.
  assert.notEqual(run(["audit", `--dir=${HOME}`, "--strict", "--json"]).code, EXIT_INVOCATION);
  assert.notEqual(run(["explain", "claims.silent-promotion"]).code, EXIT_INVOCATION);
});

// --- the refusal is uniform, and says which of the three things went wrong --------------------

test("an unknown flag is refused on read-only commands too", () => {
  const { code, out } = run(["validate", `--dir=${HOME}`, "--no-such-flag"]);
  assert.equal(code, EXIT_INVOCATION);
  assert.match(out, /unknown option --no-such-flag/);
});

test("a flag belonging to another command names that command", () => {
  const { code, out } = run(["validate", `--dir=${HOME}`, "--dry-run"]);
  assert.equal(code, EXIT_INVOCATION);
  assert.match(out, /--dry-run is accepted by init, not by validate/);
});

test("a valued flag written bare is distinguished from an unknown one", () => {
  const { code, out } = run(["audit", "--dir"]);
  assert.equal(code, EXIT_INVOCATION);
  assert.match(out, /--dir requires a value/);
});

test("a plain flag given a value is distinguished from an unknown one", () => {
  const { code, out } = run(["audit", `--dir=${HOME}`, "--strict=yes"]);
  assert.equal(code, EXIT_INVOCATION);
  assert.match(out, /--strict takes no value/);
});

// --- the general invariant, not the special case ----------------------------------------------

/**
 * The principle behind the design decision, pinned so it outlives `--strict`:
 *
 *     for every declared flag and every command:
 *       either the command implements it,
 *       or the invocation fails explicitly.
 *
 * Silently ignoring a flag the caller wrote is the defect. `validate --strict` behaving as
 * `validate` is false assurance of the same kind the framework exists to prevent, and it is not
 * fixed by confining the refusal to commands that mutate.
 */
test("no declared flag is silently ignored by any command", () => {
  const flags = declaredFlags();
  let implemented = 0;
  let refused = 0;

  for (const command of COMMANDS) {
    for (const [name, { valued }] of flags) {
      const arg = valued ? `${name}=x` : name;
      const detail = classifyArg(command, arg);
      if (detail === null) {
        implemented++;
        continue;
      }
      refused++;
      assert.match(
        detail,
        new RegExp(name.replace(/[-]/g, "\\-")),
        `${command} ${arg}: the refusal must name the flag`,
      );
    }
  }

  // Both halves must be non-empty, or the invariant is vacuous in one direction.
  assert.ok(implemented > 0, "some command must implement some flag");
  assert.ok(refused > 0, "some command must refuse some declared flag");
});

test("the classifier and the CLI agree, for every command and every declared flag", () => {
  const flags = declaredFlags();
  for (const command of COMMANDS) {
    for (const [name, { valued }] of flags) {
      if (name === "--help" || name === "-h") continue; // exits 0 by design, tested above
      const arg = valued ? `${name}=x` : name;
      const expected = classifyArg(command, arg) === null;
      // `explain` with no rule and `init` into a nonexistent path have their own exit paths, so the
      // question asked here is only whether the invocation guard rejected it.
      const { code, out } = run([command, `--dir=${HOME}`, arg]);
      const rejected = code === EXIT_INVOCATION && /nothing was read and nothing was written/i.test(out);
      assert.equal(
        rejected,
        !expected,
        `${command} ${arg}: CLI and classifier disagree about acceptance`,
      );
    }
  }
});
