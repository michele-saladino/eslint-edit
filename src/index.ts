#!/usr/bin/env node
import path from "node:path";
import type { ESLint, Linter } from "eslint";
import { runEslint } from "./eslint.js";
import { getChangedLines, type FileChange } from "./git.js";
import { resolveRefs } from "./refs.js";

/** Emit a GitHub workflow command so the problem shows up as an inline annotation. */
function annotate(filePath: string, message: Linter.LintMessage): void {
  const file = path.relative(process.cwd(), filePath);
  const level = message.severity === 2 ? "error" : "warning";
  const title = message.ruleId ?? "eslint";
  // Escape per GitHub's workflow-command rules.
  const text = message.message
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
  console.log(
    `::${level} file=${file},line=${String(message.line)},col=${String(message.column)},title=${title}::${text}`,
  );
}

async function checkEslintOnChangedLines(): Promise<number> {
  const { base, head } = resolveRefs(process.argv.slice(2));

  let problems: ESLint.LintResult[];
  let changedFiles: FileChange[];

  try {
    const res = await runEslint();
    problems = res.results.filter((f) => f.errorCount > 0);
  } catch (error) {
    console.error(error);
    return 1;
  }

  try {
    changedFiles = await getChangedLines({ base, head });
  } catch (error) {
    console.error(error);
    return 1;
  }

  const newProblems: ESLint.LintResult[] = [];

  // Keep only the problems that fall on lines changed in this PR.
  for (const problem of problems) {
    const changedFile = changedFiles.find((c) =>
      problem.filePath.endsWith(c.file),
    );

    if (changedFile) {
      const matchingMessages = problem.messages.filter((p) =>
        changedFile.lines.includes(p.line),
      );
      if (matchingMessages.length > 0) {
        for (const message of matchingMessages) {
          annotate(problem.filePath, message);
        }
        newProblems.push(problem);
      }
    }
  }

  if (newProblems.length > 0) {
    console.log(
      `::error::Found new lint problem(s) on changed lines in ${String(newProblems.length)} file(s)`,
    );
  } else {
    console.log("No new lint problems on changed lines.");
  }

  return newProblems.length > 0 ? 1 : 0;
}

checkEslintOnChangedLines()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
