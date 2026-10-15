/* eslint-disable */
/* global WebImporter */
/**
 * Parser + helper for table. Base: table (blocks/table/README.md; library Table convention:
 * one block row per data row, one cell per column, header row first).
 * Source: https://www.fedex.com/en-us/shipping/freight.html ("Need more specialized freight
 * services?" answer: div.table > table.fxg-table, 6 rows x 3 columns); reusable for open-account.
 *
 * Output: `Table`, one row per source row, header row first (thead, or the first row), one cell
 * per column. Cell content keeps text, links, <sup>, paragraphs and lists; presentational spans,
 * classes and styles are dropped (header cells are bold by the block CSS, so their <b> is dropped).
 * Rows are padded to the widest row.
 *
 * Also accepts an "equivalent div grid": a column_control_v1 whose columns are the cells of one
 * row, or a container of column_control_v1 rows (first row = header).
 *
 * Sibling-run grid (comparison-landing, https://www.fedex.com/en-us/open-account.html): the matched
 * column_control_v1 is directly followed by a .hr_v1. It is the header row ("" | Business account |
 * Personal account); the following sibling column_control_v1 rows, separated by .hr_v1, are the
 * data rows (label | business | personal; a check-mark image cell keeps its image, an empty cell
 * stays empty). The run stops at the first sibling that is neither (the mobile .table.parbase
 * copies, removed by fedex-cleanup as .fxg-desktop--hide). The consumed rows and separators are
 * removed from the DOM. Mobile/tablet renditions (.fxg-desktop--hide) inside cells are dropped.
 *
 * Usage:
 *   - as a parser: parse(element, { document }) replaces a `div.table` / `table` element.
 *   - as a helper (accordion answers -> fragments): `parse.buildTable(source, document)` returns
 *     the Table block element without touching the source.
 */
import { wrapInlineRuns } from '../utils/components.js';

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

// Collapse source-formatting whitespace (newlines/indentation) inside inline content
function normalizeSpace(el) {
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => { n.textContent = n.textContent.replace(/\s+/g, ' '); });
  return el;
}

