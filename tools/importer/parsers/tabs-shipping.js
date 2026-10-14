/* eslint-disable */
/* global WebImporter */
/**
 * Parser for tabs-shipping. Base: tabs. Source: https://www.fedex.com/en-us/home.html
 * Instance: div.fxg-hero__header > ul.fxg-cube-container
 *
 * Output (matches blocks/tabs-shipping/tabs-shipping.js, 2 columns, 1 row per tab):
 *   Cell 1 = icon + tab label (bold = default active tab, i.e. li.fxg-cube--active)
 *   Cell 2 = panel content: list of quick links and/or paragraph + CTA link.
 *            A link to /fedextrack/ is turned into the tracking form by the block.
 *
 * Panels come from the sibling div.fxg-app-container#{liId}-tab elements in
 * div.fxg-hero_homepage. The panels are client-rendered apps; when their quick links
 * are missing from the DOM, the known links (block README) are used as a fallback.
 * Consumed fxg-app-container elements are removed so their text does not leak.
 */
const ORIGIN = 'https://www.fedex.com';

const FALLBACK_LINKS = {
  rate: [
    ['Get a quote', '/en-us/online/rating.html'],
    ['Ship now', 'https://www.fedex.com/en-us/shipping/ship-manager/login.html'],
  ],
  locations: [
    ['FedEx locations', 'https://local.fedex.com/en-us'],
    ['Contact support', '/en-us/customer-support.html'],
  ],
};
const TAB_ICONS = { rate: 'rate-ship', track: 'track', locations: 'locations' };
const TRACK_URL = 'https://www.fedex.com/fedextrack/';
const TRACK_HINT = 'Enter a FedEx tracking number to review shipping details.';

function absolute(href) {
  try {
    return new URL(href, ORIGIN).href;
  } catch (e) {
    return href;
  }
}

function tabKey(label, panel) {
  const t = label.toLowerCase();
  if (/track/.test(t) || (panel && panel.querySelector('.tracking_module_v1, .fxg-tracking-module'))) return 'track';
  if (/location/.test(t) || (panel && panel.querySelector('.locations_app, .fxg-app__location'))) return 'locations';
  if (/rate|ship/.test(t) || (panel && panel.querySelector('.rate_ship_app, .fxg-app__rate-ship'))) return 'rate';
  return 'other';
}

function linkList(document, pairs) {
  const ul = document.createElement('ul');
  pairs.forEach(([text, href]) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = absolute(href);
    a.textContent = text;
    li.append(a);
    ul.append(li);
  });
  return ul;
}

