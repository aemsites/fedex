/**
 * notification: a one-cell notice. All authored cells are merged into one content area;
 * the info icon is drawn by CSS.
 * Variants: warning (amber theme with a warning-triangle icon; CSS only).
 */
export default function decorate(block) {
  const content = document.createElement('div');
  content.className = 'notification-content';
  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    content.append(...cell.childNodes);
  });
  block.setAttribute('role', 'note');
  block.replaceChildren(content);
}
