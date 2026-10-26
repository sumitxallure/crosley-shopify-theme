import { test, expect } from '@playwright/test';
import { viewportGroups } from '../config.mjs';
import { getDocumentOverflow, getVisibleBrokenImages, openStorefrontPage } from '../helpers.mjs';

const collectionRoute = {
  name: 'default-record-players-collection',
  path: '/collections/record-players',
  mainSelector: '.crosley-main-collection'
};

const collectionPresentationSelectors = [
  '.crosley-collection-hero',
  '.crosley-collection-hero h1',
  '.crosley-collection-hero__description',
  '.crosley-collection-toolbar',
  '.crosley-main-collection .product-grid',
  '.crosley-main-collection .product-grid__item:first-child',
  '.crosley-main-collection .product-grid__item:first-child product-swatches',
  '.crosley-main-collection .product-grid__item:first-child .price',
  '.crosley-product-week',
  '.crosley-social-gallery',
  '.crosley-benefits'
];

async function getCollectionPresentation(page, path) {
  await openStorefrontPage(page, { ...collectionRoute, path });
  await page.evaluate(async () => document.fonts.ready);

  return page.evaluate((selectors) => {
    const round = (value) => Math.round(value * 100) / 100;

    return selectors.map((selector) => {
      const node = document.querySelector(selector);
      if (!node) return { selector, missing: true };

      const bounds = node.getBoundingClientRect();
      const style = getComputedStyle(node);

      return {
        selector,
        text: node.textContent.replace(/\s+/g, ' ').trim(),
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
          border: style.border,
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          textTransform: style.textTransform
        }
      };
    });
  }, collectionPresentationSelectors);
}

