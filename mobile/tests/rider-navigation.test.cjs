const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compiled = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/design/rider-navigation.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(compiled, compiled.exports);
const { riderNavigationUrl } = compiled.exports;

test('navigation uses valid numeric pins, including decimal strings and zero', () => {
  const url = new URL(riderNavigationUrl({ latitude: '0', longitude: '123.19', address: 'Other address' }));
  assert.equal(url.searchParams.get('destination'), '0,123.19');
  assert.equal(url.searchParams.get('travelmode'), 'driving');
  assert.equal(url.searchParams.get('dir_action'), 'navigate');
});

test('invalid and missing pins fall back to an encoded address; absent destinations fail clearly', () => {
  for (const latitude of [null, undefined, '', ' ', 'NaN', 91, Infinity]) {
    const url = new URL(riderNavigationUrl({ latitude, longitude: 123, address: '  Shop & Laundry, Naga  ' }));
    assert.equal(url.searchParams.get('destination'), 'Shop & Laundry, Naga');
  }
  assert.throws(() => riderNavigationUrl({ address: ' ' }), /no saved location/);
  assert.throws(() => riderNavigationUrl({ latitude: 13, longitude: 181 }), /no saved location/);
});
