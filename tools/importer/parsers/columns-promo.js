/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-promo. Base: columns.
 * Templates: home (https://www.fedex.com/en-us/home.html) and hub-landing
 * (https://www.fedex.com/en-us/shipping/international.html, shipping.html, packing.html,
 * schedule-manage-pickups.html, small-business.html).
 *
 * Output (blocks/columns/README.md, variant promo [+ light]): 2 columns, 1 row, cells in
 * source (desktop) order:
 *   text cell:  h3 title, p text, p > a CTA
 *   media cell: picture, or poster picture + p > a Kaltura link (click-to-play, scripts/video.js)
 *
 * Source shapes:
 * A. div.featured_offer_v2 (home + landing) -> `Columns (promo, light)` (always on the #fafafa panel).
 *    - CTA: the .button_v1 link; else the a.fxg-featured-button when it is a real link. The empty
 *      "Link" [/#] a.fxg-featured-button.hidden artifact is dropped.
 *    - Media: .fxg-featured-offer__detail-image img, or the Kaltura video_v1 player (layout4).
 *    The homepage mobile duplicate (column_control_v1:nth-of-type(17)) is removed by the cleanup
 *    transformer.
 * B. div.column_control_v1 with a media column (.image_v2 / .video_v1) and a text column
 *    (landing only) -> `Columns (promo)`, or `Columns (promo, light)` when the row is the
 *    #fafafa panel (.fxg-row--has-bgcolor with a non-white background-color; without an inline
 *    style the class alone counts).
 *    A visible richtext line that duplicates a mobile-only heading (e.g. shipping.html
 *    "FedEx. The New Power Move.") becomes the h3.
 *
 * CTA links keep their FedEx button class (fxg-link--rounded_button, fxg-button--orange,
 * fxg-button--transparent) so fedex-cleanup.js maps them to button emphasis; others stay plain
 * links (blue text CTA). .fxg-desktop--hide (mobile/tablet-only) content is never copied.
 */
const BUTTON_CLASSES = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'];
const HIDDEN = '.fxg-desktop--hide';
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

// Kaltura (FedEx video_v1 / mavice player). Ids verified in the raw international snapshot
// (data-mavice-kp-videoid / -partnerid / -playerid); the title map is the fallback for DOMs that
// lost the data attributes (e.g. migration-work/cleaned.html). See authoring-analysis.json.
const KALTURA_PARTNER = '4296983';
const KALTURA_UICONF = '55255333';
const KNOWN_VIDEOS = {
  'deliver on time, even to another hemisphere': '1_rxmtv27g',
  'estimate international rates': '1_nrmgxv6s',
  'managing your international shipping preferences': '1_9jmg7rfo',
  'use these tips to help you clear customs': '1_5ndrewu1',
  'avoid delays for global deliveries': '1_ax21z86b',
};
const VIDEO = '.video_v1, .fxg-video-component, .mavice-kp-outer, [data-mavice-kp-videoid]';

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && (!root || root.contains(hidden) || hidden === root);
}

function newImage(img, document) {
  const ni = document.createElement('img');
  ni.src = img.src || img.getAttribute('src');
  const alt = img.getAttribute('alt');
  ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  return ni;
}

function ctaParagraph(src, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = src.href || src.getAttribute('href');
  a.textContent = clean(src.textContent);
  const cls = BUTTON_CLASSES.filter((c) => src.classList.contains(c));
  if (cls.length) a.className = cls.join(' ');
  p.append(a);
  return p;
}

function isRealLink(a) {
  return !!a && !!clean(a.textContent) && !a.classList.contains('hidden')
    && !/^\/?#?$/.test(a.getAttribute('href') || '');
}

// Poster picture + Kaltura link for a video_v1 player (empty array when nothing usable)
function videoCell(scope, title, document) {
  const holder = scope.querySelector('[data-mavice-kp-videoid]');
  let entryId = holder && holder.getAttribute('data-mavice-kp-videoid');
  const partnerId = (holder && holder.getAttribute('data-mavice-kp-partnerid')) || KALTURA_PARTNER;
  const uiconfId = (holder && holder.getAttribute('data-mavice-kp-playerid')) || KALTURA_UICONF;
  if (!entryId) {
    // player element id is the entry id without the underscore (1nrmgxv6s -> 1_nrmgxv6s)
    const pid = (scope.querySelector('.mavice-kp-player[id]') || {}).id || '';
    const m = pid.match(/^(\d)_?([a-z0-9]{8})$/i);
    if (m) entryId = `${m[1]}_${m[2]}`;
  }
  if (!entryId && title) entryId = KNOWN_VIDEOS[clean(title).toLowerCase()];

  const cell = [];
  const posterImg = [...scope.querySelectorAll('.playkit-poster img, img')]
    .find((i) => /\S/.test(i.getAttribute('src') || '') && !(i.getAttribute('src') || '').startsWith('data:'));
  const thumb = holder && holder.getAttribute('data-mavice-kp-thumbnail');
  const videoPoster = scope.querySelector('video[poster]');
  if (posterImg) {
    cell.push(newImage(posterImg, document));
  } else if (thumb || videoPoster) {
    const ni = document.createElement('img');
    ni.src = new URL(thumb || videoPoster.getAttribute('poster'), 'https://www.fedex.com').href;
    ni.alt = '';
    cell.push(ni);
  }
  if (entryId) {
    const url = `https://www.kaltura.com/index.php/extwidget/preview/partner_id/${partnerId}/uiconf_id/${uiconfId}/entry_id/${entryId}`;
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    p.append(a);
    cell.push(p);
  }
  return cell;
}

function titleHeading(src, document) {
  const h3 = document.createElement('h3');
  h3.textContent = clean(src.textContent);
  return h3;
}

function cleanParagraph(p, document) {
  const np = document.createElement('p');
  np.innerHTML = p.innerHTML.replace(/(&nbsp;| )+\s*$/g, '').trim();
  return np;
}

// #fafafa panel row (block-level light modifier)
function isLightRow(row) {
  if (!row || !row.classList.contains('fxg-row--has-bgcolor')) return false;
  const bg = ((row.style && row.style.backgroundColor) || '').replace(/\s+/g, '').toLowerCase();
  if (!bg) return true;
  return !/^(#fff(fff)?|white|rgb\(255,255,255\)|transparent|rgba\(0,0,0,0\))$/.test(bg);
}

/* ---------- A. featured_offer_v2 ---------- */
function parseFeaturedOffer(element, document) {
  const offer = element.querySelector('.fxg-featured-offer') || element;
  const detail = offer.querySelector('.fxg-featured-offer__detail') || element;
  const title = detail.querySelector('.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, .title_v1 h5, h2, h3, h4');
  const paras = [...detail.querySelectorAll('.richtext p')].filter((p) => p.textContent.replace(/ /g, ' ').trim());
  let cta = [...detail.querySelectorAll('.button_v1 a[href], a[href]')]
    .find((a) => !a.classList.contains('fxg-featured-button') && a.textContent.trim() && !/^\/?#$/.test(a.getAttribute('href')));
  // Landing: the featured button itself is the CTA ("START SAVING")
  if (!cta) cta = [...detail.querySelectorAll('a.fxg-featured-button[href]')].find(isRealLink);

  const textCell = [];
  if (title) textCell.push(titleHeading(title, document));
  paras.forEach((p) => textCell.push(cleanParagraph(p, document)));
  if (cta) textCell.push(ctaParagraph(cta, document));

  // Media: Kaltura player (landing layout4) or image
  const player = offer.querySelector(VIDEO);
  let mediaCell = '';
  let mediaEl = null;
  if (player) {
    mediaEl = player.closest('.fxg-featured-offer__detail-image, .fxg-video-component') || player;
    const v = videoCell(mediaEl, title && title.textContent, document);
    if (v.length) mediaCell = v;
  } else {
    const img = element.querySelector('.fxg-featured-offer__detail-image img')
      || [...element.querySelectorAll('img')].find((i) => !(i.getAttribute('src') || '').startsWith('data:'));
    if (img) {
      mediaCell = newImage(img, document);
      mediaEl = img;
    }
  }

  if (!textCell.length && !mediaCell) {
    element.remove();
    return;
  }

  const text = textCell.length ? textCell : '';
  // Source (desktop) order: media first when it precedes the detail (e.g. layout4 video left)
  const mediaFirst = mediaEl && detail !== element
    && !!(mediaEl.compareDocumentPosition(detail) & Node.DOCUMENT_POSITION_FOLLOWING);
  const cells = [mediaFirst ? [mediaCell, text] : [text, mediaCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns (promo, light)', cells });
  element.replaceWith(block);
}

/* ---------- A2. featured_offer_v2 "two" (text over photo, banner-landing) ---------- */
// .fxg-featured-offer-two (layout5/layout6): the photo fills the row and the text sits on a
// translucent panel -> `Columns (promo, overlay)`. Cell order follows the panel side measured on
// the live pages: layout6 (claims "Stay informed and manage deliveries", <img> before the text)
// = panel right -> [image, text]; layout5 (drop-off "Find your way with the How-to Hub", photo as
// CSS background) = panel left -> [text, image].
function parseOverlay(element, offer, document) {
  const item = offer.querySelector('.fxg-offer__item') || offer;
  const textCell = [];
  const title = [...item.querySelectorAll('.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, .title_v1 h5, .title_v1 h6')]
    .find((h) => !isHidden(h, element));
  if (title) textCell.push(titleHeading(title, document));
  [...item.querySelectorAll('.richtext p')].forEach((p) => {
    if (isHidden(p, element) || !clean(p.textContent)) return;
    // a first paragraph that is only a large-font span is the panel heading
    const only = p.children.length === 1 && p.firstElementChild.matches('span[class*="fxg-font-size-"]')
      && clean(p.firstElementChild.textContent) === clean(p.textContent);
    if (!textCell.length && only) {
      textCell.push(titleHeading(p, document));
      return;
    }
    textCell.push(cleanParagraph(p, document));
  });
  const cta = [...offer.querySelectorAll('.button_v1 a[href], a.fxg-featured-button[href]')]
    .find((a) => isRealLink(a) && !isHidden(a, element));
  if (cta) textCell.push(ctaParagraph(cta, document));

  let image = null;
  const img = [...offer.querySelectorAll('img')].find((i) => !(i.getAttribute('src') || '').startsWith('data:') && !isHidden(i, element));
  if (img) {
    image = newImage(img, document);
  } else {
    const m = (offer.getAttribute('style') || '').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (m) {
      image = document.createElement('img');
      image.src = new URL(m[1], document.baseURI && !document.baseURI.startsWith('about:') ? document.baseURI : 'https://www.fedex.com').href;
      image.alt = '';
    }
  }
  if (!textCell.length && !image) {
    element.remove();
    return;
  }
  const textFirst = offer.classList.contains('layout5')
    || (!!img && !!(item.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING));
  const text = textCell.length ? textCell : '';
  const media = image || '';
  const block = WebImporter.Blocks.createBlock(document, {
    name: 'Columns (promo, overlay)',
    cells: [textFirst ? [text, media] : [media, text]],
  });
  element.replaceWith(block);
}

/* ---------- B. column_control_v1 (landing) ---------- */
function textCellFrom(col, document) {
  const cell = [];
  const grid = col.querySelector('.aem-Grid') || col;
  const hiddenTitles = [...grid.querySelectorAll(`.title_v1 ${HEADINGS.split(', ').join(', .title_v1 ')}`)]
    .filter((h) => isHidden(h, col))
    .map((h) => clean(h.textContent).toLowerCase());
  let hasTitle = false;
  [...grid.children].forEach((comp) => {
    if (isHidden(comp, col)) return;
    if (comp.matches('.title_v1')) {
      const h = [...comp.querySelectorAll(HEADINGS)].find((el) => !isHidden(el, col));
      if (h && clean(h.textContent)) {
        cell.push(titleHeading(h, document));
        hasTitle = true;
      }
    } else if (comp.matches('.richtext')) {
      [...comp.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol')].forEach((p) => {
        if (p.parentElement.closest('ul, ol, p')) return;
        if (!p.matches('p')) {
          // subheads and lists inside the text (service-guide "Shipping rates": h4 intro)
          if (isHidden(p, col) || !clean(p.textContent)) return;
          const clone = p.cloneNode(true);
          clone.querySelectorAll('*').forEach((n) => { n.removeAttribute('style'); n.removeAttribute('class'); });
          clone.removeAttribute('style');
          clone.removeAttribute('class');
          cell.push(clone);
          return;
        }
        if (isHidden(p, col) || !p.textContent.replace(/ /g, ' ').trim()) return;
        // richtext line standing in for the (mobile-only) heading -> h3
        if (!hasTitle && !cell.length && hiddenTitles.includes(clean(p.textContent).toLowerCase())) {
          const h3 = document.createElement('h3');
          h3.innerHTML = p.innerHTML.trim();
          h3.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
          cell.push(h3);
          hasTitle = true;
          return;
        }
        cell.push(cleanParagraph(p, document));
      });
    } else if (comp.matches('.button_v1')) {
      [...comp.querySelectorAll('a[href]')]
        .filter((a) => isRealLink(a) && !isHidden(a, col))
        .forEach((a) => cell.push(ctaParagraph(a, document)));
    } else if (comp.matches('.column_control_v1')) {
      // nested link columns inside the text column (service-guide "Shipping rates")
      [...comp.querySelectorAll(':scope > .row > .fxg-col')]
        .filter((c) => !isHidden(c, col))
        .forEach((c) => cell.push(...textCellFrom(c, document)));
    }
  });
  return cell;
}

/* ---------- C. plain Columns (service-overview) ---------- */
// Text + photo rows without the promo panel/bleed: the text column has no title component of its
// own - only richtext (freight "If your shipment is over 150 lbs.") or nested column_control_v1
// rows (freight "Get access to industry-leading freight delivery" checklist, manage-account
// "Shipping designed with your business in mind"). Output: `Columns`, 1 row, cells in source order.
// Lists stay lists: typed "– " lines after a list nest under its last item, and nested
// [icon | text] rows become list items (the check icons are dropped).
const DASH = /^[–—-]\s+/;

function gridOf(col) {
  return col.querySelector(':scope > div > .aem-Grid') || col.querySelector('.aem-Grid') || col;
}

function isPlainShape(cols) {
  const textCols = cols.filter((c) => c.querySelector('.title_v1, .richtext, .button_v1'));
  return textCols.length > 0 && textCols.every((c) => ![...gridOf(c).children].some((g) => g.matches('.title_v1')));
}

function stripLead(el, re) {
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.textContent.trim()) { n.textContent = n.textContent.replace(re, ''); break; }
  }
  return el;
}

function plainRichtext(rt, root, document, out) {
  [...rt.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6')].forEach((el) => {
    if (el.parentElement.closest('ul, ol, p') || isHidden(el, root) || !clean(el.textContent)) return;
    const clone = el.cloneNode(true);
    [clone, ...clone.querySelectorAll('*')].forEach((n) => { n.removeAttribute('style'); n.removeAttribute('class'); });
    clone.querySelectorAll('span').forEach((sp) => sp.replaceWith(...sp.childNodes));
    // trailing &nbsp; left by the source editor
    [clone, ...clone.querySelectorAll('li')].forEach((n) => {
      n.innerHTML = n.innerHTML.replace(/(&nbsp;|\s)+(<\/?(ul|ol)[^>]*>|$)/g, '$2').replace(/^\s+/, '');
    });
    const last = out[out.length - 1];
    if (clone.matches('p') && DASH.test(clean(clone.textContent)) && last && last.matches && last.matches('ul, ol')) {
      const li = last.lastElementChild;
      let sub = li && li.lastElementChild && li.lastElementChild.matches('ul') ? li.lastElementChild : null;
      if (li && !sub) { sub = document.createElement('ul'); li.append(sub); }
      const item = document.createElement('li');
      item.innerHTML = stripLead(clone, /^[\s\u00a0]*[–—-][\s\u00a0]*/).innerHTML.replace(/(&nbsp;|\s)+$/g, '').trim();
      (sub || last).append(item);
      return;
    }
    out.push(clone);
  });
}

function plainWalk(grid, root, document, out) {
  [...grid.children].forEach((comp) => {
    if (isHidden(comp, root)) return;
    if (comp.matches('.title_v1')) {
      const h = [...comp.querySelectorAll(HEADINGS)].find((el) => !isHidden(el, root));
      if (h && clean(h.textContent)) out.push(titleHeading(h, document));
    } else if (comp.matches('.richtext')) {
      plainRichtext(comp, root, document, out);
    } else if (comp.matches('.button_v1')) {
      [...comp.querySelectorAll('a[href]')].filter((a) => isRealLink(a) && !isHidden(a, root))
        .forEach((a) => out.push(ctaParagraph(a, document)));
    } else if (comp.matches('.column_control_v1')) {
      const sub = [...comp.querySelectorAll(':scope > .row > .fxg-col')].filter((c) => !isHidden(c, root));
      const iconCol = sub.find((c) => c.querySelector('.image_v2') && !clean(c.textContent));
      const textCol = sub.find((c) => c !== iconCol && clean(c.textContent));
      if (iconCol && textCol) {
        // [check icon | text] row -> list item
        const parts = [];
        plainWalk(gridOf(textCol), root, document, parts);
        const li = document.createElement('li');
        li.innerHTML = parts.map((n) => (n.matches('p') ? n.innerHTML : n.outerHTML)).join(' ').replace(/(&nbsp;|\s)+$/g, '');
        const last = out[out.length - 1];
        if (last && last.matches && last.matches('ul[data-checklist]')) last.append(li);
        else {
          const ul = document.createElement('ul');
          ul.setAttribute('data-checklist', '');
          ul.append(li);
          out.push(ul);
        }
        return;
      }
      sub.forEach((c) => plainWalk(gridOf(c), root, document, out));
    }
  });
  return out;
}

function parsePlainColumns(element, cols, document) {
  const cells = [];
  cols.forEach((col) => {
    if (!clean(col.textContent)) {
      const img = [...col.querySelectorAll('.fxg-desktop-image img')].find((i) => !isHidden(i, element))
        || [...col.querySelectorAll('img')].find((i) => !isHidden(i, element) && !(i.getAttribute('src') || '').startsWith('data:'));
      if (img) cells.push(newImage(img, document));
      return;
    }
    const t = plainWalk(gridOf(col), element, document, []);
    t.forEach((n) => n.removeAttribute && n.removeAttribute('data-checklist'));
    if (t.length) cells.push(t);
  });
  if (!cells.length) {
    element.remove();
    return;
  }
  const block = WebImporter.Blocks.createBlock(document, { name: 'Columns', cells: [cells] });
  element.replaceWith(block);
}

// Guide-article (returns "Sending a return with reusable packaging"): a white row with a narrow
// photo-only column (col-sm-4) and a titled text column (col-sm-8: title_v1, richtext, button_v1)
// is plain `Columns` too: 1 row, 2 cells (photo | h3, text, link), cells in source order.
// The promo shapes use col-sm-6 or text-first rows, so they never reach this branch.
function isNarrowPhotoText(row, cols) {
  if (cols.length !== 2 || row.classList.contains('fxg-row--has-bgcolor')) return false;
  const [photo, text] = cols;
  return photo.matches('.col-sm-4') && !clean(photo.textContent) && !!photo.querySelector('.image_v2 img')
    && text.matches('.col-sm-8') && [...gridOf(text).children].some((g) => g.matches('.title_v1'))
    && !text.querySelector('.image_v2, .video_v1');
}

function parseColumnControl(element, document) {
  const row = element.querySelector(':scope > .row') || element;
  const cols = [...row.querySelectorAll(':scope > .fxg-col')].filter((c) => !isHidden(c, element));
  if (!element.querySelector(VIDEO) && isNarrowPhotoText(row, cols)) {
    parsePlainColumns(element, cols, document);
    return;
  }
  if (!element.querySelector(VIDEO) && isPlainShape(cols)) {
    parsePlainColumns(element, cols, document);
    return;
  }
  const title = element.querySelector('.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, .title_v1 h5');

  const cells = [];
  cols.forEach((col) => {
    const hasText = !!col.querySelector('.title_v1, .richtext, .button_v1');
    if (col.querySelector(VIDEO) && !hasText) {
      const v = videoCell(col, title && title.textContent, document);
      if (v.length) cells.push(v);
    } else if (!hasText) {
      const img = col.querySelector('.fxg-desktop-image img')
        || [...col.querySelectorAll('.image_v2 img, img')].find((i) => !isHidden(i, col) && !(i.getAttribute('src') || '').startsWith('data:'));
      if (img) cells.push(newImage(img, document));
    } else {
      const t = textCellFrom(col, document);
      if (t.length) cells.push(t);
    }
  });

  if (!cells.length) {
    element.remove();
    return;
  }

  const name = isLightRow(row) ? 'Columns (promo, light)' : 'Columns (promo)';
  const block = WebImporter.Blocks.createBlock(document, { name, cells: [cells] });
  element.replaceWith(block);
}

export default function parse(element, { document }) {
  const overlay = element.querySelector('.fxg-featured-offer-two');
  if (overlay && !element.querySelector('.fxg-featured-offer')) {
    parseOverlay(element, overlay, document);
  } else if (element.matches('.featured_offer_v2') || element.querySelector(':scope > .fxg-wrapper > .fxg-featured-offer')) {
    parseFeaturedOffer(element, document);
  } else {
    parseColumnControl(element, document);
  }
}
