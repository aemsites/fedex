/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroLandingParser from './parsers/hero-landing.js';
import notificationParser from './parsers/notification.js';
import cardsIconParser from './parsers/cards-icon.js';
import columnsPromoParser from './parsers/columns-promo.js';
import widgetParser from './parsers/widget.js';
import cardsHorizontalParser from './parsers/cards-horizontal.js';
import accordionParser from './parsers/accordion.js';
import cardsPromoParser from './parsers/cards-promo.js';
import columnsStepsParser from './parsers/columns-steps.js';

// TRANSFORMER IMPORTS
import fedexCleanupTransformer from './transformers/fedex-cleanup.js';
import fedexSectionsTransformer from './transformers/fedex-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-landing': heroLandingParser,
  'notification': notificationParser,
  'cards-icon': cardsIconParser,
  'columns-promo': columnsPromoParser,
  'widget': widgetParser,
  'cards-horizontal': cardsHorizontalParser,
  'accordion': accordionParser,
  'cards-promo': cardsPromoParser,
  'columns-steps': columnsStepsParser,
};

// PAGE TEMPLATE CONFIGURATION - embedded from tools/importer/page-templates.json
const PAGE_TEMPLATE = {
  "name": "hub-landing",
  "urls": [
    "https://www.fedex.com/en-us/shipping/international.html",
    "https://www.fedex.com/en-us/shipping.html",
    "https://www.fedex.com/en-us/shipping/packing.html",
    "https://www.fedex.com/en-us/shipping/schedule-manage-pickups.html",
    "https://www.fedex.com/en-us/small-business.html"
  ],
  "coverageGaps": [],
  "description": "Long-form section hub: photo hero or title, notification, jump links, icon card grids, alternating media-text rows, rate widget, accordions and resource card grids",
  "blocks": [
    {
      "name": "hero-landing",
      "instances": [
        ".hero_landingpage_v1:has(.fxg-landing-hero h1)"
      ]
    },
    {
      "name": "notification",
      "instances": [
        "div.notifications"
      ]
    },
    {
      "name": "cards-icon",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:nth-child(3) > div > .aem-Grid > .image_v2):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .image_v2):has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col > div > .aem-Grid > :is(.title_v1, .column_control_v1, .featured_offer_v2, .button_v1)))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-6:first-child > div > .aem-Grid > .column_control_v1):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .column_control_v1):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2))"
      ]
    },
    {
      "name": "columns-promo",
      "instances": [
        ".root div.featured_offer_v2:not(.column_control_v1 *)",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-6:first-child > div > .aem-Grid > :is(.image_v2, .video_v1)):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:nth-child(3)))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.image_v2, .video_v1))):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > :is(.image_v2, .video_v1)):not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1)):not(:has(> .row > .fxg-col:nth-child(3)))"
      ]
    },
    {
      "name": "widget",
      "instances": [
        "div.genericAppContainer"
      ]
    },
    {
      "name": "cards-horizontal",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:first-child:is(.col-sm-2, .col-sm-3, .col-sm-4) > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:nth-child(3)))"
      ]
    },
    {
      "name": "accordion",
      "instances": [
        ".root div.accordion_selector:not(.accordion_selector + .accordion_selector, .accordion_selector *)"
      ]
    },
    {
      "name": "cards-promo",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:first-child > div > .aem-Grid > .featured_offer_v2)",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.image_v2, .video_v1) ~ .title_v1):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1)"
      ]
    },
    {
      "name": "columns-steps",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .column_control_v1):not(:has(> .row > .fxg-col:nth-child(3)))"
      ]
    }
  ],
  "representativeUrl": "https://www.fedex.com/en-us/shipping/international.html",
  "sections": [
    {
      "id": "1",
      "name": "Landing hero",
      "selector": [
        ".root .hero_landingpage_v1"
      ],
      "style": null,
      "blocks": [
        "hero-landing"
      ],
      "defaultContent": []
    },
    {
      "id": "2",
      "name": "Jump links panel",
      "selector": [
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor):has(+ .column_control_v1 > .row.fxg-row--has-bgcolor a[href^=\"#\"])",
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor .title_v1):has(> .row.fxg-row--has-bgcolor a[href^=\"#\"])"
      ],
      "style": "light, jump-links",
      "blocks": [],
      "defaultContent": [
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor):has(+ .column_control_v1 > .row.fxg-row--has-bgcolor a[href^=\"#\"]) h2",
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor .title_v1) + .column_control_v1:has(> .row.fxg-row--has-bgcolor a[href^=\"#\"])",
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor .title_v1):has(> .row.fxg-row--has-bgcolor a[href^=\"#\"])"
      ]
    },
    {
      "id": "3",
      "name": "Start here",
      "selector": [
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor a[href^=\"#\"]) ~ .title_v1",
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor a[href^=\"#\"]) ~ .fxg-wrapper"
      ],
      "style": null,
      "blocks": [
        "cards-icon",
        "columns-promo"
      ],
      "defaultContent": [
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor a[href^=\"#\"]) ~ .title_v1:has(> h3)"
      ]
    },
    {
      "id": "4",
      "name": "Compare services and rates (#compare)",
      "selector": [
        ".root .title_v1:has(> h2#compare)"
      ],
      "style": null,
      "blocks": [
        "widget",
        "cards-horizontal",
        "accordion",
        "columns-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#compare)",
        ".root .title_v1:has(> h2#compare) + .richtext",
        ".root .column_control_v1:not(.column_control_v1 *):has(> .row > .fxg-col.col-sm-3:first-child > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col > div > .aem-Grid > .title_v1))"
      ]
    },
    {
      "id": "5",
      "name": "Customs documents (#customs-documents)",
      "selector": [
        ".root .title_v1:has(> h2#customs-documents)"
      ],
      "style": null,
      "blocks": [
        "cards-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#customs-documents)",
        ".root .title_v1:has(> h2#customs-documents) + .richtext"
      ]
    },
    {
      "id": "6",
      "name": "Customs clearance (#customs-clearance)",
      "selector": [
        ".root .title_v1:has(> h2#customs-clearance)"
      ],
      "style": null,
      "blocks": [
        "cards-horizontal",
        "cards-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#customs-clearance)",
        ".root .title_v1:has(> h2#customs-clearance) + .richtext"
      ]
    },
    {
      "id": "7",
      "name": "Shipping and packing resources (#prep)",
      "selector": [
        ".root .title_v1:has(> h2#prep)"
      ],
      "style": null,
      "blocks": [
        "columns-steps",
        "cards-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#prep)",
        ".root .title_v1:has(> h2#prep) + .richtext"
      ]
    },
    {
      "id": "8",
      "name": "Global business shipping tools (#global-business-shipping-tools)",
      "selector": [
        ".root .title_v1:has(> h2#global-business-shipping-tools)"
      ],
      "style": null,
      "blocks": [
        "cards-icon",
        "columns-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#global-business-shipping-tools)",
        ".root .title_v1:has(> h2#global-business-shipping-tools) + .richtext"
      ]
    },
    {
      "id": "9",
      "name": "FAQs",
      "selector": [
        ".root .title_v1:has(> h2):has(+ .accordion_selector)"
      ],
      "style": null,
      "blocks": [
        "accordion"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2):has(+ .accordion_selector)"
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

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
