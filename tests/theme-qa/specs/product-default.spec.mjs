import { test, expect } from '@playwright/test';
import { viewportGroups } from '../config.mjs';
import { getDocumentOverflow, getVisibleBrokenImages, openStorefrontPage, settlePage } from '../helpers.mjs';

const productPath = '/products/zodiac-cruiser-plus-record-player?variant=67783735804139';
const alternateProductPath = '/products/zodiac-cruiser-plus-record-player?view=crosley&variant=67783735804139';
const productRoute = {
  name: 'default-zodiac-cruiser-plus-product',
  path: productPath,
  mainSelector: '.product-information--crosley-pdp'
};

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
  '.crosley-benefits'
];

const presentationSelectors = [
  ...sectionSelectors,
  '.product-information--crosley-pdp h1',
  '.product-information--crosley-pdp product-media-gallery',
  '.product-information--crosley-pdp variant-picker',
  '.crosley-pdp-secondary',
  '.product-information--crosley-pdp .product-form-buttons',
  '.product-information--crosley-pdp .crosley-pdp-feature-pills',
  '.product-information--crosley-pdp .crosley-pdp-details'
];

const sharedHomepageSectionSelectors = [
  '.crosley-social-gallery',
  '.crosley-social-gallery > p',
  '.crosley-social-gallery h2',
  '.crosley-social-gallery__grid',
  '.crosley-social-gallery__grid a',
  '.crosley-benefits',
  '.crosley-benefits__grid',
  '.crosley-benefit',
  '.crosley-benefit__icon',
  '.crosley-benefit h3',
  '.crosley-benefit p',
  '.crosley-benefits__dots'
];

async function getProductPresentation(page, path) {
  await openStorefrontPage(page, { ...productRoute, path });
  await settlePage(page, { loadLazyMedia: true });

  return page.evaluate((selectors) => {
    const round = (value) => Math.round(value * 100) / 100;

    return selectors.map((selector) => {
      const node = document.querySelector(selector);
      if (!node) return { selector, missing: true };

      const bounds = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const content = node.cloneNode(true);
      content.querySelectorAll('script, style, template').forEach((element) => element.remove());
      return {
        selector,
        text: content.textContent.replace(/\s+/g, ' ').trim(),
        bounds: {
          x: round(bounds.x),
          y: round(bounds.y + scrollY),
          width: round(bounds.width),
          height: round(bounds.height)
        },
        style: {
          display: style.display,
          gridTemplateColumns: style.gridTemplateColumns,
          gap: style.gap,
          padding: style.padding,
          margin: style.margin,
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          textTransform: style.textTransform
        }
      };
    });
  }, presentationSelectors);
}

async function getSharedHomepageSectionPresentation(page, path, mainSelector) {
  await openStorefrontPage(page, { path, mainSelector });
  await page.locator('.crosley-social-gallery').scrollIntoViewIfNeeded();
  await settlePage(page);

  return page.evaluate((selectors) =>
    selectors.map((selector) => {
      const node = document.querySelector(selector);
      if (!node) return { selector, missing: true };

      const bounds = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        selector,
        text: node.textContent.replace(/\s+/g, ' ').trim(),
        bounds: {
          x: bounds.x,
          width: bounds.width,
          height: bounds.height
        },
        style: {
          display: style.display,
          gridTemplateColumns: style.gridTemplateColumns,
          flexBasis: style.flexBasis,
          gap: style.gap,
          padding: style.padding,
          margin: style.margin,
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          textAlign: style.textAlign,
          textTransform: style.textTransform
        }
      };
    })
  , sharedHomepageSectionSelectors);
}

