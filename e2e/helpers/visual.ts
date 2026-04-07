import { Page, expect } from "@playwright/test";

/**
 * Take a full-page screenshot and compare against baseline.
 * Name is auto-derived from the test name + suffix.
 */
export async function checkVisualRegression(
  page: Page,
  name: string,
  options?: { fullPage?: boolean; mask?: ReturnType<Page["locator"]>[] }
) {
  // Wait for images and fonts to settle
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: options?.fullPage ?? true,
    mask: options?.mask,
    animations: "disabled",
  });
}
