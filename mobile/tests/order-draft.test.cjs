const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/design/store.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;

function boot(saved = new Map(), native = false) {
  const sessionStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: key => saved.delete(key),
  };
  const context = { exports: {}, console,
    window: { sessionStorage },
    require(name) {
      if (name === 'react-native') return { Platform: { OS: native ? 'android' : 'web' } };
      if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: {
        getItem: async key => sessionStorage.getItem(key),
        setItem: async (key, value) => { sessionStorage.setItem(key, value); },
        removeItem: async key => { sessionStorage.removeItem(key); },
      } };
      return require(name);
    },
  };
  vm.runInNewContext(compiled, context);
  return { ...context.exports, saved };
}
const service = { id: 9, serviceName: 'Full Service', price: 215, packageKilos: 8 };
const shop = { id: 5, shopName: 'Test Laundry', openingTime: '08:00', closingTime: '18:00', services: [service] };

test('starting an order keeps only the chosen service even if multiple IDs are supplied', async () => {
  const app = boot();
  await app.restoreLaundryDraft('user:1');
  app.useLaundryDraft.getState().start(shop, service, [9, 10]);
  assert.equal(app.useLaundryDraft.getState().serviceIds.join(','), '9');
});

test('legacy multi-service drafts restore one canonical service and its own price', async () => {
  const saved = new Map([['labaride-draft:user:1', JSON.stringify({ version: 1, state: {
    shop: { ...shop, services: [service, { id: 10, serviceName: 'Dry', price: 55 }] },
    service: { ...service, serviceName: 'Full Service, Dry', price: 270 }, serviceIds: [9, 10], kilos: '8',
  } })]]);
  const app = boot(saved);
  await app.restoreLaundryDraft('user:1');
  const draft = app.useLaundryDraft.getState();
  assert.equal(draft.serviceIds.join(','), '9');
  assert.equal(draft.service.serviceName, 'Full Service');
  assert.equal(draft.service.price, 215);
  assert.equal(draft.kilos, '8');
});

test('browser refresh restores the entire reviewed order without persisting submission state', async () => {
  const app = boot();
  await app.restoreLaundryDraft('user:1');
  app.useLaundryDraft.getState().start(shop, service, [9]);
  app.useLaundryDraft.getState().set({ kilos: '8.5', counts: { Shirts: 3 }, notes: 'Fold separately',
    collectionMethod: 'ShopPickup', deliveryType: 'Pickup', schedule: '2026-10-24T06:00:00Z',
    address: { address_line_1: '99 Main Street', latitude: 13.62, longitude: 123.19 } });
  const reloaded = boot(app.saved);
  assert.equal(reloaded.useLaundryDraft.getState().service, null);
  await reloaded.restoreLaundryDraft('user:1');
  const restored = reloaded.useLaundryDraft.getState();
  assert.equal(restored.shop.id, 5);
  assert.equal(restored.service.id, 9);
  assert.equal(restored.serviceIds[0], 9);
  assert.equal(restored.kilos, '8.5');
  assert.equal(restored.counts.Shirts, 3);
  assert.equal(restored.notes, 'Fold separately');
  assert.equal(restored.collectionMethod, 'ShopPickup');
  assert.equal(restored.deliveryType, 'Pickup');
  assert.equal(restored.address.latitude, 13.62);
  assert.equal(restored.schedule, '2026-10-24T06:00:00Z');
  const payload = JSON.parse(app.saved.get('labaride-draft:user:1')).state;
  for (const key of ['countdown', 'busy', 'submitting', 'set', 'start']) assert.equal(key in payload, false);
});

test('saved baskets are isolated between accounts and restored when the same account returns', async () => {
  const app = boot();
  await app.restoreLaundryDraft('user:1');
  app.useLaundryDraft.getState().start(shop, service, [9]);
  await app.restoreLaundryDraft('user:2');
  assert.equal(app.useLaundryDraft.getState().shop, null);
  assert.equal(app.useLaundryDraft.getState().address, null);
  await app.restoreLaundryDraft('user:1');
  assert.equal(app.useLaundryDraft.getState().shop.id, 5);
});

test('signing out clears the in-memory basket without carrying it into another account', async () => {
  const app = boot();
  await app.restoreLaundryDraft('user:1');
  app.useLaundryDraft.getState().start(shop, service, [9]);
  app.useLaundryDraft.getState().set({ kilos: '4' });
  await app.restoreLaundryDraft(null);
  assert.equal(app.useLaundryDraft.getState().shop, null);
  app.useLaundryDraft.getState().set({ kilos: '99' });
  assert.equal(app.saved.has('labaride-draft:signed-out'), false);
  await app.restoreLaundryDraft('user:2');
  assert.equal(app.useLaundryDraft.getState().service, null);
  assert.equal(app.useLaundryDraft.getState().kilos, '');
  await app.restoreLaundryDraft('user:1');
  assert.equal(app.useLaundryDraft.getState().kilos, '4');
});

test('completing an order clears the saved basket across refreshes', async () => {
  const app = boot();
  await app.restoreLaundryDraft('user:1');
  app.useLaundryDraft.getState().start(shop, service, [9]);
  app.useLaundryDraft.getState().clearOrder();
  const reloaded = boot(app.saved);
  await reloaded.restoreLaundryDraft('user:1');
  assert.equal(reloaded.useLaundryDraft.getState().shop, null);
  assert.equal(reloaded.useLaundryDraft.getState().service, null);
  assert.equal(reloaded.useLaundryDraft.getState().kilos, '');
});

test('native asynchronous storage restores the draft and queued account changes finish in order', async () => {
  const app = boot(new Map(), true);
  await app.restoreLaundryDraft('user:1');
  app.useLaundryDraft.getState().start(shop, service, [9]);
  const reloaded = boot(app.saved, true);
  await Promise.all([reloaded.restoreLaundryDraft('user:1'), reloaded.restoreLaundryDraft('user:2')]);
  assert.equal(reloaded.useLaundryDraft.getState().service, null);
  await reloaded.restoreLaundryDraft('user:1');
  assert.equal(reloaded.useLaundryDraft.getState().service.id, 9);
});

test('corrupted storage never exposes the previous account basket', async () => {
  const app = boot();
  await app.restoreLaundryDraft('user:1');
  app.useLaundryDraft.getState().start(shop, service, [9]);
  app.saved.set('labaride-draft:user:2', 'invalid-json');
  await app.restoreLaundryDraft('user:2');
  assert.equal(app.useLaundryDraft.getState().service, null);
});
