/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-icon. Base: cards. Template: hub-landing.
 * Source: https://www.fedex.com/en-us/shipping/international.html (also shipping.html).
 *
 * Output (blocks/cards/README.md, variant icon [+ centered] [+ light]): 2 columns, 1 row per item.
 *   Cell 1 = icon image, Cell 2 = h3 heading (when the item has one), p text (inline links kept),
 *   p > a CTA (plain link -> blue text CTA; FedEx button classes are kept for fedex-cleanup.js).
 *
 * Source shapes (page-templates.json instances[]):
 * 0. `Cards (icon, centered)`: 3 columns, each an .image_v2 icon above a richtext paragraph with
 *    an inline link (international "Start here"). One row per column: icon | paragraph.
 * 1. `Cards (icon)`: 2 columns (col-sm-6), each holding one or more nested column_control_v1
 *    items (icon col-sm-2/3 + text col-sm-9/10). Items are read row-major (1st item of each
 *    column, then the 2nd, ...) so the 2-up grid keeps the source's visual rows.
 *    - Heading: <p><b>Title</b></p> (international) -> h3; or the item's link title
 *      (shipping.html jump links: .button_v1 a before the text) -> h3 > a.
 *    - Adjacent sibling instances of this shape (separated only by spacers) form one block, e.g.
 *      international "Discover global business shipping tools": 3 x 2 items -> 6 rows. Consumed
 *      siblings are removed so they are not imported twice.
 * `light`: the outer row is the #fafafa panel (.fxg-row--has-bgcolor with a non-white inline
 * background-color; the class alone counts when there is no inline style), e.g. shipping.html.
 * .fxg-desktop--hide (mobile/tablet-only) content is never copied.
 */
const CONSUMED = 'data-cards-icon-consumed';
const BUTTON_CLASSES = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'];
const HIDDEN = '.fxg-desktop--hide';

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && root.contains(hidden);
}

function cols(cc) {
  return [...cc.querySelectorAll(':scope > .row > .fxg-col')].filter((c) => !isHidden(c, cc));
}

function gridChildren(col) {
  const grid = col.querySelector(':scope > div > .aem-Grid') || col.querySelector('.aem-Grid') || col;
  return [...grid.children].filter((c) => !isHidden(c, col));
}

function isLightRow(cc) {
  const row = cc.querySelector(':scope > .row');
  if (!row || !row.classList.contains('fxg-row--has-bgcolor')) return false;
  const bg = ((row.style && row.style.backgroundColor) || '').replace(/\s+/g, '').toLowerCase();
  if (!bg) return true;
  return !/^(#fff(fff)?|white|rgb\(255,255,255\)|transparent|rgba\(0,0,0,0\))$/.test(bg);
}

// Shape 1: every visible column holds nested column_control_v1 items
function isNestedShape(cc) {
  const c = cols(cc);
  const nested = (col) => gridChildren(col).some((g) => g.matches('.column_control_v1'));
  // the last row of a run may leave its second column empty (freight: 7 items)
  const empty = (col) => !col.textContent.trim() && !col.querySelector('img');
  return c.length > 0 && c.some(nested) && c.every((col) => nested(col) || empty(col));
}

function isFiller(el) {
  if (!el) return false;
  if (el.matches('div.spacer, hr, br')) return true;
  return !el.textContent.trim() && !el.querySelector('img, picture, video, iframe, a[href]');
}

function iconCell(scope, root, document) {
  const img = scope.querySelector('.fxg-desktop-image img')
    || [...scope.querySelectorAll('.image_v2 img, img')].find((i) => !isHidden(i, root) && !(i.getAttribute('src') || '').startsWith('data:'));
  if (!img) return '';
  const ni = document.createElement('img');
  let src = img.src || img.getAttribute('src');
  // html2md turns any <img src="*.svg"> into an EDS :icon: token (pointing at a non-existent
  // /icons/*.svg); a harmless query string keeps the artwork an image (as in cards-icon-links).
  if (/\.svg$/i.test(src) && !src.includes('?')) src = `${src}?width=160`;
  ni.src = src;
  const alt = img.getAttribute('alt');
  ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  return ni;
}

function linkEl(src, document) {
  const a = document.createElement('a');
  const raw = src.getAttribute('href') || '';
  // in-page anchors stay relative (#x) so fedex-cleanup.js can rewrite them to EDS heading ids
  a.setAttribute('href', raw.startsWith('#') ? raw : (src.href || raw));
  // drop decorative children (span.lock-hide icons), keep <sup>
  const clone = normalizeSpace(src.cloneNode(true));
  clone.querySelectorAll('span.lock-hide, img, svg').forEach((n) => n.remove());
  a.innerHTML = clone.innerHTML.replace(/\s+/g, ' ').trim();
  const cls = BUTTON_CLASSES.filter((c) => src.classList.contains(c));
  if (cls.length) a.className = cls.join(' ');
  return a;
}

// Collapse source-formatting whitespace (newlines/indentation) inside inline content
function normalizeSpace(el) {
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => { n.textContent = n.textContent.replace(/\s+/g, ' '); });
  return el;
}

