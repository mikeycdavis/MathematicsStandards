/**
 * The falsifier for EP-12's second guarantee: every advertised mutation reaches its gate.
 *
 * `npm run mutation-check` announces six attacks. Inside the CI container two of them never landed:
 * they searched for a string anchored on a newline, the exported tree held CRLF, and they reported
 * SETUP FAILED — so the inventory and fidelity gates, the two that protect the spec-to-standards
 * chain, had never once been attacked in the environment this repository treats as authoritative.
 * `README.md` describes the command as attacking each gate.
 *
 * WHY THIS TEST AND NOT A TOLERANT MUTATOR. The tempting repair was to let the two anchors match
 * either line ending. That turns the suite green while leaving the tree CI executes different from
 * the commit it claims to verify — the check passing for a reason unrelated to the property, which
 * is the whole subject of this repository. The anchors stay literal; the tree was fixed instead
 * (see scripts/tree-fidelity.mjs), and this test is what notices if either ever stops being true.
 *
 * It belongs in `npm test` rather than in the mutation suite because `npm test` is a pipeline stage
 * and the mutation suite is opt-in. A check on the reach of an opt-in suite has to run where the
 * suite is not running, or the day the suite goes blind is the day nothing says so.
 *
 * This is a reachability check, not a substitute for the suite. It proves each mutation can land; it
 * does not run any gate, and nothing here writes to a tracked file.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MUTATIONS } from "../scripts/mutation-check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("every advertised mutation reaches its target in the tree this run is standing in", () => {
  const unreachable = [];
  for (const mutation of MUTATIONS) {
    const absolute = path.join(ROOT, mutation.file);
    if (!existsSync(absolute)) {
      unreachable.push(`${mutation.name} — ${mutation.file} does not exist`);
      continue;
    }
    const contents = readFileSync(absolute, "utf8");
    if (!contents.includes(mutation.from)) {
      // Name the likely cause rather than only the symptom. This failure has had exactly one cause
      // so far, and a person meeting it for the first time should not have to rediscover it.
      const crlf = contents.includes("\r\n");
      unreachable.push(
        `${mutation.name} — ${mutation.file} does not contain the anchor` +
          (crlf ? " (the file has CRLF line endings; the anchor and the commit have LF)" : ""),
      );
    }
  }
  assert.deepEqual(
    unreachable,
    [],
    `${unreachable.length} of ${MUTATIONS.length} advertised mutations cannot reach their gate:\n  ${unreachable.join("\n  ")}`,
  );
});

test("each mutation actually changes something, so a landed mutation is a real defect", () => {
  for (const mutation of MUTATIONS) {
    assert.notEqual(mutation.to, mutation.from, `${mutation.name} mutates to itself`);
    assert.equal(typeof mutation.gate, "function", `${mutation.name} names no gate`);
    assert.ok(mutation.name.trim().length > 0);
  }
});

test("the anchors are byte-literal and are not to be loosened", () => {
  // A mutator whose anchor tolerated either line ending would keep passing on the day the tree stops
  // matching the commit, which is precisely the failure this milestone exists to make impossible to
  // miss. If someone rewrites an anchor as a regex, this test is the argument they have to answer.
  for (const mutation of MUTATIONS) {
    assert.equal(typeof mutation.from, "string", `${mutation.name}: anchors are strings, not patterns`);
    assert.doesNotMatch(mutation.from, /\r/, `${mutation.name}: an anchor must not carry a CR`);
  }
});

test("importing the mutation list does not run the suite", () => {
  // The suite writes to tracked files. If importing it ran it, this test file would mutate the
  // repository every time `npm test` collected it.
  const source = readFileSync(path.join(ROOT, "scripts", "mutation-check.mjs"), "utf8");
  assert.match(source, /if \(process\.argv\[1\] && path\.resolve\(process\.argv\[1\]\) === fileURLToPath\(import\.meta\.url\)\) \{/);
});
