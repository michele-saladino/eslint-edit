import type { ChangedLinesOptions } from "./git.js";

/**
 * Resolves which refs to diff from CLI args and environment.
 *
 * In GitHub Actions the PR's target branch is exposed via `GITHUB_BASE_REF`;
 * locally we fall back to `origin/main`. Override with `--base <ref>` /
 * `--head <ref>` (or `--base=<ref>` / `--head=<ref>`).
 */
export function resolveRefs(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): Required<Pick<ChangedLinesOptions, "base" | "head">> {
  let base: string | undefined;
  let head: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--base") {
      base = argv[++i];
    } else if (arg === "--head") {
      head = argv[++i];
    } else if (arg.startsWith("--base=")) {
      base = arg.slice("--base=".length);
    } else if (arg.startsWith("--head=")) {
      head = arg.slice("--head=".length);
    }
  }

  const baseRef = env.GITHUB_BASE_REF;
  base ??=
    baseRef !== undefined && baseRef !== ""
      ? `origin/${baseRef}`
      : "origin/main";

  return { base, head: head ?? "HEAD" };
}
