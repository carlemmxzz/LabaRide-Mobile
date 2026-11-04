const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const designRoot = fs.existsSync(path.join(__dirname, '../src/design/AddressFields.tsx')) ? path.join(__dirname, '../src/design') : __dirname;
const source = fs.readFileSync(path.join(designRoot, 'AddressFields.tsx'), 'utf8');
const ast = ts.createSourceFile('AddressFields.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'AddressFields');
const compiled = ts.transpileModule(component.getText(ast), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022,
} }).outputText;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function elements(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, type));
  if (!React.isValidElement(node)) return [];
  return [...(node.type === type ? [node] : []), ...elements(node.props.children, type)];
}
function harness({ gps, geocode } = {}) {
  let values = { city: 'Old City', latitude: '13.28', longitude: '123.19' }, index = 0;
  const hooks = [], requested = []; let cleanup;
  const context = { exports: {}, React, styles: {},
    coordinates: value => value.latitude && value.longitude ? { latitude: Number(value.latitude), longitude: Number(value.longitude) } : null,
    useState(initial) { const slot = index++; if (!(slot in hooks)) hooks[slot] = initial; return [hooks[slot], value => { hooks[slot] = value; }]; },
    useRef(initial) { const slot = index++; if (!(slot in hooks)) hooks[slot] = { current: initial }; return hooks[slot]; },
    useEffect: effect => { cleanup = effect(); },
    Location: { Accuracy: { High: 'high' }, requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
      getCurrentPositionAsync: async options => { requested.push(options); return gps ? gps() : { coords: { latitude: 13.62, longitude: 123.19 } }; } },
    reverseGeocodeCoordinates: geocode || (async () => ({})),
  };
  for (const name of ['View', 'Txt', 'Field', 'AddressSelect', 'Section', 'Button', 'FormError', 'LaundryMap', 'Choice']) context[name] = name;
  vm.runInNewContext(compiled, context);
  function render() { index = 0; return context.exports.AddressFields({ values, setValues: update => { values = typeof update === 'function' ? update(values) : update; } }); }
  return { render, get values() { return values; }, requested, close: () => cleanup?.(),
    locate: () => elements(render(), 'Button')[0].props.onPress(),
    pin: point => elements(render(), 'LaundryMap')[0].props.onPin(point),
    field: label => elements(render(), 'Field').find(field => field.props.label === label) ||
      (() => { const select = elements(render(), 'AddressSelect').find(field => field.props.label === label); return select && { props: { ...select.props, onChangeText: select.props.onChange } }; })(),
  };
}
test('current GPS pin is applied before address lookup and survives lookup failure', async () => {
  const lookup = deferred();
  const app = harness({ geocode: () => lookup.promise });
  const locating = app.locate();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.values.latitude, '13.62'); assert.equal(app.values.longitude, '123.19');
  assert.equal(app.requested[0].accuracy, 'high');
  lookup.reject(Error('Geocoder unavailable')); await locating;
  assert.equal(app.values.latitude, '13.62');
  assert.equal(elements(app.render(), 'Button')[0].props.busy, false);
});
test('late reverse geocoding cannot restore the previous map pin', async () => {
  const first = deferred(), second = deferred(); let calls = 0;
  const app = harness({ geocode: () => (++calls === 1 ? first : second).promise });
  const old = app.pin({ latitude: 13.28, longitude: 123.19 });
  const latest = app.pin({ latitude: 13.62, longitude: 123.2 });
  second.resolve({ city: 'New City' }); await latest;
  first.resolve({ city: 'Old City' }); await old;
  assert.equal(app.values.latitude, '13.62'); assert.equal(app.values.longitude, '123.2'); assert.equal(app.values.city, 'New City');
});
test('a delayed GPS result cannot replace a pin selected after the GPS request', async () => {
  const gps = deferred(); const app = harness({ gps: () => gps.promise });
  const locating = app.locate(); await new Promise(resolve => setImmediate(resolve));
  await app.pin({ latitude: 13.63, longitude: 123.2 });
  gps.resolve({ coords: { latitude: 13.28, longitude: 123.19 } }); await locating;
  assert.equal(app.values.latitude, '13.63'); assert.equal(elements(app.render(), 'Button')[0].props.busy, false);
});
test('correcting address text preserves the selected pin and asks the user to check it', () => {
  const app = harness();
  app.field('Address line 2 (optional)').props.onChangeText('Unit 2');
  assert.equal(app.values.latitude, '13.28');
  app.field('City / Municipality *').props.onChangeText('New City');
  assert.equal(app.values.latitude, '13.28'); assert.equal(app.values.longitude, '123.19');
  assert.match(elements(app.render(), 'FormError')[0].props.error, /address changed/);
  assert.equal(app.values.pinNeedsConfirmation, 'true');
  elements(app.render(), 'Button').find(button => button.props.title === 'Confirm existing pin matches this address').props.onPress();
  assert.equal(app.values.pinNeedsConfirmation, 'false');
});

test('placing a new pin resolves the changed-address confirmation', async () => {
  const app = harness();
  app.field('City / Municipality *').props.onChangeText('New City');
  assert.equal(app.values.pinNeedsConfirmation, 'true');
  await app.pin({ latitude: 13.7, longitude: 123.3 });
  assert.equal(app.values.pinNeedsConfirmation, 'false');
  assert.equal(app.values.latitude, '13.7');
});

test('correcting text after pinning prevents a pending lookup from overwriting the correction or pin', async () => {
  const lookup = deferred(); const app = harness({ geocode: () => lookup.promise });
  const pending = app.pin({ latitude: 13.62, longitude: 123.19 });
  app.field('City / Municipality *').props.onChangeText('Correct City');
  lookup.resolve({ city: 'Geocoder City' }); await pending;
  assert.equal(app.values.city, 'Correct City');
  assert.equal(app.values.latitude, '13.62'); assert.equal(app.values.longitude, '123.19');
});

test('closing the checkout editor prevents a late address lookup from changing the next edit', async () => {
  const lookup = deferred(); const app = harness({ geocode: () => lookup.promise });
  const pending = app.pin({ latitude: 13.62, longitude: 123.19 });
  app.close(); lookup.resolve({ city: 'Late result' }); await pending;
  assert.equal(app.values.city, 'Old City');
});
