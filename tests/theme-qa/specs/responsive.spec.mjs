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

    const usesCompactHeader =
      viewportGroups.mobile.has(testInfo.project.name) || testInfo.project.name === 'tablet-768';

    if (usesCompactHeader) {
      expect(drawer, 'Compact navigation trigger is not visible').not.toBeNull();
      expect(navigation, 'Desktop navigation should be hidden on mobile and iPad Mini').toBeNull();
    } else {
      expect(drawer, 'Hamburger should be hidden on iPad Pro and desktop').toBeNull();
      expect(navigation, 'Main navigation is not visible').not.toBeNull();
      expect(boxesOverlap(logo, navigation), 'Logo overlaps the main navigation').toBe(false);
      expect(boxesOverlap(navigation, actions), 'Main navigation overlaps the action icons').toBe(false);
    }

    if (testInfo.project.name === 'tablet-1032') {
      const metrics = await page.evaluate(() => {
        const measure = (selector) => {
          const box = document.querySelector(selector).getBoundingClientRect();
          return { y: box.y, width: box.width, height: box.height };
        };
        return {
          announcement: measure('.announcement-bar'),
          header: measure('#header-component .header__row--top'),
          logo: measure('#header-component .header-logo'),
          navigationLink: measure('#header-component .menu-list__link'),
          accountAction: measure('#header-component .account-button')
        };
      });
      expect(metrics.announcement.height).toBe(36);
      expect(metrics.header.height).toBe(80);
      expect(metrics.logo.width).toBe(160);
      const center = (box) => box.y + box.height / 2;
      expect(Math.abs(center(metrics.logo) - center(metrics.navigationLink))).toBeLessThanOrEqual(1);
      expect(Math.abs(center(metrics.logo) - center(metrics.accountAction))).toBeLessThanOrEqual(1);
    }
  });

  test('homepage grids use intentional tablet compositions', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.tablet.has(testInfo.project.name), 'Tablet-only composition.');
    await openStorefrontPage(page, routes[0]);

    const columnCount = (selector) =>
      page.locator(selector).first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    if (testInfo.project.name === 'tablet-768') {
      await expect(page.locator('.crosley-product-tabs__products').first()).toHaveCSS('display', 'flex');
      expect(await columnCount('.crosley-categories__grid')).toBe(2);
      expect(await columnCount('.crosley-benefits__grid')).toBe(4);
    } else {
      expect(await columnCount('.crosley-product-tabs__products')).toBe(4);
      expect(await columnCount('.crosley-categories__grid')).toBe(4);
    }
  });

  test('tablet product rail dots follow reachable scroll positions', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-768', 'iPad Mini product rail behavior.');
    await openStorefrontPage(page, routes[0]);

    const panel = page.locator('.crosley-product-tabs__panel').first();
    const products = panel.locator('.crosley-product-tabs__products');
    const visibleDots = panel.locator('.crosley-product-tabs__dots span:visible');

    await expect(visibleDots.first()).toHaveClass(/is-active/);
    expect(await visibleDots.count()).toBeGreaterThanOrEqual(2);

    await products.evaluate((element) => element.scrollTo({
      left: element.scrollWidth - element.clientWidth,
      behavior: 'instant'
    }));
    await expect(visibleDots.last()).toHaveClass(/is-active/);
  });

  test('homepage mobile categories and benefits use their compact compositions', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.mobile.has(testInfo.project.name), 'Mobile-only composition.');
    await openStorefrontPage(page, routes[0]);

    const categoryColumns = await page.locator('.crosley-categories__grid').first().evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').length
    );
    expect(categoryColumns).toBe(2);

    const benefits = page.locator('.crosley-benefits__grid').first();
    await expect(benefits).toHaveCSS('display', 'flex');
    await expect(page.locator('.crosley-benefits__dots').first()).toHaveCSS('display', 'flex');

    const sizing = await benefits.evaluate((element) => ({
      cardWidth: element.firstElementChild.getBoundingClientRect().width,
      viewportWidth: element.clientWidth
    }));
    expect(Math.abs(sizing.cardWidth - sizing.viewportWidth)).toBeLessThanOrEqual(1);

    await benefits.evaluate((element) => element.scrollTo({ left: element.clientWidth, behavior: 'instant' }));
    await expect(page.locator('.crosley-benefits__dots span').nth(1)).toHaveClass(/is-active/);
  });

  test('homepage survives live mobile and tablet breakpoint changes', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openStorefrontPage(page, routes[0]);

    const benefits = page.locator('.crosley-benefits__grid').first();
    const dots = page.locator('.crosley-benefits__dots span');
    const main = page.locator('main').first();

    await benefits.evaluate((element) => element.scrollTo({ left: element.clientWidth, behavior: 'instant' }));
    await expect(dots.nth(1)).toHaveClass(/is-active/);

    await page.setViewportSize({ width: 1032, height: 1376 });
    await expect(main).toBeVisible();
    await expect(main).not.toHaveCSS('height', '0px');
    await expect(benefits).toHaveCSS('display', 'grid');

    await page.setViewportSize({ width: 393, height: 852 });
    await expect(main).toBeVisible();
    await expect(benefits).toHaveCSS('display', 'flex');
    await expect(dots.first()).toHaveClass(/is-active/);
    await expect(benefits).toHaveJSProperty('scrollLeft', 0);
  });

  test('collection swatches survive live viewport changes without a reload', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openStorefrontPage(page, routes.find((route) => route.name.startsWith('collection-')));

    const cards = page.locator('.crosley-main-collection .product-grid__item');
    const assertVisibleSwatches = async () => {
      for (const card of [cards.nth(0), cards.nth(1)]) {
        const swatches = card.locator('.variant-option__swatch');
        await expect(swatches.first()).toBeVisible();
        await expect(card.locator('.hidden-swatches__count')).toBeHidden();
      }
    };

    await assertVisibleSwatches();
    await page.setViewportSize({ width: 390, height: 844 });
    await assertVisibleSwatches();
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertVisibleSwatches();

    await page.setViewportSize({ width: 390, height: 844 });
    await assertVisibleSwatches();
  });

  test('homepage hero and promotions stay within the usable viewport height', async ({ page }) => {
    await openStorefrontPage(page, routes[0]);

    const measurements = await page.evaluate(() => ({
      viewportHeight: window.innerHeight,
      heroHeight: document.querySelector('.crosley-hero-slider')?.getBoundingClientRect().height,
      promoHeights: [...document.querySelectorAll('.crosley-promo')].map((promo) => promo.getBoundingClientRect().height)
    }));

    expect(measurements.heroHeight).toBeLessThanOrEqual(measurements.viewportHeight);
    for (const height of measurements.promoHeights) {
      expect(height).toBeLessThanOrEqual(measurements.viewportHeight);
    }
  });

  test('footer remains complete and usable at every breakpoint', async ({ page }, testInfo) => {
    await openStorefrontPage(page, routes[0]);

    const footer = page.locator('.crosley-footer').first();
    const menus = footer.locator('[data-footer-menu]');
    await expect(footer).toBeVisible();
    await expect(menus).toHaveCount(4);
    expect(await footer.locator('.crosley-footer__menu nav a').count()).toBeGreaterThanOrEqual(24);
    await expect(footer.locator('.crosley-footer__social a')).toHaveCount(4);
    expect(await footer.locator('.crosley-footer__payment-icon').count()).toBeGreaterThan(0);

    if (viewportGroups.mobile.has(testInfo.project.name) || testInfo.project.name === 'tablet-768') {
      await expect(menus.first()).not.toHaveAttribute('open', '');
      await menus.first().locator('summary').click();
      await expect(menus.first()).toHaveAttribute('open', '');
    } else {
      for (const menu of await menus.all()) {
        await expect(menu).toHaveAttribute('open', '');
      }
    }
  });
});
