import { defineConfig } from '@playwright/test';

const baseURL = process.env.THEME_QA_BASE_URL || 'http://127.0.0.1:9294';
const startCommand = process.env.THEME_QA_START_COMMAND;

const sharedUse = {
  baseURL,
  browserName: 'chromium',
  channel: 'chrome',
  colorScheme: 'light',
  locale: 'en-US',
  reducedMotion: 'reduce',
  screenshot: 'only-on-failure',
  timezoneId: 'Asia/Kolkata',
  trace: 'retain-on-failure',
  video: process.env.THEME_QA_VIDEO === '1' ? 'retain-on-failure' : 'off'
};

export default defineConfig({
  testDir: './tests/theme-qa/specs',
  globalSetup: './tests/theme-qa/global-setup.mjs',
  outputDir: './test-results/theme-qa-artifacts',
  snapshotPathTemplate: './tests/theme-qa/snapshots/{testFilePath}/{projectName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: Number(process.env.THEME_QA_MAX_DIFF_RATIO || 0.003),
      scale: 'css'
    }
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/theme-qa-report', open: 'never' }],
    ['json', { outputFile: 'test-results/theme-qa-results.json' }]
  ],
  use: sharedUse,
  projects: [
    {
      name: 'mobile-390',
      use: { ...sharedUse, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
    },
    {
      name: 'mobile-430',
      use: { ...sharedUse, viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true }
    },
    {
      name: 'tablet-768',
      use: { ...sharedUse, viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: false }
    },
    {
      name: 'tablet-1032',
      use: { ...sharedUse, viewport: { width: 1032, height: 1376 }, hasTouch: true, isMobile: false }
    },
    {
      name: 'desktop-1440',
      use: { ...sharedUse, viewport: { width: 1440, height: 1000 }, hasTouch: false, isMobile: false }
    },
    {
      name: 'desktop-1920',
      use: { ...sharedUse, viewport: { width: 1920, height: 1080 }, hasTouch: false, isMobile: false }
    }
  ],
  webServer: startCommand
    ? {
        command: startCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
    : undefined
});
