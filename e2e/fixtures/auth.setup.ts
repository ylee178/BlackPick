import { test as setup } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");

/**
 * Global auth setup — logs in via Supabase and saves storageState.
 * Set E2E_USER_EMAIL and E2E_USER_PASSWORD in .env.local or CI secrets.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    // Skip auth setup if credentials not provided — tests requiring
    // auth will need to handle the unauthenticated state.
    console.warn("E2E_USER_EMAIL / E2E_USER_PASSWORD not set — skipping auth setup");
    await page.context().storageState({ path: AUTH_FILE });
    return;
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /log\s*in|sign\s*in/i }).click();

  // Wait for redirect to homepage after successful login
  await page.waitForURL("/", { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
