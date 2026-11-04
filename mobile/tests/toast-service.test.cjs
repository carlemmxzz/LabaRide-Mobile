const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/design', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'module', code)(module.exports, module);
  return module.exports;
}
const { createToastStore } = load('toast-service.ts');
function fixture() {
  let now = 0, nextId = 0;
  const scheduled = new Map();
  const store = createToastStore({ now: () => now, set: (callback, delay) => { const id = ++nextId; scheduled.set(id, { at: now + delay, callback }); return id; }, clear: id => scheduled.delete(id) });
  function tick(ms) {
    const until = now + ms;
    while (true) {
      const entry = [...scheduled].filter(([, item]) => item.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry) break;
      now = entry[1].at; scheduled.delete(entry[0]); entry[1].callback();
    }
    now = until;
  }
  return { store, tick };
}
test('newest first; a fourth toast evicts the oldest and cancels its timer', () => {
  const { store, tick } = fixture();
  for (const title of ['one', 'two', 'three', 'four']) store.info({ title });
  assert.deepEqual(store.getSnapshot().map(item => item.title), ['four', 'three', 'two']);
  tick(4000); assert.equal(store.getSnapshot().length, 0);
});
test('keyed replacement restarts duration, retains identity and moves to the top', () => {
  const { store, tick } = fixture();
  const id = store.info({ title: 'first', key: 'job' }); tick(3000);
  store.info({ title: 'other' });
  assert.equal(store.success({ title: 'updated', key: 'job' }), id);
  assert.equal(store.getSnapshot().length, 2);
  assert.equal(store.getSnapshot()[0].title, 'updated');
  tick(3999); assert.equal(store.getSnapshot().length, 2);
  tick(1); assert.equal(store.getSnapshot().length, 0);
});
test('dismiss supports id, caller key, and all', () => {
  const { store, tick } = fixture();
  const id = store.info({ title: 'one' }); store.info({ title: 'two', key: 'two' });
  store.dismiss(id); assert.equal(store.getSnapshot().length, 1);
  store.dismiss('two'); assert.equal(store.getSnapshot().length, 0);
  store.info({ title: 'three' }); store.dismiss(); tick(10000);
  assert.equal(store.getSnapshot().length, 0);
});
test('touch pauses the remaining lifetime and resumes without resetting it', () => {
  const { store, tick } = fixture();
  const id = store.info({ title: 'one' }); tick(1000); store.pause(id);
  tick(10000); assert.equal(store.getSnapshot()[0].remaining, 3000);
  store.resume(id); tick(2999); assert.equal(store.getSnapshot().length, 1);
  tick(1); assert.equal(store.getSnapshot().length, 0);
});
test('dialog and background blockers compose; new notices wait with their full duration', () => {
  const { store, tick } = fixture();
  store.block('dialog', true); store.block('background', true);
  store.info({ title: 'queued' }); tick(10000);
  store.block('dialog', false); tick(10000); assert.equal(store.getSnapshot().length, 1);
  store.block('background', false); tick(3999); assert.equal(store.getSnapshot().length, 1);
  tick(1); assert.equal(store.getSnapshot().length, 0);
});
test('errors and actions default to six seconds; explicit duration overrides them', () => {
  const { store, tick } = fixture();
  store.error({ title: 'error' }); store.info({ title: 'action', action: { label: 'View', onPress() {} } });
  store.warning({ title: 'custom', duration: 1000 }); tick(1000);
  assert.equal(store.getSnapshot().length, 2);
  tick(4999); assert.equal(store.getSnapshot().length, 2);
  tick(1); assert.equal(store.getSnapshot().length, 0);
});
const { createNotificationTracker } = load('notification-toast-state.ts');
const notice = (id, transactionId = 42) => ({ id, transactionId, readAt: null, createdAt: new Date().toISOString() });
test('notification tracking baselines each scope and ignores backlog, repeats, reads and background arrivals', () => {
  const tracker = createNotificationTracker();
  assert.deepEqual(tracker.receive('customer', 7, [notice(1)], true), []);
  assert.deepEqual(tracker.receive('customer', 7, [notice(1), notice(2)], true).map(item => item.id), [2]);
  assert.deepEqual(tracker.receive('customer', 7, [notice(1), notice(2)], true), []);
  assert.deepEqual(tracker.receive('shop', 7, [notice(3)], true), []);
  assert.deepEqual(tracker.receive('customer', 7, [notice(4)], false), []);
  assert.deepEqual(tracker.receive('customer', 7, [notice(4)], true), []);
  assert.deepEqual(tracker.receive('customer', 7, [{ ...notice(5), readAt: 'read' }], true), []);
});
test('visible notifications are marked seen without a toast; popover only suppresses shown items', () => {
  const tracker = createNotificationTracker(); tracker.receive('customer', 7, [], true);
  const close = tracker.view({}, 'customer', [1]);
  assert.deepEqual(tracker.receive('customer', 7, [notice(1), notice(2)], true).map(item => item.id), [2]);
  close(); assert.deepEqual(tracker.receive('customer', 7, [notice(1), notice(2)], true), []);
});
test('socket-before-response arrivals wait; local event is suppressed but another order is delivered', () => {
  const tracker = createNotificationTracker(); tracker.receive('customer', 7, [notice(1)], true);
  const finish = tracker.begin(7);
  assert.deepEqual(tracker.receive('customer', 7, [notice(2), notice(3, 88)], true), []);
  finish(42);
  assert.deepEqual(tracker.receive('customer', 7, [notice(2), notice(3, 88)], true).map(item => item.id), [3]);
  assert.deepEqual(tracker.receive('customer', 7, [notice(4)], true).map(item => item.id), [4]);
});
test('failed actions do not suppress remote events; resetting an account invalidates in-flight writes', () => {
  const tracker = createNotificationTracker(); tracker.receive('customer', 7, [], true);
  tracker.begin(7)();
  assert.equal(tracker.receive('customer', 7, [notice(1)], true).length, 1);
  const old = tracker.begin(7); tracker.reset(); old(42);
  tracker.receive('customer', 8, [], true);
  assert.equal(tracker.receive('customer', 8, [notice(2)], true).length, 1);
});
test('unmatched local suppression expires rather than hiding later changes', () => {
  let now = 0; const tracker = createNotificationTracker(() => now);
  tracker.receive('customer', 7, [], true); tracker.begin(7)(42); now = 30001;
  assert.equal(tracker.receive('customer', 7, [notice(1)], true).length, 1);
});

test('resume baselines background arrivals before later foreground events', () => {
  const tracker = createNotificationTracker();
  tracker.receive('customer', 7, [notice(1)], true);
  assert.deepEqual(tracker.receive('customer', 7, [notice(2)], true, true), []);
  assert.deepEqual(tracker.receive('customer', 7, [notice(2), notice(3)], true).map(item => item.id), [3]);
});
test('notification links preserve the transaction in every role', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/design/useNotificationToasts.ts'), 'utf8');
  const ast = ts.createSourceFile('hook.ts', source, ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'openNotificationOrder');
  const code = ts.transpileModule(fn.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}, calls = [];
  new Function('exports', 'router', 'go', code)(exports, { push: value => calls.push(value) }, (...args) => calls.push(args));
  for (const scope of [{}, { shopMode: true }, { audience: 'rider' }, { audience: 'admin' }]) exports.openNotificationOrder(notice(1, 42), scope);
  assert.deepEqual(calls, [
    ['transaction-details', { id: '42' }],
    { pathname: '/shop/customers/orders/[id]', params: { id: '42' } },
    { pathname: '/rider/jobs', params: { orderId: '42' } },
    '/admin/order?id=42',
  ]);
});
