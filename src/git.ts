import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ChangedLinesOptions {
  /**
   * The base ref to diff against (e.g. the PR's target branch such as
   * `origin/main`). Defaults to `"origin/main"`.
   */
  base?: string;
  /**
   * The head ref of the PR. Defaults to `"HEAD"`.
   */
  head?: string;
  /**
   * Directory to run git in. Defaults to `process.cwd()`.
   */
  cwd?: string;
}

/**
 * The set of added/modified line numbers (on the new side of the diff) for a
 * single file in a PR.
 */
export interface FileChange {
  /** Path of the file, relative to the repository root. */
  file: string;
  /** Line numbers (1-based) that were added or modified in the PR. */
  lines: number[];
}

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

/**
 * Returns the lines that differ in a PR, i.e. the lines that were added or
 * modified between `base` and `head`.
 *
 * Uses the three-dot range (`base...head`) so that only changes introduced on
 * the PR branch are reported, ignoring commits that landed on the base branch
 * in the meantime — matching how GitHub computes a PR diff.
 */
export async function getChangedLines(
  options: ChangedLinesOptions = {},
): Promise<FileChange[]> {
  const { base = "origin/main", head = "HEAD", cwd = process.cwd() } = options;

  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--unified=0", "--no-color", `${base}...${head}`],
    { cwd, maxBuffer: 1024 * 1024 * 100 },
  );

  return parseDiff(stdout);
}

/**
 * Parses the output of `git diff --unified=0` into a list of changed files and
 * the line numbers added/modified in each. Exported for testing.
 */
export function parseDiff(diff: string): FileChange[] {
  const changes: FileChange[] = [];
  let current: FileChange | undefined;
  let newLine = 0;
  let remaining = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      // `+++ b/path/to/file` — strip the `b/` prefix git adds.
      const path = line.slice(4).replace(/^b\//, "");
      if (path === "/dev/null") {
        // File was deleted; no lines to lint.
        current = undefined;
        continue;
      }
      current = { file: path, lines: [] };
      changes.push(current);
      continue;
    }

    const hunk = HUNK_HEADER.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      remaining = hunk[2] === undefined ? 1 : Number(hunk[2]);
      continue;
    }

    if (current && remaining > 0 && line.startsWith("+")) {
      current.lines.push(newLine);
      newLine += 1;
      remaining -= 1;
    }
  }

  return changes.filter((change) => change.lines.length > 0);
}
