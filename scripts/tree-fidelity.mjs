/**
 * The tree the pipeline executes is the tree the commit records.
 *
 * THE GUARANTEE:
 *
 *     The tracked-file bytes CI builds, executes and mutates are the tracked-file bytes of the
 *     verified commit — not a transcription of them.
 *
 * WHY THIS IS NOT PEDANTRY, measured at 5afcd00 on 2026-08-23. `scripts/ci.mjs` exports the commit
 * to a throwaway `git worktree` and builds the image from it, and `Dockerfile.ci` says the image is
 * a sealed snapshot of one tree. It was not. With `core.autocrlf=true` and `.gitattributes` pinning
 * `eol=lf` for only three globs, the export converted every other text file:
 *
 *     tracked files 286 · byte-identical to the commit 29 · byte-different 257
 *
 * One byte per line, which is exactly the kind of difference that hides. It surfaced through the
 * only checks that read the tree as bytes rather than as lines: two of the six mutation checks
 * search for a string anchored on a newline, found CRLF, and reported SETUP FAILED — so the
 * inventory and fidelity gates, the two that protect the spec-to-standards chain, had never been
 * attacked in the environment this repository treats as authoritative. The other four searched
 * strings with no newline in them and passed, which is why the suite looked partly broken rather
 * than wholly blind.
 *
 * TWO CHECKS, BECAUSE THERE ARE TWO BOUNDARIES.
 *
 *   1. `commitToTreeDrift` — git object to exported worktree. Compares the committed blob's bytes to
 *      the exported file's bytes for every tracked path. This is where the conversion happened, and
 *      an attribute alone would not have caught it: `.gitattributes` is a file like any other and
 *      can be edited, so the property is asserted at the boundary rather than configured upstream of
 *      it and assumed.
 *
 *   2. `digestTree` — exported worktree to container source. The host digests the export minus what
 *      `.dockerignore` withholds, hands the digest over as `CI_TREE_DIGEST`, and the runner digests
 *      the tree it is actually standing in and refuses to start if they differ. That covers the
 *      `COPY` into the image and, when `--with-mutation-check` is on, the copy onto /work as well:
 *      the digest is taken from the runner's own root, so a lossy copy fails before a stage runs.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not normalise anything, and nothing downstream of it
 * may either. Teaching the mutation checks to tolerate a stray CR would have turned the suite green
 * while leaving the artifact CI verifies different from the commit it names — a check passing for a
 * reason unrelated to the property, which is the defect this repository exists to prevent.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Written as a code point rather than as a literal, so that a NUL byte cannot be lost by an editor,
// a diff viewer, or a copy-paste on its way through review.
const NUL = String.fromCharCode(0);
const LF = 0x0a;
const CR = 0x0d;

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

/**
 * The subset of `.dockerignore` syntax this repository uses, refusing anything it does not.
 *
 * A matcher that silently ignored a pattern it did not understand would exclude less than the build
 * does, and the two digests would disagree for a reason that has nothing to do with fidelity. So an
 * unsupported form throws: the day someone writes a pattern shape this does not know, it fails
 * loudly and gets taught the form, rather than reporting drift that is not there.
 *
 * @param {string} text contents of a .dockerignore
 * @returns {(relativePath: string) => boolean} true when the build context withholds that path
 */
export function dockerignoreMatcher(text) {
  const literals = [];
  const extensions = [];
  const prefixes = [];
  for (const line of String(text).split("\n")) {
    const pattern = line.trim();
    if (pattern === "" || pattern.startsWith("#")) continue;
    if (pattern.startsWith("!")) {
      throw new Error(`tree-fidelity: negated .dockerignore pattern '${pattern}' is not supported`);
    }
    if (/^[^*?[\]]+$/.test(pattern)) {
      const clean = pattern.replace(/\/+$/, "");
      literals.push(clean);
      prefixes.push(`${clean}/`);
      continue;
    }
    const suffix = /^\*(\.[A-Za-z0-9.]+)$/.exec(pattern);
    if (suffix) {
      extensions.push(suffix[1]);
      continue;
    }
    const dotted = /^([^*?[\]]+)\.\*$/.exec(pattern);
    if (dotted) {
      prefixes.push(`${dotted[1]}.`);
      continue;
    }
    throw new Error(`tree-fidelity: .dockerignore pattern '${pattern}' is not a form this matcher understands`);
  }
  return (relativePath) => {
    const p = String(relativePath).split(path.sep).join("/");
    const base = p.slice(p.lastIndexOf("/") + 1);
    if (literals.includes(p) || literals.includes(base)) return true;
    if (prefixes.some((prefix) => p.startsWith(prefix) || base.startsWith(prefix))) return true;
    return extensions.some((extension) => p.endsWith(extension));
  };
}

