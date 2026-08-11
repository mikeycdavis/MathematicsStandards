#!/usr/bin/env node
/**
 * math-standards — audit a research repository against the mathematics standards.
 *
 * Usage:
 *   math-standards audit    [path] [--json] [--dir=<path>] [--strict]
 *   math-standards validate [path] [--json] [--dir=<path>]
 *   math-standards check    [path]                 alias of validate
 *   math-standards explain  <rule-id | standard-number> [--dir=<path>] [--json]
 *   math-standards status   [path] [--json]
 *   math-standards init     [path] [--dry-run] [--force-overwrite=<path>]
 *
 * The CLI skeleton — argument parsing, the audit/validate split, the finding envelope, the
 * exit-code contract, and the use-versus-mention scanning discipline — is vendored from the
 * reference standards toolchain and kept deliberately unchanged, because each of its guards
 * exists because the corresponding defect actually happened. The detectors are this repository's
 * own: they read a claims ledger and proof-assistant sources rather than routes and job classes.
 *
 * No third-party dependencies, and no reference to any other standards repository at run time.
 */

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadCatalog, assertBindings, coverage, resolve as resolveRule } from "./catalog.mjs";
import { evaluate, envelope, isInvariant, EVIDENCE_LABELS } from "./compliance.mjs";
import { plan as planInit, apply as applyInit, render as renderInit } from "./init.mjs";
import { parseYaml } from "./yaml.mjs";
import { classifyArg } from "./invocation.mjs";
import { validate as validateSchema } from "./jsonschema.mjs";
import {
  STATUS_RANK,
  PROVED_RANK,
  EVIDENCE_CEILING,
  PROOF_EVIDENCE,
  LITERATURE_EVIDENCE,
  rankOf,
  isProvedRank,
  capsSupport,
  parseLedger,
  dependencyClosure,
  findCycles,
  danglingEdges,
  findReferences,
  looksUniversal,
  looksBounded,
  isPathShaped,
} from "./claims.mjs";

/**
 * This file names the very tokens it searches for — `sorry`, `Admitted`, `native_decide`. Scanning
 * it would report every placeholder it knows about as a placeholder in whatever repository is being
 * audited. It excludes itself for that reason; every other file is protected by scanning only
 * comment-stripped source, never raw text.
 */
const SELF = fileURLToPath(import.meta.url);
const HOME = path.resolve(path.dirname(SELF), "..");
const SCHEMA_VERSION = "1.0.0";

/** The rules this evaluator examines. Defined in its own module — see the comment there. */
import { EVALUATED_RULES } from "./evaluated.mjs";
import { assertSurfacesKnown, inspectionFor, resolved, unresolved, SUBJECT } from "./surfaces.mjs";
// ---------------------------------------------------------------------------
// Standard references
// ---------------------------------------------------------------------------

/**
 * Standard number to document path, read from this framework's own reviewed inventory rather than
 * hardcoded. A standardRef that does not resolve is worse than none: it sends a reader to a page
 * that does not explain the finding, and hardcoding twenty-two paths is a second place for them to
 * be wrong.
 */
const STANDARD_PATHS = await (async () => {
  const out = new Map();
  try {
    const inv = JSON.parse(await readFile(path.join(HOME, "artifacts/standards-source-inventory.json"), "utf8"));
    for (const s of inv.standards ?? []) if (s.implementedBy) out.set(s.number, s.implementedBy);
  } catch {
    // Left empty: findings then carry a null standardRef, which agent.explainable-findings reports.
  }
  return out;
})();

const TOTAL_STANDARDS = STANDARD_PATHS.size || null;

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

/**
 * Directories never worth walking. `fixtures` is here for a different reason than the rest: test
 * fixtures are deliberately malformed — that is their job — so scanning them reports the test data's
 * planted defects as the repository's own. A repository can still audit one directly with `--dir=`.
 */
const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "out", "bin", "obj", ".next", ".nuxt",
  ".venv", "venv", "__pycache__", "target", "vendor", "coverage", ".turbo",
  ".gradle", ".idea", ".vs", ".vscode", ".pytest_cache", ".lake", "_build", "fixtures",
]);

/** Extensions whose contents are worth scanning at all. */
const TEXT_EXT = new Set([
  ".md", ".txt", ".yml", ".yaml", ".json", ".py", ".js", ".mjs", ".cjs", ".ts",
  ".jl", ".r", ".m", ".sage", ".c", ".cpp", ".rs", ".go", ".sh", ".ps1",
  ".lean", ".v", ".thy", ".agda", ".rkt",
]);

/** Proof-assistant sources, by assistant. `.v` is ambiguous and is disambiguated below. */
const PROOF_EXT = new Map([
  [".lean", "lean4"],
  [".v", "coq"],
  [".thy", "isabelle"],
]);

/** Files that may contain a computation whose arithmetic matters. */
const SCRIPT_EXT = new Set([".py", ".js", ".mjs", ".cjs", ".ts", ".jl", ".r", ".m", ".sage", ".c", ".cpp", ".rs", ".go"]);

// ---------------------------------------------------------------------------
// Use versus mention
// ---------------------------------------------------------------------------

/**
 * THE recurring defect in tools of this kind, and the one this repository can least afford.
 *
 * Every detector answers "does this repository do X?" by searching text for a string associated with
 * X. That string occurs in two unrelated kinds of place: files that *do* X, and files that merely
 * *mention* it — comments, documentation, and this file's own pattern tables. A comment reading
 * `-- TODO: remove the sorry from Draft.lean` is a mention. Reporting it as a placeholder would be
 * this tool overstating what it observed, inside a repository whose entire subject is not
 * overstating what you observed.
 *
 * So content scans go through `structureOf`, which is source with comments removed and string
 * contents blanked. A new detector reaching for raw text is reintroducing the bug.
 */
const C_LIKE = [".js", ".mjs", ".cjs", ".ts", ".c", ".cpp", ".rs", ".go", ".jl"];
const HASH = [".py", ".r", ".sh", ".ps1", ".sage"];

/**
 * `quotes` is the set of characters that open a string literal, and it is per-language for a reason
 * a mutation test found.
 *
 * In mathematics, a prime is part of a name: `sq_nonneg'`, `x'`, `h'`. Treating `'` as a string
 * delimiter in a proof-assistant source meant the first primed identifier opened a "string" that
 * never closed, and everything after it was blanked out of the structural view. The placeholder
 * detector then saw a file with no `sorry` in it — a false green produced by the very machinery that
 * exists to prevent false greens.
 *
 * Lean, Coq, and Isabelle all use double quotes for strings, so dropping `'` from their quote set
 * costs nothing and fixes the whole class.
 */
const DEFAULT_QUOTES = ["'", '"', "`"];
const PROOF_QUOTES = ['"'];

const COMMENT_SYNTAX = new Map([
  ...C_LIKE.map((e) => [e, { line: "//", blockOpen: "/*", blockClose: "*/", quotes: DEFAULT_QUOTES }]),
  ...HASH.map((e) => [e, { line: "#", blockOpen: null, blockClose: null, quotes: DEFAULT_QUOTES }]),
  // Lean 4: `--` line comments, `/- ... -/` blocks.
  [".lean", { line: "--", blockOpen: "/-", blockClose: "-/", quotes: PROOF_QUOTES }],
  // Coq and Isabelle: `(* ... *)` only. No line-comment syntax, so `line` is null.
  [".v", { line: null, blockOpen: "(*", blockClose: "*)", quotes: PROOF_QUOTES }],
  [".thy", { line: null, blockOpen: "(*", blockClose: "*)", quotes: PROOF_QUOTES }],
  [".m", { line: "%", blockOpen: null, blockClose: null, quotes: DEFAULT_QUOTES }],
]);

/**
 * Split source into code and comments with a small state machine. String contents are blanked in the
 * `structure` half so that a token inside a string literal is invisible to a structural scan.
 *
 * Approximate by design: it does not understand regex literals, Python docstrings, heredocs, or
 * Lean's nested block comments. It only has to be right enough that a sentence in a comment stops
 * being mistaken for a use.
 */
export function splitSource(text, ext) {
  const syntax = COMMENT_SYNTAX.get(ext);
  if (!syntax) return { code: text, structure: text, comments: "" };

  const lineOpen = syntax.line;
  const blockOpen = syntax.blockOpen;
  const blockClose = syntax.blockClose;
  const quotes = syntax.quotes ?? DEFAULT_QUOTES;

  let code = "";
  let structure = "";
  let comments = "";
  let mode = "code";
  let i = 0;
  while (i < text.length) {
    const c = text[i];

    if (mode === "code") {
      if (lineOpen && text.startsWith(lineOpen, i)) {
        mode = "line";
        i += lineOpen.length;
        continue;
      }
      if (blockOpen && text.startsWith(blockOpen, i)) {
        mode = "block";
        i += blockOpen.length;
        continue;
      }
      if (quotes.includes(c)) {
        mode = c;
        code += c;
        structure += c; // the quote survives; its contents do not
        i++;
        continue;
      }
      code += c;
      structure += c;
      i++;
      continue;
    }

    if (mode === "line") {
      if (c === "\n") {
        mode = "code";
        code += "\n";
        structure += "\n";
        comments += "\n";
        i++;
        continue;
      }
      comments += c;
      i++;
      continue;
    }

    if (mode === "block") {
      if (blockClose && text.startsWith(blockClose, i)) {
        mode = "code";
        comments += "\n";
        i += blockClose.length;
        continue;
      }
      if (c === "\n") {
        code += "\n";
        structure += "\n";
      }
      comments += c;
      i++;
      continue;
    }

    // Inside a string literal: preserved in the code half, blanked in the structure half.
    if (c === "\\") {
      code += text.substr(i, 2);
      i += 2;
      continue;
    }
    if (c === mode) {
      mode = "code";
      structure += c;
    }
    code += c;
    if (c === "\n") structure += "\n";
    i++;
  }
  return { code, structure, comments };
}

const sources = new Map();
const structureOf = (f) => sources.get(f)?.structure ?? "";

const MAX_FILES = 20000;
const MAX_READ_BYTES = 400_000;
const MAX_EVIDENCE = 12;

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const subcommand = argv[0];
const JSON_OUT = argv.includes("--json");
const STRICT = argv.includes("--strict");
const PROVENANCE = argv.includes("--provenance");
const dirFlag = argv.find((a) => a.startsWith("--dir="))?.slice("--dir=".length);
const positional = argv.slice(1).find((a) => !a.startsWith("--"));

function usage(stream = process.stderr) {
  stream.write(
    "Usage: math-standards <audit|validate|check|explain|status|init> [argument] [flags]\n\n" +
      "  audit          Evidence discovery. What the repository claims and where it departs from\n" +
      "                 the standards. Needs no policy; never produces a verdict.\n" +
      "  validate       Policy-aware compliance evaluation. Loads project-policy.yml, applies\n" +
      "                 applicability, exceptions, and attestations, and produces the verdict.\n" +
      "  check          Alias of validate. The two are one command because evidence discovery and\n" +
      "                 verdict are already separated as audit and validate.\n" +
      "  explain        Explain one rule or standard: what it requires, what the automation does\n" +
      "                 and does not establish, and its disposition under this project's policy.\n" +
      "  status         One-screen summary: verdict, coverage, counts, blocking invariants.\n" +
      "  init           Bootstrap a project. Creates missing artifacts, never overwrites without\n" +
      "                 an explicit per-path opt-in.\n\n" +
      "  --dry-run      init only: report what would happen, write nothing.\n" +
      "  --force-overwrite=<path>   init only: approve replacing one existing file.\n" +
      "  --json         Emit the structured report on stdout instead of the readable one.\n" +
      "  --dir=<path>   Target a directory other than the resolved project root.\n" +
      "  --strict       audit only: exit 1 when any finding needs attention.\n\n" +
      "Gate CI on `validate`. See design/cli.md for why these commands and not others.\n",
  );
}

