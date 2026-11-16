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
- **`executed` carries execution evidence only.** A gate in `executed` that carries verdict evidence is invalid; the author must record `passed` or `failed` instead.
- **Gate names** are project-defined and must be unique within one attempt.
- **Evidence** is a stated reference (path, URL or commit); free text alone does not count.
- **FE-27 rejected form.** The rejection (C3) is limited to a marker the Worker defines concretely in the design's implementation step and records here before the rule lands; it must not enforce ordering or a single element on a point-or-set blocker. Empty-set and duplicate handling follow the same fail-closed rule: an absent or empty blocker section is valid only as an explicit "none".
- "The detector" means the new rule(s) added to `rules/` and evaluated by `scripts/standards.mjs`.

## Implementation clarifications (Worker, recorded before the rules landed)

These settle the points the design left "open for the Worker". They add no acceptance criterion.

### FE-27 (#58): syntax, rejected-form marker, rule

- **Where and heading.** A `## Current Blocker` section of `artifacts/open-problems/<slug>/problem.md`,
  read with the same heading convention as the nine existing sections (`## ` heading, body up to the
  next `## `). It is **not** added to the nine required sections of Standard 17 R1; a new required
  section would reclassify every adopter's record.
- **Valid bodies, exactly two forms.**
  1. **A point or a set:** one or more list items (`-`, `*`, `+`, or `1.`/`1)`). One item is a point,
     two or more are a set. Order carries no meaning and is never read; a numbered list is accepted
     and its numerals are ignored. Nothing requires exactly one element.
  2. **An explicit none:** a body whose first non-blank line begins with the word `none`
     (case-insensitive), optionally followed by an explanation.
- **Fail closed.** An absent section, an empty section, a body that is neither list nor `none`, a list
  whose items repeat after trimming and case-folding, and an empty list item are each reported.
  Absence is never read as `none`.
- **The concrete rejected-form marker.** The first-unproved-bridge form is rejected **only** when a line
  inside the `## Current Blocker` section carries the *label* `First unproved bridge`. The label is the
  text before the first `:` on the line, after removing a leading list bullet or number, the emphasis
  characters `*` and `_`, and backticks, then lower-casing and treating every run of non-alphanumeric
  characters as one space. Examples: `First unproved bridge: C3` and `- **First-unproved-bridge**: C3`.
  The phrase appearing inside a point's prose, or in another section of the file, is not the marker.
  The rejection does not inspect cardinality or order of anything: a one-item list, a many-item list and
  a reordered list are all valid, and a one-item list is rejected only if it carries the marker.
- **Rule.** `problems.blocker-named`, Standard 17, category `problems`, `recommended`, `warning`,
  `structural`, assurance `partial`. Subject surface `open-problems`; with no problem record the rule
  reports `not-evaluated` rather than passing.
- **What it does not establish.** That the named blocker is the true blocker, that it is current, or that
  it is not a first-unproved-bridge in disguise written without the marker.

### FE-28 (#59): syntax, evidence reference, rules

- **File.** `artifacts/research-attempts/<attempt-id>/attempt.md`. The id is the directory name. The
  file has no required claim field; none is read.
- **Gates.** A `## Gates` section whose `### <gate name>` subsections are the gates. The name is free text
  chosen by the project and must be unique within the attempt (compared trimmed and case-folded). Inside
  a gate, line-oriented fields in the style of `Status:` / `Evidence required to reopen:` under Standard 17:
  `State:` (exactly `unrun`, `executed`, `passed`, `failed`), `Execution evidence:`, `Verdict evidence:`.
  The framework ships no gate names, no gate list and no gate count.
- **The vendored YAML reader is not used.** `attempt.md` is Markdown, like `problem.md`; the YAML reader
  (`scripts/yaml.mjs`) reads policy only.
- **Evidence reference.** A field value counts as a stated reference only if it contains at least one of:
  an `http://` or `https://` URL; a path-shaped token (a `/`, or a file extension that starts with a letter,
  such as `notes.md`); or a commit written `commit <sha>` or `commit: <sha>` with 7 to 40 hex digits (bare
  hex is not accepted, because ordinary words such as "defaced" are valid hex). Free text alone does not
  count. The reference is **not resolved**: that a cited path exists or a commit is real is not checked.
- **Per-state rules** (each violation is a validation error, never a downgrade):
  `unrun`: no execution or verdict evidence. `executed`: a reference in `Execution evidence:` and no
  `Verdict evidence:`. `passed` and `failed`: references in both. A missing or unknown `State:`, a
  repeated field, and a duplicate gate name are also errors.
- **Reporting.** A gate with any error is reported as `invalid`, never as its declared state and never as
  `passed`. The audit output lists, per attempt, the count of gates by reported state and a roll-up:
  `no gates` (zero gates, not "passed"), `all passed` (at least one gate, every gate `passed`, no errors),
  or `not all passed`. An `unrun` gate is shown as `unrun`.
- **Rule.** `lifecycle.attempt-gates-valid`, Standard 18, category `lifecycle`, `recommended`, `warning`,
  `structural`, assurance `partial`. Subject surface `research-attempts`; with no attempt record it
  reports `not-evaluated`.
- **What it does not establish.** That a gate was in fact run, that a cited reference exists, or that a
  verdict is correct. The framework checks that the record is complete enough not to be mistaken for a pass.

### Versioning note

`introducedIn` on both rules is `"3.2.0"`, written while this work is prepared and not assigned, as the
3.1.0 precedent did. No `VERSION` change is made here; classification and release stay owner-held.
