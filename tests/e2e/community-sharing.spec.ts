import { expect, test } from "@playwright/test";

test("teilt eine Config, findet sie im Feed und übernimmt sie in den Workspace", async ({ page }) => {
  const stamp = Date.now();
  const email = `sharer-${stamp}@example.com`;
  const handle = `sharer${String(stamp).slice(-6)}`;
  const title = `Faceit-Autoexec ${stamp}`;

  await page.goto("/");
  await page.getByLabel("Anmelden", { exact: true }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Registrieren" }).click();
  await dialog.getByLabel("Name").fill("Sharer");
  await dialog.getByLabel("E-Mail").fill(email);
  await dialog.getByLabel("Passwort").fill("browser-secret-123");
  await dialog.getByRole("button", { name: "Account erstellen" }).click();
  await expect(page.getByRole("button", { name: "Benutzermenü: Sharer" })).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("Community", { exact: true }).click();
  await page.getByRole("button", { name: "Config teilen" }).click();
  await expect(page.getByRole("heading", { name: "Teile deine Config." })).toBeVisible();

  await page.getByLabel("TITEL").fill(title);
  await page.getByLabel("BESCHREIBUNG").fill("Statisches Crosshair, kompaktes HUD und ein Radar über die ganze Map.");
  await page.getByLabel("TAGS").fill("crosshair, radar");
  await page.getByRole("button", { name: "Veröffentlichen" }).click();

  // Publishing is gated on a public identity, so the handle dialog opens first.
  const handleDialog = page.getByRole("dialog");
  await expect(handleDialog.getByRole("heading", { name: "Wähle deinen Handle" })).toBeVisible();
  await handleDialog.getByLabel("HANDLE").fill(handle);
  await handleDialog.getByLabel("ANZEIGENAME").fill("Sharer");
  await handleDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(handleDialog).toBeHidden();

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/community\/faceit-autoexec-/);

  await page.getByLabel("Community", { exact: true }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Ansehen" }).first().click();
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await page.getByRole("button", { name: "In Workspace übernehmen" }).click();
  await expect(page.getByText("1 Datei übernommen.")).toBeVisible({ timeout: 15_000 });
});
