import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import { resources } from "./resources";
import { commands } from "../features/generator/catalog/commands";

async function createTranslator(locale: "de" | "en") {
  const instance = createInstance();
  await instance.init({
    resources,
    lng: locale,
    fallbackLng: "de",
    keySeparator: false,
    initAsync: false,
  });
  return instance;
}

describe("i18n resources", () => {
  it("uses German source copy as the German fallback", async () => {
    const i18n = await createTranslator("de");
    expect(i18n.t("Maus-Sensitivität")).toBe("Maus-Sensitivität");
    expect(i18n.t("entriesActive", { count: 12 })).toBe("12 Einträge aktiv");
  });

  it("translates catalog copy and pluralized UI text to English", async () => {
    const i18n = await createTranslator("en");
    expect(i18n.t("Maus-Sensitivität")).toBe("Mouse sensitivity");
    expect(i18n.t("Grundlegende Empfindlichkeit der Maus im Spiel.")).toBe("Base in-game mouse sensitivity.");
    expect(i18n.t("conflictCount", { count: 2 })).toBe("2 key conflicts found.");
    expect(i18n.t("Erfordert Cheats")).toBe("Requires cheats");
    expect(i18n.t("Rundenzeit auf Defuse-Maps")).toBe("Round time on defuse maps");
  });

  it("translates the account data copy, including server-side error strings", async () => {
    const i18n = await createTranslator("en");
    expect(i18n.t("Account endgültig löschen")).toBe("Delete account permanently");
    expect(i18n.t("Daten exportieren")).toBe("Export data");
    expect(i18n.t("Passwort ist nicht korrekt.")).toBe("Password is incorrect.");
  });

  it("has English copy for every command label, description, and option", () => {
    const english = resources.en.translation;
    const hasTranslation = (key: string) => Object.prototype.hasOwnProperty.call(english, key);
    const missing = new Set<string>();

    for (const command of commands) {
      if (!hasTranslation(command.label)) missing.add(command.label);
      if (!hasTranslation(command.description)) missing.add(command.description);
      for (const option of command.options ?? []) {
        if (!hasTranslation(option.label)) missing.add(option.label);
      }
    }

    expect([...missing]).toEqual([]);
  });
});
