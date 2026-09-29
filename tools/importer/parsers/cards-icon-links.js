/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-icon-links. Base: cards. Source: https://www.fedex.com/en-us/home.html
 * Instance: div.advanced_table_v1
 *
 * Output (matches blocks/cards/cards.js, variant icon-links): 2 columns, 1 row per item.
 *   Cell 1 = icon image, Cell 2 = paragraph with a single (plain) link.
 * Uses the desktop copy (table.large-only); the small-only / mobile tables are ignored.
 * Iterates the table cells (th/td), not the anchors, and takes the desktop image rendition.
 */
export default function parse(element, { document }) {
  const table = element.querySelector('table.large-only')
    || element.querySelector('table:not(.small-only)')
    || element.querySelector('table');
  // banner-landing (service-guide quick links, drop-off 4-up anchor links): a column_control_v1
  // whose columns each hold an icon (.image_v2) and a link (.button_v1); one item per visible column
  const isGrid = !table && element.matches('.column_control_v1');
  if (!table && !isGrid) {
    element.remove();
    return;
  }

  let units;
  if (isGrid) {
    const hidden = (el) => { const h = el.closest('.fxg-desktop--hide'); return !!h && element.contains(h); };
    units = [...element.querySelectorAll(':scope > .row > .fxg-col')]
      .filter((c) => !hidden(c) && c.querySelector('.button_v1 a[href]'));
  } else {
    units = [...table.querySelectorAll(':scope > thead > tr > th, :scope > thead > tr > td, :scope > tbody > tr > th, :scope > tbody > tr > td')];
    // Fallback: the table-cell structure was rewritten - iterate the image+link grids instead
    if (!units.length) units = [...table.querySelectorAll('.aem-Grid')].filter((g) => g.querySelector('.button_v1 a, a.fxg-link'));
  }

  const cells = [];
  const seen = new Set();
  units.forEach((unit) => {
    const img = (isGrid && [...unit.querySelectorAll('.fxg-desktop-image img')].find((i) => !i.closest('.fxg-desktop--hide')))
      || unit.querySelector('.fxg-desktop-image img')
      || unit.querySelector('.image_v2 img, img');
    const srcLink = unit.querySelector('.button_v1 a[href], a.fxg-link[href]')
      || [...unit.querySelectorAll('a[href]')].find((a) => a.textContent.trim());
    if (!img && !srcLink) return;

    const href = srcLink ? srcLink.getAttribute('href') : null;
    if (href && seen.has(href)) return; // guard against duplicated renditions
    if (href) seen.add(href);

    let imgCell = '';
    if (img) {
      const icon = document.createElement('img');
      // Absolute URL. SVGs under an ".../icons/" path would be converted by html2md into an
      // EDS :icon: token (pointing at a non-existent /icons/*.svg), so keep them as images
      // by adding a harmless query string.
      let src = img.src || img.getAttribute('src');
      if (/icons\/.*\.svg$/i.test(src.split('?')[0]) && !src.includes('?')) src = `${src}?width=160`;
      icon.src = src;
      icon.alt = img.getAttribute('alt') && img.getAttribute('alt') !== 'null' ? img.getAttribute('alt') : '';
      imgCell = icon;
    }

    let textCell = '';
    if (srcLink) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      // in-page anchors (drop-off #packagedropoff) stay relative for the jump-link rewrite
      if (href && href.startsWith('#')) a.setAttribute('href', href);
      else a.href = srcLink.href || href;
      // <br> inside the label ("Service<br>alerts") becomes a space
      a.textContent = [...srcLink.childNodes]
        .map((n) => (n.nodeName === 'BR' ? ' ' : n.textContent))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      p.append(a);
      textCell = p;
    }
    cells.push([imgCell, textCell]);
  });

  if (!cells.length) {
    element.remove();
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards (icon-links)', cells });
  element.replaceWith(block);
}
