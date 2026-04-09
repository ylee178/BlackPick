import { test, expect } from "@playwright/test";
import { checkA11y } from "./helpers/a11y";
import { checkVisualRegression } from "./helpers/visual";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders login form", async ({ page }) => {
    await expect(page.locator("#login-email")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /log\s*in|sign\s*in|로그인/i })).toBeVisible();
  });

  test("shows validation on empty submit", async ({ page }) => {
    await expect(page.locator("#login-email")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /log\s*in|sign\s*in|로그인/i }).click();
    const emailInput = page.locator("#login-email");
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid || el.getAttribute("aria-invalid") === "true"
    );
    expect(isInvalid).toBe(true);
  });

  test("link to signup page exists", async ({ page }) => {
    const signupLink = page.locator("a[href*='/signup']").first();
    await expect(signupLink).toBeVisible();
  });

  test("passes accessibility checks", async ({ page }) => {
    await checkA11y(page);
  });

  test("visual regression", async ({ page }) => {
    await checkVisualRegression(page, "login");
  });
});

test.describe("Signup Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("renders signup form", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("#signup-email")).toBeVisible();
  });

  test("passes accessibility checks", async ({ page }) => {
    await checkA11y(page);
  });

  test("visual regression", async ({ page }) => {
    await checkVisualRegression(page, "signup");
  });
});