/**
 * Exit codes:
 *   0 = the command completed; the project is compliant, or audit found nothing needing attention
 *   1 = the command completed; compliance failures were found
 *   2 = validator, configuration, or invocation error
 *
 * The 1/2 split matters to CI: 1 means this tool worked and the repository has problems; 2 means it
 * could not reach a verdict at all. Collapsing them tells CI that a broken validator is a failing
 * project, and the usual response to that is to weaken the check.
 */
const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_INVOCATION = 2;

if (!subcommand || subcommand === "--help" || subcommand === "-h") {
  usage(process.stdout);
  process.exit(subcommand ? EXIT_OK : EXIT_INVOCATION);
}
const COMMANDS = new Set(["audit", "validate", "check", "explain", "status", "init"]);
if (!COMMANDS.has(subcommand)) {
  process.stderr.write(`math-standards: unknown subcommand '${subcommand}'\n\n`);
  usage();
  process.exit(EXIT_INVOCATION);
}

/**
 * Unknown or invalid arguments fail closed, before anything is read and before anything is written.
 *
 * The defect this exists for: `--dry-run` was tested by exact presence, so `--dryrun`, `--dry_run`
 * and `--dry-run=true` all parsed as a bare `init` and applied. `--help` was recognised only as a
 * subcommand, so `init --help` applied against a real repository. In both cases an operator who
 * believed they were previewing had instead scaffolded, and the command exited 0.
 *
 * The rule is deliberately uniform across commands rather than confined to `init`. A flag silently
 * ignored on a read-only command is the same defect one step further from the damage: it is how a CI
 * job comes to believe it ran `--strict` when it did not. Refusing loudly is the framework's own
 * stated preference over quietly ignoring a construct — the vendored YAML reader argues exactly this
 * in its header — and the cost of being wrong here is a rerun, against a mutation that cannot be
 * undone.
 *
 * The contract itself is in scripts/invocation.mjs, so a test can enumerate it rather than restate
 * it. The property worth pinning is not that one flag is refused by one command, but that no
 * declared flag is ever silently ignored by any of them.
 */
for (const arg of argv.slice(1)) {
  const detail = classifyArg(subcommand, arg);
  if (!detail) continue;
  process.stderr.write(
    `math-standards ${subcommand}: ${detail}\n` +
      `Nothing was read and nothing was written. Re-run with a correct invocation.\n\n`,
  );
  usage();
  process.exit(EXIT_INVOCATION);
}

// `--help` anywhere, on any command, prints usage and does nothing else. This is the RH instance:
// `init --help` parsed as a bare init with an ignored flag and applied.
if (argv.includes("--help") || argv.includes("-h")) {
  usage(process.stdout);
  process.exit(EXIT_OK);
}

/**
 * audit and validate have genuinely different jobs and different exit-code contracts, which is the
 * practical reason they cannot be one command: audit exits 0 on warnings unless --strict, while
 * validate exits non-zero on a required-rule failure regardless of it. One command cannot hold both
 * without a flag that changes the exit contract, and such a flag is a trap.
 */
const VALIDATING = subcommand === "validate" || subcommand === "check" || subcommand === "status";
const STATUS_ONLY = subcommand === "status";

// ---------------------------------------------------------------------------
// init — bootstrap
//
// Handled before the scan: init does not need an evidence survey, and running one would make a
// bootstrap command slower than the thing it bootstraps.
// ---------------------------------------------------------------------------

if (subcommand === "init") {
  const dryRun = argv.includes("--dry-run");
  const modeFlag = argv.find((a) => a.startsWith("--mode="))?.slice("--mode=".length) ?? null;
  const overwrite = argv
    .filter((a) => a.startsWith("--force-overwrite="))
    .map((a) => a.slice("--force-overwrite=".length));
  const target = path.resolve(dirFlag ?? positional ?? ".");

  let report;
  try {
    report = await planInit(target, { mode: modeFlag, overwrite });
  } catch (error) {
    process.stderr.write(`math-standards init: ${error.message}\n`);
    process.exit(EXIT_INVOCATION);
  }

  // The dry run and the real run share one computation, so the report cannot disagree with what
  // apply() then does — the charter's dry-run requirement, satisfied structurally rather than by
  // keeping two code paths in step.
  if (!dryRun) await applyInit(target, report);

  if (JSON_OUT) process.stdout.write(JSON.stringify({ ...report, dryRun }, null, 2) + "\n");
  else process.stdout.write(renderInit(report, { dryRun }) + "\n");

  process.exit(report.conflicts.length > 0 ? EXIT_FINDINGS : EXIT_OK);
}

// ---------------------------------------------------------------------------
// explain — why does this rule apply here, and what does the check establish?
// ---------------------------------------------------------------------------

if (subcommand === "explain") {
  const subject = argv.slice(1).find((a) => !a.startsWith("--"));
  if (!subject) {
    process.stderr.write("math-standards explain: name a rule id or a standard number\n");
    process.exit(EXIT_INVOCATION);
  }
  const catalog = await loadCatalog(path.join(HOME, "rules"));
  const root = path.resolve(dirFlag ?? ".");
  const policy = await loadProjectPolicy(root);
  const out = explain(catalog, subject, policy.document);
  if (!out) {
    process.stderr.write(`math-standards explain: no rule or standard matches '${subject}'\n`);
    process.exit(EXIT_INVOCATION);
  }
  process.stdout.write((JSON_OUT ? JSON.stringify(out, null, 2) : renderExplain(out)) + "\n");
  process.exit(EXIT_OK);
}

// ---------------------------------------------------------------------------
// Repository scan
// ---------------------------------------------------------------------------

/** Walk up for a .git or package.json marker, so the command works from any subdirectory. */
function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(dir, ".git")) || existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

const target = dirFlag ?? positional ?? ".";
if (!existsSync(target)) {
  process.stderr.write(`math-standards: no such directory: ${target}\n`);
  process.exit(EXIT_INVOCATION);
}
const root = dirFlag ? path.resolve(dirFlag) : findRoot(target);

/** Repo-relative path with forward slashes, so output is stable across platforms. */
const rel = (p) => path.relative(root, p).split(path.sep).join("/");

async function collectFiles(dir, acc) {
  if (acc.length >= MAX_FILES) return acc;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc; // unreadable directory: skip rather than abort the audit
  }
  for (const entry of entries) {
    if (acc.length >= MAX_FILES) return acc;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await collectFiles(full, acc);
    } else if (entry.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

async function readText(file) {
  try {
    const buf = await readFile(file);
    if (buf.length > MAX_READ_BYTES) return buf.subarray(0, MAX_READ_BYTES).toString("utf8");
    return buf.toString("utf8");
  } catch {
    return "";
  }
}

/**
 * Read and validate the target repository's project-policy.yml.
 *
 * A malformed or unreadable policy is an ERROR condition, never a compliance failure: the verdict
 * becomes NOT_EVALUATED and the process exits 2. Reporting a broken configuration as NON_COMPLIANT
 * would be a false red for the project and a false green for this tool.
 */
async function loadProjectPolicy(repoRoot) {
  const file = path.join(repoRoot, "project-policy.yml");
  if (!existsSync(file)) {
    return { document: null, error: null, reason: "no project-policy.yml — nothing declares what applies here" };
  }
  try {
    const schema = JSON.parse(await readFile(path.join(HOME, "schemas/project-policy.schema.json"), "utf8"));
    const document = parseYaml(await readFile(file, "utf8"));
    const errors = validateSchema(document, schema);
    if (errors.length > 0) {
      return {
        document: null,
        error:
          `project-policy.yml does not match the schema (${errors.length} error(s)): ` +
          errors.slice(0, 3).map((e) => `${e.path || "(document)"} ${e.message}`).join("; "),
      };
    }
    return { document, error: null };
  } catch (error) {
    return { document: null, error: `project-policy.yml could not be read: ${error.message}` };
  }
}

// ---------------------------------------------------------------------------
// Finding construction
// ---------------------------------------------------------------------------

const findings = [];

/**
 * `label` is the evidence label of Standard 19 R5 and is not decorative. A detection resting on a
 * file existing, or on a field read from the ledger, is OBSERVED. A detection resting on a phrase
 * match or a guess at a quantifier is INFERRED — reporting a heuristic as observed is the tool
 * fabricating certainty about its own output.
 */
function addFinding({ id, category, severity = "info", label, evidence = [], message, standard, rule }) {
  const shown = evidence.slice(0, MAX_EVIDENCE);
  const omitted = evidence.length - shown.length;
  findings.push({
    id,
    category,
    severity,
    label,
    evidence: shown,
    message: omitted > 0 ? `${message} (${evidence.length} total; ${omitted} not listed)` : message,
    standardRef: STANDARD_PATHS.get(standard) ?? null,
    rule: rule ?? null,
  });
}

/**
 * Report against a catalog rule, taking severity and the standard reference from the catalog.
 *
 * `label` is required, and that is the whole point of it being required.
 *
 * It used to default to "OBSERVED", and forty-four of the fifty-two call sites took the default —
 * which meant the tool asserted that it had directly observed a violation every time an author
 * did not think about the question. Seven of those defaults were wrong, two of them on invariants,
 * and an invariant is a verdict no exception can clear. A default cannot be audited, because a
 * site that omits the argument is indistinguishable from a site that considered it and chose
 * OBSERVED. So there is no default: every detector states what its finding rests on, and a
 * detector that does not state it fails here rather than being believed.
 *
 * The classification of every site, with the proposition it asserts and the basis for the label,
 * is in test/fixtures/evidence-classification.json, which test/verdict-strength.test.mjs holds to
 * this file.
 */
function report(rule, { message, evidence = [], label, severityOverride = null }) {
  const definition = CATALOG.rules.get(rule);
  if (!definition) throw new Error(`detector reports against unknown rule ${rule}`);
  if (!EVIDENCE_LABELS.includes(label)) {
    throw new Error(
      `detector for ${rule} supplied no valid evidence label (got ${JSON.stringify(label)}). ` +
        `Every finding must state whether the proposition it reports is ${EVIDENCE_LABELS.join(", ")}.`,
    );
  }
  addFinding({
    id: rule.replace(/\./g, "-"),
    category: definition.category,
    severity: severityOverride ?? definition.severity,
    label,
    evidence,
    message,
    standard: definition.standard,
    rule,
  });
}

// ---------------------------------------------------------------------------
// Load everything the detectors read
// ---------------------------------------------------------------------------

const CATALOG = await loadCatalog(path.join(HOME, "rules"));

const files = await collectFiles(root, []);
const contents = new Map();
for (const f of files) {
  if (path.resolve(f) === SELF) continue; // see the SELF declaration above
  if (!TEXT_EXT.has(path.extname(f))) continue;
  const text = await readText(f);
  contents.set(f, text);
  if (COMMENT_SYNTAX.has(path.extname(f))) sources.set(f, splitSource(text, path.extname(f)));
}

const policy = await loadProjectPolicy(root);
const mathPolicy = policy.document?.mathematics ?? {};
const LEDGER_PATH = mathPolicy.claimsLedger ?? "artifacts/claims-ledger.md";
const OPEN_PROBLEMS_DIR = mathPolicy.openProblemsDir ?? "artifacts/open-problems";
// The YAML reader returns every scalar as a string by design, so `openProblemMode: true` arrives as
// "true". Both spellings are accepted here so a programmatically-supplied policy object works too.
const OPEN_PROBLEM_MODE = mathPolicy.openProblemMode === true || mathPolicy.openProblemMode === "true";

const ledgerFile = path.join(root, LEDGER_PATH);
const ledgerText = existsSync(ledgerFile) ? await readText(ledgerFile) : null;
const ledger = ledgerText === null ? null : parseLedger(ledgerText);

// ---------------------------------------------------------------------------
// Detectors — the claims ledger (Standards 2, 3, 4)
// ---------------------------------------------------------------------------

function detectLedgerPresence() {
  if (ledger !== null) return;
  report("claims.ledger-exists", {
    message: `No claims ledger at ${LEDGER_PATH}. Every claim rule reads it, so without one nothing about this project's claims is checked.`,
    evidence: [LEDGER_PATH],
    label: "OBSERVED",
  });
}

function detectLedgerParse() {
  if (!ledger) return;
  if (ledger.malformed.length === 0) return;
  report("claims.ledger-parse-valid", {
    message: `${ledger.malformed.length} ledger entr(ies) do not parse. A malformed entry is skipped by every other check, which removes a claim from scrutiny while leaving it in the document.`,
    evidence: ledger.malformed.map((m) => `${LEDGER_PATH}:${m.line} ${m.id ?? "(no id)"} — ${m.reason}`),
    label: "OBSERVED",
  });
}

function detectStatusVocabulary() {
  if (!ledger) return;
  const bad = [...ledger.entries.values()].filter((e) => e.status && !STATUS_RANK.has(e.status));
  if (bad.length === 0) return;
  report("claims.status-vocabulary", {
    message: `${bad.length} claim(s) carry a status outside the fifteen canonical tokens. The vocabulary is closed so that "essentially proved" cannot be introduced when the honest token is uncomfortable.`,
    evidence: bad.map((e) => `${LEDGER_PATH}:${e.line} ${e.id} — status '${e.status}'`),
    label: "OBSERVED",
  });
}

function detectHistoryComplete() {
  if (!ledger) return;
  const bad = [];
  for (const entry of ledger.entries.values()) {
    if (!entry.status || !STATUS_RANK.has(entry.status)) continue;
    if (entry.history.length === 0) {
      bad.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — no History entries`);
      continue;
    }
    const last = entry.history[entry.history.length - 1];
    if (last.to && last.to !== entry.status) {
      bad.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — status ${entry.status} but history ends at ${last.to}`);
    }
  }
  if (bad.length === 0) return;
  report("claims.history-complete", {
    message: `${bad.length} claim(s) have a status that disagrees with their own recorded history, which is the trace a status change without a record leaves.`,
    evidence: bad,
    label: "OBSERVED",
  });
}

