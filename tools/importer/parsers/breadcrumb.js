/* eslint-disable */
/* global WebImporter */
/**
 * Parser for breadcrumb. Base: breadcrumb (blocks/breadcrumb/README.md).
 * Source: https://www.fedex.com/nl-nl/shipping/freight-services.html (every nl-nl landing page
 * below the homepage). Instance: div.breadcrumbs_v1 (above .root, inside .fxg-main-content).
 *
 * Source: nav.cc-aem-c-breadcrumb > ol > li, each a link (Home, Verzenden, ...) except the last,
 * the current page (li.fxg-breadcrumbs__link--in-active, plain text).
 *
 * Output: `Breadcrumb`, 1 row, 1 cell: an unordered list of the trail, links kept, the current
 * page as plain text. A section break follows, so the trail is its own section above the hero.
 * fedex-cleanup.js removes any breadcrumb this parser did not convert (other templates).
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const items = [...element.querySelectorAll('li')].filter((li) => clean(li.textContent));
  if (items.length < 2) {
    element.remove();
    return;
  }
  const ul = document.createElement('ul');
  items.forEach((li) => {
    const item = document.createElement('li');
    const src = li.querySelector('a[href]');
    if (src && !li.matches('.fxg-breadcrumbs__link--in-active')) {
      const a = document.createElement('a');
      a.href = src.href || src.getAttribute('href');
      a.textContent = clean(src.textContent);
      item.append(a);
    } else {
      item.textContent = clean(li.textContent);
    }
    ul.append(item);
  });
  const block = WebImporter.Blocks.createBlock(document, { name: 'Breadcrumb', cells: [[ul]] });
  element.replaceWith(block);
  block.after(document.createElement('hr'));
}
