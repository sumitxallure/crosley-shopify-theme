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

const productPath = '/products/zodiac-cruiser-plus-record-player?variant=67783735804139';
const sectionSelectors = [
  '.crosley-pdp-breadcrumbs',
  '.product-information--crosley-pdp',
  '.crosley-pdp-video',
  '.crosley-pdp-marquee',
  '.crosley-pdp-editorial',
  '.crosley-pdp-reviews',
  '.product-recommendations--crosley-pdp',
  '.crosley-pdp-collections',
  '.crosley-social-gallery',
  '.crosley-benefits',
  '.crosley-footer'
];

for (const viewport of zoomViewports) {
  test(`product reflows at ${viewport.label} zoom equivalent`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: 1000 });
    await page.goto(productPath, { waitUntil: 'domcontentloaded' });
    await page.locator('.product-information--crosley-pdp').waitFor({ state: 'visible' });
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
    expect(clippedText, 'Product text is clipped').toEqual([]);

    const parentDrivenWrappers = [
      { selector: '.crosley-pdp-editorial__inner', parent: '.crosley-pdp-editorial' },
      { selector: '.crosley-pdp-reviews__inner', parent: '.crosley-pdp-reviews' },
      { selector: '.crosley-pdp-collections__inner', parent: '.crosley-pdp-collections' },
      { selector: '.crosley-benefits__grid', parent: '.crosley-benefits' },
      { selector: '.crosley-footer__inner', parent: '.crosley-footer' }
    ];

    for (const wrapper of parentDrivenWrappers) {
      const measurements = await page.locator(wrapper.selector).first().evaluate((element, config) => {
        const parent = element.closest(config.parent);
        const parentStyles = getComputedStyle(parent);
        const parentBox = parent.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        const expectedLeft = parseFloat(parentStyles.paddingLeft);
        return {
          left: box.left - parentBox.left,
          width: box.width,
          expectedLeft,
          expectedWidth: parent.clientWidth - expectedLeft - parseFloat(parentStyles.paddingRight)
        };
      }, wrapper);

      expect(Math.abs(measurements.left - measurements.expectedLeft), `${wrapper.selector} has the wrong left gutter`).toBeLessThanOrEqual(1);
      expect(Math.abs(measurements.width - measurements.expectedWidth), `${wrapper.selector} does not fill its parent content width`).toBeLessThanOrEqual(1);
    }

    const pageWidthWrappers = [
      '.crosley-pdp-breadcrumbs',
      '.product-information--crosley-pdp'
    ];
    for (const selector of pageWidthWrappers) {
      const box = await page.locator(selector).first().boundingBox();
      expect(Math.abs(box.x), `${selector} is not aligned to the viewport`).toBeLessThanOrEqual(1);
      expect(Math.abs(box.width - viewport.width), `${selector} does not fill the viewport`).toBeLessThanOrEqual(1);
    }

    const recommendations = await page
      .locator('.product-recommendations--crosley-pdp .section-resource-list__content')
      .boundingBox();
    const expectedRecommendationGutter = viewport.width <= 860 ? 0 : 40;
    expect(Math.abs(recommendations.x - expectedRecommendationGutter)).toBeLessThanOrEqual(1);
    expect(Math.abs(recommendations.width - (viewport.width - expectedRecommendationGutter * 2))).toBeLessThanOrEqual(1);
    if (viewport.width <= 860) {
      await expect(page.locator('.product-recommendations--crosley-pdp .section-resource-list__content')).toHaveCSS(
        'padding-inline',
        '20px'
      );
    }

    const gridColumns = async (selector) =>
      page.locator(selector).first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(await gridColumns('.product-information--crosley-pdp .product-information__grid')).toBe(
      viewport.width <= 860 ? 1 : 2
    );
    expect(await gridColumns('.crosley-pdp-editorial__row')).toBe(viewport.width <= 860 ? 1 : 2);
    expect(await gridColumns('.crosley-pdp-collections__grid')).toBe(viewport.width <= 860 ? 1 : 3);

    if (viewport.width <= 860) {
      await expect(page.locator('.crosley-benefits__grid')).toHaveCSS('display', 'flex');
      await expect(page.locator('.crosley-footer__inner')).toHaveCSS('display', 'block');
    } else {
      expect(await gridColumns('.crosley-social-gallery__grid')).toBe(5);
      expect(await gridColumns('.crosley-benefits__grid')).toBe(4);
      expect(await gridColumns('.crosley-footer__inner')).toBe(5);
    }

    await page.evaluate(() => window.scrollTo(0, 1600));
    const stickyBar = page.locator('sticky-add-to-cart .sticky-add-to-cart__bar');
    await expect(stickyBar).toHaveAttribute('data-stuck', 'true');
    const stickyMeasurements = await stickyBar.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return {
        left: box.left,
        width: box.width,
        paddingLeft: parseFloat(styles.paddingLeft),
        paddingRight: parseFloat(styles.paddingRight)
      };
    });
    expect(Math.abs(stickyMeasurements.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(stickyMeasurements.width - viewport.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(stickyMeasurements.paddingLeft - stickyMeasurements.paddingRight)).toBeLessThanOrEqual(1);
    if (viewport.width <= 860) {
      expect(stickyMeasurements.paddingLeft).toBeCloseTo(20, 0);
    } else {
      expect(stickyMeasurements.paddingLeft).toBeGreaterThanOrEqual(32);
      expect(stickyMeasurements.paddingLeft).toBeLessThanOrEqual(40);
    }
  });
}
