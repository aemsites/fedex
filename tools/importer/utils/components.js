/* eslint-disable */
/**
 * Shared helpers for the generic-landing parsers that rebuild FedEx column grids
 * (parsers/cards-grid.js, parsers/columns-layout.js): the visible columns of a
 * column_control_v1 and the EDS content of one column's components.
 */
const HIDDEN = '.fxg-desktop--hide';
const BUTTON_CLASSES = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'];

export function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && root.contains(hidden);
}

export function hasContent(el) {
  return !!(clean(el.textContent) || el.querySelector('img'));
}

// visible columns of a column_control_v1 that hold something
export function columns(cc) {
  return [...cc.querySelectorAll(':scope > .row > .fxg-col')]
    .filter((c) => !c.matches(HIDDEN) && hasContent(c));
}

// the components (title_v1, richtext, image_v2, button_v1, nested column_control_v1, ...) of a column
export function components(col) {
  const grid = col.querySelector(':scope > div > .aem-Grid') || col;
  return [...grid.children].filter((c) => !c.matches(HIDDEN) && hasContent(c));
}

export function isLightRow(cc) {
  const row = cc.querySelector(':scope > .row');
  if (!row || !row.classList.contains('fxg-row--has-bgcolor')) return false;
  const bg = ((row.style && row.style.backgroundColor) || '').replace(/\s+/g, '').toLowerCase();
  return !bg || !/^(#fff(fff)?|white|rgb\(255,255,255\)|transparent|rgba\(0,0,0,0\))$/.test(bg);
}

export function image(scope, root, document) {
  const img = scope.querySelector('.fxg-desktop-image img')
    || [...scope.querySelectorAll('img')].find((i) => !isHidden(i, root) && !(i.getAttribute('src') || '').startsWith('data:'));
  if (!img) return null;
  const ni = document.createElement('img');
  let src = img.src || img.getAttribute('src');
  // html2md turns a bare *.svg into an EDS :icon: token; a query string keeps it an image
  if (/\.svg$/i.test(src) && !src.includes('?')) src = `${src}?width=160`;
  ni.src = src;
  const alt = img.getAttribute('alt');
  ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  return ni;
}

// inline copy of a source element as <tag>: spans, classes and styles dropped, links and <sup> kept
export function copyAs(src, document, tag) {
  const el = document.createElement(tag);
  const clone = src.cloneNode(true);
  clone.querySelectorAll('span, font').forEach((s) => s.replaceWith(...s.childNodes));
  clone.querySelectorAll('input, script, style, img, svg').forEach((n) => n.remove());
  clone.querySelectorAll('*').forEach((n) => {
    n.removeAttribute('class');
    n.removeAttribute('style');
    n.removeAttribute('data-analytics');
  });
  el.innerHTML = clone.innerHTML.replace(/\s+/g, ' ').replace(/(&nbsp;|\s)+$/g, '').trim();
  return el;
}

export function link(src, document) {
  const a = document.createElement('a');
  const raw = src.getAttribute('href') || '';
  a.setAttribute('href', raw.startsWith('#') ? raw : (src.href || raw));
  // label text with its authored line breaks ("Focus op...<br>India"); icons and markup dropped
  const label = src.cloneNode(true);
  label.querySelectorAll('img, svg, span.lock-hide').forEach((n) => n.remove());
  label.querySelectorAll('br').forEach((br) => br.replaceWith('\u0000'));
  clean(label.textContent).split('\u0000').map((t) => t.trim()).filter(Boolean).forEach((t, i) => {
    if (i) a.append(document.createElement('br'));
    a.append(t);
  });
  const cls = BUTTON_CLASSES.filter((c) => src.classList.contains(c));
  if (cls.length) a.className = cls.join(' ');
  return a;
}

const linkOnly = (p) => {
  const a = p.querySelector('a[href]');
  return !!a && clean(a.textContent) === clean(p.textContent);
};

/**
 * EDS content of one column's components, in source order: title_v1 -> its heading (`heading`
 * forces a level), richtext -> paragraphs/lists, button_v1 -> p > a, image_v2 -> skipped (the
 * callers take the image separately). Options:
 *  - heading: tag for title headings (default: the source level)
 *  - linkTitle: a leading link-only paragraph becomes the card title (h3 > a)
 */
export function textContent(col, root, document, opts = {}) {
  const out = [];
  components(col).forEach((comp) => {
    if (comp.matches('.title_v1')) {
      const h = [...comp.querySelectorAll('h1, h2, h3, h4, h5, h6')].find((el) => !isHidden(el, root) && clean(el.textContent));
      if (h) out.push(copyAs(h, document, opts.heading || h.tagName.toLowerCase()));
    } else if (comp.matches('.richtext')) {
      [...comp.querySelectorAll('p, ul, ol, h2, h3, h4, h5, h6')]
        .filter((p) => !isHidden(p, root) && clean(p.textContent) && !p.parentElement.closest('p, ul, ol'))
        .forEach((p) => {
          if (opts.linkTitle && !out.length && p.matches('p') && linkOnly(p)) {
            const h3 = document.createElement('h3');
            h3.append(link(p.querySelector('a[href]'), document));
            out.push(h3);
            return;
          }
          out.push(copyAs(p, document, p.tagName.toLowerCase()));
        });
    } else if (comp.matches('.button_v1')) {
      [...comp.querySelectorAll('a[href]')]
        .filter((a) => !isHidden(a, root) && clean(a.textContent) && !/^\/?#$/.test(a.getAttribute('href')))
        .forEach((a) => {
          const p = document.createElement('p');
          p.append(link(a, document));
          out.push(p);
        });
    }
  });
  return out;
}
