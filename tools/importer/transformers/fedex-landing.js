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
 *     adaptive forms: form > .guide* fields). Adaptive forms and the classic forms listed in
 *     CLASSIC_FORMS become Form blocks (markAdaptiveForms). Elsewhere the fields are removed and
 *     the authored text, headings and images inside the form stay default content (nl-nl
 *     supplies: the product catalogue).
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

import { wrapInlineRuns } from '../utils/components.js';

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
// FedEx blue band (schedule-manage-pickups "Effective August 18, 2025, FedEx will begin using a new
// pricing and rating structure…" under the hero): section style `blue` (white text, styles.css)
const BLUE = /^(#007ab7|rgb\(0,122,183\))$/;
const rowColor = (cc) => {
  const row = cc.querySelector(':scope > .row');
  return ((row && row.style && row.style.backgroundColor) || '').replace(/\s+/g, '').toLowerCase();
};
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
    // a later row may fill only the first columns (ship-to-europe: "Focus op..." links under the
    // first two of four photos)
    const run = siblingRun(cc, (n) => {
      const nsig = visibleCols(n).map(colWidth).join('|');
      return (nsig === sig || (nsig && sig.startsWith(`${nsig}|`)))
        && !n.querySelector('.column_control_v1') && !rowBg(n);
    });
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
 * - columns-layout / icon-lists: 2 columns, each a photo, title and text above nested icon rows
 *   (en-us sweepstakes "Check out some of our past sweepstakes")
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
    // photo, title, text, then nested icon rows in each column (en-us sweepstakes "Check out some
    // of our past sweepstakes": image, name, story, "Their experiences included:" + prize icons)
    const photoCol = (c) => {
      const k = compsOf(c);
      return !!k[0] && k[0].matches('.image_v2') && !svgIcon(k[0].querySelector('img'))
        && !!k[1] && k[1].matches('.title_v1') && nested(c).length > 0
        && k.slice(2).every((x) => x.matches('.richtext, .column_control_v1'));
    };
    if (cols.every(photoCol)) {
      tag(cc, 'columns-layout', 'icon-lists');
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

// Jump-link grids (en-us how-to-ship pages "Here’s what you’ll find on this page:",
// how-to-hub/articles "Learn how to ship:"): a panel of [arrow icon | #link] rows, one stack per
// column. The outermost column control holding only those rows becomes a list of the links with
// the `jump-links` style (two columns from 768px, the source's arrows drawn by the style) and
// `light` for a grey panel; it stays one section with the title panel above it (insertSectionBreaks).
const JUMP_GRID = 'data-fedex-jump-grid';
const jumpArrow = (img) => /jumplink_arrow/i.test(img.getAttribute('src') || '');

// Grids of stacked "indent rows" (schedule-manage-pickups "Simplify shipping with FedEx pickup
// options": three columns, each an [empty | icon] row, an [empty | "I don't ship very often."] row
// and a [jump arrow | "Explore on-call pickups"] row): each row is replaced by its content, so a
// column reads icon, text, link and the grid is the icon-cards shape (cards-icon, centered). The
// jump arrows go; the links keep their #targets.
const CONTENT_COMPS = '.image_v2, .richtext, .title_v1, .button_v1';
function indentRowContent(row) {
  const cols = visibleCols(row);
  if (cols.length !== 2) return null;
  const [lead, body] = cols;
  if (clean(lead.textContent) || [...lead.querySelectorAll('img')].some((img) => !jumpArrow(img))) return null;
  const grid = colGrid(body);
  const comps = grid ? [...grid.children].filter((c) => !c.matches('.fxg-desktop--hide, .spacer')) : [];
  return comps.length && comps.every((c) => c.matches(CONTENT_COMPS)) ? comps : null;
}

function flattenIndentRows(element) {
  element.querySelectorAll('.root .column_control_v1').forEach((cc) => {
    if (!cc.isConnected || cc.parentElement.closest('.column_control_v1')) return;
    const cols = visibleCols(cc);
    if (cols.length < 2 || cols.length > 4) return;
    const plan = cols.map((col) => {
      const grid = colGrid(col);
      if (!grid) return null;
      const rows = [...grid.children].filter((c) => !c.matches('.fxg-desktop--hide, .spacer')
        && !(c.matches('.column_control_v1') && !visibleCols(c).length));
      if (rows.length < 2 || !rows.every((r) => r.matches('.column_control_v1'))) return null;
      const contents = rows.map(indentRowContent);
      // a column of links only is a jump-link grid (express "What is expedited shipping?", …),
      // left to convertJumpLinkGrids
      if (!contents.every(Boolean) || !contents.flat().some((c) => c.matches('.image_v2, .richtext, .title_v1'))) return null;
      return rows.map((r, i) => [r, contents[i]]);
    });
    if (!plan.every(Boolean)) return;
    plan.flat().forEach(([row, comps]) => row.replaceWith(...comps));
    // rows whose columns are all mobile-only copies (.fxg-desktop--hide) go too: left in, the grid
    // would still hold a nested row
    cols.forEach((col) => [...colGrid(col).children]
      .filter((c) => c.matches('.column_control_v1') && !visibleCols(c).length)
      .forEach((c) => c.remove()));
  });
}

// A [jump arrow | link] row left after the jump-link grids and panels are converted
// (schedule-manage-pickups "Get tools and tips to make pickups even easier" below the pickup
// options) -> one paragraph ":arrow-down: link": the arrow is an inline icon before the link, as on
// the source (icons/arrow-down.svg; styled in styles.css). Runs after convertJumpLinkGrids and
// unwrapCenteredPanels; rows of a jump-links panel are left alone.
function inlineArrowLinks(element, doc) {
  element.querySelectorAll('.root .column_control_v1').forEach((row) => {
    if (!row.isConnected) return;
    const cols = visibleCols(row);
    if (cols.length !== 2) return;
    const [lead, body] = cols;
    const arrows = [...lead.querySelectorAll('img')];
    if (clean(lead.textContent) || !arrows.length || !arrows.every(jumpArrow)) return;
    const grid = colGrid(body);
    const comps = grid ? [...grid.children].filter((c) => !c.matches('.fxg-desktop--hide, .spacer')) : [];
    const links = comps.length === 1 && comps[0].matches('.button_v1')
      ? [...comps[0].querySelectorAll('a[href]')].filter((a) => !a.closest('.fxg-desktop--hide') && clean(a.textContent)) : [];
    if (links.length !== 1) return;
    // inside a side-by-side panel ([title | links]: multiweight, sustainable-packaging "Here's what
    // you'll find on this page") the rows stay: as plain paragraphs the panel would read as a
    // columns row and merge with the media rows after it
    let outer = row.parentElement && row.parentElement.closest('.column_control_v1');
    while (outer && outer.parentElement && outer.parentElement.closest('.column_control_v1')) {
      outer = outer.parentElement.closest('.column_control_v1');
    }
    if (outer && visibleCols(outer).filter(hasContent).length >= 2) return;
    // a jump-links panel keeps its rows (its section is styled as a list of in-page links)
    for (let n = row.nextElementSibling; n && !n.matches('hr'); n = n.nextElementSibling) {
      if ((n.getAttribute(STYLE_MARKER_ATTR) || '').includes('jump-links')) return;
    }
    const rt = doc.createElement('div');
    rt.className = 'richtext';
    rt.setAttribute('data-fedex-arrow-link', '');
    const p = doc.createElement('p');
    const a = doc.createElement('a');
    a.setAttribute('href', links[0].getAttribute('href'));
    a.textContent = clean(links[0].textContent);
    p.append(doc.createTextNode(':arrow-down: '), a);
    rt.append(p);
    row.replaceWith(rt);
  });
}

// A centred icon row right before a title ([empty col-sm-3 | image col-sm-6 | empty col-sm-3], then
// the title_v1: schedule-manage-pickups' purple calendar circles above "Easily schedule an on-call
// pickup online", "Convenience is automatic…"): the icon belongs to the title. It moves into the
// title component, so the section break before the title takes it along (it was left at the end
// of the previous section, or read as a one-logo strip).
function attachIconRowsToTitles(element) {
  element.querySelectorAll('.root .column_control_v1').forEach((cc) => {
    if (!cc.isConnected || cc.parentElement.closest('.column_control_v1')) return;
    const title = cc.nextElementSibling;
    if (!title || !title.matches('.title_v1')) return;
    const cols = visibleCols(cc);
    if (cols.length !== 3 || clean(cc.textContent)) return;
    if (cols[0].querySelector('img') || cols[2].querySelector('img')) return;
    const comps = colGrid(cols[1]) ? [...colGrid(cols[1]).children].filter((c) => !c.matches('.fxg-desktop--hide, .spacer')) : [];
    if (comps.length !== 1 || !comps[0].matches('.image_v2')) return;
    title.prepend(comps[0]);
    cc.remove();
  });
}

// Columns of one row whose content sits at different depths (schedule-manage-pickups "Here's how to
// schedule an on-call pickup": column 1 is .fxg-col > div > .aem-Grid > image + text, columns 2 and
// 3 put a .responsivegrid > .aem-Grid inside that grid): the extra wrapper is unwrapped, so the row
// matches the block selectors written for the plain shape (cards-icon centered: three number icons
// above their step text).
function alignColumnGrids(element) {
  element.querySelectorAll('.root .column_control_v1').forEach((cc) => {
    const cols = visibleCols(cc);
    if (cols.length < 2) return;
    const wrapped = cols.map((col) => {
      const grid = colGrid(col);
      const kids = grid ? [...grid.children].filter((c) => !c.matches('hr, .fxg-desktop--hide')) : [];
      const only = kids.length === 1 ? kids[0] : null;
      return only && only.matches('.responsivegrid') && only.querySelector(':scope > .aem-Grid') ? only : null;
    });
    if (!wrapped.some(Boolean) || wrapped.every(Boolean)) return;
    wrapped.forEach((w) => { if (w) w.replaceWith(...w.querySelector(':scope > .aem-Grid').children); });
  });
}

function convertJumpLinkGrids(element, doc) {
  element.querySelectorAll('.root .column_control_v1').forEach((cc) => {
    if (!cc.isConnected || cc.parentElement.closest('.column_control_v1') || cc.closest('.fxg-desktop--hide')) return;
    // centred panels keep their own jump-links handling (unwrapCenteredPanels)
    if (centeredPanelGrid(cc, true)) return;
    const imgs = [...cc.querySelectorAll('img')];
    const links = [...cc.querySelectorAll('a[href]')].filter((a) => !a.closest('.fxg-desktop--hide') && clean(a.textContent));
    if (links.length < 2 || !links.every((a) => a.getAttribute('href').startsWith('#'))) return;
    // the arrows: an icon image per row, or an icon inside each link (how-to-ship-computers:
    // a.fxg-img-left with an <object> SVG)
    const iconLinks = links.every((a) => a.matches('.fxg-img-left, .fxg-img-right') || a.querySelector('object, .fxg-image'));
    if (imgs.length ? !imgs.every(jumpArrow) : !iconLinks) return;
    const rest = cc.cloneNode(true);
    rest.querySelectorAll('a, .fxg-desktop--hide, script, noscript').forEach((el) => el.remove());
    if (clean(rest.textContent)) return;
    const ul = doc.createElement('ul');
    links.forEach((a) => {
      const li = doc.createElement('li');
      const na = doc.createElement('a');
      na.setAttribute('href', a.getAttribute('href'));
      na.textContent = clean(a.textContent);
      li.append(na);
      ul.append(li);
    });
    const bg = rowBg(cc);
    const wrap = doc.createElement('div');
    wrap.className = 'jumplink-grid';
    wrap.setAttribute(JUMP_GRID, bg);
    wrap.append(ul, styleMarker(doc, bg ? `${bg}, jump-links` : 'jump-links'));
    cc.replaceWith(wrap);
    // inside a wrapper (how-to-hub/articles: the whole body is one container) the content after
    // the list starts a new section, so it does not take the panel and jump-link styles
    const page = pageGrid(element);
    if (wrap.parentElement !== page) {
      // the break goes at the first level (up to the page grid) where content follows: the list
      // may close a nested container (how-to-ship-a-bike: [title panel + list] is a container
      // inside the container that goes on with "Shipping a bike")
      const sibling = (el, dir) => {
        let s = el[dir];
        while (s && !hasContent(s)) s = s[dir];
        return s;
      };
      const breakAt = (el, dir) => {
        let at = el;
        while (at.parentElement && at.parentElement !== page && !sibling(at, dir)) at = at.parentElement;
        const s = sibling(at, dir);
        if (!s || s.matches('hr')) return;
        if (dir === 'nextElementSibling') at.after(doc.createElement('hr'));
        else at.before(doc.createElement('hr'));
      };
      breakAt(wrap, 'nextElementSibling');
      // ... and the list (with the title panel above it, "Learn how to ship:") starts one
      const prev = sibling(wrap, 'previousElementSibling');
      breakAt(prev && textPanel(prev) && rowBg(prev) === bg ? prev : wrap, 'previousElementSibling');
    }
  });
}

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
    const panelPair = prev && textPanel(prev) && ((jumpPanel(child) && rowBg(prev) === rowBg(child))
      || (child.hasAttribute(JUMP_GRID) && rowBg(prev) === child.getAttribute(JUMP_GRID)));
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
  // a title-only hero (no image: how-to-hub/articles "Take the wheel with FedEx how-to guides",
  // centred h1 and centred intro below it) -> its section is center-intro too
  element.querySelectorAll('.root .hero_landingpage_v1').forEach((hero) => {
    const h1 = hero.querySelector('h1[data-desktop-align="center"]');
    if (h1 && !hero.querySelector('img') && clean(hero.textContent) === clean(h1.textContent)) {
      hero.after(styleMarker(doc, 'center-intro'));
    }
  });
  // titles: title_v1 components with a centred heading, and richtexts that hold only a heading in
  // a centred box (schedule-manage-pickups "Simplify shipping with FedEx pickup options")
  const centredTitle = (comp) => {
    const h = comp.querySelector('h1, h2, h3, h4, h5, h6');
    if (!h || h.tagName === 'H1') return false;
    if (comp.matches('.title_v1')) return h.classList.contains('cc-aem-u-align--center@small');
    const box = comp.querySelector('.cc-aem-c-richtext');
    return !!box && box.classList.contains('cc-aem-u-align--center@small') && clean(comp.textContent) === clean(h.textContent);
  };
  element.querySelectorAll('.root .title_v1, .root .richtext').forEach((title) => {
    if (!centredTitle(title)) return;
    if (title.closest('.column_control_v1, .accordion_selector, .tabs_v1, .featured_offer_v2, .hero_landingpage_v1, .experiencefragment, .fxg-desktop--hide')) return;
    // only a title that opens its section: no content between the previous break and it. A notice
    // box (div.notifications) does not count: it stands on its own (schedule-manage-pickups: the
    // LTL notice above "Simplify shipping with FedEx pickup options")
    const content = (el) => {
      if (!hasContent(el)) return false;
      if (el.matches('.notifications')) return false;
      const rest = el.cloneNode(true);
      rest.querySelectorAll('.notifications').forEach((n) => n.remove());
      return hasContent(rest);
    };
    let prev = title.previousElementSibling;
    while (prev && !prev.matches('hr') && !content(prev)) prev = prev.previousElementSibling;
    let opens = !prev || prev.matches('hr');
    if (!prev) {
      // first in its wrapper: the wrapper must open the section (an <hr> or nothing before it)
      let wrap = title.parentElement;
      while (wrap && wrap.previousElementSibling === null && !wrap.matches('.root > .aem-Grid')) wrap = wrap.parentElement;
      let before = wrap && wrap.previousElementSibling;
      while (before && !before.matches('hr') && !content(before)) before = before.previousElementSibling;
      opens = !before || before.matches('hr');
    }
    if (!opens) return;
    // the section's own text is centred too, after its blocks as well (schedule-manage-pickups: "It's
    // easy to get your shipment moving…" below the pickup options): `center` for the whole section
    const texts = [];
    for (let next = title.nextElementSibling; next && !next.matches('hr'); next = next.nextElementSibling) {
      if (next.matches('.richtext:not([data-fedex-arrow-link])') && clean(next.textContent)) texts.push(next);
    }
    const centred = (rt) => !!rt.querySelector('[class*="align--center@small"]');
    const style = texts.length && texts.every(centred) ? 'center' : 'center-intro';
    title.after(styleMarker(doc, style));
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
      if (bg === 'light' && BLUE.test(rowColor(cc))) styles.push('blue');
      else if (bg) styles.push(bg);
      // a row of the page grid itself spans the page: its grey panel runs edge to edge
      if (bg === 'light' && !styles.includes('blue')) styles.push('full-width');
      const links = [...grid.querySelectorAll('a[href]')];
      if (links.length && links.every((a) => a.getAttribute('href').startsWith('#'))) {
        styles.push('jump-links');
        // links laid out in three columns (freight-services) -> three-columns modifier
        const inner = grid.querySelector(':scope > .column_control_v1');
        if (inner && visibleCols(inner).filter(hasContent).length >= 3) styles.push('three-columns');
      }
    }
    const nodes = [...grid.childNodes];
    if (!top) {
      cc.replaceWith(...nodes);
      return;
    }
    // A top-level panel holding several topics (ship-to-europe: the de-minimis banner, then
    // "Meer manieren om in Europa te leveren") gets a break before each further H2 title, as a
    // wrapper does; every part keeps the panel's look.
    const out = [];
    let seen = false;
    nodes.forEach((n) => {
      if (n.nodeType === 1 && hasContent(n)) {
        if (seen && isTopicTitle(n)) {
          if (styles.length) out.push(styleMarker(doc, styles.join(', ')));
          out.push(doc.createElement('hr'));
        }
        seen = true;
      }
      out.push(n);
    });
    if (styles.length) out.push(styleMarker(doc, styles.join(', ')));
    cc.replaceWith(...out);
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

// An accordion without a title (an empty button label) is shown open on fedex.com and works as a
// plain wrapper (en-us how-to-ship-guitars / tv-monitor step 4 "Or pack and ship without visiting
// a FedEx Office location": the packing steps). Its items' components replace it, so they are
// imported like the content around them instead of as an untitled accordion (which is dropped).
function unwrapUntitledAccordions(element) {
  element.querySelectorAll('.root div.accordion_selector').forEach((acc) => {
    if (!acc.isConnected) return;
    const labels = [...acc.querySelectorAll(':scope > .cc-aem-c-accordion > .cc-aem-c-accordion__button')];
    if (!labels.length || labels.some((b) => clean(b.textContent))) return;
    const parts = [...acc.querySelectorAll(':scope > .cc-aem-c-accordion > .cc-aem-c-accordion__item')]
      .flatMap((item) => {
        const grid = item.querySelector(':scope > .aem-Grid');
        return grid ? [...grid.children] : [...item.children];
      });
    acc.replaceWith(...parts);
  });
}

// FAQ layout (en-us customer-support/faqs/*): a column control [col-sm-4 FAQ navigation (tagged
// pages navigation / content navigation experience fragments) | col-sm-8 content]. The content
// stays in place; the "Did this information help you?" survey is dropped (a placeholder on the
// source: "Placement only & does not work"); the navigation follows the content as a section of
// its own with style `faq-navigation` (styles.css lays it out as the left sidebar from 768px, as
// the nl-nl FAQ pages imported by transformers/fedex-faq.js).
const FAQ_NAV = '.fxg-taggedpages--navigation, .js-taggedpages-faq-navigation, .content_navigation';

function convertFaqLayout(element, doc) {
  element.querySelectorAll('.root .column_control_v1').forEach((cc) => {
    if (!cc.isConnected || cc.parentElement.closest('.column_control_v1')) return;
    const cols = visibleCols(cc);
    if (cols.length !== 2 || !cols[0].querySelector(FAQ_NAV)) return;
    const [side, content] = cols.map(colGrid);
    if (!side || !content) return;
    [...content.children].forEach((comp) => {
      if (/^Did this information help you\?/i.test(clean(comp.textContent))) comp.remove();
    });
    // a title-only hero before the layout (the FAQ start page: h1 + intro) spans the page above the
    // sidebar and content (style faq-title)
    const hero = [...element.querySelectorAll('.root .hero_landingpage_v1')]
      .find((h) => (h.compareDocumentPosition(cc) & 4) && h.querySelector('h1') && !h.querySelector('img'));
    if (hero) hero.after(styleMarker(doc, 'faq-title'));
    const nav = doc.createElement('div');
    nav.className = 'faq-sidebar';
    nav.append(...side.children, styleMarker(doc, 'faq-navigation'));
    cc.replaceWith(...content.children, doc.createElement('hr'), nav);
  });
}

// AEM adaptive forms (en-us accessibility "Our commitment to your feedback"): div.aemform holds a
// JSON config naming the form ("formPath": ".../aaf/us/accessibility-feedback.en-us.html"); the
// form itself is rendered by script. markAdaptiveForms (called from the import script's preprocess
// hook, before cleanup drops scripts) replaces the component with a marker naming the Edge Delivery
// form definition, /{locale}/forms/{name}.json (made with the forms migration tooling, uploaded as
// a sheet); afterTransform turns the marker into a Form block linking it (a block made before the
// parsers would be read as a data table).
const FORM_MARKER = 'data-fedex-form';

// Classic AEM forms (form.fxg-forms in div.start, server-rendered: en-us charters
// "request-a-quote", dropbox "maintenance-request") have no form name: the definition is named after
// the page's last two path segments (charters-request-a-quote). Its section titles become the
// definition's fieldset legends; rich text inside the form stays on the page, before the block.
// Only forms whose definition is uploaded (/{locale}/forms/{name}.json) are converted: the same
// wrapper holds other content too (nl-nl packaging/supplies: a product catalogue). Add the name
// here after uploading its definition; `<locale>:<name>` converts it in that locale only.
const CLASSIC_FORMS = new Set([
  'charters-request-a-quote', 'dropbox-maintenance-request', 'advanced-quote',
  'shipping-high-value-jewelry-declared-value-form', 'shipping-last-minute-rates',
  'customer-support-write-to-fedex', 'en-to:packaging-supplies',
]);
// Forms whose definition holds all their content, catalogue and section titles included (en-to
// packaging-supplies: a photo, title and quantity per product, then "Where shall we deliver the
// supplies?"): nothing of the form stays on the page
const SELF_CONTAINED_FORMS = new Set(['packaging-supplies']);
// Conditional forms (en-to ancillary-clearance-service "Select Country/Territory"): a dropdown whose
// options load a component-library page each (/content/fedex-com/component-library/ancillary/
// en_us/au.html: that country's fee table). The options live in a JSON config script, which cleanup
// drops: markConditionalForms (preprocess) copies it onto the component (data-fedex-options) for
// parsers/content-select.js.
export const CONDITIONAL_OPTIONS = 'data-fedex-options';
export function markConditionalForms(document) {
  document.querySelectorAll('.root div.conditionalform').forEach((comp) => {
    const config = comp.querySelector('script[data-config="js-conditional-form-config"]');
    const form = comp.querySelector('.js-conditional-form');
    try {
      const { formJson } = JSON.parse(config.textContent);
      comp.setAttribute(CONDITIONAL_OPTIONS, JSON.stringify({
        label: (form && (form.dataset.label || form.dataset.choose)) || '',
        options: formJson.map((o) => ({ label: o.label, data: o.data || {} })),
      }));
    } catch (e) {
      // no readable config: the component stays as it is
    }
  });
}

function formNameFromUrl(url) {
  try {
    return new URL(url).pathname.replace(/\.html$/, '').split('/').filter(Boolean).slice(-2).join('-').toLowerCase();
  } catch (e) {
    return null;
  }
}

export function markAdaptiveForms(document, url) {
  const classicName = formNameFromUrl(url);
  let locale = '';
  try {
    [locale] = new URL(url).pathname.split('/').filter(Boolean);
  } catch (e) {
    locale = '';
  }
  document.querySelectorAll('.root form.fxg-forms').forEach((form, i) => {
    if (!classicName || !(CLASSIC_FORMS.has(classicName) || CLASSIC_FORMS.has(`${locale}:${classicName}`))) return;
    const name = i ? `${classicName}-${i + 1}` : classicName;
    const marker = document.createElement('p');
    marker.setAttribute(FORM_MARKER, name);
    marker.textContent = `form ${name}`;
    const texts = SELF_CONTAINED_FORMS.has(classicName) ? []
      : [...form.querySelectorAll('.richtext')].filter((r) => clean(r.textContent));
    form.replaceWith(...texts, marker);
  });
  document.querySelectorAll('.root div.aemform').forEach((comp) => {
    let name = null;
    const config = comp.querySelector('script[data-config="js-adaptiveform-config"]');
    try {
      const formPath = config && JSON.parse(config.textContent).formPath;
      name = formPath && new URL(formPath, 'https://www.fedex.com/').pathname.split('/').pop().split('.')[0];
    } catch (e) {
      name = null;
    }
    if (!name) return;
    const marker = document.createElement('p');
    marker.setAttribute(FORM_MARKER, name);
    marker.textContent = `form ${name}`;
    comp.replaceWith(marker);
  });
}

function createFormBlocks(element, doc, locale) {
  element.querySelectorAll(`[${FORM_MARKER}]`).forEach((marker) => {
    const href = `/${locale}/forms/${marker.getAttribute(FORM_MARKER)}.json`;
    const a = doc.createElement('a');
    a.setAttribute('href', href);
    a.textContent = href;
    marker.replaceWith(WebImporter.Blocks.createBlock(doc, { name: 'Form', cells: [[a]] }));
  });
}

function stripForms(element) {
  element.querySelectorAll('.root form').forEach((form) => {
    // field error messages ("Error:") and script-drawn field icons (data: images: en-to
    // packaging/supplies) go with the fields
    form.querySelectorAll('.cc-aem-c-form__message, img[src^="data:"]').forEach((el) => el.remove());
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
  const h1s = [...root.querySelectorAll('h1')].filter((h) => !h.closest('.fxg-desktop--hide'));
  // one h1 per page: later h1s (en-us how-to-ship-guitars "Steps for how to ship a guitar") -> h2
  h1s.slice(1).forEach((h) => {
    const h2 = doc.createElement('h2');
    h2.innerHTML = h.innerHTML;
    [...h.attributes].forEach((a) => h2.setAttribute(a.name, a.value));
    h.replaceWith(h2);
  });
  if (h1s.length) return;
  // a page title outside .root (en-to sitemap "Sitemap", eco-friendly-marketing-ideas: an h1 above
  // the page grid) is the page's h1 already
  if ([...element.querySelectorAll('h1')].some((h) => !h.closest('.fxg-desktop--hide'))) return;
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
    // block cells and list items mixing inline text with blocks: one paragraph per inline run
    // (international-priority-express "Aflevering op de volgende werkdag<sup>2</sup>: <ul>")
    // (only where a footnote mark sits among them: that is what the converter splits apart)
    element.querySelectorAll('li, td, th, div[class] > div > div')
      .forEach((el) => { if (el.querySelector(':scope > sup')) wrapInlineRuns(el, doc); });
    createSectionMetadata(element, doc);
    const original = payload && payload.params && payload.params.originalURL;
    createFormBlocks(element, doc, original ? new URL(original).pathname.split('/')[1] : 'en-us');
    removeEmptySections(element);
    return;
  }
  if (hookName !== 'beforeTransform') return;
  removeHiddenContent(element);
  unwrapUntitledAccordions(element);
  convertFaqLayout(element, doc);
  stripForms(element);
  promoteFirstHeading(element, doc);
  mergeSplitRows(element);
  alignColumnGrids(element);
  flattenIndentRows(element);
  attachIconRowsToTitles(element);
  convertJumpLinkGrids(element, doc);
  insertSectionBreaks(element, doc);
  // after the panels are unwrapped: a centred title inside a panel opens its section too
  unwrapCenteredPanels(element, doc);
  inlineArrowLinks(element, doc);
  markCenteredIntros(element, doc);
  convertJumpLinks(element, doc);
  tagShapes(element);
}