test.describe('default collection template', () => {
  test('renders the complete Crosley PLP composition on the canonical URL', async ({ page }) => {
    await openStorefrontPage(page, collectionRoute);

    expect(new URL(page.url()).searchParams.has('view')).toBe(false);
    await expect(page.locator('.announcement-bar')).toHaveCount(1);
    await expect(page.locator('.crosley-plp-announcement')).toHaveCount(0);
    await expect(page.locator('.crosley-collection-hero')).toHaveCount(1);
    await expect(page.locator('.crosley-main-collection')).toHaveCount(1);
    await expect(page.locator('.crosley-product-week')).toHaveCount(1);
    await expect(page.locator('.crosley-social-gallery')).toHaveCount(1);
    await expect(page.locator('.crosley-benefits')).toHaveCount(1);
    expect(await page.locator('.product-grid__item').count()).toBeGreaterThan(0);
    expect(await getVisibleBrokenImages(page)).toEqual([]);

    const overflow = await getDocumentOverflow(page);
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  });

  test('matches the alternate Crosley template section by section', async ({ page }) => {
    const defaultPresentation = await getCollectionPresentation(page, '/collections/record-players');
    const alternatePresentation = await getCollectionPresentation(page, '/collections/record-players?view=crosley');

    expect(defaultPresentation).toEqual(alternatePresentation);
  });

  test('uses the shared homepage announcement and header on mobile', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.mobile.has(testInfo.project.name), 'Mobile composition only.');
    const readHeader = async (path) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.locator('#header-component').waitFor({ state: 'visible' });
      return page.evaluate(() => {
        const measure = (selector) => {
          const bounds = document.querySelector(selector).getBoundingClientRect();
          return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
        };
        return {
          announcement: measure('.announcement-bar'),
          header: measure('#header-component .header__row--top'),
          logo: measure('#header-component .header-logo__transparent-header-image-container .header-logo__image'),
          customAnnouncements: document.querySelectorAll('.crosley-plp-announcement').length
        };
      });
    };

    const homepageHeader = await readHeader('/');
    const collectionHeader = await readHeader(collectionRoute.path);
    expect(collectionHeader).toEqual(homepageHeader);

    await expect(page.locator('.crosley-collection-hero__media img')).toHaveAttribute('src', /crosley-miller\.jpg/);
    await expect(page.locator('.crosley-collection-hero__description')).toHaveText(
      'Belt-drive turntables built for everyday listening, from entry-level cruisers to all-in-one media consoles.'
    );
  });

  test('keeps product links and the filter drawer operational', async ({ page }) => {
    await openStorefrontPage(page, collectionRoute);

    const firstProductLink = page.locator('.product-grid__item a[href*="/products/"]').first();
    await expect(firstProductLink).toBeVisible();
    expect(await firstProductLink.getAttribute('href')).toContain('/products/');

    await page.locator('.crosley-collection-toolbar__filter').click();
    const filterDialog = page.locator('#filters-drawer dialog');
    await expect(filterDialog).toHaveAttribute('open', '');

    const closeButton = filterDialog.getByRole('button', { name: 'Close' });
    await expect(closeButton).toBeFocused();
    for (const label of ['Color', 'Feature', 'Price']) {
      await page.keyboard.press('Tab');
      await expect(filterDialog.getByText(label, { exact: true }).locator('xpath=ancestor::summary[1]')).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(filterDialog.getByRole('button', { name: 'View Results', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(filterDialog).not.toHaveAttribute('open', '');
    await expect(page.locator('.crosley-collection-toolbar__filter')).toBeFocused();
  });

  test('applies a color filter and removes it from the active-filter row', async ({ page }) => {
    await openStorefrontPage(page, collectionRoute);

    const initialCount = await page.locator('.product-grid__item').count();
    const resultsStatus = page.locator('.crosley-collection-toolbar__results [role="status"]');
    const initialResultsText = await resultsStatus.textContent();
    await page.locator('.crosley-collection-toolbar__filter').click();

    const drawer = page.locator('#filters-drawer dialog');
    const colorSummary = drawer.getByText('Color', { exact: true }).locator('xpath=ancestor::summary[1]');
    await colorSummary.click();

    const colorFilter = drawer.getByRole('checkbox', { name: 'Acorn', exact: true });
    const filterName = await colorFilter.getAttribute('name');
    const filterValue = await colorFilter.getAttribute('value');
    await colorFilter.check({ force: true });

    await expect.poll(() => new URL(page.url()).searchParams.getAll(filterName)).toContain(filterValue);
    await expect(colorFilter).toBeChecked();
    await expect(resultsStatus).not.toHaveText(initialResultsText);

    const filteredCount = await page.locator('.product-grid__item').count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(initialCount);

    await drawer.getByRole('button', { name: 'View Results', exact: true }).click();
    await expect(drawer).not.toHaveAttribute('open', '');

    const activeFilters = page.locator('.crosley-active-filters');
    const activeColor = activeFilters.locator('.facets-remove__pill');
    await expect(activeColor).toContainText('Acorn');
    await expect(activeColor).not.toContainText('Color:');
    await expect(activeFilters.getByRole('button', { name: 'Clear all' })).toBeVisible();
    await activeColor.click();
    await expect.poll(() => new URL(page.url()).searchParams.has(filterName)).toBe(false);
    await expect(activeFilters.locator('facet-remove-component')).toHaveCount(0);
    await expect(resultsStatus).toHaveText(initialResultsText);
    await expect(page.locator('.product-grid__item')).toHaveCount(initialCount);
  });

  test('paginates in place and restores the first page', async ({ page }) => {
    await openStorefrontPage(page, collectionRoute);

    const pagination = page.locator('.crosley-main-collection .pagination');
    await expect(pagination).toBeVisible();
    await expect(pagination.locator('[aria-current="page"]')).toHaveText('1');

    const firstPageProduct = await page.locator('.product-grid__item').first().getAttribute('data-product-id');
    await page.evaluate(() => {
      window.__plpAuditDocumentMarker = true;
    });

    await pagination.getByRole('link', { name: /next/i }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2');
    await expect(page.locator('.pagination [aria-current="page"]')).toHaveText('2');
    await expect(page.locator('results-list')).not.toHaveAttribute('aria-busy', 'true');

    const secondPageProduct = await page.locator('.product-grid__item').first().getAttribute('data-product-id');
    expect(secondPageProduct).not.toBe(firstPageProduct);
    expect(await page.evaluate(() => window.__plpAuditDocumentMarker)).toBe(true);

    await page.locator('.pagination').getByRole('link', { name: /previous/i }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('1');
    await expect(page.locator('.pagination [aria-current="page"]')).toHaveText('1');
    await expect(page.locator('.product-grid__item').first()).toHaveAttribute('data-product-id', firstPageProduct);
  });

  test('navigates from a product card to its PDP', async ({ page }) => {
    await openStorefrontPage(page, collectionRoute);

    const firstCard = page.locator('.product-grid__item product-card').first();
    const productLink = firstCard.locator('.product-card__link[href*="/products/"]');
    const href = await productLink.getAttribute('href');
    await firstCard.locator('.product-media__image').first().click();

    await expect.poll(() => new URL(page.url()).pathname).toBe(new URL(href, page.url()).pathname);
    await expect(page.locator('main')).toBeVisible();
  });

  test('keeps collection product media stable on image hover', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.desktop.has(testInfo.project.name), 'Hover behavior only applies to desktop pointers.');
    await openStorefrontPage(page, collectionRoute);

    const card = page
      .locator('.product-grid__item')
      .filter({ hasText: 'Zodiac Cruiser Plus Record Player' })
      .first();
    const gallery = card.locator('.card-gallery');
    const mediaScroller = gallery.locator('slideshow-slides');
    const activeImage = () =>
      card.locator('slideshow-slide[aria-hidden="false"] .product-media__image').getAttribute('src');

    await expect(mediaScroller).toHaveAttribute('tabindex', '0');
    await expect(mediaScroller).toHaveAttribute('aria-label', 'Zodiac Cruiser Plus Record Player media gallery');
    await expect(gallery).not.toHaveAttribute('on:pointerenter', '/previewImage');
    const imageBeforeHover = await activeImage();
    await gallery.hover();
    await page.waitForTimeout(300);
    expect(await activeImage()).toBe(imageBeforeHover);
  });

  test('overlays the desktop PLP with the standalone drawer geometry', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.desktop.has(testInfo.project.name), 'Desktop drawer composition only.');
    await openStorefrontPage(page, collectionRoute);

    const layoutBefore = await page.evaluate(() => {
      const main = document.querySelector('#MainContent').getBoundingClientRect();
      const grid = document.querySelector('.crosley-main-collection .product-grid').getBoundingClientRect();
      return {
        main: { x: main.x, width: main.width },
        grid: { x: grid.x, width: grid.width },
        clientWidth: document.documentElement.clientWidth
      };
    });

    await page.locator('.crosley-collection-toolbar__filter').click();
    const drawer = page.locator('#filters-drawer dialog');
    await expect(drawer).toHaveAttribute('open', '');
    await page.waitForTimeout(700);

    const openState = await page.evaluate(() => {
      const dialog = document.querySelector('#filters-drawer dialog');
      const main = document.querySelector('#MainContent').getBoundingClientRect();
      const grid = document.querySelector('.crosley-main-collection .product-grid').getBoundingClientRect();
      const drawerBounds = dialog.getBoundingClientRect();
      const titleBounds = dialog.querySelector('.theme-drawer__title').getBoundingClientRect();
      const closeBounds = dialog.querySelector('.theme-drawer__close-button').getBoundingClientRect();
      const closePaths = [...dialog.querySelectorAll('.theme-drawer__close-button path')].map((path) => {
        const bounds = path.getBoundingClientRect();
        return {
          d: path.getAttribute('d'),
          strokeWidth: getComputedStyle(path).strokeWidth,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        };
      });
      const caretPath = dialog.querySelector('.facets__summary .icon-caret path').getBoundingClientRect();

      return {
        main: { x: main.x, width: main.width },
        grid: { x: grid.x, width: grid.width },
        clientWidth: document.documentElement.clientWidth,
        viewportWidth: innerWidth,
        isModal: dialog.matches(':modal'),
        drawer: { x: drawerBounds.x, width: drawerBounds.width },
        title: { x: titleBounds.x, y: titleBounds.y, width: titleBounds.width, height: titleBounds.height },
        close: { x: closeBounds.x, y: closeBounds.y, width: closeBounds.width, height: closeBounds.height },
        closePaths,
        caret: { width: caretPath.width, height: caretPath.height },
        backdrop: getComputedStyle(dialog, '::backdrop').backgroundColor
      };
    });

    expect(openState.main).toEqual(layoutBefore.main);
    expect(openState.grid).toEqual(layoutBefore.grid);
    expect(openState.clientWidth).toBe(layoutBefore.clientWidth);
    expect(openState.isModal).toBe(true);
    expect(openState.drawer).toEqual({ x: openState.viewportWidth - 440, width: 440 });
    expect(openState.title).toEqual({
      x: openState.viewportWidth - 408,
      y: 28.5,
      width: 66.828125,
      height: 28
    });
    expect(openState.close).toEqual({ x: openState.viewportWidth - 58, y: 28, width: 26, height: 29 });
    expect(openState.closePaths).toEqual([
      {
        d: 'M2 2L16 16',
        strokeWidth: '1.4px',
        x: openState.viewportWidth - 52,
        y: 34,
        width: 14,
        height: 14
      },
      {
        d: 'M16 2L2 16',
        strokeWidth: '1.4px',
        x: openState.viewportWidth - 52,
        y: 34,
        width: 14,
        height: 14
      }
    ]);
    expect(openState.caret.width).toBeCloseTo(10, 1);
    expect(openState.caret.height).toBeCloseTo(5, 1);
    expect(openState.backdrop).toBe('rgba(23, 31, 38, 0.5)');

    const colorSummary = drawer.getByText('Color', { exact: true }).locator('xpath=ancestor::summary[1]');
    await colorSummary.click();
    await expect(colorSummary.locator('xpath=..')).toHaveAttribute('open', '');
    await page.locator('#filters-drawer .theme-drawer__close-button').click();
    await expect(drawer).not.toHaveAttribute('open', '');
  });

  test('updates desktop product density and preserves the choice', async ({ page }, testInfo) => {
    test.skip(viewportGroups.mobile.has(testInfo.project.name), 'Desktop density controls only.');
    await openStorefrontPage(page, collectionRoute);

    const grid = page.locator('.crosley-main-collection .product-grid').first();
    await page.locator('.crosley-density--desktop input[name="grid"][value="crosley-three"]').check();
    await expect(grid).toHaveAttribute('product-grid-view', 'crosley-three');
    const expectedColumns = page.viewportSize().width <= 989 ? 2 : 3;
    await expect
      .poll(() => grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length))
      .toBe(expectedColumns);
    if (page.viewportSize().width <= 989) {
      await expect(page.locator('.crosley-density__option--compact')).toBeHidden();
    }
    expect(await page.evaluate(() => sessionStorage.getItem('product-grid-view-desktop'))).toBe('crosley-three');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.crosley-main-collection .product-grid').first()).toHaveAttribute(
      'product-grid-view',
      'crosley-three'
    );
    await expect(page.locator('.crosley-density--desktop input[name="grid"][value="crosley-three"]')).toBeChecked();

    if (page.viewportSize().width > 989) {
      await page.locator('.crosley-density--desktop input[name="grid"][value="zoom-out"]').check();
      await expect(grid).toHaveAttribute('product-grid-view', 'zoom-out');
      await expect(grid.locator('.card-gallery').first()).toBeVisible();
      await expect(grid.locator('a[ref="productTitleLink"]').first()).toBeHidden();
      await expect(grid.locator('product-price').first()).toBeHidden();
    }
  });

  test('keeps desktop density counts stable at zoom-equivalent viewport widths', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.desktop.has(testInfo.project.name), 'Desktop density behavior only.');
    await openStorefrontPage(page, collectionRoute);

    const grid = page.locator('.crosley-main-collection .product-grid').first();
    const densities = [
      { value: 'crosley-three', columns: 3 },
      { value: 'default', columns: 4 },
      { value: 'zoom-out', columns: 6 }
    ];

    for (const width of [1440, 1920, 2400]) {
      await page.setViewportSize({ width, height: 900 });
      for (const density of densities) {
        await page.locator(`.crosley-density--desktop input[name="grid"][value="${density.value}"]`).check();
        await expect
          .poll(() => grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length))
          .toBe(density.columns);
      }
    }
  });

  test('updates mobile product density and preserves the choice', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.mobile.has(testInfo.project.name), 'Mobile density controls only.');
    await openStorefrontPage(page, collectionRoute);

    const grid = page.locator('.crosley-main-collection .product-grid').first();
    await page.locator('.crosley-density--mobile input[value="mobile-single"]').check();
    await expect(grid).toHaveAttribute('product-grid-view', 'mobile-single');
    expect(await page.evaluate(() => sessionStorage.getItem('product-grid-view-mobile'))).toBe('mobile-single');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.crosley-main-collection .product-grid').first()).toHaveAttribute(
      'product-grid-view',
      'mobile-single'
    );
    await expect(page.locator('.crosley-density--mobile input[value="mobile-single"]')).toBeChecked();
  });

  test('applies and preserves sorting through the mobile toolbar', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.mobile.has(testInfo.project.name), 'Mobile sorting control only.');
    await openStorefrontPage(page, collectionRoute);

    const value = 'price-ascending';
    const sorting = page.locator('.crosley-collection-toolbar__sorting').first();
    const select = sorting.locator('select[name="sort_by"]');
    const firstProductBefore = await page.locator('.product-grid__item').first().getAttribute('data-product-id');
    await select.selectOption(value);

    await expect.poll(() => new URL(page.url()).searchParams.get('sort_by')).toBe(value);
    await expect(page.locator('.product-grid__item').first()).not.toHaveAttribute('data-product-id', firstProductBefore);
    await expect(sorting.locator('select[name="sort_by"]')).toHaveValue(value);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.crosley-collection-toolbar__sorting select[name="sort_by"]')).toHaveValue(value);
  });

  test('applies sorting through the Crosley toolbar', async ({ page }, testInfo) => {
    test.skip(viewportGroups.mobile.has(testInfo.project.name), 'Desktop sorting control only.');
    await openStorefrontPage(page, collectionRoute);

    const sorting = page.locator('.crosley-collection-toolbar__sorting').first();
    const option = sorting.locator('input[name="sort_by"][value="price-ascending"]');
    const value = 'price-ascending';
    const firstProductBefore = await page.locator('.product-grid__item').first().getAttribute('data-product-id');
    await option.evaluate((input) => input.click());

    await expect.poll(() => new URL(page.url()).searchParams.get('sort_by')).toBe(value);
    const selectedOption = page.locator(
      `.crosley-collection-toolbar__sorting input[name="sort_by"][value="${value}"]`
    ).first();
    await expect(selectedOption).toBeChecked();
    await expect(page.locator('.product-grid__item').first()).not.toHaveAttribute('data-product-id', firstProductBefore);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.locator(`.crosley-collection-toolbar__sorting input[name="sort_by"][value="${value}"]`).first()
    ).toBeChecked();
  });
});
