const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function source(file) { return fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'); }
function fixture() {
  let rejectResponse, logouts = 0;
  const state = { token: 'current-token', logout: async () => { logouts++; } };
  const client = { interceptors: { request: { use() {} }, response: { use(_success, failure) { rejectResponse = failure; } } } };
  const context = { exports: {}, __DEV__: true, require(name) {
    if (name === 'axios') return { __esModule: true, default: { create: () => client } };
    if (name === 'expo-constants') return { __esModule: true, default: {} };
    if (name === 'react-native') return { Platform: { OS: 'web' } };
    if (name.endsWith('authStore')) return { useAuthStore: { getState: () => state } };
    if (name === './api-address') return { resolveApiUrl: () => 'http://localhost:5002', connectionErrorMessage: () => 'Offline' };
    throw Error('Unexpected import: ' + name);
  }, process: { env: {} } };
  vm.runInNewContext(ts.transpileModule(source('api/client.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { get logouts() { return logouts; }, state,
    fail(status, error, token = 'current-token') { return rejectResponse({ response: { status, data: { error } }, config: { headers: { Authorization: 'Bearer ' + token } } }); },
  };
}
test('forbidden application and role resources preserve the signed-in rider session', async () => {
  const app = fixture();
  for (const code of ['FORBIDDEN', 'SHOP_NOT_APPROVED']) await assert.rejects(app.fail(403, { code, message: 'Administrator access required' }), failure => failure.code === code);
  assert.equal(app.logouts, 0);
});
test('expired, invalid and blocked sessions still clear the current login', async () => {
  for (const [status, error] of [[401, { code: 'UNAUTHORIZED' }], [403, { code: 'FORBIDDEN', message: 'Invalid or expired token' }], [403, { code: 'ACCOUNT_BLOCKED' }]]) {
    const app = fixture(); await assert.rejects(app.fail(status, error)); assert.equal(app.logouts, 1);
  }
});
test('a delayed auth failure from an earlier login cannot sign out a newer session', async () => {
  const app = fixture(); await assert.rejects(app.fail(401, { code: 'UNAUTHORIZED' }, 'old-token')); assert.equal(app.logouts, 0);
});

test('applicant photo and profile share the self-service endpoint; admins can inspect other riders', async () => {
  const text = source('design/RiderRequirementsScreens.tsx');
  const ast = ts.createSourceFile('requirements.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'useRiderApplication');
  let user = { id: 7 }, options, requested;
  const context = { exports: {}, useAuthStore: select => select({ user }), useQuery: value => { options = value; return value; }, api: { get: async url => { requested = url; } } };
  vm.runInNewContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  for (const id of [undefined, 7]) { context.exports.useRiderApplication(id); await options.queryFn(); assert.equal(requested, '/delivery/application'); assert.equal(options.queryKey[2], undefined); }
  user = { id: 1, isAdmin: true }; context.exports.useRiderApplication(7); await options.queryFn(); assert.equal(requested, '/delivery/applications/7');
  user = null; context.exports.useRiderApplication(); assert.equal(options.enabled, false);
});
