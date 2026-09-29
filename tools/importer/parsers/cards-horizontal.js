/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-horizontal. Base: cards.
 * Templates: home (https://www.fedex.com/en-us/home.html, column_control_v1:nth-of-type(21), (23), (25))
 * and hub-landing (https://www.fedex.com/en-us/shipping/international.html, shipping.html,
 * packing.html, schedule-manage-pickups.html, small-business.html).
 *
 * Output (matches blocks/cards/cards.js, variant horizontal [+ light]): ONE block, 2 columns,
 * 1 row per item. Cell 1 = picture, Cell 2 = h3 title, p text, p > a CTA (plain link).
 *
 * The source renders each item as its own column_control_v1 (image column col-sm-2/3/4 +
 * text column). The block is built on the first instance; the following sibling items
 * (separated only by spacers) are consumed into the same table and removed. When the parser is
 * later invoked on a consumed instance, it just removes it, so exactly one table results per run.
 * A sibling only joins the run when it has the same horizontal shape (image-only first column,
 * titled second column, no third column) and the same panel colour, so e.g. a following 2-up
 * video card grid (cards-promo) or a white row after a #fafafa row is left alone.
 *
 * Landing additions:
 * - `light`: the row is the #fafafa panel (.fxg-row--has-bgcolor with a non-white inline
 *   background-color; the class alone counts when there is no inline style) ->
 *   `Cards (horizontal, light)` (international "Clear customs. And a path forward.").
 * - .fxg-desktop--hide (mobile/tablet-only) copies of the text and image are skipped.
 * The homepage rows have neither, so the homepage output is unchanged.
 *
 * Guide-article addition (https://www.fedex.com/en-us/shipping/returns.html "return situations"):
 * "label rows" = [col-sm-4: nested column_control_v1 (icon | richtext bold label)] [text column:
 * richtext + 1-2 button_v1 text links], no title_v1. Still 2 cells per card: cell 1 = the icon,
 * cell 2 = the label paragraph (bold), the text, then EVERY link, each in its own paragraph;
 * in-page links (#x) stay relative so fedex-cleanup.js rewrites them to EDS heading ids.
 * A label-row leader only merges following label rows. Rows without the nested label keep the
 * original behaviour.
 */
const CONSUMED = 'data-cards-horizontal-consumed';
const HIDDEN = '.fxg-desktop--hide';
const HEADING = '.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, .title_v1 h5, .title_v1 h6';

function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && root.contains(hidden);
}

function visibleCols(item) {
  return [...item.querySelectorAll(':scope > .row > .fxg-col')].filter((c) => !isHidden(c, item));
}

// #fafafa panel row
function isLight(item) {
  const row = item.querySelector(':scope > .row');
  if (!row || !row.classList.contains('fxg-row--has-bgcolor')) return false;
  const bg = ((row.style && row.style.backgroundColor) || '').replace(/\s+/g, '').toLowerCase();
  if (!bg) return true;
  return !/^(#fff(fff)?|white|rgb\(255,255,255\)|transparent|rgba\(0,0,0,0\))$/.test(bg);
}

function isItem(el) {
  if (!el || !el.matches || !el.matches('div.column_control_v1')) return false;
  if (!el.querySelector('.image_v2 img, img') || !el.querySelector(HEADING)) return false;
  // Same horizontal shape as the matched instances: image column, then a titled text column
  const cols = visibleCols(el);
  if (cols.length !== 2) return false;
  const [first, second] = cols;
  return !!first.querySelector('.image_v2 img') && !first.querySelector('.title_v1')
    && !!second.querySelector('.title_v1');
}

// Label-row (returns): the visible label paragraphs of the nested [icon | label] row in the image column
function nestedLabels(imageCol, root) {
  if (!imageCol) return [];
  const nested = imageCol.querySelector(':scope > div > .aem-Grid > .column_control_v1');
  if (!nested || !nested.querySelector('.image_v2 img')) return [];
  return [...nested.querySelectorAll(':scope > .row > .fxg-col .richtext p')]
    .filter((p) => !isHidden(p, root) && p.textContent.replace(/ /g, ' ').trim());
}

function isLabelItem(el) {
  if (!el || !el.matches || !el.matches('div.column_control_v1')) return false;
  const cols = visibleCols(el);
  if (cols.length !== 2) return false;
  const [first, second] = cols;
  return nestedLabels(first, el).length > 0
    && !!second.querySelector(':scope > div > .aem-Grid > .richtext')
    && !second.querySelector(':scope > div > .aem-Grid > :is(.image_v2, .column_control_v1)');
}

function labelParagraph(p, document) {
  const np = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = p.textContent.replace(/[\s ]+/g, ' ').trim();
  np.append(strong);
  return np;
}

function isFiller(el) {
  // spacers / empty wrappers between the items
  if (!el) return false;
  if (el.matches('div.spacer, hr, br')) return true;
  return !el.textContent.trim() && !el.querySelector('img, picture, video, iframe, a[href]');
}

function buildRow(item, document) {
  const cols = [...item.querySelectorAll(':scope > .row > .fxg-col')].filter((c) => !isHidden(c, item));
  const scopeImg = cols.find((c) => c.querySelector('.image_v2 img')) || item;
  // Text columns: usually one; banner-landing billing has icon | heading | text (3 columns)
  let textCols = cols.filter((c) => c !== scopeImg && c.querySelector('.title_v1, .richtext, .button_v1'));
  if (!textCols.length) textCols = [item];
  const inText = (sel) => textCols.flatMap((c) => [...c.querySelectorAll(sel)]);

  // first desktop rendition that is not hidden everywhere (service-guide carries a hidden duplicate)
  const img = [...scopeImg.querySelectorAll('.fxg-desktop-image img')].find((i) => !isHidden(i, item))
    || scopeImg.querySelector('.fxg-desktop-image img')
    || [...scopeImg.querySelectorAll('.image_v2 img, img')].find((i) => !isHidden(i, item));
  const title = inText(HEADING).find((h) => !isHidden(h, item));
  // paragraphs and lists of the text columns (freight "Find air freight support": a list of links)
  const paras = inText('.richtext p, .richtext ul, .richtext ol')
    .filter((p) => !p.parentElement.closest('ul, ol, p') && p.textContent.trim() && !isHidden(p, item));
  const cta = inText('.button_v1 a[href], a.fxg-link[href]').find((a) => !isHidden(a, item));

  let imageCell = '';
  if (img) {
    const ni = document.createElement('img');
    ni.src = img.src || img.getAttribute('src');
    const alt = img.getAttribute('alt');
    ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
    imageCell = ni;
  }

  const body = [];
  // Label rows (returns): bold label paragraph(s) from the nested row in the icon column
  const labels = scopeImg !== item ? nestedLabels(scopeImg, item) : [];
  labels.forEach((p) => body.push(labelParagraph(p, document)));
  if (title) {
    const h3 = document.createElement('h3');
    h3.textContent = title.textContent.replace(/\s+/g, ' ').trim();
    body.push(h3);
  }
  paras.forEach((p) => {
    const np = document.createElement(p.tagName === 'P' ? 'p' : p.tagName.toLowerCase());
    np.innerHTML = p.innerHTML.trim();
    body.push(np);
  });
  // Label rows keep every link (returns "Create a shipping label" + "Find full-service locations")
  const ctas = labels.length
    ? inText('.button_v1 a[href]').filter((a) => !isHidden(a, item) && a.textContent.trim())
    : [cta].filter(Boolean);
  ctas.forEach((link) => {
    const p = document.createElement('p');
    const a = document.createElement('a');
    const raw = link.getAttribute('href') || '';
    // label rows: in-page anchors stay relative (#x) for the jump-link rewrite in fedex-cleanup.js
    a.href = labels.length && raw.startsWith('#') ? raw : (link.href || raw);
    const cta = link;
    let text = cta.textContent.replace(/\s+/g, ' ').trim();
    // Source shouts one label in caps ("VIEW LANES AND GET A QUOTE"); normalise to sentence case
    if (text.length > 3 && text === text.toUpperCase()) text = text.charAt(0) + text.slice(1).toLowerCase();
    a.textContent = text;
    // FedEx button styles map to button emphasis in fedex-cleanup.js (freight *See multiweight services*)
    const cls = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'].filter((c) => cta.classList.contains(c));
    if (cls.length) a.className = cls.join(' ');
    p.append(a);
    body.push(p);
  });
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
  const light = isLight(element);
  const labelRun = isLabelItem(element); // returns label rows only merge label rows
  const items = [element];
  let next = element.nextElementSibling;
  while (next) {
    if ((labelRun ? isLabelItem(next) : isItem(next)) && isLight(next) === light) {
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

  const name = light ? 'Cards (horizontal, light)' : 'cards (horizontal)';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
