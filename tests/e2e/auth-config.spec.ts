import { expect, test } from "@playwright/test";

test("registriert sich, übernimmt eine lokale Config und lädt sie nach erneutem Login", async ({ page }) => {
  const email = `browser-${Date.now()}@example.com`;
  const password = "browser-secret-123";

  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Config-Name" })).toHaveValue("Meine Matchmaking Config");
  await page.getByLabel("Anmelden", { exact: true }).click();

  const accountDialog = page.getByRole("dialog");
  await accountDialog.getByRole("tab", { name: "Registrieren" }).click();
  await accountDialog.getByLabel("Name").fill("Browser User");
  await accountDialog.getByLabel("E-Mail").fill(email);
  await accountDialog.getByLabel("Passwort").fill(password);
  await accountDialog.getByRole("button", { name: "Account erstellen" }).click();

  await expect(page.getByRole("button", { name: "Benutzermenü: Browser User" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Benutzermenü: Browser User" }).click();
  await page.getByRole("menuitem", { name: "Abmelden" }).click();
  await expect(page.getByLabel("Anmelden", { exact: true })).toBeVisible();

  await page.getByLabel("Anmelden", { exact: true }).click();
  await accountDialog.getByLabel("E-Mail").fill(email);
  await accountDialog.getByLabel("Passwort").fill(password);
  await accountDialog.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByRole("button", { name: "Benutzermenü: Browser User" })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "1 Datei übernehmen" }).click();
  await expect(page.getByText("1 Datei in deinen Account übernommen.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("NUR IN DIESEM BROWSER")).toHaveCount(0);

  await page.getByRole("button", { name: "Benutzermenü: Browser User" }).click();
  await page.getByRole("menuitem", { name: "Abmelden" }).click();
  await page.getByLabel("Anmelden", { exact: true }).click();
  await accountDialog.getByLabel("E-Mail").fill(email);
  await accountDialog.getByLabel("Passwort").fill(password);
  await accountDialog.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByRole("button", { name: "Benutzermenü: Browser User" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Meine Matchmaking Config", exact: true })).toBeVisible();
});
