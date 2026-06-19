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

The tool is published as an executable named `eslint-pr`. It emits annotations
to stdout and **exits with code 1 when there are new problems on changed lines**,
so no output parsing is needed — the CI step fails on its own.

```bash
eslint-pr                       # diff origin/<PR base> (or origin/main) against HEAD
eslint-pr --base origin/develop # override the base ref
eslint-pr --head HEAD~1         # override the head ref
```

In GitHub Actions the base ref is read automatically from `GITHUB_BASE_REF`.

### In another repo's workflow

Add `eslint-pr` as a dev dependency (it lints against **that repo's own**
ESLint config — `eslint` is a peer dependency), then run it on pull requests:

```yaml
name: ESLint changed lines
on: pull_request

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # full history is needed for the diff
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx eslint-pr        # fails the job if there are new problems
```

The bundled workflow at [.github/workflows/eslint.yaml](.github/workflows/eslint.yaml) is the equivalent check for this repo itself.

### Locally (developing this package)

```bash
pnpm install
pnpm build      # tsc -> dist
pnpm dev        # build + run against origin/main..HEAD
pnpm test       # vitest run
pnpm lint       # eslint .
pnpm lint:fix   # eslint . --fix
```

## Requirements

- Node.js 18+
- ESLint 9+ in the consuming project (peer dependency), with a flat config
  (`eslint.config.js`) that ESLint can discover from the working directory.
- A git checkout with full history and access to the base ref for the diff
  (`fetch-depth: 0` in GitHub Actions).
