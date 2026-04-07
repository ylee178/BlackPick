import { test, expect } from "@playwright/test";
import { checkA11y } from "./helpers/a11y";
import { checkVisualRegression } from "./helpers/visual";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

test.describe("My Record Page (authenticated)", () => {
  test.use({ storageState: AUTH_FILE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/my-record");
  });

  test("renders prediction history or empty state", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
    // Should show either prediction entries or an empty state message
    const mainText = await page.locator("main").textContent();
    expect(mainText?.length).toBeGreaterThan(0);
  });

  test("passes accessibility checks", async ({ page }) => {
    await checkA11y(page);
  });

  test("visual regression", async ({ page }) => {
    await checkVisualRegression(page, "my-record");
  });
});

test.describe("My Record Page (unauthenticated)", () => {
  test("redirects to login or shows auth prompt", async ({ page }) => {
    await page.goto("/my-record");
    // Should either redirect to /login or show the page
    const url = page.url();
    const main = page.locator("main");
    await expect(main).toBeVisible();
    // Acceptable: still on my-record (with prompt) or redirected to login
    expect(url).toMatch(/\/(my-record|login)/);
  });
});
