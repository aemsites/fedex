/* eslint-disable */
/* global WebImporter */
/**
 * Parser for tabs. Base: tabs (new block, blocks/tabs/README.md). Template: banner-landing.
 * Source: https://www.fedex.com/en-us/billing-online.html ("Check out billing resources and guides").
 * Instance: .root div.tabs_v1
 *
 * Output: `Tabs`, 2 columns, one row per tab: tab label | panel content.
 * - Labels: ul.cc-aem-c-tabs__list > li > button (the mobile dropdown copy of the labels is ignored).
 * - Panels: .fxg-tab__content > section, paired with the labels by index. Each panel grid is walked
 *   in source order: .title_v1 -> h3; .richtext -> paragraphs/lists (inline links kept);
 *   .button_v1 -> paragraph holding only the link (FedEx button classes kept for fedex-cleanup.js);
 *   .image_v2 -> image (desktop rendition); nested .column_control_v1 -> its visible columns in
 *   order. Tab 4 ("Understanding your parcel or air freight invoice") keeps all of its annotated
 *   invoice screenshots and numbered callout icons.
 * .fxg-desktop--hide (mobile/tablet-only) content is never copied.
 *
 * Panels holding a data table or an accordion (nl-nl ship-to-us/-europe/-apac, automotive: the
 * service table per tab; dangerous-goods/why-ship-with-fedex, global-returns: A-Z accordions):
 * the row stays tab label | panel content, but a block can't nest the Table or Accordion block, so
 * - as in parsers/accordion.js - the panel content goes into a FRAGMENT document (text, Table and
 * Accordion blocks in source order) that the import script returns as an extra document
 * (<page>.html?fragment=<index>); the panel cell holds only the fragment link.
 */
import tableParser from './table.js';
import accordionParser from './accordion.js';

const BUTTON_CLASSES = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'];
const HIDDEN = '.fxg-desktop--hide';

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && root.contains(hidden);
}

// Collapse source-formatting whitespace (newlines/indentation) inside inline content
function normalizeSpace(el) {
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => { n.textContent = n.textContent.replace(/\s+/g, ' '); });
  return el;
}

function cleanClone(el) {
  const clone = normalizeSpace(el.cloneNode(true));
  clone.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
  [clone, ...clone.querySelectorAll('*')].forEach((n) => {
    n.removeAttribute('class');
    n.removeAttribute('style');
    n.removeAttribute('data-analytics');
  });
  return clone;
}

function newImage(img, document) {
  const ni = document.createElement('img');
  ni.src = img.src || img.getAttribute('src');
  const alt = img.getAttribute('alt');
  ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  return ni;
}

function linkParagraph(src, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  const raw = src.getAttribute('href') || '';
  a.setAttribute('href', raw.startsWith('#') ? raw : (src.href || raw));
  a.textContent = clean(src.textContent);
  const cls = BUTTON_CLASSES.filter((c) => src.classList.contains(c));
  if (cls.length) a.className = cls.join(' ');
  p.append(a);
  return p;
}

function walkGrid(grid, root, document, out) {
  [...grid.children].forEach((comp) => {
    if (isHidden(comp, root) || comp.matches('script, style, input, link')) return;
    if (comp.matches('.title_v1')) {
      const h = [...comp.querySelectorAll('h1, h2, h3, h4, h5, h6')].find((el) => !isHidden(el, root));
      if (h && clean(h.textContent)) {
        const h3 = document.createElement('h3');
        h3.textContent = clean(h.textContent);
        out.push(h3);
      }
    } else if (comp.matches('.richtext')) {
      const box = comp.querySelector('.cc-aem-c-richtext') || comp;
      if (isHidden(box, root)) return;
      [...box.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6, table')].forEach((el) => {
        if (el.parentElement.closest('p, ul, ol, table') || isHidden(el, root)) return;
        if (!clean(el.textContent) && !el.querySelector('img')) return;
        out.push(cleanClone(el));
      });
    } else if (comp.matches('.button_v1')) {
      [...comp.querySelectorAll('a[href]')]
        .filter((a) => !isHidden(a, root) && clean(a.textContent) && !/^\/?#$/.test(a.getAttribute('href')))
        .forEach((a) => out.push(linkParagraph(a, document)));
    } else if (comp.matches('.image_v2')) {
      const img = [...comp.querySelectorAll('.fxg-desktop-image img')].find((i) => !isHidden(i, root))
        || [...comp.querySelectorAll('img')].find((i) => !isHidden(i, root) && !(i.getAttribute('src') || '').startsWith('data:'));
      if (img) {
        const p = document.createElement('p');
        p.append(newImage(img, document));
        out.push(p);
      }
    } else if (comp.matches('.column_control_v1')) {
      [...comp.querySelectorAll(':scope > .row > .fxg-col')]
        .filter((col) => !isHidden(col, root))
        .forEach((col) => {
          const g = col.querySelector(':scope > div > .aem-Grid') || col.querySelector('.aem-Grid');
          if (g) walkGrid(g, root, document, out);
        });
    } else if (comp.matches('.aem-Grid, .responsivegrid, .container, .cmp-container')) {
      walkGrid(comp, root, document, out);
    }
  });
  return out;
}

