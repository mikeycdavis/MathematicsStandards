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
import { readdirSync } from "node:fs";

import { classifyArg, declaredFlags, COMMANDS } from "../scripts/invocation.mjs";
import { HOME, MUTATING_COMMANDS, run, runMutating, withScratch } from "./helpers/cli.mjs";

const EXIT_INVOCATION = 2;

// --- the defect itself: a near-miss spelling must not mutate ---------------------------------

for (const nearMiss of ["--dryrun", "--dry_run", "--dry-run=true", "--Dry-Run", "--no-such-flag"]) {
  test(`init ${nearMiss} refuses and writes nothing`, () => {
    withScratch((dir) => {
      const { code, out } = runMutating(["init", dir, nearMiss]);
      assert.equal(code, EXIT_INVOCATION, "must exit on the invocation contract, not 0");
      assert.deepEqual(readdirSync(dir), [], "the target directory must be untouched");
      assert.match(out, /nothing was read and nothing was written/i);
    });
  });
}

test("init --help prints usage and writes nothing", () => {
  withScratch((dir) => {
    const { code, out } = runMutating(["init", dir, "--help"]);
    assert.equal(code, 0, "--help is a correct invocation");
    assert.deepEqual(readdirSync(dir), [], "the target directory must be untouched");
    assert.match(out, /Usage: math-standards/);
  });
});

// --- the guard must not have broken the invocations that work --------------------------------

test("init --dry-run still previews and still writes nothing", () => {
  withScratch((dir) => {
    const { code } = runMutating(["init", dir, "--dry-run"]);
    assert.equal(code, 0);
    assert.deepEqual(readdirSync(dir), [], "a dry run writes nothing");
  });
});

test("init with no flags still applies", () => {
  withScratch((dir) => {
    const { code } = runMutating(["init", dir]);
    assert.equal(code, 0);
    assert.ok(readdirSync(dir).length > 0, "a bare init still scaffolds");
  });
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
    // An earlier draft swept `init` across `--dir=<HOME>` and scaffolded three files into the
    // framework's own tree. Writing commands now go through runMutating, which refuses any target
    // outside a disposable directory — so this cannot recur even if the sweep is widened.
    const writes = MUTATING_COMMANDS.has(command);
    const invoke = writes ? runMutating : run;
    withScratch((tmp) => {
      const dir = writes ? tmp : HOME;
      for (const [name, { valued }] of flags) {
        if (name === "--help" || name === "-h") continue; // exits 0 by design, tested above
        const arg = valued ? `${name}=x` : name;
        // A valued flag needs a real path for --dir, and a disposable one for anything that writes.
        const concrete = name === "--dir" ? `--dir=${dir}` : arg;
        const expected = classifyArg(command, concrete) === null;
        const { code, out } = invoke([command, `--dir=${dir}`, concrete]);
        const rejected =
          code === EXIT_INVOCATION && /nothing was read and nothing was written/i.test(out);
        assert.equal(
          rejected,
          !expected,
          `${command} ${concrete}: CLI and classifier disagree about acceptance`,
        );
      }
    });
  }
});
