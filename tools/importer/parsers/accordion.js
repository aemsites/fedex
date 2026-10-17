/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion. Base: accordion (library Accordion, blocks/accordion/README.md).
 * Template: hub-landing. Source: https://www.fedex.com/en-us/shipping/international.html
 * (also shipping.html, packing.html, schedule-manage-pickups.html).
 * Instance: .root div.accordion_selector:not(.accordion_selector + .accordion_selector, ...)
 *   = the FIRST accordion_selector of each consecutive run.
 *
 * Output: `Accordion`, 2 columns, one row per item: label | body.
 * The following sibling div.accordion_selector elements of the run are collected into the same
 * block and removed from the DOM so they are not imported twice.
 *
 * Per item (div.accordion_selector > .fxg-accordion):
 * - label: button .cc-aem-c-accordion__button__text (icons dropped)
 * - body: .cc-aem-c-accordion__item grid, walked in source order:
 *     .title_v1 -> h4 subhead; .richtext -> paragraphs/lists (inline links kept);
 *     .button_v1 -> paragraph holding only the link (FedEx button classes kept so
 *     fedex-cleanup.js maps e.g. SHIP NOW to a button); .image_v2 -> image;
 *     nested .column_control_v1 -> its visible columns in order.
 * .fxg-desktop--hide (mobile-only or hidden-everywhere) components are skipped.
 */
import tableParser from './table.js';

const BUTTON_CLASSES = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'];
const HIDDEN = '.fxg-desktop--hide';

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && root.contains(hidden);
}

function linkParagraph(src, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  const raw = src.getAttribute('href') || '';
  a.setAttribute('href', raw.startsWith('#') ? raw : (src.href || raw));
  a.innerHTML = src.innerHTML.replace(/\s+/g, ' ').trim();
  a.querySelectorAll('span.lock-hide, img, svg').forEach((n) => n.remove());
  const cls = BUTTON_CLASSES.filter((c) => src.classList.contains(c));
  if (cls.length) a.className = cls.join(' ');
  p.append(a);
  return p;
}

// Collapse source-formatting whitespace (newlines/indentation) inside inline content
function normalizeSpace(el) {
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => { n.textContent = n.textContent.replace(/\s+/g, ' '); });
  return el;
}

// Small key/value tables (2 columns, up to 4 rows), e.g. nl-nl dangerous-goods/why-ship-with-fedex:
// one per country ("Gevaarlijke Goederen | Ja", "Droogijs en lithiumbatterijen section II | Ja").
// The row stays label cell | content cell; such a table stays in the content cell as a list
// ("**Gevaarlijke Goederen**: Ja") instead of a fragment each (that page alone would need 123
// fragment documents). Larger tables still go to a fragment.
function isKeyValueTable(table) {
  const rows = [...table.rows];
  return rows.length > 0 && rows.length <= 4 && rows.every((r) => r.cells.length === 2);
}

function keyValueList(table, document) {
  const ul = document.createElement('ul');
  [...table.rows].forEach((row) => {
    const key = clean(row.cells[0].textContent);
    const value = clean(row.cells[1].textContent);
    if (!key && !value) return;
    const li = document.createElement('li');
    if (key && value) {
      const strong = document.createElement('strong');
      strong.textContent = key;
      li.append(strong, `: ${value}`);
    } else {
      li.textContent = key || value;
    }
    ul.append(li);
  });
  return ul.children.length ? ul : null;
}

function richtextNodes(rt, root, document) {
  const box = rt.querySelector('.cc-aem-c-richtext') || rt;
  const out = [];
  [...box.children].forEach((child) => {
    if (isHidden(child, root)) return;
    if (child.matches('table') && isKeyValueTable(child)) {
      const list = keyValueList(child, document);
      if (list) out.push(list);
      return;
    }
    if (child.matches('p, ul, ol, h1, h2, h3, h4, h5, h6, table')) {
      if (!child.textContent.replace(/ /g, ' ').trim() && !child.querySelector('img')) return;
      const clone = normalizeSpace(child.cloneNode(true));
      clone.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
      clone.removeAttribute('class');
      clone.removeAttribute('style');
      // trailing <br> / &nbsp; left by the source editor
      while (clone.lastChild && (clone.lastChild.nodeName === 'BR'
        || (clone.lastChild.nodeType === 3 && !clone.lastChild.textContent.replace(/ /g, ' ').trim()))) {
        clone.lastChild.remove();
      }
      // typed bullets ("• Proof-of-value documentation ...", claims FAQ) -> one list
      const bullet = clone.matches('p') && /^[•·▪]\s*/.test(clean(clone.textContent));
      if (bullet) {
        const walker = document.createTreeWalker(clone, 4);
        while (walker.nextNode()) {
          const n = walker.currentNode;
          if (n.textContent.trim()) { n.textContent = n.textContent.replace(/^\s*[•·▪]\s*/, ''); break; }
        }
        const li = document.createElement('li');
        li.append(...clone.childNodes);
        const last = out[out.length - 1];
        if (last && last.matches && last.matches('ul[data-bullets]')) last.append(li);
        else {
          const ul = document.createElement('ul');
          ul.setAttribute('data-bullets', '');
          ul.append(li);
          out.push(ul);
        }
        return;
      }
      out.push(clone);
    } else if (child.matches('div')) {
      out.push(...richtextNodes(child, root, document));
    }
  });
  return out;
}

