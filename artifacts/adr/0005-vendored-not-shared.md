# ADR 0005 — The toolchain is vendored, and the assurance report is generated

Status: accepted, 2026-08-09

## Context

Two decisions that look unrelated and share a reason.

The charter requires that this repository be independently maintained and **not depend on any other
standards repository**. Roughly two thirds of a standards toolchain is domain-agnostic — a YAML
subset parser, a JSON Schema evaluator, a rule-catalog loader, a compliance engine, a bootstrap
command with a create/overwrite/conflict contract, a diagram freshness checker. A working
implementation of all of it exists in a sibling repository.

Separately, the source prompt closes by requiring a report on exactly what the standards can prevent
from being overstated and what still requires expert judgement.

## Decision 1 — Vendor the machinery, do not share it

The domain-agnostic files were copied in and are maintained here. There is no package dependency, no
git submodule, no path reference, and no shared registry. `scripts/compliance.mjs`,
`scripts/policy.mjs`, and `scripts/init.mjs` have since diverged.

**A shared package was rejected** because it would make this repository's guarantees contingent on
another repository's release schedule, and because "independently maintained" is not satisfied by a
dependency that happens to be stable today.

The cost is real and worth stating: a fix to the YAML parser here does not reach the sibling
repositories, and five copies of a subtle parser is five places for the same bug. That cost was
accepted in exchange for independence, which the charter treats as a requirement rather than a
preference. Each vendored file keeps the comments explaining why its guards exist, because those
comments are the reason the copy is worth having.

## Decision 2 — The assurance report is generated, never written

`docs/assurance-report.md` is produced by `scripts/assurance.mjs` from `rules/*.json`: rules are
partitioned by their `assurance` field, each rule's `$assuranceNote` is quoted verbatim, and the
coverage figures are computed.

**A hand-written report was rejected.** It would be a claim about the tooling maintained separately
from the tooling, and it would drift — in the flattering direction, because nobody remembers to
downgrade a capability claim after weakening a check. Generating it from the same JSON the validator
consumes makes drift impossible rather than unlikely. `npm run assurance -- --check` fails when the
committed report is stale, and a test runs it.

## Consequences

Every count in this repository's documentation is either computed at run time or asserted by a test.
No number describing coverage, rule totals, or detector counts is written into prose — a
hand-maintained count is a fact about someone's memory, and the first thing that goes stale.
