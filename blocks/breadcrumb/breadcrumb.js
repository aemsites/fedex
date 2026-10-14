import { fetchPlaceholders } from '../../scripts/placeholders.js';

const DEFAULT_LABEL = 'Breadcrumb';

/**
 * Sets the nav label from the locale placeholders (key `breadcrumb`). Runs after the block is
 * rendered so the first section doesn't wait for the sheet; the English label stays on failure.
 * @param {Element} nav
 */
async function localizeLabel(nav) {
  try {
    const { breadcrumb } = await fetchPlaceholders();
    if (breadcrumb) nav.setAttribute('aria-label', breadcrumb);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('breadcrumb: placeholders could not be loaded', error);
  }
}

/**
 * Collects the trail items: list items when the author used a list, otherwise one item per
 * link or text paragraph (e.g. "Home" links in separate paragraphs).
 * @param {Element} block
 * @returns {Node[][]} the child nodes of each item
 */
function getItems(block) {
  const lis = [...block.querySelectorAll('li')];
  if (lis.length) return lis.map((li) => [...li.childNodes]);
  const items = [];
  block.querySelectorAll(':scope > div > div').forEach((cell) => {
    const parts = cell.querySelector('p, a') ? cell.querySelectorAll('a, p') : [cell];
    parts.forEach((part) => {
      // a paragraph's links are collected on their own
      if (part.tagName === 'P' && part.querySelector('a')) return;
      if (part.textContent.trim()) items.push(part.tagName === 'A' ? [part] : [...part.childNodes]);
    });
  });
  return items;
}

/**
 * breadcrumb: the authored trail (a list, or links in paragraphs) becomes a labelled nav with an
 * ordered list; the last item is the current page. The "›" separators are drawn by CSS.
 */
export default function decorate(block) {
  const ol = document.createElement('ol');
  getItems(block).forEach((nodes) => {
    const li = document.createElement('li');
    li.append(...nodes);
    if (!li.textContent.trim()) return;
    ol.append(li);
  });

  const current = ol.lastElementChild;
  if (current) {
    const link = current.querySelector('a');
    (link || current).setAttribute('aria-current', 'page');
  }

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', DEFAULT_LABEL);
  nav.append(ol);
  block.replaceChildren(nav);
  localizeLabel(nav);
}
