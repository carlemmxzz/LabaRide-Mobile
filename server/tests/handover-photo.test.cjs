const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const zod = require('zod');
const source = fs.readFileSync(path.join(__dirname, '../src/controllers/handover-photo.controller.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function fixture() {
  const job = { id: 4, transactionId: 10, riderId: 7, stage: 'Pickup', status: 'Accepted', transaction: { workflowStatus: 'PickupEnRoute' } };
  const photos = [], locks = []; let active = true;
  const db = {
    deliveryAssignment: { findUnique: async () => job }, riderProfile: { findUnique: async () => ({ active }) },
    transaction: { findUnique: async ({ where, select }) => where.id === 10 ? { userId: 2, shop: { userId: 3 },
      assignments: select.assignments.where.riderId === job.riderId && ['Accepted', 'Completed'].includes(job.status) ? [{ id: job.id }] : [] } : null },
    riderHandoverPhoto: { count: async ({ where }) => photos.filter(photo => photo.kind === where.kind).length,
      create: async ({ data, select }) => { const row = { id: photos.length + 1, createdAt: new Date(), ...data }; photos.push(row); return Object.fromEntries(Object.keys(select).map(key => [key, row[key]])); },
      findMany: async ({ select }) => photos.map(row => Object.fromEntries(Object.keys(select).map(key => [key, row[key]]))),
      findFirst: async ({ where }) => photos.find(photo => photo.id === where.id && photo.transactionId === where.transactionId) || null },
    $queryRaw: async (...args) => { locks.push(args); },
  }; db.$transaction = async fn => fn(db);
  const context = { exports: {}, require(name) {
    if (name === 'zod') return zod;
    if (name.includes('config/database')) return { default: db };
    if (name.includes('utils/response')) return {
      sendError: (res, message, code, status) => res.status(status).json({ error: { message, code } }),
      sendSuccess: (res, data, _, status = 200) => res.status(status).json({ data }),
    };
    if (name.includes('utils/shop-photo')) return { prepareShopPhoto: async body => { if (body.imageBase64 !== 'valid-photo') throw Object.assign(Error('Invalid image'), { statusCode: 400 }); return Buffer.from('sanitized JPEG'); } };
    throw Error(name);
  } };
  vm.runInNewContext(compiled, context);
  async function invoke(method, { userId = 7, isRider = true, isAdmin = false, params, body } = {}) {
    const req = { user: { userId, isRider, isAdmin }, params: params || { id: method === 'upload' ? '4' : '10', photoId: '1' },
      body: body || { kind: 'CustomerPickup', imageBase64: 'valid-photo', note: 'Received laundry bags' }, app: { get: () => undefined } };
    const res = { code: 200, headers: {}, status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; }, setHeader(key, value) { this.headers[key] = value; }, send(data) { this.body = data; } };
    await context.exports.HandoverPhotoController[method](req, res, error => { res.code = error.statusCode || 400; res.body = { error: error.message }; });
    return res;
  }
  return { job, photos, locks, invoke, disable: () => { active = false; } };
}
test('assigned rider uploads sanitized bytes; metadata never returns image bytes', async () => {
  const app = fixture(), response = await app.invoke('upload');
  assert.equal(response.code, 201); assert.equal(app.photos.length, 1); assert.equal(app.photos[0].bytes.toString(), 'sanitized JPEG');
  assert.equal('bytes' in response.body.data, false); assert.equal(app.locks.length, 2);
  const list = await app.invoke('list', { userId: 2, isRider: false }); assert.equal(list.body.data.length, 1); assert.equal('bytes' in list.body.data[0], false);
});
test('unrelated users, other riders, disabled riders and reassigned jobs cannot upload', async () => {
  const app = fixture();
  assert.equal((await app.invoke('upload', { userId: 8 })).code, 404);
  assert.equal((await app.invoke('upload', { isRider: false })).code, 403);
  app.job.status = 'Reassigned'; assert.equal((await app.invoke('upload')).code, 409);
  app.job.status = 'Accepted'; app.disable(); assert.equal((await app.invoke('upload')).code, 403); assert.equal(app.photos.length, 0);
});
test('image access is limited to the involved customer, shop, assigned rider and admin', async () => {
  const app = fixture(); await app.invoke('upload');
  for (const role of [{ userId: 2, isRider: false }, { userId: 3, isRider: false }, { userId: 7 }, { userId: 99, isAdmin: true }]) {
    const response = await app.invoke('image', role); assert.equal(response.code, 200); assert.equal(response.headers['Cache-Control'], 'private, no-store');
  }
  assert.equal((await app.invoke('image', { userId: 8 })).code, 403);
  assert.equal((await app.invoke('image', { params: { id: '10', photoId: '999' } })).code, 404);
  assert.equal((await app.invoke('image', { userId: 2, params: { id: '11', photoId: '1' } })).code, 403);
});
test('wrong handover types, invalid images and a fourth photo are rejected', async () => {
  const app = fixture();
  assert.equal((await app.invoke('upload', { body: { kind: 'CustomerDelivery', imageBase64: 'valid-photo' } })).code, 400);
  assert.equal((await app.invoke('upload', { body: { kind: 'CustomerPickup', imageBase64: 'bad-photo' } })).code, 400);
  for (let i = 0; i < 3; i++) assert.equal((await app.invoke('upload')).code, 201);
  assert.equal((await app.invoke('upload')).code, 409); assert.equal(app.photos.length, 3);
});
