import { describe, expect, it } from "vitest";
import { errorDetails, pathWithoutQuery } from "./server";

describe("structured error logging", () => {
  it("serializes Error details and Next.js digests", () => {
    const error = Object.assign(new Error("database unavailable"), { digest: "next-digest" });
    expect(errorDetails(error)).toMatchObject({
      name: "Error",
      message: "database unavailable",
      digest: "next-digest",
    });
  });

  it("removes queries and fragments from logged paths", () => {
    expect(pathWithoutQuery("/callback?token=secret#result")).toBe("/callback");
  });

  it("handles values thrown without an Error instance", () => {
    expect(errorDetails("failure")).toEqual({ name: "NonErrorThrown", message: "failure" });
  });
});
