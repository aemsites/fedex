/* eslint-disable */
/* global WebImporter */
/**
 * Parser for banner. Base: banner (blocks/banner/README.md). Template: generic-landing.
 * Source: https://www.fedex.com/nl-nl/shipping.html ("Verzend slimmer met tips van experts", grey)
 * and shipping/freight-services.html ("Vracht verzenden met FedEx", purple).
 * Instance: .column_control_v1[data-fedex-block="banner"] - tagged by transformers/fedex-landing.js:
 * a bgcolor row of three columns, [icon image] | [title + text] | [button].
 *
 * Output: `Banner` (grey panel) or `Banner (dark)` (purple row), 1 row, 3 cells:
 *   icon | ### title, text | CTA link (FedEx button classes kept for fedex-cleanup.js).
 * The title is the column's heading, or its first paragraph when that is set apart as a large
 * line (span.fxg-font-size-*, shipping.html).
 */
const BUTTON_CLASSES = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'];
const HIDDEN = '.fxg-desktop--hide';

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function visible(el, root) {
  const hidden = el.closest(HIDDEN);
  return !hidden || !root.contains(hidden);
}

function inline(src, document, tag) {
  const el = document.createElement(tag);
  const clone = src.cloneNode(true);
  clone.querySelectorAll('span, font').forEach((s) => s.replaceWith(...s.childNodes));
  clone.querySelectorAll('*').forEach((n) => { n.removeAttribute('class'); n.removeAttribute('style'); });
  el.innerHTML = clone.innerHTML.replace(/\s+/g, ' ').replace(/(&nbsp;|\s)+$/g, '').trim();
  return el;
}

export default function parse(element, { document }) {
  const cols = [...element.querySelectorAll(':scope > .row > .fxg-col')]
    .filter((c) => visible(c, element) && (clean(c.textContent) || c.querySelector('img')));
  if (cols.length !== 3) return;
  const [iconCol, textCol, ctaCol] = cols;

  const img = [...iconCol.querySelectorAll('img')].find((i) => visible(i, element) && !(i.getAttribute('src') || '').startsWith('data:'));
  let icon = '';
  if (img) {
    icon = document.createElement('img');
    let src = img.src || img.getAttribute('src');
    // html2md would turn a bare *.svg into an :icon: token
    if (/\.svg$/i.test(src) && !src.includes('?')) src = `${src}?width=160`;
    icon.src = src;
    const alt = img.getAttribute('alt');
    icon.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  }

  const body = [];
  const heading = [...textCol.querySelectorAll('h1, h2, h3, h4, h5, h6')].find((h) => visible(h, element) && clean(h.textContent));
  if (heading) body.push(inline(heading, document, 'h3'));
  [...textCol.querySelectorAll('.richtext p, .richtext ul, .richtext ol')]
    .filter((p) => visible(p, element) && clean(p.textContent) && !p.parentElement.closest('p, ul, ol'))
    .forEach((p, i) => {
      const large = !heading && i === 0 && p.querySelector('span[class*="fxg-font-size-"]');
      body.push(inline(p, document, large ? 'h3' : p.tagName.toLowerCase()));
    });

  const ctas = [...ctaCol.querySelectorAll('a[href]')]
    .filter((a) => visible(a, element) && clean(a.textContent) && !/^\/?#$/.test(a.getAttribute('href')))
    .map((src) => {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = src.href || src.getAttribute('href');
      a.textContent = clean(src.textContent);
      const cls = BUTTON_CLASSES.filter((c) => src.classList.contains(c));
      if (cls.length) a.className = cls.join(' ');
      p.append(a);
      return p;
    });

  const dark = element.getAttribute('data-fedex-variant') === 'dark';
  const block = WebImporter.Blocks.createBlock(document, {
    name: dark ? 'Banner (dark)' : 'Banner',
    cells: [[icon, body.length ? body : '', ctas.length ? ctas : '']],
  });
  element.replaceWith(block);
}
