/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: FedEx site-wide cleanup.
 * Selectors verified against the captured DOM of:
 *   - https://www.fedex.com/en-us/home.html            (migration-work/home/cleaned.html)
 *   - https://www.fedex.com/en-us/shipping/international.html (migration-work/cleaned.html,
 *     collapsed copy migration-work/intl-slim.html, raw tools/importer/bd-snapshots/...)
 *
 * ORDERING CONSTRAINT (important):
 * Block/section selectors in page-templates.json are positional (home: div:nth-of-type(N)) or
 * adjacency based (hub-landing: `+`, `~`, `:has(+ ...)`). Removing any content element before
 * the parsers run would shift those and make parsers/sections match the wrong element.
 * Additionally, AFTER parsing, parsed <div>s have been replaced by <table> blocks.
 * Therefore:
 *   - beforeTransform: only MARK mobile duplicates (while positions are still the original
 *     ones), fix page metadata in <head>, prepare jump-link targets, and remove overlays/widgets
 *     that live outside the content grid.
 *   - afterTransform: remove the marked duplicates, spacers and the global chrome, then
 *     rewrite jump links and www.fedex.com page links, and map CTA classes.
 *
 * FROZEN TEMPLATES: the homepage import (template `home`, tools/importer/import-home.js) must keep
 * producing identical output. Rules added for the landing pages that could touch homepage content
 * are skipped for templates listed in FROZEN_TEMPLATES; the home-only positional rules run only
 * for `home` (they would match unrelated elements on other pages).
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

const FROZEN_TEMPLATES = ['home'];

// Content grid inside the homepage experience fragments (found in cleaned.html under div#container-de6016ba4d)
const CONTENT_GRID = 'div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid';

// HOME ONLY - mobile-only duplicates (children carry fxg-desktop--hide / fxg-tablet--hide):
//  - nth-of-type(5): mobile icon links (duplicate of div.advanced_table_v1 which is fxg-mobile--hide)
//  - nth-of-type(17): mobile/tablet "Go global" promo (duplicate of div.featured_offer_v2)
const HOME_MOBILE_DUPLICATES = [
  `${CONTENT_GRID} > div.column_control_v1:nth-of-type(5)`,
  `${CONTENT_GRID} > div.column_control_v1:nth-of-type(17)`,
];
const DUPLICATE_MARKER = 'data-fedex-mobile-duplicate';

// Jump-link target marker (set in beforeTransform on the heading that owns the source id)
const ANCHOR_MARKER = 'data-fedex-anchor';
const ANCHOR_TEXT_ATTR = 'data-fedex-anchor-text';

// Hidden configuration inputs (found in cleaned.html; type attributes were stripped by the scraper)
const HIDDEN_INPUT_IDS = [
  'supportedLocales', 'app-base', 'dataAnalytics', 'dataAnalyticsTrackModule', 'footerIconRtl',
  'fxg-externalIconPath', 'fxg-search-coveoAnalyticsApiUrl', 'fxg-search-coveoSearchApiKey',
  'fxg-search-coveoSearchHub', 'fxg-search-coveoSuggestionsApiUrl', 'fxg-search-url',
  'fxg-track-url', 'header-new-structure', 'justifyRteRtl', 'openInNewWindowLoc',
  'trackPlaceholder', 'trackURL', 'wlgn-secure-link',
];

// Values of the FedEx 404 page that leak into <head> behind bot protection
// (raw snapshot: <title>FedEx Page Not Found</title>, description "You have reached a page that is
// currently not available on fedex.com.", og:url https://www.fedex.com/en-us/errors/404.html).
// es-us 404 (freight / manage-account scrape): "Pagina no encontrada",
// "Ha alcanzado la página actualmente no disponible en fedex.com.", og:url .../es-us/errors/404.html
const NOT_FOUND_RE = /page not found|currently not available on fedex\.com|p[aá]gina no encontrada|actualmente no disponible en fedex\.com|\/errors\/404/i;

// <head> meta keys read by WebImporter.rules.createMetadata (Blocks.getMetadata joins duplicates with ", ")
const METADATA_KEYS = [
  'description', 'og:title', 'og:description', 'og:image', 'og:image:alt',
  'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt',
];

const IMAGE_META = ['og:image', 'twitter:image', 'og:twitter_image']
  .map((k) => `meta[property="${k}"], meta[name="${k}"]`).join(', ');
const NON_PUBLIC_HOST_RE = /^(localhost|127\.0\.0\.1|wwwtest\.fedex\.com)$/i;

