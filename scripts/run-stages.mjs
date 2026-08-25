#!/usr/bin/env node
/**
 * Executes the pipeline declared in `scripts/ci-stages.mjs`, in order, stopping at the first
 * failure, and records what it did.
 *
 * This is the piece that runs *inside* the CI container. It is also what `.github/workflows/ci.yml`
 * invokes, so GitHub-hosted CI and local Docker CI execute the same list in the same order rather
 * than two lists that happen to agree today. It deliberately knows nothing about Docker, git, or
 * GitHub: it takes a stage list and a couple of labels, runs commands, and writes a result file.
 * That is what lets the same script serve a container, a hosted runner, and a self-hosted runner
 * without a mode flag for each.
 *
 * The commit SHA and branch arrive as environment variables rather than being read from git. The
 * container image contains the source tree without its history — see .dockerignore — so there is no
 * git repository to ask. Passing the identity in from the host is not a workaround for that; it is
 * the point. The host resolves the SHA, the runner records the SHA it was told, and
 * `scripts/submit-pr.mjs` re-resolves it afterwards and refuses to push if it moved. The runner
 * never gets a vote on which commit it verified.
 *
 * Usage:
 *   node scripts/run-stages.mjs [--out=<dir>] [--with-mutation-check] [--verbose]
 *
 * Environment:
 *   CI_COMMIT   Full SHA of the commit being verified. Recorded verbatim.
 *   CI_BRANCH   Branch name being verified. Recorded verbatim.
 *   CI_ENV      Label for where this ran (default "docker"). Recorded verbatim.
 *   CI_REPO     Repository name. Defaults to the checkout's directory name, which inside the
 *               container is always "repo" — hence the override.
 *
 * Exit 0 when every stage passed, 1 when any stage failed, 2 on invocation error.
 */

import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { stagesFor } from "./ci-stages.mjs";
import { checkTreeDigest, contextDigest } from "./tree-fidelity.mjs";

const EXIT_OK = 0;
const EXIT_FAILED = 1;
const EXIT_INVOCATION = 2;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * npm is a shell script on POSIX and a .cmd shim on Windows. Node refuses to spawn a .cmd without a
 * shell, so Windows gets one and POSIX does not — a shell we do not need is a layer that can
 * reinterpret an argument.
 */
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const NEEDS_SHELL = process.platform === "win32";

const nowIso = () => new Date().toISOString();

