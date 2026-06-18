import { ESLint } from "eslint";

export interface RunEslintOptions {
  /**
   * Glob patterns (or file/directory paths) to lint.
   * Defaults to the current working directory.
   */
  patterns?: string[];
  /**
   * Directory to resolve the ESLint config from. Defaults to `process.cwd()`.
   * ESLint automatically discovers the project's config file (e.g.
   * `eslint.config.js`/`.ts`/`.mjs`) starting from this directory.
   */
  cwd?: string;
  /**
   * Apply auto-fixes to the linted files. Defaults to `false`.
   */
  fix?: boolean;
}

export interface RunEslintResult {
  results: ESLint.LintResult[];
  /** Human-readable report produced by the "stylish" formatter. */
  output: string;
  errorCount: number;
  warningCount: number;
}

/**
 * Runs ESLint over the given patterns using the ESLint config file present in
 * the project. The config is resolved automatically by ESLint from `cwd`.
 */
export async function runEslint(
  options: RunEslintOptions = {},
): Promise<RunEslintResult> {
  const { patterns = ["."], cwd = process.cwd(), fix = false } = options;

  const eslint = new ESLint({ cwd, fix });

  const results = await eslint.lintFiles(patterns);

  if (fix) {
    await ESLint.outputFixes(results);
  }

  const formatter = await eslint.loadFormatter("stylish");
  const output = await formatter.format(results);

  let errorCount = 0;
  let warningCount = 0;
  for (const result of results) {
    errorCount += result.errorCount;
    warningCount += result.warningCount;
  }

  return { results, output, errorCount, warningCount };
}
