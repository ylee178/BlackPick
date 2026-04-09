import { test, expect } from "@playwright/test";

test.describe("Deployed smoke coverage", () => {
  test("homepage and main navigation render", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });

  test("fighters page exposes filters and fighter cards", async ({ page }) => {
    await page.goto("/en/fighters");
    await expect(page.locator("main")).toBeVisible();

    const filters = page.getByRole("combobox");
    await expect(filters.nth(0)).toBeVisible();
    await expect(filters.nth(1)).toBeVisible();

    const fighterLinks = page.locator("a[href*='/fighters/']");
    await expect(fighterLinks.first()).toBeVisible({ timeout: 15_000 });
    expect(await fighterLinks.count()).toBeGreaterThan(0);
  });

  test("homepage links to an event detail page", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("main")).toBeVisible();

    const firstEvent = page.locator("a[href*='/events/']").first();
    await expect(firstEvent).toBeVisible({ timeout: 15_000 });
    await firstEvent.click();

    await expect(page).toHaveURL(/\/en\/events\/.+/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("ranking and auth pages load", async ({ page }) => {
    await page.goto("/en/ranking");
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/en/login");
    await expect(page.locator("#login-email")).toBeVisible({ timeout: 15_000 });

    await page.goto("/en/signup");
    await expect(page.locator("#signup-email")).toBeVisible({ timeout: 15_000 });
  });
});
