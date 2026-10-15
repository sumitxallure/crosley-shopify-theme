import { test, expect } from '@playwright/test';

const productPath = '/products/zodiac-cruiser-plus-record-player?view=crosley&variant=67783735804139';
const responsiveViewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1032, height: 1376 },
  { width: 1440, height: 1000 },
  { width: 1920, height: 1080 },
];

async function clearCart(page) {
  await page.request.post('/cart/clear.js', {
    data: {},
    headers: { Accept: 'application/json' },
  });
}

async function openProductWithEmptyCart(page) {
  await clearCart(page);
  const response = await page.goto(productPath, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('main')).toBeVisible();
}

async function addProduct(page) {
  const addButton = page.locator('.product-information--crosley-pdp .add-to-cart-button').first();
  await expect(addButton).toBeVisible();
  await addButton.click();
  await expect(page.locator('#cart-drawer dialog')).toBeVisible();
  await expect(page.locator('#cart-drawer tbody .cart-items__table-row')).toHaveCount(1);
}

test.describe('mini cart', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'Stateful cart coverage runs once and exercises every viewport.');
    await openProductWithEmptyCart(page);
  });

  test('opens as an accessible modal and restores focus when closed', async ({ page }) => {
    const trigger = page.locator('[data-testid="cart-drawer-trigger"]').first();
    await trigger.focus();
    await trigger.click();

    const drawer = page.locator('#cart-drawer');
    const dialog = drawer.locator('dialog');
    await expect(dialog).toBeVisible();
    await expect(drawer.locator('#cart-drawer-heading')).toHaveText(/cart/i);
    await expect(drawer.locator('.cart-drawer__empty-heading')).toBeVisible();
    await expect(dialog).toHaveJSProperty('open', true);
    expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('adds a product, updates quantity and total, then removes it', async ({ page }) => {
    await addProduct(page);

    const drawer = page.locator('#cart-drawer');
    const quantity = drawer.locator('.quantity-selector input[type="number"]').first();
    const checkout = drawer.locator('[data-cart-drawer-checkout]');
    const initialCheckoutText = await checkout.innerText();

    await drawer.locator('.quantity-plus').first().click();
    await expect(quantity).toHaveValue('2');
    await expect.poll(async () => {
      const response = await page.request.get('/cart.js');
      return (await response.json()).items[0]?.quantity;
    }).toBe(2);
    await expect(checkout).not.toHaveText(initialCheckoutText);
    await expect(page.locator('.cart-bubble__text').first()).toContainText('2');
    await expect(drawer.locator('cart-items-component')).not.toHaveClass(/cart-items-disabled/);

    await drawer.locator('.cart-items__remove--text').first().click();
    await expect(drawer.locator('.cart-drawer__empty-heading')).toBeVisible();
    await expect(drawer.locator('[data-cart-drawer-checkout]')).toHaveCount(0);
    await expect.poll(async () => {
      const response = await page.request.get('/cart.js');
      return (await response.json()).item_count;
    }).toBe(0);
    await expect(drawer.locator('#cart-drawer-heading')).toHaveCount(1);
    await expect(drawer.locator('dialog')).toHaveAttribute('aria-labelledby', 'cart-drawer-heading');
  });

  test('matches drawer geometry and keeps every control inside the viewport', async ({ page }) => {
    for (const viewport of responsiveViewports) {
      await page.setViewportSize(viewport);
      await openProductWithEmptyCart(page);
      await addProduct(page);

      const dialog = page.locator('#cart-drawer dialog');
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox, `Drawer box at ${viewport.width}px`).not.toBeNull();
      expect(dialogBox.width).toBeCloseTo(Math.min(440, viewport.width * 0.9), 0);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(dialogBox.height).toBeLessThanOrEqual(viewport.height + 1);

      const checkoutBox = await page.locator('#cart-drawer [data-cart-drawer-checkout]').boundingBox();
      const closeBox = await page.locator('#cart-drawer .theme-drawer__close-button').boundingBox();
      const plusBox = await page.locator('#cart-drawer .quantity-plus').first().boundingBox();
      for (const box of [checkoutBox, closeBox, plusBox]) {
        expect(box).not.toBeNull();
        expect(box.height).toBeGreaterThanOrEqual(38);
        expect(box.x).toBeGreaterThanOrEqual(dialogBox.x - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.locator('#cart-drawer .theme-drawer__close-button').click();
    }
  });

  test('loads complementary products and moves the recommendation carousel', async ({ page }) => {
    await addProduct(page);

    const recommendations = page.locator('#cart-drawer .cart-recommendations__section');
    await expect(recommendations).toBeVisible();
    await expect(recommendations.locator('[data-recommendation-card]')).toHaveCount(3);

    const track = recommendations.locator('[data-recommendation-track]');
    const lastDot = recommendations.locator('[data-recommendation-dot]').last();
    await lastDot.click();

    await expect(lastDot).toHaveAttribute('aria-current', 'true');
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

    const firstDot = recommendations.locator('[data-recommendation-dot]').first();
    await track.evaluate((element) => element.scrollTo({ left: 0, behavior: 'instant' }));
    await expect(firstDot).toHaveAttribute('aria-current', 'true');
    await track.evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }));
    await expect(lastDot).toHaveAttribute('aria-current', 'true');
  });
});
