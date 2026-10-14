import { test } from 'node:test';
import assert from 'node:assert/strict';

// scripts/teasers.js reads a detail page's rendered head with DOMParser; a stub stands in for it:
// the "HTML" is a JSON list of meta tags plus the title.
global.window = { location: { href: 'https://main--fedex--aemsites.aem.page/en-us/how-to-hub/articles', origin: 'https://main--fedex--aemsites.aem.page', hash: '' } };
global.DOMParser = class {
  // eslint-disable-next-line class-methods-use-this
  parseFromString(text) {
    const { title = '', metas = [] } = JSON.parse(text);
    return {
      title,
      head: {
        querySelectorAll: () => metas.map((m) => ({
          getAttribute: (name) => (m[name] === undefined ? null : m[name]),
        })),
      },
    };
  }
};
const { fetchTeaserData } = await import('../scripts/teasers.js');

function mockPages(t, pages) {
  const requested = [];
  t.mock.method(global, 'fetch', async (path) => {
    requested.push(path);
    const page = pages[path];
    if (!page) return { ok: false, status: 404, text: async () => '' };
    return { ok: true, status: 200, text: async () => JSON.stringify(page) };
  });
  return requested;
}

test('reads title, description and image; site suffix dropped; first meta wins, any case', async (t) => {
  const requested = mockPages(t, {
    '/en-us/shipping/how-to-ship-a-bike': {
      title: 'How to ship a bike | FedEx',
      metas: [
        // the local preview writes the authored metadata capitalised, before its own defaults
        { property: 'og:Image', content: 'https://main--fedex--aemsites.aem.page/en-us/shipping/media_1.jpg?width=1200' },
        { property: 'og:title', content: 'How to ship a bike | FedEx' },
        { name: 'description', content: 'Get step-by-step instructions.' },
        { property: 'og:image', content: 'https://main--fedex--aemsites.aem.page/en-us/shipping/media_2.jpg' },
      ],
    },
  });
  const [a, b] = await Promise.all([
    fetchTeaserData('/en-us/shipping/how-to-ship-a-bike'),
    fetchTeaserData('/en-us/shipping/how-to-ship-a-bike'),
  ]);
  assert.deepEqual(a, {
    title: 'How to ship a bike',
    description: 'Get step-by-step instructions.',
    image: 'https://main--fedex--aemsites.aem.page/en-us/shipping/media_1.jpg?width=1200',
  });
  assert.equal(b, a);
  assert.deepEqual(requested, ['/en-us/shipping/how-to-ship-a-bike']);
});

test('falls back to the document title and og:description', async (t) => {
  mockPages(t, {
    '/en-us/sweepstakes/nfl-superbowl': {
      title: 'FedEx Super Bowl Sweepstakes | FedEx',
      metas: [{ property: 'og:description', content: 'Register now.' }],
    },
  });
  assert.deepEqual(await fetchTeaserData('/en-us/sweepstakes/nfl-superbowl'), {
    title: 'FedEx Super Bowl Sweepstakes',
    description: 'Register now.',
    image: '',
  });
});

test('a missing page or a failing request gives no teaser', async (t) => {
  mockPages(t, {});
  assert.equal(await fetchTeaserData('/en-us/shipping/how-to-ship-shoes'), null);
  t.mock.method(global, 'fetch', async () => { throw new Error('offline'); });
  assert.equal(await fetchTeaserData('/en-us/shipping/offline'), null);
});
