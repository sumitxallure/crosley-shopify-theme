import { test, expect } from '@playwright/test';
import { routes, viewportGroups } from '../config.mjs';
import { boxesOverlap, getDocumentOverflow, openStorefrontPage, visibleBox } from '../helpers.mjs';

test.describe('responsive layout invariants', () => {
  for (const route of routes) {
    test(`${route.name} stays inside the viewport`, async ({ page }) => {
      await openStorefrontPage(page, route);
      const overflow = await getDocumentOverflow(page);
      expect(overflow.scrollWidth - overflow.clientWidth, `${route.name} has document-level horizontal overflow`).toBeLessThanOrEqual(1);
    });
  }

  test('header regions remain visible and non-overlapping', async ({ page }, testInfo) => {
    await openStorefrontPage(page, routes[0]);

    const logo = await visibleBox(page.locator('.header-logo').first());
    const navigation = await visibleBox(page.locator('header-menu').first());
    const actions = await visibleBox(page.locator('.header__column--right').first());
    const drawer = await visibleBox(page.locator('.header__drawer').first());

    expect(logo, 'Header logo is not visible').not.toBeNull();
    expect(actions, 'Header actions are not visible').not.toBeNull();
    expect(boxesOverlap(logo, actions), 'Header logo overlaps the action icons').toBe(false);

    if (viewportGroups.mobile.has(testInfo.project.name)) {
      expect(drawer, 'Mobile hamburger is not visible').not.toBeNull();
      expect(navigation, 'Desktop navigation should be hidden on mobile').toBeNull();
    } else {
      expect(drawer, 'Hamburger should be hidden on tablet and desktop').toBeNull();
      expect(navigation, 'Main navigation is not visible').not.toBeNull();
      expect(boxesOverlap(logo, navigation), 'Logo overlaps the main navigation').toBe(false);
      expect(boxesOverlap(navigation, actions), 'Main navigation overlaps the action icons').toBe(false);
    }
  });
});
