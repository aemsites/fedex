/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-steps. Base: columns (blocks/columns/README.md, variant steps).
 * Template: hub-landing. Source: https://www.fedex.com/en-us/shipping/international.html
 * ("Prep for a smooth trip", section #prep).
 * Instance: column_control_v1 with an image column and a text column that holds nested
 * column_control_v1 step rows (no third column).
 *
 * Output: `Columns (steps)`, 1 row, 2 cells in source order:
 *   image cell: picture (desktop rendition)
 *   text cell:  intro paragraph(s), ordered list (one li per nested step row, text + inline
 *               links; the source's circled-number images are dropped because the block draws
 *               the numbers from the list), small-print footnote paragraph(s) after the list.
 * Footnotes: paragraphs of a step (or after the steps) that start with "*" (e.g. "*U.S. import
 * only; ..."). Further non-footnote paragraphs of a step stay in its li.
 * .fxg-desktop--hide (mobile/tablet-only) content is never copied.
 */
const HIDDEN = '.fxg-desktop--hide';
const BUTTON_CLASSES = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'];

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && root.contains(hidden);
}

function cols(cc) {
  return [...cc.querySelectorAll(':scope > .row > .fxg-col')].filter((c) => !isHidden(c, cc));
}

function gridChildren(col, root) {
  const grid = col.querySelector(':scope > div > .aem-Grid') || col.querySelector('.aem-Grid') || col;
  return [...grid.children].filter((c) => !isHidden(c, root));
}

function paragraphs(rt, root) {
  return [...rt.querySelectorAll('p')].filter((p) => !isHidden(p, root) && clean(p.textContent));
}

// Collapse source-formatting whitespace (newlines/indentation) inside inline content
function normalizeSpace(el) {
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => { n.textContent = n.textContent.replace(/\s+/g, ' '); });
  return el;
}

function cleanInner(p) {
  const clone = normalizeSpace(p.cloneNode(true));
  clone.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
  return clone.innerHTML.replace(/(&nbsp;|\s)+$/g, '').trim();
}

function isFootnote(p) {
  return /^\*/.test(clean(p.textContent));
}

function newParagraph(html, document) {
  const p = document.createElement('p');
  p.innerHTML = html;
  return p;
}

function imageOf(scope, root, document) {
  const img = scope.querySelector('.fxg-desktop-image img')
    || [...scope.querySelectorAll('.image_v2 img, img')].find((i) => !isHidden(i, root) && !(i.getAttribute('src') || '').startsWith('data:'));
  if (!img) return null;
  const ni = document.createElement('img');
  ni.src = img.src || img.getAttribute('src');
  const alt = img.getAttribute('alt');
  ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  return ni;
}

function ctaParagraph(src, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = src.href || src.getAttribute('href');
  a.textContent = clean(src.textContent);
  const cls = BUTTON_CLASSES.filter((c) => src.classList.contains(c));
  if (cls.length) a.className = cls.join(' ');
  p.append(a);
  return p;
}

// One step row (nested column_control_v1): number image column + text column
function stepContent(step, document, footnotes) {
  const textCols = cols(step).filter((c) => c.querySelector('.richtext, .title_v1, .button_v1'));
  const parts = [];
  textCols.forEach((col) => {
    gridChildren(col, step).forEach((comp) => {
      if (comp.matches('.richtext')) {
        paragraphs(comp, step).forEach((p) => {
          if (parts.length && isFootnote(p)) footnotes.push(newParagraph(cleanInner(p), document));
          else parts.push(cleanInner(p));
        });
      } else if (comp.matches('.title_v1')) {
        const h = comp.querySelector('h1, h2, h3, h4, h5, h6');
        if (h && clean(h.textContent)) parts.push(`<strong>${clean(h.textContent)}</strong>`);
      } else if (comp.matches('.button_v1')) {
        const a = comp.querySelector('a[href]');
        if (a && clean(a.textContent)) parts.push(ctaParagraph(a, document).innerHTML);
      }
    });
  });
  if (!parts.length) return null;
  const li = document.createElement('li');
  li.innerHTML = parts.map((html) => `<p>${html}</p>`).join('');
  return li;
}

/* ---------- single-cell steps run (banner-landing, claims) ---------- */
// The match is the FIRST row of a run of sibling column_control_v1 rows (spacers between them):
//   intro row   (empty col-sm-3 | col-sm-9 richtext: "First, log in to your account. ...")
//   bullets row (empty col | richtext "• U.S. domestic shipments" ...)
//   step rows   (col with the circled-number image | nested richtext: title, description, "• " bullets)
// The run stops at the first sibling that is not such a row, e.g. the 3-column login-button row,
// which stays default content. Consumed rows are removed.
const BULLET = /^[•·▪◦‣]\s*/;

