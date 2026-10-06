# Adopting the Mathematics Standards

For the person or agent putting these standards onto a real research project.

## The minimum recipe

```bash
npx math-standards init .
```

That writes `project-policy.yml`, `PROJECT.md`, `AGENTS.md`, `CLAUDE.md`, an empty
`artifacts/claims-ledger.md`, and two directories. It never overwrites anything that differs from
its template; it reports a conflict and stops. `--dry-run` first if you want to see the list — the
dry run and the real run are the same computation, so it cannot mislead you.

Then, in order:

1. **Declare your regimes** in `project-policy.yml` under `mathematics.regimes`. Informal,
   computational, formal, theorem-proving, open-problem — as many as apply.
2. **Register your claims** in `artifacts/claims-ledger.md`, each with the status its evidence
   actually supports. This is the work. Everything else is bookkeeping around it.
3. **Run `npx math-standards validate .`** and read the whole output, not just the status line.

## Do not copy the standards documents into your repository

Depend on a version. `standardVersion` in your policy names it, and the CHANGELOG says what changed.
A copied standard is a fork that nobody knows is a fork: it stops receiving corrections, and the day
it disagrees with the real one there is no way to tell which was intended.

## The hardest part: registering existing claims honestly

If your project already has mathematics, `init` will tell you a ledger is required and will not
generate one. That is deliberate. A generated ledger would record every result at the status its
author gave it, which is exactly the assumption the ledger exists to test.

Work through your results and, for each, ask what the evidence supports rather than what the writing
currently says. The two most common corrections:

- A "theorem" whose support is a computation over a range becomes `COMPUTATIONAL_VERIFICATION`, or
  becomes a theorem *about that range* — which is a genuine theorem whose proof is the computation.
- A theorem resting on an unproved hypothesis becomes `CONDITIONAL_THEOREM`, with the hypothesis in
  the statement rather than in a footnote.

Neither is a demotion of the work. It is the same mathematics, described accurately.

## The four mechanisms, and how to choose between them

When a rule reports against you, exactly one of these is the right response.

| Situation | Mechanism | What it says |
| --- | --- | --- |
| The rule has no subject in this project | `applicability: not-applicable` | "There is no Lean here" |
| The rule applies and you have not satisfied it | `exceptions:` | "This applies, we know, here is the deadline" |
| The rule applies and a human established it holds | `attestations:` | "I read the proof; the division is justified" |
| The rule applies and nobody checked | nothing | The report says `not-evaluated`, and that is correct |

The fourth is the one people try to eliminate. Don't. A rule reported as not-evaluated is doing its
job: it is telling you the coverage figure is not the whole picture.

**Not-applicable needs a `revisitWhen`.** Every declaration names the event that would end it — "a
`.lean` file is added", "a computation is committed". Without one it is a permanent exemption wearing
a temporary label, and `math-standards policy` refuses it.

**Attestations are evidence, not waivers.** An attestation that contradicts an observed finding
*fails*. It records the files it reviewed, and goes stale — back to not-evaluated, not to failure —
when they change. It can also record a **rejection**: "I reviewed this and it is not met" is a
first-class outcome, and a system that only let you record approval would have decided in advance
what you were going to say.

**Writing an attestation's reasoning.** `evidence` (and an exception's `reason`) is where the
judgement is recorded, and judgement is rarely one short line. The policy reader accepts a YAML block
scalar for any mapping value: `>-` folds the lines you write into one string, and `|-` keeps the line
breaks. Inside the body double quotes, `#`, and `: ` are ordinary text. A plain or quoted one-line
value still works, but a quoted value cannot contain the quote character itself.

```yaml
attestations:
  rigor.unjustified-division:
    status: approved
    reviewedBy: "A. Reviewer"
    reviewedAt: "2026-01-15"
    evidence: >-
      Checked every cancellation in proofs/clm-0002.md; each "denominator" is non-vanishing
      on the stated domain by Lemma CLM-0005.
```

