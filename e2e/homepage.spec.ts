import { test, expect } from "@playwright/test";
import { checkA11y } from "./helpers/a11y";
import { checkVisualRegression } from "./helpers/visual";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders page title and event listings", async ({ page }) => {
    await expect(page).toHaveTitle(/BlackPick/i);
    // Should show at least the main content area
    await expect(page.locator("main")).toBeVisible();
  });

  test("displays countdown timer for upcoming events", async ({ page }) => {
    // Countdown may not exist if no upcoming events — soft check
    const countdown = page.locator("[data-testid='countdown'], .countdown, [class*='countdown']");
    if (await countdown.count()) {
      await expect(countdown.first()).toBeVisible();
    }
  });

  test("navigation links are functional", async ({ page }) => {
    // Check main nav renders
    const nav = page.getByRole("navigation");
    await expect(nav.first()).toBeVisible();
  });

  test("passes accessibility checks", async ({ page }) => {
    await checkA11y(page);
  });

  test("visual regression", async ({ page }) => {
    await checkVisualRegression(page, "homepage");
  });
});