// Links to .html pages on this host become internal links without the extension
// (https://www.fedex.com/en-us/shipping/returns.html -> /en-us/shipping/returns).
const INTERNAL_LINK_HOST = 'www.fedex.com';

// Login-state-only / hidden furniture inside the content (verified live and in migration-work/cleaned.html, claims):
//  - div.link.fxg-auth-button-link.cc-aem-u-display--none  ("Start a claim", "File batch claims", ... logged-in only)
//  - a.fxg-featured-button.hidden                          (placeholder "Link" -> /#)
//  - div.secureContainer_v1 > div.fxg-loginContainer        (empty logged-in app container)
// Marked in beforeTransform and removed in afterTransform (same reason as mobile duplicates).
const LOGIN_ONLY = ['div.fxg-auth-button-link', 'a.fxg-featured-button.hidden', 'div.secureContainer_v1'];

// Body-level widget leftovers (live DOM: direct children of <body>)
const BODY_FURNITURE = [
  ':scope > div.playkit-context-menu', // Kaltura player context menus
  ':scope > div.pub_300x250', // ad-blocker bait
  ':scope > div.cdk-live-announcer-element', // Angular a11y live region (chat widget)
];

// Billing: the jump-links panel ("Find billing tools and guidance:") is authored INSIDE the hero component
// (live: .hero_landingpage_v1 > .aem-Grid > .column_control_v1:has(> .row.fxg-row--has-bgcolor a[href^="#"])).
// Move it right after the hero, inside a `div.hero_landingpage_v1.fedex-hero-extracted` wrapper so that
//  - the hero-landing parser (.hero_landingpage_v1:has(.fxg-landing-hero h1)) no longer swallows it,
//  - banner-landing S9 (`.root .hero_landingpage_v1 .column_control_v1:has(...)`) still matches it, and
//  - block selectors keep excluding it (`:not(.hero_landingpage_v1 *)`), so it stays default content.
function extractHeroJumpLinks(element, doc) {
  element.querySelectorAll('.root .hero_landingpage_v1:not(.fedex-hero-extracted)').forEach((hero) => {
    const panels = [...hero.querySelectorAll(':scope > .aem-Grid > .column_control_v1')]
      .filter((cc) => cc.querySelector(':scope > .row.fxg-row--has-bgcolor a[href^="#"]'));
    if (!panels.length) return;
    const wrapper = doc.createElement('div');
    wrapper.className = 'hero_landingpage_v1 fedex-hero-extracted';
    panels.forEach((p) => wrapper.append(p));
    hero.after(wrapper);
  });
}

// blob: object URLs (live claims: <img src="blob:null/..."> before the hero) can never be imported.
// Remove the image and any wrapper (picture/p/span/a/div) left without content.
function removeBlobImages(element) {
  element.querySelectorAll('img[src^="blob:"]').forEach((img) => {
    let node = img;
    let parent = node.parentElement;
    node.remove();
    while (parent && parent !== element && parent.matches('picture, p, span, a, div')
      && !parent.textContent.trim() && !parent.querySelector('img, picture, video, iframe, table, hr')) {
      node = parent;
      parent = node.parentElement;
      node.remove();
    }
  });
}

/**
 * Checklist rows -> one <ul> (sections whose template style includes `checklist`).
 * Source (claims "Streamline the claims process with supporting documents", migration-work/cleaned.html):
 *   div.column_control_v1 > div.row > div.fxg-col.col-sm-2 (image_v2 only: Purple_Checkmark_Icon_-_Small)
 *                                  + div.fxg-col.col-sm-10 (richtext only: text, optional "•" sub-item paragraphs)
 * consecutive rows separated by div.spacer. The checklist section style draws the checkmarks from a plain ul.
 * Runs in beforeTransform (rows are default content; no block selector targets them).
 */
const CHECK_ICON_RE = /checkmark|check[-_ ]?mark|checklist|tick/i;

