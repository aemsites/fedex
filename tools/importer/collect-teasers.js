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
    // teaser photos are JPEG / WebP; icons are PNG or SVG ("Purple Courier Icon - Small.png"
    // beside the FAQ category links, the "Purple 4.png" step numbers on tracking guides)
    .find((i) => {
      const file = (i.getAttribute('src') || '').split('/').pop().split('?')[0];
      return /\.(jpe?g|webp)$/i.test(file) && !/icon|jumplink/i.test(file);
    });
  const out = {};
  for (const listing of listingUrls) {
    const res = await fetch(listing, { credentials: 'include' });
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const root = doc.querySelector('.root') || doc.body;
    const self = new URL(listing).pathname.replace(/\.html$/, '');
    const seen = new Map();
    root.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || /^(#|javascript:|mailto:|tel:)/.test(href) || link.closest('.fxg-desktop--hide')) return;
      const target = new URL(href, listing);
      if (target.origin !== 'https://www.fedex.com') return;
      const path = target.pathname.replace(/\.html$/, '');
      if (path === self || (seen.has(path) && seen.get(path).teaser)) return;
      // nearest component (column or featured offer) holding a photo; hero and nav links are not teasers
      let cell = link.parentElement;
      while (cell && cell !== root && !(cell.matches('.fxg-col, .row, .featured_offer_v2') && photo(cell))) cell = cell.parentElement;
      if (!cell || cell === root || cell.closest('.hero_landingpage_v1')) return;
      // teaser: the link stands alone (a CTA or the linked title, not running text or a list item)
      // and is the component's only link target, as transformers/fedex-teasers.js converts them.
      // Only teasers give the detail page its image (build-teaser-pages.py): a photo beside "please
      // call customer support" in a how-to-ship guide is not the support page's picture.
      const block = link.closest('p, h1, h2, h3, h4, h5, h6, li') || link.parentElement;
      const targets = new Set([...cell.querySelectorAll('a[href]')]
        .map((a) => { try { return new URL(a.getAttribute('href'), listing).pathname.replace(/\.html$/, ''); } catch (e) { return ''; } })
        .filter((p) => p && p !== self));
      const teaser = clean(block.textContent) === clean(link.textContent) && !block.matches('li') && targets.size === 1;
      const img = photo(cell);
      const entry = {
        listing: self,
        image: new URL(img.getAttribute('src'), listing).href,
        alt: img.getAttribute('alt') || '',
        linkText: clean(link.textContent),
        teaser,
      };
      const list = (out[path] = out[path] || []);
      if (seen.has(path)) list[list.indexOf(seen.get(path))] = entry;
      else list.push(entry);
      seen.set(path, entry);
    });
  }
  return out;
}
