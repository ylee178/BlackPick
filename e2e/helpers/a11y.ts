import AxeBuilder from "@axe-core/playwright";
import { Page, expect } from "@playwright/test";

/**
 * Run axe-core accessibility checks on the current page.
 * Fails the test if any WCAG AA violations are found.
 */
export async function checkA11y(page: Page, disableRules: string[] = []) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(disableRules)
    .analyze();

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.length,
    help: v.helpUrl,
  }));

  expect(violations, `Accessibility violations found:\n${JSON.stringify(violations, null, 2)}`).toEqual([]);
}
