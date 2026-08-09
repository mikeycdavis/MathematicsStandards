/**
 * `math-standards init` — bootstrap a research project into the framework.
 *
 * The safety contract IS the design, so the module is split in two:
 *
 *   plan()   pure. Inspects the target, decides the mode, and returns the actions it WOULD take.
 *            Touches nothing.
 *   apply()  executes a plan. The only function in this file that writes.
 *
 * `--dry-run` is therefore not a separate code path that has to be kept in step with the real one —
 * it is `plan()` without `apply()`. A dry-run whose output does not predict the real run is worse
 * than none, because it is trusted, and the only way to guarantee that is to make them the same
 * computation. This is the charter's dry-run requirement, satisfied structurally.
 *
 * Mutating is not the same as destructive:
 *
 *   create a missing artifact   → ordinary execute. No approval; this is what init is for.
 *   replace an existing one     → destructive. Refused by default, and reported as a conflict.
 *                                 Overwriting requires --force-overwrite AND naming each path.
 *
 * That distinction is why init can be useful without prompting for approval on every harmless
 * scaffold creation, while an overwrite stays guarded.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRAMEWORK = path.resolve(HERE, "..");

export const MODES = {
  /** No mathematics yet: the ledger starts empty and grows with the work. */
  NEW_PROJECT: "new-project",
  /** Mathematics and a ledger already exist: normalise, do not replace. */
  EXISTING_WITH_LEDGER: "existing-with-ledger",
  /** Mathematics exists and no ledger does: the claims have to be registered retrospectively. */
  LEDGER_REQUIRED: "ledger-required",
};

/** Files init can create, and where their content comes from. */
const ARTIFACTS = [
  { path: "project-policy.yml", template: "templates/project-policy.yml" },
  { path: "PROJECT.md", template: "templates/PROJECT.md" },
  { path: "AGENTS.md", template: "templates/AGENTS.md" },
  { path: "CLAUDE.md", template: "templates/CLAUDE.md" },
  { path: "artifacts/claims-ledger.md", template: "templates/claims-ledger.md" },
  { path: "artifacts/open-problems/", directory: true },
  { path: "artifacts/adr/", directory: true },
];

/**
 * Signals that a repository already contains mathematical work.
 *
 * Deliberately conservative: a false "new project" is the dangerous direction, because it invites an
 * empty ledger to be written over a body of existing claims, and a ledger that omits the claims a
 * project has already made is worse than none — it looks like a complete record. A false "existing"
 * only costs a routing decision the operator can override with --mode.
 */
const MATHEMATICS_MARKERS = [
  "proofs", "notes", "papers", "paper", "computations", "formal", "lean", "coq", "isabelle",
  "lakefile.lean", "lakefile.toml", "_CoqProject", "ROOT", "main.tex", "paper.tex",
];

const LEDGER_MARKERS = ["artifacts/claims-ledger.md", "claims-ledger.md"];
const PROBLEM_MARKERS = ["artifacts/open-problems"];

const has = (root, p) => existsSync(path.join(root, p));

/**
 * A directory counts as evidence only when it has content.
 *
 * This exists because of a bug the reference implementation's tests caught: init creates an EMPTY
 * scaffold directory, and a second run then read its own output as proof that the artifact existed —
 * flipping the mode and erasing the signal that work was still required. An empty open-problems
 * directory is not an open-problem record, and a tool must never treat its own scaffolding as
 * evidence about the project.
 */
function hasContent(root, p) {
  const target = path.join(root, p);
  if (!existsSync(target)) return false;
  try {
    return readdirSync(target).some((f) => f.endsWith(".md"));
  } catch {
    return true; // Not a directory — a plain claims-ledger.md counts on its own.
  }
}

/**
 * Decide which of the three outcomes applies. Returns { mode, evidence, confidence }.
 *
 * `confidence` is INFERRED for everything except an explicit override, because this is a judgement
 * made from file presence. A wrong guess is recoverable only if the reader can see which guess was
 * made (Standard 33 R4).
 */
export function detectMode(root, override = null) {
  const evidence = [];
  if (override) {
    return { mode: override, evidence: ["--mode was given explicitly"], confidence: "CONFIRMED_BY_OWNER" };
  }

  const mathematics = MATHEMATICS_MARKERS.filter((m) => has(root, m));
  const ledgers = LEDGER_MARKERS.filter((m) => hasContent(root, m));
  const problems = PROBLEM_MARKERS.filter((m) => hasContent(root, m));

  if (mathematics.length === 0) {
    evidence.push("no existing mathematical work found");
    return { mode: MODES.NEW_PROJECT, evidence, confidence: "INFERRED" };
  }
  evidence.push(`mathematical work: ${mathematics.join(", ")}`);

  if (ledgers.length > 0) {
    evidence.push(`claims ledger: ${ledgers.join(", ")}`);
    return { mode: MODES.EXISTING_WITH_LEDGER, evidence, confidence: "INFERRED" };
  }
  if (problems.length > 0) {
    evidence.push(`open-problem records: ${problems.join(", ")}`);
    return { mode: MODES.EXISTING_WITH_LEDGER, evidence, confidence: "INFERRED" };
  }

  evidence.push("no claims ledger found alongside the existing mathematics");
  return { mode: MODES.LEDGER_REQUIRED, evidence, confidence: "INFERRED" };
}

/**
 * Compute what init would do. Pure — reads the target and the templates, writes nothing.
 *
 * @param root      target repository
 * @param options   { mode, overwrite: string[] } — `overwrite` names paths the operator has
 *                  explicitly approved replacing. An empty list means no overwrite is authorised,
 *                  which is the default.
 */
