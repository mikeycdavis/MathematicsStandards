#!/usr/bin/env node
/**
 * Verified PR submission.
 *
 *   node scripts/submit-pr.mjs      (or scripts/submit-pr.ps1, or scripts/submit-pr.sh)
 *
 * THE INVARIANT THIS EXISTS TO ENFORCE:
 *
 *     The commit pushed for a PR is exactly the commit that passed the complete local Docker CI
 *     pipeline.
 *
 * Which is not the same as "CI passed and then we pushed". Between those two events a developer can
 * commit, amend, rebase, or have a watcher process do it for them, and a pipeline result that is
 * merely recent proves nothing about the tree that arrives on GitHub. So the SHA is resolved before
 * the run, the container is built from a worktree exported at exactly that SHA, the SHA is resolved
 * again afterwards, and the push names the verified SHA explicitly rather than pushing whatever HEAD
 * has become:
 *
 *     git push origin <verified-sha>:refs/heads/<branch>
 *
 * Three independent things would each have to fail before an unverified commit could reach a PR: the
 * clean-tree check, the before/after SHA comparison, and the explicit SHA in the refspec. The last
 * one is the belt: even if the comparison were somehow wrong, the object pushed is still the object
 * that was built.
 *
 * WHAT IT WILL NOT DO. It will not commit anything, stage anything, stash anything, amend anything,
 * or push when verification did not pass. If the pipeline is red the correct outcome is a red
 * pipeline, not a green one arrived at by editing the branch.
 *
 * Options:
 *   --base=<branch>        PR base. Default: the repository's default branch.
 *   --draft                Open the PR as a draft.
 *   --title=<text>         PR title. Default: the subject line of the verified commit.
 *   --body=<text>          PR body. The verification block is appended, never substituted.
 *   --body-file=<path>     PR body read from a file. Same appending rule.
 *   --keep-on-failure      Passed through to CI: leave the container standing if the pipeline fails.
 *   --with-mutation-check  Passed through to CI.
 *   --dry-run              Do everything including the full pipeline, then report what would be
 *                          pushed and created, and do neither.
 *
 * Exit 0 on success, 1 on any refusal or failure, 2 on invocation error.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const EXIT_OK = 0;
const EXIT_REFUSED = 1;
const EXIT_INVOCATION = 2;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const CI_FAILED_MESSAGE = "CI failed. No branch was pushed and no PR was created.";
export const SHA_CHANGED_MESSAGE =
  "HEAD changed after CI verification. The current commit has not been verified. Re-run CI before submitting.";

// ---------------------------------------------------------------------------
// The decisions, as pure functions.
//
// Separated from the process work so test/local-ci.test.mjs can assert the refusals directly. The
// alternative — proving the SHA guard by rewriting real history and watching what happens — tests
// the same logic while risking the thing it protects.
// ---------------------------------------------------------------------------

/**
 * The check at the centre of the invariant.
 *
 * @param {string} verified SHA captured before the pipeline ran, and built into the image.
 * @param {string} current  SHA resolved after the pipeline finished.
 * @returns {{ok: boolean, message: string|null}}
 */
export function checkCommitUnchanged(verified, current) {
  if (typeof verified !== "string" || !/^[0-9a-f]{40}$/i.test(verified)) {
    return { ok: false, message: `Verified commit is not a full SHA: ${JSON.stringify(verified)}` };
  }
  if (typeof current !== "string" || !/^[0-9a-f]{40}$/i.test(current)) {
    return { ok: false, message: `Current commit is not a full SHA: ${JSON.stringify(current)}` };
  }
  if (verified.toLowerCase() !== current.toLowerCase()) {
    return {
      ok: false,
      message: `${SHA_CHANGED_MESSAGE}\n  verified: ${verified}\n  current:  ${current}`,
    };
  }
  return { ok: true, message: null };
}

/** A branch is submittable when it is a real branch and is not the base it would target. */
export function checkBranchSubmittable(branch, base) {
  if (!branch || branch === "HEAD") {
    return { ok: false, message: "HEAD is detached. Check out a branch before submitting a PR." };
  }
  if (branch === base) {
    return {
      ok: false,
      message: `Refusing to submit: ${branch} is the base branch. Create a feature branch and submit that.`,
    };
  }
  return { ok: true, message: null };
}