/**
 * Every file under `dir`, project-relative with forward slashes, sorted, excluding what `withhold`
 * says the build context does not carry.
 *
 * Sorted because a digest that depended on readdir order would differ between two identical trees on
 * two filesystems, and a check that is flaky is a check that gets removed.
 */
export function treeFiles(dir, withhold = () => false) {
  const out = [];
  const walk = (absolute, relative) => {
    const entries = readdirSync(absolute, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const entry of entries) {
      const childRelative = relative === "" ? entry.name : `${relative}/${entry.name}`;
      if (withhold(childRelative)) continue;
      const childAbsolute = path.join(absolute, entry.name);
      if (entry.isDirectory()) walk(childAbsolute, childRelative);
      else if (entry.isFile()) out.push(childRelative);
    }
  };
  walk(dir, "");
  return out;
}

/**
 * A single hex digest over a tree's contents and layout.
 *
 * Paths are hashed alongside contents, so moving a file changes the digest even when no byte of any
 * file changed. A digest over contents alone would call two different trees the same tree.
 *
 * @returns {{ digest: string, files: Array<{path: string, sha256: string, bytes: number}> }}
 */
export function digestTree(dir, withhold = () => false) {
  const files = treeFiles(dir, withhold).map((relative) => {
    const buffer = readFileSync(path.join(dir, relative));
    return { path: relative, sha256: sha256(buffer), bytes: buffer.length };
  });
  const roll = createHash("sha256");
  for (const file of files) roll.update(`${file.path} ${file.sha256}\n`);
  return { digest: roll.digest("hex"), files };
}

/**
 * The committed bytes of every tracked path at `sha`, as `path -> { sha256, bytes }`.
 *
 * One `git cat-file --batch` for the whole tree rather than one process per file: 286 spawns is slow
 * enough on Windows that someone would be tempted to sample instead of check, and a check that
 * samples does not hold an invariant.
 */
export function commitManifest(repoRoot, sha) {
  const listed = spawnSync("git", ["ls-tree", "-r", "-z", "--name-only", sha], {
    cwd: repoRoot,
    encoding: "buffer",
    maxBuffer: 1 << 28,
  });
  if (listed.status !== 0) throw new Error(`tree-fidelity: cannot list the tree at ${sha}`);
  const paths = listed.stdout.toString("utf8").split(NUL).filter((p) => p !== "");

  const batch = spawnSync("git", ["cat-file", "--batch"], {
    cwd: repoRoot,
    input: `${paths.map((p) => `${sha}:${p}`).join("\n")}\n`,
    maxBuffer: 1 << 30,
  });
  if (batch.status !== 0) throw new Error(`tree-fidelity: cannot read the blobs at ${sha}`);

  // `<oid> <type> <size>` then a newline, the contents, and a newline, repeated. Parsed as bytes:
  // decoding to a string first would mangle any non-UTF-8 content and make the comparison a fact
  // about the decoder rather than about the tree.
  const out = new Map();
  const buffer = batch.stdout;
  let cursor = 0;
  for (const p of paths) {
    const newline = buffer.indexOf(LF, cursor);
    if (newline < 0) throw new Error(`tree-fidelity: truncated cat-file output at ${p}`);
    const header = buffer.toString("utf8", cursor, newline).split(" ");
    const size = Number(header[2]);
    if (!Number.isInteger(size)) {
      throw new Error(`tree-fidelity: unreadable cat-file header for ${p}: ${header.join(" ")}`);
    }
    const start = newline + 1;
    out.set(p, { sha256: sha256(buffer.subarray(start, start + size)), bytes: size });
    cursor = start + size + 1;
  }
  return out;
}

function countBytes(buffer, byte) {
  let n = 0;
  for (let i = 0; i < buffer.length; i++) if (buffer[i] === byte) n++;
  return n;
}