// A run on its own background colour inside a cell is a badge ("8.00 - 11.30 uur" on purple next
// to a service name, nl-nl ship-to-europe / send-parcel-to-*): kept as <code> (the block shows
// it as a badge); the text inside loses its bold.
// (the value must start right after the spaces: "background-color: transparent" is no badge — en-to
// shipping "Delivery by 10:30 or noon…")
const BADGE_BG = /background(-color)?\s*:\s*(?!\s|transparent|rgba\(0,\s*0,\s*0,\s*0\)|#fff|white|inherit|initial|none)[^;]+/i;
function markBadges(cell, document) {
  cell.querySelectorAll('span[style]').forEach((span) => {
    if (!BADGE_BG.test(span.getAttribute('style') || '') || !clean(span.textContent)) return;
    const code = document.createElement('code');
    code.textContent = clean(span.textContent);
    span.replaceWith(code);
  });
}

// A paragraph set in a large type in a cell (inline font-size >= 18px: the service name above
// its description, nl-nl send-parcel-to-*) is the cell's heading -> h4.
function markCellHeadings(cell, document) {
  cell.querySelectorAll('p[style*="font-size"]').forEach((p) => {
    const m = (p.getAttribute('style') || '').match(/font-size\s*:\s*(\d+)px/i);
    if (!m || Number(m[1]) < 18 || !clean(p.textContent)) return;
    const h = document.createElement('h4');
    h.append(...p.childNodes);
    p.replaceWith(h);
  });
}

// A table inside a cell (component-library ancillary fees: "€ 8.00 per line from the 6th line" in a
// one-cell table; en_us/mx storage rates by weight) cannot stay a table in a block cell: each of its
// rows becomes a paragraph, the row's non-empty cells joined by " | "
function flattenNestedTables(clone, document) {
  [...clone.querySelectorAll('table')].reverse().forEach((t) => {
    const lines = [...t.rows].map((tr) => [...tr.cells]
      .map((c) => c.innerHTML.replace(/<\/?(p|div|br)[^>]*>/gi, ' ').replace(/\s+/g, ' ').trim())
      .filter((h) => h.replace(/<[^>]+>|&nbsp;/g, '').trim()))
      .filter((cells) => cells.length);
    const frag = document.createDocumentFragment();
    lines.forEach((cells) => {
      const p = document.createElement('p');
      p.innerHTML = cells.join(' | ');
      frag.append(p);
    });
    t.replaceWith(frag);
  });
}

function cellContent(src, document, header) {
  const clone = normalizeSpace(src.cloneNode(true));
  flattenNestedTables(clone, document);
  markBadges(clone, document);
  if (!header) markCellHeadings(clone, document);
  clone.querySelectorAll('span, font').forEach((s) => s.replaceWith(...s.childNodes));
  clone.querySelectorAll('input, script, style').forEach((n) => n.remove());
  [...clone.querySelectorAll('*')].forEach((n) => {
    n.removeAttribute('class');
    n.removeAttribute('style');
    n.removeAttribute('data-analytics');
  });
  if (header) clone.querySelectorAll('b, strong').forEach((b) => b.replaceWith(...b.childNodes));
  const div = document.createElement('div');
  div.innerHTML = clone.innerHTML.replace(/(&nbsp;|\s)+$/g, '').trim();
  // link + footnote mark before a paragraph (ship-to-apac tabs) stay one paragraph
  if (div.querySelector(':scope > sup')) wrapInlineRuns(div, document);
  const nodes = [...div.childNodes];
  return nodes.length && clean(div.textContent + (div.querySelector('img') ? 'x' : '')) ? nodes : '';
}

// Service fee tables (component-library ancillary pages, the content of en-to
// ancillary-clearance-service's country dropdown): fee | amount | description rows without a header
// row (the fee names are bold row labels); they come with a one-column mobile copy
// (td.fxg__table-td-mobile), which is dropped
const isServiceFees = (table) => !!(table && table.querySelector('td.fxg__service-fees-td'));
const isMobileCopy = (table) => !!(table && table.querySelector('td.fxg__table-td-mobile'))
  && !table.querySelector('td.fxg__service-fees-td');

function rowsFromTable(table) {
  const rows = [];
  const head = [...table.querySelectorAll(':scope > thead > tr')];
  const body = [...table.querySelectorAll(':scope > tbody > tr, :scope > tr')];
  // a one-row table (en-to shipping: each service is its own [label | description] table) has no
  // header row
  const noHeader = isServiceFees(table) || (!head.length && body.length === 1);
  head.forEach((tr) => rows.push({ tr, header: true }));
  body.forEach((tr, i) => rows.push({ tr, header: !noHeader && !head.length && i === 0 }));
  return rows.map(({ tr, header }) => ({ header, cells: [...tr.querySelectorAll(':scope > th, :scope > td')] }));
}

function rowsFromGrid(grid) {
  const rowEls = grid.matches('.column_control_v1') ? [grid] : [...grid.querySelectorAll(':scope > .column_control_v1')];
  return rowEls.map((cc, i) => ({
    header: i === 0,
    cells: [...cc.querySelectorAll(':scope > .row > .fxg-col')]
      .filter((c) => !c.closest('.fxg-desktop--hide'))
      .map((c) => c.querySelector(':scope > div > .aem-Grid') || c),
  }));
}

function buildTable(source, document) {
  const table = source.matches('table') ? source : source.querySelector('table');
  const rows = table ? rowsFromTable(table) : rowsFromGrid(source);
  if (!rows.length) return null;
  const width = Math.max(...rows.map((r) => r.cells.length));
  const cells = rows
    .map((r) => {
      const row = r.cells.map((c) => cellContent(c, document, r.header));
      while (row.length < width) row.push('');
      return row;
    })
    .filter((row) => row.some((c) => c !== ''));
  if (!cells.length) return null;
  // row/cell structure unchanged (library Table convention: header row, then one row per data
  // row); only the variant name differs
  // `striped`: fedex.com striped-row tables without borders (nl-nl ship-to-europe tab tables)
  const variants = [];
  if (isServiceFees(table) || (table && !table.querySelector(':scope > thead') && rows.length === 1)) variants.push('no-header');
  if (brandHeader(table)) variants.push('brand');
  if (table && table.classList.contains('fxg-table--striped-row')) variants.push('striped');
  // header labels authored in the lighter FedEx purple (#671CAA, send-parcel-to-*)
  const th = table && table.querySelector('th');
  if (th && /#671caa|rgb\(103,\s*28,\s*170\)/i.test(th.getAttribute('style') || '')) variants.push('purple-headers');
  const name = variants.length ? `Table (${variants.join(', ')})` : 'Table';
  return WebImporter.Blocks.createBlock(document, { name, cells });
}

// `brand`: the header row is authored on FedEx purple (nl-nl freight-services "Vind de juiste
// vrachtservice": <tr style="background-color: #4D148C; color: white">)
function brandHeader(table) {
  const tr = table && table.querySelector('tr');
  const bg = ((tr && tr.getAttribute('style')) || '').replace(/\s+/g, '').toLowerCase();
  return /background(-color)?:(#4d148c|rgb\(77,20,140\))/.test(bg);
}

// comparison-landing (open-account.html "Business vs personal"): the leader column_control_v1 is
// the header row; each following sibling column_control_v1 (separated by .hr_v1) is a data row.
// The run stops at the first sibling that is neither (the mobile .table.parbase copies).
function siblingRun(element) {
  const rows = [element];
  const separators = [];
  let next = element.nextElementSibling;
  while (next && next.matches('.hr_v1, .column_control_v1')) {
    (next.matches('.hr_v1') ? separators : rows).push(next);
    next = next.nextElementSibling;
  }
  return { rows, separators };
}

// Desktop copy of one grid cell (mobile/tablet renditions dropped)
function gridCell(col) {
  const grid = col.querySelector(':scope > div > .aem-Grid') || col;
  const copy = grid.cloneNode(true);
  copy.querySelectorAll('.fxg-desktop--hide, .spacer, hr').forEach((n) => n.remove());
  return copy;
}

function buildGridRunTable(element, document) {
  const { rows, separators } = siblingRun(element);
  const cells = rows.map((cc, i) => [...cc.querySelectorAll(':scope > .row > .fxg-col')]
    .filter((c) => !c.matches('.fxg-desktop--hide'))
    .map((c) => cellContent(gridCell(c), document, i === 0)));
  const width = Math.max(...cells.map((r) => r.length));
  cells.forEach((r) => { while (r.length < width) r.push(''); });
  return { block: WebImporter.Blocks.createBlock(document, { name: 'Table', cells }), consumed: [...rows.slice(1), ...separators] };
}

export default function parse(element, { document }) {
  if (element.matches('.column_control_v1') && element.nextElementSibling
    && element.nextElementSibling.matches('.hr_v1')) {
    const { block, consumed } = buildGridRunTable(element, document);
    consumed.forEach((el) => el.remove());
    element.replaceWith(block);
    return;
  }
  const table = element.matches('table') ? element : element.querySelector('table');
  if (isMobileCopy(table)) {
    element.remove();
    return;
  }
  const block = buildTable(element, document);
  if (!block) {
    element.remove();
    return;
  }
  element.replaceWith(block);
}

parse.buildTable = buildTable;
