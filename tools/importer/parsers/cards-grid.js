/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-grid. Base: cards (blocks/cards/README.md). Template: generic-landing.
 * Instance: .column_control_v1[data-fedex-block="cards-grid"], tagged by
 * transformers/fedex-landing.js with data-fedex-kind (and data-fedex-run for sibling runs; the
 * first of a run builds the block, the others are consumed).
 *
 * Output follows the library Cards convention: 2 columns, one row per card,
 * cell 1 = image or icon, cell 2 = text (title heading, description, CTA link).
 * - kind `split` (desktop rows split by component type, merged per column by the transformer):
 *   - icon + link + text per column (shipping.html "Servicegids, tarieven en retouren"):
 *     `Cards (icon-links)` rows: icon | link, description; `arrows` when the source link carries
 *     a chevron (a.fxg-link--carrot).
 *   - image + link-only paragraph + text (shipping.html "Vracht / E-commerce / Azie-Pacific"):
 *     `Cards (icon, centered)` rows: image | ### [title](link), text; `large` for photo artwork
 *     (non-SVG, the 144px circles).
 * - kind `icons` (freight-services "Waarom zou u FedEx kiezen": rows of 2 columns, each an SVG
 *   icon above a title and text): `Cards (icon, centered, two-columns)`, rows read row-major.
 * - kind `icon-right` (freight-services "Specialistische oplossingen": grey rows of title + text
 *   with the icon in a narrow right column): `Cards (horizontal, icon-right)` [+ light, compact],
 *   rows: icon | ### title, text (the icon is still cell 1; the variant places it on the right).
 */
import {
  clean, columns, components, image, isLightRow, link, textContent,
} from '../utils/components.js';

const RUN = 'data-fedex-run';

function runMembers(element) {
  const id = element.getAttribute(RUN);
  if (!id) return [element];
  return [...element.ownerDocument.querySelectorAll(`[${RUN}="${id}"]`)];
}

// one card row: [image | text]
const card = (img, body) => [img || '', body.length ? body : ''];

// members: the card rows of one split grid (one column_control_v1 per row of cards)
function splitCards(members, document) {
  const cols = members.flatMap((m) => columns(m));
  const rootOf = (col) => members.find((m) => m.contains(col));
  // icon-links: exactly one link per column (ship-to-apac has two link rows -> generic cards)
  const buttonLinks = (c) => [...c.querySelectorAll('.button_v1 a[href]')].filter((x) => clean(x.textContent));
  // (and no title: titled columns, international-connect-plus, are generic cards)
  const withButton = cols.every((c) => buttonLinks(c).length === 1
    && !components(c).some((k) => k.matches('.title_v1')));
  if (withButton) {
    // icon-links: icon | link, description
    let arrows = false;
    const cells = cols.map((col) => {
      const body = [];
      const a = [...col.querySelectorAll('.button_v1 a[href]')].find((x) => clean(x.textContent));
      if (a) {
        if (a.classList.contains('fxg-link--carrot')) arrows = true;
        const p = document.createElement('p');
        p.append(link(a, document));
        body.push(p);
      }
      components(col).filter((k) => k.matches('.richtext')).forEach((rt) => {
        [...rt.querySelectorAll('p')].filter((p) => clean(p.textContent)).forEach((p) => {
          const np = document.createElement('p');
          np.innerHTML = p.innerHTML.replace(/\s+/g, ' ').trim();
          np.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
          body.push(np);
        });
      });
      return card(image(col, rootOf(col), document), body);
    });
    return { name: `Cards (icon-links${arrows ? ', arrows' : ''})`, cells };
  }
  // the artwork decides the card type: SVG icons -> icon cards; PNG artwork (the 144px circle
  // photos of shipping.html) -> `large` icon cards; JPEG photos (ship-to-apac "Deskundig advies",
  // 727:463 crops with links below) -> centred promo cards, every link kept as a CTA
  const srcs = cols.map((c) => ((c.querySelector('img') && c.querySelector('img').getAttribute('src')) || '').split('?')[0]);
  if (srcs.every((s) => /\.jpe?g$/i.test(s))) {
    const cells = cols.map((col) => card(image(col, rootOf(col), document), textContent(col, rootOf(col), document, { heading: 'h3' })));
    // 2 cards per source row (healthcare 2 x 2) -> two-columns; otherwise the block's own grid
    const perRow = columns(members[0]).length;
    return { name: `Cards (promo, centered${perRow === 2 && cells.length > 2 ? ', two-columns' : ''})`, cells };
  }
  const photo = srcs.some((s) => s && !/\.svg$/i.test(s));
  const cells = cols.map((col) => card(image(col, rootOf(col), document), textContent(col, rootOf(col), document, { heading: 'h3', linkTitle: true })));
  return { name: `Cards (icon, centered${photo ? ', large' : ''})`, cells };
}

function iconCards(members, document) {
  const cells = [];
  members.forEach((cc) => columns(cc).forEach((col) => {
    cells.push(card(image(col, cc, document), textContent(col, cc, document, { heading: 'h3' })));
  }));
  const perRow = columns(members[0]).length;
  return { name: `Cards (icon, centered${perRow === 2 ? ', two-columns' : ''})`, cells };
}

function iconRightCards(members, document) {
  let compact = false;
  const cells = members.map((cc) => {
    const cols = columns(cc);
    const iconCol = cols.find((c) => components(c).every((k) => k.matches('.image_v2')));
    const textCol = cols.find((c) => c !== iconCol);
    if (textCol && [...textCol.querySelectorAll('.title_v1 :is(h2, h3, h4)')]
      .some((h) => /font-weight:\s*(bold|[6-9]00)/i.test(h.getAttribute('style') || ''))) compact = true;
    return card(iconCol && image(iconCol, cc, document), textCol ? textContent(textCol, cc, document, { heading: 'h3' }) : []);
  });
  const variants = ['horizontal'];
  if (isLightRow(members[0])) variants.push('light');
  if (compact) variants.push('compact');
  variants.push('icon-right');
  return { name: `Cards (${variants.join(', ')})`, cells };
}

export default function parse(element, { document }) {
  const members = runMembers(element);
  if (members[0] !== element) {
    // consumed by the first member of the run
    element.remove();
    return;
  }
  const kind = element.getAttribute('data-fedex-kind');
  let result;
  if (kind === 'icons') result = iconCards(members, document);
  else if (kind === 'icon-right') result = iconRightCards(members, document);
  else result = splitCards(members, document);
  const cells = result.cells.filter((r) => r.some((c) => c !== ''));
  members.slice(1).forEach((m) => m.remove());
  if (!cells.length) {
    element.remove();
    return;
  }
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: result.name, cells }));
}
