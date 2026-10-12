// Locale fragment resolution used by the header (/{locale}/nav) and footer (/{locale}/footer).
// Run: npm test (node:test, no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LOCALE,
  splitLocalePath,
  localizePath,
  resolveLocale,
  localeFragmentPaths,
  loadLocaleFragment,
} from '../scripts/locale-fragment.js';

test('splits root, locale and the rest of a page path', () => {
  assert.deepEqual(splitLocalePath('/de-de/shipping/international'), { root: '', locale: 'de-de', rest: '/shipping/international' });
  assert.deepEqual(splitLocalePath('/content/en-de/home'), { root: '/content', locale: 'en-de', rest: '/home' });
  assert.deepEqual(splitLocalePath('/de-de/'), { root: '', locale: 'de-de', rest: '' });
  assert.deepEqual(splitLocalePath('/docs/library/blocks/cards'), { root: '', locale: null, rest: '/docs/library/blocks/cards' });
  assert.deepEqual(splitLocalePath('/de/home'), { root: '', locale: null, rest: '/de/home' });
});

test('localizes a page path: same page in another language-country', () => {
  assert.equal(localizePath('/de-de/shipping/international', 'en-de'), '/en-de/shipping/international');
  assert.equal(localizePath('/en-us/shipping/drop-off-package', 'es-us'), '/es-us/shipping/drop-off-package');
  assert.equal(localizePath('/content/fr-ch/home', 'it-ch'), '/content/it-ch/home');
  assert.equal(localizePath('/de-de', 'en-de'), '/en-de/home');
  assert.equal(localizePath('/docs/library/blocks/cards', 'es-us'), null);
});

test('resolves the locale from the first path segment', () => {
  assert.deepEqual(resolveLocale('/de-ch/home'), { root: '', locale: 'de-ch' });
  assert.deepEqual(resolveLocale('/fr-ca/shipping/drop-off-package'), { root: '', locale: 'fr-ca' });
  assert.deepEqual(resolveLocale('/es-mx'), { root: '', locale: 'es-mx' });
});

test('resolves the locale under /content (local aem up)', () => {
  assert.deepEqual(resolveLocale('/content/en-gb/home'), { root: '/content', locale: 'en-gb' });
  assert.deepEqual(resolveLocale('/content/index'), { root: '/content', locale: DEFAULT_LOCALE });
});

test('defaults to en-us for non-locale paths', () => {
  ['/', '', '/index', '/docs/page', '/de/home', '/DE-CH/home', '/de-ch-x/home'].forEach((path) => {
    assert.equal(resolveLocale(path).locale, 'en-us', path);
  });
});

test('fragment paths: locale, then en-us, then legacy root', () => {
  assert.deepEqual(localeFragmentPaths('footer', '/de-ch/home'), [
    '/de-ch/footer.plain.html',
    '/en-us/footer.plain.html',
    '/footer.plain.html',
  ]);
  assert.deepEqual(localeFragmentPaths('nav', '/content/fr-fr/home'), [
    '/content/fr-fr/nav.plain.html',
    '/content/en-us/nav.plain.html',
    '/content/nav.plain.html',
  ]);
});

test('fragment paths are deduplicated for the default locale', () => {
  assert.deepEqual(localeFragmentPaths('footer', '/en-us/home'), [
    '/en-us/footer.plain.html',
    '/footer.plain.html',
  ]);
  assert.deepEqual(localeFragmentPaths('nav', '/docs/page'), [
    '/en-us/nav.plain.html',
    '/nav.plain.html',
  ]);
});

/** Mocks fetch with the given existing paths; records requested paths. */
function mockFetch(existing) {
  const requested = [];
  global.fetch = async (path) => {
    requested.push(path);
    const ok = existing.includes(path);
    return { ok, url: `https://example.test${path}`, text: async () => `<div>${path}</div>` };
  };
  return requested;
}

test('loads the locale fragment when it exists', async () => {
  const requested = mockFetch(['/de-ch/footer.plain.html', '/en-us/footer.plain.html', '/footer.plain.html']);
  const data = await loadLocaleFragment('footer', '/de-ch/home');
  assert.equal(data.html, '<div>/de-ch/footer.plain.html</div>');
  assert.equal(data.base, 'https://example.test/de-ch/footer.plain.html');
  assert.deepEqual(requested, ['/de-ch/footer.plain.html']);
});

test('falls back to en-us when the locale fragment is missing', async () => {
  const requested = mockFetch(['/en-us/footer.plain.html', '/footer.plain.html']);
  const data = await loadLocaleFragment('footer', '/it-ch/home');
  assert.equal(data.base, 'https://example.test/en-us/footer.plain.html');
  assert.deepEqual(requested, ['/it-ch/footer.plain.html', '/en-us/footer.plain.html']);
});

test('falls back to the legacy root fragment, then null', async () => {
  let requested = mockFetch(['/content/nav.plain.html']);
  const data = await loadLocaleFragment('nav', '/content/es-us/home');
  assert.equal(data.base, 'https://example.test/content/nav.plain.html');
  assert.deepEqual(requested, [
    '/content/es-us/nav.plain.html',
    '/content/en-us/nav.plain.html',
    '/content/nav.plain.html',
  ]);

  requested = mockFetch([]);
  assert.equal(await loadLocaleFragment('footer', '/es-us/home'), null);
  assert.equal(requested.length, 3);
});
