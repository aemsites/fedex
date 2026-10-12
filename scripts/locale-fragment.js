// Locale-aware loading of the header/footer fragments (/{locale}/nav, /{locale}/footer).
// Metadata-independent on purpose: the locale is the first path segment (second under
// /content, i.e. local aem up), e.g. /de-ch/home -> de-ch.

const LOCALE = /^[a-z]{2}-[a-z]{2}$/;
export const DEFAULT_LOCALE = 'en-us';

/**
 * Resolves the content root and locale of a page path.
 * @param {string} pathname e.g. /de-ch/home or /content/de-ch/home
 * @returns {{root: string, locale: string}} root is '/content' or ''
 */
export function resolveLocale(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const root = segments[0] === 'content' ? '/content' : '';
  const first = segments[root ? 1 : 0];
  return { root, locale: LOCALE.test(first || '') ? first : DEFAULT_LOCALE };
}

/**
 * Candidate fragment paths in fetch order: the page locale, the default locale,
 * then the legacy root fragment (deduplicated).
 * @param {string} name fragment name, e.g. 'nav' or 'footer'
 * @param {string} pathname page path
 * @returns {string[]}
 */
export function localeFragmentPaths(name, pathname) {
  const { root, locale } = resolveLocale(pathname);
  return [...new Set([
    `${root}/${locale}/${name}.plain.html`,
    `${root}/${DEFAULT_LOCALE}/${name}.plain.html`,
    `${root}/${name}.plain.html`,
  ])];
}

/** Fetches the first path that responds ok, in order. */
async function fetchFirst([path, ...rest]) {
  if (!path) return null;
  const resp = await fetch(path);
  if (resp.ok) return { html: await resp.text(), base: resp.url };
  return fetchFirst(rest);
}

/**
 * Loads the locale fragment for the current page.
 * @param {string} name fragment name, e.g. 'nav' or 'footer'
 * @param {string} [pathname] page path (defaults to the current location)
 * @returns {Promise<{html: string, base: string}|null>} html and the URL it came from
 */
export async function loadLocaleFragment(name, pathname = window.location.pathname) {
  return fetchFirst(localeFragmentPaths(name, pathname));
}