/** The evidence file must describe the run we think we just did. */
export function checkEvidenceMatches(evidence, { commit, branch }) {
  if (!evidence) return { ok: false, message: "CI wrote no evidence file, so the run cannot be attested." };
  if (evidence.result !== "passed") {
    return { ok: false, message: `CI evidence records result "${evidence.result}", not "passed".` };
  }
  if (evidence.commit !== commit) {
    return { ok: false, message: `CI evidence is for commit ${evidence.commit}, not ${commit}.` };
  }
  if (evidence.branch !== branch) {
    return { ok: false, message: `CI evidence is for branch ${evidence.branch}, not ${branch}.` };
  }
  return { ok: true, message: null };
}

/**
 * The PR body: whatever the author wrote, then the verification block.
 *
 * Appended and clearly labelled. The wording says Docker, names the SHA, and does not use the word
 * "CI" unqualified, because a reviewer who sees a green PR body and assumes GitHub Actions ran has
 * been misled by this file, not by their own carelessness.
 */
export function composePrBody(userBody, { commit, branch, evidence }) {
  const checks = (evidence?.checks ?? []).join(", ");
  const block = [
    "## Local CI",
    "",
    "Verified by the repository's containerized pipeline on the submitting developer's machine.",
    "This is **not** a GitHub Actions result; GitHub-hosted CI may or may not have run.",
    "",
    `- **Verified commit:** \`${commit}\``,
    `- **Branch:** \`${branch}\``,
    "- **Result:** PASS",
    "- **Environment:** Docker (`compose.ci.yml`, no network, disposable)",
    `- **Stages:** ${checks || "(not recorded)"}`,
    `- **Completed:** ${evidence?.completedAt ?? "(not recorded)"}`,
    "",
    "The commit pushed for this PR is exactly the commit that passed that pipeline:",
    "`scripts/submit-pr.mjs` resolves HEAD before and after the run, refuses to continue if it",
    "moved, and pushes the verified SHA by name. Reproduce with:",
    "",
    "```",
    `node scripts/ci.mjs --commit=${commit}`,
    "```",
  ].join("\n");

  const authored = (userBody ?? "").trim();
  return authored ? `${authored}\n\n---\n\n${block}\n` : `${block}\n`;
}

// ---------------------------------------------------------------------------
// Process work.
// ---------------------------------------------------------------------------

function run(command, args, { capture = true, cwd = ROOT } = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: capture ? "pipe" : "inherit", shell: false });
  if (result.error) return { code: 127, stdout: "", stderr: String(result.error.message) };
  return { code: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const git = (args) => run("git", args);

/**
 * Turn `refs/remotes/origin/<branch>` into `<branch>`.
 *
 * FROM REVIEW. This took the last path component, which is right until a default branch contains a
 * slash — `refs/remotes/origin/release/main` gave `main`. Branch names with slashes are ordinary,
 * and the damage was not limited to a wrong `--base`: `checkBranchSubmittable` compares the base
 * against `git rev-parse --abbrev-ref HEAD`, which reports the full `release/main`, so the guard
 * that refuses to open a PR from the base branch onto itself would have stopped recognising it.
 *
 * @param {string} ref
 * @returns {string|null}
 */
export function branchFromRemoteRef(ref) {
  const match = /^refs\/remotes\/[^/]+\/(.+)$/.exec((ref ?? "").trim());
  return match ? match[1] : null;
}

/** The remote's default branch, so `--base` has a correct default without hardcoding a name. */
function defaultBranch() {
  const symbolic = git(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]);
  if (symbolic.code === EXIT_OK) {
    const name = branchFromRemoteRef(symbolic.stdout);
    if (name) return name;
  }
  return "main";
}