test.describe('default product template', () => {
  test('renders the complete Crosley PDP composition in the intended order', async ({ page }) => {
    await openStorefrontPage(page, productRoute);

    for (const selector of sectionSelectors) {
      await expect(page.locator(selector), `${selector} should render once`).toHaveCount(1);
    }

    const positions = await page.evaluate((selectors) =>
      selectors.map((selector) => document.querySelector(selector)?.getBoundingClientRect().top + scrollY)
    , sectionSelectors);
    expect(positions.every((position, index) => index === 0 || position >= positions[index - 1])).toBe(true);

    await expect(page.locator('.product-information--crosley-pdp h1')).toContainText('Zodiac Cruiser Plus');
    await expect(page.locator('.product-information--crosley-pdp variant-picker input')).toHaveCount(3);
    await expect(page.locator('.crosley-pdp-secondary input')).toHaveCount(12);
    await expect(page.locator('.crosley-pdp-details details')).toHaveCount(4);
    await expect(page.locator('sticky-add-to-cart')).toHaveCount(1);
  });

  test('matches the homepage social gallery and benefits presentation', async ({ page }) => {
    const homepage = await getSharedHomepageSectionPresentation(page, '/', '.crosley-social-gallery');
    const product = await getSharedHomepageSectionPresentation(page, productPath, productRoute.mainSelector);

    expect(product).toHaveLength(homepage.length);
    for (let index = 0; index < product.length; index += 1) {
      const actual = product[index];
      const reference = homepage[index];
      expect(actual.selector).toBe(reference.selector);
      expect(actual.missing).toBe(reference.missing);
      if (actual.missing || reference.missing) continue;

      expect(actual.text).toBe(reference.text);
      expect(actual.style).toEqual(reference.style);
      for (const dimension of ['x', 'width', 'height']) {
        expect(Math.abs(actual.bounds[dimension] - reference.bounds[dimension])).toBeLessThanOrEqual(1);
      }
    }
  });

  test('matches the alternate Crosley PDP section by section', async ({ page }) => {
    const defaultPresentation = await getProductPresentation(page, productPath);
    const alternatePresentation = await getProductPresentation(page, alternateProductPath);

    expect(defaultPresentation).toHaveLength(alternatePresentation.length);
    for (let index = 0; index < defaultPresentation.length; index += 1) {
      const actual = defaultPresentation[index];
      const reference = alternatePresentation[index];
      expect(actual.selector).toBe(reference.selector);
      expect(actual.missing).toBe(reference.missing);
      if (actual.missing || reference.missing) continue;

      expect(actual.text).toBe(reference.text);
      expect(actual.style).toEqual(reference.style);
      for (const dimension of ['x', 'y', 'width', 'height']) {
        expect(Math.abs(actual.bounds[dimension] - reference.bounds[dimension])).toBeLessThanOrEqual(1);
      }
    }
  });

  test('keeps the document and visible media inside the viewport', async ({ page }) => {
    await openStorefrontPage(page, productRoute);
    await settlePage(page, { loadLazyMedia: true });

    const overflow = await getDocumentOverflow(page);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    expect(await getVisibleBrokenImages(page)).toEqual([]);
  });

  test('matches the standalone PDP icon and typography details', async ({ page }) => {
    await openStorefrontPage(page, productRoute);

    const addToCartIcon = page.locator('.product-information--crosley-pdp .add-to-cart-icon');
    await expect(addToCartIcon).toBeHidden();

    const addToCart = page.locator('.product-information--crosley-pdp .add-to-cart-button');
    const addToCartStyle = await addToCart.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        height: node.getBoundingClientRect().height,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing
      };
    });
    expect(addToCartStyle.height).toBeCloseTo(52, 0);
    expect(addToCartStyle.fontSize).toBe('14px');
    expect(addToCartStyle.fontWeight).toBe('700');
    expect(Number.parseFloat(addToCartStyle.letterSpacing)).toBeCloseTo(1.12, 1);

    const chevrons = page.locator('.crosley-pdp-details__icon');
    await expect(chevrons).toHaveCount(4);
    expect(await chevrons.first().evaluate((node) => node.tagName)).toBe('svg');
    const closedTransform = await chevrons.first().evaluate((node) => getComputedStyle(node).transform);
    const chevronBounds = await chevrons.first().boundingBox();
    expect(chevronBounds.width).toBeCloseTo(12, 0);
    expect(chevronBounds.height).toBeCloseTo(8, 0);
    await page.locator('.crosley-pdp-details summary').first().click();
    await expect.poll(() => chevrons.first().evaluate((node) => getComputedStyle(node).transform)).not.toBe(closedTransform);

    const provider = page.locator('.crosley-pdp-reviews__provider-name');
    await expect(provider).toHaveCSS('color', 'rgb(103, 103, 103)');
    await expect(provider).toHaveCSS('font-weight', '400');

    const currentCrumb = page.locator('.crosley-pdp-breadcrumbs li').last();
    await expect(currentCrumb).toHaveCSS('font-weight', '400');
    expect(await currentCrumb.evaluate((node) => getComputedStyle(node).fontFamily)).toContain('acumin-pro-condensed');

    const reviewStar = page.locator('.crosley-pdp-reviews__stars button').first();
    const reviewStarBounds = await reviewStar.boundingBox();
    expect(reviewStarBounds.height).toBeCloseTo(56, 0);

    const zodiacTrack = await page.locator('.crosley-pdp-secondary__options').boundingBox();
    const lastZodiac = await page.locator('.crosley-pdp-secondary__option').last().boundingBox();
    expect(lastZodiac.x + lastZodiac.width).toBeLessThanOrEqual(zodiacTrack.x + zodiacTrack.width + 1);
  });

  test('aligns the recommendation product track with adjacent PDP content', async ({ page }, testInfo) => {
    test.skip(testInfo.project.use.viewport.width <= 860, 'Desktop recommendation track alignment.');
    await openStorefrontPage(page, productRoute);

    const recommendationTrack = await page
      .locator('.product-recommendations--crosley-pdp .section-resource-list__content')
      .boundingBox();
    const collectionTrack = await page.locator('.crosley-pdp-collections__inner').boundingBox();

    expect(recommendationTrack).not.toBeNull();
    expect(collectionTrack).not.toBeNull();
    expect(Math.abs(recommendationTrack.x - collectionTrack.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(recommendationTrack.width - collectionTrack.width)).toBeLessThanOrEqual(1);
  });

  test('updates the selected product variant and its display label', async ({ page }) => {
    await openStorefrontPage(page, productRoute);

    const black = page.locator('.product-information--crosley-pdp variant-picker input[value="Black"]');
    await black.check();

    await expect(black).toBeChecked();
    await expect(page.locator('.product-information--crosley-pdp variant-picker legend')).toContainText('Dark Emerald');
    await expect.poll(() => new URL(page.url()).searchParams.get('variant')).not.toBe('67783735804139');
  });

  test('updates the zodiac selection label', async ({ page }) => {
    await openStorefrontPage(page, productRoute);

    const pisces = page.locator('.crosley-pdp-secondary input[value="Pisces"]');
    await pisces.locator('xpath=ancestor::label[1]').click();

    await expect(pisces).toBeChecked();
    await expect(page.locator('[data-crosley-secondary-label]')).toHaveText('Pisces');
  });

  test('synchronizes quantities and displays the ten-unit notice', async ({ page }) => {
    await openStorefrontPage(page, productRoute);

    const mainQuantity = page.locator('.product-information--crosley-pdp quantity-selector-component');
    const stickyQuantity = page.locator('sticky-add-to-cart quantity-selector-component');
    const notice = page.locator('[data-crosley-quantity-notice]');
    await expect(mainQuantity.locator('input')).toHaveValue('1');
    await expect(stickyQuantity.locator('input')).toHaveValue('1');
    await expect(notice).toBeHidden();

    for (let quantity = 2; quantity <= 10; quantity += 1) {
      await mainQuantity.locator('.quantity-plus').click();
    }

    await expect(mainQuantity.locator('input')).toHaveValue('10');
    await expect(stickyQuantity.locator('input')).toHaveValue('10');
    await expect(notice).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 1600));
    await expect(page.locator('sticky-add-to-cart .sticky-add-to-cart__bar')).toHaveAttribute('data-stuck', 'true');
    await stickyQuantity.locator('.quantity-minus').click();
    await expect(mainQuantity.locator('input')).toHaveValue('9');
    await expect(stickyQuantity.locator('input')).toHaveValue('9');
    await expect(notice).toBeHidden();
  });

  test('opens the product detail accordions independently', async ({ page }) => {
    await openStorefrontPage(page, productRoute);

    const items = page.locator('.crosley-pdp-details details');
    await items.nth(0).locator('summary').click();
    await expect(items.nth(0)).toHaveAttribute('open', '');
    await items.nth(1).locator('summary').click();
    await expect(items.nth(1)).toHaveAttribute('open', '');
    await expect(items.nth(0)).toHaveAttribute('open', '');
  });

  test('shows the sticky purchase bar after the primary form leaves view', async ({ page }) => {
    await openStorefrontPage(page, productRoute);

    const bar = page.locator('sticky-add-to-cart .sticky-add-to-cart__bar');
    await page.evaluate(() => window.scrollTo(0, 1600));
    await expect(bar).toHaveAttribute('data-stuck', 'true');
    await expect(bar).toBeVisible();
  });

  test('loads recommendation products with swatches and working links', async ({ page }) => {
    await openStorefrontPage(page, productRoute);

    const recommendations = page.locator('product-recommendations');
    await recommendations.scrollIntoViewIfNeeded();
    await expect(recommendations).toHaveAttribute('data-recommendations-performed', 'true', { timeout: 15_000 });
    await expect(recommendations.locator('.product-card')).toHaveCount(8);
    await expect(recommendations.locator('product-swatches')).toHaveCount(8);
    const productLink = recommendations.locator('.product-card a[href*="/products/"]').first();
    const href = await productLink.getAttribute('href');
    expect(href).toContain('/products/');
  });

  test('keeps one active gallery dot on mobile', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.mobile.has(testInfo.project.name), 'Mobile gallery controls only.');
    await openStorefrontPage(page, productRoute);

    const dots = page.locator('.product-information--crosley-pdp .slideshow-controls__dots button');
    await expect(dots).not.toHaveCount(0);
    const activeDot = page.locator(
      '.product-information--crosley-pdp .slideshow-controls__dots button[aria-selected="true"]'
    );
    await expect(activeDot).toHaveCount(1);
    expect(await activeDot.evaluate((button) => getComputedStyle(button, '::after').backgroundColor)).toBe(
      'rgb(0, 0, 0)'
    );
  });
});