Only `|` and `>` are supported, with the default (clip) or `-` (strip) chomping. The reader is
deliberately strict, because a reader that quietly ignores a construct is worse than one that
refuses it, so these are still refused with an error that names the line: `+` (keep) chomping,
explicit indentation indicators such as `|2`, anchors and aliases, a block scalar as a list entry,
tabs, an empty body, and more-indented lines inside a folded (`>`) scalar. Use `|-` when the
indentation inside the text matters. A line of spaces is empty only up to the body's indent; wider,
its extra spaces are text (kept by `|`, refused by `>`), even on the last line, and chomping removes
only truly empty trailing lines. Clip chomping (the default) keeps the line break that ends the last
body line and adds none, so a body followed by another key ends in a newline even when the file does
not, and a body whose last line reaches the end of the file with no line break has none.

**Nothing waives a prohibition.** An exception against a rule that is `forbidden` and
`nonExemptible` is rejected, and the rejection is itself a failure. That is what makes it a
prohibition.

## audit versus validate

`audit` surveys evidence and produces no verdict. It needs no policy, and it will report things your
policy has already answered — that is correct behaviour for a survey.

`validate` applies the policy and produces the verdict. **Gate CI on `validate`.**

Exit codes: `0` clean, `1` the tool worked and found problems, `2` the tool could not reach a verdict
— a malformed policy, a missing directory. Never collapse 1 and 2: it tells CI that a broken
validator is a failing project, and the usual response to that is to weaken the check.

## When you are blocked

`BLOCKED_BY_INVARIANT` means a prohibition was violated. You may do two things: fix the underlying
condition, or stop and report. You may not edit the ledger, the policy, or a detector to clear it,
reclassify the rule as not-applicable, or write an exception against it — each of those is a
violation of [Standard 21](standards/21-standards-integrity.md) in its own right.

The test for whether a change is legitimate is counterfactual: **would this change be correct if the
rule were currently passing?**

## Working with an AI agent

`init` writes `AGENTS.md` and `CLAUDE.md` into your project. They carry the load order, the claim
statuses, the five conclusions an agent may reach, and the duty to stop. The one that matters most:

> An agent must be able to conclude "this is not proved", "the evidence is insufficient", or "I
> cannot establish this". It must never be forced into a positive recommendation.

If your workflow punishes those answers, you have built a system that selects for overstatement, and
no amount of checking downstream will fix it.

## Current limitations

Stated plainly, because a tool that overstated its own coverage would be committing the error it
exists to prevent.

| Limitation | Consequence |
| --- | --- |
| The detectors read a ledger and scan text; they never read mathematics | Proof correctness is entirely outside their reach |
| Everything mechanical operates on what is **declared** | An undeclared assumption, an unregistered claim, or a dishonest ledger entry is invisible |
| Proof-assistant checking is a token scan, not a kernel run | A clean `formal.placeholder-in-chain` is the absence of the obvious contradiction, not certification. Run the assistant and commit the `#print axioms` output |
| No network access, ever | A well-formed identifier for a paper that does not exist passes the citation check |
| Suppression leaves no artifact | A hidden counterexample or a deleted failed run cannot be detected by anything; Standard 18 makes deletion visible to a reviewer instead |
| Roughly a third of the catalog has no detector | Those rules report `not-evaluated` in every run. See `docs/assurance-report.md` for the full list |

## Upgrading

Read the CHANGELOG. Adding a `required` or `forbidden` rule is a MAJOR bump; adding a `recommended`
or `optional` one is MINOR; removing, weakening, or reclassifying any rule is MAJOR. A rule never
disappears silently — it is marked `deprecatedIn`, optionally `supersededBy`, and only then
`removedIn`, with the removal recorded. That trail is one of the arms protecting Standard 21.

## What not to do

- Do not copy the standards documents into your repository.
- Do not lower a rule's level to make a run pass. That is what an exception is for, and an exception
  has an approver and a date.
- Do not attest to something you did not check. An attestation is evidence; a false one is worse than
  the silence it replaced.
- Do not read a clean run as full coverage. It means everything that was checked passed.
- Do not delete a failed route or an inconvenient computation. Preserved does not mean prominent.