function getChecklistRowParts(cc) {
  if (!cc.matches('div.column_control_v1')) return null;
  const row = cc.querySelector(':scope > .row');
  if (!row || row.matches('.fxg-row--has-bgcolor')) return null;
  const cols = [...row.querySelectorAll(':scope > .fxg-col')].filter((c) => !c.matches('.fxg-desktop--hide'));
  if (cols.length !== 2) return null;
  const [iconCol, textCol] = cols;
  const iconItems = [...iconCol.querySelectorAll(':scope > div > .aem-Grid > *')].filter((c) => !c.matches('.spacer'));
  const textItems = [...textCol.querySelectorAll(':scope > div > .aem-Grid > *')].filter((c) => !c.matches('.spacer'));
  if (!iconItems.length || !iconItems.every((c) => c.matches('.image_v2'))) return null;
  if (!textItems.length || !textItems.every((c) => c.matches('.richtext'))) return null;
  if (cleanText(iconCol)) return null; // icon-only column
  const imgs = [...iconCol.querySelectorAll('img')];
  const isCheckIcon = imgs.some((img) => CHECK_ICON_RE.test(img.getAttribute('src') || '') || CHECK_ICON_RE.test(img.getAttribute('alt') || ''));
  const isNarrowIcon = iconCol.matches('.col-sm-1, .col-sm-2');
  if (!isCheckIcon && !isNarrowIcon) return null;
  return { textItems };
}

function buildChecklistItem(doc, textItems) {
  const li = doc.createElement('li');
  let nested = null;
  textItems.forEach((rt) => {
    const rich = [...rt.querySelectorAll('.cc-aem-c-richtext')].find((r) => !r.matches('.fxg-desktop--hide')) || rt;
    [...rich.children].forEach((child) => {
      if (child.matches('ul, ol')) {
        li.append(child.cloneNode(true));
        return;
      }
      if (!child.matches('p') || !cleanText(child)) return;
      const html = child.innerHTML;
      if (/^\s*[•·▪◦‣-](\s|&nbsp;| )*/.test(child.textContent)) {
        if (!nested) {
          nested = doc.createElement('ul');
          li.append(nested);
        }
        const sub = doc.createElement('li');
        sub.innerHTML = html.replace(/^\s*[•·▪◦‣-](\s|&nbsp;| )*/, '');
        nested.append(sub);
      } else if (!li.childNodes.length) {
        li.innerHTML = html;
      } else {
        const p = doc.createElement('p');
        p.innerHTML = html;
        li.append(p);
      }
    });
  });
  return li;
}

function convertChecklists(element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];
  const doc = (payload && payload.document) || element.ownerDocument;
  const first = (sels) => {
    for (const sel of (Array.isArray(sels) ? sels : [sels])) {
      try {
        const el = sel && element.querySelector(sel);
        if (el) return el;
      } catch (e) { /* invalid selector - ignore */ }
    }
    return null;
  };
  const styleList = (s) => (Array.isArray(s) ? s : String(s || '').split(',')).map((x) => String(x).trim());
  const starts = sections.map((s) => first(s.selector));
  sections.forEach((section, i) => {
    if (!styleList(section.style).includes('checklist') || !starts[i]) return;
    const otherStarts = new Set(starts.filter((el, j) => el && j !== i));
    let group = [];
    const flush = () => {
      if (!group.length) return;
      const ul = doc.createElement('ul');
      group.forEach(({ cc, parts }) => ul.append(buildChecklistItem(doc, parts.textItems)));
      group[0].cc.before(ul);
      group.forEach(({ cc }) => cc.remove());
      group = [];
    };
    // Walk the section's following siblings until the next section starts
    for (let n = starts[i].nextElementSibling; n && !otherStarts.has(n); ) {
      const next = n.nextElementSibling;
      const parts = getChecklistRowParts(n);
      if (parts) group.push({ cc: n, parts });
      else if (!n.matches('div.spacer')) flush();
      n = next;
    }
    flush();
  });
}

const cleanText = (el) => {
  if (!el) return '';
  const clone = el.cloneNode(true);
  clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
  return clone.textContent.replace(/\s+/g, ' ').trim();
};

const metaSelector = (key) => (key.includes(':') ? `meta[property="${key}"]` : `meta[name="${key}"]`);

// Landing hero copy (verified: .hero_landingpage_v1 .fxg-landing-hero h1 / .fxg-subtext p)
function getHeroText(root, what) {
  const hero = root.querySelector('.hero_landingpage_v1 .fxg-landing-hero, .hero_landingpage_v1, .fxg-hero');
  if (!hero) return '';
  if (what === 'title') return cleanText(hero.querySelector('h1'));
  const paras = [...hero.querySelectorAll('.fxg-subtext p, p')]
    .filter((p) => !p.closest('.fxg-desktop--hide'));
  const p = paras.find((el) => cleanText(el));
  return cleanText(p);
}

/**
 * Page metadata: behind bot protection the page carries the 404 page's <title>/description/og/robots
 * (in <head> after the real ones, and a parsed 404 document inside div#sprite-wrapper).
 * Fix <head> so createMetadata emits the real values. Only acts when a 404 signature is found,
 * so pages with correct tags (e.g. the live Playwright DOM, or the homepage) are left unchanged,
 * except that robots noindex and a 404 og:url are never kept.
 */
