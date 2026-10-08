import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const routesFile = process.env.THEME_QA_ROUTES_FILE
  ? path.resolve(process.env.THEME_QA_ROUTES_FILE)
  : path.join(directory, 'routes.json');

export const routes = JSON.parse(fs.readFileSync(routesFile, 'utf8'));
export const referenceHomeUrl = process.env.THEME_QA_REFERENCE_HOME_URL || '';
export const referenceMaxDiffRatio = Number(process.env.THEME_QA_REFERENCE_MAX_DIFF_RATIO || 0.02);
export const strictAccessibility = process.env.THEME_QA_STRICT_A11Y === '1';
export const storefrontPassword = process.env.THEME_QA_STORE_PASSWORD || process.env.SHOPIFY_FLAG_STORE_PASSWORD || '';

export const viewportGroups = {
  mobile: new Set(['mobile-390', 'mobile-430']),
  tablet: new Set(['tablet-768', 'tablet-1032']),
  desktop: new Set(['desktop-1440', 'desktop-1920'])
};

export const visualMasks = [
  '.cart-bubble',
  'iframe',
  'video',
  '[data-dynamic-content]'
];
