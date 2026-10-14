/*
 * Teasers built from the pages they link to. In a block with the `teasers` variant, a row holding
 * nothing but a link to a page of this site is filled at runtime from that page's metadata:
 * image (og:image), title (og:title without the " | FedEx" site suffix) and description. Listings
 * (how-to-hub/articles, sweepstakes) link to their detail pages instead of repeating title, text
 * and image, so a teaser always shows what the detail page currently says.
 *
 * The authored link text is the CTA; when it is just the page's URL or path, or repeats the title
 * (case-insensitive), the title itself becomes the link. Rows whose page cannot be loaded are
 * dropped.
 */

const pages = new Map();

/**
 * Reads the teaser data of a page from its rendered head (cached per path).
 * @param {string} path Page path on this site
 * @returns {Promise<{title: string, description: string, image: string}|null>}
 */
export function fetchTeaserData(path) {
  if (!pages.has(path)) {
    pages.set(path, fetch(path)
      .then(async (res) => {
        if (!res.ok) return null;
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        // meta names case-insensitively, first one wins (the authored metadata comes first)
        const metas = {};
        doc.head.querySelectorAll('meta[content]').forEach((m) => {
          const key = (m.getAttribute('property') || m.getAttribute('name') || '').toLowerCase();
          if (key && !(key in metas)) metas[key] = m.getAttribute('content').trim();
        });
        const title = (metas['og:title'] || doc.title || '').replace(/\s+\|\s+FedEx\s*$/i, '');
        if (!title) return null;
        return {
          title,
          description: metas.description || metas['og:description'] || '',
          image: metas['og:image'] || '',
        };
      })
      .catch(() => null));
  }
  return pages.get(path);
}

/**
 * The link of a teaser row: the row's only content is one link to a page of this site.
 * @param {Element} row Block row
 * @returns {HTMLAnchorElement|null}
 */
export function teaserLink(row) {
  const links = row.querySelectorAll('a[href]');
  if (links.length !== 1 || row.querySelector('picture, img')) return null;
  const [a] = links;
  if (row.textContent.trim() !== a.textContent.trim()) return null;
  const url = new URL(a.href, window.location.href);
  return url.origin === window.location.origin ? a : null;
}

const norm = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Builds the teaser content for a row link.
 * @param {HTMLAnchorElement} a The row's link
 * @returns {Promise<{id: string, picture: Element|null, body: Element[]}|null>} null when the
 * linked page cannot be loaded
 */
export async function buildTeaser(a) {
  const url = new URL(a.href, window.location.href);
  const data = await fetchTeaserData(url.pathname);
  if (!data) return null;

  let picture = null;
  if (data.image) {
    picture = document.createElement('picture');
    const img = document.createElement('img');
    // same-origin path: the og:image host is the one the page was rendered for
    const src = new URL(data.image, window.location.href);
    img.src = `${src.pathname}${src.search}`;
    img.alt = '';
    picture.append(img);
  }

  const h3 = document.createElement('h3');
  const body = [h3];
  const cta = a.closest('p') || a;
  // no label of its own: the link text repeats the title, or is the page's URL or path
  const label = a.textContent.trim();
  const bare = /^(https?:\/\/|\/)\S*$/.test(label);
  if (bare || norm(label) === norm(data.title)) {
    const link = document.createElement('a');
    link.href = a.href;
    link.textContent = data.title;
    h3.append(link);
  } else {
    h3.textContent = data.title;
  }
  if (data.description) {
    const p = document.createElement('p');
    p.textContent = data.description;
    body.push(p);
  }
  if (!h3.querySelector('a')) body.push(cta);
  return { id: url.pathname.split('/').pop(), picture, body };
}

/**
 * Gives a teaser item the id of its page (the last path segment), so in-page jump links
 * (#how-to-ship-a-bike) reach it, and scrolls to it when the page was opened with that hash
 * (the item did not exist yet when the browser looked for the target).
 * @param {Element} item The teaser's rendered item
 * @param {string} id The page's last path segment
 */
export function anchorTeaser(item, id) {
  if (!id || document.getElementById(id)) return;
  item.id = id;
  if (window.location.hash === `#${id}`) {
    requestAnimationFrame(() => item.scrollIntoView());
  }
}