function fixPageMetadata(element, payload) {
  const doc = (payload && payload.document) || element.ownerDocument;
  const head = doc && doc.head;
  if (!head) return;

  head.querySelectorAll('meta[name="robots"]').forEach((m) => {
    if (/noindex/i.test(m.getAttribute('content') || '')) m.remove();
  });
  head.querySelectorAll('meta[property="og:url"], meta[name="og:url"]').forEach((m) => {
    if (/\/errors\/404/i.test(m.getAttribute('content') || '')) m.remove();
  });
  // Descriptions authored with hard line breaks (freight: "...get packing\ntips, and calculate rates.")
  // would carry the newline into the Metadata block; collapse them (single-line values are untouched).
  head.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[property="twitter:description"]').forEach((m) => {
    const v = m.getAttribute('content') || '';
    if (/[\r\n\t]/.test(v)) m.setAttribute('content', v.replace(/\s+/g, ' ').trim());
  });
  // Share images on non-public authoring hosts (live claims/billing/drop-off:
  // og:image=https://localhost:8080/content/dam/fedex-com/logos/FedEx-Logo.png; 404 set: wwwtest.fedex.com).
  // Rewrite DAM paths to www.fedex.com, drop anything else.
  head.querySelectorAll(IMAGE_META).forEach((m) => {
    let u;
    try {
      u = new URL(m.getAttribute('content') || '', 'https://www.fedex.com');
    } catch (e) {
      m.remove();
      return;
    }
    if (!NON_PUBLIC_HOST_RE.test(u.hostname)) return;
    if (/^\/content\/dam\//.test(u.pathname)) m.setAttribute('content', `https://www.fedex.com${u.pathname}${u.search}`);
    else m.remove();
  });

  const titles = [...head.querySelectorAll('title')];
  const notFound = titles.some((t) => NOT_FOUND_RE.test(t.textContent))
    || [...head.querySelectorAll('meta[content]')].some((m) => NOT_FOUND_RE.test(m.getAttribute('content')));
  // No usable <title> in <head>: createMetadata would fall back to the first <title> in the body
  // (the 404 copy inside div#sprite-wrapper, which is removed below), so derive one as well.
  const missingTitle = !titles.some((t) => t.textContent.trim());
  if (!notFound && !missingTitle) return;

  // 1. Drop every 404-valued tag, then keep only the first occurrence of each createMetadata key
  //    (the real page's tags come first in <head>; the 404 set is appended later).
  head.querySelectorAll('meta[content]').forEach((m) => {
    if (NOT_FOUND_RE.test(m.getAttribute('content'))) m.remove();
  });
  METADATA_KEYS.forEach((key) => {
    const metas = [...head.querySelectorAll(metaSelector(key))];
    metas.slice(1).forEach((m) => m.remove());
    const [first] = metas;
    if (first && /image/.test(key)) {
      // 404 set points at the test host (https://wwwtest.fedex.com/content/dam/...)
      first.setAttribute('content', first.getAttribute('content').replace('//wwwtest.fedex.com/', '//www.fedex.com/'));
    }
  });

  // 2. Title: real <title> -> real og:title -> AEM page title on Kaltura players -> hero H1
  const mavice = element.querySelector('[data-mavice-kp-aempagetitle]');
  const candidates = [
    ...titles.map((t) => t.textContent.replace(/\s+/g, ' ').trim()),
    (head.querySelector('meta[property="og:title"]') || { getAttribute: () => '' }).getAttribute('content'),
    mavice ? mavice.getAttribute('data-mavice-kp-aempagetitle') : '',
    getHeroText(element, 'title') ? `${getHeroText(element, 'title')} | FedEx` : '',
  ].map((t) => (t || '').trim());
  const title = candidates.find((t) => t && !NOT_FOUND_RE.test(t));
  titles.forEach((t) => t.remove());
  if (title) {
    const t = doc.createElement('title');
    t.textContent = title;
    head.prepend(t);
  }

  // 3. Description: real meta[name=description] if still present, else the hero copy
  const desc = head.querySelector('meta[name="description"]');
  if (!desc || !(desc.getAttribute('content') || '').trim()) {
    const heroText = getHeroText(element, 'description');
    if (heroText) {
      if (desc) desc.remove();
      const m = doc.createElement('meta');
      m.setAttribute('name', 'description');
      m.setAttribute('content', heroText);
      head.append(m);
    }
  }
}

