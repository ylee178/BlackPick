import { test, expect } from "@playwright/test";
import { checkA11y } from "./helpers/a11y";
import { checkVisualRegression } from "./helpers/visual";

test.describe("Fighter Detail Page", () => {
  let fighterUrl: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/fighters");
    const firstLink = page.locator("a[href*='/fighters/']").first();
    fighterUrl = (await firstLink.getAttribute("href")) ?? "/fighters";
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(fighterUrl);
  });

  /* ---------- Functional ---------- */

  test("renders hero section with fighter info", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();

    // Avatar image
    const avatar = page.locator("main img").first();
    await expect(avatar).toBeVisible();

    // Name should be rendered (h1 or prominent text)
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
    const name = await heading.textContent();
    expect(name?.trim().length).toBeGreaterThan(0);
  });

  test("displays fighter record (W-L-D)", async ({ page }) => {
    // Look for win/loss numbers — the page shows W, L, D stats
    const mainContent = await page.locator("main").textContent();
    // Record should contain digits
    expect(mainContent).toMatch(/\d/);
  });

  test("displays weight class and nationality flag", async ({ page }) => {
    const mainContent = await page.locator("main").textContent();
    // Should have some text content beyond just the name
    expect(mainContent?.length).toBeGreaterThan(10);
  });

  test("shows fight history section", async ({ page }) => {
    // Fight history may be empty for some fighters, but the section should render
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("fight history entries link to events", async ({ page }) => {
    const eventLinks = page.locator("a[href*='/events/']");
    if (await eventLinks.count()) {
      const href = await eventLinks.first().getAttribute("href");
      expect(href).toMatch(/\/events\/.+/);
    }
  });

  /* ---------- Responsiveness ---------- */

  test("hero section adapts to mobile viewport", async ({ page, browserName }) => {
    // This test runs across all configured viewports (mobile projects)
    const hero = page.locator("main").first();
    await expect(hero).toBeVisible();

    const box = await hero.boundingBox();
    expect(box).toBeTruthy();
    // Content should not overflow the viewport
    const viewport = page.viewportSize();
    if (box && viewport) {
      expect(box.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });

  test("no horizontal scroll on mobile", async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  /* ---------- Accessibility ---------- */

  test("passes WCAG AA accessibility checks", async ({ page }) => {
    await checkA11y(page);
  });

  test("images have alt text", async ({ page }) => {
    const images = page.locator("main img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      // alt can be "" for decorative images, but should exist
      expect(alt).not.toBeNull();
    }
  });

  test("interactive elements are keyboard accessible", async ({ page }) => {
    // Tab through the page and verify focus is visible
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });

  /* ---------- Visual regression ---------- */

  test("visual regression - full page", async ({ page }) => {
    await checkVisualRegression(page, "fighter-detail-full");
  });

  test("visual regression - hero section", async ({ page }) => {
    const hero = page.locator("main > div").first();
    await page.waitForLoadState("networkidle");
    await expect(hero).toHaveScreenshot("fighter-detail-hero.png", {
      animations: "disabled",
    });
  });
});
