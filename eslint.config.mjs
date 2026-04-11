// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  ...storybook.configs["flat/recommended"],
  {
    rules: {
      // `react-hooks/set-state-in-effect` was added in a recent
      // eslint-plugin-react-hooks bump and flags the canonical SSR-safe
      // hydration pattern `useEffect(() => setMounted(true), [])` used by
      // FlipClock, FlipTimer, NotificationBell, TimezoneSelect, and
      // use-timezone. Refactoring all of those to useSyncExternalStore is a
      // separate, risky change; the legitimate hydration use of this pattern
      // is well-established and we are not chasing a stylistic warning into
      // an architectural rewrite. Re-evaluate if/when we migrate those
      // components to a different mount-detection strategy.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
