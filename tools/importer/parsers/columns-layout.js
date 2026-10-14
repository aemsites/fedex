/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-layout. Base: columns (blocks/columns/README.md). Template: generic-landing.
 * Instance: .column_control_v1[data-fedex-block="columns-layout"], tagged by
 * transformers/fedex-landing.js with data-fedex-kind.
 *
 * Output follows the library Columns convention: one block row holding one cell per source
 * column (cells side by side, as on the source page; no nested blocks).
 * - kind `divided` (freight-services "Hoe verzendt u uw vracht | Wat kan ik verzenden?"): two
 *   columns, each a title above nested icon rows. `Columns (divided)`, each cell: ### title, then
 *   the rows as a list - numbered-icon rows (Purple_Number_N) become an ordered list (the block
 *   draws the circled numbers), other icon rows a bulleted list whose items keep their icon.
 * - kind `one-third` (freight-services "Wij maken vrachtvervoer eenvoudiger dan u denkt"):
 *   col-sm-4 image | col-sm-8 text. `Columns (one-third)`: image | heading, text, list.
 * - kind `centered` (shipping.html purple band "Bereken uw tarieven / Open een account / Vraag
 *   een ophaling aan", desktop rows merged per column by the transformer): `Columns (centered)`,
 *   each cell: heading (source level), text, CTA link.
 */
import {
  columns, components, copyAs, image, isHidden, textContent,
} from '../utils/components.js';

const NUMBER_ICON = /Number_\d+_Icon/i;

// one nested icon row (icon col | text col) -> <li>
function listItem(cc, document, numbered) {
  const li = document.createElement('li');
  const cols = columns(cc);
  const iconCol = cols.find((c) => components(c).every((k) => k.matches('.image_v2')));
  const textCol = cols.find((c) => c !== iconCol);
  if (!numbered && iconCol) {
    const img = image(iconCol, cc, document);
    if (img) li.append(img);
  }
  if (textCol) {
    const parts = [];
    components(textCol).forEach((comp) => {
      [...comp.querySelectorAll('p, ul, ol')]
        .filter((p) => !isHidden(p, cc) && p.textContent.trim() && !p.parentElement.closest('p, ul, ol'))
        .forEach((p) => parts.push(copyAs(p, document, p.tagName.toLowerCase())));
    });
    // a single paragraph stays inline text (tight list); several keep their paragraphs
    if (parts.length === 1 && parts[0].matches('p')) li.append(...parts[0].childNodes);
    else li.append(...parts);
  }
  return li;
}

// content of one column cell
function dividedCell(col, cc, document) {
  const out = [];
  let list = null;
  components(col).forEach((comp) => {
    if (comp.matches('.column_control_v1')) {
      const img = comp.querySelector('img');
      const numbered = !!img && NUMBER_ICON.test(img.getAttribute('src') || '');
      const tag = numbered ? 'ol' : 'ul';
      if (!list || list.tagName.toLowerCase() !== tag) {
        list = document.createElement(tag);
        out.push(list);
      }
      list.append(listItem(comp, document, numbered));
      return;
    }
    list = null;
    const tmp = document.createElement('div');
    tmp.append(comp.cloneNode(true));
    out.push(...textContent(tmp, cc, document, { heading: 'h3' }));
  });
  return out;
}

export default function parse(element, { document }) {
  const kind = element.getAttribute('data-fedex-kind');
  const cols = columns(element);
  let row; // one row, one cell per column
  let name;
  if (kind === 'divided') {
    name = 'Columns (divided)';
    row = cols.map((col) => dividedCell(col, element, document));
  } else if (kind === 'one-third') {
    name = 'Columns (one-third)';
    const [imgCol, textCol] = cols;
    row = [image(imgCol, element, document) || '', textContent(textCol, element, document)];
  } else {
    name = 'Columns (centered)';
    row = cols.map((col) => textContent(col, element, document));
  }
  const cells = [row.map((c) => (Array.isArray(c) && !c.length ? '' : c))];
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name, cells }));
}
