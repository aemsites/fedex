/* eslint-disable */
/**
 * Parser: fedex.com locale header -> authored nav fragment (blocks/header schema).
 *
 * Source (header.fxg-header nav.fxg-nav, rendered):
 *   a.fxg-header__logo_wrapper > img.fxg-header__logo     logo link (alt = source alt)
 *   a.fxg-skip-to-main-content                            skip link (not on every locale)
 *   .fxg-global-nav .fxg-dropdown__item                   menus: a.fxg-dropdown-js label +
 *                                                         .fxg-dropdown__sub-menu items
 *   .fxg-user-options__sign-in                            account menu (label, icon, items)
 *   #fxg-search-header                                    search (placeholder, icon, close)
 *
 * Output (four sections, as /{locale}/nav):
 *   <div> p > a > img logo, [p > a#main skip] </div>
 *   <div> ul > li: p label + ul items </div>               menus
 *   <div> ul > li: p label + 2 icons + ul items </div>     account
 *   <div> p label, p > a(search endpoint) > img, p > img close </div>
 *
 * Menu items:
 *   link                          li > a
 *   desktop + mobile pair         li > p > a, p > a  (same label; desktop first)
 *   "all" link (fxg-link--blue)   li > strong > a
 *   tracking form                 li > p label, p > a(query endpoint ending "="), p message
 *   note (text + link)            li > text and link in source order
 * Hidden variants (cc-aem-u-display--none, e.g. the signed-in "Create a Shipment") and
 * script-only links (href "#" / javascript:, e.g. modal triggers) are skipped.
 *
 * The tracking/search endpoints are not in the markup (fedex.com scripts build them); they are
 * the URLs the source navigates to, per locale (verified on de-de and en-us):
 *   /fedextrack/?action=track&locale={ll}_{CC}&cntry_code=us&tracknumbers={value}
 *   /{locale}/search.html?cc={ll}_{cc}#q={value}
 * Icons map to the site's icon images (the source uses CSS sprites). Copy and hrefs come only
 * from the source; missing parts are omitted.
 */

const IMAGES = 'https://content.da.live/aemsites/fedex/images';

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** Visible text: text nodes only (inline SVG icons carry <style> text); <br> = space. */
function text(el) {
  if (!el) return '';
  const walker = el.ownerDocument.createTreeWalker(el, 5 /* SHOW_ELEMENT | SHOW_TEXT */);
  let out = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 1) {
      if (n.tagName === 'BR') out += ' ';
    } else if (!n.parentElement.closest('svg, style, script')) out += n.textContent;
  }
  return clean(out);
}

const el = (doc, tag, ...children) => {
  const e = doc.createElement(tag);
  e.append(...children.filter((c) => c !== null && c !== undefined && c !== ''));
  return e;
};

function link(doc, a, label = text(a)) {
  const out = doc.createElement('a');
  out.setAttribute('href', a.getAttribute('href') || '#');
  out.textContent = label;
  return out;
}

function img(doc, file, alt = '') {
  const i = doc.createElement('img');
  i.setAttribute('src', `${IMAGES}/${file}`);
  i.setAttribute('alt', alt);
  return i;
}

const hidden = (node) => !!node.closest('.cc-aem-u-display--none');
const mobileOnly = (node) => !!node.closest('.fxg-desktop--hide');
const isAll = (a) => a.classList.contains('fxg-link--blue');

/** Query endpoints the source scripts navigate to (value is appended). */
function endpoints(locale) {
  const [ll, cc] = locale.split('-');
  return {
    track: `https://www.fedex.com/fedextrack/?action=track&locale=${ll}_${cc.toUpperCase()}&cntry_code=us&tracknumbers=`,
    search: `https://www.fedex.com/${locale}/search.html?cc=${ll}_${cc}#q=`,
  };
}

/** A paragraph mixing text and links, in source order (e.g. "Open an account to save ..."). */
function mixed(doc, p) {
  const li = doc.createElement('li');
  const walk = (node) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === 3) li.append(c.textContent);
      else if (c.tagName === 'A') li.append(link(doc, c));
      else if (!/^(SVG|STYLE|SCRIPT|INPUT)$/i.test(c.tagName)) walk(c);
    });
  };
  walk(p);
  li.normalize();
  li.childNodes.forEach((c) => { if (c.nodeType === 3) c.textContent = c.textContent.replace(/\s+/g, ' '); });
  if (li.firstChild?.nodeType === 3) li.firstChild.textContent = li.firstChild.textContent.trimStart();
  if (li.lastChild?.nodeType === 3) li.lastChild.textContent = li.lastChild.textContent.trimEnd();
  return li;
}

