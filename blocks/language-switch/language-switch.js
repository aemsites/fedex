// Language switch: a dropdown (as on the source) of every language of the page's country, each
// linking to the same page in that language (/de-de/shipping -> /en-de/shipping). Authored as
// language links, one per row, e.g. [Deutsch](https://www.fedex.com/de-de/home.html); the link
// text is the label and the first path segment (language-country) is the locale. Where the
// same page doesn't exist in a language, the link falls back to that language's home, then to
// the authored link. An optional data-labelledby (heading id) names the control.

import { splitLocalePath, localizePath } from '../../scripts/locale-fragment.js';

let uid = 0;

/** Locale of an authored link (first path segment), or null. */
function linkLocale(a) {
  try {
    return splitLocalePath(new URL(a.href, window.location.href).pathname).locale;
  } catch {
    return null;
  }
}

async function exists(path) {
  try {
    const resp = await fetch(path, { method: 'HEAD' });
    return resp.ok;
  } catch {
    return false;
  }
}

/** First candidate path that exists on this site, else the fallback. */
async function firstExisting([path, ...rest], fallback) {
  if (!path) return fallback;
  if (await exists(path)) return path;
  return firstExisting(rest, fallback);
}

/** The same page in the given locale, else its home, else the authored link. */
function resolveTarget(locale, authored) {
  const here = window.location.pathname;
  const samePage = localizePath(here, locale);
  // pages outside a locale folder (e.g. /docs) have no counterpart
  if (!samePage) return Promise.resolve(authored);
  const { root } = splitLocalePath(here);
  return firstExisting([...new Set([samePage, `${root}/${locale}/home`])], authored);
}

/**
 * loads and decorates the language switch
 * @param {Element} block The language-switch block element
 */
export default async function decorate(block) {
  const { locale: current } = splitLocalePath(window.location.pathname);
  const entries = [...block.querySelectorAll('a[href]')]
    .map((a) => ({ a, locale: linkLocale(a) }))
    .filter(({ a, locale }) => locale && a.textContent.trim());

  // the authored list is per country; keep the page's country if it is listed
  const country = current?.split('-')[1];
  const sameCountry = entries.filter(({ locale }) => locale.split('-')[1] === country);
  const shown = sameCountry.length ? sameCountry : entries;

  const list = document.createElement('ul');
  list.className = 'language-switch-list';
  await Promise.all(shown.map(async ({ a, locale }) => {
    const [language, region] = locale.split('-');
    const link = document.createElement('a');
    link.textContent = a.textContent.trim();
    link.lang = language;
    link.hreflang = `${language}-${region.toUpperCase()}`;
    const li = document.createElement('li');
    li.append(link);
    list.append(li);
    if (locale === current) {
      link.href = window.location.pathname;
      link.setAttribute('aria-current', 'true');
      li.classList.add('language-switch-current');
    } else {
      link.href = await resolveTarget(locale, a.href);
    }
  }));
  if (!list.children.length) return;

  // dropdown as on the source: a button showing the current language, the list below it
  uid += 1;
  list.id = `language-switch-list-${uid}`;
  const currentLink = list.querySelector('[aria-current]') || list.querySelector('a');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'language-switch-trigger';
  button.setAttribute('aria-controls', list.id);
  const value = document.createElement('span');
  value.className = 'language-switch-value';
  value.id = `language-switch-value-${uid}`;
  value.textContent = currentLink.textContent;
  value.lang = currentLink.lang;
  button.append(value);
  // named by the column heading (e.g. "Sprache: Deutsch") when the footer provides one
  const { labelledby } = block.dataset;
  if (labelledby) {
    button.setAttribute('aria-labelledby', `${labelledby} ${value.id}`);
    list.setAttribute('aria-labelledby', labelledby);
  }

  const toggle = (open) => {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    list.hidden = !open;
  };
  toggle(false);
  button.addEventListener('click', () => toggle(button.getAttribute('aria-expanded') !== 'true'));
  block.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || button.getAttribute('aria-expanded') !== 'true') return;
    toggle(false);
    button.focus();
  });
  block.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !block.contains(e.relatedTarget)) toggle(false);
  });
  document.addEventListener('click', (e) => {
    if (!block.contains(e.target)) toggle(false);
  });

  block.replaceChildren(button, list);
}
