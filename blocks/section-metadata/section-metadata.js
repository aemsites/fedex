import { readBlockConfig, toCamelCase, toClassName } from '../../scripts/aem.js';

/**
 * Applies section metadata to the parent section and removes the block.
 * `style` values become section classes; other keys become data attributes.
 * @param {Element} block The section-metadata block element
 */
export default function decorate(block) {
  const section = block.closest('.section');
  if (section) {
    Object.entries(readBlockConfig(block)).forEach(([key, value]) => {
      if (key === 'style') {
        const styles = String(value).split(',').map((s) => toClassName(s.trim())).filter(Boolean);
        section.classList.add(...styles);
      } else if (key) {
        section.dataset[toCamelCase(key)] = value;
      }
    });
    section.classList.remove('section-metadata-container');
  }
  (block.closest('.section-metadata-wrapper') || block).remove();
}