function detectDefinitionsFirst() {
  if (!ledger) return;
  const position = new Map(ledger.order.map((id, index) => [id, index]));
  const bad = [];
  for (const entry of ledger.entries.values()) {
    for (const dep of entry.depends) {
      const target = ledger.entries.get(dep);
      if (!target || target.status !== "DEFINITION") continue;
      if ((position.get(dep) ?? 0) > (position.get(entry.id) ?? 0)) {
        bad.push(`${LEDGER_PATH}:${entry.line} ${entry.id} depends on definition ${dep}, which appears later`);
      }
    }
  }
  if (bad.length === 0) return;
  report("claims.definitions-first", {
    message: `${bad.length} claim(s) depend on a definition stated after them. An undefined term does not make a claim false; it makes it unevaluable.`,
    evidence: bad,
    label: "OBSERVED",
  });
}

/**
 * Prose references, and the two things they can be wrong about: naming a claim that does not exist,
 * and asserting a status above the ledger's.
 *
 * The ledger itself is exempt from reference scanning — its own headings and history lines would
 * self-match — and so is this framework's `standards/` directory when auditing itself, because those
 * documents discuss the convention rather than using it.
 */
function scanReferences() {
  const hits = [];
  for (const [file, text] of contents) {
    if (path.extname(file) !== ".md") continue;
    if (path.resolve(file) === path.resolve(ledgerFile)) continue;
    for (const ref of findReferences(text)) hits.push({ file, ...ref });
  }
  return hits;
}

function detectInlineLabels(references) {
  if (!ledger) return;
  const unknown = references.filter((r) => !ledger.entries.has(r.id));
  if (unknown.length === 0) return;
  report("claims.inline-label-consistency", {
    message: `${unknown.length} reference(s) name a claim the ledger does not define. A reference to an unregistered claim points at something the project can no longer identify.`,
    evidence: unknown.map((r) => `${rel(r.file)}:${r.line} — ${r.id}`),
    label: "INFERRED",
  });
}

function detectSilentPromotion(references) {
  if (!ledger) return;
  const prose = [];
  for (const ref of references) {
    const entry = ledger.entries.get(ref.id);
    if (!entry || !ref.assertedStatus) continue;
    const asserted = rankOf(ref.assertedStatus);
    const held = rankOf(entry.status);
    if (asserted === null || held === null) continue;
    if (asserted > held) {
      prose.push(`${rel(ref.file)}:${ref.line} — asserts ${ref.assertedStatus}, ledger says ${entry.status}`);
    }
  }

  // The ledger arm: a promotion into proved rank whose history entry cites no evidence.
  const unevidenced = [];
  for (const entry of ledger.entries.values()) {
    if (!isProvedRank(entry.status)) continue;
    const promoting = [...entry.history].reverse().find((h) => h.to === entry.status);
    if (promoting && !promoting.evidence) {
      unevidenced.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — promoted to ${entry.status} with no evidence recorded`);
    }
  }

  if (prose.length > 0) {
    report("claims.silent-promotion", {
      message: `${prose.length} passage(s) assert a status above the ledger's. Claims are supposed to get stronger; what is prohibited is the strengthening that leaves no record.`,
      evidence: prose,
      label: "INFERRED",
    });
  }
  if (unevidenced.length > 0) {
    report("claims.silent-promotion", {
      message: `${unevidenced.length} claim(s) reached proved rank with no evidence recorded on the promoting history entry.`,
      evidence: unevidenced,
      label: "OBSERVED",
    });
  }
}

/**
 * The weakest thing in a claim's dependency closure that actually caps it.
 *
 * `capsSupport` rather than a bare rank comparison, because a definition does not cap what rests on
 * it unless it carries an open obligation — see the comment on that function.
 */
function weakestSupport(entry) {
  const closure = dependencyClosure(ledger.entries, entry.id);
  let weakest = null;
  for (const id of closure) {
    const dep = ledger.entries.get(id);
    if (!capsSupport(dep)) continue;
    const rank = rankOf(dep.status);
    if (weakest === null || rank < weakest.rank) weakest = { id, status: dep.status, rank };
  }
  return weakest;
}

/**
 * The rank cap of Standard 2 R4: a claim resting on something unproved is conditional.
 *
 * CONDITIONAL_THEOREM is deliberately exempt, and the compliant fixture is what made the point. That
 * status IS the honest ceiling — a conditional theorem is *supposed* to rest on an undischarged
 * hypothesis, and a rule that fired on it would be demanding that a correctly labelled claim be
 * relabelled as something weaker. Firing at your own remedy makes a rule impossible to satisfy, and
 * a rule impossible to satisfy gets switched off.
 *
 * Two distinct failures are separated here rather than reported twice:
 *   status-exceeds-support        anything at proved rank other than CONDITIONAL_THEOREM
 *   conditional-as-unconditional  the subset stated as a full theorem, which is the source's
 *                                 named prohibition and the one that survives peer review
 */
function detectStatusExceedsSupport() {
  if (!ledger) return;
  const capped = [];
  const unconditional = [];
  for (const entry of ledger.entries.values()) {
    if (!isProvedRank(entry.status)) continue;
    if (entry.status === "CONDITIONAL_THEOREM") continue;
    const weakest = weakestSupport(entry);
    if (!weakest) continue;
    const line = `${LEDGER_PATH}:${entry.line} ${entry.id} is ${entry.status} but depends (via ${weakest.id}) on ${weakest.status}`;
    capped.push(line);
    if (["THEOREM", "FORMALIZED_THEOREM", "MACHINE_CHECKED_PROOF"].includes(entry.status)) {
      unconditional.push(line);
    }
  }
  if (capped.length > 0) {
    report("claims.status-exceeds-support", {
      message: `${capped.length} claim(s) outrank their dependency closure. The honest ceiling is CONDITIONAL_THEOREM until the dependency is proved.`,
      evidence: capped,
      label: "OBSERVED",
    });
  }
  if (unconditional.length > 0) {
    report("claims.conditional-as-unconditional", {
      message: `${unconditional.length} claim(s) are stated as full theorems while resting on something unproved. The condition belongs in the statement, not in a footnote.`,
      evidence: unconditional,
      label: "OBSERVED",
    });
  }
}

// ---------------------------------------------------------------------------
// Detectors — rigor (Standards 5, 6)
// ---------------------------------------------------------------------------

const RANK_THREE = 3; // HYPOTHESIS and above must state domain, quantifiers, and assumptions.

function detectRigorFields() {
  if (!ledger) return;
  const checks = [
    ["rigor.explicit-domain", "domain", "Domain"],
    ["rigor.explicit-quantifiers", "quantifiers", "Quantifiers"],
  ];
  for (const [rule, key, label] of checks) {
    const missing = [...ledger.entries.values()].filter(
      (e) => (rankOf(e.status) ?? -99) >= RANK_THREE && !String(e[key] ?? "").trim(),
    );
    if (missing.length === 0) continue;
    report(rule, {
      message: `${missing.length} claim(s) at HYPOTHESIS rank or above state no ${label}.`,
      evidence: missing.map((e) => `${LEDGER_PATH}:${e.line} ${e.id} (${e.status})`),
      label: "OBSERVED",
    });
  }

  const noAssumptions = [...ledger.entries.values()].filter(
    (e) => (rankOf(e.status) ?? -99) >= RANK_THREE && !e.fields.has("assumptions"),
  );
  if (noAssumptions.length > 0) {
    report("rigor.explicit-assumptions", {
      message: `${noAssumptions.length} claim(s) omit the Assumptions field. An absent field and a field reading 'none' are different, and only one shows that the author considered the question.`,
      evidence: noAssumptions.map((e) => `${LEDGER_PATH}:${e.line} ${e.id} (${e.status})`),
      label: "OBSERVED",
    });
  }
}

function detectConjectureRegistered(dangling) {
  if (!ledger) return;
  const fromAssumptions = dangling.filter((d) => {
    const entry = ledger.entries.get(d.from);
    return entry?.assumptions.includes(d.edge);
  });
  if (fromAssumptions.length === 0) return;
  report("rigor.conjecture-registered", {
    message: `${fromAssumptions.length} declared assumption(s) resolve to nothing. An unproved statement relied upon must be registered with a status, not named only in prose.`,
    evidence: fromAssumptions.map((d) => `${LEDGER_PATH}:${d.line} ${d.from} assumes ${d.edge}`),
    label: "OBSERVED",
  });
}

// ---------------------------------------------------------------------------
// Detectors — proof structure (Standards 7, 8, 9)
// ---------------------------------------------------------------------------