export async function plan(root, options = {}) {
  const { mode, evidence, confidence } = detectMode(root, options.mode ?? null);
  const approvedOverwrites = new Set(options.overwrite ?? []);

  const actions = [];
  for (const artifact of ARTIFACTS) {
    const target = path.join(root, artifact.path);
    const exists = existsSync(target);

    if (artifact.directory) {
      // Creating a directory alongside existing contents is safe and expected; only writing a FILE
      // over one of that name is destructive (Standard 33 R2).
      actions.push(
        exists
          ? { action: "preserve", path: artifact.path, reason: "directory already exists" }
          : { action: "create", path: artifact.path, kind: "directory" },
      );
      continue;
    }

    const content = await readFile(path.join(FRAMEWORK, artifact.template), "utf8");

    if (!exists) {
      actions.push({ action: "create", path: artifact.path, kind: "file", bytes: content.length });
      continue;
    }

    const current = await readFile(target, "utf8");
    if (current === content) {
      // Idempotence: a second run finds what the first wrote and leaves it alone (Standard 33 R3).
      actions.push({ action: "preserve", path: artifact.path, reason: "already matches the template" });
      continue;
    }

    if (approvedOverwrites.has(artifact.path)) {
      actions.push({
        action: "overwrite",
        path: artifact.path,
        kind: "file",
        reason: "explicitly approved for replacement",
        destructive: true,
      });
      continue;
    }

    actions.push({
      action: "conflict",
      path: artifact.path,
      reason: "exists and differs from the template; nothing was changed",
      remediation: `Review it. To replace it, re-run with --force-overwrite=${artifact.path}.`,
    });
  }

  // Registering the claims a project has already made is human work: it means reading the existing
  // mathematics and deciding, for each result, what status the evidence actually supports. init
  // detects the condition and hands off rather than guessing, because a generated ledger would
  // record every stated result at the status its author gave it, which is precisely the assumption
  // the ledger exists to test.
  const ledgerRequired = mode === MODES.LEDGER_REQUIRED;

  return {
    schemaVersion: "1.0.0",
    mode,
    modeConfidence: confidence,
    modeEvidence: evidence,
    created: actions.filter((a) => a.action === "create").map((a) => a.path),
    preserved: actions.filter((a) => a.action === "preserve").map((a) => a.path),
    conflicts: actions.filter((a) => a.action === "conflict"),
    overwrites: actions.filter((a) => a.action === "overwrite").map((a) => a.path),
    ledgerRequired,
    nextStep: ledgerRequired
      ? "Register the claims this project has already made in artifacts/claims-ledger.md, giving each the status its evidence supports rather than the status it currently carries in the writing. Then run `math-standards validate`."
      : mode === MODES.EXISTING_WITH_LEDGER
        ? "Reconcile the existing ledger against Standards 2, 3, and 8 — statuses, evidence, and the dependency graph. Do not replace it."
        : "Register your first claims in artifacts/claims-ledger.md, declare your regimes in project-policy.yml, then run `math-standards validate`.",
    actions,
  };
}

/**
 * Execute a plan. The only writing function here.
 *
 * A partially-completed run must leave no partial files: content is written in one call per file,
 * and a failure stops the run rather than continuing to the next artifact. A truncated
 * project-policy.yml fails validation in a way that looks like the project's fault
 * (Standard 33 R2).
 */
export async function apply(root, planned) {
  const done = [];
  for (const action of planned.actions) {
    if (action.action === "create" && action.kind === "directory") {
      await mkdir(path.join(root, action.path), { recursive: true });
      done.push(action.path);
      continue;
    }
    if (action.action === "create" || action.action === "overwrite") {
      const artifact = ARTIFACTS.find((a) => a.path === action.path);
      const content = await readFile(path.join(FRAMEWORK, artifact.template), "utf8");
      await mkdir(path.dirname(path.join(root, action.path)), { recursive: true });
      await writeFile(path.join(root, action.path), content, "utf8");
      done.push(action.path);
    }
    // `preserve` and `conflict` write nothing, by construction.
  }
  return done;
}

/** Human-readable rendering of a plan or a completed run. */
export function render(report, { dryRun }) {
  const out = [];
  out.push(dryRun ? "math-standards init — dry run, nothing was written" : "math-standards init");
  out.push("");
  out.push(`  Mode: ${report.mode} [${report.modeConfidence}]`);
  for (const line of report.modeEvidence) out.push(`        ${line}`);
  out.push("");

  const label = dryRun ? "would create" : "created";
  if (report.created.length) {
    out.push(`  ${label}:`);
    for (const p of report.created) out.push(`    + ${p}`);
  }
  if (report.overwrites.length) {
    out.push(`  ${dryRun ? "would overwrite" : "overwrote"} (approved):`);
    for (const p of report.overwrites) out.push(`    ! ${p}`);
  }
  if (report.preserved.length) {
    out.push("  preserved:");
    for (const p of report.preserved) out.push(`    = ${p}`);
  }
  if (report.conflicts.length) {
    out.push("  conflicts — nothing was changed:");
    for (const c of report.conflicts) {
      out.push(`    ? ${c.path}`);
      out.push(`        ${c.reason}`);
      out.push(`        ${c.remediation}`);
    }
  }
  out.push("");

  if (report.ledgerRequired) {
    out.push("  This project already contains mathematics and has no claims ledger.");
    out.push("  The ledger template is a scaffold, not a record: registering the existing claims means");
    out.push("  deciding, for each result, what status its evidence supports — which is exactly the");
    out.push("  question the ledger exists to ask, and not one a bootstrap command may answer for you.");
    out.push("");
  }
  out.push(`  Next: ${report.nextStep}`);

  if (!dryRun && report.conflicts.length === 0 && report.created.length === 0) {
    out.push("");
    out.push("  Nothing to do — this project is already bootstrapped.");
  }
  return out.join("\n");
}
