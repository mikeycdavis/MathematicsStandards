# Standard 18 — Research Lifecycle

Research spends most of its time failing, and almost none of that gets written down. The route that
did not work is deleted before commit; the reason it did not work survives in one person's memory; six
months later somebody tries it again. Worse, the failed run that undermined the hypothesis disappears
along with the failed route, and what remains in the repository is a record of everything that
supported the conclusion.

Source: item 18 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every research effort in every regime. [Standard 17](17-open-problems.md) applies the same
requirements at a higher bar for major open problems.

## Requirements

### R1 — Failed routes are preserved

From the source, the standards must cover:

- failed research routes

A route that was tried and abandoned MUST remain in the repository, with what was tried and what
happened. Deleting it destroys three things: the reason not to try it again, the negative evidence it
produced, and the ability of anyone else to see the shape of the search.

The last is what connects this requirement to the prohibitions. Discarding failed experiments that
undermine a hypothesis, and cherry-picking computational results, are both prohibited in the source,
and neither leaves an artifact behind — a deleted run is simply absent. Requiring failures to be
preserved is what converts those prohibitions from unenforceable to at least visible: a project whose
record contains only successes is making a claim about its own history that a reviewer can weigh.

Preserved does not mean prominent. A `research/abandoned/` directory, or a dated notes file, is
sufficient. What is prohibited is removal.

### R2 — Terminated approaches record why and what would reopen them

From the source, the standards must cover:

- reopening conditions

Terminating an approach is a decision and MUST be recorded as one, with three parts: the date, the
reason it stopped, and the evidence that would justify reopening it. The third is the one that gets
skipped and the one that does the work — it turns "we gave up on this" into a falsifiable condition,
and it is the difference between a closed direction and a direction that reopens whenever morale
improves.

The format is the H3 block of [Standard 17](17-open-problems.md) R6, in the open-problem file where
one exists and in the project's research notes otherwise.

### R3 — Stopping criteria are stated in advance

From the source, the standards must cover:

- research stopping criteria

A research effort MUST state, before it begins, what would make it stop. Legitimate criteria are
specific and checkable:

- a barrier result that would rule the approach out;
- a resource bound — a computation beyond feasible scale, a time budget;
- a date, or a milestone that must be reached by one;
- a literature result that would settle the question either way;
- a negative result the effort itself would produce.

The reason for "in advance" is not bureaucratic. Criteria written at the start are a research plan;
criteria written at the end are a description of what happened, and they exert no discipline on the
work at all. An effort that cannot say what would make it stop has no way to distinguish persistence
from sunk cost, which on hard problems is where years go.

### R4 — Reopening is a decision with evidence

Reopening a terminated approach MUST cite the evidence its reopening condition named, or record a
revision of that condition and why. This is deliberately symmetric with termination. The failure it
prevents is the loop where an approach is abandoned, revisited on a hunch, abandoned again, and
revisited once more, with each cycle costing the same effort and producing the same outcome — a
pattern an untiring agent is far more prone to than a human, because the discouragement that would
stop a person does not accumulate.

### R5 — The record is repository-backed, not conversational

Everything this standard requires lives in files. A decision that exists only in a chat log, an
issue comment, or an agent's context window is not preserved: chat history is transient working
context, and the next session — human or machine — begins without it. A project that relies on
conversation to remember why an approach was dropped will drop it again.

## Additions this standard makes beyond the source

- R1's argument that preserving failures is what makes the cherry-picking and discarded-experiment
  prohibitions visible, given that both are otherwise invisible by construction.
- R2's three-part termination record.
- R3's list of legitimate stopping criteria and the argument for stating them in advance.
- R4 in full, including the observation that the abandon–revisit loop is a specifically agentic
  failure mode.
- R5.

## Relationship to other standards

[Standard 9](09-edge-cases-and-counterexamples.md) R3 requires counterexamples to be recorded; this
standard requires the runs that produced them to survive.
[Standard 10](10-computational-and-numerical-evidence.md) R3 prohibits selective reporting, which R1
makes checkable by a human. [Standard 17](17-open-problems.md) R5–R7 is this standard at a higher bar.
[Standard 20](20-must-never-rules.md) holds the prohibitions.

## Implementation

Detectors: `lifecycle.terminated-approaches` (each terminated approach carries a `Status:` line),
`lifecycle.reopening-evidence` (and an `Evidence required to reopen:` line), and
`lifecycle.stopping-criteria` (the section exists and is non-empty). All three check that the fields
were filled in, which is genuinely worth checking and is not the same as the content being true.

`lifecycle.failed-routes-preserved` is a warning-level document check that looks for a preserved-failure
location at all. It cannot detect a deletion — that is the whole difficulty. Nothing in a repository's
current state reveals what was removed before the first commit, and a check that claimed to detect it
would be inventing a capability. What the standard supplies instead is a norm and a place: when failures
are expected to be present, their absence is something a reviewer can notice, and a project with no
`research/abandoned/` directory after a year of work is making a visible claim about how the work went.