/** Sub-menu -> ul of items (see header comment). */
function menuItems(doc, submenu, locale) {
  const ul = doc.createElement('ul');
  let last = null; // { li, label } of the previous plain link, for desktop/mobile pairs
  const nodes = [...submenu.querySelectorAll('a.fxg-link, form, p')]
    .filter((n) => !n.parentElement.closest('p, form') && !n.classList.contains('fxg-dropdown-js'));
  nodes.forEach((n) => {
    if (hidden(n)) return;
    if (n.tagName === 'FORM') {
      const label = text(n.querySelector('label'));
      const message = text(n.querySelector('.fxg-field__error_text')) || clean(n.querySelector('input[data-errmsg]')?.getAttribute('data-errmsg'));
      const button = text(n.querySelector('button[type=submit]'));
      const query = doc.createElement('a');
      query.setAttribute('href', endpoints(locale).track);
      query.textContent = button;
      ul.append(el(doc, 'li', label && el(doc, 'p', label), el(doc, 'p', query), message && el(doc, 'p', message)));
      last = null;
      return;
    }
    if (n.tagName === 'P') {
      if (!text(n)) return;
      ul.append(n.querySelector('a') ? mixed(doc, n) : el(doc, 'li', el(doc, 'p', text(n))));
      last = null;
      return;
    }
    const label = text(n);
    const href = n.getAttribute('href') || '';
    if (!label || !href) return;
    if (href === '#' || /^javascript:/i.test(href)) {
      // script-only items (e.g. en-in "Ship Manager Lite" opens an on-page modal): no destination
      console.warn(`nav: skipped "${label}" (no destination: ${href})`);
      return;
    }
    if (mobileOnly(n) && last && last.label === label) {
      // same label, small-screen destination: second paragraph of the previous item
      const first = last.li.firstChild;
      if (first.tagName === 'A') {
        const p = doc.createElement('p');
        first.replaceWith(p);
        p.append(first);
      }
      last.li.append(el(doc, 'p', link(doc, n, label)));
      last = null;
      return;
    }
    const a = link(doc, n, label);
    const li = el(doc, 'li', isAll(n) ? el(doc, 'strong', a) : a);
    ul.append(li);
    last = isAll(n) ? null : { li, label };
  });
  return ul;
}

function brandSection(doc, nav) {
  const section = doc.createElement('div');
  const logoLink = nav.querySelector('a.fxg-header__logo_wrapper');
  if (logoLink) {
    const logo = logoLink.querySelector('img');
    const a = doc.createElement('a');
    a.setAttribute('href', logoLink.getAttribute('href'));
    a.append(img(doc, 'fedex-logo.png', clean(logo?.getAttribute('alt') || logoLink.getAttribute('aria-label'))));
    section.append(el(doc, 'p', a));
  }
  const skip = nav.querySelector('a.fxg-skip-to-main-content');
  if (skip && text(skip)) {
    const a = doc.createElement('a');
    a.setAttribute('href', '#main');
    a.textContent = text(skip);
    section.append(el(doc, 'p', a));
  }
  return section;
}

function menuSection(doc, nav, locale) {
  const section = doc.createElement('div');
  const items = [...nav.querySelectorAll('.fxg-global-nav .fxg-dropdown__item')]
    .filter((item) => !item.closest('.fxg-user-options'));
  const ul = doc.createElement('ul');
  items.forEach((item) => {
    const label = text(item.querySelector('a.fxg-dropdown-js .fxg-mouse') || item.querySelector('a.fxg-dropdown-js'));
    const submenu = item.querySelector('.fxg-dropdown__sub-menu');
    if (!label || !submenu) return;
    const list = menuItems(doc, submenu, locale);
    if (list.children.length) ul.append(el(doc, 'li', el(doc, 'p', label), list));
  });
  if (ul.children.length) section.append(ul);
  return section;
}

function accountSection(doc, nav, locale) {
  const section = doc.createElement('div');
  const signIn = nav.querySelector('.fxg-user-options__sign-in');
  if (!signIn) return section;
  const trigger = signIn.querySelector('a.fxg-dropdown-js');
  const label = text(signIn.querySelector('.fxg-user-options__sign-in-text') || trigger);
  const submenu = signIn.querySelector('.fxg-dropdown__sub-menu');
  if (!label || !submenu) return section;
  const icon = trigger?.querySelector('img');
  const p = el(doc, 'p', label, ' ', img(doc, 'icon-user.png', clean(icon?.getAttribute('alt')) || label), ' ', img(doc, 'icon-user-active.png'));
  const list = menuItems(doc, submenu, locale);
  if (list.children.length) section.append(el(doc, 'ul', el(doc, 'li', p, list)));
  return section;
}

function searchSection(doc, nav, locale) {
  const section = doc.createElement('div');
  const form = nav.querySelector('#fxg-search-header');
  if (!form) return section;
  const input = form.querySelector('input[type=text], input:not([type])');
  const label = clean(input?.getAttribute('placeholder') || input?.getAttribute('aria-label'));
  if (!label) return section;
  const searchImg = form.querySelector('#fxg-search-icon img, .fxg-search-btn');
  const closeBtn = nav.querySelector('.fxg-search-close-btn');
  const a = doc.createElement('a');
  a.setAttribute('href', endpoints(locale).search);
  a.append(img(doc, 'icon-search.png', clean(searchImg?.getAttribute('alt') || form.querySelector('#fxg-search-icon')?.getAttribute('aria-label'))));
  // the header finds the query link as `:scope > p a`
  section.append(el(doc, 'p', label), el(doc, 'p', a));
  if (closeBtn) {
    const closeAlt = clean(closeBtn.querySelector('img')?.getAttribute('alt') || closeBtn.getAttribute('aria-label'));
    section.append(el(doc, 'p', img(doc, 'icon-close.png', closeAlt)));
  }
  return section;
}

/**
 * @param {Document} document source page document
 * @param {string} locale e.g. 'de-de'
 * @returns {Element|null} <main> holding the nav sections, or null without a header
 */
export default function parseNav(document, locale) {
  const nav = document.querySelector('header.fxg-header nav.fxg-nav') || document.querySelector('header nav');
  if (!nav) return null;
  const main = document.createElement('main');
  [brandSection(document, nav), menuSection(document, nav, locale), accountSection(document, nav, locale), searchSection(document, nav, locale)]
    .forEach((section) => main.append(section));
  return main;
}
