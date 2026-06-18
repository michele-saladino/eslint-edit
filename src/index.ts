import type { ESLint } from "eslint";
import { runEslint } from "./eslint.js";
import { getChangedLines, type FileChange } from "./git.js";

async function checkEslintOnChangedLines() {
  let problems: ESLint.LintResult[] = [];
  let changedFiles: FileChange[] = [];
  let newProblems: ESLint.LintResult[] = [];

  try {
    const res = await runEslint();
    problems = res.results;
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
    const changedFile = changedFiles.find((c) => c.file === problem.filePath);

    if (changedFile) {
      const problemMatch = problem.messages.some((p) =>
        changedFile.lines.includes(p.line),
      );
      if (problemMatch) {
        newProblems.push(problem);
      }
    }
  }

  console.log(newProblems);
}

checkEslintOnChangedLines();
