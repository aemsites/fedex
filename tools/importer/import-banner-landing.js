/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroLandingParser from './parsers/hero-landing.js';
import notificationParser from './parsers/notification.js';
import cardsIconParser from './parsers/cards-icon.js';
import cardsIconLinksParser from './parsers/cards-icon-links.js';
import cardsHorizontalParser from './parsers/cards-horizontal.js';
import columnsPromoParser from './parsers/columns-promo.js';
import columnsStepsParser from './parsers/columns-steps.js';
import cardsPromoParser from './parsers/cards-promo.js';
import tabsParser from './parsers/tabs.js';
import cardsLogosParser from './parsers/cards-logos.js';
import accordionParser from './parsers/accordion.js';

// TRANSFORMER IMPORTS
import fedexCleanupTransformer from './transformers/fedex-cleanup.js';
import fedexPreprocess from './fedex-preprocess.js';
import fedexSectionsTransformer from './transformers/fedex-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-landing': heroLandingParser,
  'notification': notificationParser,
  'cards-icon': cardsIconParser,
  'cards-icon-links': cardsIconLinksParser,
  'cards-horizontal': cardsHorizontalParser,
  'columns-promo': columnsPromoParser,
  'columns-steps': columnsStepsParser,
  'cards-promo': cardsPromoParser,
  'tabs': tabsParser,
  'cards-logos': cardsLogosParser,
  'accordion': accordionParser,
};

