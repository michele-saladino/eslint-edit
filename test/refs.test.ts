import { describe, expect, it } from "vitest";
import { resolveRefs } from "../src/refs";

describe("resolveRefs", () => {
  it("defaults to origin/main..HEAD with no args or env", () => {
    expect(resolveRefs([], {})).toEqual({ base: "origin/main", head: "HEAD" });
  });

  it("uses GITHUB_BASE_REF when present", () => {
    expect(resolveRefs([], { GITHUB_BASE_REF: "develop" })).toEqual({
      base: "origin/develop",
      head: "HEAD",
    });
  });

  it("ignores an empty GITHUB_BASE_REF", () => {
    expect(resolveRefs([], { GITHUB_BASE_REF: "" })).toEqual({
      base: "origin/main",
      head: "HEAD",
    });
  });

  it("accepts --base and --head as separate args", () => {
    expect(resolveRefs(["--base", "origin/dev", "--head", "feature"])).toEqual({
      base: "origin/dev",
      head: "feature",
    });
  });

  it("accepts the --base=<ref> / --head=<ref> form", () => {
    expect(resolveRefs(["--base=origin/dev", "--head=feature"])).toEqual({
      base: "origin/dev",
      head: "feature",
    });
  });

  it("lets CLI args override GITHUB_BASE_REF", () => {
    expect(
      resolveRefs(["--base", "origin/release"], { GITHUB_BASE_REF: "develop" }),
    ).toEqual({ base: "origin/release", head: "HEAD" });
  });

  it("ignores unknown arguments", () => {
    expect(resolveRefs(["--verbose", "--base", "origin/x"])).toEqual({
      base: "origin/x",
      head: "HEAD",
    });
  });
});
