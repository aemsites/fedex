/* eslint-disable */
/**
 * Parser: fedex.com locale footer -> authored footer fragment (blocks/footer schema).
 *
 * Source (footer.fxg-footer, verified on all 12 imported locales):
 *   .fxg-footer__primary  .fxg-title columns + links (document order), optional nested
 *                         .fxg-col sub-columns (en-us/es-us "Our Company"); an empty titled
 *                         column ("Sprache", "Language", "Idioma", "Langue", "Preferences")
 *                         heads .languagenavigation_v1 (country .icon_link a + .dropdown-item list)
 *   .fxg-footer__social   .fxg-title + a.fxg-icon--{network} (or fxg-icon--custom + img)
 *   .fxg-copyright        .fxg-title "© FedEx 1995-YYYY" + legal links
 *
 * Output (three sections, as /footer):
 *   <div> h2 + ul(s) per column ... [h2 locale title] p>a(globe img + country) [p label] ul languages </div>
 *   <div> h2 social title, ul li a > img(icon, alt) </div>
 *   <div> p copyright, ul legal links </div>
 *
 * Copy, hrefs, link order and optional parts come only from the source; missing parts
 * (no locale title, no language label, no legal links) are omitted.
 */

const IMAGES = 'https://content.da.live/aemsites/fedex/images';

// social network (source icon class / custom icon name) -> site icon + brand name
const SOCIAL = {
  email: { icon: 'email.svg', name: '' },
  facebook: { icon: 'facebook.svg', name: 'Facebook' },
  twitter: { icon: 'x.svg', name: 'X' },
  x: { icon: 'x.svg', name: 'X' },
  instagram: { icon: 'instagram.svg', name: 'Instagram' },
  linkedin: { icon: 'linkedin.svg', name: 'LinkedIn' },
  youtube: { icon: 'youtube.svg', name: 'YouTube' },
  pinterest: { icon: 'pinterest.svg', name: 'Pinterest' },
  whatsapp: { icon: 'whatsapp.svg', name: 'WhatsApp' },
};

/** Visible link text: text nodes only (inline SVG icons carry <style> text); <br> = space. */
function linkText(a) {
  const doc = a.ownerDocument;
  const walker = doc.createTreeWalker(a, 5 /* NodeFilter.SHOW_ELEMENT | SHOW_TEXT */);
  let text = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 1) {
      if (n.tagName === 'BR') text += ' ';
    } else if (!n.parentElement.closest('svg, style, script')) text += n.textContent;
  }
  return text.replace(/\s+/g, ' ').trim();
}

const clean = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

function link(doc, a, text = linkText(a)) {
  const out = doc.createElement('a');
  out.setAttribute('href', a.getAttribute('href') || '#');
  out.textContent = text;
  return out;
}

function img(doc, file, alt = '') {
  const el = doc.createElement('img');
  el.setAttribute('src', `${IMAGES}/${file}`);
  el.setAttribute('alt', alt);
  return el;
}

function list(doc, items) {
  const ul = doc.createElement('ul');
  items.forEach((child) => {
    const li = doc.createElement('li');
    li.append(child);
    ul.append(li);
  });
  return ul;
}

function heading(doc, text) {
  const h = doc.createElement('h2');
  h.textContent = text;
  return h;
}

function para(doc, ...children) {
  const p = doc.createElement('p');
  p.append(...children);
  return p;
}

/** Link-column groups in document order: { title, columns: [[a, ...], ...] }. */
function readColumns(primary) {
  const groups = [];
  let current = null;
  primary.querySelectorAll('.fxg-title, a').forEach((el) => {
    if (el.closest('.languagenavigation_v1')) return;
    if (el.matches('.fxg-title')) {
      current = { title: clean(el), links: [] };
      groups.push(current);
    } else if (current && el.getAttribute('href')) {
      current.links.push(el);
    }
  });
  return groups.map((g) => {
    // sub-columns = consecutive links sharing the same nearest .fxg-col
    const columns = [];
    let col = null;
    g.links.forEach((a) => {
      const parent = a.closest('.fxg-col');
      if (!col || col.parent !== parent) {
        col = { parent, links: [] };
        columns.push(col);
      }
      col.links.push(a);
    });
    return { title: g.title, columns: columns.map((c) => c.links) };
  });
}