/**
 * Where the exported tree stops being the commit.
 *
 * The CRLF reason is named specifically rather than folded into "bytes differ", because that is the
 * form this has actually taken and a person reading a failure at 2am should not have to rediscover
 * it. The test is arithmetic, not a guess: the file is longer by exactly its count of CR bytes.
 *
 * @returns {Array<{path: string, reason: string, commitBytes: number|null, treeBytes: number|null}>}
 *          empty when the export is faithful.
 */
export function commitToTreeDrift(repoRoot, sha, treeDir) {
  const manifest = commitManifest(repoRoot, sha);
  const drift = [];
  for (const [relative, committed] of manifest) {
    const absolute = path.join(treeDir, relative);
    let stat;
    try {
      stat = statSync(absolute);
    } catch {
      drift.push({
        path: relative,
        reason: "tracked at this commit, absent from the exported tree",
        commitBytes: committed.bytes,
        treeBytes: null,
      });
      continue;
    }
    if (!stat.isFile()) {
      drift.push({
        path: relative,
        reason: "tracked as a file, exported as something else",
        commitBytes: committed.bytes,
        treeBytes: null,
      });
      continue;
    }
    const buffer = readFileSync(absolute);
    if (sha256(buffer) === committed.sha256) continue;
    const crlf = buffer.length - committed.bytes === countBytes(buffer, CR);
    drift.push({
      path: relative,
      reason: crlf
        ? "exported with CRLF line endings; the commit holds LF"
        : "exported bytes differ from the committed blob",
      commitBytes: committed.bytes,
      treeBytes: buffer.length,
    });
  }
  return drift;
}

/** Digest of a tree as the build context will see it: the export minus what .dockerignore withholds. */
export function contextDigest(treeDir) {
  let ignore = "";
  try {
    ignore = readFileSync(path.join(treeDir, ".dockerignore"), "utf8");
  } catch {
    ignore = "";
  }
  return digestTree(treeDir, dockerignoreMatcher(ignore));
}

/**
 * The runner's own comparison. Kept pure so a test can prove the refusal without a container.
 *
 * An absent expectation is not a failure: `run-stages.mjs` is also the executor the GitHub workflow
 * calls, where there is no host to hand a digest over and no export boundary to check. Refusing
 * there would fail a run for lacking a guarantee that does not apply to it.
 */
export function checkTreeDigest(expected, actual) {
  if (!expected) return { ok: true, message: null };
  if (expected === actual) return { ok: true, message: null };
  return {
    ok: false,
    message:
      "The tree this runner is standing in is not the tree the host exported.\n" +
      `  expected ${expected}\n` +
      `  actual   ${actual}\n` +
      "Something between the verified commit and here changed a tracked byte. No stage ran: a green " +
      "pipeline over a tree nobody verified is worse than no pipeline.",
  };
}

/**
 * CLI, for asking the question by hand.
 *
 *   node scripts/tree-fidelity.mjs --commit=<sha> --tree=<dir>   compare a commit to an exported tree
 *   node scripts/tree-fidelity.mjs --digest=<dir>                print the build-context digest
 *
 * Exit 0 when the tree is the commit, 1 when it is not, 2 on invocation error. The pipeline calls
 * the functions directly; this exists so that a person investigating a red run can reproduce the
 * comparison without reading the pipeline to find out how it was made.
 */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const digestOnly = value("digest");
  if (digestOnly) {
    console.log(contextDigest(path.resolve(digestOnly)).digest);
    process.exit(0);
  }
  const commit = value("commit");
  const tree = value("tree");
  if (!commit || !tree) {
    console.error("Usage: node scripts/tree-fidelity.mjs --commit=<sha> --tree=<dir>   (or --digest=<dir>)");
    process.exit(2);
  }
  const drift = commitToTreeDrift(process.cwd(), commit, path.resolve(tree));
  const total = commitManifest(process.cwd(), commit).size;
  if (drift.length === 0) {
    console.log(`tree-fidelity: ${total} tracked file(s) at ${commit.slice(0, 12)} are byte-identical in ${tree}`);
    process.exit(0);
  }
  console.error(`tree-fidelity: ${drift.length} of ${total} tracked file(s) differ from the commit`);
  for (const d of drift.slice(0, 20)) {
    console.error(`  ${d.path} — ${d.reason} (commit ${d.commitBytes}B, tree ${d.treeBytes ?? "absent"})`);
  }
  if (drift.length > 20) console.error(`  … and ${drift.length - 20} more`);
  process.exit(1);
}
