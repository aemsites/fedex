// Locale paths and locale-aware loading of the header/footer fragments (/{locale}/nav,
// /{locale}/footer). Metadata-independent on purpose: the locale (language-country, two-letter
// ISO codes) is the first path segment (second under /content, i.e. local aem up),
// e.g. /de-ch/home -> de-ch.

const LOCALE = /^[a-z]{2}-[a-z]{2}$/;
export const DEFAULT_LOCALE = 'en-us';

/**
 * Splits a page path into content root, locale folder and the rest.
 * @param {string} pathname e.g. /de-de/shipping/international or /content/de-de/home
 * @returns {{root: string, locale: string|null, rest: string}} root is '/content' or '';
 *   locale is null outside a locale folder; rest is '' or starts with '/'
 */
export function splitLocalePath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const root = segments[0] === 'content' ? '/content' : '';
  if (root) segments.shift();
  const locale = LOCALE.test(segments[0] || '') ? segments.shift() : null;
  return { root, locale, rest: segments.length ? `/${segments.join('/')}` : '' };
}

/**
 * The same page in another locale: /de-de/shipping -> /en-de/shipping. A locale root
 * (/de-de/) maps to the locale home.
 * @param {string} pathname page path
 * @param {string} locale target locale, e.g. 'en-de'
 * @returns {string|null} null when the page is not in a locale folder
 */
export function localizePath(pathname, locale) {
  const { root, locale: current, rest } = splitLocalePath(pathname);
  if (!current) return null;
  return `${root}/${locale}${rest || '/home'}`;
}

/**
 * Resolves the content root and locale of a page path.
 * @param {string} pathname e.g. /de-ch/home or /content/de-ch/home
 * @returns {{root: string, locale: string}} root is '/content' or ''
 */
export function resolveLocale(pathname) {
  const { root, locale } = splitLocalePath(pathname);
  return { root, locale: locale || DEFAULT_LOCALE };
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