function panelLinks(panel) {
  if (!panel) return [];
  const seen = new Set();
  return [...panel.querySelectorAll('a[href]')]
    .filter((a) => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent.replace(/\s+/g, ' ').trim();
      if (!text || /^(tel:|mailto:|javascript:|#)/i.test(href) || href === '/#') return false;
      const key = `${text}|${href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((a) => [a.textContent.replace(/\s+/g, ' ').trim(), a.getAttribute('href')]);
}

// Locale of the imported page (/nl-nl/home.html -> nl-nl); en-us keeps the FALLBACK_LINKS above.
function pageLocale(document, url, params) {
  let path = '';
  try { path = new URL((params && params.originalURL) || url || document.URL).pathname; } catch (e) { /* none */ }
  const m = path.match(/^\/([a-z]{2})-([a-z]{2})\//i);
  return m ? { locale: `${m[1]}-${m[2]}`.toLowerCase(), lang: m[1].toLowerCase(), country: m[2].toUpperCase() } : null;
}

// Tab content cell for other locales (generic-landing, nl-nl/home; each row stays tab label | tab
// content): the panels are client-side apps with no authored links, and the en-us fallbacks would
// put English links on the page. Only links verified for the locale are used instead: the rating
// app page, and the "FedEx locaties" locator URL of the locale's footer, labelled with the panel's
// own button ("Vind locatie") or the tab label.
function localeFallback(key, loc, label, panel) {
  if (key === 'rate') return [[label, `/${loc.locale}/online/rating.html`]];
  if (key === 'locations') {
    const button = panel && panel.querySelector('form button, button');
    const text = (button && button.textContent.replace(/\s+/g, ' ').trim()) || label;
    return [[text, `https://www.fedex.com/locate/index.html?locale=${loc.lang}_${loc.country}`]];
  }
  return [];
}

export default function parse(element, { document, url, params }) {
  const loc = pageLocale(document, url, params);
  const localized = !!(loc && loc.locale !== 'en-us');
  const hero = element.closest('.fxg-hero_homepage, .fxg-hero') || element.parentElement?.parentElement;
  const items = [...element.querySelectorAll(':scope > li')];
  if (!items.length) {
    element.remove();
    return;
  }

  const consumed = new Set();
  const cells = [];

  items.forEach((li, index) => {
    const textEl = li.querySelector('.fxg-cube__text') || li.querySelector('button, a') || li;
    const label = textEl.textContent.replace(/\s+/g, ' ').trim();
    if (!label) return;

    // Panel: #{liId}-tab, fallback to the n-th fxg-app-container in the hero
    let panel = null;
    if (hero && li.id) panel = hero.querySelector(`[id="${li.id}-tab"]`);
    if (!panel && hero) panel = hero.querySelectorAll('.fxg-app-container')[index] || null;
    if (panel) consumed.add(panel);

    const key = tabKey(label, panel);
    const isActive = li.classList.contains('fxg-cube--active')
      || (panel && panel.classList.contains('fxg-app--active'));

    // Label cell: Title-case the source's uppercase labels (TRACK -> Track)
    // (other locales: sentence case - "TARIEVEN & TRANSITTIJDEN" -> "Tarieven & transittijden")
    let niceLabel = label;
    if (label === label.toUpperCase()) {
      niceLabel = localized
        ? label.charAt(0) + label.slice(1).toLowerCase()
        : label.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
    const labelCell = document.createElement('p');
    // Icon in the label itself (:rate-ship:, :track:, :locations: -> /icons/*.svg)
    if (TAB_ICONS[key]) labelCell.append(`:${TAB_ICONS[key]}: `);
    if (isActive) {
      const strong = document.createElement('strong');
      strong.textContent = niceLabel;
      labelCell.append(strong);
    } else {
      labelCell.append(niceLabel);
    }

    // Panel cell
    const panelCell = [];
    if (key === 'track') {
      const hintEl = panel && panel.querySelector('.fxg-field__hint_text');
      // the English hint is an en-us fallback only; other locales keep their own hint, if any
      const hintText = (hintEl && hintEl.textContent.trim()) || (localized ? '' : TRACK_HINT);
      if (hintText) {
        const hint = document.createElement('p');
        hint.textContent = hintText;
        panelCell.push(hint);
      }
      const form = panel && panel.querySelector('form[action*="fedextrack"]');
      const button = panel && panel.querySelector('form button, button');
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = form ? absolute(form.getAttribute('action')) : TRACK_URL;
      a.textContent = (button && button.textContent.replace(/\s+/g, ' ').trim()) || (localized ? niceLabel : 'Track');
      p.append(a);
      panelCell.push(p);
    } else {
      let links = panelLinks(panel);
      if (!links.length && localized) links = localeFallback(key, loc, niceLabel, panel);
      else if (!links.length && FALLBACK_LINKS[key]) links = FALLBACK_LINKS[key];
      if (links.length) panelCell.push(linkList(document, links));
    }

    cells.push([labelCell, panelCell.length ? panelCell : '']);
  });

  // Remove consumed panels (and any other app containers in the hero) so nothing leaks
  if (hero) hero.querySelectorAll('.fxg-app-container').forEach((c) => consumed.add(c));
  consumed.forEach((c) => c.remove());

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-shipping', cells });
  element.replaceWith(block);
}