function detectObligations() {
  if (!ledger) return;
  const missing = [...ledger.entries.values()].filter((e) => isProvedRank(e.status) && !e.fields.has("obligations"));
  if (missing.length > 0) {
    report("proof.obligations-enumerated", {
      message: `${missing.length} claim(s) at proved rank enumerate no obligations. 'Complete' has to be a checkable claim about a list.`,
      evidence: missing.map((e) => `${LEDGER_PATH}:${e.line} ${e.id} (${e.status})`),
      label: "OBSERVED",
    });
  }

  // Two arms, because the parser now distinguishes two situations that used to be one. An
  // obligation the ledger states is open is an observation; an obligation whose line the grammar
  // could not read is not, and the difference decides whether an invariant blocks.
  const open = [];
  const unreadable = [];
  for (const entry of ledger.entries.values()) {
    if (!isProvedRank(entry.status)) continue;
    for (const obligation of entry.obligations) {
      const where = `${LEDGER_PATH}:${entry.line} ${entry.id} (${entry.status}) — ${obligation.id ?? "obligation"}`;
      if (obligation.state === "open") open.push(`${where} is open`);
      else if (obligation.state === "unrecognised") unreadable.push(`${where}: ${obligation.text}`);
    }
  }
  if (open.length > 0) {
    report("proof.complete-with-open-obligations", {
      message: `${open.length} obligation(s) are open on claims held at proved rank.`,
      evidence: open,
      // The ledger says `open` in as many words. Reading a field is not interpreting it.
      label: "OBSERVED",
    });
  }
  if (unreadable.length > 0) {
    report("proof.complete-with-open-obligations", {
      message: `${unreadable.length} obligation(s) on claims at proved rank state neither 'open' nor 'discharged' in a form this grammar reads. Whether the claim is complete is therefore not established here — say which, in those words, and the check becomes an observation.`,
      evidence: unreadable,
      // UNKNOWN, not INFERRED. INFERRED would say the tool has approximate grounds for believing the
      // obligation is open; it has none. It could not read the line. Reporting it at all is right —
      // a proved-rank claim whose completeness cannot be checked is worth a person's attention — but
      // it must not reach the terminal verdict, and under the Tier 1 ceiling it does not.
      label: "UNKNOWN",
    });
  }
}

function detectDependencyIntegrity(dangling) {
  if (!ledger) return;
  if (dangling.length > 0) {
    report("proof.dependency-traceability", {
      message: `${dangling.length} declared dependenc(ies) resolve to nothing. A dangling identifier means the claim rests on something the project can no longer identify.`,
      evidence: dangling.map((d) => `${LEDGER_PATH}:${d.line} ${d.from} -> ${d.edge}`),
      label: "OBSERVED",
    });
  }
  const cycles = findCycles(ledger.entries);
  if (cycles.length > 0) {
    report("proof.circular-dependency", {
      message: `${cycles.length} dependency cycle(s). A claim in its own closure is the target theorem assumed in its own proof, however many lemmas the route passes through.`,
      evidence: cycles.map((c) => c.join(" -> ")),
      label: "OBSERVED",
    });
  }
}

function detectCounterexampleSearch() {
  if (!ledger) return;
  const missing = [];
  for (const entry of ledger.entries.values()) {
    if ((rankOf(entry.status) ?? -99) <= 4) continue;
    // A COMPUTATIONAL_VERIFICATION claim IS the record of an exhaustive check over its stated range.
    // Demanding a separate counterexample search of it asks the honest formulation for paperwork the
    // overstated one escapes, which teaches exactly the wrong lesson. The same reasoning admits
    // `computational` evidence generally: a scan that found no counterexample is a counterexample
    // search under another name, and a proved-rank claim resting on nothing else is already caught
    // hard by computation.evidence-as-proof rather than needing a second, vaguer finding.
    if (entry.status === "COMPUTATIONAL_VERIFICATION") continue;
    if (!looksUniversal(entry)) continue;
    const types = new Set(entry.evidence.map((e) => e.type));
    if (["counterexample-search", "proof", "formal", "computational"].some((t) => types.has(t))) continue;
    missing.push(`${LEDGER_PATH}:${entry.line} ${entry.id} (${entry.status}) — universal statement, no recorded search or proof`);
  }
  if (missing.length === 0) return;
  report("proof.counterexample-search-recorded", {
    message: `${missing.length} universal claim(s) record no counterexample search. A search that never happened and a search that found nothing are different facts, reported the same way as silence.`,
    evidence: missing,
    label: "INFERRED", // universality is read from informal text
  });
}

// ---------------------------------------------------------------------------
// Detectors — computation (Standards 10, 11, 12)
// ---------------------------------------------------------------------------

const FLOAT_MARKERS = [
  /\bfloat\b|\bdouble\b|\bnumpy\b|\bnp\.|\bmath\.(sqrt|log|exp|sin|cos|pi)\b|\bfloat64\b|\bDouble\b/,
  /\d+\.\d+(e[-+]?\d+)?/i,
];

function detectComputationEvidence() {
  if (!ledger) return;
  const noScope = [];
  const missingArtifact = [];
  const floatExact = [];
  const noBounds = [];

  for (const entry of ledger.entries.values()) {
    for (const item of entry.evidence) {
      const computational = item.type === "computational" || item.type === "numerical";
      if (computational) {
        const hasRange = looksBounded(item.detail) || /\ball\b|\bsample|\brandom|\bexhaustive/i.test(item.detail);
        const hasArithmetic = /\b(exact|integer|rational|interval|floating[- ]point|float)\b/i.test(item.detail);
        if (!hasRange || !hasArithmetic) {
          noScope.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — ${item.type} evidence states no ${!hasRange ? "range" : "arithmetic"}`);
        }
      }
      for (const artifact of item.artifacts) {
        const bare = artifact.split("#")[0];
        if (!existsSync(path.join(root, bare))) {
          // Only computational evidence belongs to this rule. A missing proof document is an
          // evidence.artifact-linked failure and is reported there; reporting it here as well would
          // say a computation is missing when no computation was ever cited.
          if (computational) {
            missingArtifact.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — cited computation ${bare} does not exist`);
          }
          continue;
        }
        if (!computational || !/\bexact\b/i.test(item.detail)) continue;
        if (!SCRIPT_EXT.has(path.extname(bare))) continue;
        const text = contents.get(path.join(root, bare)) ?? "";
        const structure = sources.get(path.join(root, bare))?.structure ?? text;
        if (FLOAT_MARKERS.some((re) => re.test(structure))) {
          floatExact.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — evidence claims exact arithmetic, ${bare} uses floating point`);
        }
      }
    }

    const approximate = /≈|~=|\bapproximately\b|\babout\b|\bO\(|\bo\(|\bΘ\(|\bΩ\(|\btruncat/i.test(entry.statement);
    const bounded = /\berror\b|\bbound\b|\binterval\b|\bwithin\b|\bat most\b|\bprecision\b/i.test(
      `${entry.statement} ${entry.evidence.map((e) => e.detail).join(" ")}`,
    );
    if (approximate && !bounded) {
      noBounds.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — approximation with no stated error bound`);
    }
  }

  if (noScope.length > 0) {
    report("computation.scope-declared", {
      message: `${noScope.length} computational evidence entr(ies) do not record their scope. Almost every dispute about a computational result is a dispute about one of those lines.`,
      evidence: noScope,
      label: "INFERRED",
    });
  }
  if (missingArtifact.length > 0) {
    report("computation.reproducible-runs", {
      message: `${missingArtifact.length} cited computation(s) are not in the repository. A result nobody can re-run is an assertion.`,
      evidence: missingArtifact,
      label: "OBSERVED",
    });
  }
  if (floatExact.length > 0) {
    report("computation.float-as-exact", {
      message: `${floatExact.length} claim(s) of exact arithmetic rest on a floating-point program. Agreement to fifteen decimal places is a statement about the computation, not about the quantities.`,
      evidence: floatExact,
      label: "INFERRED",
    });
  }
  if (noBounds.length > 0) {
    report("computation.error-bounds-stated", {
      message: `${noBounds.length} approximate claim(s) state no error bound.`,
      evidence: noBounds,
      label: "INFERRED",
    });
  }
}

