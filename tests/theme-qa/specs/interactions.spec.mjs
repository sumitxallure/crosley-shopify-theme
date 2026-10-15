import { test, expect } from '@playwright/test';
import { routes, viewportGroups } from '../config.mjs';
import { openStorefrontPage } from '../helpers.mjs';

test.describe('critical interaction states', () => {
  test('mobile menu survives repeated open and close cycles', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.mobile.has(testInfo.project.name), 'Mobile-only behavior.');
    await openStorefrontPage(page, routes[0]);

    const trigger = page.locator('.header__icon--menu').first();
    const container = page.locator('.menu-drawer-container').first();

    await trigger.click();
    await expect(container).toHaveClass(/menu-open/);
    await page.keyboard.press('Escape');
    await expect(container).not.toHaveClass(/menu-open/);

    for (let cycle = 0; cycle < 2; cycle += 1) {
      await trigger.click();
      await expect(container).toHaveClass(/menu-open/);
      await expect(page.locator('.menu-drawer').first()).toBeVisible();
      await trigger.click();
      await expect(container).not.toHaveClass(/menu-open/);
    }
  });

  test('homepage hero controls change the active slide', async ({ page }) => {
    await openStorefrontPage(page, routes[0]);
    const dots = page.locator('.crosley-hero-slider__dot');
    test.skip((await dots.count()) < 2, 'The configured hero has fewer than two slides.');

    await dots.nth(1).click();
    await expect(dots.nth(1)).toHaveClass(/is-active/);
    await expect(page.locator('.crosley-hero-slide').nth(1)).toHaveClass(/is-active/);
  });

  test('homepage product tabs expose the matching panel', async ({ page }) => {
    await openStorefrontPage(page, routes[0]);
    const tabs = page.locator('[data-tab-button]');
    test.skip((await tabs.count()) < 2, 'The configured product section has fewer than two tabs.');

    const index = await tabs.nth(1).getAttribute('data-tab-button');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`[data-tab-panel="${index}"]`)).toBeVisible();
  });

  test('desktop mega menu opens from the primary navigation', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.desktop.has(testInfo.project.name), 'Pointer/desktop-only behavior.');
    await openStorefrontPage(page, routes[0]);

    const recordPlayers = page.locator('.menu-list__link').filter({ hasText: 'Record Players' }).first();
    await recordPlayers.hover();
    await expect(page.locator('.menu-list__submenu').first()).toBeVisible();
  });

  test('PDP quantity stays synchronized between the main form and sticky bar', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.mobile.has(testInfo.project.name), 'Mobile-only behavior.');

    await page.goto('/products/zodiac-cruiser-plus-record-player?view=crosley&variant=67783735804139', {
      waitUntil: 'domcontentloaded',
    });

    const mainQuantity = page.locator('.product-information--crosley-pdp quantity-selector-component');
    const stickyQuantity = page.locator('sticky-add-to-cart quantity-selector-component');
    await expect(mainQuantity).toHaveCount(1);
    await expect(stickyQuantity).toHaveCount(1);
    await expect(mainQuantity.locator('input')).toHaveValue('1');
    await expect(stickyQuantity.locator('input')).toHaveValue('1');

    await mainQuantity.locator('.quantity-plus').click();
    await expect(mainQuantity.locator('input')).toHaveValue('2');
    await expect(stickyQuantity.locator('input')).toHaveValue('2');

    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(page.locator('sticky-add-to-cart .sticky-add-to-cart__bar')).toHaveAttribute('data-stuck', 'true');
    await stickyQuantity.locator('.quantity-plus').click();
    await expect(mainQuantity.locator('input')).toHaveValue('3');
    await expect(stickyQuantity.locator('input')).toHaveValue('3');
  });
});
