# Local Docker CI and verified PR submission

GitHub stays the source-control, pull-request, and review system. What it does **not** do here is
decide whether a branch is fit to be reviewed. That happens on your machine, in a container, before
anything is pushed.

The whole arrangement exists to hold one sentence true:

> **A PR may only be submitted if the exact commit SHA being pushed has successfully passed the
> repository's complete containerized CI pipeline.**

Not "CI passed recently". Not "CI passed on this branch". The commit that arrives on GitHub is the
commit that was built and tested, and three independent mechanisms have to fail before that can stop
being so. They are described under [The exact-commit invariant](#the-exact-commit-invariant).

---

## Prerequisites

| Requirement | Why |
| --- | --- |
| **Docker** (Desktop on Windows, Engine on Linux) | The pipeline runs inside it. This is the only heavy dependency. |
| **Node ≥ 18 on the host** | Runs the two orchestration scripts. The pipeline itself uses the container's Node 20, never yours. |
| **git** | Resolves and exports the commit under verification. |
| **GitHub CLI (`gh`), authenticated** | Only for opening the PR. Optional: without it the branch is still pushed and verified, and you open the PR by hand. |

Nothing else. No SDK, no globally installed toolchain, no database, no service to start, no test
fixture to seed. If the pipeline needs it, it is in the image.

---

## Running local CI

```bash
node scripts/ci.mjs
```

Or, equivalently, through the platform entry point you prefer:

```powershell
.\scripts\ci.ps1
```

```bash
./scripts/ci.sh
```

Both are two-line wrappers around the same script; there is no third implementation hiding behind
either of them. `npm run ci` works too.

| Option | Effect |
| --- | --- |
| `--commit=<sha>` | Verify exactly that commit, exported to a throwaway git worktree. Your working tree takes no part. This is what submission uses. |
| `--with-mutation-check` | Add the mutation checks (see below). |
| `--keep-on-failure` | On failure, leave the container standing and print how to inspect it. |
| `--out=<dir>` | Where the evidence file goes. Default `artifacts/local-ci`. |
| `--verbose` | Echo every docker command and every stage command. |

Exit code is `0` only when every stage passed, `1` when a stage failed, `2` when the environment or
the invocation was wrong — a Docker daemon that is not running is not a test failure and does not
report as one.

**Run with no arguments, it verifies your working tree**, uncommitted edits included, and says so in
the header. That is what you want while iterating. It is *not* what submission does.

---

## Submitting a verified PR

```bash
node scripts/submit-pr.mjs          # or scripts/submit-pr.ps1 / .sh, or npm run submit-pr
```

The intended day-to-day loop is exactly three steps:

```
make changes  →  git commit  →  submit-pr
```

and the command does the rest:

```
verify clean tree → record SHA → run full Docker CI → verify same SHA → push → open PR
```

| Option | Effect |
| --- | --- |
| `--base=<branch>` | PR base. Defaults to the remote's default branch. |
| `--draft` | Open as a draft. |
| `--title=<text>` | PR title. Defaults to the verified commit's subject line. |
| `--body=<text>` / `--body-file=<path>` | Your PR description. The verification block is **appended**, never substituted. |
| `--dry-run` | Run everything including the full pipeline, report what would be pushed, and push nothing. |
| `--keep-on-failure`, `--with-mutation-check` | Passed through to CI. |

It refuses, before running anything, if the tree is dirty, if `HEAD` is detached, or if you are on
the base branch. It refuses, after running, if the pipeline failed, if the evidence file does not
describe this run, or if `HEAD` moved. **It never commits, stages, stashes, or amends anything to
make the pipeline pass**, and it never pushes when verification did not hold.

The two refusals you are most likely to meet:

```
CI failed. No branch was pushed and no PR was created.
```

```
HEAD changed after CI verification. The current commit has not been verified. Re-run CI before submitting.
```

---

## What CI performs

Eight stages, in this order, stopping at the first failure. The order is load-bearing: each gate
assumes the previous one held, so a failure names itself instead of surfacing as a confusing
downstream error.

| # | Stage | What it establishes |
| --- | --- | --- |
| 1 | `inventory` | The standards series has not silently changed shape — nothing renumbered, retitled, dropped, or left unclaimed. |
| 2 | `fidelity` | Every block a standard claims is verbatim source actually is, character for character. |
| 3 | `policy` | This repository's own policy is well-formed and internally consistent. |
| 4 | `diagrams` | Every `.mmd` matches the copy embedded in the documentation. |
| 5 | `assurance-report` | The committed assurance report matches the catalog it is generated from. |
| 6 | `tests` | The full suite — unit, fixture, self-audit, and every detector asserted in both directions. |
| 7 | `audit` | Evidence discovery. Deliberately **not** `--strict`; see below. |
| 8 | `validate` | The verdict. This is the gate. |

`audit` is not run with `--strict` here, and that is inherited from the original workflow rather than
a relaxation introduced by it. The error gate is the self-audit assertion inside `test/audit.test.mjs`,
which knows which findings this repository's policy has already answered. Gating on `--strict` would
fail the build for the missing claims ledger that the policy correctly declares not-applicable.

**One optional stage**, off by default:

```bash
node scripts/ci.mjs --with-mutation-check
```

`mutation-check` reintroduces the defect each gate exists to catch and confirms the gate fails. It is
excluded from `npm test` because it writes to tracked files. Inside the container that objection
disappears — the tree it mutates is a disposable copy that dies with the run — but it stays opt-in,
because silently promoting it would change what "CI passed" means for every branch without anyone
deciding to.

### One definition, two executors

The stage list lives in [`scripts/ci-stages.mjs`](../scripts/ci-stages.mjs) and nowhere else.

```
                    scripts/ci-stages.mjs
                   (the authoritative list)
                              |
                    scripts/run-stages.mjs
                     (executes it, in order)
                        /            \
                       /              \
              scripts/ci.mjs      .github/workflows/ci.yml
            (container, local)     (GitHub-hosted, optional)
```

The workflow used to name all eight commands itself. It no longer does — it invokes
`run-stages.mjs`, the same script the container runs. `test/local-ci.test.mjs` fails if a gate
command reappears as its own `run:` line, because two copies of a pipeline agree only until someone
edits one of them.

Adding a self-hosted runner later needs no redesign: it would run `./scripts/ci.sh`, which gives it
the container boundary as well as the stage list. Nothing in `ci.mjs`, `compose.ci.yml`, or
`Dockerfile.ci` assumes a developer's machine.

---

## Container and database isolation

**There is no database, and none was invented.** This repository's entire state is files in git — a
markdown claims ledger, a JSON rule catalog, a YAML policy — and every check is a pure function of
the tree. Standing up a database server to satisfy the shape of a CI template would have meant
creating a dependency in order to isolate it. Your local SQL Server, and any database on this
machine, is untouched by every command described here, because nothing in the pipeline can open a
socket at all.

`compose.ci.yml` documents where a database service *would* attach for a sibling repository that
needs one, and `scripts/ci.mjs` already implements the waiting: it reads the compose file, finds
every service that is not `ci`, and brings them up with `--wait`, which blocks on each declared
healthcheck and never on a timer.

What the boundary is made of:

| Mechanism | Effect |
| --- | --- |
| `network_mode: none` | The pipeline cannot reach the network at all. Not hardening theatre — an assertion that this repository has zero runtime dependencies, enforced the same way the absent `npm ci` enforces it. |
| Source **copied**, not bind-mounted | The image is a sealed snapshot of one tree. Nothing the run does can reach your checkout, which is what makes `--with-mutation-check` safe to offer. |
| `read_only: true` + `tmpfs /tmp` | The only writable path is scratch, which the init and policy tests need. An accidental write to the source copy fails loudly. |
| Single bind: `→ /ci-out` | The one place host and container meet. It receives the evidence file and nothing else. |
| Non-root (`USER node`) | CI is untrusted code execution by policy — it runs whatever the branch says. |
| No Docker socket | Handing the daemon to test code hands it the host. |
| Unique compose project per run | `mathstd-ci-<random>`. Two branches, two terminals, or two repositories can run at once without sharing a container, network, image, or volume. |
| Base image pinned by digest | `node:20.19-alpine@sha256:…`. A moving tag cannot answer "why did this commit pass on Tuesday and fail on Thursday". |

No token, credential, or secret is read, written, mounted, or baked into the image. `gh` uses your
existing authenticated session, and it runs on the host — never in the container, which could not
reach GitHub even if it tried.

---

## Cleanup, and debugging a failure

Teardown runs in a `finally` block, so it happens whether the pipeline passed, failed, or threw:

```
docker compose -f compose.ci.yml -p mathstd-ci-<id> down --volumes --remove-orphans --rmi local
```

Every name in that command belongs to the unique project this run created, which is what makes a
blunt teardown safe — it cannot reach a container, volume, network, or image you did not get from
this run. `--rmi local` matters: with a unique project name per run, omitting it would leave one
image behind every time. The throwaway git worktree is removed in the same block.

To inspect a failure instead:

```bash
node scripts/ci.mjs --keep-on-failure
```

The container is left in place — `run --rm` is dropped, because deleting the container the instant
it exits is exactly wrong when the reason you want it is that it failed — and the exact commands to
inspect it are printed, including how to get a shell inside it and how to clean it up when you are
done.

To see what is running underneath, add `--verbose`.

---

## Verification evidence

Every run writes `artifacts/local-ci/latest.json`, on failure as well as success — a record that only
exists when things went well cannot be used to find out what went wrong.

```json
{
  "commit": "fca046148aff1c7193a39f6ba8e549b73456b009",
  "branch": "local-docker-ci",
  "result": "passed",
  "environment": "docker",
  "startedAt": "2026-08-15T23:49:07.506Z",
  "completedAt": "2026-08-15T23:49:26.202Z",
  "checks": ["inventory", "fidelity", "policy", "diagrams", "assurance-report", "tests", "audit", "validate"],
  "failedStage": null,
  "stages": [ { "id": "inventory", "result": "passed", "exitCode": 0, "durationMs": 611 } ]
}
```

**It is not committed** (`.gitignore`), and the distinction is deliberate. This repository does
retain evidence on purpose — the assurance report is generated and committed, backlog items carry
commit SHAs — but that is evidence about the standards, reviewed when it changes. A verification
receipt is about one run, on one machine, at one moment. Committing it would put a file in history
that says PASS for a commit that no longer exists, and make every branch conflict on it. The durable
record of a verified submission is the PR body.

---

## Local CI is not GitHub Actions

These are two different things and the tooling never blurs them.

|  | Local Docker CI | GitHub Actions |
| --- | --- | --- |
| Runs | Before the push, on your machine | After the push, on GitHub's |
| Isolation | Container, no network, disposable | GitHub-hosted runner |
| Is it the PR gate? | **Yes** | No — a second opinion on neutral hardware |
| Required to be working? | Yes | No |

The PR body says *Local CI*, names Docker, and states in as many words that it is **not** a GitHub
Actions result. It never reports that hosted CI passed, because this workflow cannot know that.

**As of this writing, GitHub-hosted Actions on this repository have never executed a single job.**
Every run since the account's billing gate closed has failed at "The job was not started because
recent account payments have failed or your spending limit needs to be increased" — before reaching
any step. That is the concrete reason the two are kept independent: local CI shares no infrastructure
with the workflow, only the stage list, and works exactly the same whether hosted Actions are
enabled, disabled, or unpaid.

It is also how a real defect went unnoticed. `npm test` was written as `node --test "test/*.test.mjs"`;
the quotes stop the shell expanding the glob, and Node only learned to expand it itself in v21.
Developers here run Node 24, so it worked locally, while the workflow pinned Node 20, where it does
not. The first container run found it in about ninety seconds. It is fixed, and
`test/local-ci.test.mjs` now pins the unquoted form.

---

## The exact-commit invariant

```
        clean tree?  ──no──▶  refuse (never commits for you)
              │yes
              ▼
     verified := git rev-parse HEAD
              │
              ▼
   git worktree add --detach <tmp> $verified     ← the image is built from THIS, not your checkout
              │
              ▼
        full Docker pipeline
              │
        ┌─────┴─────┐
      fail         pass
        │            │
        ▼            ▼
   refuse       current := git rev-parse HEAD
                     │
          verified == current ?  ──no──▶  refuse
                     │yes
                     ▼
   git push origin $verified:refs/heads/<branch>  ← the SHA by name, not HEAD
                     │
                     ▼
                gh pr create
```

Three independent mechanisms, any one of which would have to fail on its own:

1. **The clean-tree check**, so the commit and the tree are the same thing.
2. **The before/after SHA comparison**, so a commit, amend, or rebase during the run is caught.
3. **The explicit SHA in the refspec.** Even if the comparison were somehow wrong, the object pushed
   is still the object that was built. `git push origin HEAD` would push whatever HEAD had become;
   naming the SHA makes the push incapable of carrying anything else.

There is also a fourth, quieter one: the image is built from a git worktree exported at the verified
SHA, so the pipeline never sees your working directory. Even an uncommitted edit made *while the
container is running* cannot enter the result.

The comparison itself is tested directly in `test/local-ci.test.mjs`, rather than demonstrated by
rewriting history and watching what happens. Proving a safety check by performing the dangerous
operation tests the same logic while putting the thing it protects at risk.

---

## Reusing this in another repository

Six files carry the pattern, and only two of them know anything about this repository:

| File | Repository-specific? |
| --- | --- |
| `scripts/ci.mjs` | No — orchestration only |
| `scripts/run-stages.mjs` | No — takes a stage list, runs it, writes a receipt |
| `scripts/submit-pr.mjs` | No — the invariant, plus `gh` |
| `scripts/ci-stages.mjs` | **Yes** — this is the list of checks |
| `Dockerfile.ci` | **Mostly** — base image and whether an install step is needed |
| `compose.ci.yml` | Only if services are added |

Porting it is: copy the four scripts unchanged, rewrite `ci-stages.mjs` with that repository's npm
scripts, adjust the base image, and add services to `compose.ci.yml` if there are any. The dependency
waiting, the unique project naming, the teardown, the evidence file, and the SHA invariant all come
along without modification.
