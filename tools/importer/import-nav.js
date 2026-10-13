/* eslint-disable */
/* global WebImporter */

/**
 * Nav fragment import: https://www.fedex.com/{locale}/home.html -> /{locale}/nav
 * (blocks/header schema, see parsers/nav.js). Only the page header is imported.
 * Links to www.fedex.com pages become internal links, as in the page imports
 * (https://www.fedex.com/de-de/shipping.html -> /de-de/shipping).
 */
import parseNav from './parsers/nav.js';
import rewriteInternalLinks from './utils/internal-links.js';

export default {
  transform: (payload) => {
    const { document, params } = payload;
    const locale = new URL(params.originalURL).pathname.split('/').filter(Boolean)[0];
    if (!/^[a-z]{2}-[a-z]{2}$/.test(locale || '')) {
      throw new Error(`nav import: no locale in ${params.originalURL}`);
    }

    const parsed = parseNav(document, locale);
    if (!parsed) throw new Error(`nav import: no header on ${params.originalURL}`);
    rewriteInternalLinks(parsed, payload);

    // sections separated by <hr>; empty sections are dropped (the header reads them in order)
    const sections = [...parsed.children].filter((section) => section.children.length);
    const main = document.createElement('div');
    sections.forEach((section, i) => {
      if (i) main.append(document.createElement('hr'));
      main.append(...section.childNodes);
    });

    return [{
      element: main,
      path: `/${locale}/nav`,
      report: { locale, sections: sections.length },
    }];
  },
};