function isEmptyCol(col) {
  return !clean(col.textContent) && !col.querySelector('img, .image_v2, .column_control_v1');
}

function textComps(col, root) {
  // visible richtexts of a column, including those in nested column_control_v1 rows
  return [...col.querySelectorAll('.richtext')].filter((rt) => !isHidden(rt, root)
    && ![...rt.querySelectorAll('.cc-aem-c-richtext')].every((b) => isHidden(b, root)));
}

function rowKind(row) {
  if (!row || !row.matches || !row.matches('div.column_control_v1')) return null;
  const c = cols(row);
  if (c.length !== 2) return null;
  const [first, second] = c;
  if (!second.querySelector('.richtext') || second.querySelector('.button_v1, .title_v1, .image_v2')) return null;
  if (isEmptyCol(first)) return 'text';
  // number image column (plain or nested)
  if (!clean(first.textContent) && first.querySelector('.image_v2')) return 'step';
  return null;
}

function runFiller(el) {
  if (!el) return false;
  if (el.matches('div.spacer, hr, br')) return true;
  return !el.textContent.trim() && !el.querySelector('img, picture, video, iframe, a[href]');
}

function visibleParagraphs(col, root) {
  return textComps(col, root).flatMap((rt) => [...rt.querySelectorAll('p')])
    .filter((p) => !isHidden(p, root) && clean(p.textContent));
}

function bulletItem(p, document) {
  const li = document.createElement('li');
  li.innerHTML = cleanInner(p).replace(/<br\s*\/?>\s*$/i, '');
  // strip the typed bullet character from the first text node
  const walker = document.createTreeWalker(li, 4);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.textContent.trim()) { n.textContent = n.textContent.replace(BULLET, ''); break; }
  }
  return li;
}

function isTitleParagraph(p) {
  const text = clean(p.textContent);
  if (!text || BULLET.test(text) || p.querySelector('a')) return false;
  const strong = clean([...p.querySelectorAll('b, strong, span')].map((b) => b.textContent).join(''));
  return strong === text;
}

function parseStepsRun(element, document) {
  const rows = [element];
  let next = element.nextElementSibling;
  while (next) {
    if (rowKind(next)) rows.push(next);
    else if (!runFiller(next)) break;
    next = next.nextElementSibling;
  }

  const content = [];
  const footnotes = [];
  let ol = null;
  rows.forEach((row) => {
    const textCol = cols(row)[1];
    const paras = visibleParagraphs(textCol, row);
    if (rowKind(row) === 'step') {
      if (!ol) {
        ol = document.createElement('ol');
        content.push(ol);
      }
      const li = document.createElement('li');
      let sub = null;
      paras.forEach((p, i) => {
        const text = clean(p.textContent);
        if (BULLET.test(text)) {
          if (!sub) sub = document.createElement('ul');
          sub.append(bulletItem(p, document));
          return;
        }
        if (/^\*/.test(text) && i > 0) {
          footnotes.push(newParagraph(cleanInner(p), document));
          return;
        }
        if (sub) {
          li.append(sub);
          sub = null;
        }
        const np = newParagraph(cleanInner(p), document);
        if (i === 0 && isTitleParagraph(p)) {
          np.innerHTML = `<strong>${clean(p.textContent)}</strong>`;
        }
        li.append(np);
      });
      if (sub) li.append(sub);
      if (li.childNodes.length) ol.append(li);
      return;
    }
    // intro / bullet rows (before the steps); after the steps they are small print
    let ul = null;
    paras.forEach((p) => {
      const text = clean(p.textContent);
      if (BULLET.test(text)) {
        if (!ul) {
          ul = document.createElement('ul');
          (ol ? footnotes : content).push(ul);
        }
        ul.append(bulletItem(p, document));
        return;
      }
      ul = null;
      (ol ? footnotes : content).push(newParagraph(cleanInner(p), document));
    });
  });
  content.push(...footnotes);

  rows.slice(1).forEach((r) => r.remove());
  if (!content.length) {
    element.remove();
    return;
  }
  const block = WebImporter.Blocks.createBlock(document, { name: 'Columns (steps)', cells: [[content]] });
  element.replaceWith(block);
}

