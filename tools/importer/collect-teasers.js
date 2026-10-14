/* eslint-disable */
// Collects the teasers of fedex.com listing pages: for every link to another fedex.com page, the
// nearest enclosing component that also holds a photo is the teaser; records the target path, the
// photo and the link text. Run inside a loaded fedex.com page (fedex.com is bot-protected, so not
// from Node), e.g. with the Playwright MCP browser: page.evaluate(`(${source})(listingUrls)`).
// Save the result as tools/importer/teasers-collected.json and run build-teaser-pages.py: detail
// pages get their listing teaser image as metadata Image, and listings link to the detail pages
// instead of repeating title, text and image.
async (listingUrls) => {
  const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const photo = (el) => [...el.querySelectorAll('img')]
    .find((i) => !/\.svg(\?|$)|jumplink|_Icon_/i.test(i.getAttribute('src') || ''));
  const out = {};
  for (const listing of listingUrls) {
    const res = await fetch(listing, { credentials: 'include' });
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const root = doc.querySelector('.root') || doc.body;
    const self = new URL(listing).pathname.replace(/\.html$/, '');
    const seen = new Set();
    root.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || /^(#|javascript:|mailto:|tel:)/.test(href) || link.closest('.fxg-desktop--hide')) return;
      const target = new URL(href, listing);
      if (target.origin !== 'https://www.fedex.com') return;
      const path = target.pathname.replace(/\.html$/, '');
      if (path === self || seen.has(path)) return;
      // nearest component (column or featured offer) holding a photo; hero and nav links are not teasers
      let cell = link.parentElement;
      while (cell && cell !== root && !(cell.matches('.fxg-col, .row, .featured_offer_v2') && photo(cell))) cell = cell.parentElement;
      if (!cell || cell === root || cell.closest('.hero_landingpage_v1')) return;
      seen.add(path);
      const img = photo(cell);
      (out[path] = out[path] || []).push({
        listing: self,
        image: new URL(img.getAttribute('src'), listing).href,
        alt: img.getAttribute('alt') || '',
        linkText: clean(link.textContent),
      });
    });
  }
  return out;
}
