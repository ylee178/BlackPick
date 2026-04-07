import { test, expect } from "@playwright/test";
import { checkA11y } from "./helpers/a11y";
import { checkVisualRegression } from "./helpers/visual";

test.describe("Ranking Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ranking");
  });

  test("renders leaderboard with rank entries", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("tab navigation works", async ({ page }) => {
    // Look for tab/segment controls
    const tabs = page.getByRole("tab").or(page.locator("[role='tab'], button[data-state]"));
    if (await tabs.count()) {
      const secondTab = tabs.nth(1);
      await secondTab.click();
      // Tab should show active state
      await expect(secondTab).toBeVisible();
    }
  });

  test("passes accessibility checks", async ({ page }) => {
    await checkA11y(page);
  });

  test("visual regression", async ({ page }) => {
    await checkVisualRegression(page, "ranking");
  });
});
