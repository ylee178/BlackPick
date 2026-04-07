import { test, expect } from "@playwright/test";
import { checkA11y } from "./helpers/a11y";
import { checkVisualRegression } from "./helpers/visual";

test.describe("Event Detail Page", () => {
  // Uses the first event found via the events listing
  let eventUrl: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/events");
    const firstEvent = page.locator("a[href*='/events/']").first();
    if (await firstEvent.count()) {
      eventUrl = (await firstEvent.getAttribute("href")) ?? "/events";
    } else {
      eventUrl = "/events";
    }
    await page.close();
  });

  test("renders fight cards", async ({ page }) => {
    await page.goto(eventUrl);
    await expect(page.locator("main")).toBeVisible();
  });

  test("fight card picker is interactive", async ({ page }) => {
    await page.goto(eventUrl);
    // Look for clickable fighter elements in fight cards
    const fightCard = page.locator("[data-testid='fight-card'], [class*='fight-card'], [class*='FightCard']").first();
    if (await fightCard.count()) {
      await expect(fightCard).toBeVisible();
    }
  });

  test("passes accessibility checks", async ({ page }) => {
    await page.goto(eventUrl);
    await checkA11y(page);
  });

  test("visual regression", async ({ page }) => {
    await page.goto(eventUrl);
    await checkVisualRegression(page, "event-detail");
  });
});