// EDS heading ids (helix pipeline uses github-slugger): lowercase, strip punctuation, spaces -> "-",
// repeated slugs get "-1", "-2", ...
function createSlugger() {
  const seen = {};
  return (text) => {
    const base = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
    let slug = base;
    if (Object.prototype.hasOwnProperty.call(seen, base)) {
      seen[base] += 1;
      slug = `${base}-${seen[base]}`;
    } else {
      seen[base] = 0;
    }
    seen[slug] = seen[slug] || 0;
    return slug;
  };
}

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

// beforeTransform: mark the heading that owns each in-page link target (first heading with the id,
// in document order; e.g. h2#compare, not the later h3#compare inside a card).
function markJumpLinkTargets(element) {
  const ids = new Set();
  element.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    if (id) ids.add(id);
  });
  const headings = [...element.querySelectorAll(HEADINGS)];
  ids.forEach((id) => {
    // Exact (case-sensitive) id first (#BatchClaim -> h2#BatchClaim); case-insensitive only as a fallback
    const h = headings.find((el) => el.id === id)
      || headings.find((el) => el.id && el.id.toLowerCase() === id.toLowerCase());
    if (!h) return;
    if (!h.hasAttribute(ANCHOR_MARKER)) h.setAttribute(ANCHOR_MARKER, id);
    // Remember the target text on the links: if the target heading is a hidden duplicate that gets
    // removed (billing: #explore / #explore-solutions share "Explore FedEx billing solutions"),
    // afterTransform can still resolve the link to the visible heading with the same text.
    const text = cleanText(h);
    element.querySelectorAll('a[href^="#"]').forEach((a) => {
      if (a.getAttribute('href') === `#${id}` && text) a.setAttribute(ANCHOR_TEXT_ATTR, text);
    });
  });
}

// afterTransform (chrome and mobile duplicates already removed): slug the remaining headings in
// document order and point href="#x" at the slug of the heading whose source id was x.
function rewriteJumpLinks(element) {
  const slugger = createSlugger();
  const byId = {};
  const byText = {};
  element.querySelectorAll(HEADINGS).forEach((h) => {
    const text = cleanText(h);
    if (!text) return;
    const slug = slugger(text);
    const id = h.getAttribute(ANCHOR_MARKER) || h.id;
    if (id && !byId[id]) byId[id] = slug;
    if (!byText[text]) byText[text] = slug;
  });
  element.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    const slug = (id && byId[id]) || byText[a.getAttribute(ANCHOR_TEXT_ATTR) || ''];
    if (id && slug) a.setAttribute('href', `#${slug}`);
  });
  element.querySelectorAll(`[${ANCHOR_MARKER}]`).forEach((h) => h.removeAttribute(ANCHOR_MARKER));
  element.querySelectorAll(`[${ANCHOR_TEXT_ATTR}]`).forEach((a) => a.removeAttribute(ANCHOR_TEXT_ATTR));
}

// afterTransform (parsers done, so block links are included): links to .html pages on www.fedex.com ->
// internal links without .html (query and hash kept). Relative source hrefs are resolved against the
// page URL first. Other hosts and non-.html paths (e.g. /fedextrack/) are left unchanged.
function rewriteInternalLinks(element, payload) {
  const base = (payload && payload.params && payload.params.originalURL) || 'https://www.fedex.com/';
  element.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href').trim();
    if (!href || href.startsWith('#')) return;
    let url;
    try {
      url = new URL(href, base);
    } catch (e) {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || url.hostname.toLowerCase() !== INTERNAL_LINK_HOST) return;
    if (!/\.html$/i.test(url.pathname)) return;
    a.setAttribute('href', `${url.pathname.replace(/\.html$/i, '')}${url.search}${url.hash}`);
  });
}

function removeSectionSubNav(element) {
  element.querySelectorAll('nav.fxg-navbar').forEach((nav) => {
    if (!nav.isConnected) return;
    const component = nav.closest('div.navbar') || nav;
    const xf = component.closest('div.experiencefragment');
    // Drop the whole experience fragment when it only wraps the sub-nav and sits outside the page body grid
    if (xf && !xf.closest('.root') && !xf.matches('.HFexperiencefragment')
      && cleanText(xf) === cleanText(component)) xf.remove();
    else component.remove();
  });
}