function parseArgs(argv) {
  const options = { out: path.join(ROOT, "artifacts", "local-ci"), withMutationCheck: false, verbose: false };
  for (const arg of argv) {
    if (arg.startsWith("--out=")) options.out = path.resolve(arg.slice("--out=".length));
    else if (arg === "--with-mutation-check") options.withMutationCheck = true;
    else if (arg === "--verbose") options.verbose = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unrecognised option: ${arg}`);
  }
  return options;
}

/** Run one stage. Output streams straight through; a CI log nobody can read is not evidence. */
function runStage(stage, { verbose }) {
  const startedAt = nowIso();
  const began = Date.now();
  if (verbose) console.log(`\n$ npm run ${stage.npmScript}`);
  const result = spawnSync(NPM, ["run", "--silent", stage.npmScript], {
    cwd: ROOT,
    stdio: "inherit",
    shell: NEEDS_SHELL,
    env: process.env,
  });
  const code = result.error ? 127 : (result.status ?? 1);
  return {
    id: stage.id,
    npmScript: stage.npmScript,
    result: code === EXIT_OK ? "passed" : "failed",
    exitCode: code,
    startedAt,
    durationMs: Date.now() - began,
    error: result.error ? String(result.error.message) : undefined,
  };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`run-stages: ${error.message}`);
    return EXIT_INVOCATION;
  }
  if (options.help) {
    console.log("Usage: node scripts/run-stages.mjs [--out=<dir>] [--with-mutation-check] [--verbose]");
    return EXIT_OK;
  }

  const stages = stagesFor({ withMutationCheck: options.withMutationCheck });
  const commit = process.env.CI_COMMIT || "unknown";
  const branch = process.env.CI_BRANCH || "unknown";
  const environment = process.env.CI_ENV || "docker";

  // The repository name comes from the host for the same reason the commit does: inside the
  // container the checkout lives at /repo, so the directory name would report every repository in
  // the world as "repo". Falling back to the directory name is right when this runs outside a
  // container, which is how the GitHub workflow uses it.
  const repository = process.env.CI_REPO || path.basename(ROOT);
  const startedAt = nowIso();

  // WHAT AM I STANDING IN?
  //
  // Digested before a single stage runs, and compared against the digest the host computed over the
  // tree it exported. The host has already proved that export is the commit byte for byte
  // (scripts/ci.mjs, boundary one); this closes the other half of the chain, so that "this commit
  // passed" is a claim about the bytes in the commit rather than about whatever arrived here.
  //
  // It matters most for the stage that is allowed to do damage. Under --with-mutation-check the
  // pipeline is copied onto the /work tmpfs and ROOT is that copy, so this digest is taken from the
  // disposable tree the mutations are about to edit — which is how we know the tree they attack is
  // still the commit, and not a copy that lost something on the way.
  //
  // An absent CI_TREE_DIGEST is not a failure. The GitHub workflow calls this script directly, with
  // no host to hand a digest over and no export boundary to check; refusing there would fail a run
  // for lacking a guarantee that does not apply to it.
  const tree = contextDigest(ROOT);
  const digestCheck = checkTreeDigest(process.env.CI_TREE_DIGEST || null, tree.digest);
  if (!digestCheck.ok) {
    console.error(`run-stages: ${digestCheck.message}`);
    return EXIT_INVOCATION;
  }

  console.log(`Pipeline: ${stages.length} stages · commit ${commit} · branch ${branch} · env ${environment}`);
  console.log(
    `Source:   ${ROOT} · ${tree.files.length} file(s) · digest ${tree.digest.slice(0, 16)}…` +
      (process.env.CI_TREE_DIGEST ? " (matches the tree the host exported)" : " (no host digest to compare against)"),
  );

  const records = [];
  let failed = null;
  for (const [index, stage] of stages.entries()) {
    console.log(`\n=== [${index + 1}/${stages.length}] ${stage.title} (${stage.id}) ===`);
    const record = runStage(stage, options);
    records.push(record);
    if (record.result === "failed") {
      failed = stage;
      console.error(`\n--- STAGE FAILED: ${stage.id} (exit ${record.exitCode}) ---`);
      console.error(`What this gate establishes: ${stage.why}`);
      break;
    }
  }

  const completedAt = nowIso();
  const passed = failed === null;

  // The evidence file is written on failure too. A record that only exists when things went well
  // cannot be used to find out what went wrong, and the absence of a file is indistinguishable from
  // a run that never happened.
  const evidence = {
    repository,
    commit,
    branch,
    result: passed ? "passed" : "failed",
    environment,
    startedAt,
    completedAt,
    checks: records.filter((r) => r.result === "passed").map((r) => r.id),
    failedStage: failed ? failed.id : null,
    // The tree this run actually executed, so the receipt names the bytes and not only the SHA.
    tree: { root: ROOT, files: tree.files.length, digest: tree.digest, hostDigest: process.env.CI_TREE_DIGEST || null },
    stages: records,
    pipeline: stages.map((s) => s.id),
  };

  try {
    await mkdir(options.out, { recursive: true });
    await writeFile(path.join(options.out, "latest.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  } catch (error) {
    // A pipeline that passed but could not write its receipt has still passed. Say so loudly and
    // keep the verdict honest rather than failing a green run on a bookkeeping problem.
    console.error(`run-stages: could not write evidence to ${options.out}: ${error.message}`);
  }

  console.log("");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`Repository:  ${repository}`);
  console.log(`Branch:      ${branch}`);
  console.log(`Commit:      ${commit}`);
  console.log(`Environment: ${environment}`);
  console.log(`Stages:      ${evidence.checks.join(", ") || "(none completed)"}`);
  console.log(`Result:      ${passed ? "PASS" : `FAIL at ${failed.id}`}`);
  console.log(`Completed:   ${completedAt}`);
  console.log("──────────────────────────────────────────────────────────────");

  return passed ? EXIT_OK : EXIT_FAILED;
}

process.exitCode = await main();
