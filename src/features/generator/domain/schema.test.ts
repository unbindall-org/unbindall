import { describe, expect, it } from "vitest";
import { createDefaultDocument } from "./document";
import { generatorDocumentSchema, maxCommandValues } from "./schema";

describe("generator document resource bounds", () => {
  it("rejects an unbounded commandValues object", () => {
    const document = createDefaultDocument();
    document.commandValues = Object.fromEntries(
      Array.from({ length: maxCommandValues + 1 }, (_, index) => [`command-${index}`, index]),
    );
    expect(generatorDocumentSchema.safeParse(document).success).toBe(false);
  });
});

