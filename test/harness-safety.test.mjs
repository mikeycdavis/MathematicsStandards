/**
 * The test harness itself must not be able to damage the repository it tests.
 *
 * This is the structural half of the guard described in `helpers/cli.mjs`. That module refuses a
 * mutating command aimed anywhere but a disposable directory; this one refuses a *test file* that
 * could reach a mutating command without going through it. Either alone is bypassable — the first
 * by importing `child_process` directly, the second by pointing the helper somewhere real.
 *
 * The requirement, stated once:
 *
 *     no code path in the suite can point a mutating command at the repository root.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { HOME, MUTATING_COMMANDS, runMutating, scratch, withScratch } from "./helpers/cli.mjs";

const TEST_DIR = path.join(HOME, "test");
const SELF = "harness-safety.test.mjs";
// This file quotes the patterns it forbids, so scanning itself would always fail. It is exempt by
// name rather than by a cleverer pattern, because an exemption that is hard to see is worse than
// one that is stated.
const testFiles = readdirSync(TEST_DIR).filter((f) => f.endsWith(".test.mjs") && f !== SELF);

/** A file "reaches" a mutating command if it names one in a CLI argument position. */
function namesMutatingCommand(source) {
  return [...MUTATING_COMMANDS].some((command) =>
    new RegExp(`\\[\\s*["']${command}["']`).test(source),
  );
}

test("a test that invokes a mutating command comes through the guarded helper", () => {
  let checked = 0;
  for (const file of testFiles) {
    const source = readFileSync(path.join(TEST_DIR, file), "utf8");
    if (!namesMutatingCommand(source)) continue;
    checked++;
    assert.match(
      source,
      /from "\.\/helpers\/cli\.mjs"/,
      `${file} invokes a mutating command and must import test/helpers/cli.mjs`,
    );
    assert.match(
      source,
      /\brunMutating\s*\(/,
      `${file} invokes a mutating command and must call runMutating, not run`,
    );
    assert.doesNotMatch(
      source,
      /from "node:child_process"/,
      `${file} invokes a mutating command and must not spawn processes directly`,
    );
  }
  assert.ok(checked > 0, "no test file exercises a mutating command — this check would be vacuous");
});

test("the helper refuses a mutating command aimed at the repository", () => {
  for (const args of [["init", HOME], ["init", `--dir=${HOME}`], ["init"], ["init", path.join(HOME, "test")]]) {
    assert.throws(
      () => runMutating(args),
      /refusing to run 'init'/,
      `runMutating(${JSON.stringify(args)}) must refuse`,
    );
  }
});

test("the helper refuses to be used for a command that does not write", () => {
  assert.throws(() => runMutating(["audit", scratch()]), /does not write/);
});

test("the helper permits a disposable target, and the refusal is therefore not blanket", () => {
  withScratch((dir) => {
    const { code } = runMutating(["init", dir]);
    assert.equal(code, 0);
  });
});