// Walks one grid (the accordion panel, or a nested column's grid) in source order
function walkGrid(grid, root, document, out) {
  [...grid.children].forEach((comp) => {
    if (isHidden(comp, root)) return;
    if (comp.matches('.title_v1')) {
      const h = [...comp.querySelectorAll('h1, h2, h3, h4, h5, h6')].find((el) => !isHidden(el, root));
      if (h && clean(h.textContent)) {
        const h4 = document.createElement('h4');
        h4.textContent = clean(h.textContent);
        out.push(h4);
      }
    } else if (comp.matches('.richtext')) {
      out.push(...richtextNodes(comp, root, document));
    } else if (comp.matches('.table') || comp.matches('table')) {
      // only key/value tables get here (any other table sends the answer to a fragment)
      const table = comp.matches('table') ? comp : comp.querySelector('table');
      const list = table && isKeyValueTable(table) ? keyValueList(table, document) : null;
      if (list) out.push(list);
    } else if (comp.matches('.button_v1')) {
      [...comp.querySelectorAll('a[href]')]
        .filter((a) => !isHidden(a, root) && clean(a.textContent) && !/^\/?#$/.test(a.getAttribute('href')))
        .forEach((a) => out.push(linkParagraph(a, document)));
    } else if (comp.matches('.image_v2')) {
      const img = comp.querySelector('.fxg-desktop-image img')
        || [...comp.querySelectorAll('img')].find((i) => !isHidden(i, root));
      if (img) {
        const ni = document.createElement('img');
        ni.src = img.src || img.getAttribute('src');
        const alt = img.getAttribute('alt');
        ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
        out.push(ni);
      }
    } else if (comp.matches('.column_control_v1')) {
      [...comp.querySelectorAll(':scope > .row > .fxg-col')]
        .filter((col) => !isHidden(col, root))
        .forEach((col) => {
          const g = col.querySelector(':scope > div > .aem-Grid') || col.querySelector('.aem-Grid');
          if (g) walkGrid(g, root, document, out);
        });
    } else if (comp.matches('div.accordion_selector')) {
      // A nested accordion inside an answer of a plain FAQ run (nl-nl out-of-home-deliveries: the
      // regions under "Onze FedEx-locaties zijn over de hele wereld te vinden"): blocks can't nest,
      // so each nested item becomes a bold label + its content inside this answer cell. (Grouped
      // FAQs, where the inner run is parsed first, never get here - see the group handling in parse().)
      const acc = comp.querySelector('.fxg-accordion, .cc-aem-c-accordion') || comp;
      const labelEl = acc.querySelector('.cc-aem-c-accordion__button__text')
        || acc.querySelector('.cc-aem-c-accordion__button, button');
      const label = clean(labelEl && labelEl.textContent);
      if (label) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = label;
        p.append(strong);
        out.push(p);
      }
      const panel = acc.querySelector('.cc-aem-c-accordion__item') || acc;
      walkGrid(panel.querySelector(':scope > .aem-Grid') || panel, root, document, out);
    } else if (comp.matches('.aem-Grid, .responsivegrid, .container, .cmp-container')) {
      walkGrid(comp, root, document, out);
    }
  });
  return out;
}

// Answers that contain a real data table (freight "Need more specialized freight services?"):
// a block can't nest the Table block, so the answer content goes into a FRAGMENT document
// (intro text + Table) that the import script returns as an extra document, and the answer cell
// holds only the fragment link (blocks/accordion loads it on first open).
const KNOWN_FRAGMENTS = {
  'need more specialized freight services?': '/en-us/fragments/shipping/freight/specialized-freight-services',
};

