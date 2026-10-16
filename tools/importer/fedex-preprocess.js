/* eslint-disable */

/**
 * FedEx import preprocessing - wired as the import script's `preprocess` hook, which helix-importer
 * calls on the raw document BEFORE its own PageImporter.preProcess and before transform()
 * (so this cannot live in the cleanup transformer's before/afterTransform hooks).
 *
 * <u> around links (drop-off-package: <b><u> <a>FedEx® Mobile app</a>,</u></b>): PageImporter.preProcess
 * moves the <a> out of a `u > a` / `u > span > a` and deletes the <u> together with its remaining
 * text (the trailing comma). Unwrapping the <u> keeps all text; underlined links are discouraged
 * anyway. <u> inside an <a> (no nested link) is left untouched.
 */
export function unwrapLinkUnderlines(document) {
  document.querySelectorAll('u').forEach((u) => {
    if (u.querySelector('a')) u.replaceWith(...u.childNodes);
  });
}

/**
 * A relative <base href="/"> (en-us tracking.html, an Angular app shell) makes URL resolution in
 * the import fail ("Failed to construct 'URL': Invalid base URL"). Links and images are resolved
 * against the page URL anyway, so a base whose href is not absolute is dropped.
 */
export function dropRelativeBase(document) {
  document.querySelectorAll('base').forEach((base) => {
    if (!/^https?:\/\//i.test(base.getAttribute('href') || '')) base.remove();
  });
}

/**
 * Named anchors (en-to terms-of-use: <h3><a id="1a" name="1a"></a>Section 1. Definitions</h3>, the
 * table of contents links to #1a) are empty, so PageImporter.preProcess drops them. Their id moves
 * to the heading they sit in (or the next heading), where the cleanup transformer's jump-link
 * rewrite finds it.
 */
export function moveAnchorIdsToHeadings(document) {
  const HEADINGS = 'h1, h2, h3, h4, h5, h6';
  const headings = [...document.querySelectorAll(HEADINGS)];
  document.querySelectorAll('a[id]:not([href]), a[name]:not([href])').forEach((a) => {
    if (a.textContent.trim() || a.querySelector('img')) return;
    const id = a.id || a.getAttribute('name');
    const h = a.closest(HEADINGS)
      || headings.find((el) => a.compareDocumentPosition(el) & 4);
    if (id && h && !h.id) h.id = id;
  });
}

export default function preprocess({ document }) {
  dropRelativeBase(document);
  unwrapLinkUnderlines(document);
  moveAnchorIdsToHeadings(document);
}
