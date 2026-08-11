/**
 * Following a pointer an adopter declared, and saying honestly when it could not be followed.
 *
 * The rule this module exists to enforce:
 *
 *     A detector may accept an evidence pointer only if the framework can resolve that pointer to
 *     the artifact the detector actually intends to inspect.
 *
 * §0m, measured rather than argued. `lifecycle.failed-routes-preserved` looks for a preserved record
 * of abandoned work by matching path SHAPES —
 * `/(^|\/)(abandoned|failed|dead-ends?|attempts?)(\/|$)/i` — which requires a whole path segment to
 * be one of those words. Both frozen adopters keep exactly the record the rule wants:
 * RiemannHypothesis at `Research/FAILED_APPROACHES.md`, PvsNP at `docs/FAILED_ATTEMPTS.md`. Neither
 * matches. The rule passes in both on its other arm, a `###` heading in some problem.md. So in 2 of
 * 2 adopters the framework's proxy is blind to the real artifact and reports a pass anyway — a rule
 * satisfied by something other than the thing it is about.
 *
 * The repair is not a longer regex. It is to let the project say where the artifact is and to make
 * the framework go and read it, with a failure mode when it cannot. Both halves are necessary:
 * accepting a declaration without following it would reproduce §0m with better manners, since the
 * rule would then be discharged by the act of naming a file.
 *
 * Two invariants, both earned by defects found in this milestone:
 *
 *   1. **The project root is a parameter with no default.** Every wrong-root defect in the audit is
 *      a check that resolved something against whichever root happened to be nearest — usually the
 *      framework's, because that is where the process is running. A defaulted root is how that
 *      happens, so there is no default and a missing one throws.
 *   2. **Four outcomes, not two.** `resolved` and "everything else" would collapse *the artifact is
 *      absent* (the adopter's to fix) into *this pointer form is not understood* (the framework's).
 *      They map onto one inspection-level `unresolved` state at the rule — the verdict does not need
 *      four new outcomes — but the diagnostic keeps them apart, because the remedy differs.
 */

import { realpathSync, statSync } from "node:fs";
import path from "node:path";

export const POINTER = {
  /** Parsed, target found, target kind supported. The only status a detector may act on. */
  resolved: "resolved",
  /** Well-formed and project-relative; nothing is there. The adopter's to fix. */
  missing: "missing",
  /** Understood as a pointer, not to a kind of thing this framework can read. The framework's. */
  unsupported: "unsupported",
  /** Not a usable pointer at all: empty, absolute, or escaping the project. */
  invalid: "invalid",
};

/** A scheme-qualified locator: `https:`, `git:`, `doi:`. Not a path, and not fetched from here. */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function answer(pointer, status, { target = null, kind = null, reason = null } = {}) {
  return { pointer, target, kind, status, reason };
}

/**
 * Resolve one declared evidence pointer against one project.
 *
 * @param projectRoot absolute path to the repository being audited. Required; never defaulted.
 * @param pointer     the string the adopter wrote in its policy.
 * @returns { pointer, target, kind, status, reason } — `target` is project-relative with forward
 *          slashes, so it can be printed and compared on any platform; `reason` is null exactly when
 *          the status is `resolved`.
 *
 * Reading the artifact is the caller's job. This says where it is and whether it is there; what is
 * *in* it is the rule's question, and a primitive that answered it would be a detector.
 */
export function resolveEvidencePointer(projectRoot, pointer) {
  if (typeof projectRoot !== "string" || projectRoot === "" || !path.isAbsolute(projectRoot)) {
    throw new Error(
      `resolveEvidencePointer requires an absolute project root; received ${JSON.stringify(projectRoot)}. ` +
        `Resolution against the framework's own root, or against cwd, is the wrong-root defect this ` +
        `module exists to prevent, and a defaulted parameter is how it happens.`,
    );
  }
  if (typeof pointer !== "string" || pointer.trim() === "") {
    return answer(pointer, POINTER.invalid, { reason: "the declared pointer is empty" });
  }

  const raw = pointer.trim();

  // Order matters: a Windows path begins `C:\`, which also matches SCHEME. Absoluteness is the more
  // specific diagnosis and is checked first.
  if (path.isAbsolute(raw) || /^[a-z]:[\\/]/i.test(raw)) {
    return answer(raw, POINTER.invalid, {
      reason:
        `'${raw}' is an absolute path. What it points at is a property of the machine running the ` +
        `check rather than of the repository, so two runs of the same commit could disagree.`,
    });
  }
  if (SCHEME.test(raw)) {
    return answer(raw, POINTER.unsupported, {
      reason: `'${raw}' is a URL or scheme-qualified locator; this framework reads files in the repository under audit, and nothing over a network.`,
    });
  }
  if (raw.includes("#")) {
    // Supportable later — the ledger already uses `<file>#<slug>` locators. Reported as unsupported
    // rather than silently truncated to the file: a rule told to inspect one section of a document
    // and handed the whole document has not inspected what it was pointed at.
    return answer(raw, POINTER.unsupported, {
      reason: `'${raw}' names a fragment within a file. Fragment resolution is not implemented, and reading the whole file instead would inspect something other than what was declared.`,
    });
  }

  const normalised = raw.split("\\").join("/").replace(/\/+$/, "");
  const absolute = path.resolve(projectRoot, normalised);
  const relative = path.relative(projectRoot, absolute).split(path.sep).join("/");
  if (relative === "" || relative.startsWith("../")) {
    return answer(raw, POINTER.invalid, {
      reason: `'${raw}' resolves outside the project root ${path.basename(projectRoot)}.`,
    });
  }

  let stat;
  try {
    stat = statSync(absolute);
  } catch {
    return answer(raw, POINTER.missing, {
      target: relative,
      reason: `'${relative}' does not exist under ${path.basename(projectRoot)}.`,
    });
  }

  // A symlink is followed by statSync, so a link pointing out of the repository would otherwise
  // resolve to a file the adopter does not own — the wrong-root defect wearing a different hat.
  const real = realpathSync(absolute);
  const realRoot = realpathSync(projectRoot);
  const realRelative = path.relative(realRoot, real);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
    return answer(raw, POINTER.invalid, {
      target: relative,
      reason: `'${relative}' is a link leading outside the project root; the artifact it names is not the adopter's.`,
    });
  }

  if (stat.isDirectory()) return answer(raw, POINTER.resolved, { target: relative, kind: "directory" });
  if (stat.isFile()) return answer(raw, POINTER.resolved, { target: relative, kind: "file" });
  return answer(raw, POINTER.unsupported, {
    target: relative,
    reason: `'${relative}' is neither a file nor a directory.`,
  });
}
