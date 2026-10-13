/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards (no variant: grid of bordered cards). Template: faq
 * (https://www.fedex.com/nl-nl/customer-support/faq.html, "Veelvoorkomende vragen").
 * Instance: div.fxg-faqlist__sneak-peek (teaser list inside div.faqlist)
 *
 * Source, per teaser: div > div.fxg-faqlist__title (question) + p (excerpt)
 *   + div.fxg-faqlist__read-more > a > span "Lees meer"
 * The teasers have no images, so the table is the 1-column "no images" layout: 1 row per card,
 * a single text cell (blocks/cards/README.md: the image cell is optional, all non-image cells
 * form the card body) holding h3 question, p excerpt, p > a read-more link (a plain-link
 * paragraph renders as the blue uppercase text CTA).
 */
const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();

export default function parse(element, { document }) {
  const cells = [];
  [...element.children].forEach((teaser) => {
    const title = teaser.querySelector('.fxg-faqlist__title');
    const cell = [];
    if (title && clean(title.textContent)) {
      const h3 = document.createElement('h3');
      h3.textContent = clean(title.textContent);
      cell.push(h3);
    }
    teaser.querySelectorAll(':scope > p').forEach((src) => {
      if (!clean(src.textContent)) return;
      const p = document.createElement('p');
      p.innerHTML = src.innerHTML.trim();
      cell.push(p);
    });
    const more = teaser.querySelector('.fxg-faqlist__read-more a[href]');
    if (more && clean(more.textContent)) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = more.getAttribute('href');
      a.textContent = clean(more.textContent);
      p.append(a);
      cell.push(p);
    }
    if (cell.length) cells.push([cell]);
  });

  if (!cells.length) {
    element.remove();
    return;
  }
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'Cards', cells }));
}
