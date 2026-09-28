/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-horizontal. Base: cards. Source: https://www.fedex.com/en-us/home.html
 * Instances: ... .aem-Grid > div.column_control_v1:nth-of-type(21), (23), (25)
 *
 * Output (matches blocks/cards/cards.js, variant horizontal): ONE block, 2 columns,
 * 1 row per item. Cell 1 = picture, Cell 2 = h3 title, p text, p > a CTA (plain link).
 *
 * The source renders each item as its own column_control_v1. The block is built on the
 * first instance; the following sibling instances (separated only by spacers) are
 * consumed into the same table and removed. When the parser is later invoked on a
 * consumed instance, it just removes it, so exactly one cards-horizontal table results.
 */
const CONSUMED = 'data-cards-horizontal-consumed';

function isItem(el) {
  return el && el.matches && el.matches('div.column_control_v1')
    && !!el.querySelector('.image_v2 img, img')
    && !!el.querySelector('.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, .title_v1 h5, .title_v1 h6');
}

function isFiller(el) {
  // spacers / empty wrappers between the items
  if (!el) return false;
  if (el.matches('div.spacer, hr, br')) return true;
  return !el.textContent.trim() && !el.querySelector('img, picture, video, iframe, a[href]');
}

function buildRow(item, document) {
  const cols = [...item.querySelectorAll(':scope > .row > .fxg-col')];
  const scopeImg = cols.find((c) => c.querySelector('.image_v2 img')) || item;
  const scopeText = cols.find((c) => c.querySelector('.title_v1, .richtext, .button_v1')) || item;

  const img = scopeImg.querySelector('.fxg-desktop-image img') || scopeImg.querySelector('.image_v2 img, img');
  const title = scopeText.querySelector('.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, .title_v1 h5, .title_v1 h6');
  const paras = [...scopeText.querySelectorAll('.richtext p')].filter((p) => p.textContent.trim());
  const cta = scopeText.querySelector('.button_v1 a[href], a.fxg-link[href]');

  let imageCell = '';
  if (img) {
    const ni = document.createElement('img');
    ni.src = img.src || img.getAttribute('src');
    const alt = img.getAttribute('alt');
    ni.alt = alt && alt !== 'null' ? alt : '';
    imageCell = ni;
  }

  const body = [];
  if (title) {
    const h3 = document.createElement('h3');
    h3.textContent = title.textContent.replace(/\s+/g, ' ').trim();
    body.push(h3);
  }
  paras.forEach((p) => {
    const np = document.createElement('p');
    np.innerHTML = p.innerHTML.trim();
    body.push(np);
  });
  if (cta) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = cta.href || cta.getAttribute('href');
    let text = cta.textContent.replace(/\s+/g, ' ').trim();
    // Source shouts one label in caps ("VIEW LANES AND GET A QUOTE"); normalise to sentence case
    if (text.length > 3 && text === text.toUpperCase()) text = text.charAt(0) + text.slice(1).toLowerCase();
    a.textContent = text;
    p.append(a);
    body.push(p);
  }
  if (!imageCell && !body.length) return null;
  return [imageCell, body.length ? body : ''];
}

export default function parse(element, { document }) {
  // Already merged into the block built on the first instance
  if (element.hasAttribute(CONSUMED)) {
    element.remove();
    return;
  }

  // Collect this instance + following sibling items (skipping spacers)
  const items = [element];
  let next = element.nextElementSibling;
  while (next) {
    if (isItem(next)) {
      items.push(next);
    } else if (!isFiller(next)) {
      break;
    }
    next = next.nextElementSibling;
  }

  const cells = items.map((item) => buildRow(item, document)).filter(Boolean);
  if (!cells.length) {
    element.remove();
    return;
  }

  // Mark and remove the merged siblings so they neither leak as default content nor
  // produce extra tables if the importer invokes the parser on them later.
  items.slice(1).forEach((item) => {
    item.setAttribute(CONSUMED, 'true');
    item.remove();
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards (horizontal)', cells });
  element.replaceWith(block);
}