const CHAT_WIDGET_SELECTORS = [
  'div#chat-widget-container',
  'div.chat-widget',
  'app-chat-icon',
  'app-chat',
];
// Main content containers the fallback must never remove (verified in cleaned.html)
const MAIN_CONTENT = 'div.fxg-main-content, div.root.responsivegrid';

function removeChatWidget(element, useTextFallback) {
  CHAT_WIDGET_SELECTORS.forEach((sel) => {
    element.querySelectorAll(sel).forEach((el) => {
      const top = el.closest('div#chat-widget-container') || el;
      if (!top.matches(MAIN_CONTENT) && !top.querySelector(MAIN_CONTENT) && !top.closest(MAIN_CONTENT)) top.remove();
    });
  });
  if (!useTextFallback) return;
  // Fallback (widget markup renamed): the top-level child of <body> whose header reads
  // "Ask FedEx" + "Support Assistant", as long as it is not / does not hold the main content.
  [...element.children].forEach((child) => {
    if (child.matches(MAIN_CONTENT) || child.querySelector(MAIN_CONTENT)) return;
    const text = child.textContent || '';
    if (/Support Assistant/.test(text) && /Ask FedEx/i.test(text)) child.remove();
  });
}

const isHidden = (el) => el.matches('[hidden], [style*="display:none"], [style*="display: none"]')
  || (el.matches('.fxg-desktop--hide') && el.matches('.fxg-tablet--hide') && el.matches('.fxg-mobile--hide'));

// Inline icons next to text (drop-off-package: help-question.svg at max-width 30px before
// "If you have questions, ...") -> EDS icon token rendered from /icons/<name>.svg, instead of a
// full-width image. Only icons that exist in /icons are converted (others would 404).
const INLINE_ICONS = ['help-question'];
const INLINE_ICON_MAX_WIDTH = 48;

function convertInlineIcons(element, doc) {
  element.querySelectorAll('img[src*="/brand-icons/"]').forEach((img) => {
    const name = (img.getAttribute('src').split('?')[0].match(/([\w-]+)\.svg$/) || [])[1];
    if (!INLINE_ICONS.includes(name) || !(parseFloat(img.style.maxWidth) <= INLINE_ICON_MAX_WIDTH)) return;
    const component = img.closest('.fxg-image-component__image') || img.parentElement;
    if (!component || !cleanText(component)) return; // icon must sit inline with text
    img.replaceWith(doc.createTextNode(`:${name}:`));
  });
}

// Note: <u> around links is unwrapped in tools/importer/fedex-preprocess.js (the import scripts'
// `preprocess` hook) - helix-importer drops text next to `u > a` before transform() runs.

