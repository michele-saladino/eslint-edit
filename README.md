# eslint-pr

Runs ESLint across the whole project, but **only reports problems that fall on lines you changed in a pull request**. New code is held to the linting standard without forcing you to fix pre-existing issues across the codebase.

Each matching problem is printed as a [GitHub workflow annotation](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions), so it shows up inline on the PR diff. The check fails when one or more new problems are found.

## How it works

1. **Lint everything** — runs ESLint over the project using the local `eslint.config.js` ([src/eslint.ts](src/eslint.ts)).
2. **Find changed lines** — runs `git diff --unified=0 base...head` and parses the hunk headers to collect the line numbers added or modified on the PR branch ([src/git.ts](src/git.ts)). The three-dot range mirrors how GitHub computes a PR diff, so commits that landed on the base branch in the meantime are ignored.
3. **Intersect** — keeps only the lint messages whose line falls within the changed lines for that file, emits a `::error::`/`::warning::` annotation for each, and prints the count of files with new problems on the last line of stdout ([src/index.ts](src/index.ts)).

The CI step reads that trailing count and fails the job if it is greater than zero.

## Project layout

| File | Responsibility |
| --- | --- |
| [src/eslint.ts](src/eslint.ts) | Wraps the ESLint API; resolves the project config and runs the lint. |
| [src/git.ts](src/git.ts) | Computes the added/modified lines from the git diff. |
| [src/index.ts](src/index.ts) | Ties the two together and emits GitHub annotations. |
| [eslint.config.js](eslint.config.js) | A strict, type-aware ESLint config (typescript-eslint `strictTypeChecked` + extra hardening rules). |
| [.github/workflows/eslint.yaml](.github/workflows/eslint.yaml) | The CI workflow that builds and runs the check on every PR. |

## Usage

### In CI

The workflow in [.github/workflows/eslint.yaml](.github/workflows/eslint.yaml) runs automatically on every `pull_request`. It checks out the repo with full history (`fetch-depth: 0`, needed for the diff), installs dependencies, builds, then runs the check:

```bash
node dist | tee output.log
count=$(tail -n 1 output.log)   # last line is the number of new problems
[ "$count" -gt 0 ] && exit 1    # fail the job if there are any
```

### Locally

```bash
pnpm install
pnpm dev        # tsc + node dist
```

`pnpm dev` diffs `HEAD` against `origin/main` by default (see `ChangedLinesOptions` in [src/git.ts](src/git.ts)) and prints any new problems plus the trailing count.

Other scripts:

```bash
pnpm lint       # eslint .
pnpm lint:fix   # eslint . --fix
```

## Requirements

- Node.js 24+
- pnpm (`packageManager` is pinned in [package.json](package.json))
- A git checkout with access to the base ref (`origin/main`) for the diff.
