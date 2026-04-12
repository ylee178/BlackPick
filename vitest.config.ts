import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(dirname, "src"),
    },
  },
  test: {
    projects: [
      {
        // `extends: true` makes this project inherit the root `resolve.alias`
        // so that `@/` imports resolve correctly inside unit tests.
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          // Skip integration tests by default (they hit real Supabase).
          // Run them via `npm run test:integration` which sets RUN_INTEGRATION=1.
          exclude: ["tests/integration/**", "node_modules/**"],
        },
      },
      {
        // Component contract tests — render React components in jsdom and
        // assert their behavior + the SDK calls they make. This catches the
        // class of bug where the UI button is wired to the wrong handler.
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          exclude: ["node_modules/**", "src/stories/**"],
          setupFiles: ["./vitest.setup.component.ts"],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
