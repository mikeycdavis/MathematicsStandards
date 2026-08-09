# CLI design

The charter names six candidate commands — `init`, `plan`, `check`, `audit`, `explain`, `status` —
and says not to copy them blindly but to design around the actual workflows of this domain. This is
what that produced: five commands, one alias, and one candidate deliberately not implemented.

## The workflows

There are three, and they are what the command set is shaped around.

1. **Adopt.** A researcher points the framework at a project once. What exists gets preserved; what
   is missing gets scaffolded; nothing is overwritten without being named.
2. **Work.** An agent or a person changes the mathematics, then asks whether the record still holds
   up. This happens many times a day and has to be fast, offline, and unambiguous.
3. **Understand.** Something was reported. Why does that rule apply here, what would satisfy it, and
   what does the check actually establish? This is the workflow a bare pass/fail tool leaves the user
   to solve by reading source.

## The commands

| Command | Workflow | Exit contract |
| --- | --- | --- |
| `init [path]` | Adopt | 0 clean, 1 unresolved conflict, 2 could not run |
| `audit [path]` | Work — discovery | 0, or 1 with `--strict` when findings need attention |
| `validate [path]` | Work — verdict | 0 compliant, 1 failing or blocked, 2 no usable policy |
| `check [path]` | alias of `validate` | as `validate` |
| `explain <rule\|standard>` | Understand | 0, 2 if the subject does not resolve |
| `status [path]` | Understand — at a glance | as `validate` |

### Why `audit` and `validate` are two commands

They answer different questions and, decisively, they have different exit contracts. `audit` surveys
evidence and needs no policy; warnings do not make it fail. `validate` produces the verdict CI gates
on; a required-rule failure exits non-zero regardless of anything else. One command cannot hold both
contracts without a flag that switches between them, and a flag that changes an exit code is a trap —
every consumer then has to guess which contract it got.

`check` is an alias rather than a third behaviour. The charter names it, and the distinction it might
otherwise have carried is already spent on the audit/validate split.

### Why there is no `plan` command

`plan` in the charter's list means "show me what would happen". In this domain there is exactly one
mutating operation — `init` — and it already has that mode, in the strongest available form: `plan()`
and `apply()` are the same computation, so `--dry-run` is `plan()` without `apply()` rather than a
parallel code path that has to be kept in step. A dry run whose output does not predict the real run
is worse than none, because it is trusted.

A separate `plan` command would either duplicate `init --dry-run` or invent a second thing to plan.
The dry-run/apply equivalence is asserted by a test.

### Why `explain` exists

This is the command the charter's AI-usage section makes necessary. An agent must be able to say why
a standard applies, and "rule X failed" does not do that. `explain` prints the rule's level, severity,
validation type, whether it is an invariant, **whether any detector evaluates it at all**, what it
requires, why, what would satisfy it, what the check does *not* establish, and its disposition under
this project's policy — including the reason and revisit condition if it has been declared
not-applicable.

The "evaluated by a detector: no — this rule reports not-evaluated, never passed" line is the one
that matters most. Without it, a user reading a clean run has no way to tell which rules were checked.

### Why `status` is separate from `validate`

Same data, different question. `validate` is the full report a person reads when something is wrong;
`status` is four lines an agent reads between steps: verdict, score over evaluated required rules,
counts, coverage, and any blocking invariants. A test asserts it stays under eight lines, because a
summary that grows into a report is no longer a summary.

## Cross-cutting decisions

**Everything is offline and deterministic.** No command makes a network call. That is why
`literature.resolvable-identifiers` can only check identifier *format* — and the rule says so rather
than implying more. Determinism means the same repository produces the same findings; the only
non-deterministic input is the current date, used for exception expiry.

**`--json` on every reporting command.** The human rendering is for people; the JSON envelope is the
contract, and consumers join on `results[].ruleId` rather than on a finding category.

**Exit 2 is not a compliance failure.** A malformed policy, a missing directory, an unknown
subcommand: the tool could not reach a verdict. Collapsing that into exit 1 tells CI that a broken
validator is a failing project, and the usual response to that is to weaken the check.

**No command can clear a block.** There is deliberately no `--ignore`, no `--allow`, no
`--no-fail-on`. The only ways past `BLOCKED_BY_INVARIANT` are to fix the condition or to stop, and a
flag that suppressed it would be the bypass [Standard 21](../standards/21-standards-integrity.md)
prohibits, shipped in the tool itself.
