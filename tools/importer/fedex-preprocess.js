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

export default function preprocess({ document }) {
  dropRelativeBase(document);
  unwrapLinkUnderlines(document);
}
