import { test, expect } from '@playwright/test';
import { routes, visualMasks } from '../config.mjs';
import { disableUnstableRendering, openStorefrontPage, settlePage } from '../helpers.mjs';

test.describe('approved storefront visual baselines', () => {
  for (const route of routes) {
    test(`${route.name} matches its approved snapshot`, async ({ page }) => {
      await openStorefrontPage(page, route);
      await disableUnstableRendering(page);
      await settlePage(page, { loadLazyMedia: true });

      const masks = visualMasks.map((selector) => page.locator(selector));
      await expect(page).toHaveScreenshot(`${route.name}.png`, {
        fullPage: true,
        mask: masks,
        maskColor: '#ff00ff'
      });
    });
  }
});
