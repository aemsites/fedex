/**
 * banner: a panel with an icon, a title and text, and a call to action, in one row.
 * Authored as three cells (icon | title + text | CTA), but the content is sorted by kind, so
 * fewer cells (or a missing icon or CTA) work too: the first picture or icon is the icon, the
 * trailing link-only paragraphs are the CTA, everything else is the text.
 * Variants: dark (purple panel, white text, white outline pill CTA; CSS only).
 */

/** Wraps a cell's loose inline content (single-paragraph cells come unwrapped) in a paragraph. */
function wrapInline(cell) {
  if (!cell.textContent.trim() && !cell.querySelector('picture, img, .icon')) return;
  if (cell.querySelector(':scope > :is(p, h1, h2, h3, h4, h5, h6, ul, ol, picture, div)')) return;
  const p = document.createElement('p');
  p.append(...cell.childNodes);
  cell.append(p);
}

/** @returns {Element|null} the icon (picture or .icon) when the element holds nothing else */
function getIcon(el) {
  if (el.matches('picture, .icon')) return el;
  const icon = el.querySelector(':scope > :is(picture, .icon)');
  return icon && !el.textContent.trim() && el.children.length === 1 ? icon : null;
}

/** @returns {boolean} whether the paragraph holds a single link and nothing else */
function isLinkOnly(el) {
  const links = el.querySelectorAll('a[href]');
  return el.tagName === 'P' && links.length === 1
    && el.textContent.trim() === links[0].textContent.trim();
}

/**
 * Turns a formatted link into a button, like scripts.js does for paragraphs it sees:
 * em + strong = accent, strong = primary, em = secondary. Unformatted links stay links.
 */
function decorateButton(p) {
  const a = p.querySelector('a');
  if (a.classList.contains('button')) return;
  const strong = a.closest('strong');
  const em = a.closest('em');
  if (!strong && !em) return;
  p.className = 'button-wrapper';
  a.className = 'button';
  a.title = a.title || a.textContent;
  if (strong && em) {
    a.classList.add('accent');
    (strong.contains(em) ? strong : em).replaceWith(a);
  } else if (strong) {
    a.classList.add('primary');
    strong.replaceWith(a);
  } else {
    a.classList.add('secondary');
    em.replaceWith(a);
  }
}

export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  cells.forEach(wrapInline);
  const elements = cells.flatMap((cell) => [...cell.children]);

  let icon = null;
  const content = elements.filter((el) => {
    const found = !icon && getIcon(el);
    if (!found) return true;
    icon = found;
    return false;
  });

  const ctas = [];
  while (content.length && isLinkOnly(content[content.length - 1])) ctas.unshift(content.pop());

  const columns = [];
  if (icon) {
    const iconCol = document.createElement('div');
    iconCol.className = 'banner-icon';
    iconCol.append(icon);
    columns.push(iconCol);
  }
  if (content.length) {
    const text = document.createElement('div');
    text.className = 'banner-text';
    text.append(...content);
    columns.push(text);
  }
  if (ctas.length) {
    ctas.forEach(decorateButton);
    const cta = document.createElement('div');
    cta.className = 'banner-cta';
    cta.append(...ctas);
    columns.push(cta);
  }
  block.replaceChildren(...columns);
}