function slugify(text) {
  return clean(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function fragmentPath(label, pageUrl) {
  const known = KNOWN_FRAGMENTS[clean(label).toLowerCase()];
  if (known) return known;
  let pagePath = '/';
  try { pagePath = new URL(pageUrl).pathname; } catch (e) { /* keep root */ }
  const parts = pagePath.replace(/\.html?$/, '').split('/').filter(Boolean);
  const locale = /^[a-z]{2}-[a-z]{2}$/.test(parts[0] || '') ? parts.shift() : 'en-us';
  return `/${locale}/fragments/${parts.join('/')}${parts.length ? '/' : ''}${slugify(label)}`;
}

function tableFragment(grid, item, label, document, ctx) {
  // tables of nested accordions are theirs; key/value tables stay inline as lists
  const tables = [...grid.querySelectorAll('table')]
    .filter((t) => !isHidden(t, item) && !isKeyValueTable(t) && t.closest('div.accordion_selector') === item);
  if (!tables.length) return null;
  const fragment = document.createElement('div');
  // intro text / other content first, then one Table block per source table (source order)
  [...grid.children].forEach((comp) => {
    if (isHidden(comp, item)) return;
    const table = comp.matches('table') ? comp : comp.querySelector('table');
    if (table) {
      const block = tableParser.buildTable(table, document);
      if (block) fragment.append(block);
      return;
    }
    const nodes = walkGrid({ children: [comp] }, item, document, []);
    fragment.append(...nodes);
  });
  const path = fragmentPath(label, ctx.url);
  if (!document.importFragments) document.importFragments = [];
  document.importFragments.push({ element: fragment, path, title: label });
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.setAttribute('href', path);
  a.textContent = path;
  p.append(a);
  return p;
}

function buildRow(item, document, ctx) {
  const acc = item.querySelector('.fxg-accordion, .cc-aem-c-accordion') || item;
  const labelEl = acc.querySelector('.cc-aem-c-accordion__button__text')
    || acc.querySelector('.cc-aem-c-accordion__button, button');
  const label = clean(labelEl && labelEl.textContent);
  if (!label) return null;

  const panel = acc.querySelector('.cc-aem-c-accordion__item') || acc;
  const grid = panel.querySelector(':scope > .aem-Grid') || panel;
  const fragmentLink = tableFragment(grid, item, label, document, ctx);
  const body = fragmentLink ? [fragmentLink] : walkGrid(grid, item, document, []);

  const labelCell = document.createElement('p');
  // optional label icon (freight "Find the right freight service": 32px prefix icon)
  const icon = labelEl && [...labelEl.querySelectorAll('.cc-aem-c-accordion__button__text__icon img, img.cc-aem-c-icon')]
    .find((i) => !(i.getAttribute('src') || '').startsWith('data:'));
  if (icon) {
    const ni = document.createElement('img');
    ni.src = icon.src || icon.getAttribute('src');
    ni.alt = '';
    labelCell.append(ni, ' ');
  }
  labelCell.append(label);
  return [labelCell, body.length ? body : ''];
}

export default function parse(element, { document, url, params }) {
  const ctx = { url: (params && params.originalURL) || url || document.URL };
  // First item of the run + the directly following accordion_selector siblings
  const items = [element];
  let next = element.nextElementSibling;
  while (next && next.matches('div.accordion_selector')) {
    items.push(next);
    next = next.nextElementSibling;
  }

  const cells = items.map((item) => buildRow(item, document, ctx)).filter(Boolean);
  items.slice(1).forEach((item) => item.remove());

  if (!cells.length) {
    element.remove();
    return;
  }

  cells.forEach((row) => [].concat(row[1] || []).forEach((n) => {
    if (n && n.removeAttribute) n.removeAttribute('data-bullets');
  }));
  const block = WebImporter.Blocks.createBlock(document, { name: 'Accordion', cells });
  element.replaceWith(block);

  // FAQ items grouped in an outer accordion (en-to customer-support "Claims", "Shipping", …;
  // billing-online "General", "Electronic Data Interchange (EDI)"): two levels, as on the source.
  // Each group becomes a row of one outer Accordion whose answer is a fragment holding the group
  // panel (the inner FAQ block and any other content); consecutive groups share the outer block.
  // A group without a label is unwrapped in place.
  const group = block.parentElement && block.parentElement.closest('div.accordion_selector');
  if (group) {
    const acc = group.querySelector(':scope > .fxg-accordion, :scope > .cc-aem-c-accordion') || group;
    const labelEl = acc.querySelector(':scope > .cc-aem-c-accordion__button .cc-aem-c-accordion__button__text')
      || acc.querySelector(':scope > button');
    const panel = acc.querySelector(':scope > .cc-aem-c-accordion__item') || acc;
    const grid = panel.querySelector(':scope > .aem-Grid') || panel;
    const label = clean(labelEl && labelEl.textContent);
    if (!label) {
      group.replaceWith(...grid.childNodes);
      return;
    }
    const fragment = document.createElement('div');
    fragment.append(...grid.childNodes);
    const path = fragmentPath(label, ctx.url);
    if (!document.importFragments) document.importFragments = [];
    document.importFragments.push({ element: fragment, path, title: label });
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.setAttribute('href', path);
    a.textContent = path;
    p.append(a);
    if (!document.fedexFaqGroups) document.fedexFaqGroups = [];
    let prev = group.previousElementSibling;
    while (prev && !clean(prev.textContent) && !prev.querySelector('img, table') && !document.fedexFaqGroups.includes(prev)) {
      prev = prev.previousElementSibling;
    }
    if (prev && document.fedexFaqGroups.includes(prev)) {
      // one more row of the outer block (the block is a <table>: header row, then label | answer)
      const tr = document.createElement('tr');
      const labelTd = document.createElement('td');
      labelTd.textContent = label;
      const bodyTd = document.createElement('td');
      bodyTd.append(p);
      tr.append(labelTd, bodyTd);
      (prev.querySelector('tbody') || prev).append(tr);
      group.remove();
    } else {
      // variant "groups": the category rows are styled as fedex.com's before any fragment loads
      const outer = WebImporter.Blocks.createBlock(document, { name: 'Accordion (groups)', cells: [[label, p]] });
      document.fedexFaqGroups.push(outer);
      group.replaceWith(outer);
    }
  }
}
