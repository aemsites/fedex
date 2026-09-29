/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroLandingParser from './parsers/hero-landing.js';
import notificationParser from './parsers/notification.js';
import cardsIconLinksParser from './parsers/cards-icon-links.js';
import accordionParser from './parsers/accordion.js';
import columnsPromoParser from './parsers/columns-promo.js';
import cardsIconParser from './parsers/cards-icon.js';
import cardsHorizontalParser from './parsers/cards-horizontal.js';
import widgetParser from './parsers/widget.js';
import columnsStepsParser from './parsers/columns-steps.js';

// TRANSFORMER IMPORTS
import fedexCleanupTransformer from './transformers/fedex-cleanup.js';
import fedexSectionsTransformer from './transformers/fedex-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-landing': heroLandingParser,
  'notification': notificationParser,
  'cards-icon-links': cardsIconLinksParser,
  'accordion': accordionParser,
  'columns-promo': columnsPromoParser,
  'cards-icon': cardsIconParser,
  'cards-horizontal': cardsHorizontalParser,
  'widget': widgetParser,
  'columns-steps': columnsStepsParser,
};

// PAGE TEMPLATE CONFIGURATION - embedded from tools/importer/page-templates.json
const PAGE_TEMPLATE = {
  "name": "service-overview",
  "urls": [
    "https://www.fedex.com/en-us/shipping/freight.html",
    "https://www.fedex.com/en-us/manage-account.html"
  ],
  "coverageGaps": [],
  "description": "Service overview with title or photo hero, icon link row, link-list columns, media-text rows, numbered steps and FAQ accordions",
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
      "name": "cards-icon-links",
      "instances": [
        ".root div.advanced_table_v1:not(.accordion_selector *)"
      ]
    },
    {
      "name": "accordion",
      "instances": [
        ".root div.accordion_selector:not(:has(.accordion_selector)):not(.accordion_selector + .accordion_selector)"
      ]
    },
    {
      "name": "columns-promo",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *, .advanced_table_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:nth-child(2)):not(:has(> .row > .fxg-col:nth-child(3))):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > :is(.image_v2, .video_v1)):not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > :is(.title_v1, .richtext, .column_control_v1))):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.image_v2, .video_v1))):has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.title_v1, .richtext, .column_control_v1))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *, .advanced_table_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:nth-child(2)):not(:has(> .row > .fxg-col:nth-child(3))):has(> .row > .fxg-col:first-child > div > .aem-Grid > .column_control_v1 .title_v1):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .column_control_v1 .image_v2):not(:has(> .row > .fxg-col:nth-child(2) .title_v1)):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.image_v2, .video_v1)))"
      ]
    },
    {
      "name": "cards-icon",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *, .advanced_table_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-6:first-child > div > .aem-Grid > .column_control_v1 > .row > .fxg-col:first-child > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.image_v2, .title_v1, .richtext))):not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > :not(.spacer, .column_control_v1)))"
      ]
    },
    {
      "name": "cards-horizontal",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *, .advanced_table_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:nth-child(2)):not(:has(> .row > .fxg-col:nth-child(3))):has(> .row > .fxg-col:first-child:is(.col-sm-2, .col-sm-3, .col-sm-4) > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col.col-sm-3:first-child + .fxg-col.col-sm-8))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *, .advanced_table_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:nth-child(3) > div > .aem-Grid > .title_v1):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1)):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :not(.spacer))):not(:has(> .row > .fxg-col:nth-child(4)))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *, .advanced_table_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1):has(> .row > .fxg-col:nth-child(3) > div > .aem-Grid > .button_v1):not(:has(> .row > .fxg-col:nth-child(3) > div > .aem-Grid > :not(.spacer, .button_v1))):not(:has(> .row > .fxg-col:nth-child(4)))"
      ]
    },
    {
      "name": "widget",
      "instances": [
        "div.genericAppContainer"
      ]
    },
    {
      "name": "columns-steps",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *, .advanced_table_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-3:first-child > div > .aem-Grid > .image_v2):has(> .row > .fxg-col.col-sm-8:nth-child(2) > div > .aem-Grid > .title_v1):has(> .row > .fxg-col:nth-child(2)):not(:has(> .row > .fxg-col:nth-child(3))):not(.root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *, .advanced_table_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-3:first-child > div > .aem-Grid > .image_v2):has(> .row > .fxg-col.col-sm-8:nth-child(2) > div > .aem-Grid > .title_v1):has(> .row > .fxg-col:nth-child(2)):not(:has(> .row > .fxg-col:nth-child(3))) ~ *)"
      ]
    }
  ],
  "representativeUrl": "https://www.fedex.com/en-us/shipping/freight.html",
  "sections": [
    {
      "id": "1",
      "name": "Photo hero",
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
      "name": "Open-account band",
      "selector": [
        ".root > .aem-Grid > .experiencefragment:has(> .xf-content-height > .aem-Grid > .column_control_v1 > .row.fxg-row--has-bgcolor)"
      ],
      "style": "blue",
      "blocks": [],
      "defaultContent": [
        ".root > .aem-Grid > .experiencefragment:has(> .xf-content-height > .aem-Grid > .column_control_v1 > .row.fxg-row--has-bgcolor) :is(.richtext, .button_v1)"
      ]
    },
    {
      "id": "3",
      "name": "Jump links",
      "selector": [
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor .title_v1):has(~ .column_control_v1 > .row.fxg-row--has-bgcolor a[href^=\"#\"])"
      ],
      "style": "light, jump-links, three-columns",
      "blocks": [],
      "defaultContent": [
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor .title_v1):has(~ .column_control_v1 > .row.fxg-row--has-bgcolor a[href^=\"#\"]) h2",
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor a[href^=\"#\"]):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide))"
      ]
    },
    {
      "id": "4",
      "name": "What is freight?",
      "selector": [
        ".root .column_control_v1:has(> .row.fxg-row--has-bgcolor a[href^=\"#\"]) ~ .accordion_selector"
      ],
      "style": null,
      "blocks": [
        "accordion",
        "columns-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#what-is-freight)"
      ]
    },
    {
      "id": "5",
      "name": "Air freight shipping options",
      "selector": [
        ".root .title_v1:has(> h2#fedex-air-freight-services)"
      ],
      "style": null,
      "blocks": [
        "cards-icon-links",
        "accordion"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#fedex-air-freight-services)"
      ]
    },
    {
      "id": "6",
      "name": "Big shipments. Big benefits.",
      "selector": [
        ".root .title_v1:has(> h2#big-shipments)"
      ],
      "style": null,
      "blocks": [
        "cards-icon",
        "columns-promo",
        "cards-horizontal"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#big-shipments)"
      ]
    },
    {
      "id": "7",
      "name": "Freight rates",
      "selector": [
        ".root .title_v1:has(> h2#calculators)"
      ],
      "style": null,
      "blocks": [
        "cards-horizontal",
        "widget"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#calculators)",
        ".root .title_v1:has(> h2#calculators) + .richtext",
        ".root .title_v1:has(> h2#calculators) ~ .button_v1"
      ]
    },
    {
      "id": "8",
      "name": "Ready to ship?",
      "selector": [
        ".root .title_v1:has(> h2#ready-to-ship)"
      ],
      "style": null,
      "blocks": [
        "columns-steps"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#ready-to-ship)",
        ".root .title_v1:has(> h2#ready-to-ship) + .title_v1"
      ]
    },
    {
      "id": "9",
      "name": "FAQs",
      "selector": [
        ".root .title_v1:has(> h2#FAQs)",
        ".root .title_v1:has(> h2#faqs)"
      ],
      "style": null,
      "blocks": [
        "accordion"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#FAQs)",
        ".root .title_v1:has(> h2#faqs)"
      ]
    },
    {
      "id": "10",
      "name": "Account management tools (gap page: manage-account)",
      "selector": [
        ".root .title_v1:has(> h2#account-management-tools)"
      ],
      "style": "jump-links, three-columns",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#account-management-tools)",
        ".root .title_v1:has(> h2#account-management-tools) + .richtext",
        ".root .title_v1:has(> h2#account-management-tools) ~ .column_control_v1:has(> .row > .fxg-col:nth-child(3)):not(:has(> .row > .fxg-col > div > .aem-Grid > :not(.spacer, .button_v1)))"
      ]
    },
    {
      "id": "11",
      "name": "Billing and reporting (gap page: manage-account)",
      "selector": [
        ".root .title_v1:has(> h2#billing-and-reporting)"
      ],
      "style": "jump-links, three-columns",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#billing-and-reporting)",
        ".root .title_v1:has(> h2#billing-and-reporting) + .richtext",
        ".root .title_v1:has(> h2#billing-and-reporting) ~ .column_control_v1:has(> .row > .fxg-col:nth-child(3)):not(:has(> .row > .fxg-col > div > .aem-Grid > :not(.spacer, .button_v1)))"
      ]
    },
    {
      "id": "12",
      "name": "Shipping and tracking (gap page: manage-account)",
      "selector": [
        ".root .title_v1:has(> h2#shipping-and-tracking)"
      ],
      "style": "jump-links, three-columns",
      "blocks": [
        "columns-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#shipping-and-tracking)",
        ".root .title_v1:has(> h2#shipping-and-tracking) + .richtext",
        ".root .title_v1:has(> h2#shipping-and-tracking) ~ .column_control_v1:has(> .row > .fxg-col:nth-child(3)):not(:has(> .row > .fxg-col > div > .aem-Grid > :not(.spacer, .button_v1)))"
      ]
    },
    {
      "id": "13",
      "name": "Claims and support (gap page: manage-account)",
      "selector": [
        ".root .title_v1:has(> h2#claims-and-support)"
      ],
      "style": "jump-links, three-columns",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#claims-and-support)",
        ".root .title_v1:has(> h2#claims-and-support) + .richtext",
        ".root .title_v1:has(> h2#claims-and-support) ~ .column_control_v1:has(> .row > .fxg-col:nth-child(3)):not(:has(> .row > .fxg-col > div > .aem-Grid > :not(.spacer, .button_v1)))"
      ]
    },
    {
      "id": "14",
      "name": "Manage your account for specialized services (gap page: manage-account; closes the last jump-links section)",
      "selector": [
        ".root .title_v1:has(> h2#manage-specialized-services)"
      ],
      "style": null,
      "blocks": [
        "accordion"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#manage-specialized-services)"
      ]
    },
    {
      "id": "15",
      "name": "Still have questions panel (gap page: manage-account)",
      "selector": [
        ".root .column_control_v1:not(.column_control_v1 *):has(> .row.fxg-row--has-bgcolor > .fxg-col.col-sm-10:first-child > div > .aem-Grid > .column_control_v1)"
      ],
      "style": "light",
      "blocks": [],
      "defaultContent": [
        ".root .column_control_v1:not(.column_control_v1 *):has(> .row.fxg-row--has-bgcolor > .fxg-col.col-sm-10:first-child > div > .aem-Grid > .column_control_v1)"
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

    const extraDocs = (document.importFragments || []).map((f) => ({
      element: f.element,
      path: WebImporter.FileUtils.sanitizePath(f.path),
      report: { title: f.title || f.path, template: `${PAGE_TEMPLATE.name}-fragment`, blocks: [] },
    }));

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }, ...extraDocs];
  },
};
