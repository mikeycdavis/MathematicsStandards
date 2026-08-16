/**
 * The local Docker CI pipeline and the verified-submission guard.
 *
 * None of this needs Docker. That is deliberate: the parts worth testing are the decisions — which
 * stages run, whether the two executors still agree, and when submission refuses — and a suite that
 * needed a running daemon would be skipped on the machine where it mattered.
 *
 * The SHA-mismatch guard in particular is tested here rather than demonstrated by rewriting history.
 * Proving a safety check by performing the dangerous operation and observing that it was caught
 * tests the same logic while putting the thing it protects at risk.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STAGES, OPTIONAL_STAGES, stagesFor } from "../scripts/ci-stages.mjs";
import {
  checkCommitUnchanged,
  checkBranchSubmittable,
  checkEvidenceMatches,
  composePrBody,
  branchFromRemoteRef,
  CI_FAILED_MESSAGE,
  SHA_CHANGED_MESSAGE,
} from "../scripts/submit-pr.mjs";
import { checkOutDir } from "../scripts/ci.mjs";
import { parseYaml } from "../scripts/yaml.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const A = "a".repeat(40);
const B = "b".repeat(40);

// ---------------------------------------------------------------------------
// The stage list is the pipeline, so it is the thing that must not quietly shrink.
// ---------------------------------------------------------------------------

/**
 * The gates the workflow ran before local CI existed, in order.
 *
 * Pinned as a literal on purpose. Deriving it from STAGES would make this test agree with any
 * pipeline at all, including one with a gate deleted — the exact loss the instruction "do not
 * silently drop existing CI coverage" is about. Removing a gate must require editing this line,
 * which is a reviewable act.
 */
const HISTORICAL_GATES = [
  "inventory",
  "fidelity",
  "policy",
  "diagrams",
  "assurance-report",
  "tests",
  "audit",
  "validate",
];

test("the pipeline still runs every gate the workflow ran before, in the same order", () => {
  assert.deepEqual(STAGES.map((s) => s.id), HISTORICAL_GATES);
});

test("every stage names an npm script that exists", () => {
  const { scripts } = JSON.parse(read("package.json"));
  for (const stage of [...STAGES, ...OPTIONAL_STAGES]) {
    assert.ok(
      Object.hasOwn(scripts, stage.npmScript),
      `stage ${stage.id} names npm script "${stage.npmScript}", which package.json does not define`,
    );
  }
});

test("the test script's glob is left unquoted, so it survives on Node 20", () => {
  // FROM A REAL FAILURE, found the first time the pipeline ran in the container.
  //
  // The script was `node --test "test/*.test.mjs"`. The quotes stop the shell expanding the glob and
  // hand the literal pattern to node, which only learned to expand it itself in v21. Every developer
  // here runs Node 24, so it worked; the workflow pins Node 20, where it does not. Nobody noticed
  // because GitHub-hosted Actions have never actually executed a job on this repository — they are
  // blocked at the billing gate, so every run failed before reaching a step.
  //
  // Unquoted, the shell expands it on POSIX and node expands it on Windows, and the same 193 tests
  // run on 20 and on 24. `node --test test/` was the other candidate and was rejected: it descends
  // into test/fixtures, whose contents are deliberately malformed.
  const { scripts } = JSON.parse(read("package.json"));
  assert.equal(scripts.test, "node --test test/*.test.mjs");
});

test("stage ids are unique and every stage explains what it establishes", () => {
  const all = [...STAGES, ...OPTIONAL_STAGES];
  assert.equal(new Set(all.map((s) => s.id)).size, all.length);
  for (const stage of all) {
    // A sentence, not a placeholder. The threshold is words rather than characters because the
    // shortest honest rationale here — validate's "The verdict. This is the gate." — is a good one,
    // and a character count would have rejected it for being well written.
    assert.ok(
      stage.why && stage.why.trim().split(/\s+/).length >= 4,
      `stage ${stage.id} has no usable rationale`,
    );
    assert.ok(stage.title, `stage ${stage.id} has no title`);
  }
});

