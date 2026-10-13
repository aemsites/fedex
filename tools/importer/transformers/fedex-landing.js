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
 * afterTransform: the section style markers placed in 1b/2 become Section Metadata blocks.
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
function centeredPanelGrid(cc) {
  if (!cc || !cc.matches || !cc.matches('div.column_control_v1')) return null;
  const cols = visibleCols(cc);
  if (cols.length !== 3 || [cols[0], cols[2]].some(hasContent)) return null;
  const grid = cols[1].querySelector(':scope > div > .aem-Grid');
  return grid && grid.querySelector(':scope > .column_control_v1') ? grid : null;
}

// a component whose only text is its headings (a loose title_v1, a hero holding just the h1)
const headingsOnly = (el) => !el.querySelector('img, picture, table')
  && clean([...el.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => h.textContent).join(' ')) === clean(el.textContent);

function insertSectionBreaks(element, doc) {
  const grid = element.querySelector('.root > .aem-Grid');
  if (!grid) return;
  let prev = null;
  [...grid.children].forEach((child) => {
    if (!hasContent(child) || child.matches('.spacer')) return;
    const type = typeOf(child);
    const merged = prev && type === typeOf(prev) && BREAK_TYPES_MERGED.includes(type)
      && !centeredPanelGrid(child) && !centeredPanelGrid(prev);
    // a heading stays with the content it introduces (temperature-controlled, contact pages)
    if (prev && !merged && !headingsOnly(prev)) child.before(doc.createElement('hr'));
    prev = child;
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
  element.querySelectorAll('.root .column_control_v1').forEach((cc) => {
    if (!cc.isConnected) return;
    const grid = centeredPanelGrid(cc);
    if (!grid) return;
    const styles = [];
    if (cc.parentElement && cc.parentElement.matches('.root > .aem-Grid')) {
      // same rule as parsers/cards-horizontal.js isLight(): a bgcolor row unless its inline colour is white
      const row = cc.querySelector(':scope > .row');
      const bg = ((row && row.style && row.style.backgroundColor) || '').replace(/\s+/g, '').toLowerCase();
      if (row && row.classList.contains('fxg-row--has-bgcolor')
        && !/^(#fff(fff)?|white|rgb\(255,255,255\)|transparent|rgba\(0,0,0,0\))$/.test(bg)) styles.push('light');
      const links = [...grid.querySelectorAll('a[href]')];
      if (links.length && links.every((a) => a.getAttribute('href').startsWith('#'))) styles.push('jump-links');
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

function createSectionMetadata(element, doc) {
  element.querySelectorAll(`[${STYLE_MARKER_ATTR}]`).forEach((marker) => {
    marker.replaceWith(WebImporter.Blocks.createBlock(doc, {
      name: 'Section Metadata',
      cells: { style: marker.getAttribute(STYLE_MARKER_ATTR) },
    }));
  });
}

function convertJumpLinks(element, doc) {
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
    while (top.parentElement && !top.parentElement.matches('.root > .aem-Grid')) top = top.parentElement;
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
  stripForms(element);
  promoteFirstHeading(element, doc);
  insertSectionBreaks(element, doc);
  unwrapCenteredPanels(element, doc);
  convertJumpLinks(element, doc);
}
