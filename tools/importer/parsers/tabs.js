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
 */
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

export default function parse(element, { document }) {
  const tabs = element.querySelector('.fxg-tab') || element;
  const list = tabs.querySelector('ul.cc-aem-c-tabs__list') || tabs.querySelector('ul');
  const labels = list ? [...list.querySelectorAll(':scope > li')].map((li) => clean((li.querySelector('button, a') || li).textContent)) : [];
  const panels = [...tabs.querySelectorAll('.fxg-tab__content > section, .tab-content > section, section.cmp-tabs__tabpanel')]
    .filter((s, i, all) => all.indexOf(s) === i);

  const cells = [];
  const count = Math.max(labels.length, panels.length);
  for (let i = 0; i < count; i += 1) {
    const panel = panels[i];
    const body = [];
    if (panel) {
      const grid = panel.querySelector('.aem-Grid') || panel;
      walkGrid(grid, element, document, body);
    }
    // a tab without a label takes its panel heading
    const label = labels[i] || (body[0] && /^H\d$/.test(body[0].tagName) ? clean(body[0].textContent) : '');
    if (!label) continue;
    const labelCell = document.createElement('p');
    labelCell.textContent = label;
    cells.push([labelCell, body.length ? body : '']);
  }

  if (!cells.length) {
    element.remove();
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs', cells });
  element.replaceWith(block);
}
