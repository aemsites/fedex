/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: FedEx customer-support FAQ pages (templates `faq` and `support-message`).
 * Verified live (Playwright) on https://www.fedex.com/nl-nl/customer-support/faq.html,
 * faq/customs.html, faq/customs/about-customs.html, faq/customs/about-customs/fedex-clearance.html,
 * contact/thank-you.html and invoice-payments.html.
 *
 * FAQ source layout (every faq/ page):
 *   .root > [richtext h1 + hr_v1 (category pages only)]
 *         > div.column_control_v1 > div.row
 *             > div.fxg-col.col-sm-4: experiencefragment > div.content_navigation (sidebar)
 *             > div.fxg-col.col-sm-8: searchbar (site search form), page content
 *               (richtext / title_v1 / taggedpages / faqlist), survey + surveyQuestion (feedback form)
 *
 * There is no FAQ navigation, search or survey block yet (see migration-work/nl-import/REPORT.md),
 * so (decision of 2026-10-13):
 *   - the page content is unwrapped from the column control and stays default content;
 *   - the sidebar becomes a last section (style `faq-navigation`) of default content: the back link,
 *     then each sidebar group as h2 + list of links. The current page (a highlighted <span> in the
 *     source) is linked too, so a future faq-navigation block can mark it by comparing hrefs;
 *   - the search bar and the survey are dropped.
 *
 * Pages without an h1 get their first content heading promoted to h1: the support-message pages
 * (thank-you pages, invoice-payments: title_v1 h2/h3 + richtext) and FAQ questions authored as h2.
 *
 * Runs after fedex-cleanup's beforeTransform, which has already marked the sidebar's mobile-only
 * copies (.fxg-desktop--hide: "Terug" link, menu button, hr) for removal in afterTransform.
 */

const NAV_SECTION_STYLE = 'faq-navigation';
const APP_WIDGETS = ['.searchbar', '.survey', '.surveyQuestion'];

const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();

function link(doc, href, text) {
  const a = doc.createElement('a');
  a.href = href;
  a.textContent = clean(text);
  return a;
}

// Sidebar (div.content_navigation) -> [p > a back link], h2 + ul per group
function buildNavContent(nav, doc, pageUrl) {
  const out = [];
  const blocks = nav.querySelectorAll('nav .fxg-contentnavigation__block');
  blocks.forEach((block) => {
    const title = block.querySelector('.fxg-contentnavigation__title');
    const items = [...block.querySelectorAll('li.fxg-contentnavigation__list-item')];
    if (!title && !items.length) {
      // back link block ("Terug", "Terug naar de klantenservice")
      const a = block.querySelector('a[href]');
      if (a && clean(a.textContent)) {
        const p = doc.createElement('p');
        p.append(link(doc, a.getAttribute('href'), a.textContent));
        out.push(p);
      }
      return;
    }
    if (title && clean(title.textContent)) {
      const h2 = doc.createElement('h2');
      h2.textContent = clean(title.textContent);
      out.push(h2);
    }
    const ul = doc.createElement('ul');
    items.forEach((item) => {
      const a = item.querySelector('a[href]');
      const text = clean((a || item).textContent);
      if (!text) return;
      const li = doc.createElement('li');
      li.append(link(doc, a ? a.getAttribute('href') : pageUrl, text));
      ul.append(li);
    });
    if (ul.children.length) out.push(ul);
  });
  return out;
}

function restructureFaq(element, doc, pageUrl) {
  const nav = element.querySelector('.root .content_navigation');
  const cc = nav && nav.closest('.column_control_v1');
  if (!cc) return false;
  const cols = [...cc.querySelectorAll(':scope > .row > .fxg-col')];
  const mainCol = cols.find((c) => !c.contains(nav));
  if (!mainCol) return false;

  APP_WIDGETS.forEach((sel) => mainCol.querySelectorAll(sel).forEach((el) => el.remove()));
  // some questions are authored as h2 (problems-with-customs/why-pay-duty-goods-under-150);
  // category pages carry their h1 above the column control
  if (!element.querySelector('.root h1')) promoteFirstHeading(mainCol, doc);

  const navContent = buildNavContent(nav, doc, pageUrl);
  if (!navContent.length) {
    cc.replaceWith(...mainCol.childNodes);
    return true;
  }
  const metadata = WebImporter.Blocks.createBlock(doc, {
    name: 'Section Metadata',
    cells: { style: NAV_SECTION_STYLE },
  });
  cc.replaceWith(...mainCol.childNodes, doc.createElement('hr'), ...navContent, metadata);
  return true;
}

// taggedpages (auto-built question lists) and faqlist (teaser list) leftovers
function tidyLists(element) {
  element.querySelectorAll('.fxg-taggedpages__item__title, .fxg-faqlist h1, .fxg-faqlist h2, .fxg-faqlist h3')
    .forEach((h) => { if (!clean(h.textContent)) h.remove(); });
  // empty "back to customer support" anchor closing the faqlist (no text, no image)
  element.querySelectorAll('.fxg-faqlist a[href]').forEach((a) => {
    if (!clean(a.textContent) && !a.querySelector('img, picture')) a.remove();
  });
  // "Veelvoorkomende vragen" (h3 directly under the h1) -> h2, its cards hold the h3s
  element.querySelectorAll('.fxg-faqlist__block > h3').forEach((h3) => {
    const h2 = h3.ownerDocument.createElement('h2');
    h2.textContent = clean(h3.textContent);
    h3.replaceWith(h2);
  });
}

function promoteFirstHeading(element, doc) {
  const root = element.querySelector('.root') || element;
  if (root.querySelector('h1')) return;
  // first heading of the page content (not of a mobile-only duplicate)
  const first = [...root.querySelectorAll('h2, h3, h4')].find((h) => !h.closest('.fxg-desktop--hide'));
  if (!first) return;
  const h1 = doc.createElement('h1');
  h1.innerHTML = first.innerHTML.trim();
  first.replaceWith(h1);
}

export default function transform(hookName, element, payload) {
  const doc = (payload && payload.document) || element.ownerDocument;
  const pageUrl = (payload && payload.params && payload.params.originalURL) || '';

  if (hookName !== 'beforeTransform') return;
  const isFaq = restructureFaq(element, doc, pageUrl);
  tidyLists(element);
  if (!isFaq) promoteFirstHeading(element, doc);
}
