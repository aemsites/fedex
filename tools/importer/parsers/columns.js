/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns (no variant). Base: columns (blocks/columns/README.md: each row is a row of
 * columns; an image-only cell becomes an image column).
 * Template: generic-landing (nl-nl shipping tree). Runs after every other block parser, on the
 * column_control_v1 rows none of them claimed. Verified live on
 * https://www.fedex.com/nl-nl/shipping/international/send-parcel-to-uk.html (6|6 richtext),
 * dangerous-goods/how-to-ship/lithium-batteries.html (6|6 title + richtext),
 * industry-solutions/luxury-goods.html (3|3|3|3 rows: titles, then texts, then buttons),
 * signature-options.html (6|6 image + richtext), domestic.html (3|3|3|3 title + text + button).
 *
 * Output: `Columns`, one block row per source row, one cell per visible source column, so every
 * row has the same number of cells (rows only join a block when their column widths match).
 *
 * A row becomes a Columns row when at least two visible columns have content and every component
 * is plain content (richtext, title_v1, image_v2, button_v1). Everything else is left alone, so
 * it stays default content: centred single-column rows (col-sm-2 | col-sm-8 | col-sm-2), rows of
 * buttons only, rows with nested column controls, videos or forms.
 * Following sibling rows of the same shape (same column widths), separated only by spacers, join
 * the same block as further rows (luxury-goods: titles row + texts row + buttons row = one grid).
 *
 * Cell content: title_v1 -> its heading (same level), richtext -> its paragraphs/lists/headings,
 * image_v2 -> the first visible image, button_v1 -> p > a (FedEx button classes kept, so
 * fedex-cleanup.js maps them to button emphasis). .fxg-desktop--hide copies are skipped.
 */
const HIDDEN = '.fxg-desktop--hide';
const CONTENT = ['richtext', 'title_v1', 'image_v2', 'button_v1'];
const CONSUMED = 'data-columns-consumed';

const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();

function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && root.contains(hidden);
}

function visibleCols(cc) {
  return [...cc.querySelectorAll(':scope > .row > .fxg-col')].filter((c) => !isHidden(c, cc));
}

function components(col, cc) {
  return [...col.querySelectorAll(':scope > div > .aem-Grid > *')]
    .filter((x) => !x.matches('.spacer') && !isHidden(x, cc)
      && (clean(x.textContent) || x.querySelector('img')));
}

// column widths, e.g. "col-sm-6|col-sm-6"; null when the row is not a plain content grid
function shape(cc) {
  if (!cc || !cc.matches || !cc.matches('div.column_control_v1')) return null;
  const cols = visibleCols(cc);
  if (cols.length < 2) return null;
  const parts = cols.map((c) => components(c, cc));
  if (parts.filter((p) => p.length).length < 2) return null;
  const all = parts.flat();
  if (!all.every((x) => CONTENT.some((c) => x.classList.contains(c)))) return null;
  if (all.every((x) => x.classList.contains('button_v1'))) return null;
  return cols.map((c) => ([...c.classList].find((x) => x.startsWith('col-sm-')) || 'col')).join('|');
}

function isFiller(el) {
  if (!el) return false;
  if (el.matches('div.spacer')) return true;
  return !clean(el.textContent) && !el.querySelector('img, picture, video, iframe, a[href], table');
}

function image(comp, cc, document) {
  const img = [...comp.querySelectorAll('.fxg-desktop-image img')].find((i) => !isHidden(i, cc))
    || [...comp.querySelectorAll('img')].find((i) => !isHidden(i, cc));
  if (!img) return null;
  const ni = document.createElement('img');
  ni.src = img.src || img.getAttribute('src');
  const alt = img.getAttribute('alt');
  ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  return ni;
}

function cell(col, cc, document) {
  const out = [];
  components(col, cc).forEach((comp) => {
    if (comp.classList.contains('title_v1')) {
      const h = comp.querySelector('h1, h2, h3, h4, h5, h6');
      if (h && clean(h.textContent)) {
        const nh = document.createElement(h.tagName.toLowerCase());
        nh.textContent = clean(h.textContent);
        out.push(nh);
      }
    } else if (comp.classList.contains('richtext')) {
      const body = comp.querySelector('.cc-aem-c-richtext') || comp;
      [...body.children].forEach((child) => {
        if (child.matches('input') || isHidden(child, cc) || (!clean(child.textContent) && !child.querySelector('img'))) return;
        out.push(child.cloneNode(true));
      });
    } else if (comp.classList.contains('image_v2')) {
      const img = image(comp, cc, document);
      if (img) out.push(img);
    } else if (comp.classList.contains('button_v1')) {
      const a = [...comp.querySelectorAll('a[href]')].find((x) => !isHidden(x, cc) && clean(x.textContent));
      if (a) {
        const p = document.createElement('p');
        const na = document.createElement('a');
        na.href = a.href || a.getAttribute('href');
        na.textContent = clean(a.textContent);
        const cls = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'].filter((c) => a.classList.contains(c));
        if (cls.length) na.className = cls.join(' ');
        p.append(na);
        out.push(p);
      }
    }
  });
  return out.length ? out : '';
}

export default function parse(element, { document }) {
  if (element.hasAttribute(CONSUMED)) {
    element.remove();
    return;
  }
  const first = shape(element);
  if (!first) return; // not a content grid: stays default content

  const rows = [element];
  let next = element.nextElementSibling;
  while (next) {
    if (shape(next) === first) rows.push(next);
    else if (!isFiller(next)) break;
    next = next.nextElementSibling;
  }

  const cells = rows.map((row) => visibleCols(row).map((col) => cell(col, row, document)));
  rows.slice(1).forEach((row) => {
    row.setAttribute(CONSUMED, 'true');
    row.remove();
  });
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'Columns', cells }));
}
