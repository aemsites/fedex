/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-promo. Base: cards. Source: https://www.fedex.com/en-us/home.html
 * Instance: ... .aem-Grid > div.column_control_v1:nth-of-type(12)
 *
 * Output (matches blocks/cards/cards.js, variant promo): 2 columns, 1 row per card.
 *   Cell 1 = picture, Cell 2 = h3 title, p text, p > a CTA (plain link, no bold/italic,
 *   so the block styles it as the blue text CTA).
 * Iterates the column wrappers (.fxg-col), not the anchors. Source h5 titles become h3.
 */
export default function parse(element, { document }) {
  const row = element.querySelector(':scope > .row') || element;
  let cols = [...row.querySelectorAll(':scope > .fxg-col')];
  if (!cols.length) cols = [...element.querySelectorAll('.fxg-col')];

  const cells = [];
  cols.forEach((col) => {
    const img = col.querySelector('.fxg-desktop-image img') || col.querySelector('.image_v2 img, img');
    const title = col.querySelector('.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, .title_v1 h5, .title_v1 h6, h3, h4, h5');
    const paras = [...col.querySelectorAll('.richtext p')].filter((p) => p.textContent.trim());
    const cta = col.querySelector('.button_v1 a[href], a.fxg-link[href]');
    if (!img && !title && !paras.length && !cta) return;

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
      a.textContent = cta.textContent.replace(/\s+/g, ' ').trim();
      p.append(a);
      body.push(p);
    }
    cells.push([imageCell, body.length ? body : '']);
  });

  if (!cells.length) {
    element.remove();
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards (promo)', cells });
  element.replaceWith(block);
}
