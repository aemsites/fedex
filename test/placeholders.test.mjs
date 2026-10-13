import { test } from 'node:test';
import assert from 'node:assert/strict';

// aem.js initializes its browser helpers on import; disable RUM in this test environment.
global.window = {
  origin: 'https://example.test',
  location: { pathname: '/en-us/home', search: '?rum=off' },
};
global.document = {};
const { fetchPlaceholders } = await import('../scripts/placeholders.js');

function mockSheets(t, responses) {
  const requested = [];
  t.mock.method(global, 'fetch', async (path) => {
    requested.push(path);
    const result = responses[path];
    if (result instanceof Error) throw result;
    const { status = 200, data = [] } = result || { status: 404 };
    return { status, ok: status === 200, json: async () => ({ data }) };
  });
  return requested;
}

test('loads default labels, normalizes keys, and shares concurrent requests', async (t) => {
  const requested = mockSheets(t, {
    '/en-us/placeholders.json': {
      data: [{ Key: 'Tracking ID', Text: 'Tracking ID' }, { Key: 'track', Text: 'Track' }],
    },
  });
  const [first, second] = await Promise.all([fetchPlaceholders(), fetchPlaceholders()]);
  assert.deepEqual(first, { trackingId: 'Tracking ID', track: 'Track' });
  assert.deepEqual(second, first);
  assert.ok(Object.isFrozen(first));
  await fetchPlaceholders('/en-us/shipping');
  assert.deepEqual(requested, ['/en-us/placeholders.json']);
});

test('merges translated keys over defaults and preserves authored empty values', async (t) => {
  const requested = mockSheets(t, {
    '/de-ch/placeholders.json': {
      data: [{ Key: 'tracking-id', Text: 'Sendungsnummer' }, { Key: 'track', Text: '' }],
    },
  });
  const labels = await fetchPlaceholders('/de-ch/home');
  assert.deepEqual(labels, { trackingId: 'Sendungsnummer', track: '' });
  assert.deepEqual(requested, ['/de-ch/placeholders.json']);
});

test('uses defaults for missing keys and reports a missing locale sheet', async (t) => {
  const warnings = [];
  t.mock.method(console, 'warn', (message) => warnings.push(message));
  const requested = mockSheets(t, {
    '/fr-ch/placeholders.json': { data: [{ Key: 'track', Text: 'Suivre' }] },
  });
  assert.deepEqual(await fetchPlaceholders('/fr-ch/home'), {
    trackingId: 'Tracking ID', track: 'Suivre',
  });
  assert.equal((await fetchPlaceholders('/it-ch/home')).track, 'Track');
  await fetchPlaceholders('/it-ch/shipping');
  assert.deepEqual(requested, ['/fr-ch/placeholders.json', '/it-ch/placeholders.json']);
  assert.match(warnings[0], /Missing placeholders sheet.*it-ch.*using/);
});

test('supports local /content paths and defaults outside locale folders', async (t) => {
  const requested = mockSheets(t, {
    '/content/en-us/placeholders.json': { data: [{ Key: 'track', Text: 'Track' }] },
    '/content/de-ch/placeholders.json': { data: [{ Key: 'track', Text: 'Verfolgen' }] },
  });
  assert.equal((await fetchPlaceholders('/content/de-ch/home')).track, 'Verfolgen');
  assert.equal((await fetchPlaceholders('/content/docs')).track, 'Track');
  assert.equal((await fetchPlaceholders('/docs')).track, 'Track');
  assert.deepEqual(requested, [
    '/content/en-us/placeholders.json', '/content/de-ch/placeholders.json',
  ]);
});

test('rejects HTTP and network errors rather than hiding them behind fallback', async (t) => {
  const responses = {
    '/es-us/placeholders.json': { status: 503 },
    '/en-gb/placeholders.json': new Error('Network unavailable'),
  };
  const requested = mockSheets(t, responses);
  await assert.rejects(fetchPlaceholders('/es-us/home'), /HTTP 503/);
  await assert.rejects(fetchPlaceholders('/en-gb/home'), /Network unavailable/);
  responses['/es-us/placeholders.json'] = { data: [{ Key: 'track', Text: 'Rastrear' }] };
  assert.equal((await fetchPlaceholders('/es-us/home')).track, 'Rastrear');
  assert.deepEqual(requested, [
    '/es-us/placeholders.json', '/en-gb/placeholders.json', '/es-us/placeholders.json',
  ]);
});

test('rejects malformed sheet data and invalid rows', async (t) => {
  const responses = {
    '/fr-ca/placeholders.json': { data: {} },
    '/es-mx/placeholders.json': { data: [{ Key: 'track' }] },
    '/de-de/placeholders.json': { data: [{ Key: '---', Text: 'Invalid' }] },
  };
  mockSheets(t, responses);
  await assert.rejects(fetchPlaceholders('/fr-ca/home'), /expected a data array/);
  await assert.rejects(fetchPlaceholders('/es-mx/home'), /expected Key and Text/);
  await assert.rejects(fetchPlaceholders('/de-de/home'), /expected Key and Text/);
  responses['/fr-ca/placeholders.json'] = { data: [{ Key: 'track', Text: 'Suivre' }] };
  assert.equal((await fetchPlaceholders('/fr-ca/home')).track, 'Suivre');
});

test('rejects invalid JSON and allows a later retry', async (t) => {
  let valid = false;
  t.mock.method(global, 'fetch', async () => ({
    status: 200,
    ok: true,
    json: async () => {
      if (!valid) throw new SyntaxError('Invalid JSON');
      return { data: [{ Key: 'track', Text: 'Track' }] };
    },
  }));
  await assert.rejects(fetchPlaceholders('/en-au/home'), /Invalid JSON/);
  valid = true;
  assert.equal((await fetchPlaceholders('/en-au/home')).track, 'Track');
});

test('rejects when the default sheet is missing', async (t) => {
  mockSheets(t, {
    '/content/fr-fr/placeholders.json': { data: [{ Key: 'track', Text: 'Suivre' }] },
  });
  // A fresh module has a separate cache, so the earlier default sheet cannot mask this case.
  const fresh = await import('../scripts/placeholders.js?missing-default');
  await assert.rejects(fresh.fetchPlaceholders('/content/fr-fr/home'), /Missing default.*en-us/);
});
