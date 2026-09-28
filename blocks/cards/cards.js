import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * cards: one row per card. An image-only cell becomes the card image, all other
 * cells are merged into the card body. A paragraph holding only a plain link
 * becomes the card CTA.
 * Variants: icon-links (icon + link, whole item clickable), promo, horizontal.
 */
export default function decorate(block) {
  const iconLinks = block.classList.contains('icon-links');
  const imageWidth = iconLinks ? '160' : '750';
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.some((c) => c.textContent.trim() || c.querySelector('picture'))) return;
    const li = document.createElement('li');
    const body = document.createElement('div');
    body.className = 'cards-card-body';

    cells.forEach((cell) => {
      const pic = cell.querySelector('picture');
      if (pic && !cell.textContent.trim()) {
        cell.className = 'cards-card-image';
        const img = pic.querySelector('img');
        pic.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: imageWidth }]));
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

  block.replaceChildren(ul);
}
