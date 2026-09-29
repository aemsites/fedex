/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsPromoParser from './parsers/cards-promo.js';
import cardsIconParser from './parsers/cards-icon.js';
import cardsHorizontalParser from './parsers/cards-horizontal.js';
import tableParser from './parsers/table.js';
import accordionParser from './parsers/accordion.js';

// TRANSFORMER IMPORTS
import fedexCleanupTransformer from './transformers/fedex-cleanup.js';
import fedexSectionsTransformer from './transformers/fedex-sections.js';

// PARSER REGISTRY
const parsers = {
  'cards-promo': cardsPromoParser,
  'cards-icon': cardsIconParser,
  'cards-horizontal': cardsHorizontalParser,
  'table': tableParser,
  'accordion': accordionParser,
};

// PAGE TEMPLATE CONFIGURATION - embedded from tools/importer/page-templates.json
const PAGE_TEMPLATE = {
  "name": "comparison-landing",
  "urls": [
    "https://www.fedex.com/en-us/open-account.html"
  ],
  "coverageGaps": [],
  "description": "Sign-up landing with centered title, two-option choice cards, icon benefit row, comparison table and FAQ list",
  "blocks": [
    {
      "name": "cards-promo",
      "instances": [
        ".root .column_control_v1:has(.conditionalform)"
      ]
    },
    {
      "name": "cards-icon",
      "instances": [
        ".root .column_control_v1:has(> .row > .fxg-col.col-sm-4):not(:has(.col-sm-10))",
        ".root .column_control_v1:has(> .row > .fxg-col.col-sm-4):has(.col-sm-10)"
      ]
    },
    {
      "name": "cards-horizontal",
      "instances": [
        ".root .column_control_v1:has(.fxg-row--has-bgcolor)"
      ]
    },
    {
      "name": "table",
      "instances": [
        ".root .column_control_v1:has(+ .hr_v1):not(.hr_v1 + *)"
      ]
    },
    {
      "name": "accordion",
      "instances": [
        ".root .accordion_selector"
      ]
    }
  ],
  "representativeUrl": "https://www.fedex.com/en-us/open-account.html",
  "sections": [
    {
      "id": "1",
      "name": "Page title + account choice",
      "selector": [
        ".root .hero_landingpage_v1"
      ],
      "style": "center",
      "blocks": [
        "cards-promo"
      ],
      "defaultContent": [
        ".root .hero_landingpage_v1 h1",
        ".root .title_v1:has(h5)"
      ]
    },
    {
      "id": "2",
      "name": "Built-in savings",
      "selector": [
        ".root .title_v1:has(h2):has(+ .spacer + .column_control_v1)"
      ],
      "style": "center",
      "blocks": [
        "cards-icon"
      ],
      "defaultContent": [
        ".root .title_v1:has(h2):has(+ .spacer + .column_control_v1)"
      ]
    },
    {
      "id": "3",
      "name": "Discover the benefits",
      "selector": [
        ".root .title_v1:has(h2):has(+ .spacer + .table)"
      ],
      "style": "center",
      "blocks": [
        "cards-icon"
      ],
      "defaultContent": [
        ".root .title_v1:has(h2):has(+ .spacer + .table)"
      ]
    },
    {
      "id": "4",
      "name": "Already have an account?",
      "selector": [
        ".root .column_control_v1:has(.fxg-row--has-bgcolor)"
      ],
      "style": null,
      "blocks": [
        "cards-horizontal"
      ],
      "defaultContent": []
    },
    {
      "id": "5",
      "name": "Business vs personal comparison",
      "selector": [
        ".root .title_v1:has(h3):has(+ .richtext + .spacer + .column_control_v1)"
      ],
      "style": null,
      "blocks": [
        "table"
      ],
      "defaultContent": [
        ".root .title_v1:has(h3):has(+ .richtext + .spacer + .column_control_v1)",
        ".root .title_v1:has(h3):has(+ .richtext + .spacer + .column_control_v1) + .richtext"
      ]
    },
    {
      "id": "6",
      "name": "FAQs",
      "selector": [
        ".root .title_v1:has(h2):has(+ .title_v1)"
      ],
      "style": null,
      "blocks": [
        "accordion"
      ],
      "defaultContent": [
        ".root .title_v1:has(h2):has(+ .title_v1) ~ .title_v1",
        ".root .title_v1:has(h2):has(+ .title_v1) ~ .richtext"
      ]
    }
  ]
};

// TRANSFORMER REGISTRY - cleanup first, then sections (sections needs 2+ sections)
const transformers = [
  fedexCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [fedexSectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 * All elements are collected before any parser runs, so positional selectors
 * (nth-of-type) resolve against the original DOM.
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name, selector, element, section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. Initial cleanup + section breaks (positions preserved)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block; skip elements already detached by an earlier parser
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Final cleanup + section metadata
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path; root URL maps to /index
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    // The bulk runner saves one document per URL, so a fragment (e.g. freight's table answer)
    // is imported as its own URL: <page>.html?fragment=<index> returns only that fragment.
    const fragmentIndex = new URL(params.originalURL).searchParams.get('fragment');
    if (fragmentIndex !== null) {
      const f = (document.importFragments || [])[Number(fragmentIndex) || 0];
      if (!f) throw new Error(`No fragment ${fragmentIndex} on ${params.originalURL}`);
      return {
        element: f.element,
        path: WebImporter.FileUtils.sanitizePath(f.path),
        report: { title: f.title || f.path, template: `${PAGE_TEMPLATE.name}-fragment`, blocks: ['table'] },
      };
    }

    return {
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    };
  },
};
