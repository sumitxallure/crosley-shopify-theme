import { test, expect } from '@playwright/test';
import { boxesOverlap, getDocumentOverflow, getVisibleBrokenImages, settlePage, visibleBox } from '../helpers.mjs';

const zoomViewports = [
  // 1920 physical pixels at the laptop's 125% Windows display scale.
  { label: '100%', width: 1536 },
  { label: '90%', width: 1707 },
  { label: '85%', width: 1807 },
  { label: '80%', width: 1920 },
  { label: '75%', width: 2048 },
  { label: '70%', width: 2194 },
  { label: '67%', width: 2293 }
];

const sectionSelectors = [
  '.crosley-hero-slider',
  '.crosley-product-tabs',
  '.crosley-promo',
  '.crosley-gift-mosaic',
  '.crosley-categories',
  '.crosley-newsletter',
  '.crosley-social-gallery',
  '.crosley-benefits',
  '.crosley-footer',
  '.footer-utilities .utilities'
];

for (const viewport of zoomViewports) {
  test(`homepage reflows at ${viewport.label} zoom equivalent`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: 1000 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('main').first().waitFor({ state: 'visible' });
    await settlePage(page, { loadLazyMedia: true });

    const overflow = await getDocumentOverflow(page);
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
    expect(await getVisibleBrokenImages(page)).toEqual([]);

    for (const selector of sectionSelectors) {
      const elements = page.locator(selector);
      expect(await elements.count(), `${selector} is missing`).toBeGreaterThan(0);

      for (const element of await elements.all()) {
        const box = await element.boundingBox();
        expect(box, `${selector} is not visible`).not.toBeNull();
        expect(box.x, `${selector} extends past the left viewport edge`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${selector} extends past the right viewport edge`).toBeLessThanOrEqual(viewport.width + 1);
        expect(box.height, `${selector} collapsed`).toBeGreaterThan(0);
      }
    }

    const clippedText = await page.locator('.crosley-home-section, .crosley-footer-section').evaluateAll((roots) =>
      roots.flatMap((root) =>
        [...root.querySelectorAll('h1, h2, h3, p, a, button, summary, strong')]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            const styles = getComputedStyle(element);
            return (
              box.width > 1 &&
              box.height > 1 &&
              styles.display !== 'none' &&
              styles.visibility !== 'hidden' &&
              !element.classList.contains('visually-hidden') &&
              ((styles.overflowX !== 'visible' && element.scrollWidth > element.clientWidth + 1) ||
                (styles.overflowY !== 'visible' && element.scrollHeight > element.clientHeight + 1))
            );
          })
          .map((element) => ({ className: element.className, text: element.textContent.trim().slice(0, 80) }))
      )
    );
    expect(clippedText, 'Homepage text is clipped').toEqual([]);

    const logo = await visibleBox(page.locator('.header-logo').first());
    const navigation = await visibleBox(page.locator('header-menu').first());
    const actions = await visibleBox(page.locator('.header__column--right').first());
    expect(logo, 'Header logo is not visible').not.toBeNull();
    expect(actions, 'Header actions are not visible').not.toBeNull();
    expect(boxesOverlap(logo, actions), 'Header logo overlaps its actions').toBe(false);
    if (navigation) {
      expect(boxesOverlap(logo, navigation), 'Header logo overlaps navigation').toBe(false);
      expect(boxesOverlap(navigation, actions), 'Header navigation overlaps its actions').toBe(false);
    }

    const gridColumns = async (selector) =>
      page.locator(selector).first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(await gridColumns('.crosley-product-tabs__products')).toBe(4);
    expect(await gridColumns('.crosley-categories__grid')).toBe(4);
    expect(await gridColumns('.crosley-social-gallery__grid')).toBe(5);
    expect(await gridColumns('.crosley-benefits__grid')).toBe(4);
    expect(await gridColumns('.crosley-footer__inner')).toBe(viewport.width <= 860 ? 1 : 5);

    const splitPromos = page.locator('.crosley-promo');
    await expect(splitPromos).toHaveCount(3);
    for (const promo of await splitPromos.all()) {
      const box = await promo.boundingBox();
      expect(box?.height).toBeLessThanOrEqual(620);
      expect(box?.height).toBeLessThanOrEqual(1000 - 96);
    }

    const parentDrivenWrappers = [
      {
        selector: '.crosley-product-tabs__inner',
        parentSelector: '.crosley-product-tabs'
      },
      {
        selector: '.crosley-categories__grid',
        parentSelector: '.crosley-categories'
      },
      {
        selector: '.crosley-benefits__grid',
        parentSelector: '.crosley-benefits'
      },
      {
        selector: '.crosley-footer__inner',
        parentSelector: '.crosley-footer'
      }
    ];

    for (const wrapper of parentDrivenWrappers) {
      const measurements = await page.locator(wrapper.selector).evaluate((element, parentSelector) => {
        const parent = element.closest(parentSelector);
        const parentStyles = getComputedStyle(parent);
        const box = element.getBoundingClientRect();
        return {
          width: box.width,
          expectedWidth:
            parent.clientWidth - parseFloat(parentStyles.paddingLeft) - parseFloat(parentStyles.paddingRight)
        };
      }, wrapper.parentSelector);
      expect(
        Math.abs(measurements.width - measurements.expectedWidth),
        `${wrapper.selector} does not fill its parent's content width`
      ).toBeLessThanOrEqual(1);
    }

    for (const wrapper of [
      {
        selector: '.crosley-social-gallery__grid',
        gutter: Math.min(40, Math.max(16, viewport.width * 0.03125))
      },
      { selector: '.footer-utilities .utilities', gutter: 40 }
    ]) {
      const wrapperBox = await page.locator(wrapper.selector).evaluate((element) => {
        const { left, width } = element.getBoundingClientRect();
        return { left, width };
      });
      expect(
        Math.abs(wrapperBox.width - (viewport.width - wrapper.gutter * 2)),
        `${wrapper.selector} does not follow the desktop page gutter`
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(wrapperBox.left - wrapper.gutter),
        `${wrapper.selector} is not aligned to the desktop page gutter`
      ).toBeLessThanOrEqual(1);
    }

    const heroDots = page.locator('.crosley-hero-slider__dot');
    if ((await heroDots.count()) > 1) {
      await heroDots.nth(1).click();
      await expect(heroDots.nth(1)).toHaveClass(/is-active/);
      await expect(page.locator('.crosley-hero-slide').nth(1)).toHaveClass(/is-active/);
    }

    const tabs = page.locator('[data-tab-button]');
    if ((await tabs.count()) > 1) {
      const panelIndex = await tabs.nth(1).getAttribute('data-tab-button');
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`[data-tab-panel="${panelIndex}"]`)).toBeVisible();
    }
  });
}
