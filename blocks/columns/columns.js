/**
 * Groups each h3 and the content after it (up to the next heading) into a feature item.
 * @param {Element} cell The column cell holding the features
 */
function buildFeatures(cell) {
  const headings = [...cell.querySelectorAll(':scope > h3')];
  if (!headings.length) return;
  const grid = document.createElement('div');
  grid.className = 'columns-features';
  headings[0].before(grid);
  headings.forEach((h3) => {
    const item = document.createElement('div');
    item.className = 'columns-feature';
    const parts = [h3];
    let next = h3.nextElementSibling;
    while (next && !/^H[1-3]$/.test(next.tagName)) {
      parts.push(next);
      next = next.nextElementSibling;
    }
    item.append(...parts);
    grid.append(item);
  });
}

/**
 * columns: each row is a row of columns; an image-only cell becomes an image column.
 * A row with a single cell spans the full width.
 * Variants: feature (h3 + text pairs become a feature grid), promo, light (panel background).
 */
export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);
  const feature = block.classList.contains('feature');

  [...block.children].forEach((row) => {
    if (row.children.length === 1) row.classList.add('columns-full');
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic && col.children.length === 1 && !col.textContent.trim()) {
        col.classList.add('columns-img-col');
        return;
      }
      if (feature) buildFeatures(col);
      // a paragraph holding only a plain link is a text CTA
      col.querySelectorAll('p').forEach((p) => {
        const a = p.querySelector('a');
        if (a && !a.classList.contains('button') && p.textContent.trim() === a.textContent.trim()) {
          p.classList.add('columns-cta');
        }
      });
    });
  });
}
