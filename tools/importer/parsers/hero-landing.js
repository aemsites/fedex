/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-landing. Base: hero. Template: hub-landing.
 * Source: https://www.fedex.com/en-us/shipping/international.html (also packing,
 * schedule-manage-pickups, small-business).
 * Instance: .hero_landingpage_v1:has(.fxg-landing-hero h1)
 *
 * Output (blocks/hero/README.md, variant landing): `Hero (landing)`, 1 row, 1 cell
 * (project decision, overrides the library's 2-row hero convention; the block accepts both):
 *   picture, h1, intro paragraph(s), CTA paragraph.
 * - Picture: .fxg-landing-hero__background-image > img (fallbacks: any non-data img, CSS background-image).
 * - H1: <br> becomes a space ("A world of international<br>shipping services").
 * - Intro: .fxg-subtext richtext paragraphs, sub-headings and lists; the mobile-only copy
 *   (.fxg-desktop--hide) is skipped. Column grids inside the banner follow the block as default content.
 * - CTA: .button_v1 a; the FedEx CTA class (fxg-button--orange etc.) is kept on the link so
 *   fedex-cleanup.js maps it to the button emphasis (**Ship Now**). Other links stay plain.
 */
const BUTTON_CLASSES = ['fxg-button--orange', 'fxg-button--transparent', 'fxg-link--rounded_button'];
const HIDDEN = '.fxg-desktop--hide';

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function isHidden(el, root) {
  const hidden = el.closest(HIDDEN);
  return !!hidden && root.contains(hidden);
}

// Collapse source-formatting whitespace (newlines/indentation) inside inline content
function normalizeSpace(el) {
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => { n.textContent = n.textContent.replace(/\s+/g, ' '); });
  return el;
}

function ctaParagraph(src, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = src.href || src.getAttribute('href');
  a.textContent = clean(src.textContent);
  const cls = BUTTON_CLASSES.filter((c) => src.classList.contains(c));
  // the orange primary button of the nl-nl heroes -> fxg-button--orange (**CTA**, fedex-cleanup.js)
  if (src.classList.contains('cc-aem-c-button--primary')) cls.push('fxg-button--orange');
  if (cls.length) a.className = cls.join(' ');
  p.append(a);
  return p;
}

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

function newImage(img, document) {
  const ni = document.createElement('img');
  ni.src = img.src || img.getAttribute('src');
  const alt = img.getAttribute('alt');
  ni.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  return ni;
}

function cleanClone(el) {
  const clone = normalizeSpace(el.cloneNode(true));
  clone.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
  clone.querySelectorAll('*').forEach((n) => { n.removeAttribute('class'); n.removeAttribute('style'); });
  return clone;
}