function slugify(text) {
  return clean(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// same scheme as parsers/accordion.js: /<locale>/fragments/<page path>/<label slug>, unique per page
function fragmentPath(label, pageUrl, document) {
  let pagePath = '/';
  try { pagePath = new URL(pageUrl).pathname; } catch (e) { /* keep root */ }
  const parts = pagePath.replace(/\.html?$/, '').split('/').filter(Boolean);
  const locale = /^[a-z]{2}-[a-z]{2}$/.test(parts[0] || '') ? parts.shift() : 'en-us';
  const base = `/${locale}/fragments/${parts.join('/')}${parts.length ? '/' : ''}${slugify(label)}`;
  const taken = (document.importFragments || []).map((f) => f.path);
  let path = base;
  for (let n = 2; taken.includes(path); n += 1) path = `${base}-${n}`;
  return path;
}

const hasVisible = (grid, sel, root) => [...grid.querySelectorAll(sel)].some((el) => !isHidden(el, root));

// Panel components in source order, wrappers (responsivegrid, container) flattened
function panelComponents(grid, root) {
  const out = [];
  [...grid.children].forEach((comp) => {
    if (isHidden(comp, root) || comp.matches('script, style, input, link')) return;
    const inner = comp.matches('.aem-Grid, .responsivegrid, .container, .cmp-container')
      && (comp.querySelector(':scope > .aem-Grid, :scope > .cmp-container') || (comp.matches('.aem-Grid, .cmp-container') ? comp : null));
    if (inner && !comp.matches('.accordion_selector, .table, .column_control_v1')) out.push(...panelComponents(inner, root));
    else out.push(comp);
  });
  return out;
}

function panelFragment(grid, root, label, document, ctx) {
  if (!hasVisible(grid, 'table, .accordion_selector', root)) return null;
  const fragment = document.createElement('div');
  panelComponents(grid, root).forEach((comp) => {
    if (comp.matches('.accordion_selector')) {
      fragment.append(comp.cloneNode(true)); // parsed below, as one run with its siblings
      return;
    }
    const table = comp.matches('table') ? comp : comp.querySelector('table');
    if (table && !isHidden(table, root)) {
      const before = walkGrid({ children: [comp] }, root, document, []).filter((n) => !n.matches('table'));
      fragment.append(...before);
      const block = tableParser.buildTable(table, document);
      if (block) fragment.append(block);
      return;
    }
    fragment.append(...walkGrid({ children: [comp] }, root, document, []));
  });
  // accordion runs: innermost first (parsers/accordion.js turns a group around a parsed run into a
  // heading), then each run from its first item
  const leaders = () => [...fragment.querySelectorAll('div.accordion_selector')]
    .filter((a) => !(a.previousElementSibling && a.previousElementSibling.matches('div.accordion_selector')));
  for (let guard = 0; guard < 50; guard += 1) {
    const all = leaders();
    if (!all.length) break;
    const leaf = all.find((a) => !a.querySelector('div.accordion_selector')) || all[0];
    accordionParser(leaf, { document, url: ctx.url, params: { originalURL: ctx.url } });
  }
  // a centred intro text in the panel (ship-to-apac "Flexibele afleveropties…",
  // cc-aem-u-align--center@small) -> the fragment section gets style center-intro
  const intro = panelComponents(grid, root).find((c) => c.matches('.richtext, .title_v1'));
  if (intro && intro.querySelector('[class*="align--center@small"]')) {
    fragment.append(WebImporter.Blocks.createBlock(document, { name: 'Section Metadata', cells: { style: 'center-intro' } }));
  }
  const path = fragmentPath(label, ctx.url, document);
  if (!document.importFragments) document.importFragments = [];
  document.importFragments.push({ element: fragment, path, title: label });
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.setAttribute('href', path);
  a.textContent = path;
  p.append(a);
  return p;
}

export default function parse(element, { document, url, params }) {
  const ctx = { url: (params && params.originalURL) || url || document.URL };
  const tabs = element.querySelector('.fxg-tab') || element;
  const list = tabs.querySelector('ul.cc-aem-c-tabs__list') || tabs.querySelector('ul');
  // <br> in a label ("Pakketten<br>tot 68 kg", nl-nl ship-to-us) is a space, not nothing
  const labelText = (el) => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    return clean(clone.textContent);
  };
  const labels = list ? [...list.querySelectorAll(':scope > li')].map((li) => labelText(li.querySelector('button, a') || li)) : [];
  const panels = [...tabs.querySelectorAll('.fxg-tab__content > section, .tab-content > section, section.cmp-tabs__tabpanel')]
    .filter((s, i, all) => all.indexOf(s) === i);

  const cells = [];
  const count = Math.max(labels.length, panels.length);
  for (let i = 0; i < count; i += 1) {
    const panel = panels[i];
    let body = [];
    const grid = panel ? (panel.querySelector('.aem-Grid') || panel) : null;
    if (grid) walkGrid(grid, element, document, body);
    // a tab without a label takes its panel heading
    const label = labels[i] || (body[0] && /^H\d$/.test(body[0].tagName) ? clean(body[0].textContent) : '');
    if (!label) continue;
    const fragmentLink = grid && panelFragment(grid, element, label, document, ctx);
    if (fragmentLink) body = [fragmentLink];
    const labelCell = document.createElement('p');
    labelCell.textContent = label;
    cells.push([labelCell, body.length ? body : '']);
  }

  if (!cells.length) {
    element.remove();
    return;
  }

  // fedex.com "striped" tabs (grey tiles, purple active tile; nl-nl ship-to-apac) -> Tabs (striped);
  // rows stay tab label | panel content
  const striped = !!element.querySelector('.fxg-tab--striped, [data-view-type="striped"]');
  const block = WebImporter.Blocks.createBlock(document, { name: striped ? 'Tabs (striped)' : 'Tabs', cells });
  element.replaceWith(block);
}
