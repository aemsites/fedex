/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import tabsShippingParser from './parsers/tabs-shipping.js';
import notificationParser from './parsers/notification.js';
import cardsIconLinksParser from './parsers/cards-icon-links.js';
import columnsFeatureParser from './parsers/columns-feature.js';
import cardsPromoParser from './parsers/cards-promo.js';
import columnsPromoParser from './parsers/columns-promo.js';
import cardsHorizontalParser from './parsers/cards-horizontal.js';

// TRANSFORMER IMPORTS
import fedexCleanupTransformer from './transformers/fedex-cleanup.js';
import fedexSectionsTransformer from './transformers/fedex-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero': heroParser,
  'tabs-shipping': tabsShippingParser,
  'notification': notificationParser,
  'cards-icon-links': cardsIconLinksParser,
  'columns-feature': columnsFeatureParser,
  'cards-promo': cardsPromoParser,
  'columns-promo': columnsPromoParser,
  'cards-horizontal': cardsHorizontalParser,
};

// PAGE TEMPLATE CONFIGURATION - embedded from tools/importer/page-templates.json
const PAGE_TEMPLATE = {
  "name": "home",
  "description": "FedEx homepage: hero with shipping tools tabs, alert, icon quick links, feature columns, promo cards and legal footnotes",
  "urls": [
    "https://www.fedex.com/en-us/home.html"
  ],
  "blocks": [
    {
      "name": "hero",
      "instances": [
        "div.fxg-hero.fxg-hero_homepage > div.fxg-hero__image"
      ]
    },
    {
      "name": "tabs-shipping",
      "instances": [
        "div.fxg-hero__header > ul.fxg-cube-container"
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
        "div.advanced_table_v1"
      ]
    },
    {
      "name": "columns-feature",
      "instances": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.column_control_v1:nth-of-type(7)"
      ]
    },
    {
      "name": "cards-promo",
      "instances": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.column_control_v1:nth-of-type(12)"
      ]
    },
    {
      "name": "columns-promo",
      "instances": [
        "div.featured_offer_v2"
      ]
    },
    {
      "name": "cards-horizontal",
      "instances": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.column_control_v1:nth-of-type(21)",
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.column_control_v1:nth-of-type(23)",
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.column_control_v1:nth-of-type(25)"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "Hero + shipping tools tabs",
      "selector": [
        ".hero_homepage_v1"
      ],
      "style": null,
      "blocks": [
        "hero",
        "tabs-shipping"
      ],
      "defaultContent": []
    },
    {
      "id": "2",
      "name": "Alert banner",
      "selector": [
        "div.notifications"
      ],
      "style": null,
      "blocks": [
        "notification"
      ],
      "defaultContent": []
    },
    {
      "id": "3",
      "name": "Icon quick links",
      "selector": [
        "div.advanced_table_v1"
      ],
      "style": null,
      "blocks": [
        "cards-icon-links"
      ],
      "defaultContent": []
    },
    {
      "id": "4",
      "name": "Why ship with FedEx?",
      "selector": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.column_control_v1:nth-of-type(7)"
      ],
      "style": "light, center",
      "blocks": [
        "columns-feature"
      ],
      "defaultContent": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.column_control_v1:nth-of-type(8)"
      ]
    },
    {
      "id": "5",
      "name": "Delivery that works around you",
      "selector": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.title_v1:nth-of-type(10)"
      ],
      "style": null,
      "blocks": [
        "cards-promo"
      ],
      "defaultContent": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.title_v1:nth-of-type(10) h2"
      ]
    },
    {
      "id": "6",
      "name": "Go global with confidence",
      "selector": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.title_v1:nth-of-type(14)"
      ],
      "style": null,
      "blocks": [
        "columns-promo"
      ],
      "defaultContent": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.title_v1:nth-of-type(14) h2"
      ]
    },
    {
      "id": "7",
      "name": "Smarter shipping for growing businesses",
      "selector": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.title_v1:nth-of-type(19)"
      ],
      "style": null,
      "blocks": [
        "cards-horizontal"
      ],
      "defaultContent": [
        "div.fxg-wrapper div.experiencefragment .xf-content-height > .aem-Grid > div.title_v1:nth-of-type(19) h2"
      ]
    },
    {
      "id": "8",
      "name": "Legal footnotes",
      "selector": [
        "div.fxg-wrapper div.experiencefragment:nth-of-type(2)"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        "div.fxg-wrapper div.experiencefragment:nth-of-type(2)"
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
