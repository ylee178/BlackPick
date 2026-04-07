import { test, expect } from "@playwright/test";
import { checkA11y } from "./helpers/a11y";
import { checkVisualRegression } from "./helpers/visual";

test.describe("Events Listing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/events");
  });

  test("renders event list", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("event cards link to detail pages", async ({ page }) => {
    const eventLinks = page.locator("a[href*='/events/']");
    if (await eventLinks.count()) {
      const href = await eventLinks.first().getAttribute("href");
      expect(href).toMatch(/\/events\/.+/);
    }
  });

  test("passes accessibility checks", async ({ page }) => {
    await checkA11y(page);
  });

  test("visual regression", async ({ page }) => {
    await checkVisualRegression(page, "events-listing");
  });
});
