import { createOptimizedPicture } from '../../scripts/aem.js';
import decorateVideo, { setVideoTitle } from '../../scripts/video.js';

/**
 * Flags a card image as an icon (square-ish artwork rather than a 727:463 photo),
 * so layouts that crop photos show icons whole instead. Uses the authored
 * width/height when present, otherwise the loaded image's natural size.
 * @param {Element} cell The image cell
 * @param {HTMLImageElement} original The authored image
 */
function markIcon(cell, original) {
  const isIcon = (w, h) => w > 0 && h / w >= 0.8;
  const w = Number(original.getAttribute('width'));
  const h = Number(original.getAttribute('height'));
  if (w && h) {
    cell.classList.toggle('cards-card-icon', isIcon(w, h));
    return;
  }
  const img = cell.querySelector('img');
  if (!img) return;
  const check = () => cell.classList.toggle('cards-card-icon', isIcon(img.naturalWidth, img.naturalHeight));
  if (img.complete && img.naturalWidth) check();
  else img.addEventListener('load', check, { once: true });
}

/**
 * logos: turns a row into an image-only logo item. The logo may be linked either by
 * the author linking the image itself or by a link next to it (any cell of the row);
 * the link text is dropped and the picture becomes the link. Text is ignored.
 * @param {Element} row The card row
 * @param {HTMLLIElement} li The card item
 * @returns {boolean} true when the row held a logo
 */
function buildLogo(row, li) {
  const pic = row.querySelector('picture');
  if (!pic) return false;
  const img = pic.querySelector('img');
  const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
  const cell = document.createElement('div');
  cell.className = 'cards-card-image';
  const link = pic.closest('a[href]') || row.querySelector('a[href]');
  if (link) {
    const a = document.createElement('a');
    a.href = link.href;
    if (link.title) a.title = link.title;
    if (!img.alt && link.textContent.trim() && !/^https?:/.test(link.textContent.trim())) {
      optimized.querySelector('img').alt = link.textContent.trim();
    }
    a.append(optimized);
    cell.append(a);
  } else {
    cell.append(optimized);
  }
  li.append(cell);
  return true;
}

/**
 * cards: one row per card. An image-only cell becomes the card image, all other
 * cells are merged into the card body. A paragraph holding only a plain link
 * becomes the card CTA. A poster image + Kaltura link cell becomes a click-to-play video.
 * Variants: icon-links (icon + link, whole item clickable), promo, horizontal,
 * icon (icon + heading/text/link grid), centered (icon-top, centered; with icon),
 * light (panel background), logos (image-only logo grid, optionally linked).
 */
export default function decorate(block) {
  const iconLinks = block.classList.contains('icon-links');
  const icon = block.classList.contains('icon');
  const horizontal = block.classList.contains('horizontal');
  const logos = block.classList.contains('logos');
  const imageWidth = iconLinks || icon ? '160' : '750';
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.some((c) => c.textContent.trim() || c.querySelector('picture'))) return;
    const li = document.createElement('li');
    if (logos) {
      if (buildLogo(row, li)) ul.append(li);
      return;
    }
    const body = document.createElement('div');
    body.className = 'cards-card-body';

    cells.forEach((cell) => {
      const pic = cell.querySelector('picture');
      if (pic && decorateVideo(cell)) {
        // poster image + video link: optimize the poster, keep it as the card media
        const img = cell.querySelector('img');
        img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: imageWidth }]));
        cell.className = 'cards-card-image cards-card-video';
        li.append(cell);
      } else if (pic && !cell.textContent.trim()) {
        cell.className = 'cards-card-image';
        const img = pic.querySelector('img');
        pic.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: imageWidth }]));
        if (horizontal) markIcon(cell, img);
        li.append(cell);
      } else {
        body.append(...cell.childNodes);
      }
    });

    body.querySelectorAll('p').forEach((p) => {
      const a = p.querySelector('a');
      if (a && !a.classList.contains('button') && p.textContent.trim() === a.textContent.trim()) {
        p.classList.add('cards-card-cta');
      }
    });
    if (body.textContent.trim()) li.append(body);

    // video: name the player after the card heading
    const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) setVideoTitle(li.querySelector('.video-embed'), heading.textContent.trim());

    // icon-links: link the icon to the item's target so the whole item is clickable
    const image = li.querySelector('.cards-card-image');
    const link = body.querySelector('a[href]');
    if (iconLinks && image && link) {
      const iconLink = document.createElement('a');
      iconLink.href = link.href;
      iconLink.tabIndex = -1;
      iconLink.setAttribute('aria-hidden', 'true');
      iconLink.append(...image.childNodes);
      image.append(iconLink);
    }
    ul.append(li);
  });

  // item count lets layouts adapt, e.g. promo with 2 cards lays out 2 across
  block.classList.add(`cards-${ul.children.length}-items`);
  block.replaceChildren(ul);
}
