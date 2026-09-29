/**
 * Whether a cell holds only a check mark: a ✓/✔ character or a single icon/image.
 * @param {Element} cell The cell
 * @returns {boolean}
 */
function isCheckCell(cell) {
  const text = cell.textContent.trim();
  if (text) return /^[✓✔☑]$/.test(text);
  return cell.querySelectorAll('img, .icon').length === 1;
}

/**
 * Finds a name for the scroll region: the nearest heading before the block.
 * @param {Element} block The block
 * @returns {string}
 */
function regionLabel(block) {
  let el = block.closest('.table-wrapper') || block;
  while (el) {
    let prev = el.previousElementSibling;
    while (prev) {
      if (/^H[1-6]$/.test(prev.tagName)) return prev.textContent.trim();
      const inner = [...prev.querySelectorAll('h1, h2, h3, h4, h5, h6')].pop();
      if (inner) return inner.textContent.trim();
      prev = prev.previousElementSibling;
    }
    el = el.parentElement?.closest('.section, .accordion-item-body');
  }
  return 'Table';
}

/**
 * table: the first row is the header (th), every other row is a data row.
 * Cells keep their authored content (links, lists, images). A cell holding only
 * a check mark (✓, ✔ or a single icon) is centered, and so is its column header.
 * The table scrolls horizontally inside the block when it doesn't fit.
 */
export default function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const checkColumns = new Set();

  [...block.children].forEach((row, i) => {
    const cells = [...row.children];
    if (!cells.some((c) => c.textContent.trim() || c.querySelector('img, .icon'))) return;
    const tr = document.createElement('tr');
    cells.forEach((cell, col) => {
      const header = i === 0;
      const td = document.createElement(header ? 'th' : 'td');
      if (header) td.scope = 'col';
      // a cell authored as a single paragraph is unwrapped
      const only = cell.children.length === 1 && cell.firstElementChild.tagName === 'P'
        && cell.textContent.trim() === cell.firstElementChild.textContent.trim()
        ? cell.firstElementChild : null;
      td.append(...(only ? only.childNodes : cell.childNodes));
      if (!header && isCheckCell(td)) {
        td.classList.add('table-cell-check');
        checkColumns.add(col);
      }
      tr.append(td);
    });
    (i === 0 ? thead : tbody).append(tr);
  });

  if (thead.firstElementChild) {
    [...thead.firstElementChild.children].forEach((th, col) => {
      if (checkColumns.has(col)) th.classList.add('table-cell-check');
    });
  }

  table.append(thead, tbody);
  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', regionLabel(block));
  scroll.append(table);
  block.replaceChildren(scroll);
}
