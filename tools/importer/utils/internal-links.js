/* eslint-disable */
/**
 * Links to .html pages on www.fedex.com become internal links without the extension
 * (https://www.fedex.com/en-us/shipping/returns.html -> /en-us/shipping/returns), query and hash
 * kept. Relative source hrefs are resolved against the page URL first. Other hosts and non-.html
 * paths (e.g. /fedextrack/, /secure-login/) are left unchanged.
 * Same rule as rewriteInternalLinks() in transformers/fedex-cleanup.js (page imports), which
 * keeps its own copy because transformers must be self-contained; change both together.
 */

const INTERNAL_LINK_HOST = 'www.fedex.com';

export default function rewriteInternalLinks(element, payload) {
  const base = (payload && payload.params && payload.params.originalURL) || 'https://www.fedex.com/';
  element.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href').trim();
    if (!href || href.startsWith('#')) return;
    let url;
    try {
      url = new URL(href, base);
    } catch (e) {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || url.hostname.toLowerCase() !== INTERNAL_LINK_HOST) return;
    if (!/\.html$/i.test(url.pathname)) return;
    a.setAttribute('href', `${url.pathname.replace(/\.html$/i, '')}${url.search}${url.hash}`);
  });
}
