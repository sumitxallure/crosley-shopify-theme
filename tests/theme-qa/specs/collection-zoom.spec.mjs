import { test, expect } from '@playwright/test';
import { getDocumentOverflow, getVisibleBrokenImages, settlePage } from '../helpers.mjs';

const zoomViewports = [
  // 1920 physical pixels at the laptop's 125% Windows display scale.
  { label: '200%', width: 768 },
  { label: '150%', width: 1024 },
  { label: '125%', width: 1229 },
  { label: '100%', width: 1536 },
  { label: '90%', width: 1707 },
  { label: '85%', width: 1807 },
  { label: '80%', width: 1920 },
  { label: '75%', width: 2048 },
  { label: '70%', width: 2194 },
  { label: '67%', width: 2293 }
];

const collectionPath = '/collections/record-players';
const sectionSelectors = [
  '.crosley-collection-hero',
  '.crosley-main-collection',
  '.crosley-product-week',
  '.crosley-social-gallery',
  '.crosley-benefits',
  '.crosley-footer',
  '.footer-utilities .utilities'
];

for (const viewport of zoomViewports) {
  test(`collection reflows at ${viewport.label} zoom equivalent`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: 1000 });
    await page.goto(collectionPath, { waitUntil: 'domcontentloaded' });
    await page.locator('main').first().waitFor({ state: 'visible' });
    await settlePage(page, { loadLazyMedia: true });

    const overflow = await getDocumentOverflow(page);
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
    expect(await getVisibleBrokenImages(page)).toEqual([]);

    for (const selector of sectionSelectors) {
      const element = page.locator(selector).first();
      const box = await element.boundingBox();
      expect(box, `${selector} is not visible`).not.toBeNull();
      expect(box.x, `${selector} extends past the left viewport edge`).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, `${selector} extends past the right viewport edge`).toBeLessThanOrEqual(
        viewport.width + 1
      );
      expect(box.height, `${selector} collapsed`).toBeGreaterThan(0);
    }

    const clippedText = await page.locator('main, .crosley-footer-section').evaluateAll((roots) =>
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
    expect(clippedText, 'Collection text is clipped').toEqual([]);

    const wrappers = [
      { selector: '.crosley-collection-hero__content', parent: '.crosley-collection-hero', gutter: 40 },
      { selector: '.product-grid[product-grid-view="default"]', parent: '.main-collection-grid > div' },
      { selector: '.crosley-product-week__inner', parent: '.crosley-product-week' },
      {
        selector: '.crosley-social-gallery__grid',
        parent: '.crosley-social-gallery',
        gutter: Math.min(160, Math.max(40, viewport.width * 0.0703))
      },
      { selector: '.crosley-benefits__grid', parent: '.crosley-benefits' },
      { selector: '.crosley-footer__inner', parent: '.crosley-footer' }
    ];

    for (const wrapper of wrappers) {
      const measurements = await page.locator(wrapper.selector).first().evaluate((element, config) => {
        const parent = element.closest(config.parent);
        const parentStyles = getComputedStyle(parent);
        const box = element.getBoundingClientRect();
        const expectedLeft = config.gutter ?? parseFloat(parentStyles.paddingLeft);
        const expectedWidth = parent.clientWidth - expectedLeft - (config.gutter ?? parseFloat(parentStyles.paddingRight));
        const parentBox = parent.getBoundingClientRect();
        return {
          left: box.left - parentBox.left,
          width: box.width,
          expectedLeft,
          expectedWidth
        };
      }, wrapper);

      expect(Math.abs(measurements.left - measurements.expectedLeft), `${wrapper.selector} has the wrong left gutter`).toBeLessThanOrEqual(1);
      expect(Math.abs(measurements.width - measurements.expectedWidth), `${wrapper.selector} does not fill its parent content width`).toBeLessThanOrEqual(1);
    }

    const gridColumns = async (selector) =>
      page.locator(selector).first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(await gridColumns('.product-grid[product-grid-view="default"]')).toBe(viewport.width <= 989 ? 3 : 4);
    expect(await gridColumns('.crosley-product-week__grid')).toBe(2);
    expect(await gridColumns('.crosley-social-gallery__grid')).toBe(5);
    if (viewport.width <= 860) {
      await expect(page.locator('.crosley-benefits__grid')).toHaveCSS('display', 'flex');
    } else {
      expect(await gridColumns('.crosley-benefits__grid')).toBe(4);
    }
    if (viewport.width <= 860) {
      await expect(page.locator('.crosley-footer__inner')).toHaveCSS('display', 'block');
    } else {
      expect(await gridColumns('.crosley-footer__inner')).toBe(5);
    }
  });
}
