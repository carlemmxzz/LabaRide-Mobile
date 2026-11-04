const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript'), React = require('react');
const source = fs.readFileSync(path.join(__dirname, '../src/design/CustomerRiderTracking.tsx'), 'utf8');
const ast = ts.createSourceFile('tracking.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'CustomerRiderTracking');
const compiled = ts.transpileModule(fn.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
function elements(node, type) {
  if (Array.isArray(node)) return node.flatMap(item => elements(item, type));
  if (!React.isValidElement(node)) return [];
  return [...(node.type === type ? [node] : []), ...elements(node.props.children, type)];
}
function fixture() {
  let queryOptions;
  const data = { state: 'sharing', rider: { name: 'Test Rider', stage: 'Pickup' }, location: { latitude: 13.62, longitude: 123.19, capturedAt: new Date().toISOString(), receivedAt: new Date().toISOString(), accuracy: 10 },
    customer: { latitude: 13.63, longitude: 123.2 }, shop: { latitude: 13.65, longitude: 123.22 }, staleAfterMs: 45000, serverTime: new Date().toISOString() };
  const context = { exports: {}, React, styles: {}, API_URL: 'http://localhost:5002',
    useAuthStore: select => select({ user: { id: 7 }, token: 'test-token' }), usePalette: () => ({}), useWindowDimensions: () => ({ width: 390 }),
    useQuery: options => { queryOptions = options; return { data, dataUpdatedAt: Date.now() }; },
    useState: value => [value, () => {}], useEffect: () => {}, useMemo: fn => fn(),
    message: error => error.message, fetch: async () => ({ ok: true, json: async () => ({ data }) }),
  };
  for (const name of ['Card', 'Section', 'ActivityIndicator', 'View', 'Txt', 'Button', 'RiderTrackingMap']) context[name] = name;
  vm.runInNewContext(compiled, context);
  return { data, context, render: viewer => context.exports.CustomerRiderTracking({ orderId: 42, orderStatus: 'PickupEnRoute', viewer }), get options() { return queryOptions; } };
}
test('rider and shop get trip maps with the same rider, customer and shop positions', () => {
  const app = fixture();
  for (const [viewer, title] of [['rider', 'Your trip map'], ['shop', 'Assigned rider location'], ['customer', 'Track your rider']]) {
    const tree = app.render(viewer);
    assert.equal(elements(tree, 'Section')[0].props.title, title);
    const map = elements(tree, 'RiderTrackingMap')[0].props.data;
    assert.equal(map.rider.latitude, 13.62); assert.equal(map.customer.latitude, 13.63); assert.equal(map.shop.latitude, 13.65);
    assert.equal(app.options.refetchInterval, 5000);
  }
});
test('tracking reads authenticate privately and a reassigned-resource denial stays local to the map', async () => {
  const app = fixture(); app.render('rider'); let request;
  app.context.fetch = async (url, options) => { request = { url, options }; return { ok: false, status: 403, json: async () => ({ error: { message: 'Denied' } }) }; };
  await assert.rejects(app.options.queryFn({ signal: new AbortController().signal }), /no longer available for this assignment/);
  assert.equal(request.url, 'http://localhost:5002/api/delivery/orders/42/tracking');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token'); assert.equal(request.options.cache, 'no-store');
});
