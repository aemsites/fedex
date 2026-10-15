/* eslint-disable */
/* global WebImporter */
/**
 * Parser for content-select. Base: content-select (blocks/content-select).
 * Template: generic-landing. Source: https://www.fedex.com/en-to/ancillary-clearance-service.html
 * ("Clearance Services and Related Fees for shipments to:" + "Select Country/Territory").
 * Instance: div.conditionalform, marked by transformers/fedex-landing.js markConditionalForms
 * (data-fedex-options: the prompt and the options of the source's JSON config).
 *
 * Output: `Content Select`
 *   row 1: the prompt (the dropdown's label, "Select Country/Territory")
 *   one row per option: label | link to the content it shows
 * An option's content is a component-library page on fedex.com
 * (/content/fedex-com/component-library/ancillary/en_us/au.html), imported as the fragment
 * /fragments/ancillary/en-us/au (import-generic-landing.js maps the path; add those URLs to
 * urls-generic-landing.txt). Options without a linked page keep their inline text.
 */
const OPTIONS = 'data-fedex-options';

export function componentLibraryPath(href) {
  const m = /^\/content\/fedex-com\/component-library\/(.+?)(?:\.html)?$/.exec(href || '');
  return m ? `/fragments/${m[1].toLowerCase().replace(/_/g, '-')}` : null;
}

export default function parse(element, { document }) {
  let config;
  try {
    config = JSON.parse(element.getAttribute(OPTIONS));
  } catch (e) {
    config = null;
  }
  if (!config || !config.options || !config.options.length) {
    element.remove();
    return;
  }
  const cells = [[(config.label || '').trim()]];
  config.options.forEach((o) => {
    const label = (o.label || '').trim();
    if (!label) return;
    const path = o.data && String(o.data.isLink) === 'true' ? componentLibraryPath(o.data.content) : null;
    if (path) {
      const a = document.createElement('a');
      a.href = path;
      a.textContent = path;
      cells.push([label, a]);
    } else {
      cells.push([label, (o.data && o.data.content) || '']);
    }
  });
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'Content Select', cells }));
}
