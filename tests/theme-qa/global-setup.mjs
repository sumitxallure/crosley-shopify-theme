import { storefrontPassword } from './config.mjs';

export default async function globalSetup(config) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) throw new Error('THEME_QA_BASE_URL is not configured.');

  let response;
  try {
    response = await fetch(baseURL, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new Error(`Theme QA could not reach ${baseURL}. Start the preview or set THEME_QA_START_COMMAND.`, {
      cause: error
    });
  }

  if (response.status === 401 && !storefrontPassword) {
    throw new Error(
      `Shopify returned HTTP 401 for ${baseURL}. Set THEME_QA_STORE_PASSWORD or SHOPIFY_FLAG_STORE_PASSWORD before running the suite.`
    );
  }
}
