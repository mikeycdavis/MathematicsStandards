/**
 * The falsifier for EP-12's first guarantee: the tree CI executes is the tree the commit records.
 *
 * WHAT WENT WRONG, AND WHY IT NEEDED A TEST RATHER THAN A FIX. Measured at 5afcd00 on 2026-08-23:
 * `scripts/ci.mjs` exports the commit under verification to a throwaway `git worktree` and builds
 * the CI image from it. A worktree is a checkout, `core.autocrlf` was `true`, and `.gitattributes`
 * pinned `eol=lf` for three globs only — so 257 of 286 tracked files reached the container with one
 * extra byte per line. The pipeline was verifying a transcription of the commit and saying the
 * commit had passed.
 *
 * These tests fail against `main` for that exact reason, which is the point of writing them first.
 * The unit cases below prove the detector notices a CRLF transcription and is not merely comparing
 * a tree to itself; the repository cases prove the attribute that prevents it is present and the
 * boundary that would catch its removal is wired in.
 *
 * They deliberately do not test that this repository's own checkout is LF. A developer's working
 * tree is theirs; the guarantee is about what CI builds from, and that is asserted at the export
 * boundary by `scripts/ci.mjs` where both sides of the comparison exist.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkTreeDigest, contextDigest, digestTree, dockerignoreMatcher, treeFiles } from "../scripts/tree-fidelity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");

function scratch(files) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mathstd-fidelity-"));
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(dir, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  }
  return dir;
}

// ---------------------------------------------------------------------------
// The detector notices the transcription.
// ---------------------------------------------------------------------------

test("a CRLF transcription of an LF tree is a different tree", () => {
  const lf = scratch({ "a.md": "one\ntwo\nthree\n", "sub/b.json": '{\n  "x": 1\n}\n' });
  const crlf = scratch({ "a.md": "one\r\ntwo\r\nthree\r\n", "sub/b.json": '{\r\n  "x": 1\r\n}\r\n' });
  try {
    // Same paths, same lines, same everything a reader would notice.
    assert.deepEqual(treeFiles(lf), treeFiles(crlf));
    assert.notEqual(digestTree(lf).digest, digestTree(crlf).digest, "CRLF conversion must change the digest");

    // And the difference is exactly one byte per line, which is the shape the real defect had.
    const [a] = digestTree(lf).files;
    const [b] = digestTree(crlf).files;
    assert.equal(b.bytes - a.bytes, 3);
  } finally {
    rmSync(lf, { recursive: true, force: true });
    rmSync(crlf, { recursive: true, force: true });
  }
});

test("two byte-identical trees digest the same, so the check is not vacuously red", () => {
  const one = scratch({ "a.md": "same\n", "sub/b.md": "same\n" });
  const two = scratch({ "a.md": "same\n", "sub/b.md": "same\n" });
  try {
    assert.equal(digestTree(one).digest, digestTree(two).digest);
  } finally {
    rmSync(one, { recursive: true, force: true });
    rmSync(two, { recursive: true, force: true });
  }
});

test("moving a file changes the digest even when no byte of any file changes", () => {
  const before = scratch({ "a/x.md": "content\n" });
  const after = scratch({ "b/x.md": "content\n" });
  try {
    assert.notEqual(digestTree(before).digest, digestTree(after).digest);
  } finally {
    rmSync(before, { recursive: true, force: true });
    rmSync(after, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// The build context, so host and container digest the same set of files.
// ---------------------------------------------------------------------------

test("the context digest withholds exactly what the build context withholds", () => {
  const dir = scratch({
    ".dockerignore": "# comment\n.git\nartifacts/local-ci\nnode_modules\n*.log\n.env.*\n",
    "keep.md": "kept\n",
    "artifacts/local-ci/latest.json": "{}\n",
    "artifacts/keep.json": "{}\n",
    "node_modules/dep/index.js": "module.exports = 1\n",
    "debug.log": "noise\n",
    ".env.local": "SECRET=1\n",
  });
  try {
    const listed = contextDigest(dir).files.map((f) => f.path);
    assert.deepEqual(listed.sort(), [".dockerignore", "artifacts/keep.json", "keep.md"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a .dockerignore form the matcher does not understand throws instead of excluding less", () => {
  // Reporting drift that is not there would be bad; silently excluding less than the build does
  // would be worse, because the two digests would then disagree for a reason unrelated to fidelity.
  assert.throws(() => dockerignoreMatcher("**/generated"), /not a form this matcher understands/);
  assert.throws(() => dockerignoreMatcher("!keep-me"), /negated .dockerignore pattern/);
});

test("this repository's own .dockerignore is a form the matcher understands", () => {
  // The matcher is only useful if it can read the file it exists to read. If this fails, the
  // .dockerignore grew a pattern shape and the matcher must be taught it.
  assert.doesNotThrow(() => dockerignoreMatcher(read(".dockerignore")));
});

// ---------------------------------------------------------------------------
// The runner's refusal.
// ---------------------------------------------------------------------------

test("the runner refuses a tree that is not the one the host exported", () => {
  const refusal = checkTreeDigest("aaaa", "bbbb");
  assert.equal(refusal.ok, false);
  assert.match(refusal.message, /not the tree the host exported/);
  assert.match(refusal.message, /No stage ran/);
});

test("matching digests pass, and an absent host digest is not a failure", () => {
  assert.equal(checkTreeDigest("aaaa", "aaaa").ok, true);
  // The GitHub workflow runs run-stages.mjs directly: no host, no export, nothing to compare.
  assert.equal(checkTreeDigest(null, "aaaa").ok, true);
  assert.equal(checkTreeDigest("", "aaaa").ok, true);
});

// ---------------------------------------------------------------------------
// The two mechanisms that hold the guarantee in this repository.
// ---------------------------------------------------------------------------

test("every text file checks out with the line endings it was committed with", () => {
  // The attribute. Without it, `git worktree add` transcribes the commit on the way to the image.
  const attributes = read(".gitattributes");
  assert.match(attributes, /^\* text=auto eol=lf$/m, "a global eol=lf rule must cover every text file");
});

test("the export boundary is checked before the image is built, not assumed", () => {
  // The attribute is a file like any other and can be edited away. The property is therefore also
  // asserted where both sides of the comparison exist: on the host, after the export, before build.
  const ci = read("scripts/ci.mjs");
  assert.match(ci, /commitToTreeDrift\(ROOT, target\.commit, target\.worktree\)/);
  assert.match(ci, /the exported tree is not the commit/);

  const build = ci.indexOf('composeRun(["build"])');
  const check = ci.indexOf("commitToTreeDrift(ROOT");
  assert.ok(check > 0 && check < build, "the drift check must run before the image is built");
});

test("the runner is handed the host's digest and compares it before any stage", () => {
  assert.match(read("scripts/ci.mjs"), /CI_TREE_DIGEST: context\.digest/);
  assert.match(read("compose.ci.yml"), /CI_TREE_DIGEST: \$\{CI_TREE_DIGEST:-\}/);

  const runner = read("scripts/run-stages.mjs");
  const compare = runner.indexOf("checkTreeDigest(process.env.CI_TREE_DIGEST");
  const firstStage = runner.indexOf("for (const [index, stage] of stages.entries())");
  assert.ok(compare > 0 && compare < firstStage, "the digest must be compared before the first stage runs");
});