function detectNumericsAsProof() {
  if (!ledger) return;
  const ledgerHits = [];
  const finite = [];
  for (const entry of ledger.entries.values()) {
    if (!isProvedRank(entry.status)) continue;
    if (entry.evidence.length === 0) continue;
    const types = new Set(entry.evidence.map((e) => e.type));
    const hasProof = [...types].some((t) => PROOF_EVIDENCE.has(t));
    if (hasProof) continue;
    ledgerHits.push(
      `${LEDGER_PATH}:${entry.line} ${entry.id} (${entry.status}) — evidence is ${[...types].join(", ")} only`,
    );
    if (looksUniversal(entry) && entry.evidence.some((e) => looksBounded(e.detail))) {
      finite.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — universal statement supported by a bounded check`);
    }
  }
  if (ledgerHits.length > 0) {
    report("computation.evidence-as-proof", {
      message: `${ledgerHits.length} claim(s) at proved rank have no proof, formal, or citation evidence. Restating the claim on the range checked makes it a genuine theorem; leaving it universal does not.`,
      evidence: ledgerHits,
      label: "OBSERVED",
    });
  }
  if (finite.length > 0) {
    report("computation.finite-case-generalization", {
      message: `${finite.length} universal claim(s) rest on a finite check. Mertens held for everything anyone could compute and is false.`,
      evidence: finite,
      label: "INFERRED",
    });
  }

  // The prose arm. A phrase match is never an observation, so it reports INFERRED at warning level.
  const prose = [];
  const PROVED_NUMERICALLY = /\bprov(?:es?|ed|en)\b[^.\n]{0,80}\b(?:numerical(?:ly)?|computational(?:ly)?|by (?:simulation|Monte Carlo)|by exhaustive search)\b/i;
  for (const [file, text] of contents) {
    if (path.extname(file) !== ".md") continue;
    if (path.resolve(file).startsWith(path.join(HOME, "standards"))) continue; // these documents describe the error
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (PROVED_NUMERICALLY.test(lines[i])) prose.push(`${rel(file)}:${i + 1} — ${lines[i].trim().slice(0, 120)}`);
    }
  }
  if (prose.length > 0) {
    report("computation.evidence-as-proof", {
      message: `${prose.length} passage(s) describe something as proved numerically or computationally.`,
      evidence: prose,
      label: "INFERRED",
      severityOverride: "warning",
    });
  }
}

// ---------------------------------------------------------------------------
// Detectors — literature (Standard 14)
// ---------------------------------------------------------------------------

const DOI = /^10\.\d{4,9}\/\S+$/;
const ARXIV = /^(arXiv:)?(\d{4}\.\d{4,5}(v\d+)?|[a-z-]+(\.[A-Z]{2})?\/\d{7})$/i;

function detectLiterature(dangling) {
  if (!ledger) return;
  const unresolved = dangling.filter((d) => d.external);
  if (unresolved.length > 0) {
    report("literature.resolvable-identifiers", {
      message: `${unresolved.length} external reference(s) are used and never defined in the ledger's References section.`,
      evidence: unresolved.map((d) => `${LEDGER_PATH}:${d.line} ${d.from} -> ${d.edge}`),
      label: "OBSERVED",
    });
  }

  const malformed = [];
  for (const [slug, citation] of ledger.references) {
    const doi = /\b(10\.\d{4,9}\/\S+)/.exec(citation)?.[1];
    const arxiv = /\barXiv:\s*(\S+)/i.exec(citation)?.[1];
    if (doi && !DOI.test(doi)) malformed.push(`${slug} — malformed DOI '${doi}'`);
    if (arxiv && !ARXIV.test(arxiv)) malformed.push(`${slug} — malformed arXiv identifier '${arxiv}'`);
  }
  if (malformed.length > 0) {
    report("literature.resolvable-identifiers", {
      message: `${malformed.length} reference identifier(s) are malformed. A well-formed identifier for a paper that does not exist still passes this check — see the rule's assurance note.`,
      evidence: malformed,
      label: "INFERRED",
    });
  }

  const NOVELTY = /\b(novel|new result|first (?:proof|to show|to prove)|not previously known|hitherto)\b/i;
  const unchecked = [];
  const uncompared = [];
  for (const entry of ledger.entries.values()) {
    const cites = entry.evidence.some((e) => LITERATURE_EVIDENCE.has(e.type));
    if (NOVELTY.test(entry.statement) && !cites) {
      unchecked.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — asserts novelty with no recorded prior-work search`);
    }
    if (isProvedRank(entry.status) && !cites) {
      uncompared.push(`${LEDGER_PATH}:${entry.line} ${entry.id} (${entry.status}) — no recorded literature comparison`);
    }
  }
  if (unchecked.length > 0) {
    report("literature.unchecked-novelty", {
      message: `${unchecked.length} claim(s) assert novelty with no recorded search.`,
      evidence: unchecked,
      label: "INFERRED",
    });
  }
  if (uncompared.length > 0) {
    report("literature.known-result-comparison", {
      message: `${uncompared.length} claim(s) at proved rank record no comparison against the literature. A recorded negative search is evidence; silence is not.`,
      evidence: uncompared,
      label: "OBSERVED",
    });
  }
}

// ---------------------------------------------------------------------------
// Detectors — formal theorem proving (Standard 16)
// ---------------------------------------------------------------------------

/**
 * Placeholder tokens, per assistant, matched against comment- and string-stripped source.
 *
 * The Coq gate matters: `.v` is equally a Verilog extension, and reporting `admit` in a hardware
 * project would be precisely the unearned confidence this standard exists to suppress.
 */
const COQ_STRUCTURE = /\b(Qed\s*\.|Proof\s*\.|Require\s+(Import|Export)|Admitted\s*\.|Theorem\s+\w+|Lemma\s+\w+)/;
const PLACEHOLDERS = new Map([
  ["lean4", [/(?<![\w.])sorry(?![\w])/g, /(?<![\w.])admit(?![\w])/g]],
  ["coq", [/\bAdmitted\s*\./g, /(?<![\w.])admit\s*\./g]],
  ["isabelle", [/\bsorry\b/g, /\boops\b/g]],
]);
const AXIOM_DECL = new Map([
  ["lean4", /^\s*(?:@\[[^\]]*\]\s*)?axiom\s+([\w'.]+)/gm],
  ["coq", /^\s*(?:Axiom|Parameter|Hypothesis)\s+([\w'.]+)/gm],
  ["isabelle", /^\s*axiomatization\s+([\w'.]+)?/gm],
]);
const TRUSTED_BASE = [
  [/\bnative_decide\b/, "native_decide"],
  [/@\[extern\b/, "extern binding"],
  [/\bExtraction\b/, "extraction"],
  [/\bcode_printing\b|\bexport_code\b/, "code generation"],
];

function proofFiles() {
  const out = [];
  for (const file of files) {
    const ext = path.extname(file);
    const assistant = PROOF_EXT.get(ext);
    if (!assistant) continue;
    const structure = structureOf(file);
    if (assistant === "coq" && !COQ_STRUCTURE.test(structure)) continue; // plausibly Verilog
    out.push({ file, assistant, structure });
  }
  return out;
}

function detectFormal(proofs) {
  const placeholderFiles = new Map();
  const axioms = new Map();
  const enlarged = [];

  for (const { file, assistant, structure } of proofs) {
    let count = 0;
    for (const pattern of PLACEHOLDERS.get(assistant) ?? []) {
      count += [...structure.matchAll(pattern)].length;
    }
    if (count > 0) placeholderFiles.set(rel(file), count);

    const axiomPattern = AXIOM_DECL.get(assistant);
    if (axiomPattern) {
      for (const match of structure.matchAll(axiomPattern)) {
        if (!axioms.has(rel(file))) axioms.set(rel(file), []);
        axioms.get(rel(file)).push(match[1] ?? "(unnamed)");
      }
    }
    for (const [pattern, name] of TRUSTED_BASE) {
      if (pattern.test(structure)) enlarged.push(`${rel(file)} — ${name}`);
    }
  }

  if (placeholderFiles.size > 0) {
    report("formal.placeholder-inventory", {
      message: `${placeholderFiles.size} proof-assistant file(s) contain placeholders. This is information, not a violation — a formalisation in progress is supposed to have them.`,
      evidence: [...placeholderFiles].map(([f, n]) => `${f} (${n} placeholder${n === 1 ? "" : "s"})`),
      label: "OBSERVED",
    });
  }
  if (enlarged.length > 0) {
    report("formal.trusted-base-enlarged", {
      message: `${enlarged.length} use(s) of constructs that enlarge the trusted base beyond the kernel. Legitimate, and worth recording in the Formal block.`,
      evidence: enlarged,
      label: "INFERRED",
    });
  }

  // Claims declaring formal status, and what they cite.
  const formalClaims = ledger
    ? [...ledger.entries.values()].filter((e) => e.status === "FORMALIZED_THEOREM" || e.status === "MACHINE_CHECKED_PROOF")
    : [];

  if (proofs.length > 0 && formalClaims.length === 0) {
    report("formal.status-declared", {
      message: `${proofs.length} proof-assistant file(s) exist and no claim declares formal status against them. A development no ledger entry mentions is a formalisation gap at its widest.`,
      evidence: proofs.slice(0, MAX_EVIDENCE).map((p) => `${rel(p.file)} (${p.assistant})`),
      label: "OBSERVED",
    });
  }

  const incomplete = [];
  const inChain = [];
  const declaredAxioms = new Set();
  for (const entry of formalClaims) {
    const block = entry.formal ?? {};
    for (const name of String(block.axioms ?? "").split(/[,;]/)) {
      if (name.trim()) declaredAxioms.add(name.trim());
    }
    const required = ["assistant", "file", "declaration", "axioms"];
    const missing = required.filter((k) => !String(block[k] ?? "").trim());
    if (missing.length > 0) {
      incomplete.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — Formal block omits ${missing.join(", ")}`);
    }

    const cited = String(block.file ?? "").split("#")[0].trim();
    if (!cited) {
      inChain.push(`${LEDGER_PATH}:${entry.line} ${entry.id} (${entry.status}) — cites no formal artifact`);
      continue;
    }
    if (!existsSync(path.join(root, cited))) {
      inChain.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — cites ${cited}, which does not exist`);
      continue;
    }
    const count = placeholderFiles.get(cited.split(path.sep).join("/"));
    if (count) {
      inChain.push(`${LEDGER_PATH}:${entry.line} ${entry.id} (${entry.status}) — cites ${cited}, which contains ${count} placeholder${count === 1 ? "" : "s"}`);
    }
  }

  if (incomplete.length > 0) {
    report("formal.trusted-chain-tracked", {
      message: `${incomplete.length} formal claim(s) have an incomplete Formal block. A reader entitled to know what a machine-checked claim rests on cannot find out any other way.`,
      evidence: incomplete,
      label: "OBSERVED",
    });
  }
  if (inChain.length > 0) {
    report("formal.placeholder-in-chain", {
      message: `${inChain.length} claim(s) assert formal certification over a placeholder, a missing file, or nothing at all. A clean pass here is still not certification — that requires running the assistant.`,
      evidence: inChain,
      label: "OBSERVED",
    });
  }

  const undisclosed = [];
  for (const [file, names] of axioms) {
    for (const name of names) {
      if (!declaredAxioms.has(name)) undisclosed.push(`${file} — axiom ${name} is not listed in any Formal block`);
    }
  }
  if (undisclosed.length > 0) {
    report("formal.axiom-disclosure", {
      message: `${undisclosed.length} axiom declaration(s) are undisclosed. An undisclosed axiom is a hidden assumption with a compiler's blessing on it.`,
      evidence: undisclosed,
      label: "INFERRED",
    });
  }

  if (ledger) {
    const noField = [...ledger.entries.values()].filter((e) => (rankOf(e.status) ?? -99) >= PROVED_RANK && !e.fields.has("formal"));
    if (noField.length > 0) {
      report("formal.gap-inventory", {
        message: `${noField.length} claim(s) at proved rank omit the Formal field. Without it, 'we have a Lean development' reads as 'the results are machine-checked'.`,
        evidence: noField.map((e) => `${LEDGER_PATH}:${e.line} ${e.id}`),
        label: "OBSERVED",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Detectors — open problems and lifecycle (Standards 17, 18)
// ---------------------------------------------------------------------------

const PROBLEM_SECTIONS = [
  ["## Target Statement", "problems.tracking-file"],
  ["## What Is Proved", "problems.proved-vs-conjectural"],
  ["## What Remains Conjectural", "problems.proved-vs-conjectural"],
  ["## Known Results", "problems.known-result-check"],
  ["## Equivalences", "problems.equivalence-tracking"],
  ["## Where the Difficulty Lives", "problems.difficulty-location"],
  ["## Known Barriers", "problems.barriers-recorded"],
  ["## Terminated Approaches", "lifecycle.terminated-approaches"],
  ["## Stopping Criteria", "lifecycle.stopping-criteria"],
];

/** Body text under a heading, up to the next heading of the same or higher level. */
function sectionBody(text, heading) {
  const lines = text.replace(/\r/g, "").split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === heading.toLowerCase());
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join("\n").trim();
}

function detectOpenProblems() {
  const dir = path.join(root, OPEN_PROBLEMS_DIR);
  const problemFiles = files.filter(
    (f) => f.startsWith(dir + path.sep) && path.basename(f) === "problem.md",
  );

  if (OPEN_PROBLEM_MODE && problemFiles.length === 0) {
    report("problems.tracking-file", {
      message: `The policy declares openProblemMode and no ${OPEN_PROBLEMS_DIR}/<slug>/problem.md exists.`,
      evidence: [OPEN_PROBLEMS_DIR],
      label: "OBSERVED",
    });
    return;
  }

  for (const file of problemFiles) {
    const text = contents.get(file) ?? "";
    const missing = new Map();
    for (const [heading, rule] of PROBLEM_SECTIONS) {
      const body = sectionBody(text, heading);
      if (body === null) {
        if (!missing.has(rule)) missing.set(rule, []);
        missing.get(rule).push(`${rel(file)} — missing ${heading}`);
      } else if (body === "") {
        if (!missing.has(rule)) missing.set(rule, []);
        missing.get(rule).push(`${rel(file)} — ${heading} is empty; 'none' written deliberately is an answer, a blank is not`);
      }
    }
    for (const [rule, evidence] of missing) {
      report(rule, {
        message: `${evidence.length} required section(s) of the open-problem record are missing or empty.`,
        evidence,
        label: "OBSERVED",
      });
    }

    // Terminated approaches: each H3 needs its status and its reopening condition.
    const terminated = sectionBody(text, "## Terminated Approaches") ?? "";
    const blocks = terminated.split(/^###\s+/m).slice(1);
    const noStatus = [];
    const noReopen = [];
    for (const block of blocks) {
      const name = block.split("\n")[0].trim();
      if (!/^\s*Status:/im.test(block)) noStatus.push(`${rel(file)} — "${name}" has no Status line`);
      if (!/^\s*Evidence required to reopen:/im.test(block)) {
        noReopen.push(`${rel(file)} — "${name}" states no reopening condition`);
      }
    }
    if (noStatus.length > 0) {
      report("lifecycle.terminated-approaches", {
        message: `${noStatus.length} terminated approach(es) record no status. Termination is a decision, and a decision with no record is indistinguishable from drifting away from the work.`,
        evidence: noStatus,
        label: "OBSERVED",
      });
    }
    if (noReopen.length > 0) {
      report("lifecycle.reopening-evidence", {
        message: `${noReopen.length} terminated approach(es) state no reopening condition. Without one, an approach reopens whenever morale improves.`,
        evidence: noReopen,
        label: "OBSERVED",
      });
    }
  }
}

const ABANDONED = /(^|\/)(abandoned|failed|dead-ends?|attempts?)(\/|$)/i;

function detectFailedRoutes() {
  if (!OPEN_PROBLEM_MODE) return;
  const preserved = files.some((f) => ABANDONED.test(rel(f)));
  const inProblemFile = files.some(
    (f) => path.basename(f) === "problem.md" && /^###\s+/m.test(contents.get(f) ?? ""),
  );
  if (preserved || inProblemFile) return;
  report("lifecycle.failed-routes-preserved", {
    message: "No preserved record of abandoned routes. Deleting a failed route destroys the reason not to repeat it and the negative evidence it produced — and it is what makes selective reporting invisible.",
    evidence: [OPEN_PROBLEMS_DIR],
    label: "INFERRED",
  });
}

// ---------------------------------------------------------------------------
// Detectors — evidence and applicability (Standards 1, 15, 19)
// ---------------------------------------------------------------------------

function detectEvidenceShape() {
  if (!ledger) return;
  const badTypes = [];
  const missing = [];
  const equivalences = [];

  for (const entry of ledger.entries.values()) {
    for (const item of entry.evidence) {
      if (!EVIDENCE_CEILING.has(item.type)) {
        badTypes.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — evidence type '${item.type}' is not in the vocabulary`);
      }
      for (const artifact of item.artifacts) {
        const bare = artifact.split("#")[0];
        if (isPathShaped(bare) && !existsSync(path.join(root, bare))) {
          missing.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — evidence cites ${bare}, which does not exist`);
        }
      }
    }
    for (const equivalence of entry.equivalences) {
      if (equivalence.direction !== "iff") continue;
      if (!equivalence.provedBy) {
        equivalences.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — asserts iff with ${equivalence.target ?? "?"} and names nothing that proves it`);
        continue;
      }
      const prover = ledger.entries.get(equivalence.provedBy);
      if (!prover) {
        equivalences.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — names ${equivalence.provedBy} as proving the equivalence; no such claim`);
      } else if (!isProvedRank(prover.status)) {
        equivalences.push(`${LEDGER_PATH}:${entry.line} ${entry.id} — equivalence rests on ${prover.id}, which is ${prover.status}`);
      }
    }
  }

  if (badTypes.length > 0) {
    report("evidence.type-vocabulary", {
      message: `${badTypes.length} evidence entr(ies) use a type outside the closed vocabulary. Each type carries a ceiling; an open-ended field would let a writer choose their own.`,
      evidence: badTypes,
      label: "OBSERVED",
    });
  }
  if (missing.length > 0) {
    report("evidence.artifact-linked", {
      message: `${missing.length} evidence reference(s) point at nothing. Evidence that points at nothing is an assertion.`,
      evidence: missing,
      label: "INFERRED",
    });
  }
  if (equivalences.length > 0) {
    report("evidence.equivalence-direction-proved", {
      message: `${equivalences.length} asserted equivalence(s) are unproved or unresolvable. Asserting iff where one direction is proved is a silent strengthening.`,
      evidence: equivalences,
      label: "OBSERVED",
    });
  }
}

const REGIMES = new Set(["informal", "computational", "formal", "theorem-proving", "open-problem"]);

function detectApplicability() {
  if (!policy.document) return; // audit without a policy: nothing declared, nothing to check
  const regimes = mathPolicy.regimes;
  if (!Array.isArray(regimes) || regimes.length === 0) {
    report("evidence.applicability-declared", {
      message: "project-policy.yml declares no mathematics.regimes. A standard that applies to everything applies to nothing.",
      evidence: ["project-policy.yml"],
      label: "OBSERVED",
    });
    return;
  }
  const unknown = regimes.filter((r) => !REGIMES.has(r));
  if (unknown.length > 0) {
    report("evidence.applicability-declared", {
      message: `Unknown regime(s): ${unknown.join(", ")}.`,
      evidence: ["project-policy.yml"],
      label: "OBSERVED",
    });
  }
}

function detectFindingLabels() {
  // `report` now refuses an invalid label outright, and it is the only caller of addFinding, so on
  // this code path the rule cannot fire. That is not a rule quietly reporting a pass it did not
  // earn: the condition is enforced at construction instead of detected afterwards, which is
  // strictly stronger. The check stays because the enforcement and the rule are separate things,
  // and a future second path into `findings` must still meet it.
  const bad = findings.filter((f) => !EVIDENCE_LABELS.includes(f.label));
  if (bad.length === 0) return;
  report("evidence.labels", {
    message: `${bad.length} finding(s) carry no valid evidence label. A heuristic reported as observed is this tool fabricating certainty about its own output.`,
    evidence: bad.map((f) => `${f.rule ?? f.id} — label '${f.label}'`),
    label: "OBSERVED",
  });
}

function detectExplainability() {
  const bad = findings.filter(
    (f) => !f.rule || !f.standardRef || !f.message || !CATALOG.rules.get(f.rule)?.remediation,
  );
  if (bad.length === 0) return;
  report("agent.explainable-findings", {
    message: `${bad.length} finding(s) lack the rule, standard reference, message, or remediation an agent needs to explain why the rule applies here.`,
    evidence: bad.map((f) => f.id),
    label: "OBSERVED",
  });
}

// ---------------------------------------------------------------------------
// Detectors — integrity (Standard 21)
// ---------------------------------------------------------------------------

async function detectProvenance() {
  const file = path.join(HOME, "artifacts/provenance-digests.json");
  if (!existsSync(file)) {
    report("integrity.provenance-digest", {
      message: "No artifacts/provenance-digests.json. Without recorded digests, editing a source prompt so a standard becomes true passes every other check.",
      evidence: ["artifacts/provenance-digests.json"],
      label: "OBSERVED",
    });
    return;
  }
  const { createHash } = await import("node:crypto");
  const record = JSON.parse(await readFile(file, "utf8"));
  const drifted = [];
  for (const entry of record.files ?? []) {
    const full = path.join(HOME, entry.path);
    if (!existsSync(full)) {
      drifted.push(`${entry.path} — recorded in the digest file and absent from the repository`);
      continue;
    }
    const text = (await readFile(full, "utf8")).replace(/\r/g, "");
    const digest = createHash("sha256").update(text, "utf8").digest("hex");
    if (digest !== entry.digest) drifted.push(`${entry.path} — digest ${digest.slice(0, 16)}… does not match the recorded ${String(entry.digest).slice(0, 16)}…`);
  }
  if (drifted.length === 0) return;
  report("integrity.provenance-digest", {
    message: `${drifted.length} source document(s) have changed since their digest was recorded. A genuine correction is a deliberate act: re-review the derived spec and every affected standard, and update the digest in the same reviewed change.`,
    evidence: drifted,
    label: "OBSERVED",
  });
}

function detectRuleLifecycle() {
  const bad = [];
  for (const rule of CATALOG.rules.values()) {
    if (rule.removedIn && !rule.deprecatedIn) bad.push(`${rule.id} — removedIn without deprecatedIn`);
    if (rule.supersededBy && !CATALOG.rules.has(rule.supersededBy)) {
      bad.push(`${rule.id} — supersededBy names ${rule.supersededBy}, which the catalog does not define`);
    }
  }
  if (bad.length === 0) return;
  report("integrity.rule-lifecycle-honest", {
    message: `${bad.length} rule(s) have an inconsistent lifecycle. A rule that disappears silently takes with it every record that it once failed.`,
    evidence: bad,
    label: "OBSERVED",
  });
}

// ---------------------------------------------------------------------------
// Run the detectors
// ---------------------------------------------------------------------------

const references = ledger ? scanReferences() : [];
const dangling = ledger ? danglingEdges(ledger.entries, ledger.references) : [];
const proofs = proofFiles();

// Framework-subject detectors read the installed standards pack, not the adopter. These paths are
// relative to HOME deliberately: `inspected.subject` supplies the root they belong to.
// Read from disk, not listed. A hand-maintained file list is a fact about someone's memory — the
// same objection design/testing-principles.md raises against a hand-maintained coverage count — and
// a rules file added tomorrow would silently stop being named among what was inspected. The list
// happened to be complete when written, which is exactly how this class of drift stays invisible.
const frameworkRulePaths = (await readdir(path.join(HOME, "rules")).catch(() => []))
  .filter((name) => name.endsWith(".json"))
  .map((name) => `rules/${name}`)
  .sort();
const frameworkInspectionPaths = ["artifacts/provenance-digests.json", ...frameworkRulePaths];
try {
  const provenance = JSON.parse(await readFile(path.join(HOME, "artifacts/provenance-digests.json"), "utf8"));
  for (const entry of provenance.files ?? []) frameworkInspectionPaths.push(entry.path);
} catch {
  // The provenance detector reports the missing or malformed record; the surface still records the
  // path it attempted to inspect.
}

detectLedgerPresence();
detectLedgerParse();
detectStatusVocabulary();
detectHistoryComplete();
detectDefinitionsFirst();
detectInlineLabels(references);
detectSilentPromotion(references);
detectStatusExceedsSupport();
detectRigorFields();
detectConjectureRegistered(dangling);
detectObligations();
detectDependencyIntegrity(dangling);
detectCounterexampleSearch();
detectComputationEvidence();
detectNumericsAsProof();
detectLiterature(dangling);
detectFormal(proofs);
detectOpenProblems();
detectFailedRoutes();
detectEvidenceShape();
detectApplicability();
await detectProvenance();
detectRuleLifecycle();
// These two read the findings produced above, so they run last.
detectFindingLabels();
detectExplainability();

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

function renderHuman(fileCount) {
  const lines = [];
  lines.push(`math-standards audit — ${path.basename(root)} (${root.split(path.sep).join("/")})`);
  lines.push(`${fileCount} file(s) scanned, ${findings.length} finding(s).`);
  lines.push("");
  lines.push("What the repository has");
  lines.push(`  Claims ledger: ${ledger ? `${ledger.entries.size} claim(s) at ${LEDGER_PATH}` : "none"}`);
  if (ledger) {
    const byStatus = new Map();
    for (const e of ledger.entries.values()) byStatus.set(e.status, (byStatus.get(e.status) ?? 0) + 1);
    const summary = [...byStatus].sort((a, b) => (rankOf(b[0]) ?? -99) - (rankOf(a[0]) ?? -99));
    for (const [status, count] of summary) lines.push(`    ${status}: ${count}`);
  }
  lines.push(`  Proof-assistant files: ${proofs.length === 0 ? "none" : proofs.length}`);
  lines.push(`  Open-problem records: ${files.filter((f) => path.basename(f) === "problem.md").length}`);

  const attention = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  lines.push("");
  if (attention.length === 0) {
    lines.push("Nothing needing attention was detected.");
  } else {
    lines.push("What needs attention");
    for (const f of attention) {
      lines.push(`  [${f.severity}] ${f.rule ?? f.category} [${f.label}]`);
      lines.push(`    ${f.message}`);
      for (const e of f.evidence) lines.push(`      ${e}`);
      if (f.standardRef) lines.push(`    see ${f.standardRef}`);
    }
  }

  lines.push("");
  lines.push(
    `${findings.filter((f) => f.severity === "error").length} error(s), ` +
      `${findings.filter((f) => f.severity === "warning").length} warning(s), ` +
      `${findings.filter((f) => f.severity === "info").length} informational.`,
  );
  lines.push("");
  lines.push("Coverage is partial by design. These checks read a ledger and scan text; they do not");
  lines.push("read mathematics. A clean run means nothing matched — not that the claims are true.");
  lines.push("See docs/assurance-report.md for exactly what is and is not established.");
  if (STRICT && findings.some((f) => f.severity !== "info")) {
    lines.push("--strict: exiting 1 because findings need attention.");
  }
  return lines.join("\n");
}

/**
 * Where every evaluated rule looked, and what it found there to inspect.
 *
 * Strictly observational. Nothing here computes a status, a score, or an exit code — it prints what
 * the run already established, on the surface a person reads, in the same terms the JSON uses.
 *
 * Two rules govern the format, and both are consequences of the step-2 measurement.
 *
 * A surface is named by WHAT IT COUNTS, not by where it lives. `resolvable identifiers: 0` is a fact
 * about the project; `artifacts/claims-ledger.md` is a fact about the filesystem, and only the first
 * tells a reader that the rule which checks DOI and arXiv format examined none.
 *
 * An empty surface is printed. Listing only non-empty ones would delete the observation this whole
 * milestone exists to surface: PvsNP has sixteen references and zero identifiers, and the zero is
 * the finding. Absence is evidence here, and a renderer that omits zeros is a renderer that reports
 * "inspected: references" about a rule that inspected no identifier.
 */
function renderProvenance(report) {
  const out = [];
  out.push("Evidence provenance");
  out.push("  What each evaluated rule read, and what it found there. This states scope, not quality:");
  out.push("  a rule can read the right file and still apply a poor check.");
  out.push("");

  for (const result of report.results) {
    const inspected = result.inspected;
    if (!inspected || inspected.state === "no-detector") continue;
    out.push(result.ruleId);
    out.push(`  Subject: ${inspected.subject}`);
    if (inspected.subject === SUBJECT.framework) {
      out.push("    A property of MathematicsStandards itself, not of this project.");
    } else if (inspected.subject === SUBJECT.run) {
      out.push("    A property of this evaluation's own conduct, not of this project.");
    }
    out.push("  Inspected:");
    for (const surface of inspected.surfaces) {
      const note =
        surface.state === "unresolved"
          ? `  — not resolved: ${surface.reason ?? "no reason recorded"}`
          : surface.count === 0
            ? "  — nothing of this kind was present"
            : "";
      out.push(`    ${surface.label}: ${surface.count}${note}`);
    }
    if (inspected.state === "no-subject") {
      out.push("  Nothing to inspect, so the rule was not evaluated. This is not a failure.");
    } else if (inspected.state === "unresolved") {
      out.push("  At least one surface could not be resolved, which is not the same as finding nothing.");
    }
    out.push(`  Result: ${result.status}`);
    out.push("");
  }
  return out.join("\n");
}

/**
 * The rows in an adopter's report that are not about the adopter.
 *
 * §0h, at the one place it actually misleads: a reader scanning a compliance report sees
 * `integrity.provenance-digest — passed` beside their own rules and has no way to know it certifies
 * MathematicsStandards' source documents rather than anything of theirs. Behind `--provenance` this
 * would still be true for every reader who does not pass the flag, so it is in the ordinary render.
 */
function renderForeignSubjects(report) {
  const foreign = report.results.filter(
    (r) => r.inspected && r.inspected.subject !== SUBJECT.project && r.inspected.state !== "no-detector",
  );
  if (foreign.length === 0) return "";
  const out = ["", "  Not about this project"];
  out.push("  These rows are evaluated during your run and are not statements about your repository.");
  for (const r of foreign) {
    const whose =
      r.inspected.subject === SUBJECT.framework
        ? "about the framework"
        : "about this evaluation's own conduct";
    out.push(`    ${r.ruleId} — ${r.status}, ${whose}`);
  }
  return out.join("\n");
}

/**
 * Passes over a surface that held nothing of the kind the rule checks.
 *
 * The pass is not being contradicted here — whether it is legitimate is a verdict question and this
 * step does not touch verdicts. What is refused is the pass being *silent*. PvsNP's
 * `literature.resolvable-identifiers` passes over sixteen references containing zero identifiers,
 * and a reader of the ordinary report must not have to pass a flag to find that out.
 */
function renderVacuousArms(report) {
  const vacuous = report.results.filter(
    (r) =>
      r.status === "passed" &&
      r.disposition === "evaluated" &&
      r.inspected?.surfaces.some((s) => s.count === 0),
  );
  if (vacuous.length === 0) return "";
  const out = ["", "  Passed, having examined nothing of some kind it checks"];
  out.push("  Each of these read at least one surface and found it empty. The pass stands; what it");
  out.push("  rests on is stated so it cannot be read as a check that was performed and came back clean.");
  for (const r of vacuous) {
    const empty = r.inspected.surfaces.filter((s) => s.count === 0).map((s) => `${s.label}: 0`);
    const full = r.inspected.surfaces.filter((s) => s.count > 0).map((s) => `${s.label}: ${s.count}`);
    out.push(`    ${r.ruleId} — ${[...full, ...empty].join(", ")}`);
  }
  return out.join("\n");
}

function renderVerdict(report, policyState) {
  const out = [];
  out.push("Compliance");
  if (policyState.error) {
    out.push(`  ${policyState.error}`);
    out.push("  Status: NOT_EVALUATED — a policy that cannot be read is a configuration error,");
    out.push("  not a compliance failure.");
    return out.join("\n");
  }
  if (!policyState.document) {
    out.push(`  ${policyState.reason}.`);
    out.push("  Status: NOT_EVALUATED — findings above are observations, not a verdict.");
    out.push("  Add project-policy.yml to get one; see INSTRUCTIONS.md.");
    return out.join("\n");
  }

  const s = report.summary;
  const a = report.assurance;
  out.push(`  Status: ${report.status}`);
  out.push(`  Score:  ${report.score === null ? "n/a" : report.score + "%"}  (${report.denominator.basis}: ${report.denominator.scored})`);
  out.push(`  Rules:  ${s.passed} passed, ${s.failed} failed, ${s.warnings} warning(s), ${s.skipped} skipped`);
  out.push(`  Cover:  ${a.automated} automated, ${a.manualReview} manual-review, ${a.notEvaluated} not-evaluated`);
  out.push("");

  if (report.blockedBy?.length) {
    out.push("  BLOCKED BY INVARIANT — stop, do not work around this:");
    for (const b of report.blockedBy) out.push(`    ${b.rule} — ${b.message}`);
    out.push("    Permitted responses: fix the underlying condition, or stop and report. Editing the");
    out.push("    ledger, the policy, or a detector to clear the block is a Standard 21 violation.");
    out.push("");
  }

  // Invariant failures are excluded here because they were already printed, in full, in the block
  // above — except when the evidence ceiling capped them, in which case they were not, and without
  // `r.cappedFrom` they would appear in neither list and disappear from the human output entirely.
  // A finding the engine deliberately declined to escalate is precisely the finding a person needs
  // to see and adjudicate.
  const failed = report.results.filter((r) => r.status === "failed" && (!r.invariant || r.cappedFrom));
  if (failed.length) {
    out.push("  Failing:");
    for (const r of failed) {
      out.push(`    ${r.ruleId} [${r.level}] ${r.message}`);
      if (r.cappedFrom) {
        out.push(
          `      This rule is an invariant. The finding is ${r.label}, not observed, so it is reported`,
        );
        out.push("      as a failure and not as a block. Confirm or dismiss it; do not assume either.");
      }
      out.push(`      -> ${r.remediation}`);
    }
    out.push("");
  }
  const excepted = report.results.filter((r) => r.disposition === "excepted");
  if (excepted.length) {
    out.push("  Excepted:");
    for (const r of excepted) out.push(`    ${r.ruleId} — ${r.exception.reason} (expires ${r.exception.expires ?? "never"})`);
    out.push("");
  }
  const attested = report.results.filter((r) => r.disposition === "attested");
  if (attested.length) {
    out.push("  Attested (human review):");
    for (const r of attested) out.push(`    ${r.ruleId} — ${r.attestation.reviewedBy}, ${r.attestation.reviewedAt}`);
    out.push("");
  }
  const na = report.results.filter((r) => r.disposition === "not-applicable");
  if (na.length) {
    out.push(`  Not applicable (${na.length}): ${na.map((r) => r.ruleId).join(", ")}`);
    out.push("");
  }

  const c = report.frameworkCoverage;
  if (c) {
    out.push(
      `  Framework: ${c.cataloguedRules} rule(s) catalogued across ${c.standardsWithRules} of ` +
        `${c.standards ?? "?"} standards; ${c.evaluatedRules} evaluated by a detector; ` +
        `${c.fullyMachineRepresentedStandards} fully machine-represented.`,
    );
    out.push("");
  }

  out.push("  The score is a summary statistic over evaluated required rules, not a measure of how");
  out.push("  much was verified. A skipped rule is neither a pass nor a failure. Framework coverage");
  out.push("  is maturity of the tooling, never compliance of this project — they do not combine.");
  return out.join("\n");
}

function renderStatus(report, policyState) {
  if (!policyState.document) return renderVerdict(report, policyState);
  const c = report.frameworkCoverage;
  const s = report.summary;
  const lines = [
    `${path.basename(root)}: ${report.status}`,
    `  score ${report.score === null ? "n/a" : report.score + "%"} over ${report.denominator.scored} evaluated required rule(s)`,
    `  ${s.passed} passed · ${s.failed} failed · ${s.warnings} warning · ${s.skipped} skipped`,
    `  coverage ${c ? `${c.evaluatedRules}/${c.cataloguedRules} rules have a detector; ${c.fullyMachineRepresentedStandards}/${c.standards ?? "?"} standards fully machine-represented` : "unknown"}`,
  ];
  if (report.blockedBy?.length) {
    lines.push(`  BLOCKED: ${report.blockedBy.map((b) => b.rule).join(", ")}`);
  }
  return lines.join("\n");
}

/** Everything an agent needs to answer "why does this apply to me, and what would satisfy it?" */
function explain(catalog, subject, policyDocument) {
  const asNumber = Number(subject);
  if (Number.isInteger(asNumber) && STANDARD_PATHS.has(asNumber)) {
    const rules = [...catalog.rules.values()].filter((r) => r.standard === asNumber);
    return {
      kind: "standard",
      standard: asNumber,
      document: STANDARD_PATHS.get(asNumber),
      rules: rules.map((r) => ({ id: r.id, level: r.level, severity: r.severity, title: r.title })),
    };
  }
  const rule = resolveRule(catalog, subject);
  if (!rule) return null;
  const applies = policyDocument?.applicability?.[rule.id];
  const exception = (policyDocument?.exceptions ?? []).find((e) => e.rule === rule.id);
  const attestation = policyDocument?.attestations?.[rule.id];
  return {
    kind: "rule",
    id: rule.id,
    title: rule.title,
    standard: rule.standard,
    document: STANDARD_PATHS.get(rule.standard) ?? null,
    level: policyDocument?.rules?.[rule.id]?.level ?? rule.level,
    severity: rule.severity,
    validationType: rule.validationType,
    assurance: rule.assurance,
    invariant: isInvariant(rule),
    evaluatedByADetector: EVALUATED_RULES.includes(rule.id),
    description: rule.description,
    rationale: rule.rationale,
    remediation: rule.remediation,
    assuranceNote: rule["$assuranceNote"] ?? null,
    disposition: applies?.status === "not-applicable"
      ? { state: "not-applicable", reason: applies.reason, revisitWhen: applies.revisitWhen }
      : exception
        ? { state: "excepted", reason: exception.reason, expires: exception.expires ?? null }
        : attestation
          ? { state: "attested", reviewedBy: attestation.reviewedBy, reviewedAt: attestation.reviewedAt }
          : { state: "applies" },
  };
}

function renderExplain(info) {
  if (info.kind === "standard") {
    const lines = [`Standard ${info.standard} — ${info.document}`, ""];
    if (info.rules.length === 0) lines.push("  No catalog rules bind to this standard.");
    for (const r of info.rules) lines.push(`  ${r.id} [${r.level}/${r.severity}] ${r.title}`);
    return lines.join("\n");
  }
  const lines = [
    `${info.id} — ${info.title}`,
    `  Standard ${info.standard}: ${info.document ?? "(unresolved)"}`,
    `  Level ${info.level}, severity ${info.severity}, ${info.validationType}, assurance ${info.assurance}` +
      (info.invariant ? " — INVARIANT (no exception reaches it)" : ""),
    `  Evaluated by a detector: ${info.evaluatedByADetector ? "yes" : "no — this rule reports not-evaluated, never passed"}`,
    "",
    `  What it requires: ${info.description}`,
    `  Why: ${info.rationale}`,
    `  To satisfy it: ${info.remediation}`,
  ];
  if (info.assuranceNote) lines.push("", `  What the check does NOT establish: ${info.assuranceNote}`);
  lines.push("", `  In this project: ${info.disposition.state}`);
  if (info.disposition.reason) lines.push(`    reason: ${info.disposition.reason}`);
  if (info.disposition.revisitWhen) lines.push(`    revisit when: ${info.disposition.revisitWhen}`);
  if (info.disposition.reviewedBy) lines.push(`    reviewed by ${info.disposition.reviewedBy} on ${info.disposition.reviewedAt}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Verdict — catalog + policy + findings
//
// The three-way separation must not be violated here: the catalog defines rule identity and
// metadata, project-policy.yml defines what applies to THIS project, and everything above produces
// evidence. Nothing in this section redefines a rule or invents applicability.
// ---------------------------------------------------------------------------

assertBindings(CATALOG, findings.map((f) => f.rule).filter(Boolean));

if (!VALIDATING) {
  if (JSON_OUT) {
    process.stdout.write(
      JSON.stringify(
        {
          schemaVersion: SCHEMA_VERSION,
          repo: root.split(path.sep).join("/"),
          auditedAt: new Date().toISOString(),
          // The findings-only contract, stated where a program can read it.
          //
          // `audit` emitting no verdict is intentional and stays: separating observation from
          // conclusion is a distinction this framework exists to draw, and collapsing it to match
          // `validate` would undo that. The defect is that the intent was stated only in the human
          // render, which ends "This is evidence, not a verdict." A consumer receiving this JSON had
          // no field distinguishing *audited, no verdict* from *evaluated, nothing to report*, so an
          // empty `findings` array read as a clean bill of health.
          //
          // Deliberately not a `status` key holding a neutral token. A status field present on both
          // commands invites a consumer to compare its values, and the point is that one of these
          // commands does not produce one.
          verdictComputed: false,
          verdict: null,
          note: "Audit only — no compliance verdict was computed. Run `validate` for one.",
          findings,
        },
        null,
        2,
      ) + "\n",
    );
  } else {
    process.stdout.write(renderHuman(files.length) + "\n");
    process.stdout.write("\nThis is evidence, not a verdict. Run `math-standards validate` for a compliance status.\n");
  }
  process.exit(STRICT && findings.some((f) => f.severity !== "info") ? EXIT_FINDINGS : EXIT_OK);
}

/**
 * Digest the paths each attestation says it reviewed, so a material change to them makes the
 * attestation stale. Content-based rather than revision-based on purpose: invalidating every
 * attestation on every commit would make the mechanism unusable, and it would be abandoned.
 */
async function attestationDigests(document, repoRoot) {
  const { createHash } = await import("node:crypto");
  const out = new Map();
  for (const [ruleId, attestation] of Object.entries(document?.attestations ?? {})) {
    const paths = attestation?.reviewedAgainst?.paths;
    if (!Array.isArray(paths) || paths.length === 0) continue;
    const hash = createHash("sha256");
    for (const p of [...paths].sort()) {
      hash.update(p);
      try {
        hash.update(await readFile(path.join(repoRoot, p), "utf8"));
      } catch {
        hash.update("<missing>"); // A reviewed path that has since gone is itself a material change.
      }
    }
    out.set(ruleId, hash.digest("hex").slice(0, 32));
  }
  return out;
}

const digests = await attestationDigests(policy.document, root);
const today = new Date().toISOString().slice(0, 10);
assertSurfacesKnown();
const relativeFiles = files.map(rel);
const relativeFileSet = new Set(relativeFiles);
const problemPaths = relativeFiles.filter(
  (p) => p.startsWith(`${OPEN_PROBLEMS_DIR.replace(/\/$/, "")}/`) && p.endsWith("/problem.md"),
);
const citedPaths = new Set();
if (ledger) {
  for (const entry of ledger.entries.values()) {
    for (const item of entry.evidence ?? []) {
      // `artifacts`, and only that. The parser builds each evidence item as
      // `{ type, detail, artifacts, text }` (claims.mjs:405) — there is no `path`, `file`,
      // `artifact` or `value` key on it, so a chain of fallbacks across those four names resolves
      // to undefined for every entry in every repository and this surface reports empty forever.
      // A surface that silently resolves to nothing is the §0 defect wearing the fix's clothes:
      // the field would say "inspected no artifacts" about a ledger citing dozens.
      for (const artifact of item.artifacts ?? []) {
        const bare = String(artifact).split("#")[0];
        if (isPathShaped(bare) && relativeFileSet.has(bare)) citedPaths.add(bare);
      }
    }
    const formalFile = entry.formal?.file;
    if (typeof formalFile === "string" && relativeFileSet.has(formalFile)) citedPaths.add(formalFile);
  }
}
/**
 * The results of the previous evaluation pass, or null before one has run.
 *
 * `evidence.skipped-never-passed` reads the result set, which does not exist until the engine has
 * produced it. Resolving its surface to a placeholder would be the `cited-artifacts` mistake again —
 * a number that looks like an observation and is not one — so the first pass reports it honestly as
 * unresolved and the second reports what is actually there. `evaluate` is pure over in-memory data,
 * so the second pass costs nothing and cannot diverge for any other reason.
 */
let runOutcome = null;

const resolveSurface = (surface) => {
  switch (surface) {
    case "claims-ledger-location":
      // Always resolvable, and that is the point: claims.ledger-exists is the one rule whose subject
      // is the ledger's ABSENCE. Resolving it against the ledger's contents would make it no-subject
      // in exactly the situation it exists to report.
      return resolved([LEDGER_PATH]);
    case "claims-ledger":
      return resolved(ledgerText === null ? [] : [LEDGER_PATH]);

    // Locators, not files: `<ledger>#<slug>` names the thing inspected at the granularity the rule
    // reads it. Both frozen adopters resolve `reference-identifiers` to zero — PvsNP with sixteen
    // references and RH with none — which is §0's second instance made visible.
    case "references":
      return resolved(ledger ? [...ledger.references.keys()].sort().map((s) => `${LEDGER_PATH}#${s}`) : []);
    case "reference-identifiers":
      return resolved(
        ledger
          ? [...ledger.references]
              .filter(([, citation]) => /\b10\.\d{4,9}\/\S+|\barXiv:/i.test(citation))
              .map(([slug]) => `${LEDGER_PATH}#${slug}`)
              .sort()
          : [],
      );

    case "cited-artifacts":
      return resolved([...citedPaths].sort());
    case "prose":
      // Empty without a ledger because the prose detectors themselves return early without one:
      // there are no registered claims for a reference scan to seek. Observed empty, not a failure.
      return resolved(
        ledger ? [...contents.keys()].map(rel).filter((p) => /\.(?:md|txt|ya?ml|json)$/i.test(p)).sort() : [],
      );
    case "proof-sources":
      return resolved(proofs.map((p) => rel(p.file)).sort());
    case "open-problems":
      return resolved(problemPaths);
    case "repository-paths":
      return resolved(relativeFiles);
    case "project-policy":
      return resolved(relativeFileSet.has("project-policy.yml") ? ["project-policy.yml"] : []);

    case "run-findings":
      return resolved([
        ...new Set(
          findings
            .flatMap((f) => f.evidence ?? [])
            .map((e) => String(e).split(":")[0])
            .filter((p) => relativeFileSet.has(p)),
        ),
      ].sort());
    case "run-results":
      if (runOutcome === null) {
        return unresolved("the results of this run do not exist until the first evaluation pass completes");
      }
      return resolved(runOutcome);

    case "framework-home":
      return resolved(frameworkInspectionPaths);
    case "framework-catalog":
      return resolved(frameworkInspectionPaths.filter((p) => p.startsWith("rules/")));

    default:
      // Not `resolved([])`. An unknown surface is a programming error, and reporting it as observed
      // emptiness would skip the rule while looking like a finding about the project.
      throw new Error(`unknown evidence surface '${surface}'`);
  }
};

const buildInspections = () => new Map(EVALUATED_RULES.map((id) => [id, inspectionFor(id, resolveSurface)]));
let inspections = buildInspections();
const evaluateArgs = {
  catalog: CATALOG,
  policy: policy.document,
  findings,
  evaluated: EVALUATED_RULES,
  inspections,
  today,
  digests,
};

/**
 * Two passes, and the reason is worth stating: evidence.skipped-never-passed is a rule about the
 * compliance engine's own output, so it cannot be evaluated before that output exists. The first
 * pass produces a verdict; the invariant is checked against it; if it is violated a finding is added
 * and the verdict recomputed. `evaluate` is a pure function over in-memory data, so the second pass
 * costs nothing and cannot diverge from the first for any other reason.
 */
let verdict = evaluate(evaluateArgs);

// The result set now exists, so the one surface that reads it can stop saying it cannot be resolved
// and start saying what is in it. The second pass is unconditional for that reason: previously it
// ran only when the false-green invariant had been violated, which left the common case reporting
// `unresolved` in the output of every clean run.
runOutcome = verdict.results.map((r) => `${r.ruleId}:${r.status}`);
const falseGreen = verdict.results.filter((r) => r.status === "passed" && r.disposition === "not-evaluated");
if (falseGreen.length > 0) {
  report("evidence.skipped-never-passed", {
    message: `${falseGreen.length} rule(s) are reported as passing while nothing evaluated them. This is a defect in the tool, not in the project.`,
    evidence: falseGreen.map((r) => r.ruleId),
    label: "OBSERVED",
  });
}
evaluateArgs.inspections = buildInspections();
verdict = evaluate(evaluateArgs);

const report_ = envelope({
  verdict,
  project: policy.document?.project,
  standardVersion: policy.document?.standardVersion,
  auditedAt: new Date().toISOString(),
  repo: root.split(path.sep).join("/"),
  frameworkCoverage: coverage(CATALOG, { evaluated: EVALUATED_RULES, totalStandards: TOTAL_STANDARDS }),
});

if (JSON_OUT) {
  // A consumer joins on results[].ruleId. `findings` is additive detail beyond that contract.
  process.stdout.write(JSON.stringify({ ...report_, findings }, null, 2) + "\n");
} else if (STATUS_ONLY) {
  process.stdout.write(renderStatus(report_, policy) + "\n");
  if (PROVENANCE) process.stdout.write("\n" + renderProvenance(report_) + "\n");
} else {
  process.stdout.write(renderVerdict(report_, policy) + "\n");
  // Both in the ordinary render, both unconditional. A reader who does not pass --provenance is
  // exactly the reader these two protect: one is told which rows are not about their repository,
  // the other which passes examined nothing of the kind they check.
  const foreign = renderForeignSubjects(report_);
  if (foreign) process.stdout.write(foreign + "\n");
  const vacuous = renderVacuousArms(report_);
  if (vacuous) process.stdout.write(vacuous + "\n");
  if (PROVENANCE) process.stdout.write("\n" + renderProvenance(report_) + "\n");
  for (const [ruleId, digest] of digests) {
    const recorded = policy.document?.attestations?.[ruleId]?.reviewedAgainst?.digest;
    if (!recorded) {
      process.stdout.write(`\n  attestation ${ruleId}: current digest is ${digest}\n`);
      process.stdout.write("  Record it as reviewedAgainst.digest to make staleness detectable.\n");
    }
  }
}

// A policy that could not be read, or none at all, is exit 2: a verdict was requested and there is
// nothing to evaluate against. That is a configuration problem, not a compliance failure.
if (policy.error || !policy.document) process.exit(EXIT_INVOCATION);
if (report_.status === "NON_COMPLIANT" || report_.status === "BLOCKED_BY_INVARIANT") process.exit(EXIT_FINDINGS);
process.exit(EXIT_OK);
