/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsParser from './parsers/cards.js';

// TRANSFORMER IMPORTS
import fedexCleanupTransformer from './transformers/fedex-cleanup.js';
import fedexFaqTransformer from './transformers/fedex-faq.js';
import fedexPreprocess from './fedex-preprocess.js';

// PARSER REGISTRY
const parsers = {
  cards: cardsParser,
};

// PAGE TEMPLATE CONFIGURATION - embedded from tools/importer/page-templates.json
const PAGE_TEMPLATE = {
  "name": "faq",
  "urls": [
    "https://www.fedex.com/nl-nl/customer-support/faq.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/about-duties-taxes.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/about-duties-taxes/how-is-duty-and-tax-applied.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/about-duties-taxes/why-do-i-have-to-pay-customs-charges.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/about-duties-taxes/what-are-duties-and-taxes.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/paying-duties-taxes.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/paying-duties-taxes/how-is-duty-calculated.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/paying-duties-taxes/disbursement-fee-shipping.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/paying-duties-taxes/how-to-pay-duties-taxes.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/paying-duties-taxes/who-pays-custom-duties-taxes.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/paying-duties-taxes/when-do-you-pay-customs-fees.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/when-do-duties-and-taxes-apply.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/when-do-duties-and-taxes-apply/paying-customs-on-online-orders.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/when-do-duties-and-taxes-apply/duties-taxes-visiting-from-abroad.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/when-do-duties-and-taxes-apply/import-duty-on-second-hand-goods.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/when-do-duties-and-taxes-apply/import-duty-on-samples.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/when-do-duties-and-taxes-apply/customs-duty-on-gifts-from-abroad.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/problems-with-customs.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/problems-with-customs/fedex-advise-duties-taxes-delivery.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/problems-with-customs/why-i-am-charged-after-duties-taxes-prepaid.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/problems-with-customs/return-shipment-refund-duties-taxes.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/duties-taxes-imported-goods/problems-with-customs/why-pay-duty-goods-under-150.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-customs.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-customs/declaring-value-for-customs.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-customs/fedex-clearance.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-codes.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-codes/what-is-mid-code-manufacturer-identification-code.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-codes/how-to-generate-mid-code.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-codes/what-is-an-eori-number.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-codes/what-is-hs-code.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-documents.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-documents/customs-clearance-documents.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-documents/what-is-certificate-of-origin.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-documents/what-is-ca-certificate-authorization.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-documents/what-is-poa-power-of-attorney.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-documents/what-are-test-certificates.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-documents/do-i-need-port-health-certificate.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-documents/what-is-a-bill-of-landing-bol.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/customs-documents/why-are-goods-descriptions-important.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-importing.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-importing/what-does-free-circulation-of-goods-mean.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-importing/how-to-import-samples.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-importing/how-to-import-personal-goods.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-importing/what-are-temporary-imports.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-importing/temporary-import-for-repair.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-importing/how-can-i-import-a-shipment.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/booking-shipment.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/booking-shipment/ship-without-account-number.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/booking-shipment/fedex-shipping-costs.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/booking-shipment/fedex-book-shipment.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents/export-license.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents/safety-compliance-certificate.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents/difference-between-a-document-and-non-document-product-shipment.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents/what-is-a-commercial-invoice.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents/email-shipping-label.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents/how-do-i-write-goods-description-for-shipment.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents/packing-list-fedex.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents/material-safety-data-sheets.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-documents/what-is-an-air-waybill.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/what-goods-can-i-send.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/what-goods-can-i-send/can-i-ship-lithium-batteries.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/what-goods-can-i-send/prohibited-shipping-items.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/what-goods-can-i-send/shipping-dangerous-goods.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/what-goods-can-i-send/send-prescription-drugs-to-us.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-terms.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-terms/what-are-incoterms.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/shipping-terms/shipper-consignee.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/tracking-questions.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/tracking-questions/what-is-a-fedex-delivery-exception.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/tracking-questions/when-will-my-fedex-package-arrive.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/pickups.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/pickups/what-time-does-Fedex-pickup.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/pickups/schedule-pickup-fedex.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/pickups/how-to-cancel-fedex-pickup.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/pickups/nearest-drop-off.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/sending/pickups/How-do-I-schedule-a-pickup-for-a-return-shipment.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving/tracking-questions.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving/tracking-questions/where-is-my-package.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving/tracking-questions/fedex-proof-of-delivery.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving/tracking-questions/how-to-track-a-package-without-a-tracking-number.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving/tracking-questions/why-is-my-package-stuck-at-customs.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving/tracking-questions/fedex-tracking-status-meaning.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving/delivery-options-fedex.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving/delivery-options-fedex/change-fedex-delivery-address.html",
    "https://www.fedex.com/nl-nl/customer-support/faq/receiving/delivery-options-fedex/reschedule-fedex-delivery.html"
  ],
  "coverageGaps": [
    "FAQ sidebar navigation (div.content_navigation): no block yet, imported as a last `faq-navigation` section of default content",
    "Search bar (div.searchbar, site search form): no block yet, dropped",
    "Feedback survey (div.survey / div.surveyQuestion): no block yet, dropped",
    "Tagged question lists (div.taggedpages) are generated by AEM from page tags: imported as static link lists"
  ],
  "description": "Customer-support FAQ pages (start page, category, topic and question pages): FAQ sidebar navigation, search bar, title, answer text or question lists, feedback survey",
  "blocks": [
    {
      "name": "cards",
      "instances": [
        ".root .faqlist .fxg-faqlist__sneak-peek"
      ]
    }
  ],
  "representativeUrl": "https://www.fedex.com/nl-nl/customer-support/faq/customs/about-customs/fedex-clearance.html"
};

// TRANSFORMER REGISTRY - cleanup first, then the FAQ restructuring (single-section template:
// fedex-faq.js adds the faq-navigation section itself)
const transformers = [
  fedexCleanupTransformer,
  fedexFaqTransformer,
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

    // 1. Initial cleanup, FAQ layout -> content + faq-navigation section
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

    // 4. Final cleanup
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

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