// Visible components of an AEM grid, in source order, as default content
function walkComponents(container, root, document, out) {
  [...container.children].forEach((comp) => {
    if (isHidden(comp, root) || comp.matches('script, style, noscript, input, link, meta') || isJumpPanel(comp)) return;
    if (comp.matches('.title_v1')) {
      const t = [...comp.querySelectorAll(`${HEADINGS}, p`)].find((el) => !isHidden(el, root) && clean(el.textContent));
      if (!t) return;
      const el = document.createElement(t.tagName.toLowerCase());
      el.innerHTML = cleanClone(t).innerHTML.trim();
      out.push(el);
    } else if (comp.matches('.richtext')) {
      comp.querySelectorAll('p, ul, ol').forEach((p) => {
        if (isHidden(p, root) || p.parentElement.closest('ul, ol') || !clean(p.textContent)) return;
        const el = document.createElement(p.tagName.toLowerCase());
        el.innerHTML = cleanClone(p).innerHTML.replace(/(&nbsp;|\s)+$/g, '').trim();
        out.push(el);
      });
    } else if (comp.matches('.button_v1')) {
      [...comp.querySelectorAll('a[href]')]
        .filter((a) => !isHidden(a, root) && clean(a.textContent) && !/^\/?#$/.test(a.getAttribute('href')))
        .forEach((a) => out.push(ctaParagraph(a, document)));
    } else if (comp.matches('.image_v2')) {
      const img = comp.querySelector('.fxg-desktop-image img')
        || [...comp.querySelectorAll('img')].find((i) => !isHidden(i, root) && !(i.getAttribute('src') || '').startsWith('data:'));
      if (img) {
        const p = document.createElement('p');
        p.append(newImage(img, document));
        out.push(p);
      }
    } else if (comp.matches('.column_control_v1')) {
      comp.querySelectorAll(':scope > .row > .fxg-col').forEach((col) => {
        if (isHidden(col, root)) return;
        const grid = col.querySelector(':scope > div > .aem-Grid') || col.querySelector('.aem-Grid');
        if (grid) walkComponents(grid, root, document, out);
      });
    } else if (comp.matches('.aem-Grid, div:not([class])')) {
      walkComponents(comp, root, document, out);
    }
  });
  return out;
}

const WHITE = /^(#fff(fff)?|white|rgb\(255,\s*255,\s*255\))$/i;

// Purple banner hero (banner-landing: claims, billing-online, service-guide, drop-off): the banner
// image already carries the purple gradient and the copy is white. Read from the component's
// text colour: inline color on the h1/subtext, or "textColor" in the hero's JSON config script.
// The hub-landing light heroes use #333333.
function isPurple(element, hero) {
  const colors = [];
  [hero.querySelector('h1'), hero.querySelector('.fxg-subtext')].forEach((el) => {
    if (el && el.style && el.style.color) colors.push(el.style.color);
  });
  [...element.querySelectorAll('script')].forEach((sc) => {
    const m = (sc.textContent || '').match(/"textColor"\s*:\s*"([^"]+)"/);
    if (m) colors.push(m[1]);
  });
  return colors.some((c) => WHITE.test(c.replace(/\s+/g, '').trim()));
}

// Billing: the in-hero jump-links panel is moved out by fedex-cleanup.js (.fedex-hero-extracted);
// when the parser runs without the cleanup it is still skipped here (it stays default content).
function isJumpPanel(el) {
  return el.matches('.fedex-hero-extracted')
    || (el.matches('.column_control_v1') && !!el.querySelector(':scope > .row.fxg-row--has-bgcolor a[href^="#"]'));
}

export default function parse(element, { document, template }) {
  if (element.matches('.fedex-hero-extracted')) return;
  const hero = element.querySelector('.fxg-landing-hero') || element;

  // Picture. The phone rendition (.fxg-landing-hero__mobile-image, nl-nl shipping.html: a
  // 330x210 crop) is only the fallback: the banner is the background image / data-main-image.
  const mobile = (i) => !!i.closest('.fxg-landing-hero__mobile-image, .fxg-landing-heroMobileVideo');
  const banner = hero.querySelector('[data-main-image]');
  const img = hero.querySelector('.fxg-landing-hero__background-image > img:not([src^="data:"])')
    || [...hero.querySelectorAll('img')].find((i) => !(i.getAttribute('src') || '').startsWith('data:') && !isHidden(i, element)
      && !(mobile(i) && banner && banner.getAttribute('data-main-image')));
  let picture = null;
  if (img) {
    picture = document.createElement('img');
    picture.src = img.src || img.getAttribute('src');
    const alt = img.getAttribute('alt');
    picture.alt = alt && !/^(null|""|'')$/.test(alt.trim()) ? alt : '';
  } else {
    const styled = [hero, ...hero.querySelectorAll('[style*="background"]')]
      .find((el) => /url\(/.test(el.getAttribute('style') || ''));
    const match = styled && (styled.getAttribute('style') || '').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (match) {
      picture = document.createElement('img');
      picture.src = match[1];
      picture.alt = '';
    }
  }
  // Last resort: the banner rendition in data-main-image (freight: background-image: none)
  if (!picture) {
    const holder = hero.querySelector('[data-main-image]');
    const src = holder && holder.getAttribute('data-main-image');
    if (src) {
      picture = document.createElement('img');
      picture.src = new URL(src, 'https://www.fedex.com').href;
      picture.alt = '';
    }
  }

  // Heading
  const srcH1 = [...hero.querySelectorAll('h1')].find((h) => !isHidden(h, element))
    || hero.querySelector('h1, h2');
  let h1 = null;
  if (srcH1) {
    const clone = srcH1.cloneNode(true);
    clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    h1 = document.createElement('h1');
    h1.innerHTML = clone.innerHTML.replace(/\s+/g, ' ').trim();
  }

  // Column grids inside the banner (nl-nl international-priority-express / -economy: the service
  // details next to the title) are not hero copy: they follow the block as default content.
  const innerGrids = [...hero.querySelectorAll('.column_control_v1')]
    .filter((cc) => !isHidden(cc, element) && !cc.parentElement.closest('.column_control_v1') && !isJumpPanel(cc));
  const inGrid = (el) => innerGrids.some((g) => g.contains(el));

  // Intro text (desktop copy only) of the single hero cell (project convention: picture, h1,
  // subheading text, CTA in one cell): paragraphs, plus sub-headings and lists in source order
  // (nl-nl supply-chain, automotive: "Uw supply chain optimaliseren" + bullet list)
  const scope = hero.querySelector('.fxg-subtext') || hero;
  const TEXT = ['p', 'ul', 'ol', 'h2', 'h3', 'h4', 'h5', 'h6']
    .flatMap((t) => [`.richtext ${t}`, `.cc-aem-c-richtext ${t}`]).join(', ');
  const paras = [...scope.querySelectorAll(TEXT)]
    .filter((p, i, all) => all.indexOf(p) === i && !isHidden(p, element) && clean(p.textContent)
      && !inGrid(p) && !p.parentElement.closest('p, ul, ol'))
    .map((p) => {
      const np = document.createElement(p.tagName.toLowerCase());
      np.innerHTML = normalizeSpace(p.cloneNode(true)).innerHTML.replace(/(&nbsp;|\s)+$/g, '').trim();
      np.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
      np.querySelectorAll('*').forEach((n) => { n.removeAttribute('class'); n.removeAttribute('style'); });
      return np;
    });

  // CTA(s)
  // (nl-nl landing heroes: a.cc-aem-c-button, one per breakpoint; the phone and tablet copies
  // carry .fxg-desktop--hide)
  const ctas = [...hero.querySelectorAll('.button_v1 a[href], a.fxg-button[href], a.cc-aem-c-button[href]')]
    .filter((a, i, all) => all.indexOf(a) === i && !isHidden(a, element) && !inGrid(a) && clean(a.textContent) && !/^\/?#$/.test(a.getAttribute('href')))
    // .fxg-auth-button-link is the signed-in alternative of the CTA before it; drop it when it
    // points at the same URL (claims: "Log in" / "Start a claim"), keep it otherwise
    // (small-business: "Open an account" + "Ship Now").
    .filter((a, i, all) => !a.closest('.fxg-auth-button-link')
      || !all.slice(0, i).some((b) => (b.href || b.getAttribute('href')) === (a.href || a.getAttribute('href'))))
    .map((a) => ctaParagraph(a, document));

  // Hero block convention kept: one row, one cell (picture, h1, intro, CTAs). A banner without
  // intro text of its own can carry it in a richtext beside the banner, in the hero component's own
  // grid (en-us customer-support/faqs/receiving: "Learn more about tracking, managing, and picking
  // up your delivery at a FedEx location."): those paragraphs are the intro.
  if (!paras.length && hero !== element) {
    [...element.querySelectorAll('.richtext')]
      .filter((rt) => !hero.contains(rt) && !rt.closest('.column_control_v1') && !isHidden(rt, element))
      .forEach((rt) => {
        [...rt.querySelectorAll('p')].filter((p) => clean(p.textContent) && !isHidden(p, element)).forEach((p) => {
          const np = document.createElement('p');
          np.innerHTML = normalizeSpace(p.cloneNode(true)).innerHTML.replace(/(&nbsp;|\s)+$/g, '').trim();
          np.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
          np.querySelectorAll('*').forEach((n) => { n.removeAttribute('class'); n.removeAttribute('style'); });
          paras.push(np);
        });
        rt.remove();
      });
  }

  if (!h1 && !picture && !paras.length) {
    element.remove();
    return;
  }

  // One row, one cell (project decision)
  const content = [];
  if (picture) content.push(picture);
  if (h1) content.push(h1);
  content.push(...paras, ...ctas);
  const cells = [[content]];

  // Content of the hero component outside the banner (e.g. small-business.html: the blue
  // "FedEx account holders can take advantage of exclusive benefits..." band) is kept as
  // default content right after the block. Mobile-only duplicates are skipped.
  const after = [];
  walkComponents({ children: innerGrids }, element, document, after);
  if (hero !== element) {
    [...element.children]
      .filter((child) => child !== hero && !child.contains(hero))
      .forEach((child) => walkComponents({ children: [child] }, element, document, after));
  }

  // generic-landing (nl-nl): the light heroes' pictures are baked banners too (white fade,
  // diagonal and photo in one 1200x350 / 2400x700 image) -> `full-image`, shown whole
  let name = isPurple(element, hero) ? 'Hero (landing, purple)' : 'Hero (landing)';
  if (template === 'generic-landing' && name === 'Hero (landing)' && picture) name = 'Hero (landing, full-image)';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
  if (after.length) block.after(...after);
}
