import { expect, test } from "@playwright/test";

test("registriert sich, speichert eine Config, meldet sich ab und wieder an", async ({ page }) => {
  const email = `browser-${Date.now()}@example.com`;
  const password = "browser-secret-123";

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Deine aktuelle Config." })).toBeVisible();
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();

  const accountDialog = page.getByRole("dialog");
  await accountDialog.getByRole("tab", { name: "Registrieren" }).click();
  await accountDialog.getByLabel("Name").fill("Browser User");
  await accountDialog.getByLabel("E-Mail").fill(email);
  await accountDialog.getByLabel("Passwort").fill(password);
  await accountDialog.getByRole("button", { name: "Account erstellen" }).click();

  await expect(page.getByText(email, { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Browser User/ }).click();
  await page.getByRole("menuitem", { name: "Abmelden" }).click();
  await expect(page.getByRole("button", { name: "Anmelden", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await accountDialog.getByLabel("E-Mail").fill(email);
  await accountDialog.getByLabel("Passwort").fill(password);
  await accountDialog.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const saveDialog = page.getByRole("dialog").filter({ hasText: "Config speichern" });
  await saveDialog.getByLabel("Name").fill("Browser Config");
  await saveDialog.getByRole("button", { name: "Neue Config speichern" }).click();
  await expect(page.getByText("Config im Account gespeichert.")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Aktive Config auswählen" })).toContainText("Browser Config");
});
