/**
 * The pipeline, declared once.
 *
 * Before this file existed, the gate sequence lived only in `.github/workflows/ci.yml`, which meant
 * the answer to "what does CI actually check?" was a YAML file that only GitHub could execute. A
 * developer could not run it, and a second executor — a container, a self-hosted runner — could only
 * be built by copying the list somewhere else, at which point there are two pipelines that agree
 * until the day they don't.
 *
 * So the list moved here and both executors read it. The workflow now invokes `scripts/run-stages.mjs`
 * instead of naming eight commands, and `scripts/ci.mjs` runs the same script inside a container.
 * `test/local-ci.test.mjs` fails if either arrangement drifts.
 *
 * Each stage names an npm script rather than a command line. That keeps `package.json` the single
 * authority on how a check is actually invoked: this file decides *which* checks run and *in what
 * order*, and never restates the command, because a restated command is a copy that can rot.
 *
 * ORDER IS LOAD-BEARING. Each gate assumes the previous one held, so a failure names itself instead
 * of surfacing as a confusing downstream error. The `why` text is not decoration — it is the
 * rationale that used to live in the workflow's comments, and it is printed beside a failure so the
 * person reading the log learns what the gate was for.
 */

/**
 * @typedef {object} Stage
 * @property {string} id        Stable identifier. Appears in the evidence file's `checks` array.
 * @property {string} npmScript The npm script that runs it. Must exist in package.json.
 * @property {string} title     Human-readable name for the console.
 * @property {string} why       What this gate establishes, and why it sits at this position.
 */

/** @type {readonly Stage[]} */
export const STAGES = Object.freeze([
  Object.freeze({
    id: "inventory",
    npmScript: "inventory",
    title: "Inventory",
    why: "The standards series has not silently changed shape — no item renumbered, retitled, or dropped, and no file in standards/ left unclaimed.",
  }),
  Object.freeze({
    id: "fidelity",
    npmScript: "fidelity",
    title: "Fidelity",
    why: "Every block a standard claims is verbatim source actually is, character for character against the derived spec.",
  }),
  Object.freeze({
    id: "policy",
    npmScript: "policy",
    title: "Policy",
    why: "This repository's own policy is well-formed and internally consistent — the framework applied to itself.",
  }),
  Object.freeze({
    id: "diagrams",
    npmScript: "diagrams",
    title: "Diagrams",
    why: "Every .mmd matches the copy embedded in the documentation, so no document shows a stale diagram.",
  }),
  Object.freeze({
    id: "assurance-report",
    npmScript: "assurance:check",
    title: "Assurance report is current",
    why: "The committed assurance report matches the catalog it is generated from, so the published coverage figures are not a fact about someone's memory.",
  }),
  Object.freeze({
    id: "tests",
    npmScript: "test",
    title: "Tests",
    why: "Unit and fixture tests, including the self-audit and every detector asserted in both directions.",
  }),
  Object.freeze({
    id: "audit",
    npmScript: "audit",
    title: "Audit",
    why: "Evidence discovery. Deliberately NOT --strict: the error gate is the self-audit assertion in test/audit.test.mjs, which knows which findings this repository's policy has answered. Gating on --strict here would fail the build for the missing claims ledger that the policy correctly declares not-applicable.",
  }),
  Object.freeze({
    id: "validate",
    npmScript: "validate",
    title: "Validate",
    why: "The verdict. This is the gate.",
  }),
]);

/**
 * Stages that are available but not part of the default pipeline, keyed by the flag that enables
 * them.
 *
 * `mutation-check` writes to tracked files. On a developer's machine that is a reason to keep it out
 * of `npm test` — a suite that mutates the working tree should be something a person runs
 * deliberately. Inside the CI container that objection disappears, because the tree it mutates is a
 * disposable copy of the commit and is destroyed with the container. It is still opt-in rather than
 * default, because promoting it silently would change what "CI passed" means for every branch
 * without anyone deciding to.
 *
 * @type {readonly Stage[]}
 */
export const OPTIONAL_STAGES = Object.freeze([
  Object.freeze({
    id: "mutation-check",
    npmScript: "mutation-check",
    title: "Mutation checks",
    why: "Reintroduces the defect each gate exists to catch and confirms the gate fails. Excluded from the default pipeline because it writes to tracked files; safe in the container, where the tree is disposable. Enable with --with-mutation-check.",
  }),
]);

/** The stage list for a run, given its options. */
export function stagesFor({ withMutationCheck = false } = {}) {
  return withMutationCheck ? [...STAGES, ...OPTIONAL_STAGES] : [...STAGES];
}
