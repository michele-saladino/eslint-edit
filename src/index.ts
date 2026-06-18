import path from "node:path";
import type { ESLint, Linter } from "eslint";
import { runEslint } from "./eslint.js";
import { getChangedLines, type FileChange } from "./git.js";

/** Emit a GitHub workflow command so the problem shows up as an inline annotation. */
function annotate(filePath: string, message: Linter.LintMessage) {
  const file = path.relative(process.cwd(), filePath);
  const level = message.severity === 2 ? "error" : "warning";
  const title = message.ruleId ?? "eslint";
  // Escape per GitHub's workflow-command rules.
  const text = message.message
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
  console.log(
    `::${level} file=${file},line=${message.line},col=${message.column},title=${title}::${text}`,
  );
}

async function checkEslintOnChangedLines() {
  let problems: ESLint.LintResult[] = [];
  let changedFiles: FileChange[] = [];
  let newProblems: ESLint.LintResult[] = [];

  try {
    const res = await runEslint();
    problems = res.results.filter((f) => f.errorCount);
  } catch (error) {
    console.error(error);
    return;
  }

  try {
    changedFiles = await getChangedLines();
  } catch (error) {
    console.error(error);
    return;
  }

  // check if any error regards something in the changed lines
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

  console.log(newProblems.length);
}

checkEslintOnChangedLines();
