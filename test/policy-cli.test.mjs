/**
 * The policy reader through the real binaries (FE-32, GitHub #63, criterion C3).
 *
 * test/yaml.test.mjs checks the library call. The defect the issue reports was observed at the
 * process boundary: a policy using `>-` was "rejected outright — NOT_EVALUATED, exit 2". These tests
 * spawn the shipped CLIs on a policy whose attestation `evidence` is multi-line reasoning with
 * double quotes and assert exit code and the printed verdict, plus a control that the strict
 * refusal still produces exit 2 and names the line.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STANDARDS = path.join(HOME, "scripts/standards.mjs");
const POLICY = path.join(HOME, "scripts/policy.mjs");

const policyText = (header) =>
  [
    'standardVersion: "1.0.0"',
    'project: "t"',
    "attestations:",
    "  rigor.unjustified-division:",
    "    status: approved",
    '    reviewedBy: "me"',
    '    reviewedAt: "2026-01-15"',
    `    evidence: ${header}`,
    '      Checked every cancellation in proofs/clm-0002.md; each "denominator" is non-vanishing',
    "      on the stated domain by Lemma CLM-0005 (see #7).",
    "",
    "      Second paragraph: the case x = 0 is handled separately in section 4.",
    "",
  ].join("\n");

async function inTempProject(header, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "mathstd-cli-"));
  try {
    await writeFile(path.join(dir, "project-policy.yml"), policyText(header), "utf8");
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const run = (script, args) =>
  spawnSync(process.execPath, [script, ...args], { encoding: "utf8", cwd: HOME, timeout: 120000 });

test("`validate` on a policy with a multi-line, double-quoted attestation is not NOT_EVALUATED and does not exit 2", async () => {
  await inTempProject(">-", (dir) => {
    const r = run(STANDARDS, ["validate", dir]);
    assert.notEqual(r.status, 2, `exit ${r.status}\n${r.stdout}\n${r.stderr}`);
    assert.ok([0, 1].includes(r.status), `unexpected exit ${r.status}`);
    assert.doesNotMatch(r.stdout, /NOT_EVALUATED/);
    assert.doesNotMatch(r.stdout, /could not be read|does not match the schema/);
    assert.match(r.stdout, /Status: [A-Z_]+/);
  });
});

test("`policy` on the same file exits 0 and says it is valid against the schema", async () => {
  await inTempProject("|-", (dir) => {
    const r = run(POLICY, [path.join(dir, "project-policy.yml")]);
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout, /Valid against schemas\/project-policy\.schema\.json\./);
  });
});

test("control: an unsupported header (`+` chomping) still exits 2, NOT_EVALUATED, naming the line", async () => {
  await inTempProject(">+", (dir) => {
    const v = run(STANDARDS, ["validate", dir]);
    assert.equal(v.status, 2, `${v.stdout}\n${v.stderr}`);
    assert.match(v.stdout, /NOT_EVALUATED/);
    assert.match(v.stdout, /line 8: keep chomping/);
    const p = run(POLICY, [path.join(dir, "project-policy.yml")]);
    assert.equal(p.status, 2, `${p.stdout}\n${p.stderr}`);
    assert.match(p.stdout, /line 8: keep chomping/);
  });
});
