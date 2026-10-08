# Theme QA suite

This suite validates the storefront beyond a single page or visual comparison. It covers:

- responsive layout and header geometry;
- repeated interaction states;
- visual regression snapshots;
- direct comparison with an external HTML reference;
- uncaught browser errors and failed critical resources;
- broken visible images;
- automated WCAG A/AA checks.

## Setup

```powershell
npm install
```

Start the Shopify preview separately, or let the suite start it by setting
`THEME_QA_START_COMMAND`.

```powershell
$env:THEME_QA_BASE_URL = 'http://127.0.0.1:9294'
$env:THEME_QA_STORE_PASSWORD = '<storefront password>'
npm run qa:smoke
```

`SHOPIFY_FLAG_STORE_PASSWORD` is also supported. The password remains an environment
variable and must never be committed. When the preview is started by the suite, Shopify
CLI can consume the same value through its `--store-password`/environment support.

Failure screenshots and traces are enabled by default. Set `THEME_QA_VIDEO=1` only
when Playwright's FFmpeg dependency is installed and failure recordings are useful.

The default route matrix is in `tests/theme-qa/routes.json`. Add routes there to cover
new collections, products, pages, search states, and cart states. A different route file
can be supplied with `THEME_QA_ROUTES_FILE`.

## Visual baselines

Create or intentionally update approved screenshots only after reviewing the rendered UI:

```powershell
npm run qa:visual:update
npm run qa:visual
```

Commit the generated files under `tests/theme-qa/snapshots`. Keep the same operating
system, browser channel, and font environment when generating and comparing snapshots.

## Standalone reference comparison

Direct pixel comparison is optional because reference files are machine-specific.

```powershell
$env:THEME_QA_REFERENCE_HOME_URL = 'file:///C:/path/to/Crosley%20Homepage%20(Standalone).html'
$env:THEME_QA_REFERENCE_MAX_DIFF_RATIO = '0.02'
npm run qa:visual -- reference.spec.mjs
```

Each failed comparison attaches the reference, Shopify rendering, and highlighted diff.
Use the diff as evidence; do not update the accepted threshold merely to make a failure pass.

## Accessibility

By default, accessibility tests block critical WCAG failures and attach the complete axe
report. To fail on every detected WCAG A/AA violation:

```powershell
$env:THEME_QA_STRICT_A11Y = '1'
npm run qa:smoke
```

Automated checks supplement keyboard, focus, screen-reader, zoom, RTL, and manual visual
testing; they do not replace those reviews.

## Required completion evidence

Before describing a UI change as complete:

1. Run `npm run qa:smoke`.
2. Run the affected visual projects and review their diff artifacts.
3. Run `shopify theme check`.
4. Report any skipped scenario, known difference, or unavailable representative data.
5. Share the relevant before/reference, actual, and diff screenshots for visual work.
