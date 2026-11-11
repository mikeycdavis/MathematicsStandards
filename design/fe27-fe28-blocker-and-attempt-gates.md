# FE-27 / FE-28 design record: programme blocker and attempt gates

**Status: FROZEN 2026-11-11** by owner decision (cmsg_01S962nAgzeF44i1MHDz4h1u65AMEGdGzbCRoCWgVxfadj), with the FE-28 gate-state correction below. Implementation may now proceed.
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
- **Gate states, exactly four:** `unrun`, `executed`, `passed`, `failed`. `executed` means the gate ran but no verdict has been recorded.
- **Evidence rules (C4):** every non-`unrun` state requires execution evidence. `passed` and `failed` additionally require evidence supporting that verdict. Missing execution or verdict evidence must never roll up as passed; a gate that is `unrun`, or lacks the required evidence, is never reported passed.
- **Expressibility (C3):** RH G1 to G5 and the PvsNP per-iteration checks must both be expressible as named gates. Fixtures for both.
- **Open for the Worker:** exact front-matter or table syntax; whether the detector reads the file through the existing vendored reader.

## Common delivery rules

- Red-first tests per criterion, then fixtures, then a new rule, then a CHANGELOG entry under Unreleased.
- No VERSION change, tag, release, or edit to `design/v1.1-disposition.md` A2 and A3 rows beyond a pointer note.
- #55 to #57, #60, #61 and #64 stay deferred; nothing here implements them.

## Clarifications from independent review (fail-closed defaults, no new criteria)

These resolve ambiguity the reviewer found; they add no acceptance criterion and change no approved behaviour.

- **Gap-check precondition met.** Fresh `/ac-gap-check` runs for #58 and #59 were completed after the owner approved the criteria, at main 575d7f1 (evidence-58 and evidence-59, `ac-gap-check/report.md`). Implementation proceeds from those reports.
- **Missing evidence is a validation error, never a downgrade.** A gate in `executed` with no execution evidence, or in `passed`/`failed` without verdict evidence, or in `unrun` with evidence attached, is reported as invalid. It is never reported or counted as `passed`.
- **Attempt roll-up.** An attempt is "all passed" only if it has at least one gate and every gate is `passed` with valid evidence. A zero-gate attempt is reported as having no gates, not as passing.
- **Gate names** are project-defined and must be unique within one attempt.
- **Evidence** is a stated reference (path, URL or commit); free text alone does not count.
- **FE-27 rejected form.** The rejection (C3) is limited to a marker the Worker defines concretely in the design's implementation step and records here before the rule lands; it must not enforce ordering or a single element on a point-or-set blocker. Empty-set and duplicate handling follow the same fail-closed rule: an absent or empty blocker section is valid only as an explicit "none".
- "The detector" means the new rule(s) added to `rules/` and evaluated by `scripts/standards.mjs`.
