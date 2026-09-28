/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-promo. Base: columns. Source: https://www.fedex.com/en-us/home.html
 * Instance: div.featured_offer_v2
 *
 * Output (matches blocks/columns/columns.js, variants promo + light): 2 columns, 1 row.
 *   Cell 1: h3 title, p text, p > a CTA (plain link -> blue text CTA)
 *   Cell 2: picture
 * The empty "Link" [/#] a.fxg-featured-button artifact is dropped. The mobile duplicate
 * (column_control_v1:nth-of-type(17)) is removed by the cleanup transformer.
 */
export default function parse(element, { document }) {
  const detail = element.querySelector('.fxg-featured-offer__detail') || element;
  const title = detail.querySelector('.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, .title_v1 h5, h2, h3, h4');
  const paras = [...detail.querySelectorAll('.richtext p')].filter((p) => p.textContent.replace(/ /g, ' ').trim());
  const cta = [...detail.querySelectorAll('.button_v1 a[href], a[href]')]
    .find((a) => !a.classList.contains('fxg-featured-button') && a.textContent.trim() && !/^\/?#$/.test(a.getAttribute('href')));
  const img = element.querySelector('.fxg-featured-offer__detail-image img')
    || [...element.querySelectorAll('img')].find((i) => !(i.getAttribute('src') || '').startsWith('data:'));

  const textCell = [];
  if (title) {
    const h3 = document.createElement('h3');
    h3.textContent = title.textContent.replace(/\s+/g, ' ').trim();
    textCell.push(h3);
  }
  paras.forEach((p) => {
    const np = document.createElement('p');
    np.innerHTML = p.innerHTML.replace(/(&nbsp;| )+\s*$/g, '').trim();
    textCell.push(np);
  });
  if (cta) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = cta.href || cta.getAttribute('href');
    a.textContent = cta.textContent.replace(/\s+/g, ' ').trim();
    p.append(a);
    textCell.push(p);
  }

  let imageCell = '';
  if (img) {
    const ni = document.createElement('img');
    ni.src = img.src || img.getAttribute('src');
    const alt = img.getAttribute('alt');
    ni.alt = alt && alt !== 'null' ? alt : '';
    imageCell = ni;
  }

  if (!textCell.length && !imageCell) {
    element.remove();
    return;
  }

  const cells = [[textCell.length ? textCell : '', imageCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns (promo, light)', cells });
  element.replaceWith(block);
}