// PAGE TEMPLATE CONFIGURATION - embedded from tools/importer/page-templates.json
const PAGE_TEMPLATE = {
  "name": "banner-landing",
  "urls": [
    "https://www.fedex.com/en-us/customer-support/claims.html",
    "https://www.fedex.com/en-us/billing-online.html",
    "https://www.fedex.com/en-us/service-guide.html",
    "https://www.fedex.com/en-us/shipping/drop-off-package.html"
  ],
  "coverageGaps": [],
  "description": "Landing page led by a purple gradient banner hero (headline, CTA, image right), followed by icon link rows, media-text rows, numbered steps and an FAQ accordion",
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
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:nth-child(3)):has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.image_v2 + .title_v1, .image_v2 + .spacer + .title_v1)):not(:has(> .row > .fxg-col > div > .aem-Grid > :is(.button_v1, .video_v1, .featured_offer_v2, .column_control_v1)))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-6:first-child > div > .aem-Grid > .column_control_v1):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .column_control_v1):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2))"
      ]
    },
    {
      "name": "cards-icon-links",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:nth-child(3)):has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2 ~ .button_v1):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .image_v2 ~ .button_v1):not(:has(> .row > .fxg-col > div > .aem-Grid > :is(.title_v1, .richtext, .column_control_v1)))"
      ]
    },
    {
      "name": "cards-horizontal",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:first-child:is(.col-sm-2, .col-sm-3, .col-sm-4) > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:nth-child(3)))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row.fxg-row--has-bgcolor > .fxg-col:first-child:is(.col-sm-2, .col-sm-3) > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.title_v1, .richtext))):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .richtext):not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1)):not(:has(> .row > .fxg-col:nth-child(3)))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-2:first-child > div > .aem-Grid > .image_v2):has(> .row > .fxg-col.col-sm-2:nth-child(2) > div > .aem-Grid > .title_v1):has(> .row > .fxg-col:nth-child(3) > div > .aem-Grid > .richtext):not(:has(> .row > .fxg-col:nth-child(4)))",
        ".root .title_v1:has(> h2#dropoffwithoutprintedlabel) ~ .column_control_v1:not(.title_v1:has(> h2#dropoffwithoutprintedlabel) ~ .featured_offer_v2 ~ *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row:not(.fxg-row--has-bgcolor) > .fxg-col.col-sm-2:first-child > div > .aem-Grid > .image_v2):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.title_v1, .richtext, .button_v1))):has(> .row > .fxg-col.col-sm-10:nth-child(2) > div > .aem-Grid > .richtext):not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > :is(.title_v1, .image_v2, .button_v1, .column_control_v1))):not(:has(> .row > .fxg-col:nth-child(3)))"
      ]
    },
    {
      "name": "columns-promo",
      "instances": [
        ".root div.featured_offer_v2:not(.column_control_v1 *)",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-6:first-child > div > .aem-Grid > :is(.image_v2, .video_v1)):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:nth-child(3)))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.image_v2, .video_v1))):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > :is(.image_v2, .video_v1)):not(:has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1)):not(:has(> .row > .fxg-col:nth-child(3)))",
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-6:first-child > div > .aem-Grid > .column_control_v1 .video_v1):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1)):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:nth-child(3)))"
      ]
    },
    {
      "name": "columns-steps",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col.col-sm-3:first-child):has(> .row > .fxg-col.col-sm-9:nth-child(2) > div > .aem-Grid > .richtext):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :not(.spacer))):not(:has(> .row > .fxg-col:nth-child(3)))"
      ]
    },
    {
      "name": "cards-promo",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.image_v2, .video_v1) ~ .title_v1):has(> .row > .fxg-col:nth-child(2)):not(:has(> .row > .fxg-col:nth-child(3)):has(> .row > .fxg-col:first-child > div > .aem-Grid > :is(.image_v2 + .title_v1, .image_v2 + .spacer + .title_v1)):not(:has(> .row > .fxg-col > div > .aem-Grid > :is(.button_v1, .video_v1, .featured_offer_v2, .column_control_v1))))"
      ]
    },
    {
      "name": "tabs",
      "instances": [
        ".root div.tabs_v1"
      ]
    },
    {
      "name": "cards-logos",
      "instances": [
        ".root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:nth-child(3)):has(img):not(:has(:is(.title_v1, .richtext, .button_v1))):not(.root .column_control_v1:not(.column_control_v1 *, .accordion_selector *, .featured_offer_v2 *, .hero_landingpage_v1 *, .tabs_v1 *, .carousel_v1 *):not(:has(> .row > .fxg-col:first-child.fxg-desktop--hide)):has(> .row > .fxg-col:nth-child(3)):has(img):not(:has(:is(.title_v1, .richtext, .button_v1))) ~ *)"
      ]
    },
    {
      "name": "accordion",
      "instances": [
        ".root div.accordion_selector:not(:has(.accordion_selector)):not(.accordion_selector + .accordion_selector)"
      ]
    }
  ],
  "representativeUrl": "https://www.fedex.com/en-us/customer-support/claims.html",
  "sections": [
    {
      "id": "1",
      "name": "Banner hero",
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
      "name": "Notices",
      "selector": [
        ".root div.notifications"
      ],
      "style": null,
      "blocks": [
        "notification"
      ],
      "defaultContent": []
    },
    {
      "id": "3",
      "name": "Your role in the claims process",
      "selector": [
        ".root div.notifications ~ .title_v1",
        ".root .column_control_v1:not(.column_control_v1 *, .hero_landingpage_v1 *):has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2)):has(> .row > .fxg-col:nth-child(2) a[href^=\"#\"]) ~ .title_v1"
      ],
      "style": null,
      "blocks": [
        "cards-icon",
        "cards-horizontal",
        "columns-promo"
      ],
      "defaultContent": [
        ".root div.notifications ~ .title_v1"
      ]
    },
    {
      "id": "4",
      "name": "How to file a single claim",
      "selector": [
        ".root .title_v1:has(> h2#singleclaim)"
      ],
      "style": null,
      "blocks": [
        "columns-steps",
        "cards-horizontal"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#singleclaim)",
        ".root .column_control_v1:not(.column_control_v1 *):has(> .row > .fxg-col:nth-child(3)):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > :not(.spacer))):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .button_v1)"
      ]
    },
    {
      "id": "5",
      "name": "How to file up to 200 claims",
      "selector": [
        ".root .title_v1:has(> h2#BatchClaim)"
      ],
      "style": null,
      "blocks": [
        "columns-steps",
        "cards-horizontal"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#BatchClaim)",
        ".root .title_v1:has(> h2#BatchClaim) ~ .button_v1"
      ]
    },
    {
      "id": "6",
      "name": "Supporting documents",
      "selector": [
        ".root .title_v1:has(> h2#documents)"
      ],
      "style": "checklist",
      "blocks": [
        "cards-horizontal"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#documents)",
        ".root .title_v1:has(> h2#documents) + .richtext",
        ".root .column_control_v1:not(.column_control_v1 *):not(:has(> .row.fxg-row--has-bgcolor)):has(> .row > .fxg-col.col-sm-2:first-child > div > .aem-Grid > .image_v2):has(> .row > .fxg-col:nth-child(2) > div > .aem-Grid > .richtext):not(:has(> .row > .fxg-col > div > .aem-Grid > .title_v1))"
      ]
    },
    {
      "id": "7",
      "name": "Be a proactive shipper or recipient",
      "selector": [
        ".root .title_v1:has(> h2#documents) ~ .title_v1"
      ],
      "style": null,
      "blocks": [
        "cards-promo",
        "columns-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#documents) ~ .title_v1"
      ]
    },
    {
      "id": "8",
      "name": "FAQs",
      "selector": [
        ".root .title_v1:has(> h2#faqs)"
      ],
      "style": null,
      "blocks": [
        "accordion"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#faqs)"
      ]
    },
    {
      "id": "9",
      "name": "Jump links panel, heading left, light (gap page: billing-online, inside the hero component)",
      "selector": [
        ".root .hero_landingpage_v1 .column_control_v1:has(> .row.fxg-row--has-bgcolor a[href^=\"#\"])"
      ],
      "style": "light, jump-links, heading-left",
      "blocks": [],
      "defaultContent": [
        ".root .hero_landingpage_v1 .column_control_v1:has(> .row.fxg-row--has-bgcolor a[href^=\"#\"])"
      ]
    },
    {
      "id": "10",
      "name": "Jump links panel, heading left (gap page: service-guide)",
      "selector": [
        ".root .column_control_v1:not(.column_control_v1 *, .hero_landingpage_v1 *):has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2)):has(> .row > .fxg-col:nth-child(2) a[href^=\"#\"])"
      ],
      "style": "jump-links, heading-left",
      "blocks": [],
      "defaultContent": [
        ".root .column_control_v1:not(.column_control_v1 *, .hero_landingpage_v1 *):has(> .row > .fxg-col:first-child > div > .aem-Grid > .title_v1):not(:has(> .row > .fxg-col:first-child > div > .aem-Grid > .image_v2)):has(> .row > .fxg-col:nth-child(2) a[href^=\"#\"])"
      ]
    },
    {
      "id": "11",
      "name": "Drop off on the go - icon jump links (gap page: drop-off-package)",
      "selector": [
        ".root .title_v1:has(~ .title_v1 > h2#packagedropoff)"
      ],
      "style": null,
      "blocks": [
        "cards-icon-links"
      ],
      "defaultContent": [
        ".root .title_v1:has(~ .title_v1 > h2#packagedropoff)"
      ]
    },
    {
      "id": "12",
      "name": "Where can I drop off - partner logos (gap page: drop-off-package)",
      "selector": [
        ".root .title_v1:has(> h2#packagedropoff)"
      ],
      "style": null,
      "blocks": [
        "cards-logos"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#packagedropoff)",
        ".root .title_v1:has(> h2#packagedropoff) + .richtext"
      ]
    },
    {
      "id": "13",
      "name": "How does drop off work - steps (gap page: drop-off-package)",
      "selector": [
        ".root .title_v1:has(> h2#dropoffwork)"
      ],
      "style": null,
      "blocks": [
        "cards-promo"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#dropoffwork)"
      ]
    },
    {
      "id": "16",
      "name": "Help line with icon, centered (gap page: drop-off-package)",
      "selector": [
        ".root .title_v1:has(> h2#dropoffwork) ~ .richtext:has(.fxg-image-component a[href*=\"/customer-support/call-us\"])"
      ],
      "style": "center",
      "blocks": [],
      "defaultContent": [
        ".root .title_v1:has(> h2#dropoffwork) ~ .richtext:has(.fxg-image-component a[href*=\"/customer-support/call-us\"])"
      ]
    },
    {
      "id": "14",
      "name": "Drop off without a printed label (gap page: drop-off-package)",
      "selector": [
        ".root .title_v1:has(> h2#dropoffwithoutprintedlabel)"
      ],
      "style": "center",
      "blocks": [
        "cards-horizontal"
      ],
      "defaultContent": [
        ".root .title_v1:has(> h2#dropoffwithoutprintedlabel)"
      ]
    },
    {
      "id": "15",
      "name": "Promo panels (gap page: drop-off-package)",
      "selector": [
        ".root .title_v1:has(> h2#dropoffwithoutprintedlabel) ~ .featured_offer_v2"
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
  // Runs before helix-importer's own DOM preprocessing (which would drop text next to `u > a`)
  preprocess: fedexPreprocess,

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
