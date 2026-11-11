# FE-27 / FE-28 design record: programme blocker and attempt gates

**Status: DRAFT, frozen on owner review.** No implementation until the owner confirms this record is frozen.
**Authority:** owner decisions of 2026-11-11 (messages cmsg_01S962nAgzeF44i1MHDz4h1u5rLTADSsBBuq7czRFLpCCe and cmsg_01S962nAgzeF44i1MHDz4h1u7dCwAjPa2AxNQeaxemKukF). Acceptance criteria are those approved on issues #58 and #59, unchanged.

Two separate representations. They share no schema, file or rule.

## FE-27 (#58): the programme's current blocker

- **Where:** a section of `problem.md`, the programme-level problem statement, not the claims ledger and not project policy.
- **Shape:** the blocker is either a single point or a set of points. Both forms are valid.
- **Not imposed:** no ordering, no requirement of exactly one element, no "first unproved bridge" rule. A rule rejecting that form is tested (C3).
- **Fixtures:** one RH-shaped (point) and one PvsNP-shaped (set), both validate; one fixture using the rejected first-unproved-bridge form is rejected.
- **Open for the Worker, not the owner:** exact heading and list syntax, chosen to match how `problem.md` sections are already parsed.

## FE-28 (#59): attempt gates

- **Where:** an attempt-owned record, `artifacts/research-attempts/<attempt-id>/attempt.md`. Not the claims ledger. Not project policy.
- **No claim required.** An attempt may exist and carry gates with no claim attached (C1).
- **Gate content is not fixed by the framework (C2).** There is no built-in gate list. A gate has a free name chosen by the project.
- **Gate states:** exactly `run`, `passed`, `failed`, `unrun`. Mapping: `run` means executed with no verdict yet recorded; `passed` and `failed` are verdicts of an executed gate.
- **Integrity rule (C4):** a gate with state `unrun`, or with no recorded execution evidence, must never be reported or rolled up as passed. `passed` requires a stated evidence reference; `passed` without one is rejected.
- **Expressibility (C3):** RH G1 to G5 and the PvsNP per-iteration checks must both be expressible as named gates. Fixtures for both.
- **Open for the Worker:** exact front-matter or table syntax; whether the detector reads the file through the existing vendored reader.

## Common delivery rules

- Red-first tests per criterion, then fixtures, then a new rule, then a CHANGELOG entry under Unreleased.
- No VERSION change, tag, release, or edit to `design/v1.1-disposition.md` A2 and A3 rows beyond a pointer note.
- #55 to #57, #60, #61 and #64 stay deferred; nothing here implements them.
