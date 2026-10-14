/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: generic FedEx landing pages (template `generic-landing`, the nl-nl shipping tree).
 * The page-specific templates (hub-landing, banner-landing, ...) place section breaks with
 * selectors written for one en-us page each; this template serves ~70 different pages, so the
 * breaks come from the page structure instead. Verified live (Playwright) on
 * https://www.fedex.com/nl-nl/shipping.html, shipping/international.html,
 * shipping/dangerous-goods.html, shipping/surcharges.html,
 * shipping/industry-solutions/automotive/contact.html, shipping/packaging/supplies.html and
 * shipping/ebr-declaration-form.html.
 *
 * beforeTransform (runs after fedex-cleanup's beforeTransform, before the parsers):
 *  1. Sections: .root > .aem-Grid holds the page as a list of top-level components (the hero
 *     responsivegrid, then container.fxg-wrapper sections and loose column_control_v1 bands).
 *     An <hr> goes before every top-level component with content except the first. Consecutive
 *     top-level column_control_v1 / accordion_selector components stay together (block parsers
 *     merge such sibling runs), unless one is a centred panel. <hr> is not a <div>, so no parser
 *     selector shifts.
 *  1b. Centred panels (2 | 8 with nested rows | 2) are unwrapped into their rows, see
 *     unwrapCenteredPanels; top-level ones keep `light` / `jump-links` as section style.
 *  2. Jump links (div.jumplinks: sticky in-page tab bar, surcharges) -> ul > li > a of the same
 *     #links in a section of its own with style `jump-links`. fedex-cleanup rewrites the #ids to
 *     the EDS heading ids.
 *  3. Forms (AEM forms: div.start > form.fxg-forms ... div.end, posting to api.emea.fedex.com;
 *     adaptive forms: form > .guide* fields). There is no form block yet (see
 *     migration-work/nl-shipping/REPORT.md): the fields are removed, the authored text, headings
 *     and images inside the form stay default content (supplies: the product catalogue).
 *  4. Pages without an h1 (contact pages whose hero title is an h2) get their first heading
 *     promoted to h1.
 *  5. Split rows (desktop card grids authored one row per component type) are merged per column
 *     first (mergeSplitRows); a wrapper holding several topics gets a break before each further
 *     H2 title; a section opening with a centred title gets style `center-intro`; purple panels
 *     get `dark` (critique of nl-nl home, shipping, freight-services, 2026-10-14).
 *  6. Shapes the generic selectors misread are tagged for the generic-landing parsers
 *     (tagShapes: banner, cards-grid, columns-layout).
 * afterTransform: the section style markers placed in 1b/2/5 become one Section Metadata block
 * per section.
 */

const BREAK_TYPES_MERGED = ['column_control_v1', 'accordion_selector'];
const FORM_FIELDS = [
  '.text', '.checkboxSingle', '.checkbox', '.hiddenField', '.dropdown', '.options', '.textarea',
  '.radio', '.datepicker', '.fileupload', '.captcha', '.recaptcha', '.submit', '.end', '.reset',
  '[class*="guide"]', 'input', 'select', 'textarea', 'button', 'label',
];

const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();
const hasContent = (el) => !!(clean(el.textContent) || el.querySelector('img, picture, video, iframe, table'));
const typeOf = (el) => [...el.classList].find((c) => !c.startsWith('aem-')) || '';

const visibleCols = (cc) => [...cc.querySelectorAll(':scope > .row > .fxg-col')]
  .filter((c) => !c.matches('.fxg-desktop--hide'));

// Centred panel: [empty col-sm-2 | col-sm-8 holding nested column_control_v1 rows | empty col-sm-2]
// (shipping.html: "Wat u kunt vinden op deze pagina", the three photo links, "Bereken uw tarieven
// / Open een account / Vraag een ophaling aan"). Returns the middle column's grid, else null.
// A top-level row may also be offset ([empty col-sm-3 | col-sm-8], freight-services jump links) or
// hold only text ([2 | 8 richtext | 2], freight-services "Wat u kunt vinden op deze pagina:").
function centeredPanelGrid(cc, topLevel) {
  if (!cc || !cc.matches || !cc.matches('div.column_control_v1')) return null;
  const cols = visibleCols(cc);
  const content = cols.filter(hasContent);
  if (content.length !== 1 || cols.length < 2) return null;
  const grid = content[0].querySelector(':scope > div > .aem-Grid');
  if (!grid) return null;
  if (grid.querySelector(':scope > .column_control_v1')) {
    return cols.length === 3 && cols[1] === content[0] ? grid : (topLevel ? grid : null);
  }
  return topLevel && !grid.querySelector('img, table') ? grid : null;
}

const PURPLE = /^(#4d148c|rgb\(77,20,140\))$/;
const rowBg = (cc) => {
  const row = cc.querySelector(':scope > .row');
  if (!row || !row.classList.contains('fxg-row--has-bgcolor')) return '';
  const bg = ((row.style && row.style.backgroundColor) || '').replace(/\s+/g, '').toLowerCase();
  if (/^(#fff(fff)?|white|rgb\(255,255,255\)|transparent|rgba\(0,0,0,0\))$/.test(bg)) return '';
  return PURPLE.test(bg) ? 'dark' : 'light';
};

const colWidth = (col) => [...col.classList].find((k) => /^col-sm-\d+$/.test(k)) || '';
const colGrid = (col) => col.querySelector(':scope > div > .aem-Grid');
const compsOf = (col) => {
  const g = colGrid(col);
  return g ? [...g.children].filter((c) => hasContent(c) && !c.matches('.fxg-desktop--hide, .spacer')) : [];
};
const isCC = (el) => !!el && el.matches && el.matches('div.column_control_v1');
const filler = (el) => !!el && el.matches && !el.matches('.column_control_v1') && !hasContent(el);
const svgIcon = (img) => !!img && /\.svg(\?|$)|_Icon_/i.test(img.getAttribute('src') || '');

// following column-control siblings (fillers skipped) while `same` holds
function siblingRun(cc, same) {
  const run = [cc];
  let next = cc.nextElementSibling;
  while (next) {
    if (isCC(next) && same(next)) run.push(next);
    else if (!filler(next)) break;
    next = next.nextElementSibling;
  }
  return run;
}

/*
 * Split rows: the desktop rendition of a card grid is authored as one row per component type
 * (shipping.html: an image + title row, then a text row; the purple band: titles, texts, buttons;
 * luxury-goods, domestic: the same), next to a mobile-only copy (.fxg-desktop--hide columns)
 * holding each card whole. Imported row by row, a card's parts end up in separate blocks (and on
 * a phone all titles stack above all texts). A run of sibling rows with the same column widths
 * where a later row holds one kind of component in every column (all titles, all texts or all
 * buttons) is merged per column into the first row, which is tagged data-fedex-split. The
 * mobile-only copy right before the run is dropped.
 */
function oneKindRow(cc) {
  const cols = visibleCols(cc).filter(hasContent);
  if (cols.length < 2) return false;
  const kinds = cols.map((c) => [...new Set(compsOf(c).map(typeOf))]);
  return kinds.every((k) => k.length === 1 && k[0] === kinds[0][0]
    && ['title_v1', 'richtext', 'button_v1'].includes(k[0]));
}

let splitCounter = 0;
function mergeSplitRows(element) {
  element.querySelectorAll('.root .column_control_v1').forEach((cc) => {
    if (!cc.isConnected || cc.closest('.fxg-desktop--hide')) return;
    const prev = cc.previousElementSibling;
    if (isCC(prev) && prev.hasAttribute('data-fedex-split')) return;
    const cols = visibleCols(cc);
    const sig = cols.map(colWidth).join('|');
    if (cols.length < 2 || cc.querySelector('.column_control_v1') || rowBg(cc)) return;
    const run = siblingRun(cc, (n) => visibleCols(n).map(colWidth).join('|') === sig
      && !n.querySelector('.column_control_v1') && !rowBg(n));
    if (run.length < 2 || !run.slice(1).some(oneKindRow)) return;
    // A row that is not one kind starts the next row of cards (healthcare: image + title row,
    // text row, image + title row, text row = 2 x 2 cards); the groups share one split id, so
    // they become one block.
    const groups = [];
    run.forEach((row, i) => {
      if (i === 0 || !oneKindRow(row)) groups.push([row]);
      else groups[groups.length - 1].push(row);
    });
    splitCounter += 1;
    groups.forEach(([lead, ...rest]) => {
      const leadCols = visibleCols(lead);
      rest.forEach((row) => {
        visibleCols(row).forEach((col, i) => {
          const target = colGrid(leadCols[i]);
          const source = colGrid(col);
          if (target && source) target.append(...source.children);
        });
        row.remove();
      });
      lead.setAttribute('data-fedex-split', `split-${splitCounter}`);
    });
    // the mobile-only copy (all columns .fxg-desktop--hide) right before the run
    let before = cc.previousElementSibling;
    while (filler(before)) before = before.previousElementSibling;
    if (isCC(before) && [...before.querySelectorAll(':scope > .row > .fxg-col')].every((c) => c.matches('.fxg-desktop--hide'))) {
      before.remove();
    }
  });
}

let runCounter = 0;
function tag(el, block, kind, run) {
  el.setAttribute('data-fedex-block', block);
  if (kind) el.setAttribute('data-fedex-kind', kind);
  if (run) el.setAttribute('data-fedex-run', run);
}
function tagRun(run, block, kind) {
  runCounter += 1;
  const id = run.length > 1 ? `run-${runCounter}` : '';
  run.forEach((el) => tag(el, block, kind, id));
}

/*
 * Shapes the generic block selectors misread, tagged for the generic-landing parsers
 * (parsers/banner.js, cards-grid.js, columns-layout.js; their selectors come first):
 * - banner: a bgcolor row [icon image] | [title / text] | [button] (shipping "Verzend slimmer",
 *   freight "Vracht verzenden met FedEx" on purple)
 * - cards-grid / split: merged split rows with images (shipping circles, service guide icons)
 * - columns-layout / centered: merged split rows without images, centred titles (purple band)
 * - cards-grid / icons: sibling rows of 2 columns, each an SVG icon + title + text (freight
 *   "Waarom zou u FedEx kiezen")
 * - cards-grid / icon-right: sibling rows [title + text] | [icon] (freight "Specialistische
 *   oplossingen")
 * - columns-layout / divided: 2 columns, each a title above nested icon rows (freight "Hoe
 *   verzendt u uw vracht | Wat kan ik verzenden?")
 * - columns-layout / one-third: [col-sm-4 image] | [col-sm-8 heading + text] (freight "Wij maken
 *   vrachtvervoer eenvoudiger dan u denkt")
 */
function tagShapes(element) {
  element.querySelectorAll('.root .column_control_v1').forEach((cc) => {
    if (!cc.isConnected || cc.hasAttribute('data-fedex-block') || cc.closest('.fxg-desktop--hide')
      || cc.parentElement.closest('.column_control_v1, .accordion_selector, .tabs_v1, .featured_offer_v2, .hero_landingpage_v1, .carousel_v1')) return;
    const cols = visibleCols(cc).filter(hasContent);
    const kinds = cols.map((c) => compsOf(c).map(typeOf));
    const only = (k, t) => k.length > 0 && k.every((x) => x === t);
    if (cc.hasAttribute('data-fedex-split')) {
      // all card rows of one split grid (same split id) form one block, built by the first
      const id = cc.getAttribute('data-fedex-split');
      const members = [...element.querySelectorAll(`[data-fedex-split="${id}"]`)];
      if (members[0] !== cc) return;
      if (members.some((m) => m.querySelector('.image_v2 img'))) {
        members.forEach((m) => tag(m, 'cards-grid', 'split', members.length > 1 ? id : ''));
      } else if (members.length === 1 && cc.querySelector('[class*="align--center@small"]')) {
        tag(cc, 'columns-layout', 'centered');
      }
      return;
    }
    if (cols.length === 3 && rowBg(cc) && only(kinds[0], 'image_v2') && only(kinds[2], 'button_v1')
      && kinds[1].length && kinds[1].every((k) => ['richtext', 'title_v1'].includes(k))) {
      tag(cc, 'banner');
      cc.setAttribute('data-fedex-variant', rowBg(cc));
      return;
    }
    if (cols.length !== 2) return;
    const nested = (c) => compsOf(c).filter((k) => k.matches('.column_control_v1'));
    if (cols.every((c) => compsOf(c)[0] && compsOf(c)[0].matches('.title_v1') && nested(c).length > 0
      && compsOf(c).slice(1).every((k) => k.matches('.column_control_v1')))) {
      tag(cc, 'columns-layout', 'divided');
      return;
    }
    if (colWidth(cols[0]) === 'col-sm-4' && colWidth(cols[1]) === 'col-sm-8' && only(kinds[0], 'image_v2')
      && kinds[1][0] === 'title_v1' && kinds[1].every((k) => ['title_v1', 'richtext'].includes(k))) {
      tag(cc, 'columns-layout', 'one-third');
      return;
    }
    const iconCard = (c) => {
      const k = compsOf(c).map(typeOf);
      return k[0] === 'image_v2' && svgIcon(c.querySelector('img')) && k.includes('title_v1')
        && k.slice(1).every((x) => ['title_v1', 'richtext'].includes(x));
    };
    const iconCards = (n) => { const c = visibleCols(n).filter(hasContent); return c.length === 2 && c.every(iconCard); };
    if (iconCards(cc)) {
      tagRun(siblingRun(cc, iconCards), 'cards-grid', 'icons');
      return;
    }
    const iconRight = (n) => {
      const c = visibleCols(n).filter(hasContent);
      if (c.length !== 2) return false;
      const k0 = compsOf(c[0]).map(typeOf);
      const k1 = compsOf(c[1]).map(typeOf);
      return k0[0] === 'title_v1' && k0.every((x) => ['title_v1', 'richtext'].includes(x))
        && only(k1, 'image_v2') && svgIcon(c[1].querySelector('img'));
    };
    if (iconRight(cc)) tagRun(siblingRun(cc, (n) => iconRight(n) && rowBg(n) === rowBg(cc)), 'cards-grid', 'icon-right');
  });
}

// a component whose only text is its headings (a loose title_v1, a hero holding just the h1)
const headingsOnly = (el) => !el.querySelector('img, picture, table')
  && clean([...el.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => h.textContent).join(' ')) === clean(el.textContent);

// The page grid whose children are the sections. Usually .root > .aem-Grid; when that holds a
// single content wrapper (nl-nl/home: one responsivegrid around the whole page), the wrapper's grid.
function pageGrid(element) {
  let grid = element.querySelector('.root > .aem-Grid');
  for (let depth = 0; grid && depth < 3; depth += 1) {
    const content = [...grid.children].filter((c) => hasContent(c) && !c.matches('.spacer'));
    const inner = content.length === 1 && content[0].matches('.responsivegrid:not(.container)')
      && content[0].querySelector(':scope > .aem-Grid');
    if (!inner) break;
    grid = inner;
  }
  return grid;
}

// Not shown on fedex.com: Adobe Target placeholders kept hidden (nl-nl/home "Beheer uw zendingen":
// div.cmp-container.at-element-marker style="display: none") and notifications without a message
// (the hidden empty one on nl-nl/home would import as "Meer details Show Less").
function removeHiddenContent(element) {
  element.querySelectorAll('.root .at-element-marker[style*="display: none"], .root .at-element-marker[style*="display:none"]')
    .forEach((el) => el.remove());
  element.querySelectorAll('.root div.notifications').forEach((n) => {
    const contents = n.querySelector('.fxg-notifications__contents') || n;
    const copy = contents.cloneNode(true);
    copy.querySelectorAll('.fxg-notifications__details').forEach((d) => d.remove());
    if (!clean(copy.textContent)) n.remove();
  });
}

// a top-level panel holding only text (no links), e.g. the jump-links heading row
const textPanel = (el) => !!centeredPanelGrid(el, true) && !el.querySelector('a[href], img');
const jumpPanel = (el) => {
  if (!centeredPanelGrid(el, true)) return false;
  const links = [...el.querySelectorAll('a[href]')];
  return links.length > 0 && links.every((a) => a.getAttribute('href').startsWith('#'));
};

// the components of a top-level wrapper (container.fxg-wrapper > div > .aem-Grid)
function wrapperGrid(child) {
  if (!child.matches('.container, .responsivegrid') || child.matches('.column_control_v1')) return null;
  return child.querySelector(':scope > .aem-Grid') || child.querySelector(':scope > div > .aem-Grid')
    || child.querySelector(':scope > .cmp-container');
}

const isTopicTitle = (el) => el.matches('.title_v1') && !!el.querySelector('h2');

function insertSectionBreaks(element, doc) {
  const grid = pageGrid(element);
  if (!grid) return;
  let prev = null;
  [...grid.children].forEach((child) => {
    if (!hasContent(child) || child.matches('.spacer')) return;
    const type = typeOf(child);
    const merged = prev && type === typeOf(prev) && BREAK_TYPES_MERGED.includes(type)
      && !centeredPanelGrid(child, true) && !centeredPanelGrid(prev, true);
    // the jump-links heading row and the links row below it are one panel (freight-services)
    const panelPair = prev && textPanel(prev) && jumpPanel(child) && rowBg(prev) === rowBg(child);
    // a heading stays with the content it introduces (temperature-controlled, contact pages)
    if (prev && !merged && !panelPair && !headingsOnly(prev)) child.before(doc.createElement('hr'));
    prev = child;
    // A wrapper holding several topics (freight-services: the whole page body in one
    // container.fxg-wrapper) gets a break before each further H2 title, so every topic is a section.
    const inner = wrapperGrid(child);
    if (!inner) return;
    let seen = false;
    [...inner.children].forEach((comp) => {
      if (!hasContent(comp) || comp.matches('.spacer')) return;
      if (seen && isTopicTitle(comp)) comp.before(doc.createElement('hr'));
      seen = true;
    });
  });
}

// center-intro: a section that opens with a title centred from the small breakpoint up
// (cc-aem-u-align--center@small: "FedEx-verzendservices die uw bedrijf ondersteunen", the intro
// text below it is centred too). The marker goes right after the title; the style centres the
// section's leading default content only (later footnotes stay left).
function markCenteredIntros(element, doc) {
  element.querySelectorAll('.root .title_v1').forEach((title) => {
    const h = title.querySelector('h1, h2, h3, h4, h5, h6');
    if (!h || h.tagName === 'H1' || !h.classList.contains('cc-aem-u-align--center@small')) return;
    if (title.closest('.column_control_v1, .accordion_selector, .tabs_v1, .featured_offer_v2, .hero_landingpage_v1, .experiencefragment, .fxg-desktop--hide')) return;
    // only a title that opens its section: no content between the previous break and it
    let prev = title.previousElementSibling;
    while (prev && !prev.matches('hr') && !hasContent(prev)) prev = prev.previousElementSibling;
    let opens = !prev || prev.matches('hr');
    if (!prev) {
      // first in its wrapper: the wrapper must open the section (an <hr> or nothing before it)
      let wrap = title.parentElement;
      while (wrap && wrap.previousElementSibling === null && !wrap.matches('.root > .aem-Grid')) wrap = wrap.parentElement;
      let before = wrap && wrap.previousElementSibling;
      while (before && !before.matches('hr') && !hasContent(before)) before = before.previousElementSibling;
      opens = !before || before.matches('hr');
    }
    if (opens) title.after(styleMarker(doc, 'center-intro'));
  });
}

// Breaks whose section ended up empty (its components were dropped, e.g. a standalone video)
function removeEmptySections(element) {
  const breaks = [...element.querySelectorAll('hr')].filter((hr) => !hr.closest('table'));
  breaks.forEach((hr) => {
    let node = hr.previousSibling;
    let empty = true;
    while (node && !(node.nodeName === 'HR')) {
      if ((node.textContent || '').trim() || (node.querySelector && node.querySelector('img, picture, table'))
        || node.nodeName === 'IMG' || node.nodeName === 'TABLE') { empty = false; break; }
      node = node.previousSibling;
    }
    // only between two breaks (a leading break before the first content is left to the importer)
    if (empty && node) hr.remove();
  });
}

// Centred panels hide their rows from the block selectors (which skip nested column controls):
// replace each panel with its rows. A top-level panel is its own section (insertSectionBreaks), so
// it keeps its look as section style: `light` for the grey panel, `jump-links` when it only holds
// in-page links.
function unwrapCenteredPanels(element, doc) {
  const page = pageGrid(element);
  element.querySelectorAll('.root .column_control_v1').forEach((cc) => {
    if (!cc.isConnected) return;
    const top = !!cc.parentElement && cc.parentElement === page;
    const grid = centeredPanelGrid(cc, top);
    if (!grid) return;
    const styles = [];
    if (top) {
      // same rule as parsers/cards-horizontal.js isLight(): a bgcolor row unless its inline
      // colour is white; FedEx purple (shipping.html "Bereken uw tarieven") is the dark band
      const bg = rowBg(cc);
      if (bg) styles.push(bg);
      const links = [...grid.querySelectorAll('a[href]')];
      if (links.length && links.every((a) => a.getAttribute('href').startsWith('#'))) {
        styles.push('jump-links');
        // links laid out in three columns (freight-services) -> three-columns modifier
        const inner = grid.querySelector(':scope > .column_control_v1');
        if (inner && visibleCols(inner).filter(hasContent).length >= 3) styles.push('three-columns');
      }
    }
    const nodes = [...grid.childNodes];
    if (styles.length) nodes.push(styleMarker(doc, styles.join(', ')));
    cc.replaceWith(...nodes);
  });
}

// Section Metadata is created in afterTransform: a <table> made before the parsers run would be
// taken for a data table by the table selector. The marker is an empty div (a filler for the
// run-merging parsers).
const STYLE_MARKER_ATTR = 'data-fedex-section-style';

function styleMarker(doc, style) {
  const marker = doc.createElement('div');
  marker.setAttribute(STYLE_MARKER_ATTR, style);
  return marker;
}

// One Section Metadata per section: markers between the same two breaks are combined (the
// jump-links heading panel + the links panel, a centred intro inside a light panel), in order,
// without repeats.
function createSectionMetadata(element, doc) {
  const groups = [];
  let current = null;
  element.querySelectorAll(`hr, [${STYLE_MARKER_ATTR}]`).forEach((el) => {
    if (el.matches('hr')) {
      if (!el.closest('table')) current = null;
      return;
    }
    if (!current) {
      current = [];
      groups.push(current);
    }
    current.push(el);
  });
  groups.forEach((markers) => {
    const styles = [];
    markers.forEach((m) => m.getAttribute(STYLE_MARKER_ATTR).split(',').map((s) => s.trim())
      .forEach((s) => { if (s && !styles.includes(s)) styles.push(s); }));
    // at the last marker's place (the end of the section's content so far)
    markers.slice(0, -1).forEach((m) => m.remove());
    markers[markers.length - 1].replaceWith(WebImporter.Blocks.createBlock(doc, {
      name: 'Section Metadata',
      cells: { style: styles.join(', ') },
    }));
  });
}

function convertJumpLinks(element, doc) {
  const page = pageGrid(element);
  element.querySelectorAll('.root .jumplinks').forEach((jl) => {
    const links = [...jl.querySelectorAll('a[href]')].filter((a) => clean(a.textContent));
    if (!links.length) {
      jl.remove();
      return;
    }
    const ul = doc.createElement('ul');
    links.forEach((a) => {
      const li = doc.createElement('li');
      const na = doc.createElement('a');
      na.setAttribute('href', a.getAttribute('href'));
      na.textContent = clean(a.textContent);
      li.append(na);
      ul.append(li);
    });
    const metadata = styleMarker(doc, 'jump-links');
    // own section: a top-level component holding only the jump links already is one
    // (insertSectionBreaks); otherwise break before and after
    let top = jl;
    while (top.parentElement && top.parentElement !== page && !top.parentElement.matches('.root > .aem-Grid')) top = top.parentElement;
    const alone = top.parentElement && clean(top.textContent) === clean(jl.textContent);
    if (alone) {
      jl.replaceWith(ul, metadata);
    } else if (jl.closest('.hero_landingpage_v1') && top.parentElement) {
      // inside the hero (out-of-home-deliveries): the hero parser keeps only the banner copy, so
      // the links become their own section right after the hero's top-level component
      jl.remove();
      top.after(doc.createElement('hr'), ul, metadata);
    } else {
      jl.replaceWith(doc.createElement('hr'), ul, metadata, doc.createElement('hr'));
    }
  });
}

function stripForms(element) {
  element.querySelectorAll('.root form').forEach((form) => {
    FORM_FIELDS.forEach((sel) => form.querySelectorAll(sel).forEach((el) => {
      // keep authored content components that happen to sit inside a field wrapper
      if (el.querySelector('.title_v1, .richtext, .image_v2') && !el.matches('input, select, textarea, button, label')) return;
      el.remove();
    }));
    form.replaceWith(...form.childNodes);
  });
  element.querySelectorAll('.root .end, .root .hiddenField').forEach((el) => el.remove());
}

function promoteFirstHeading(element, doc) {
  const root = element.querySelector('.root') || element;
  if (root.querySelector('h1')) return;
  const first = [...root.querySelectorAll('h2, h3, h4')].find((h) => !h.closest('.fxg-desktop--hide'));
  if (!first) return;
  const h1 = doc.createElement('h1');
  h1.innerHTML = first.innerHTML.trim();
  [...first.attributes].forEach((a) => { if (a.name === 'id') h1.setAttribute('id', a.value); });
  first.replaceWith(h1);
}

export default function transform(hookName, element, payload) {
  const doc = (payload && payload.document) || element.ownerDocument;
  if (hookName === 'afterTransform') {
    createSectionMetadata(element, doc);
    removeEmptySections(element);
    return;
  }
  if (hookName !== 'beforeTransform') return;
  removeHiddenContent(element);
  stripForms(element);
  promoteFirstHeading(element, doc);
  mergeSplitRows(element);
  insertSectionBreaks(element, doc);
  markCenteredIntros(element, doc);
  unwrapCenteredPanels(element, doc);
  convertJumpLinks(element, doc);
  tagShapes(element);
}