function isBoldOnly(p) {
  const text = clean(p.textContent);
  if (!text) return false;
  const bold = clean([...p.querySelectorAll('b, strong')].map((b) => b.textContent).join(''));
  return bold === text;
}

// Text cell of one item: walks the grid components in source order
function textCell(textCol, root, document) {
  const body = [];
  let hasHeading = false;
  gridChildren(textCol).forEach((comp) => {
    if (comp.matches('.title_v1')) {
      const h = [...comp.querySelectorAll('h1, h2, h3, h4, h5, h6')].find((el) => !isHidden(el, root));
      if (h && clean(h.textContent)) {
        const h3 = document.createElement('h3');
        h3.textContent = clean(h.textContent);
        body.push(h3);
        hasHeading = true;
      }
    } else if (comp.matches('.richtext')) {
      [...comp.querySelectorAll('p')].forEach((p) => {
        if (isHidden(p, root) || !p.textContent.replace(/ /g, ' ').trim()) return;
        if (!body.length && isBoldOnly(p)) {
          const h3 = document.createElement('h3');
          h3.textContent = clean(p.textContent);
          body.push(h3);
          hasHeading = true;
          return;
        }
        const np = document.createElement('p');
        np.innerHTML = normalizeSpace(p.cloneNode(true)).innerHTML.replace(/(&nbsp;|\s)+$/g, '').trim();
        np.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
        body.push(np);
      });
    } else if (comp.matches('.button_v1')) {
      const src = [...comp.querySelectorAll('a[href]')].find((a) => !isHidden(a, root) && clean(a.textContent));
      if (!src) return;
      if (!body.length && !hasHeading) {
        // link title leading the item (jump-link grid) -> linked heading
        const h3 = document.createElement('h3');
        h3.append(linkEl(src, document));
        body.push(h3);
        hasHeading = true;
      } else {
        const p = document.createElement('p');
        p.append(linkEl(src, document));
        body.push(p);
      }
    }
  });
  return body;
}

// Shape 0: icon + text in the same column
function rowsCentered(cc, document) {
  return cols(cc).map((col) => {
    const icon = iconCell(col, cc, document);
    const body = textCell(col, cc, document);
    if (!icon && !body.length) return null;
    return [icon, body.length ? body : ''];
  }).filter(Boolean);
}

// Shape 1: nested items, read row-major across the columns
function rowsNested(cc, document) {
  const perCol = cols(cc).map((col) => gridChildren(col).filter((g) => g.matches('.column_control_v1')));
  const rows = [];
  const max = Math.max(0, ...perCol.map((l) => l.length));
  for (let i = 0; i < max; i += 1) {
    perCol.forEach((list) => {
      const item = list[i];
      if (!item) return;
      const itemCols = cols(item);
      const iconCol = itemCols.find((c) => c.querySelector('.image_v2') && !c.querySelector('.richtext, .button_v1, .title_v1'));
      const textCol = itemCols.find((c) => c !== iconCol) || item;
      const icon = iconCol ? iconCell(iconCol, item, document) : '';
      const body = textCell(textCol, item, document);
      if (!icon && !body.length) return;
      rows.push([icon, body.length ? body : '']);
    });
  }
  return rows;
}

export default function parse(element, { document }) {
  if (element.hasAttribute(CONSUMED)) {
    element.remove();
    return;
  }

  const nested = isNestedShape(element);
  const light = isLightRow(element);
  const items = [element];
  if (nested) {
    let next = element.nextElementSibling;
    while (next) {
      if (next.matches('div.column_control_v1') && isNestedShape(next) && isLightRow(next) === light) {
        items.push(next);
      } else if (!isFiller(next)) {
        break;
      }
      next = next.nextElementSibling;
    }
  }

  const cells = [];
  items.forEach((cc) => cells.push(...(nested ? rowsNested(cc, document) : rowsCentered(cc, document))));
  if (!cells.length) {
    element.remove();
    return;
  }

  items.slice(1).forEach((cc) => {
    cc.setAttribute(CONSUMED, 'true');
    cc.remove();
  });

  const variants = ['icon'];
  if (!nested) variants.push('centered');
  if (light) variants.push('light');
  const block = WebImporter.Blocks.createBlock(document, { name: `Cards (${variants.join(', ')})`, cells });
  element.replaceWith(block);
}
