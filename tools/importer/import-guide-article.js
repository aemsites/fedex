/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsHorizontalParser from './parsers/cards-horizontal.js';
import columnsPromoParser from './parsers/columns-promo.js';
import cardsLogosParser from './parsers/cards-logos.js';

// TRANSFORMER IMPORTS
import fedexCleanupTransformer from './transformers/fedex-cleanup.js';
import fedexSectionsTransformer from './transformers/fedex-sections.js';

// PARSER REGISTRY
const parsers = {
  'cards-horizontal': cardsHorizontalParser,
  'columns-promo': columnsPromoParser,
  'cards-logos': cardsLogosParser,
};

// PAGE TEMPLATE CONFIGURATION - embedded from tools/importer/page-templates.json
const PAGE_TEMPLATE = {
  "name": "guide-article",
  "urls": [
    "https://www.fedex.com/en-us/shipping/returns.html"
  ],
  "coverageGaps": [],
  "description": "Text-heavy guide with centered title, icon step list, jump links and question/answer sections with media-text promos",
  "blocks": [
    {
      "name": "cards-horizontal",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:nth-child(3))):has(> .row > .fxg-col.col-sm-4:first-child > div > .aem-Grid > .column_control_v1 > .row > .fxg-col:first-child > div > .aem-Grid > .image_v2):has(> .row > .fxg-col.col-sm-4:first-child > div > .aem-Grid > .column_control_v1 > .row > .fxg-col:nth-child(2) > div > .aem-Grid > .richtext):has(> .row > .fxg-col.col-sm-8:nth-child(2) > div > .aem-Grid > .richtext)",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:nth-child(3))):has(> .row > .fxg-col.col-sm-2:first-child > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.richtext, .button_v1, .column_control_v1))):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .richtext):not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > :is(.title_v1, .button_v1, .image_v2, .column_control_v1)))"
      ]
    },
    {
      "name": "columns-promo",
      "instances": [
        ".root div.featured_offer_v2:not(.column_control_v1 *)",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:nth-child(3))):not(:has(> .row.fxg-row--has-bgcolor)):has(> .row > .fxg-col.col-sm-4:first-child > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.title_v1, .richtext, .button_v1, .column_control_v1, .video_v1))):has(> .row > .fxg-col.col-sm-8:nth-child(2) > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > :is(.image_v2, .video_v1)))"
      ]
    },
    {
      "name": "cards-logos",
      "instances": [
        ".root div.carousel_v1:has(.image_v2 img)"
      ]
    }
  ],
  "representativeUrl": "https://www.fedex.com/en-us/shipping/returns.html",
  "sections": [
    {
      "id": "1",
      "name": "Title and return situations",
      "selector": [
        ".h1title:has(h1)"
      ],
      "style": "center",
      "blocks": [
        "cards-horizontal"
      ],
      "defaultContent": [
        ".h1title h1",
        ".root .cmp-container > .richtext:first-child"
      ]
    },
    {
      "id": "2",
      "name": "Simple returns video promo",
      "selector": [
        ".root .experiencefragment:has(.featured_offer_v2)"
      ],
      "style": null,
      "blocks": [
        "columns-promo"
      ],
      "defaultContent": []
    },
    {
      "id": "3",
      "name": "Jump links",
      "selector": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1 :is(h2, h3, h4)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .button_v1 a[href^=\"#\"]):not(:has(> .row > .fxg-col:first-child .image_v2))"
      ],
      "style": "jump-links, heading-left",
      "blocks": [],
      "defaultContent": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1 :is(h2, h3, h4)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .button_v1 a[href^=\"#\"]):not(:has(> .row > .fxg-col:first-child .image_v2)) .title_v1",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1 :is(h2, h3, h4)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .button_v1 a[href^=\"#\"]):not(:has(> .row > .fxg-col:first-child .image_v2)) .button_v1 a"
      ]
    },
    {
      "id": "4",
      "name": "Creating a returns label",
      "selector": [
        ".root .title_v1:has(> h2#creatingareturnslabel)"
      ],
      "style": "center-headings",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#creatingareturnslabel)",
        ".root .title_v1:has(> h2#creatingareturnslabel) ~ .title_v1",
        ".root .title_v1:has(> h2#creatingareturnslabel) ~ .richtext",
        ".root .title_v1:has(> h2#creatingareturnslabel) ~ .button_v1"
      ]
    },
    {
      "id": "5",
      "name": "Printing returns labels",
      "selector": [
        ".root .title_v1:has(> h2#printingreturnlabels)"
      ],
      "style": "center-headings",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#printingreturnlabels)",
        ".root .title_v1:has(> h2#printingreturnlabels) ~ .title_v1",
        ".root .title_v1:has(> h2#printingreturnlabels) ~ .richtext",
        ".root .title_v1:has(> h2#printingreturnlabels) ~ .button_v1"
      ]
    },
    {
      "id": "6",
      "name": "Sending a return with reusable packaging",
      "selector": [
        ".root .title_v1:has(> h2#reusable)"
      ],
      "style": "center-headings",
      "blocks": [
        "columns-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#reusable)",
        ".root .title_v1:has(> h2#reusable) ~ .title_v1",
        ".root .title_v1:has(> h2#reusable) ~ .richtext",
        ".root .title_v1:has(> h2#reusable) ~ .button_v1"
      ]
    },
    {
      "id": "7",
      "name": "FedEx pickup and dropoff for returns",
      "selector": [
        ".root .title_v1:has(> h2#PickupandDropoffs)"
      ],
      "style": "center-headings",
      "blocks": [
        "cards-logos"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#PickupandDropoffs)",
        ".root .title_v1:has(> h2#PickupandDropoffs) ~ .title_v1",
        ".root .title_v1:has(> h2#PickupandDropoffs) ~ .richtext",
        ".root .title_v1:has(> h2#PickupandDropoffs) ~ .button_v1"
      ]
    },
    {
      "id": "8",
      "name": "QR code returns",
      "selector": [
        ".root .title_v1:has(> h2#qRcodereturns)"
      ],
      "style": "center-headings",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#qRcodereturns)",
        ".root .title_v1:has(> h2#qRcodereturns) ~ .title_v1",
        ".root .title_v1:has(> h2#qRcodereturns) ~ .richtext",
        ".root .title_v1:has(> h2#qRcodereturns) ~ .button_v1"
      ]
    },
    {
      "id": "9",
      "name": "Getting support for returns",
      "selector": [
        ".root .title_v1:has(> h2#gettingsupportforreturns)"
      ],
      "style": "center-headings",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#gettingsupportforreturns)",
        ".root .title_v1:has(> h2#gettingsupportforreturns) ~ .title_v1",
        ".root .title_v1:has(> h2#gettingsupportforreturns) ~ .richtext",
        ".root .title_v1:has(> h2#gettingsupportforreturns) ~ .button_v1"
      ]
    },
    {
      "id": "10",
      "name": "Tracking FedEx returns",
      "selector": [
        ".root .title_v1:has(> h2#trackingFedExreturns)"
      ],
      "style": "center-headings",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#trackingFedExreturns)",
        ".root .title_v1:has(> h2#trackingFedExreturns) ~ .title_v1",
        ".root .title_v1:has(> h2#trackingFedExreturns) ~ .richtext",
        ".root .title_v1:has(> h2#trackingFedExreturns) ~ .button_v1"
      ]
    },
    {
      "id": "11",
      "name": "How to handle USPS returns and UPS returns",
      "selector": [
        ".root .title_v1:has(> h2#USPSreturnsandUPSreturns)"
      ],
      "style": "center-headings",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#USPSreturnsandUPSreturns)",
        ".root .title_v1:has(> h2#USPSreturnsandUPSreturns) ~ .title_v1",
        ".root .title_v1:has(> h2#USPSreturnsandUPSreturns) ~ .richtext",
        ".root .title_v1:has(> h2#USPSreturnsandUPSreturns) ~ .button_v1"
      ]
    },
    {
      "id": "12",
      "name": "Returns promos",
      "selector": [
        ".root div.featured_offer_v2:not(.experiencefragment *, .column_control_v1 *, .featured_offer_v2 ~ *)"
      ],
      "style": null,
      "blocks": [
        "columns-promo"
      ],
      "defaultContent": []
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
        report: { title: f.title || f.path, template: `${PAGE_TEMPLATE.name}-fragment`, blocks: [] },
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
