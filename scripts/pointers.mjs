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

import { readFileSync, realpathSync, statSync } from "node:fs";
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

function answer(pointer, status, { target = null, kind = null, reason = null, fragment = null } = {}) {
  // `fragment` is null on every answer this module gave before FE-44, and on every answer to a
  // pointer that names no location inside a file. Present-and-null and absent are the same
  // proposition here, so it is a plain field rather than an optional one.
  return { pointer, target, kind, status, reason, fragment };
}

/**
 * Resolve one declared evidence pointer against one project.
 *
 * @param projectRoot absolute path to the repository being audited. Required; never defaulted.
 * @param pointer     the string the adopter wrote in its policy.
 * @param options     `{ fragments }` — false by default, in which case `file#anchor` is `unsupported`
 *                    exactly as before. True asks for the fragment to be followed too, and is used
 *                    only by the rule that exists to report whether it resolves.
 * @returns { pointer, target, kind, status, reason } — `target` is project-relative with forward
 *          slashes, so it can be printed and compared on any platform; `reason` is null exactly when
 *          the status is `resolved`.
 *
 * Reading the artifact is the caller's job. This says where it is and whether it is there; what is
 * *in* it is the rule's question, and a primitive that answered it would be a detector.
 */
export function resolveEvidencePointer(projectRoot, pointer, { fragments = false } = {}) {
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
    //
    // FE-44 made "later" arrive, for callers that ask. `fragments: true` follows the fragment as
    // well as the file; the default is unchanged, so the two callers on the declared-failed-routes
    // path still receive `unsupported` for an anchored pointer and nothing about their behaviour
    // moves. An opt-in rather than a new default because widening what an existing caller resolves
    // is exactly the silent truncation the paragraph above refuses.
    if (!fragments) {
      return answer(raw, POINTER.unsupported, {
        reason: `'${raw}' names a fragment within a file. Fragment resolution is not implemented, and reading the whole file instead would inspect something other than what was declared.`,
      });
    }
    return resolveFragmentPointer(projectRoot, raw);
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

// ---------------------------------------------------------------------------
// Fragments
//
// FE-44. `evidence.artifact-linked` resolves a locator with the anchor stripped and that stays its
// published contract; what was missing is any way to say whether the named location is there. This
// is that, and it is deliberately separable: the caller opts in, the four-token status vocabulary is
// unchanged, and the one new field is additive.
//
// The distinction the design record insists on, and the reason `unsupported` is not folded into
// `missing`: a fragment this framework cannot resolve is the FRAMEWORK's limitation, and reporting
// it as an absent location would turn parser incapability into a confident statement about the
// adopter's evidence. Only Markdown headings are resolved today. A `.lean` declaration name, a Coq
// section, a Python symbol — each is a real locator that a real adopter may write, and each needs a
// parser this framework does not have.
// ---------------------------------------------------------------------------

/** Extensions whose fragments this framework can currently resolve. Everything else is unsupported. */
const FRAGMENT_KINDS = new Map([
  [".md", "markdown"],
  [".markdown", "markdown"],
]);

/**
 * GitHub-flavoured heading slugs, near enough — lowercase, punctuation dropped, spaces hyphenated.
 *
 * "Near enough" is a real qualification and the callers must carry it: this does not implement every
 * rule of any one renderer's slugger, so a heading whose slug this computes differently from the
 * tool the adopter used would be reported absent when it is present. That is why the rule reading
 * this is `recommended`/`warning` rather than `required`/`error`, and why its finding says what it
 * matched on. An approximation that does not admit to being one is a claim.
 */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/** Every anchor a Markdown document offers: heading slugs, plus explicit `id=`/`name=` attributes. */
export function markdownAnchors(text) {
  const anchors = new Set();
  let inFence = false;
  for (const line of String(text).split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    // `{#explicit}` wins where a writer supplied one, and the computed slug is still offered: a
    // document can be linked either way and this reports what the document actually provides.
    if (heading) {
      const explicit = /\{#([^}\s]+)\}\s*$/.exec(heading[1]);
      if (explicit) anchors.add(explicit[1]);
      anchors.add(slug(heading[1].replace(/\{#[^}\s]+\}\s*$/, "")));
    }
    for (const m of line.matchAll(/<[^>]*\b(?:id|name)\s*=\s*["']([^"']+)["']/g)) anchors.add(m[1]);
  }
  anchors.delete("");
  return anchors;
}

/**
 * Resolve `<file>#<fragment>`. Only reached with `fragments: true`.
 *
 * The file half is resolved by the ordinary path, so a fragment on a file that is not there is
 * `missing` for the file's reason and never for the fragment's — a project told its section is
 * absent when the whole document is absent has been told the wrong thing.
 */
function resolveFragmentPointer(projectRoot, raw) {
  const hash = raw.indexOf("#");
  const filePart = raw.slice(0, hash);
  const fragment = raw.slice(hash + 1);

  if (filePart === "") {
    return answer(raw, POINTER.invalid, { fragment, reason: `'${raw}' names a fragment and no file to find it in.` });
  }
  if (fragment === "") {
    return answer(raw, POINTER.invalid, { fragment, reason: `'${raw}' ends in an empty fragment; nothing is named after the '#'.` });
  }

  const file = resolveEvidencePointer(projectRoot, filePart);
  if (file.status !== POINTER.resolved || file.kind !== "file") {
    return { ...file, pointer: raw, fragment };
  }

  const kind = FRAGMENT_KINDS.get(path.extname(file.target).toLowerCase());
  if (!kind) {
    return answer(raw, POINTER.unsupported, {
      target: file.target,
      kind: file.kind,
      fragment,
      reason:
        `'${file.target}' exists, and fragment resolution for ${path.extname(file.target) || "files of this kind"} ` +
        `is not implemented. Whether '${fragment}' is in it was not determined, by this framework rather than by the project.`,
    });
  }

  let text;
  try {
    text = readFileSync(path.resolve(projectRoot, file.target), "utf8");
  } catch (error) {
    return answer(raw, POINTER.unsupported, {
      target: file.target,
      fragment,
      reason: `'${file.target}' exists and could not be read (${error.code ?? "unknown error"}), so '${fragment}' was not looked for.`,
    });
  }

  const anchors = markdownAnchors(text);
  // The declared fragment is compared as written, against the anchors the document actually offers.
  // It is deliberately NOT slugged first: `slug()` strips punctuation, so slugging both sides makes a
  // locator `#a.b` match a heading `A.B` whose only anchor is `ab` — a fragment the document does not
  // offer, reported resolved. That is this rule's own failure mode, since it exists to report a
  // locator naming a place that is not there. The leniency it would buy (a writer citing the heading
  // text rather than its slug) is unevidenced: the shipped `templates/claims-ledger.md` teaches the
  // slug form, and §3 of design/fe-44-locator-contract.md measured zero anchored evidence locators
  // across both frozen adopters. Headings still contribute their computed slug AND any explicit
  // `{#id}`, so a document remains linkable either way.
  if (anchors.has(fragment)) {
    return answer(raw, POINTER.resolved, { target: file.target, kind: "fragment", fragment });
  }
  return answer(raw, POINTER.missing, {
    target: file.target,
    // `fragment` on both outcomes of an actual search, found and absent alike, so a caller can tell
    // "this framework looked inside the file" from "it never got that far" without reading prose.
    // The three ways of never getting that far — the file is missing, the pointer is malformed, the
    // kind is not one whose fragments are resolved — keep the kind they had.
    kind: "fragment",
    fragment,
    reason:
      `'${file.target}' exists and contains no section '${fragment}'. Matched against ${anchors.size} heading ` +
      `anchor(s) computed from the document; a heading whose slug a renderer computes differently would read ` +
      `absent here, which is why this is reported as a recommendation rather than a failure.`,
  });
}
