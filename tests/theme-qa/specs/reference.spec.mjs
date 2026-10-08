import fs from 'node:fs/promises';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { test, expect } from '@playwright/test';
import { referenceHomeUrl, referenceMaxDiffRatio, routes } from '../config.mjs';
import { disableUnstableRendering, openStorefrontPage, settlePage } from '../helpers.mjs';

test.describe('external design reference parity', () => {
  test('homepage first viewport stays within the allowed pixel difference', async ({ context, page }, testInfo) => {
    test.skip(!referenceHomeUrl, 'Set THEME_QA_REFERENCE_HOME_URL to enable direct reference comparison.');

    await openStorefrontPage(page, routes[0]);
    await disableUnstableRendering(page);
    const actualBuffer = await page.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css' });

    const referencePage = await context.newPage();
    await referencePage.goto(referenceHomeUrl, { waitUntil: 'domcontentloaded' });
    await settlePage(referencePage);
    await disableUnstableRendering(referencePage);
    const referenceBuffer = await referencePage.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css' });
    await referencePage.close();

    const actual = PNG.sync.read(actualBuffer);
    const reference = PNG.sync.read(referenceBuffer);
    expect({ width: actual.width, height: actual.height }, 'Reference and theme screenshots use different dimensions').toEqual({
      width: reference.width,
      height: reference.height
    });

    const diff = new PNG({ width: actual.width, height: actual.height });
    const differentPixels = pixelmatch(actual.data, reference.data, diff.data, actual.width, actual.height, {
      threshold: 0.1
    });
    const diffRatio = differentPixels / (actual.width * actual.height);
    const diffPath = testInfo.outputPath('reference-diff.png');
    await fs.writeFile(diffPath, PNG.sync.write(diff));

    await Promise.all([
      testInfo.attach('reference', { body: referenceBuffer, contentType: 'image/png' }),
      testInfo.attach('theme', { body: actualBuffer, contentType: 'image/png' }),
      testInfo.attach('difference', { path: diffPath, contentType: 'image/png' })
    ]);

    expect(diffRatio, `Pixel difference ${(diffRatio * 100).toFixed(2)}% exceeds the configured threshold`).toBeLessThanOrEqual(
      referenceMaxDiffRatio
    );
  });
});
