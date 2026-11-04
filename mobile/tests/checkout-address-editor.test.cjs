const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), React = require('react');
const root = fs.existsSync(path.join(__dirname, '../src/design/CheckoutAddressEditor.tsx')) ? path.join(__dirname, '../src/design') : __dirname;
const source = fs.readFileSync(path.join(root, 'CheckoutAddressEditor.tsx'), 'utf8');
const ast = ts.createSourceFile('editor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const node = ast.statements.find(item => ts.isFunctionDeclaration(item) && item.name.text === 'CheckoutAddressEditor');
const compiled = ts.transpileModule(node.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
const helpers = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.join(root, 'address.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(helpers, helpers.exports);
function elements(node, type) {
  if (Array.isArray(node)) return node.flatMap(item => elements(item, type));
  if (!React.isValidElement(node)) return [];
  return [...(node.type === type ? [node] : []), ...elements(node.props.children, type)];
}
function harness({ fail, storageFail, request } = {}) {
  const value = { id: 7, address_line_1: '12 Main Street', city: 'Naga', state_province: 'Camarines Sur', postal_code: '4400', country: 'Philippines', address_type: 'Home', latitude: 13.62, longitude: 123.19 };
  let entries = [value], closed = 0, saved = 0, index = 0;
  const hooks = [], writes = [], cache = [], notices = [];
  const context = { exports: {}, React, styles: {}, ...helpers.exports,
    useState(initial) { const slot = index++; if (!(slot in hooks)) hooks[slot] = typeof initial === 'function' ? initial() : initial; return [hooks[slot], update => { hooks[slot] = typeof update === 'function' ? update(hooks[slot]) : update; }]; },
    useRef(initial) { const slot = index++; if (!(slot in hooks)) hooks[slot] = { current: initial }; return hooks[slot]; },
    useQueryClient: () => ({ cancelQueries: async () => {}, setQueryData: (...args) => cache.push(args) }),
    api: { put: async (url, payload) => { writes.push([url, payload]); if (request) await request; if (fail) throw Error('API unavailable'); return { ...value, ...payload }; } },
    AsyncStorage: { getItem: async () => JSON.stringify(entries), setItem: async (_, data) => { if (storageFail) throw Error('Storage unavailable'); entries = JSON.parse(data); } },
    message: error => error.message, notify: (...args) => notices.push(args),
  };
  for (const name of ['Card', 'ScrollView', 'View', 'Txt', 'Button', 'AddressFields', 'FormError']) context[name] = name;
  vm.runInNewContext(compiled, context);
  function render() { index = 0; return context.exports.CheckoutAddressEditor({ userId: 7, value, selected: value, onSaved: () => saved++, onClose: () => closed++, onBusyChange: () => {} }); }
  return { value, render, writes, cache, notices, get entries() { return entries; }, get closed() { return closed; }, get saved() { return saved; },
    edit: change => elements(render(), 'AddressFields')[0].props.setValues(current => ({ ...current, ...change })),
    save: () => elements(render(), 'Button')[0].props.onPress(), cancel: () => elements(render(), 'Button')[1].props.onPress(),
  };
}
test('saving a checkout map pin updates Profile, its saved copy, and closes the editor after success', async () => {
  const app = harness(); app.edit({ latitude: '13.7', longitude: '123.3' }); await app.save();
  assert.equal(app.writes[0][0], '/users/7'); assert.equal(app.writes[0][1].latitude, 13.7);
  assert.equal(app.cache.find(([key]) => key[0] === 'user')[1].longitude, 123.3);
  assert.equal(app.entries.length, 1); assert.equal(app.entries[0].latitude, 13.7);
  assert.equal(app.saved, 1); assert.equal(app.closed, 1);
});
test('missing pins and unconfirmed address changes cannot be saved', async () => {
  const app = harness(); app.edit({ latitude: '', longitude: '' }); await app.save(); assert.equal(app.writes.length, 0);
  app.edit({ latitude: '13.7', longitude: '123.3', pinNeedsConfirmation: 'true' }); await app.save(); assert.equal(app.writes.length, 0);
  assert.equal(app.closed, 0);
});
test('failed saves keep Profile untouched and editor open; cancellation performs no write', async () => {
  const app = harness({ fail: true }); app.edit({ latitude: '13.7' }); await app.save();
  assert.equal(app.cache.length, 0); assert.equal(app.saved, 0); assert.equal(app.closed, 0);
  assert.equal(elements(app.render(), 'FormError')[0].props.error, 'API unavailable');
  const cancelled = harness(); cancelled.edit({ latitude: '13.7' }); cancelled.cancel();
  assert.equal(cancelled.writes.length, 0); assert.equal(cancelled.closed, 1);
});
test('double save and close during save cannot duplicate or abandon an in-flight request', async () => {
  let finish; const request = new Promise(resolve => { finish = resolve; }); const app = harness({ request });
  const first = app.save(); await app.save(); app.cancel(); assert.equal(app.closed, 0);
  finish(); await first; assert.equal(app.writes.length, 1); assert.equal(app.closed, 1);
});
test('a local saved-copy failure still preserves the successful Profile update and explains the partial result', async () => {
  const app = harness({ storageFail: true }); app.edit({ latitude: '13.7' }); await app.save();
  assert.equal(app.saved, 1); assert.equal(app.closed, 1); assert.equal(app.notices.length, 1);
  assert.match(app.notices[0][1], /Profile and checkout were updated/);
});
