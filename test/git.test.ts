import { describe, expect, it } from "vitest";
import { parseDiff } from "../src/git";

describe("parseDiff", () => {
  it("returns no changes for an empty diff", () => {
    expect(parseDiff("")).toEqual([]);
  });

  it("collects added line numbers from a single hunk", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,0 +2,3 @@",
      "+const a = 1;",
      "+const b = 2;",
      "+const c = 3;",
    ].join("\n");

    expect(parseDiff(diff)).toEqual([
      { file: "src/a.ts", lines: [2, 3, 4] },
    ]);
  });

  it("strips the `b/` prefix from the file path", () => {
    const diff = ["+++ b/deep/nested/file.ts", "@@ -0,0 +1 @@", "+x"].join(
      "\n",
    );
    expect(parseDiff(diff)).toEqual([
      { file: "deep/nested/file.ts", lines: [1] },
    ]);
  });

  it("treats a hunk header without a count as a single line", () => {
    const diff = ["+++ b/a.ts", "@@ -5 +5 @@", "+changed"].join("\n");
    expect(parseDiff(diff)).toEqual([{ file: "a.ts", lines: [5] }]);
  });

  it("ignores removed lines and context, counting only additions", () => {
    const diff = [
      "+++ b/a.ts",
      "@@ -10,2 +10,2 @@",
      "-old line",
      "+new line",
    ].join("\n");
    expect(parseDiff(diff)).toEqual([{ file: "a.ts", lines: [10] }]);
  });

  it("skips deleted files (+++ /dev/null)", () => {
    const diff = [
      "--- a/gone.ts",
      "+++ /dev/null",
      "@@ -1,2 +0,0 @@",
      "-was here",
      "-and here",
    ].join("\n");
    expect(parseDiff(diff)).toEqual([]);
  });

  it("drops files that end up with no added lines", () => {
    const diff = [
      "+++ b/onlyremovals.ts",
      "@@ -1,2 +0,0 @@",
      "-removed",
      "-removed too",
    ].join("\n");
    expect(parseDiff(diff)).toEqual([]);
  });

  it("handles multiple hunks within one file", () => {
    const diff = [
      "+++ b/a.ts",
      "@@ -1,0 +1 @@",
      "+first",
      "@@ -10,0 +20,2 @@",
      "+second",
      "+third",
    ].join("\n");
    expect(parseDiff(diff)).toEqual([{ file: "a.ts", lines: [1, 20, 21] }]);
  });

  it("handles multiple files in one diff", () => {
    const diff = [
      "+++ b/a.ts",
      "@@ -0,0 +1 @@",
      "+a",
      "diff --git a/b.ts b/b.ts",
      "+++ b/b.ts",
      "@@ -0,0 +3,2 @@",
      "+b1",
      "+b2",
    ].join("\n");
    expect(parseDiff(diff)).toEqual([
      { file: "a.ts", lines: [1] },
      { file: "b.ts", lines: [3, 4] },
    ]);
  });

  it("does not count additions beyond the hunk's stated length", () => {
    // Hunk claims 1 added line; a stray `+` afterward must not be attributed.
    const diff = [
      "+++ b/a.ts",
      "@@ -1,0 +1 @@",
      "+real",
      "+++ b/b.ts",
      "@@ -1,0 +1 @@",
      "+real-b",
    ].join("\n");
    expect(parseDiff(diff)).toEqual([
      { file: "a.ts", lines: [1] },
      { file: "b.ts", lines: [1] },
    ]);
  });
});
