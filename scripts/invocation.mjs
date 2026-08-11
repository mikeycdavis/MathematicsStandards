/**
 * The invocation contract: which arguments each command accepts, and how a wrong one is described.
 *
 * §0a — unknown or invalid arguments must fail closed before any mutation. Both v1.0.0 field trials
 * produced the defect independently: `--dry-run` was tested by exact presence, so `--dryrun`,
 * `--dry_run` and `--dry-run=true` parsed as a bare `init` and applied; `--help` was recognised only
 * as a subcommand, so `init --help` applied against a real repository.
 *
 * This lives apart from the CLI so the contract can be enumerated by a test rather than restated in
 * one. A table that exists twice is a table that will disagree with itself, and the general property
 * worth pinning is not "--strict is rejected by validate" but *no declared flag is ever silently
 * ignored by any command*.
 */

/** Accepted by every command, with no value. */
export const GLOBAL_FLAGS = new Set(["--json", "--help", "-h"]);

/** Accepted by every command, and requires a value: `--dir=<path>`. */
export const GLOBAL_VALUE_FLAGS = new Set(["--dir"]);

/** Per-command flags. `plain` take no value; `valued` require `=<value>`. */
export const COMMAND_FLAGS = {
  // `--provenance` is accepted by audit as well as the verdict commands, because the question it
  // answers — what did this rule actually read — is the same on both sides of the evidence/verdict
  // split. It changes no status, score, or exit code; it prints what the run already computed.
  audit: { plain: new Set(["--strict", "--provenance"]), valued: new Set() },
  validate: { plain: new Set(["--provenance"]), valued: new Set() },
  check: { plain: new Set(["--provenance"]), valued: new Set() },
  status: { plain: new Set(["--provenance"]), valued: new Set() },
  explain: { plain: new Set(), valued: new Set() },
  init: { plain: new Set(["--dry-run"]), valued: new Set(["--mode", "--force-overwrite"]) },
};

export const COMMANDS = Object.freeze(Object.keys(COMMAND_FLAGS));

/** Every flag any command declares, in the spelling an operator would type. */
export function declaredFlags() {
  const flags = new Map();
  for (const name of GLOBAL_FLAGS) flags.set(name, { valued: false });
  for (const name of GLOBAL_VALUE_FLAGS) flags.set(name, { valued: true });
  for (const spec of Object.values(COMMAND_FLAGS)) {
    for (const name of spec.plain) flags.set(name, { valued: false });
    for (const name of spec.valued) flags.set(name, { valued: true });
  }
  return flags;
}

/** Which commands accept this flag. Used to say so, because near misses are plausible spellings. */
export function flagOwners(name) {
  const owners = [];
  if (GLOBAL_FLAGS.has(name) || GLOBAL_VALUE_FLAGS.has(name)) return COMMANDS.slice();
  for (const [command, spec] of Object.entries(COMMAND_FLAGS)) {
    if (spec.plain.has(name) || spec.valued.has(name)) owners.push(command);
  }
  return owners;
}

/**
 * Classify one argument against one command.
 *
 * Returns `null` when the argument is acceptable, otherwise a sentence naming what is wrong. The
 * three ways an argument can be wrong are distinguished, because the fix differs for each and the
 * spelling that produced this defect was a near miss rather than a random string.
 */
export function classifyArg(subcommand, arg) {
  if (!arg.startsWith("-")) return null;
  const spec = COMMAND_FLAGS[subcommand];
  if (!spec) return `unknown subcommand ${subcommand}`;

  const eq = arg.indexOf("=");
  const name = eq === -1 ? arg : arg.slice(0, eq);
  const valued = eq !== -1;

  const takesNoValue = GLOBAL_FLAGS.has(name) || spec.plain.has(name);
  const takesValue = GLOBAL_VALUE_FLAGS.has(name) || spec.valued.has(name);

  if (!valued && takesNoValue) return null;
  if (valued && takesValue) return null;

  if (valued && takesNoValue) return `${name} takes no value`;
  if (!valued && takesValue) return `${name} requires a value, as ${name}=<value>`;

  const owners = flagOwners(name);
  return owners.length
    ? `${name} is accepted by ${owners.join(", ")}, not by ${subcommand}`
    : `unknown option ${name}`;
}
