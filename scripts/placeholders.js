import { toCamelCase } from './aem.js';
import { DEFAULT_LOCALE, resolveLocale } from './locale-fragment.js';

const sheets = new Map();

async function loadSheet(path) {
  if (!sheets.has(path)) {
    const pending = (async () => {
      const response = await fetch(path);
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Failed to load placeholders from ${path}: HTTP ${response.status}`);
      }
      const json = await response.json();
      if (!Array.isArray(json?.data)) {
        throw new Error(`Invalid placeholders sheet at ${path}: expected a data array`);
      }
      const entries = json.data.map((row, index) => {
        if (
          !row
          || typeof row.Key !== 'string'
          || !toCamelCase(row.Key)
          || typeof row.Text !== 'string'
        ) {
          throw new Error(`Invalid placeholders row ${index + 1} at ${path}: expected Key and Text`);
        }
        return [toCamelCase(row.Key), row.Text];
      });
      return Object.freeze(Object.fromEntries(entries));
    })();
    sheets.set(path, pending);
    // Failed requests can be retried; successful requests (including 404s) are cached.
    pending.catch(() => sheets.delete(path));
  }
  return sheets.get(path);
}

/**
 * Loads locale placeholders, with en-us values for keys missing from the locale sheet.
 * Sheets use Key/Text columns; keys are normalized to camelCase.
 * @param {string} [pathname] Page path (defaults to the current location).
 * @returns {Promise<Readonly<Record<string, string>>>} Translated labels.
 */
// eslint-disable-next-line import/prefer-default-export
export async function fetchPlaceholders(pathname = window.location.pathname) {
  const { root, locale } = resolveLocale(pathname);
  const defaultPath = `${root}/${DEFAULT_LOCALE}/placeholders.json`;
  const localePath = `${root}/${locale}/placeholders.json`;
  const [defaults, localized] = await Promise.all([
    loadSheet(defaultPath),
    loadSheet(localePath),
  ]);
  if (!defaults) {
    throw new Error(`Missing default placeholders sheet at ${defaultPath}`);
  }
  if (!localized) {
    // eslint-disable-next-line no-console
    console.warn(`Missing placeholders sheet at ${localePath}; using ${defaultPath}`);
  }
  return Object.freeze({ ...defaults, ...localized });
}