/* ---------- number-icon step rows (service-overview, freight "Ready to ship?") ---------- */
// Each step is its own column_control_v1: number icon column (col-sm-3) | title + richtext
// (col-sm-8). The match is the first row; the following rows of the same shape (spacers between)
// are consumed and removed. Output: single-cell `Columns (steps)` with an ordered list; each li holds
// the step title (bold), its description and any lists/links. The number icons are dropped.
function isNumberRow(el) {
  if (!el || !el.matches || !el.matches('div.column_control_v1')) return false;
  const c = cols(el);
  if (c.length !== 2) return false;
  const [icon, text] = c;
  if (clean(icon.textContent) || !icon.querySelector('.image_v2')) return false;
  const comps = gridChildren(text, el);
  return comps.some((g) => g.matches('.title_v1'))
    && comps.every((g) => g.matches('.title_v1, .richtext, .button_v1, .spacer'));
}

function parseNumberRows(element, document) {
  const rows = [element];
  let next = element.nextElementSibling;
  while (next) {
    if (isNumberRow(next)) rows.push(next);
    else if (!runFiller(next)) break;
    next = next.nextElementSibling;
  }
  const ol = document.createElement('ol');
  rows.forEach((row) => {
    const li = document.createElement('li');
    gridChildren(cols(row)[1], row).forEach((comp) => {
      if (comp.matches('.title_v1')) {
        const h = [...comp.querySelectorAll('h1, h2, h3, h4, h5, h6')].find((x) => !isHidden(x, row));
        if (h && clean(h.textContent)) li.append(newParagraph(`<strong>${normalizeSpace(h.cloneNode(true)).innerHTML.trim()}</strong>`, document));
      } else if (comp.matches('.richtext')) {
        [...comp.querySelectorAll('p, ul, ol')].forEach((el) => {
          if (el.parentElement.closest('p, ul, ol') || isHidden(el, row) || !clean(el.textContent)) return;
          if (el.matches('p')) {
            li.append(newParagraph(cleanInner(el), document));
          } else {
            const list = normalizeSpace(el.cloneNode(true));
            [list, ...list.querySelectorAll('*')].forEach((n) => { n.removeAttribute('class'); n.removeAttribute('style'); });
            list.querySelectorAll('span').forEach((sp) => sp.replaceWith(...sp.childNodes));
            li.append(list);
          }
        });
      } else if (comp.matches('.button_v1')) {
        const a = comp.querySelector('a[href]');
        if (a && clean(a.textContent)) li.append(ctaParagraph(a, document));
      }
    });
    if (li.childNodes.length) ol.append(li);
  });
  rows.slice(1).forEach((r) => r.remove());
  if (!ol.children.length) {
    element.remove();
    return;
  }
  const block = WebImporter.Blocks.createBlock(document, { name: 'Columns (steps)', cells: [[[ol]]] });
  element.replaceWith(block);
}

export default function parse(element, { document }) {
  if (isNumberRow(element)) {
    parseNumberRows(element, document);
    return;
  }
  // claims: no image column, the first column is empty -> single-cell steps run
  if (rowKind(element) === 'text') {
    parseStepsRun(element, document);
    return;
  }
  const columns = cols(element);
  const imageCol = columns.find((c) => c.querySelector('.image_v2') && !c.querySelector('.richtext, .column_control_v1, .title_v1'));
  const textCol = columns.find((c) => c !== imageCol);

  const image = imageCol ? imageOf(imageCol, element, document) : null;

  const text = [];
  const footnotes = [];
  if (textCol) {
    let list = null;
    gridChildren(textCol, element).forEach((comp) => {
      if (comp.matches('.column_control_v1')) {
        const li = stepContent(comp, document, footnotes);
        if (!li) return;
        if (!list) {
          list = document.createElement('ol');
          text.push(list);
        }
        list.append(li);
      } else if (comp.matches('.richtext')) {
        paragraphs(comp, element).forEach((p) => {
          const np = newParagraph(cleanInner(p), document);
          // text after the list (or starting with "*") is small print
          if (list || isFootnote(p)) footnotes.push(np);
          else text.push(np);
        });
      } else if (comp.matches('.title_v1')) {
        const h = comp.querySelector('h1, h2, h3, h4, h5, h6');
        if (h && clean(h.textContent)) {
          const h3 = document.createElement('h3');
          h3.textContent = clean(h.textContent);
          text.push(h3);
        }
      } else if (comp.matches('.button_v1')) {
        const a = comp.querySelector('a[href]');
        if (a && clean(a.textContent)) (list ? footnotes : text).push(ctaParagraph(a, document));
      }
    });
  }
  text.push(...footnotes);

  if (!image && !text.length) {
    element.remove();
    return;
  }

  // Source order of the two columns (image left on the source)
  const imageFirst = !imageCol || !textCol || columns.indexOf(imageCol) < columns.indexOf(textCol);
  const imageCell = image || '';
  const textCell = text.length ? text : '';
  const cells = [imageFirst ? [imageCell, textCell] : [textCell, imageCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'Columns (steps)', cells });
  element.replaceWith(block);
}
