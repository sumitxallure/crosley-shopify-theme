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
    await expect(page.locator('.crosley-plp-announcement')).toHaveCount(1);
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

  test('matches the mobile Crosley announcement, header, and hero specification', async ({ page }, testInfo) => {
    test.skip(!viewportGroups.mobile.has(testInfo.project.name), 'Mobile composition only.');
    await openStorefrontPage(page, collectionRoute);
    await page.evaluate(async () => document.fonts.ready);

    await expect(page.locator('.header-logo__brand-fallback--collection')).toHaveAttribute(
      'src',
      /crosley-logo-white\.png/
    );
    await expect(page.locator('.crosley-collection-hero__media img')).toHaveAttribute('src', /crosley-miller\.jpg/);
    await expect(page.locator('.crosley-collection-hero__description')).toHaveText(
      'Belt-drive turntables built for everyday listening, from entry-level cruisers to all-in-one media consoles.'
    );

    const metrics = await page.evaluate(() => {
      const measure = (selector) => {
        const node = [...document.querySelectorAll(selector)].find((candidate) => {
          const candidateBounds = candidate.getBoundingClientRect();
          return candidateBounds.width > 0 && candidateBounds.height > 0;
        });
        const bounds = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          width: bounds.width,
          height: bounds.height,
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontFamily: style.fontFamily,
          fontSize: parseFloat(style.fontSize),
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          textTransform: style.textTransform
        };
      };

      return {
        benefitBar: measure('.crosley-plp-announcement__benefits'),
        benefitText: measure('.crosley-plp-announcement__benefit-mobile'),
        promotion: measure('.crosley-plp-announcement__promotion'),
        offer: measure('.crosley-plp-announcement__offer'),
        countdownValue: measure('.crosley-plp-announcement__time strong'),
        countdownLabel: measure('.crosley-plp-announcement__time small'),
        header: measure('#header-component .header__columns'),
        menu: measure('#header-component .menu-drawer-container'),
        actionIcon: measure('#header-component .header__column--right svg'),
        hero: measure('.crosley-collection-hero'),
        heading: measure('.crosley-collection-hero h1'),
        description: measure('.crosley-collection-hero__description')
      };
    });

    expect(metrics.benefitBar.height).toBe(36);
    expect(metrics.benefitBar.backgroundColor).toBe('rgb(56, 54, 55)');
    expect(metrics.promotion.height).toBe(85);
    expect(metrics.promotion.backgroundColor).toBe('rgb(23, 31, 38)');
    expect(metrics.header.height).toBe(80);
    expect(metrics.menu.width).toBe(20);
    expect(metrics.menu.height).toBe(20);
    expect(metrics.actionIcon.width).toBe(20);
    expect(metrics.actionIcon.height).toBe(20);
    expect(metrics.hero.height).toBe(260);

    for (const textStyle of [
      metrics.benefitText,
      metrics.offer,
      metrics.countdownValue,
      metrics.countdownLabel,
      metrics.heading,
      metrics.description
    ]) {
      expect(textStyle.fontFamily).toContain('acumin-pro-condensed');
    }
    expect(metrics.benefitText.fontWeight).toBe('700');
    expect(metrics.offer.fontWeight).toBe('700');
    expect(metrics.countdownValue.fontSize).toBe(14);
    expect(metrics.countdownLabel.fontSize).toBe(9);
    expect(metrics.heading.fontWeight).toBe('700');
    expect(metrics.heading.textTransform).toBe('uppercase');
    expect(metrics.description.fontWeight).toBe('400');
    expect(metrics.description.color).toBe('rgba(255, 255, 255, 0.85)');
  });

  test('keeps product links and the filter drawer operational', async ({ page }) => {
    await openStorefrontPage(page, collectionRoute);

    const firstProductLink = page.locator('.product-grid__item a[href*="/products/"]').first();
    await expect(firstProductLink).toBeVisible();
    expect(await firstProductLink.getAttribute('href')).toContain('/products/');

    await page.locator('.crosley-collection-toolbar__filter').click();
    const filterDialog = page.locator('#filters-drawer dialog');
    await expect(filterDialog).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(filterDialog).not.toHaveAttribute('open', '');
  });

  test('applies and removes a color filter from the drawer', async ({ page }) => {
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

    await page.locator('.crosley-collection-toolbar__filter').click();
    await expect(colorFilter).toBeChecked();
    await colorFilter.uncheck({ force: true });
    await expect.poll(() => new URL(page.url()).searchParams.has(filterName)).toBe(false);
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
    expect(await page.evaluate(() => sessionStorage.getItem('product-grid-view-desktop'))).toBe('crosley-three');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.crosley-main-collection .product-grid').first()).toHaveAttribute(
      'product-grid-view',
      'crosley-three'
    );
    await expect(page.locator('.crosley-density--desktop input[name="grid"][value="crosley-three"]')).toBeChecked();
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
