# Attempt <attempt-id>

Save as `artifacts/research-attempts/<attempt-id>/attempt.md`. The attempt belongs to no claim and
needs none; the gates below are checks on the attempt itself.

The framework has no list of gates. Each gate is whatever the project names it, and names must be
unique within the attempt. Delete the example gates and write your own.

## Gates

### <Gate name>

State: unrun

### <Another gate name>

State: executed
Execution evidence: <a path, a URL, or `commit <sha>` showing the check was run>

### <A gate with a verdict>

State: passed
Execution evidence: <a path, a URL, or `commit <sha>` showing the check was run>
Verdict evidence: <a path, a URL, or `commit <sha>` supporting the verdict>

## How to read the states

- `unrun` — not run. Carries no evidence. It is reported as unrun, never as passed.
- `executed` — run, no verdict recorded yet. Execution evidence only.
- `passed` or `failed` — run, with a verdict. Execution evidence and verdict evidence both.

A gate missing the evidence its state requires is reported `invalid` and never counts as passed. An
attempt is reported "all passed" only if it has at least one gate and every gate is validly `passed`.
Free text alone is not evidence; cite a path, a URL, or `commit <sha>`.
