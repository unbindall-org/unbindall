import { expect, test } from "@playwright/test";

test("Back und Forward folgen der letzten Workspace-Navigation", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.removeItem("unbindall:workspace"));
  await page.reload();

  await expect(page.getByRole("heading", { name: "Bau dir dein CS2-Setup." })).toBeVisible();

  await page.getByLabel("Community", { exact: true }).click();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.getByRole("heading", { name: "Configs, die andere wirklich spielen." })).toBeVisible();

  await page.getByLabel("Command-Register", { exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Alle Commands, die UNBINDALL kennt." })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.getByRole("heading", { name: "Configs, die andere wirklich spielen." })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Bau dir dein CS2-Setup." })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.getByRole("heading", { name: "Configs, die andere wirklich spielen." })).toBeVisible();
});
