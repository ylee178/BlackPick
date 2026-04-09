import { test, expect } from "@playwright/test";
import { checkA11y } from "./helpers/a11y";
import { checkVisualRegression } from "./helpers/visual";

test.describe("Fighter List Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fighters");
  });

  test("renders fighter grid with avatars", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
    // Should have at least one fighter card/link
    const fighterLinks = page.locator("a[href*='/fighters/']");
    await expect(fighterLinks.first()).toBeVisible({ timeout: 10_000 });
    expect(await fighterLinks.count()).toBeGreaterThan(0);
  });

  test("fighter cards show name and record", async ({ page }) => {
    const firstCard = page.locator("a[href*='/fighters/']").first();
    await expect(firstCard).toBeVisible();
    // Card should contain text content (name, record)
    const text = await firstCard.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test("fighter avatars load", async ({ page }) => {
    const images = page.locator("a[href*='/fighters/'] img");
    if (await images.count()) {
      const firstImg = images.first();
      await expect(firstImg).toBeVisible();
      // Verify image actually loaded (naturalWidth > 0)
      const naturalWidth = await firstImg.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test("passes accessibility checks", async ({ page }) => {
    await checkA11y(page);
  });

  test("visual regression", async ({ page }) => {
    await checkVisualRegression(page, "fighter-list");
  });
});