test("mutation checks are opt-in, not part of the default pipeline", () => {
  assert.ok(!STAGES.some((s) => s.id === "mutation-check"));
  assert.deepEqual(stagesFor().map((s) => s.id), HISTORICAL_GATES);
  assert.deepEqual(stagesFor({ withMutationCheck: true }).map((s) => s.id), [...HISTORICAL_GATES, "mutation-check"]);
});

// ---------------------------------------------------------------------------
// One definition, two executors.
// ---------------------------------------------------------------------------

test("the GitHub workflow runs the shared stage list instead of naming the gates itself", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /scripts\/run-stages\.mjs/, "the workflow no longer invokes the shared runner");

  // If a gate reappears as its own `run:` line, the two executors have started to diverge and the
  // next edit will be applied to only one of them.
  const runLines = [...workflow.matchAll(/^\s*run:\s*(.+)$/gm)].map((m) => m[1].trim());
  for (const line of runLines) {
    assert.match(
      line,
      /run-stages\.mjs|ci\.sh/,
      `the workflow runs "${line}" directly. Gate commands belong in scripts/ci-stages.mjs, not here.`,
    );
  }
});

test("the workflow still runs no dependency install step", () => {
  // The absence of `npm ci` is the zero-dependency enforcement. It survived the refactor.
  //
  // Scanning only executable lines, because the comment at the top of the workflow explains the
  // rule by naming the command it forbids. A guard that cannot tell use from mention would make
  // documenting the rule impossible — which is the same use-vs-mention doctrine the detectors in
  // scripts/standards.mjs follow when they blank comments before scanning.
  const executable = read(".github/workflows/ci.yml")
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
  assert.doesNotMatch(executable, /npm (ci|install)\b/);
});

// ---------------------------------------------------------------------------
// The container is an isolation boundary, not a convenience.
// ---------------------------------------------------------------------------

test("the CI service has no network and no writable mount of the source tree", () => {
  const compose = parseYaml(read("compose.ci.yml"));
  const ci = compose.services.ci;

  assert.equal(ci.network_mode, "none", "the pipeline must not be able to reach the network");

  // String(), because the vendored parser in scripts/yaml.mjs is a scalar-preserving reader: it
  // hands back the text `true` rather than a boolean. Comparing against the boolean would make this
  // assertion a fact about the parser instead of a fact about the compose file.
  assert.equal(String(ci.read_only), "true", "the container root filesystem must be read-only");

  // The single bind is the evidence directory. A mount of the repository would let the run modify
  // the developer's checkout, and would put uncommitted edits into a verified result.
  const mounts = ci.volumes ?? [];
  assert.equal(mounts.length, 1, `expected exactly one mount, found ${mounts.length}: ${mounts.join(", ")}`);
  assert.match(String(mounts[0]), /:\/ci-out$/);

  // No Docker socket. Test code runs as untrusted code; handing it the daemon hands it the host.
  assert.doesNotMatch(read("compose.ci.yml"), /docker\.sock/);
});

test("the CI image is pinned by digest so a run is reproducible", () => {
  assert.match(read("Dockerfile.ci"), /^FROM\s+node:[\w.-]+@sha256:[0-9a-f]{64}$/m);
});

test("history is kept out of the CI image, so commit identity can only arrive from the host", () => {
  const ignored = read(".dockerignore").split("\n").map((l) => l.trim());
  assert.ok(ignored.includes(".git"));
  assert.ok(ignored.includes("artifacts/local-ci"));
});

test("verification evidence is not committed", () => {
  assert.match(read(".gitignore"), /^artifacts\/local-ci\/$/m);
});

