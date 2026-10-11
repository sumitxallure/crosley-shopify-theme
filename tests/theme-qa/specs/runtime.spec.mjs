import { test, expect } from '@playwright/test';
import { routes } from '../config.mjs';
import { getVisibleBrokenImages, openStorefrontPage, shouldRunCoreProject } from '../helpers.mjs';

test.describe('storefront runtime health', () => {
  for (const route of routes) {
    test(`${route.name} loads without critical browser failures`, async ({ page }, testInfo) => {
      test.skip(!shouldRunCoreProject(testInfo.project.name), 'Covered by the core device matrix.');

      const pageErrors = [];
      const failedAssets = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('requestfailed', (request) => {
        const type = request.resourceType();
        if (['document', 'script', 'stylesheet'].includes(type)) {
          failedAssets.push({ type, url: request.url(), error: request.failure()?.errorText });
        }
      });

      await openStorefrontPage(page, route);

      expect(await page.title(), `${route.name} has an empty document title`).not.toBe('');
      expect(await getVisibleBrokenImages(page), `${route.name} contains broken visible images`).toEqual([]);
      expect(pageErrors, `${route.name} emitted uncaught page errors`).toEqual([]);
      expect(failedAssets, `${route.name} failed to load critical resources`).toEqual([]);
    });
  }
});
