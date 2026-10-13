/* eslint-disable */
/* global WebImporter */

/**
 * Footer fragment import: https://www.fedex.com/{locale}/home.html -> /{locale}/footer
 * (blocks/footer schema, see parsers/footer.js). Only the page footer is imported.
 * Links to www.fedex.com pages become internal links, as in the page imports
 * (https://www.fedex.com/de-de/terms-of-use.html -> /de-de/terms-of-use); the language switch
 * reads the locale from the path either way.
 */
import parseFooter from './parsers/footer.js';
import rewriteInternalLinks from './utils/internal-links.js';

export default {
  transform: (payload) => {
    const { document, params } = payload;
    const locale = new URL(params.originalURL).pathname.split('/').filter(Boolean)[0];
    if (!/^[a-z]{2}-[a-z]{2}$/.test(locale || '')) {
      throw new Error(`footer import: no locale in ${params.originalURL}`);
    }

    const parsed = parseFooter(document);
    if (!parsed) throw new Error(`footer import: no footer on ${params.originalURL}`);
    rewriteInternalLinks(parsed, payload);

    // sections separated by <hr>
    const main = document.createElement('div');
    [...parsed.children].forEach((section, i) => {
      if (i) main.append(document.createElement('hr'));
      main.append(...section.childNodes);
    });

    return [{
      element: main,
      path: `/${locale}/footer`,
      report: { locale, sections: parsed.children.length },
    }];
  },
};
