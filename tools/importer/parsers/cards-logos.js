/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-logos. Base: cards (blocks/cards/README.md, variant logos). Template: banner-landing.
 * Source: https://www.fedex.com/en-us/shipping/drop-off-package.html (retailer logos:
 * FedEx Office, FedEx Ship Center, Dollar General, Walgreens, Office Depot, Walmart, Pak Mail,
 * PostalAnnex, PostNet).
 * Instance: the FIRST image-only 3-column column_control_v1 of a run (leader).
 *
 * Output: `Cards (logos)`, 1 column, one row per logo: the image, wrapped in its link when the
 * source links it (a.fxg-image-link). Logos are read row by row, column by column.
 * The following sibling logo rows (image-only column_control_v1, spacers in between) are consumed
 * into the same block and removed. The run stops at anything else, e.g. the carousel_v1 that
 * repeats the logos for mobile (.fxg-desktop--hide, removed by fedex-cleanup.js) - it is never read.
 */
const HIDDEN = '.fxg-desktop--hide';

function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && root.contains(hidden);
}

function isLogoRow(el) {
  return !!el && !!el.matches && el.matches('div.column_control_v1')
    && !!el.querySelector('img') && !el.querySelector('.title_v1, .richtext, .button_v1')
    && !el.closest('.carousel_v1');
}

function isFiller(el) {
  if (!el) return false;
  if (el.matches('div.spacer, hr, br')) return true;
  return !el.textContent.trim() && !el.querySelector('img, picture, video, iframe, a[href]');
}

function logoCell(comp, root, document) {
  const img = [...comp.querySelectorAll('.fxg-desktop-image img')].find((i) => !isHidden(i, root))
    || [...comp.querySelectorAll('img')].find((i) => !isHidden(i, root) && !(i.getAttribute('src') || '').startsWith('data:'));
  if (!img) return null;
  const ni = document.createElement('img');
  ni.src = img.src || img.getAttribute('src');
  const alt = img.getAttribute('alt');
  ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  const link = img.closest('a[href]');
  if (link && !/^\/?#?$/.test(link.getAttribute('href') || '')) {
    const a = document.createElement('a');
    a.href = link.href || link.getAttribute('href');
    a.append(ni);
    return a;
  }
  return ni;
}

export default function parse(element, { document }) {
  const rows = [element];
  let next = element.nextElementSibling;
  while (next) {
    if (isLogoRow(next)) rows.push(next);
    else if (!isFiller(next)) break;
    next = next.nextElementSibling;
  }

  const cells = [];
  const seen = new Set();
  rows.forEach((row) => {
    // every image component of the row, in column order (they may sit in nested responsivegrids)
    [...row.querySelectorAll('.image_v2')]
      .filter((comp) => !isHidden(comp, row) && !comp.parentElement.closest('.image_v2'))
      .forEach((comp) => {
        const cell = logoCell(comp, row, document);
        if (!cell) return;
        const key = (cell.querySelector ? (cell.querySelector('img') || cell) : cell).getAttribute('src');
        if (seen.has(key)) return;
        seen.add(key);
        cells.push([cell]);
      });
  });

  rows.slice(1).forEach((r) => r.remove());
  if (!cells.length) {
    element.remove();
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'Cards (logos)', cells });
  element.replaceWith(block);
}
