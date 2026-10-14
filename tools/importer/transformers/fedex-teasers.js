/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: listings and their detail pages (generic-landing; en-us how-to-hub/articles and
 * sweepstakes). teaser-pages.js lists the migrated detail pages a listing teases, with the
 * listing's teaser image (build-teaser-pages.py).
 *
 * beforeTransform (first):
 *  1. A detail page gets its listing teaser image as og:image, so createMetadata writes it as
 *     metadata Image (fedex.com's og:image is the FedEx logo on every page). The teaser blocks
 *     read title, description and that image from the detail page.
 * preprocess (resolveTeaserAnchors, called from the import script's preprocess hook: helix-importer's
 * own preprocessing and fedex-cleanup drop empty anchors before any transformer runs):
 *  2. Jump links to an empty anchor (<a id="bikes"></a> in or before a teaser, how-to-hub/articles
 *     "Learn how to ship:") point at the first teased detail page after the anchor instead:
 *     #how-to-ship-a-bike, the id the teaser item gets (scripts/teasers.js). A jump link whose
 *     anchor is gone with hidden content (shoes, liquids: an Adobe Target row hidden on
 *     fedex.com) is dropped from its list.
 * afterTransform (after the parsers):
 *  3. A Cards / Columns block whose items each link to one teased detail page (image-only items
 *     aside) becomes a `teasers` block of link-only rows: the link keeps its CTA text (and em /
 *     strong button style) when the item has its own heading, otherwise the title is the link
 *     and the row holds the bare path. Layouts: cards keep their variants (a single promo card
 *     becomes horizontal); a columns grid becomes Cards (promo, teasers); a [text | image] row
 *     stays Columns (…, teasers); an [image | text] row becomes Cards (horizontal, teasers).
 */

import TEASER_PAGES from '../teaser-pages.js';

const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();

// The page being imported. Teasers are only built on a listing of the detail page (the listings
// collect-teasers.js found it on): how-to-ship-computers links to the tv-monitor guide in its own
// words ("Pack the monitor…"), which is content, not a teaser.
let currentPage = '';
const pagePath = (url) => {
  try {
    return new URL(url).pathname.replace(/\.html$/, '');
  } catch (e) {
    return '';
  }
};

// a link to a detail page teased on the current page -> its path (www.fedex.com, relative or
// already rewritten)
function teaserPath(a) {
  const href = (a.getAttribute('href') || '').trim();
  if (!href || href.startsWith('#')) return null;
  let url;
  try {
    url = new URL(href, 'https://www.fedex.com/');
  } catch (e) {
    return null;
  }
  if (url.hostname !== 'www.fedex.com') return null;
  const path = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  const page = TEASER_PAGES[path];
  return page && page.listings.includes(currentPage) ? path : null;
}

function setTeaserImage(doc, path) {
  const page = TEASER_PAGES[path];
  if (!page || !doc.head) return;
  let meta = doc.head.querySelector('meta[property="og:image"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.setAttribute('property', 'og:image');
    doc.head.append(meta);
  }
  meta.setAttribute('content', page.image);
}

// content fedex.com does not show: Adobe Target rows hidden inline, mobile-only renditions
const HIDDEN = '.at-element-marker[style*="display: none"], .at-element-marker[style*="display:none"], .fxg-desktop--hide';
const hidden = (el) => !!el.closest(HIDDEN);

const isEmptyAnchor = (el) => el && el.matches('a:not([href]), a[href=""]') && !clean(el.textContent);

export function resolveTeaserAnchors(element, url) {
  currentPage = pagePath(url);
  const links = [...element.querySelectorAll('a[href]')];
  const teaserLinks = links.filter((a) => teaserPath(a) && !hidden(a));
  const dropped = [];
  const rewritten = new Set();
  links.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href.startsWith('#') || href.length < 2) return;
    const id = href.slice(1);
    let target = null;
    try {
      target = element.querySelector(`[id="${id.replace(/"/g, '\\"')}"], a[name="${id.replace(/"/g, '\\"')}"]`);
    } catch (e) {
      return;
    }
    if (!target || hidden(target)) {
      dropped.push(a);
      return;
    }
    // the teaser of the target's own column (how-to-hub: the anchor opens the description, after
    // the title link; #jewelry is the featured teaser's own heading, which the teaser block
    // replaces), else - for an empty anchor - the first teaser after it. Other heading targets
    // are left to fedex-cleanup (EDS heading ids).
    const col = target.closest('.fxg-col, .featured_offer_v2');
    const inCol = col ? teaserLinks.filter((t) => col.contains(t)) : [];
    const own = new Set(inCol.map(teaserPath)).size === 1 ? inCol[0] : null;
    if (!own && !isEmptyAnchor(target)) return;
    const next = own || teaserLinks.find((t) => target.compareDocumentPosition(t) & 4);
    if (next) {
      a.setAttribute('href', `#${teaserPath(next).split('/').pop()}`);
      rewritten.add(a);
    }
  });
  // only in a list of jump links that otherwise reach teasers (a missing target elsewhere is left);
  // the list is the outermost column control (or list) holding the link
  dropped.forEach((a) => {
    let group = a.closest('ul, .jumplinks, .column_control_v1');
    while (group && group.parentElement && group.parentElement.closest('.column_control_v1')) {
      group = group.parentElement.closest('.column_control_v1');
    }
    if (!group || ![...group.querySelectorAll('a[href^="#"]')].some((x) => rewritten.has(x))) return;
    const item = a.closest('li') || a.closest('.column_control_v1') || a;
    item.remove();
  });
}

