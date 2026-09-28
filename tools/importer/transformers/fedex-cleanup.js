/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: FedEx site-wide cleanup.
 * All selectors verified against migration-work/cleaned.html (https://www.fedex.com/en-us/home.html).
 *
 * ORDERING CONSTRAINT (important):
 * The block/section selectors in page-templates.json are positional, e.g.
 *   div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.column_control_v1:nth-of-type(7)
 * and :nth-of-type(N) counts every <div> sibling in that grid, including div.spacer elements and
 * the mobile-only duplicates. Removing any <div> child of the content grid before the parsers run
 * would shift those indices and make parsers/sections match the wrong element.
 * Additionally, AFTER parsing, parsed <div>s have been replaced by <table> blocks, so the
 * positional indices no longer point at the same elements either.
 * Therefore:
 *   - beforeTransform: only MARK the mobile duplicates (while positions are still the original
 *     ones) and remove overlays/widgets that live outside the content grid.
 *   - afterTransform: remove the marked duplicates, spacers and the global chrome.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Content grid inside the homepage experience fragments (found in cleaned.html under div#container-de6016ba4d)
const CONTENT_GRID = 'div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid';

// Mobile-only duplicates (children carry fxg-desktop--hide / fxg-tablet--hide):
//  - nth-of-type(5): mobile icon links (duplicate of div.advanced_table_v1 which is fxg-mobile--hide)
//  - nth-of-type(17): mobile/tablet "Go global" promo (duplicate of div.featured_offer_v2)
const MOBILE_DUPLICATES = [
  `${CONTENT_GRID} > div.column_control_v1:nth-of-type(5)`,
  `${CONTENT_GRID} > div.column_control_v1:nth-of-type(17)`,
];
const DUPLICATE_MARKER = 'data-fedex-mobile-duplicate';

// Hidden configuration inputs (found in cleaned.html; type attributes were stripped by the scraper)
const HIDDEN_INPUT_IDS = [
  'supportedLocales', 'app-base', 'dataAnalytics', 'dataAnalyticsTrackModule', 'footerIconRtl',
  'fxg-externalIconPath', 'fxg-search-coveoAnalyticsApiUrl', 'fxg-search-coveoSearchApiKey',
  'fxg-search-coveoSearchHub', 'fxg-search-coveoSuggestionsApiUrl', 'fxg-search-url',
  'fxg-track-url', 'header-new-structure', 'justifyRteRtl', 'openInNewWindowLoc',
  'trackPlaceholder', 'trackURL', 'wlgn-secure-link',
];

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // 1. Mark mobile duplicates while :nth-of-type positions are still the original ones.
    //    Do NOT remove here - removal would shift positional selectors used by parsers/sections.
    MOBILE_DUPLICATES.forEach((sel) => {
      element.querySelectorAll(sel).forEach((el) => el.setAttribute(DUPLICATE_MARKER, 'true'));
    });

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
      // Unsupported-browser modal experience fragment
      'div.xfpage.page',
      // Geo locator
      'fedex-geo-locator',
      'div.js-geo-locator',
    ]);

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

    // 3. Global chrome (migrated separately)
    WebImporter.DOMUtils.remove(element, [
      'div.experiencefragment.HFexperiencefragment', // wraps header.fxg-header
      'header.fxg-header',
      'div.experiencefragment_1.HFexperiencefragment', // wraps footer.fxg-footer
      'footer.fxg-footer',
      'div.breadcrumbs_v1',
    ]);

    // 4. Safe element removal
    WebImporter.DOMUtils.remove(element, ['iframe', 'noscript', 'link', 'script', 'style']);

    // 5. Remove leftover marker attributes
    element.querySelectorAll(`[${DUPLICATE_MARKER}]`).forEach((el) => el.removeAttribute(DUPLICATE_MARKER));

    // 6. Map FedEx CTA classes to EDS button authoring (runs after parsers, so only
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
