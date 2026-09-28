/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-feature. Base: columns. Source: https://www.fedex.com/en-us/home.html
 * Instance: ... .aem-Grid > div.column_control_v1:nth-of-type(7)
 *
 * Output (matches blocks/columns/columns.js, variant feature): 2 columns, 1 row
 * (features, image). Footnotes are placed after the block as default content; the
 * section carries the light style (section metadata).
 *   Cell 1: h2 heading + 4 x (h3 feature title + p text)
 *   Cell 2: picture
 * Source feature titles are <p><b>..</b></p> and become h3. The footnote copy that the
 * source renders twice (one copy hidden on every breakpoint) is dropped; the visible copy
 * is emitted after the block as default content (authoring analysis 4.2).
 */
const HIDDEN_ALL = '.fxg-desktop--hide.fxg-tablet--hide.fxg-mobile--hide';

function isBoldOnly(p) {
  const text = p.textContent.replace(/\s+/g, ' ').trim();
  if (!text) return false;
  const bold = [...p.querySelectorAll('b, strong')].map((b) => b.textContent).join('').replace(/\s+/g, ' ').trim();
  return bold === text;
}

function isFootnote(richtext) {
  return /^\*/.test(richtext.textContent.replace(/\s+/g, ' ').trim());
}

export default function parse(element, { document }) {
  const outerRow = element.querySelector(':scope > .row') || element;
  const cols = [...outerRow.querySelectorAll(':scope > .fxg-col')];
  const imageCol = cols.find((c) => c.querySelector('.image_v2 img, img') && !c.querySelector('.richtext, .title_v1'))
    || null;
  const textCol = cols.find((c) => c !== imageCol) || element;

  const textCell = [];

  // Heading ("Why ship with FedEx?", h3 on source) -> h2
  const srcHeading = textCol.querySelector('.title_v1 h1, .title_v1 h2, .title_v1 h3, .title_v1 h4, h2, h3');
  if (srcHeading) {
    const h2 = document.createElement('h2');
    h2.innerHTML = srcHeading.innerHTML.trim();
    textCell.push(h2);
  }

  // Features: each richtext holds <p><b>title</b></p><p>text</p>
  const footnotes = [];
  const richtexts = [...textCol.querySelectorAll('.richtext')]
    .filter((rt) => !rt.querySelector(`:scope > ${HIDDEN_ALL}`) && !rt.matches(HIDDEN_ALL));
  richtexts.forEach((rt) => {
    if (isFootnote(rt)) {
      if (!footnotes.length) footnotes.push(rt);
      return;
    }
    rt.querySelectorAll('p').forEach((p) => {
      if (!p.textContent.trim()) return;
      if (isBoldOnly(p)) {
        const h3 = document.createElement('h3');
        h3.textContent = p.textContent.replace(/\s+/g, ' ').trim();
        textCell.push(h3);
      } else {
        const np = document.createElement('p');
        np.innerHTML = p.innerHTML;
        textCell.push(np);
      }
    });
  });

  // Image cell: desktop rendition only
  let imageCell = '';
  if (imageCol) {
    const img = imageCol.querySelector('.fxg-desktop-image img') || imageCol.querySelector('img');
    if (img) {
      const ni = document.createElement('img');
      ni.src = img.src || img.getAttribute('src');
      const alt = img.getAttribute('alt');
      ni.alt = alt && alt !== 'null' ? alt : '';
      imageCell = ni;
    }
  }

  if (!textCell.length && !imageCell) {
    element.remove();
    return;
  }

  // Footnote paragraphs (split on <br>) to be placed after the block as default content
  const footnoteEls = [];
  if (footnotes.length) {
    footnotes[0].querySelectorAll('p').forEach((p) => {
      const parts = p.innerHTML.split(/<br\s*\/?>/i);
      parts.forEach((part) => {
        const np = document.createElement('p');
        np.innerHTML = part.trim();
        np.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
        if (np.textContent.trim()) {
          np.innerHTML = np.innerHTML.trim();
          footnoteEls.push(np);
        }
      });
    });
  }

  // Footnotes follow the block as default content; together with the CTA (next grid
  // sibling, kept as default content) they share the section's light panel.
  const cells = [[textCell, imageCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns (feature)', cells });
  element.replaceWith(block);
  if (footnoteEls.length) block.after(...footnoteEls);
}
