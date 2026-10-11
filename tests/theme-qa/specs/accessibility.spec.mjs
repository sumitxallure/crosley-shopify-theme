import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { routes, strictAccessibility } from '../config.mjs';
import { openStorefrontPage, shouldRunCoreProject } from '../helpers.mjs';

test.describe('automated accessibility checks', () => {
  for (const route of routes) {
    test(`${route.name} has no blocking WCAG violations`, async ({ page }, testInfo) => {
      test.skip(!shouldRunCoreProject(testInfo.project.name), 'Covered by the core device matrix.');
      await openStorefrontPage(page, route);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      await testInfo.attach('axe-results', {
        body: JSON.stringify(results, null, 2),
        contentType: 'application/json'
      });

      const violations = strictAccessibility
        ? results.violations
        : results.violations.filter((violation) => violation.impact === 'critical');
      expect(violations, 'See the attached axe-results report for affected elements').toEqual([]);
    });
  }
});
