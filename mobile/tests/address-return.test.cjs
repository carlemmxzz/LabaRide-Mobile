const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

const sourceRoot = fs.existsSync(path.join(__dirname, '../src/design/ProfileScreens.tsx')) ? path.join(__dirname, '../src/design') : __dirname;
const source = fs.readFileSync(path.join(sourceRoot, 'ProfileScreens.tsx'), 'utf8');
const ast = ts.createSourceFile('ProfileScreens.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const compiled = ts.transpileModule(['AddressesDesign', 'LocationDesign'].map(name =>
  ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name).getText(ast)).join('\n'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
const addressModule = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.join(sourceRoot, 'address.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(addressModule, addressModule.exports);
function elements(element, type) {
  if (Array.isArray(element)) return element.flatMap(item => elements(item, type));
  if (!React.isValidElement(element)) return [];
  return [...(element.type === type ? [element] : []), ...elements(element.props.children, type)];
}
function harness() {
  const navigation = [], writes = [], savedWrites = [];
  const profile = { id: 7, address_line_1: '12 Main Street', city: 'Naga', state_province: 'Camarines Sur',
    postal_code: '4400', country: 'Philippines', address_type: 'Home', latitude: 13.62, longitude: 123.19 };
  const saved = { ...profile, address_line_1: '88 Saved Street' };
  const draft = { address: null, set: value => Object.assign(draft, value) };
  const context = { exports: {}, React, ...addressModule.exports,
    usePalette: () => ({}), styles: {}, useProfile: () => ({ data: profile }),
    useLaundryDraft: () => draft, useQuery: () => ({ data: [saved] }),
    useAuthStore: selector => { const auth = { user: profile, token: 'test', setAuth: async () => {} }; return selector ? selector(auth) : auth; },
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: value => ({ current: value }), useEffect: () => {},
    useFlowNavigation: () => ({ inShop: false, flowHref: screen => '/' + screen,
      go: (...args) => navigation.push(['go', ...args]) }),
    router: { dismissTo: target => navigation.push(['dismissTo', target]), back: () => navigation.push(['back']) },
    useQueryClient: () => ({ invalidateQueries: async () => {}, setQueryData: () => {} }),
    AsyncStorage: { getItem: async () => '[]', setItem: async (...args) => savedWrites.push(args) },
    api: { put: async (...args) => { writes.push(args); return profile; } },
    address: addressModule.exports.formatAddress, message: error => error.message,
    sameSavedAddress: (a, b) => JSON.stringify(addressModule.exports.addressPayload(a || {})) === JSON.stringify(addressModule.exports.addressPayload(b || {})),
    saveDefaultAddress: async (id, candidate) => {
      const payload = addressModule.exports.addressPayload(candidate);
      writes.push(['/users/' + id, payload]);
      return { profile: { ...profile, ...payload }, entries: [saved] };
    },
  };
  for (const name of ['Screen', 'Button', 'View', 'LaundryMap', 'QueryState', 'Section', 'MenuRow', 'Txt', 'Card', 'AddressFields', 'FormError']) context[name] = name;
  vm.runInNewContext(compiled, context);
  return { context, navigation, writes, savedWrites, profile, saved, draft };
}
test('selecting either primary or saved address from checkout returns directly to checkout', () => {
  const app = harness();
  const screen = app.context.exports.AddressesDesign({ checkout: true });
  const choices = elements(screen, 'MenuRow');
  choices[0].props.onPress();
  assert.equal(app.draft.address, app.profile);
  choices[1].props.onPress();
  assert.equal(app.draft.address, app.saved);
  assert.deepEqual(app.navigation, [['dismissTo', '/checkout'], ['dismissTo', '/checkout']]);
  assert.equal(app.writes.length, 0);
});
test('confirming an address opened for checkout applies it without changing the profile', async () => {
  const app = harness();
  const screen = app.context.exports.LocationDesign({ stage: 'confirm-location', checkout: true });
  await elements(screen.props.footer, 'Button')[0].props.onPress();
  assert.equal(app.draft.address.address_line_1, '12 Main Street');
  assert.deepEqual(app.navigation, [['dismissTo', '/checkout']]);
  assert.equal(app.writes.length, 0);
});
test('adding an address for checkout saves it and returns to checkout', async () => {
  const app = harness();
  // Supply a completed form to the extracted component's state hook.
  app.context.useState = initial => [typeof initial === 'function' ? addressModule.exports.addressValues(app.saved) : initial, () => {}];
  const screen = app.context.exports.LocationDesign({ stage: 'add-address', checkout: true });
  await elements(screen.props.footer, 'Button')[0].props.onPress();
  assert.equal(app.savedWrites.length, 1);
  assert.equal(app.draft.address.address_line_1, '88 Saved Street');
  assert.deepEqual(app.navigation, [['dismissTo', '/checkout']]);
  assert.equal(app.writes.length, 0);
});
test('Set as default saves the profile and returns to the address list', async () => {
  const app = harness();
  const screen = app.context.exports.LocationDesign({ stage: 'confirm-location' });
  await elements(screen.props.footer, 'Button')[0].props.onPress();
  assert.equal(app.writes.length, 1);
  assert.deepEqual(app.navigation, [['dismissTo', '/addresses']]);
});


test('saved addresses expose a Set as default action', async () => {
  const app = harness();
  const screen = app.context.exports.AddressesDesign({ checkout: true });
  const action = elements(screen, 'Button').find(item => item.props.title === 'Set as default');
  assert.ok(action); await action.props.onPress();
  assert.equal(app.writes[0][0], '/users/7');
  assert.equal(app.writes[0][1].address_line_1, '88 Saved Street');
  assert.equal(app.draft.address, null);
});

test('creating an address has separate Save address and Set as default actions', async () => {
  const app = harness();
  app.context.useState = initial => [typeof initial === 'function' ? addressModule.exports.addressValues(app.saved) : initial, () => {}];
  const screen = app.context.exports.LocationDesign({ stage: 'add-address' });
  const actions = elements(screen.props.footer, 'Button');
  assert.ok(actions.find(item => item.props.title === 'Save address'));
  await actions.find(item => item.props.title === 'Set as default').props.onPress();
  assert.equal(app.writes[0][1].address_line_1, '88 Saved Street');
  assert.equal(app.draft.address, null);
  assert.deepEqual(app.navigation, [['dismissTo', '/addresses']]);
});