// Block tables made by WebImporter.Blocks.createBlock: the first row's single cell is the name
function blockName(table) {
  const first = table.rows && table.rows[0];
  if (!first || first.cells.length !== 1) return null;
  const m = clean(first.cells[0].textContent).match(/^(Cards|Columns)\s*(?:\(([^)]*)\))?$/i);
  return m ? { name: m[1].toLowerCase(), variants: (m[2] || '').split(',').map((v) => clean(v).toLowerCase()).filter(Boolean) } : null;
}

const hasImage = (cell) => !!cell.querySelector('img, picture');
const imageOnly = (cells) => cells.every((c) => !clean(c.textContent)) && cells.some(hasImage);

// one item: its cells -> { path, cta } | 'image' | null (anything else)
function analyse(cells) {
  if (imageOnly(cells)) return 'image';
  const links = cells.flatMap((c) => [...c.querySelectorAll('a[href]')]);
  const paths = [...new Set(links.map(teaserPath))];
  if (paths.length !== 1 || !paths[0]) return null;
  const link = links.find((a) => teaserPath(a));
  const heading = cells.some((c) => c.querySelector('h1, h2, h3, h4, h5, h6'));
  return { path: paths[0], link, heading };
}

function teaserRow(doc, item) {
  const p = doc.createElement('p');
  const a = doc.createElement('a');
  a.setAttribute('href', item.path);
  if (item.heading) {
    // the CTA keeps its text and button style (em = secondary, strong = primary); this runs
    // before fedex-cleanup maps the FedEx button classes to em / strong, so they are copied
    a.textContent = clean(item.link.textContent);
    if (item.link.getAttribute('class')) a.setAttribute('class', item.link.getAttribute('class'));
    let wrapped = a;
    let parent = item.link.parentElement;
    while (parent && /^(EM|STRONG)$/.test(parent.tagName)) {
      const w = doc.createElement(parent.tagName.toLowerCase());
      w.append(wrapped);
      wrapped = w;
      parent = parent.parentElement;
    }
    p.append(wrapped);
  } else {
    // no own heading: the link is the title (scripts/teasers.js links the title for a bare path)
    a.textContent = item.path;
    p.append(a);
  }
  return [p];
}

function convertTeaserBlocks(element, doc) {
  element.querySelectorAll('table').forEach((table) => {
    const def = blockName(table);
    if (!def || def.variants.includes('teasers')) return;
    const rows = [...table.rows].slice(1).map((r) => [...r.cells]);
    if (!rows.length) return;
    let items;
    let layout;
    if (def.name === 'cards') {
      items = rows.map(analyse);
      layout = 'cards';
    } else {
      // columns: a row of one teaser ([text | image] or [image | text]) or a grid of teaser cells
      const rowItems = rows.map(analyse);
      if (rowItems.every((i) => i && i !== 'image')) {
        items = rowItems;
        const imageFirst = rows.every((cells) => cells.length > 1 && imageOnly([cells[0]]));
        layout = imageFirst ? 'horizontal' : 'columns';
      } else {
        items = rows.flat().map((c) => analyse([c]));
        layout = 'grid';
      }
    }
    const teasers = items.filter((i) => i && i !== 'image');
    if (!teasers.length || items.some((i) => i === null)) return;

    let name;
    if (layout === 'cards') {
      let variants = def.variants.slice();
      if (teasers.length === 1 && variants.includes('promo')) variants = variants.filter((v) => v !== 'promo').concat('horizontal');
      name = `Cards (${variants.concat('teasers').join(', ')})`;
    } else if (layout === 'horizontal') {
      name = 'Cards (horizontal, teasers)';
    } else if (layout === 'columns') {
      name = `Columns (${def.variants.concat('teasers').join(', ')})`;
    } else {
      name = 'Cards (promo, teasers)';
    }
    const block = WebImporter.Blocks.createBlock(doc, {
      name,
      cells: teasers.map((item) => [teaserRow(doc, item)]),
    });
    table.replaceWith(block);
  });
}

export default function transform(hookName, element, payload) {
  const doc = (payload && payload.document) || element.ownerDocument;
  const original = payload && payload.params && payload.params.originalURL;
  currentPage = pagePath(original);
  if (hookName === 'beforeTransform') {
    setTeaserImage(doc, currentPage);
    return;
  }
  if (hookName === 'afterTransform') convertTeaserBlocks(element, doc);
}
