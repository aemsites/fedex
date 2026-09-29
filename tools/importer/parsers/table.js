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
 * Usage:
 *   - as a parser: parse(element, { document }) replaces a `div.table` / `table` element.
 *   - as a helper (accordion answers -> fragments): `parse.buildTable(source, document)` returns
 *     the Table block element without touching the source.
 */
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

function cellContent(src, document, header) {
  const clone = normalizeSpace(src.cloneNode(true));
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
  const nodes = [...div.childNodes];
  return nodes.length && clean(div.textContent + (div.querySelector('img') ? 'x' : '')) ? nodes : '';
}

function rowsFromTable(table) {
  const rows = [];
  const head = [...table.querySelectorAll(':scope > thead > tr')];
  const body = [...table.querySelectorAll(':scope > tbody > tr, :scope > tr')];
  head.forEach((tr) => rows.push({ tr, header: true }));
  body.forEach((tr, i) => rows.push({ tr, header: !head.length && i === 0 }));
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
  return WebImporter.Blocks.createBlock(document, { name: 'Table', cells });
}

export default function parse(element, { document }) {
  const block = buildTable(element, document);
  if (!block) {
    element.remove();
    return;
  }
  element.replaceWith(block);
}

parse.buildTable = buildTable;