test("the mutation stage gets a writable tree, because the container root is read-only", () => {
  // FROM REVIEW. `--with-mutation-check` could never pass: mutation-check writes to tracked files
  // and read_only covers /repo, so it died on the first edit with EROFS having exercised no gate.
  // The fix is a tmpfs the pipeline may damage, not a relaxation of read_only.
  const compose = parseYaml(read("compose.ci.yml"));
  const tmpfs = (compose.services.ci.tmpfs ?? []).map(String);
  assert.ok(tmpfs.some((m) => m.startsWith("/work")), `no writable /work in ${tmpfs.join(", ")}`);
  assert.match(read("scripts/ci.mjs"), /cp -r \/repo\/\. \/work\//);
});

// ---------------------------------------------------------------------------
// The evidence mount decides what the container can reach on the host.
// ---------------------------------------------------------------------------

test("the evidence directory may not be one that contains the checkout", () => {
  // FROM REVIEW. `--out` was unrestricted and becomes a read-write bind mount, so `--out=.` — or
  // the mistyped `--out=`, which resolves to the current directory — handed branch-controlled code
  // write access to the working tree it is supposed to be isolated from.
  const root = path.join(ROOT, "test", "fixtures", "imaginary-repo");
  const home = path.join(ROOT, "test", "fixtures", "imaginary-home");

  for (const bad of [root, path.dirname(root), path.parse(root).root, home]) {
    const refusal = checkOutDir(bad, root, home);
    assert.ok(refusal, `accepted ${bad} as an evidence directory`);
  }
  assert.match(checkOutDir(root, root, home), /contains the repository checkout/);
});

test("inside the repository, only the evidence directory is accepted", () => {
  const root = path.join(ROOT, "test", "fixtures", "imaginary-repo");
  const home = path.join(ROOT, "test", "fixtures", "imaginary-home");

  assert.equal(checkOutDir(path.join(root, "artifacts", "local-ci"), root, home), null);
  assert.equal(checkOutDir(path.join(root, "artifacts", "local-ci", "run-7"), root, home), null);

  // scripts/ would let a run write the code the next run executes.
  assert.match(checkOutDir(path.join(root, "scripts"), root, home), /only artifacts\/local-ci/);
});

test("outside the repository, a directory holding unrelated data is refused", () => {
  const home = path.join(ROOT, "test", "fixtures", "imaginary-home");
  const root = path.join(ROOT, "test", "fixtures", "imaginary-repo");

  // Does not exist yet: fine, nothing of the host's is behind it.
  assert.equal(checkOutDir(path.join(ROOT, "test", "fixtures", "nope-not-here"), root, home), null);

  // A populated directory is someone's data, not an evidence directory.
  assert.match(checkOutDir(path.join(ROOT, "scripts"), root, home), /is not empty/);
});

test("the real default evidence directory is accepted", () => {
  assert.equal(checkOutDir(path.join(ROOT, "artifacts", "local-ci")), null);
});

// ---------------------------------------------------------------------------
// The invariant: the commit pushed is the commit that passed.
// ---------------------------------------------------------------------------

test("a default branch containing a slash keeps its full name", () => {
  // FROM REVIEW. This took the last path component, so `release/main` became `main` — wrong base,
  // and the guard that refuses to submit the base branch onto itself stopped recognising it.
  assert.equal(branchFromRemoteRef("refs/remotes/origin/release/main"), "release/main");
  assert.equal(branchFromRemoteRef("refs/remotes/origin/main"), "main");
  assert.equal(branchFromRemoteRef("refs/remotes/upstream/team/v2/main"), "team/v2/main");
  assert.equal(branchFromRemoteRef("  refs/remotes/origin/main\n"), "main");
  assert.equal(branchFromRemoteRef("not-a-ref"), null);
  assert.equal(branchFromRemoteRef(""), null);

  // The whole point: the base is compared against `rev-parse --abbrev-ref HEAD`, which reports the
  // full name, so a truncated base breaks the base-branch refusal.
  assert.equal(checkBranchSubmittable("release/main", branchFromRemoteRef("refs/remotes/origin/release/main")).ok, false);
});

test("submission proceeds when the commit did not move", () => {
  assert.deepEqual(checkCommitUnchanged(A, A), { ok: true, message: null });
});

test("submission refuses when the commit moved during verification", () => {
  const result = checkCommitUnchanged(A, B);
  assert.equal(result.ok, false);
  assert.ok(result.message.startsWith(SHA_CHANGED_MESSAGE));
  // The refusal names both, so the developer can see what happened rather than guessing.
  assert.match(result.message, new RegExp(A));
  assert.match(result.message, new RegExp(B));
});

test("case differences in a SHA are not treated as a moved commit", () => {
  assert.equal(checkCommitUnchanged(A, A.toUpperCase()).ok, true);
});

test("submission refuses anything that is not a full SHA", () => {
  // An abbreviated SHA compares unequal to its own full form, so accepting one would turn the
  // guard into a source of false refusals — and, worse, a short SHA is not a unique name.
  for (const bad of [A.slice(0, 12), "", null, undefined, "HEAD", `${A}\n`]) {
    assert.equal(checkCommitUnchanged(bad, A).ok, false, `accepted ${JSON.stringify(bad)} as verified`);
    assert.equal(checkCommitUnchanged(A, bad).ok, false, `accepted ${JSON.stringify(bad)} as current`);
  }
});

test("submission refuses the base branch and a detached HEAD", () => {
  assert.equal(checkBranchSubmittable("main", "main").ok, false);
  assert.equal(checkBranchSubmittable("HEAD", "main").ok, false);
  assert.equal(checkBranchSubmittable("", "main").ok, false);
  assert.equal(checkBranchSubmittable("local-docker-ci", "main").ok, true);
});

test("evidence must describe this run, not a previous one", () => {
  const good = { result: "passed", commit: A, branch: "feature" };
  assert.equal(checkEvidenceMatches(good, { commit: A, branch: "feature" }).ok, true);

  // A stale receipt from an earlier commit is the failure mode that makes "CI passed" meaningless.
  assert.equal(checkEvidenceMatches({ ...good, commit: B }, { commit: A, branch: "feature" }).ok, false);
  assert.equal(checkEvidenceMatches({ ...good, branch: "other" }, { commit: A, branch: "feature" }).ok, false);
  assert.equal(checkEvidenceMatches({ ...good, result: "failed" }, { commit: A, branch: "feature" }).ok, false);
  assert.equal(checkEvidenceMatches(null, { commit: A, branch: "feature" }).ok, false);
});

test("the CI-failure message says plainly that nothing was pushed", () => {
  assert.match(CI_FAILED_MESSAGE, /No branch was pushed and no PR was created/);
});

// ---------------------------------------------------------------------------
// The PR body must not let a reader mistake local verification for a hosted result.
// ---------------------------------------------------------------------------

test("the PR body keeps what the author wrote and appends the verification block", () => {
  const authored = "Fixes the thing.\n\nSee the design note for why.";
  const body = composePrBody(authored, {
    commit: A,
    branch: "feature",
    evidence: { checks: ["inventory", "tests"], completedAt: "2026-08-15T00:00:00.000Z" },
  });

  assert.ok(body.startsWith(authored), "author's text must survive intact and come first");
  assert.match(body, new RegExp(A), "the verified SHA must appear");
  assert.match(body, /Docker/);
  assert.match(body, /not\*\* a GitHub Actions result/);
  assert.match(body, /inventory, tests/);
});

test("the PR body never claims GitHub Actions passed", () => {
  const body = composePrBody(null, { commit: A, branch: "feature", evidence: { checks: [] } });
  assert.doesNotMatch(body, /GitHub Actions (passed|succeeded|is green)/i);
  assert.match(body, /Local CI/);
});

test("an empty author body produces the verification block alone, with no stray separator", () => {
  const body = composePrBody("", { commit: A, branch: "feature", evidence: { checks: [] } });
  assert.ok(body.startsWith("## Local CI"));
  assert.doesNotMatch(body, /^---$/m);
});