export default function transform(hookName, element, payload) {
  const templateName = (payload && payload.template && payload.template.name) || '';
  const isHome = templateName === 'home';
  const isFrozen = FROZEN_TEMPLATES.includes(templateName);

  if (hookName === TransformHook.beforeTransform) {
    // 0. Page metadata in <head> (self-guarded: only acts on 404 signatures / noindex / 404 og:url)
    fixPageMetadata(element, payload);

    // 1. Mark mobile duplicates while positions are still the original ones.
    //    Do NOT remove here - removal would shift positional/adjacency selectors used by parsers/sections.
    if (isHome) {
      HOME_MOBILE_DUPLICATES.forEach((sel) => {
        element.querySelectorAll(sel).forEach((el) => el.setAttribute(DUPLICATE_MARKER, 'true'));
      });
    }
    if (!isFrozen) {
      // Jump-links panel inside the hero (billing) -> sibling after the hero, before anything is marked
      extractHeroJumpLinks(element, (payload && payload.document) || element.ownerDocument);
      // Login-state-only / hidden furniture (removed in afterTransform)
      LOGIN_ONLY.forEach((sel) => {
        element.querySelectorAll(sel).forEach((el) => el.setAttribute(DUPLICATE_MARKER, 'true'));
      });
      BODY_FURNITURE.forEach((sel) => element.querySelectorAll(sel).forEach((el) => el.remove()));
      // Checkmark icon + text rows -> one <ul> in `checklist` sections
      convertChecklists(element, payload);
      // Mobile/tablet-only duplicates of desktop content (landing pages: 136 x .fxg-desktop--hide,
      // e.g. div.fxg-mobile-image, div.fxg-tablet-image, hr.fxg-hr-hide, div.fxg-col-mobile_position1)
      element.querySelectorAll('.fxg-desktop--hide').forEach((el) => el.setAttribute(DUPLICATE_MARKER, 'true'));
      // In-page link targets (h2#compare, h2#customs-documents, ...)
      markJumpLinkTargets(element);
      // Small brand icons inline with text -> :icon: tokens (before parsers see them as images)
      convertInlineIcons(element, (payload && payload.document) || element.ownerDocument);
    }

    // 2. Tracking pixels / sprite images trailing the page. Must run before their sibling
    //    anchors (aside#usercentrics-cmp-ui, div.js-geo-locator) are removed below.
    WebImporter.DOMUtils.remove(element, [
      'aside#usercentrics-cmp-ui ~ img',
      'div.js-geo-locator ~ img',
      'div.fxg-main-content > img',
      'div[id^="batBeacon"]',
    ]);

    // 3. Overlays / widgets outside the content grid (safe: none are <div> siblings in the grid).
    WebImporter.DOMUtils.remove(element, [
      // Cookie consent / CMP
      'fedex-cookie-consent',
      'aside#usercentrics-cmp-ui',
      'iframe#uc-cross-domain-consent-sharing-bridge',
      // Nuance chat "ASK FEDEX" widget
      'div#nuanMessagingFrame',
      'div#inqDivResizeCorner',
      'div#inqResizeBox',
      'div#inqTitleBar',
      // Unsupported-browser modal experience fragment (contains div#browserModal)
      'div.xfpage.page',
      // Geo locator
      'fedex-geo-locator',
      'div.js-geo-locator',
    ]);
    // Trailing page furniture found on landing pages (not present on the homepage):
    WebImporter.DOMUtils.remove(element, [
      'div#sprite-wrapper ~ fdx-icon-sprite', // "Icon sprite not found" error text after the sprite wrapper
      'div#sprite-wrapper', // parsed copy of the 404 page (parsererror + <title>FedEx Page Not Found</title>)
      'div#ZN_agz4jO87lMIUO1K', // Qualtrics website feedback snippet
    ]);

    // Section sub-nav bar under the breadcrumbs (page chrome), verified live on shipping/freight.html
    // ("Air freight shipping | Services | Resources | Support") and small-business.html ("Small Business Center"):
    //   div.fxg-main-content > div.experiencefragment > .xf-content-height > .aem-Grid > div.navbar > nav.fxg-navbar
    // (the global header uses nav.fxg-nav, not nav.fxg-navbar). Not present on the homepage.
    removeSectionSubNav(element);

    // "Ask FedEx / Support Assistant" chat widget, injected late by /dsmgjs/dsm-global.bundle.js
    // (live DOM only, not in the snapshots). Verified live on shipping/packing.html:
    //   body > div#chat-widget-container > div.chat-widget.fedex > app-chat-icon > div.chat-window > app-chat
    // (light DOM, no shadow root/iframe, outside div.fxg-main-content). Not present in the homepage output.
    removeChatWidget(element, !isFrozen);

    if (!isFrozen) {
      // Global tracking module (header "Tracking" dropdown: div.tracking_module_v1 > form#HeaderTrackingModule).
      // The homepage hero keeps its tracking app (inside .fxg-app-container).
      element.querySelectorAll('div.tracking_module_v1').forEach((el) => {
        if (!el.closest('.fxg-app-container')) el.remove();
      });
    }

    // 4. Hidden inputs (not <div>s, so removal does not affect :nth-of-type div indices)
    element.querySelectorAll('input[type="hidden"]').forEach((el) => el.remove());
    HIDDEN_INPUT_IDS.forEach((id) => {
      element.querySelectorAll(`input[id="${id}"]`).forEach((el) => el.remove());
    });
  }

  if (hookName === TransformHook.afterTransform) {
    // 1. Mobile duplicates marked in beforeTransform (positional selectors are no longer reliable here)
    element.querySelectorAll(`[${DUPLICATE_MARKER}]`).forEach((el) => el.remove());

    // 2. Spacers inside the content grids
    WebImporter.DOMUtils.remove(element, [`${CONTENT_GRID} > div.spacer`]);
    if (!isFrozen) {
      // Anchors without a destination (drop-off-package: <a data-analytics="img|Question Mark Icon"><img></a>)
      // -> keep only their content; html2md would emit an empty link (<a href="">) around the image.
      element.querySelectorAll('a:not([href]), a[href=""]').forEach((a) => a.replaceWith(...a.childNodes));
      // Landing pages: spacers live in .cmp-container grids (div.spacer > div.fxg-spacer)
      element.querySelectorAll('div.spacer').forEach((el) => {
        if (!el.textContent.trim() && !el.querySelector('img, picture, video, iframe, table')) el.remove();
      });
      // Divider components (returns: div.hr_v1 > div.hr_v1 > hr around the jump links). Their <hr> would
      // become an extra, empty section next to the template's section break.
      element.querySelectorAll('div.hr_v1').forEach((el) => {
        if (el.isConnected && !el.closest('table') && !el.textContent.trim()
          && !el.querySelector('img, picture, video, iframe, table, a')) el.remove();
      });
      // Adjacent one-item lists in default content (returns "How do I schedule a pickup ...": the editor
      // saved <ul><li/></ul><ul><li/></ul>) -> one list; html2md would otherwise emit two lists.
      element.querySelectorAll('ul + ul').forEach((ul) => {
        const prev = ul.previousElementSibling;
        if (!prev || !prev.isConnected || ul.closest('table') || prev.matches('[class], [id]') || ul.matches('[class], [id]')) return;
        let between = prev.nextSibling;
        while (between && between !== ul && between.nodeType === 3 && !between.textContent.trim()) between = between.nextSibling;
        if (between !== ul) return;
        prev.append(...ul.children);
        ul.remove();
      });
      // Title-only landing hero (manage-account: .hero_landingpage_v1 h1.fxg-hero-landing-title, no photo)
      // stays default content. Left inside the hero's wrapper divs, html2md glues the next block table
      // onto the H1 line, so keep just the heading.
      element.querySelectorAll('.hero_landingpage_v1:not(.fedex-hero-extracted)').forEach((hero) => {
        const h1 = hero.querySelector('h1');
        if (!h1 || hero.querySelector('img, picture, table')) return;
        h1.removeAttribute('class');
        h1.innerHTML = h1.innerHTML.trim();
        hero.replaceWith(h1);
      });
      // Bare default-content links (manage-account: div.button_v1 > div.link > a) -> <p><a>. A bare
      // <a> holding a <sup> (e.g. "FedEx Delivery Manager®") makes html2md drop every block
      // separator on the page (headings, tables and section breaks run together).
      element.querySelectorAll('div > a').forEach((a) => {
        if (a.closest('table')) return;
        const p = a.ownerDocument.createElement('p');
        a.replaceWith(p);
        p.append(a);
      });
    }

    // 3. Global chrome (migrated separately)
    WebImporter.DOMUtils.remove(element, [
      'div.experiencefragment.HFexperiencefragment', // wraps header.fxg-header
      'header.fxg-header',
      'div.experiencefragment_1.HFexperiencefragment', // wraps footer.fxg-footer
      'footer.fxg-footer',
      'div.breadcrumbs_v1',
    ]);
    if (!isFrozen) {
      // Page-title placeholder above .root (landing: empty <div class="h1title"></div>)
      element.querySelectorAll('div.h1title').forEach((el) => {
        const headings = [...el.querySelectorAll(HEADINGS)];
        if (!cleanText(el) || isHidden(el) || (headings.length && headings.every(isHidden))) el.remove();
      });
    }

    // 4. Safe element removal
    WebImporter.DOMUtils.remove(element, ['iframe', 'noscript', 'link', 'script', 'style']);

    // 5. Remove leftover marker attributes
    element.querySelectorAll(`[${DUPLICATE_MARKER}]`).forEach((el) => el.removeAttribute(DUPLICATE_MARKER));

    // 6. Jump links -> EDS heading ids (#compare -> #compare-international-shipping-services-and-rates)
    if (!isFrozen) rewriteJumpLinks(element);

    // 6a. www.fedex.com .html links -> internal links without .html (all templates, including frozen `home`)
    rewriteInternalLinks(element, payload);

    // 6b. blob: images (all templates - blob URLs can never be imported)
    removeBlobImages(element);

    // 7. Map FedEx CTA classes to EDS button authoring (runs after parsers, so only
    //    default-content links still carry source classes):
    //    orange solid -> <strong> (primary), orange outline -> <strong><em> (accent),
    //    rounded outline -> <em> (secondary)
    const wrap = (a, tags) => {
      if (a.closest('strong, em')) return;
      const outer = tags.reduceRight((inner, tag) => {
        const el = payload.document.createElement(tag);
        el.append(inner);
        return el;
      }, a.cloneNode(true));
      a.replaceWith(outer);
    };
    element.querySelectorAll('a.fxg-button--orange').forEach((a) => wrap(a, ['strong']));
    element.querySelectorAll('a.fxg-button--transparent').forEach((a) => wrap(a, ['strong', 'em']));
    element.querySelectorAll('a.fxg-link--rounded_button').forEach((a) => wrap(a, ['em']));
  }
}