function buildLinkSection(doc, footer) {
  const primary = footer.querySelector('.fxg-footer__primary');
  const section = doc.createElement('div');
  if (!primary) return section;

  let localeTitle = '';
  readColumns(primary).forEach(({ title, columns }) => {
    if (!columns.length) {
      localeTitle = title; // empty titled column = heading of the language column
      return;
    }
    section.append(heading(doc, title));
    columns.forEach((links) => section.append(list(doc, links.map((a) => {
      const out = link(doc, a);
      // US privacy-choices link carries the CCPA opt-out icon (inline SVG on the source)
      if (a.querySelector('svg') && /privacyportal|privacy choices/i.test(`${a.getAttribute('href')} ${out.textContent}`)) {
        out.append(' ', img(doc, 'privacy-choices.svg'));
      }
      return out;
    }))));
  });

  const nav = primary.querySelector('.languagenavigation_v1');
  if (nav) {
    if (localeTitle) section.append(heading(doc, localeTitle));
    const country = nav.querySelector('.icon_link a');
    if (country) {
      const a = link(doc, country);
      a.prepend(img(doc, 'globe.svg'));
      section.append(para(doc, a));
    }
    const items = [...nav.querySelectorAll('.dropdown-item')].filter((a) => a.getAttribute('href'));
    if (items.length) {
      const label = clean({ textContent: nav.querySelector('.dropdown-toggle')?.getAttribute('aria-label') || '' });
      if (label) section.append(para(doc, label));
      section.append(list(doc, items.map((a) => link(doc, a))));
    }
  }
  return section;
}

function socialKey(a) {
  const cls = (String(a.className).match(/fxg-icon--([a-z0-9-]+)/) || [])[1];
  if (cls && cls !== 'custom') return cls;
  const hint = `${a.querySelector('[data-analytics]')?.getAttribute('data-analytics') || ''} ${a.getAttribute('aria-label') || ''}`;
  return Object.keys(SOCIAL).find((k) => new RegExp(`\\b${k}\\b`, 'i').test(hint)) || '';
}

function buildSocialSection(doc, footer) {
  const social = footer.querySelector('.fxg-footer__social');
  const section = doc.createElement('div');
  if (!social) return section;
  const title = clean(social.querySelector('.fxg-title'));
  if (title) section.append(heading(doc, title));
  const items = [];
  social.querySelectorAll('a[href]').forEach((a) => {
    const key = socialKey(a);
    const net = SOCIAL[key];
    if (!net) {
      console.warn(`footer: unknown social network for ${a.getAttribute('href')}`);
      return;
    }
    const label = clean({ textContent: a.getAttribute('aria-label') || '' });
    const out = doc.createElement('a');
    out.setAttribute('href', a.getAttribute('href'));
    out.append(img(doc, net.icon, label || net.name));
    items.push(out);
  });
  if (items.length) section.append(list(doc, items));
  return section;
}

function buildLegalSection(doc, footer) {
  const legal = footer.querySelector('.fxg-copyright');
  const section = doc.createElement('div');
  if (!legal) return section;
  legal.querySelectorAll('.fxg-title').forEach((t) => {
    const text = clean(t);
    if (text) section.append(para(doc, text));
  });
  const links = [...legal.querySelectorAll('a[href]')].filter((a) => linkText(a));
  if (links.length) section.append(list(doc, links.map((a) => link(doc, a))));
  return section;
}

/**
 * @param {Document} document source page document
 * @returns {Element|null} <main> holding the three footer sections, or null without a footer
 */
export default function parseFooter(document) {
  const footer = document.querySelector('footer.fxg-footer') || document.querySelector('footer');
  if (!footer) return null;
  const main = document.createElement('main');
  [buildLinkSection, buildSocialSection, buildLegalSection]
    .map((build) => build(document, footer))
    .filter((section) => section.children.length)
    .forEach((section) => main.append(section));
  return main;
}
