#!/usr/bin/env node
/**
 * The authoritative CI command. Runs the complete pipeline in a disposable container.
 *
 *   node scripts/ci.mjs            (or scripts/ci.ps1, or scripts/ci.sh)
 *
 * WHY THIS IS A .mjs AND NOT A SHELL SCRIPT. The developer platform here is Windows and PowerShell;
 * a self-hosted runner would be Linux. Written twice, the two copies diverge on the first bug fix
 * that only gets applied to one of them — which is the same failure this whole exercise exists to
 * remove from the pipeline definition, and it would be strange to fix it there and reintroduce it
 * here. So the orchestration is one zero-dependency Node script, matching every other tool in this
 * repository, and `ci.ps1` and `ci.sh` are two-line entry points that hand straight to it.
 *
 * WHAT IT GUARANTEES. Nothing from the developer's machine takes part in the run except Docker
 * itself and the source tree. No SDK, no globally installed toolchain, no database, no service, no
 * cached state, no network. Every container, image, and volume it creates belongs to a
 * uniquely-named compose project and is destroyed on the way out, including when the pipeline fails.
 * It never touches a resource it did not create.
 *
 * Options:
 *   --commit=<sha>          Verify exactly that commit. Exports it to a throwaway git worktree and
 *                           builds the image from there, so the working tree takes no part. This is
 *                           what scripts/submit-pr.mjs uses.
 *   --with-mutation-check   Add the mutation checks (see scripts/ci-stages.mjs).
 *   --keep-on-failure       On failure, leave the compose project standing for inspection.
 *   --out=<dir>             Where the evidence file goes. Default artifacts/local-ci.
 *   --verbose               Echo every docker command.
 *
 * Exit 0 when the pipeline passed, 1 when it failed, 2 on invocation or environment error.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseYaml } from "./yaml.mjs";

const EXIT_OK = 0;
const EXIT_FAILED = 1;
const EXIT_INVOCATION = 2;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSE_FILE = path.join(ROOT, "compose.ci.yml");

/** The compose service that runs the pipeline. Everything else in the file is a dependency. */
const CI_SERVICE = "ci";

/** Docker wants forward slashes in bind paths, including on Windows. */
const dockerPath = (p) => p.replace(/\\/g, "/");

