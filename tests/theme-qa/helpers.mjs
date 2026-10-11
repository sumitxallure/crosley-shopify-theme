import { expect } from '@playwright/test';
import { storefrontPassword } from './config.mjs';

export async function openStorefrontPage(page, route) {
  let response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
  if (response?.status() === 401) {
    await unlockPasswordProtectedStore(page);
    response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
  }

  expect(response, `No document response received for ${route.path}`).not.toBeNull();
  expect(response.status(), `${route.path} returned HTTP ${response.status()}`).toBeLessThan(400);

  await page.locator(route.mainSelector || 'main').first().waitFor({ state: 'visible' });
  await settlePage(page);
  return response;
}

async function unlockPasswordProtectedStore(page) {
  if (!storefrontPassword) {
    throw new Error('The storefront is password protected. Set THEME_QA_STORE_PASSWORD before running Theme QA.');
  }

  const input = page.locator('input[name="password"], input[type="password"]').first();
  await input.waitFor({ state: 'visible' });
  await input.fill(storefrontPassword);

  const submit = page.locator('button[type="submit"], input[type="submit"]').first();
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), submit.click()]);

  if (await input.isVisible().catch(() => false)) {
    throw new Error('Shopify rejected THEME_QA_STORE_PASSWORD.');
  }
}

export async function settlePage(page, { loadLazyMedia = false } = {}) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });

  if (loadLazyMedia) {
    await page.evaluate(async () => {
      const height = document.documentElement.scrollHeight;
      for (let y = 0; y < height; y += Math.max(window.innerHeight * 0.8, 500)) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      window.scrollTo(0, 0);
    });
  }

  await page.evaluate(async () => {
    const images = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom >= 0 && rect.top <= window.innerHeight;
    });
    await Promise.race([
      Promise.all(images.map((image) => image.decode?.().catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 2_000))
    ]);
  });
}

export async function disableUnstableRendering(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `
  });
}

export async function getVisibleBrokenImages(page) {
  return page.locator('img:visible').evaluateAll((images) =>
    images
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => ({ alt: image.alt, src: image.currentSrc || image.src }))
  );
}

export async function getDocumentOverflow(page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
}

export function boxesOverlap(first, second, tolerance = 1) {
  if (!first || !second) return false;
  return (
    first.x + first.width > second.x + tolerance &&
    second.x + second.width > first.x + tolerance &&
    first.y + first.height > second.y + tolerance &&
    second.y + second.height > first.y + tolerance
  );
}

export async function visibleBox(locator) {
  if (!(await locator.isVisible().catch(() => false))) return null;
  return locator.boundingBox();
}

export function shouldRunCoreProject(projectName) {
  return ['mobile-390', 'tablet-1032', 'desktop-1440'].includes(projectName);
}