function parseArgs(argv) {
  const options = {
    base: null, draft: false, title: null, body: null,
    keepOnFailure: false, withMutationCheck: false, dryRun: false, help: false,
  };
  for (const arg of argv) {
    if (arg.startsWith("--base=")) options.base = arg.slice("--base=".length).trim();
    else if (arg.startsWith("--title=")) options.title = arg.slice("--title=".length);
    else if (arg.startsWith("--body=")) options.body = arg.slice("--body=".length);
    else if (arg.startsWith("--body-file=")) options.body = readFileSync(path.resolve(arg.slice("--body-file=".length)), "utf8");
    else if (arg === "--draft") options.draft = true;
    else if (arg === "--keep-on-failure") options.keepOnFailure = true;
    else if (arg === "--with-mutation-check") options.withMutationCheck = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unrecognised option: ${arg}. Try --help.`);
  }
  return options;
}

const USAGE = `Usage: node scripts/submit-pr.mjs [options]

  --base=<branch>        PR base (default: the remote's default branch)
  --draft                open the PR as a draft
  --title=<text>         PR title (default: the verified commit's subject)
  --body=<text>          PR body; the verification block is appended
  --body-file=<path>     PR body from a file
  --keep-on-failure      leave the CI container standing on failure
  --with-mutation-check  include the mutation checks in the pipeline
  --dry-run              run everything, then report instead of pushing
  --help                 this message`;

function refuse(message) {
  console.error("");
  console.error(message);
  return EXIT_REFUSED;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`submit-pr: ${error.message}`);
    return EXIT_INVOCATION;
  }
  if (options.help) {
    console.log(USAGE);
    return EXIT_OK;
  }

  // 1. A git repository.
  if (git(["rev-parse", "--git-dir"]).code !== EXIT_OK) {
    console.error("submit-pr: not a git repository.");
    return EXIT_INVOCATION;
  }

  const base = options.base ?? defaultBranch();
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();

  // 2. A branch that may be submitted.
  const branchCheck = checkBranchSubmittable(branch, base);
  if (!branchCheck.ok) return refuse(branchCheck.message);

  // 3. A clean tree. Without this the pipeline would verify a commit while the developer's next
  //    thought sits unstaged beside it, and "verified" would describe something nobody reviewed.
  const dirty = git(["status", "--porcelain"]).stdout.trim();
  if (dirty) {
    console.error("");
    console.error("Refusing to submit: the working tree has uncommitted changes.");
    console.error("Commit or stash them. This command never commits on your behalf.");
    console.error("");
    console.error(dirty);
    return EXIT_REFUSED;
  }

  // 4. Capture the SHA that is about to be verified.
  const verified = git(["rev-parse", "HEAD"]).stdout.trim();
  if (!/^[0-9a-f]{40}$/i.test(verified)) {
    console.error("submit-pr: could not resolve HEAD to a commit.");
    return EXIT_INVOCATION;
  }

  console.log("Verified PR submission");
  console.log(`  branch  ${branch}`);
  console.log(`  base    ${base}`);
  console.log(`  commit  ${verified}`);
  console.log("");
  console.log("Running the full containerized pipeline against that exact commit...");
  console.log("");

  // 5. Run the authoritative pipeline. Same script a developer runs by hand; there is no separate
  //    submission-flavoured pipeline that could drift from it.
  const ciArgs = [path.join(ROOT, "scripts", "ci.mjs"), `--commit=${verified}`];
  if (options.keepOnFailure) ciArgs.push("--keep-on-failure");
  if (options.withMutationCheck) ciArgs.push("--with-mutation-check");
  const ci = run(process.execPath, ciArgs, { capture: false });

  // 6. Stop on failure. Nothing after this point runs.
  if (ci.code !== EXIT_OK) return refuse(CI_FAILED_MESSAGE);

  let evidence = null;
  try {
    evidence = JSON.parse(readFileSync(path.join(ROOT, "artifacts", "local-ci", "latest.json"), "utf8"));
  } catch { /* handled by checkEvidenceMatches */ }
  const evidenceCheck = checkEvidenceMatches(evidence, { commit: verified, branch });
  if (!evidenceCheck.ok) return refuse(`${evidenceCheck.message}\n${CI_FAILED_MESSAGE}`);

  // 7 & 8. Resolve HEAD again and refuse if it moved.
  const current = git(["rev-parse", "HEAD"]).stdout.trim();
  const unchanged = checkCommitUnchanged(verified, current);
  if (!unchanged.ok) return refuse(unchanged.message);

  const stillClean = git(["status", "--porcelain"]).stdout.trim() === "";
  if (!stillClean) {
    return refuse(
      "The working tree changed during verification. The current state has not been verified.\n" +
        "Re-run CI before submitting.",
    );
  }

  const subject = git(["log", "-1", "--pretty=%s", verified]).stdout.trim();
  const title = options.title ?? subject;
  const body = composePrBody(options.body, { commit: verified, branch, evidence });

  // 9. Push the verified object by name. Not `git push origin HEAD`, and not `git push` — the
  //    refspec names the SHA that was built, so the push is incapable of carrying anything else.
  const refspec = `${verified}:refs/heads/${branch}`;
  if (options.dryRun) {
    console.log("");
    console.log("--dry-run: verification passed. Nothing was pushed and no PR was created.");
    console.log("");
    console.log("Would run:");
    console.log(`  git push --set-upstream origin ${refspec}`);
    console.log(`  gh pr create --base ${base} --head ${branch} --title ${JSON.stringify(title)}${options.draft ? " --draft" : ""} --body <verification block>`);
    console.log("");
    console.log("PR body would be:");
    console.log("────────────────────────────────────────");
    console.log(body);
    console.log("────────────────────────────────────────");
    return EXIT_OK;
  }

  console.log(`Pushing verified commit ${verified} to origin/${branch}...`);
  const push = run("git", ["push", "--set-upstream", "origin", refspec], { capture: false });
  if (push.code !== EXIT_OK) {
    return refuse("Push failed. No PR was created. The commit remains verified locally; re-run to retry.");
  }

  // 10. The PR, if gh can do it. `gh` uses the developer's existing authenticated session; no token
  //     is read, stored, written, or passed through this repository.
  const ghAvailable = run("gh", ["--version"]).code === EXIT_OK;
  const ghAuthed = ghAvailable && run("gh", ["auth", "status"]).code === EXIT_OK;
  if (!ghAuthed) {
    console.log("");
    console.log(`Branch pushed: ${branch} at ${verified}`);
    console.log(ghAvailable
      ? "GitHub CLI is installed but not authenticated, so no PR was created."
      : "GitHub CLI is not installed, so no PR was created.");
    console.log("Authenticate with `gh auth login`, then open the PR yourself. Verification stands.");
    return EXIT_OK;
  }

  // An open PR for this branch already exists when a review asked for changes. Pushing the verified
  // commit is the whole update — a PR tracks a branch — so creating a second one is neither possible
  // nor wanted. Without this, `gh pr create` failed after a successful push and the run reported a
  // refusal for work that had actually succeeded.
  const existing = run("gh", ["pr", "view", branch, "--json", "url,number,state"]);
  if (existing.code === EXIT_OK) {
    try {
      const pr = JSON.parse(existing.stdout);
      if (pr.state === "OPEN") {
        console.log("");
        console.log("──────────────────────────────────────────────────────────────");
        console.log(`Repository:      ${path.basename(ROOT)}`);
        console.log(`Branch:          ${branch}`);
        console.log(`Verified commit: ${verified}`);
        console.log("Pipeline result: PASS");
        console.log(`Stages:          ${(evidence.checks ?? []).join(", ")}`);
        console.log("Environment:     Docker (local, not GitHub Actions)");
        console.log(`Completed:       ${new Date().toISOString()}`);
        console.log(`Pull request:    ${pr.url}  (existing PR #${pr.number} updated, not recreated)`);
        console.log("──────────────────────────────────────────────────────────────");
        return EXIT_OK;
      }
    } catch {
      // Unparseable output. Fall through and let `pr create` speak for itself.
    }
  }

  const ghArgs = ["pr", "create", "--base", base, "--head", branch, "--title", title, "--body", body];
  if (options.draft) ghArgs.push("--draft");
  const pr = run("gh", ghArgs);
  if (pr.code !== EXIT_OK) {
    console.log("");
    console.log(`Branch pushed: ${branch} at ${verified}`);
    console.error(`gh pr create failed:\n${pr.stderr.trim() || pr.stdout.trim()}`);
    console.error("The branch is pushed and verified; create the PR manually.");
    return EXIT_REFUSED;
  }

  console.log("");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`Repository:      ${path.basename(ROOT)}`);
  console.log(`Branch:          ${branch}`);
  console.log(`Verified commit: ${verified}`);
  console.log("Pipeline result: PASS");
  console.log(`Stages:          ${(evidence.checks ?? []).join(", ")}`);
  console.log("Environment:     Docker (local, not GitHub Actions)");
  console.log(`Completed:       ${new Date().toISOString()}`);
  console.log(`Pull request:    ${pr.stdout.trim()}`);
  console.log("──────────────────────────────────────────────────────────────");
  return EXIT_OK;
}

// Importable for tests; only acts when invoked as a program.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
