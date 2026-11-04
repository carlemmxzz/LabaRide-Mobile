const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const vm = require('node:vm');
const sourceRoot = fs.existsSync(path.join(__dirname, '../src/design/default-address.ts'))
  ? path.join(__dirname, '../src/design') : __dirname;
const realSource = sourceRoot;
const helpers = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.join(realSource, 'address.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(helpers, helpers.exports);
function harness(fail) {
  const old = { id: 7, address_line_1: '12 Main Street', city: 'Naga', state_province: 'Camarines Sur', postal_code: '4400', country: 'Philippines', address_type: 'Home', latitude: 13.62, longitude: 123.19 };
  const selected = { ...old, address_line_1: '88 New Street', latitude: 13.7 };
  let entries = [selected]; const requests = [], keys = [];
  const context = { exports: {}, require(name) {
    if (name === './address') return helpers.exports;
    if (name === './data') return { api: { put: async (...args) => { requests.push(args); if (fail) throw new Error('API unavailable'); return { ...old, ...args[1] }; } } };
    if (name.includes('async-storage')) return { __esModule: true, default: { getItem: async key => { keys.push(key); return JSON.stringify(entries); }, setItem: async (key, value) => { keys.push(key); entries = JSON.parse(value); } } };
    throw Error(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(sourceRoot, 'default-address.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { old, selected, requests, keys, save: context.exports.saveDefaultAddress, get entries() { return entries; } };
}
test('setting a default saves the exact selected pin, preserves the previous default, and avoids duplicate saved entries', async () => {
  const app = harness(); const result = await app.save(7, app.selected, app.old);
  assert.equal(result.profile.address_line_1, '88 New Street'); assert.equal(result.profile.latitude, 13.7);
  assert.equal(app.entries.length, 2); assert.equal(app.entries[1].address_line_1, '12 Main Street');
  await app.save(7, app.selected, app.old); assert.equal(app.entries.length, 2);
  assert.equal(app.requests[0][0], '/users/7'); assert.ok(app.keys.every(key => key === 'labaride-addresses:7'));
});
test('an invalid or unpinned address cannot replace the default', async () => {
  const app = harness();
  await assert.rejects(app.save(7, { ...app.selected, latitude: null }, app.old), /map pin/);
  await assert.rejects(app.save(7, { ...app.selected, city: '' }, app.old), /required/);
  assert.equal(app.requests.length, 0);
});
test('API failure preserves both address copies and does not report success', async () => {
  const app = harness(true);
  await assert.rejects(app.save(7, app.selected, app.old), /API unavailable/);
  assert.equal(app.entries.length, 2); assert.equal(app.old.address_line_1, '12 Main Street');
});