function run(command, args, { capture = false, verbose = false, cwd = ROOT } = {}) {
  if (verbose) console.log(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    shell: false,
  });
  if (result.error) return { code: 127, stdout: "", stderr: String(result.error.message) };
  return { code: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const git = (args) => run("git", args, { capture: true });

function parseArgs(argv) {
  const options = {
    commit: null,
    withMutationCheck: false,
    keepOnFailure: false,
    verbose: false,
    out: path.join(ROOT, "artifacts", "local-ci"),
    help: false,
  };
  for (const arg of argv) {
    if (arg.startsWith("--commit=")) options.commit = arg.slice("--commit=".length).trim();
    else if (arg.startsWith("--out=")) options.out = path.resolve(arg.slice("--out=".length));
    else if (arg === "--with-mutation-check") options.withMutationCheck = true;
    else if (arg === "--keep-on-failure") options.keepOnFailure = true;
    else if (arg === "--verbose") options.verbose = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unrecognised option: ${arg}. Try --help.`);
  }
  return options;
}

const USAGE = `Usage: node scripts/ci.mjs [options]

  --commit=<sha>         verify exactly that commit, from a throwaway worktree
  --with-mutation-check  also run the mutation checks
  --keep-on-failure      leave the compose project standing if the pipeline fails
  --out=<dir>            evidence directory (default artifacts/local-ci)
  --verbose              echo docker commands
  --help                 this message`;

/**
 * Services other than `ci`, in declaration order.
 *
 * Read from the compose file rather than hardcoded, so that adding a database to compose.ci.yml is
 * all it takes for this script to start waiting on its healthcheck. There is nothing to find today;
 * this repository has no service dependencies. The code exists because the reuse instruction was
 * explicit and because a list maintained in two places is the defect this whole change is about.
 */
function dependencyServices() {
  try {
    const doc = parseYaml(readFileSync(COMPOSE_FILE, "utf8"));
    const services = doc && typeof doc === "object" ? doc.services : null;
    if (!services || typeof services !== "object") return [];
    return Object.keys(services).filter((name) => name !== CI_SERVICE);
  } catch (error) {
    console.error(`ci: could not read ${path.basename(COMPOSE_FILE)}: ${error.message}`);
    console.error("ci: continuing with no dependency services — a service declared there will not be started.");
    return [];
  }
}

/** Resolve what is being verified, and prepare the build context. */
function resolveTarget(options) {
  const head = git(["rev-parse", "HEAD"]);
  if (head.code !== EXIT_OK) throw new Error("not a git repository, or no commits yet");
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();

  if (!options.commit) {
    const dirty = git(["status", "--porcelain"]).stdout.trim() !== "";
    return {
      commit: head.stdout.trim(),
      branch,
      dirty,
      context: ROOT,
      worktree: null,
    };
  }

  const resolved = git(["rev-parse", "--verify", `${options.commit}^{commit}`]);
  if (resolved.code !== EXIT_OK) throw new Error(`cannot resolve commit ${options.commit}`);
  const sha = resolved.stdout.trim();

  // A detached worktree, not the checkout. The image then contains exactly the tree recorded at that
  // commit — not the tree plus whatever is currently unsaved in an editor — which is the difference
  // between "this commit passed" and "something close to this commit passed".
  const worktree = path.join(os.tmpdir(), `mathstd-ci-${sha.slice(0, 12)}-${randomBytes(4).toString("hex")}`);
  const added = run("git", ["worktree", "add", "--detach", "--quiet", worktree, sha], { capture: true });
  if (added.code !== EXIT_OK) throw new Error(`could not export ${sha.slice(0, 12)} to a worktree: ${added.stderr.trim()}`);

  return { commit: sha, branch, dirty: false, context: worktree, worktree };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`ci: ${error.message}`);
    return EXIT_INVOCATION;
  }
  if (options.help) {
    console.log(USAGE);
    return EXIT_OK;
  }

  if (run("docker", ["version", "--format", "{{.Server.Version}}"], { capture: true }).code !== EXIT_OK) {
    console.error("ci: Docker is not available or its daemon is not running. Docker is the only host");
    console.error("ci: requirement besides git and Node — start Docker Desktop and try again.");
    return EXIT_INVOCATION;
  }

  let target;
  try {
    target = resolveTarget(options);
  } catch (error) {
    console.error(`ci: ${error.message}`);
    return EXIT_INVOCATION;
  }

  // Unique per run. Two repositories, two branches, or two terminals can run CI at the same moment
  // without sharing a container name, a network, or a volume — and teardown can be blunt precisely
  // because everything it names was created by this run.
  const project = `mathstd-ci-${randomBytes(6).toString("hex")}`;
  const compose = ["compose", "-f", COMPOSE_FILE, "-p", project];

  mkdirSync(options.out, { recursive: true });

  const env = {
    ...process.env,
    CI_CONTEXT: dockerPath(target.context),
    CI_OUT: dockerPath(options.out),
    CI_COMMIT: target.commit,
    CI_BRANCH: target.branch,
    CI_ENV: "docker",
    CI_REPO: path.basename(ROOT),
  };
  const composeRun = (args, opts = {}) =>
    spawnSync("docker", [...compose, ...args], {
      cwd: ROOT,
      env,
      encoding: "utf8",
      stdio: opts.capture ? "pipe" : "inherit",
      shell: false,
    });

  console.log(`Local CI · project ${project}`);
  console.log(`  repository ${path.basename(ROOT)}`);
  console.log(`  branch     ${target.branch}`);
  console.log(`  commit     ${target.commit}${target.dirty ? "  (working tree has uncommitted changes)" : ""}`);
  console.log(`  source     ${target.worktree ? "exported worktree of the commit" : "working tree"}`);
  if (target.dirty) {
    console.log("");
    console.log("  NOTE: verifying the working tree, which does not match the commit above.");
    console.log("        submit-pr refuses a dirty tree, so a submitted run never reaches this state.");
  }
  console.log("");

  let code = EXIT_FAILED;
  let torndown = false;
  try {
    if (options.verbose) console.log(`$ docker ${compose.join(" ")} build`);
    if (composeRun(["build"]).status !== EXIT_OK) {
      console.error("\nci: image build failed. No pipeline stage ran.");
      return EXIT_INVOCATION;
    }

    const dependencies = dependencyServices();
    if (dependencies.length > 0) {
      console.log(`Starting dependencies: ${dependencies.join(", ")}`);
      // --wait blocks on each service's declared healthcheck. Never a sleep: a timer that is long
      // enough today is a flake on a slower machine and wasted minutes on a faster one.
      if (composeRun(["up", "--wait", "--detach", ...dependencies]).status !== EXIT_OK) {
        console.error("\nci: dependencies did not become healthy. No pipeline stage ran.");
        return EXIT_INVOCATION;
      }
    }

    const stageArgs = ["node", "scripts/run-stages.mjs", "--out=/ci-out"];
    if (options.withMutationCheck) stageArgs.push("--with-mutation-check");
    if (options.verbose) stageArgs.push("--verbose");

    // --rm unless we are being asked to preserve the failure: `docker compose run --rm` deletes the
    // container the instant it exits, which is exactly wrong when the reason you want it is that it
    // failed.
    const runArgs = ["run", "--no-deps"];
    if (!options.keepOnFailure) runArgs.push("--rm");
    code = composeRun([...runArgs, CI_SERVICE, ...stageArgs]).status ?? EXIT_FAILED;
  } finally {
    const keep = options.keepOnFailure && code !== EXIT_OK;
    if (keep) {
      console.log("");
      console.log(`--keep-on-failure: compose project ${project} left standing.`);
      console.log(`  inspect:  docker compose -f "${COMPOSE_FILE}" -p ${project} ps -a`);
      console.log(`  logs:     docker compose -f "${COMPOSE_FILE}" -p ${project} logs`);
      console.log(`  shell in: docker compose -f "${COMPOSE_FILE}" -p ${project} run --rm ci sh`);
      console.log(`  clean up: docker compose -f "${COMPOSE_FILE}" -p ${project} down --volumes --rmi local`);
      if (target?.worktree) console.log(`  source:   ${target.worktree}  (remove with: git worktree remove --force "${target.worktree}")`);
    } else {
      // Scoped to this run's project name, so it cannot reach a developer's own containers, volumes,
      // or images however they are named. --rmi local removes the image this run built; without it,
      // a unique project name per run would leave one image behind every time.
      const down = spawnSync("docker", [...compose, "down", "--volumes", "--remove-orphans", "--rmi", "local", "--timeout", "10"], {
        cwd: ROOT,
        env,
        encoding: "utf8",
        stdio: options.verbose ? "inherit" : "pipe",
        shell: false,
      });
      if (down.status !== EXIT_OK && options.verbose) console.error("ci: teardown reported a problem; see above.");
      torndown = true;
      if (target?.worktree) {
        run("git", ["worktree", "remove", "--force", target.worktree], { capture: true });
        rmSync(target.worktree, { recursive: true, force: true });
      }
    }
  }

  if (torndown) console.log("\nEnvironment torn down.");

  let evidence = null;
  try {
    evidence = JSON.parse(readFileSync(path.join(options.out, "latest.json"), "utf8"));
  } catch {
    // The runner writes this. Its absence means the container never got far enough to write one,
    // which is itself worth saying rather than crashing on.
  }
  if (evidence) {
    console.log(`Evidence: ${dockerPath(path.relative(ROOT, path.join(options.out, "latest.json")))}`);
  } else if (code === EXIT_OK) {
    console.error("ci: the pipeline reported success but wrote no evidence file. Treating as a failure.");
    return EXIT_FAILED;
  }

  return code === EXIT_OK ? EXIT_OK : EXIT_FAILED;
}

process.exitCode = await main();
