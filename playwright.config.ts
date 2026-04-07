import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || 3000;
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { outputFolder: "e2e/html-report" }], ["github"]]
    : [["html", { outputFolder: "e2e/html-report", open: "never" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  /* Snapshot settings for visual regression */
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    },
  },

  projects: [
    /* ---------- Auth setup ---------- */
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },

    /* ---------- Desktop browsers ---------- */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["auth-setup"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["auth-setup"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["auth-setup"],
    },

    /* ---------- Mobile viewports ---------- */
    {
      name: "mobile-iphone-se",
      use: { ...devices["iPhone SE"] },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile-iphone-14",
      use: { ...devices["iPhone 14 Pro"] },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile-android",
      use: { ...devices["Pixel 7"] },
      dependencies: ["auth-setup"],
    },
    {
      name: "tablet-ipad",
      use: { ...devices["iPad (gen 7)"] },
      dependencies: ["auth-setup"],
    },
  ],

  /* Start dev server before tests (skip if BASE_URL is set) */
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
