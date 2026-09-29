import { loadFragment } from '../fragment/fragment.js';

/**
 * Returns the fragment path when the body holds nothing but one link to a
 * fragment (a same-site path with a `fragments` folder, e.g. /en-us/fragments/x).
 * @param {Element} body The item body
 * @returns {string|null} The fragment path
 */
function fragmentPath(body) {
  const links = body.querySelectorAll('a[href]');
  if (links.length !== 1 || body.querySelector('img, picture')) return null;
  const [link] = links;
  const text = body.textContent.trim();
  if (text !== link.textContent.trim()) return null;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin && !/\.aem\.(page|live)$/.test(url.hostname)) return null;
  if (!url.pathname.split('/').includes('fragments')) return null;
  return url.pathname.replace(/(\.plain)?\.html$/, '');
}

/**
 * Replaces the body's fragment link with the fragment content the first time
 * the item opens. The link stays as a fallback if the fragment can't be loaded.
 * @param {HTMLDetailsElement} details The item
 * @param {Element} body The item body
 * @param {string} path The fragment path
 */
function lazyLoadFragment(details, body, path) {
  let loading = null;
  const load = () => {
    if (loading || !details.open) return;
    body.setAttribute('aria-busy', 'true');
    loading = loadFragment(path).then((fragment) => {
      if (fragment) {
        const sections = [...fragment.querySelectorAll(':scope > .section')];
        const content = sections.length
          ? sections.flatMap((s) => [...s.childNodes])
          : [...fragment.childNodes];
        body.replaceChildren(...content);
        body.classList.add('accordion-item-fragment');
      }
    }).finally(() => body.removeAttribute('aria-busy'));
  };
  details.addEventListener('toggle', load);
  load();
}

/**
 * Moves a leading icon (a picture authored before the label text, inline or in its
 * own paragraph) into an inline icon box and wraps the rest of the label.
 * @param {HTMLElement} summary The item label
 */
function decorateLabelIcon(summary) {
  const first = [...summary.childNodes]
    .find((n) => n.nodeType !== Node.TEXT_NODE || n.textContent.trim());
  if (!first || first.nodeType !== Node.ELEMENT_NODE) return;
  const picture = first.tagName === 'PICTURE' ? first : null;
  const wrapped = !picture && first.tagName === 'P' && !first.textContent.trim()
    ? first.querySelector('picture') : null;
  const icon = picture || wrapped;
  if (!icon) return;
  if (wrapped) first.remove();
  else icon.remove();

  // a label left as a single paragraph after the icon is unwrapped too
  const rest = summary.children.length === 1 && summary.firstElementChild.tagName === 'P'
    ? [...summary.firstElementChild.childNodes] : [...summary.childNodes];
  const text = document.createElement('span');
  text.className = 'accordion-item-label-text';
  text.append(...rest);

  const img = icon.querySelector('img');
  if (img) img.alt = '';
  const iconBox = document.createElement('span');
  iconBox.className = 'accordion-item-icon';
  iconBox.setAttribute('aria-hidden', 'true');
  iconBox.append(icon);

  summary.replaceChildren(iconBox, text);
  summary.classList.add('accordion-item-label-has-icon');
}

/**
 * accordion: one row per item, [label | body]. Each row becomes a native
 * <details>/<summary> disclosure, so it works without JS state and is keyboard accessible.
 * Rows without a label are dropped. A row without a body still renders its label.
 * Extra cells are merged into the body. A label may start with a small icon image.
 * A body holding only a link to a fragment (e.g. /en-us/fragments/…) loads that
 * fragment the first time the item opens, so blocks like Table can sit in an answer.
 */
export default function decorate(block) {
  const items = [...block.children].map((row) => {
    const [label, ...bodyCells] = [...row.children];
    if (!label || !(label.textContent.trim() || label.querySelector('picture'))) return null;

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    // a label authored as a single paragraph is unwrapped so the summary holds its text
    const only = label.children.length === 1 ? label.firstElementChild : null;
    summary.append(...(only?.tagName === 'P' ? only.childNodes : label.childNodes));
    decorateLabelIcon(summary);
    if (!summary.textContent.trim()) return null;

    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    bodyCells.forEach((cell) => body.append(...cell.childNodes));

    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary);
    if (body.textContent.trim() || body.querySelector('img')) {
      details.append(body);
      const path = fragmentPath(body);
      if (path) lazyLoadFragment(details, body, path);
    }
    return details;
  }).filter(Boolean);

  block.replaceChildren(...items);
}
