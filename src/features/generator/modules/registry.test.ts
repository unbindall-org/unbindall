import { describe, expect, it } from "vitest";
import { createDefaultDocument } from "../domain/document";
import { generatorModules, moduleDocumentItemCount } from "./registry";

function moduleById(id: (typeof generatorModules)[number]["id"]) {
  const generatorModule = generatorModules.find((item) => item.id === id);
  if (!generatorModule) throw new Error(`Missing module: ${id}`);
  return generatorModule;
}

describe("moduleDocumentItemCount", () => {
  it("counts only config parts that are enabled in the overview", () => {
    const document = createDefaultDocument();

    expect(moduleDocumentItemCount(moduleById("mouse"), document, true)).toBe(2);
    expect(moduleDocumentItemCount(moduleById("multi-binds"), document, true)).toBe(0);
    expect(moduleDocumentItemCount(moduleById("custom-binds"), document, true)).toBe(0);
    expect(moduleDocumentItemCount(moduleById("binds"), document, true)).toBeGreaterThan(0);
  });

  it("keeps disabled parts available inside their editor module", () => {
    const document = createDefaultDocument();

    expect(moduleDocumentItemCount(moduleById("mouse"), document)).toBe(3);
    expect(moduleDocumentItemCount(moduleById("multi-binds"), document)).toBe(1);
  });
});
