/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-promo. Base: cards.
 * Templates: home (https://www.fedex.com/en-us/home.html, div.column_control_v1:nth-of-type(12))
 * and hub-landing (https://www.fedex.com/en-us/shipping/international.html, shipping.html,
 * packing.html, small-business.html).
 *
 * Output (blocks/cards/README.md, variant promo [+ light]): 2 columns, 1 row per card.
 *   Cell 1 = picture, or poster picture + p > a Kaltura link (video card, scripts/video.js)
 *   Cell 2 = h3 title, p text (inline links kept), p > a CTA
 * Iterates the column wrappers (.fxg-col), not the anchors. Source h3/h5 titles become h3.
 *
 * Card shapes per column:
 * - home/landing: .image_v2 + .title_v1 + .richtext + .button_v1 (plain link -> blue text CTA)
 * - landing: .video_v1 (Kaltura player) + .title_v1 + .richtext -> video card
 * - landing: a featured_offer_v2 card (layout7, body on #fafafa) -> the block gets `light`
 *   (`Cards (promo, light)`); its CTA is the a.fxg-featured-button.
 * CTA links keep their FedEx button class (fxg-link--rounded_button, ...) so fedex-cleanup.js
 * maps them to button emphasis (*VIEW SHIPPING SUPPLIES*); fxg-link--blue/bluebold stay plain.
 * The homepage cards use none of these, so the homepage output is unchanged.
 * .fxg-desktop--hide (mobile/tablet-only) content is never copied.
 */
const BUTTON_CLASSES = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'];
const HIDDEN = '.fxg-desktop--hide';

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
  return !!hidden && root.contains(hidden);
}

function newImage(img, document) {
  const ni = document.createElement('img');
  ni.src = img.src || img.getAttribute('src');
  const alt = img.getAttribute('alt');
  ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  return ni;
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

export default function parse(element, { document }) {
  const row = element.querySelector(':scope > .row') || element;
  let cols = [...row.querySelectorAll(':scope > .fxg-col')];
  if (!cols.length) cols = [...element.querySelectorAll('.fxg-col')];
  cols = cols.filter((c) => !isHidden(c, element));

  let featured = false;
  const cells = [];
  cols.forEach((col) => {
    const offer = col.querySelector('.featured_offer_v2');
    if (offer) featured = true;
    // Prefer the title component; a bare heading elsewhere (drop-off's "STEP 1" bar, an h3 inside
    // a richtext) is only the title when there is no title component.
    const title = [...col.querySelectorAll('.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, .title_v1 h5, .title_v1 h6')]
      .find((h) => !isHidden(h, col))
      || [...col.querySelectorAll('h3, h4, h5')].find((h) => !isHidden(h, col));
    // Label headings inside a richtext above the title (drop-off step cards: "STEP n") -> bold line
    const labels = [...col.querySelectorAll('.richtext h1, .richtext h2, .richtext h3, .richtext h4, .richtext h5, .richtext h6')]
      .filter((h) => h !== title && !isHidden(h, col) && h.textContent.trim()
        && (!title || !!(h.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING)));
    const paras = [...col.querySelectorAll('.richtext p')].filter((p) => p.textContent.trim() && !isHidden(p, col));
    const cta = [...col.querySelectorAll('.button_v1 a[href], a.fxg-link[href]')]
      .find((a) => !isHidden(a, col) && !a.classList.contains('hidden') && !/^\/?#$/.test(a.getAttribute('href') || ''));
    const player = col.querySelector(VIDEO);
    const img = player ? null
      : (col.querySelector('.fxg-desktop-image img')
        || [...col.querySelectorAll('.image_v2 img, img')].find((i) => !isHidden(i, col)));
    if (!img && !player && !title && !paras.length && !cta) return;

    let imageCell = '';
    if (player) {
      const v = videoCell(player.closest('.video_v1, .fxg-video-component') || player, title && title.textContent, document);
      if (v.length) imageCell = v;
    } else if (img) {
      imageCell = newImage(img, document);
    }

    const body = [];
    labels.forEach((h) => {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = h.textContent.replace(/\s+/g, ' ').trim();
      p.append(strong);
      body.push(p);
    });
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
      a.textContent = cta.textContent.replace(/\s+/g, ' ').trim();
      const cls = BUTTON_CLASSES.filter((c) => cta.classList.contains(c));
      if (cls.length) a.className = cls.join(' ');
      p.append(a);
      body.push(p);
    }
    cells.push([imageCell, body.length ? body : '']);
  });

  if (!cells.length) {
    element.remove();
    return;
  }

  // featured_offer_v2 cards carry their body on the #fafafa panel -> light modifier
  const name = featured ? 'Cards (promo, light)' : 'cards (promo)';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
