const assert = require('node:assert/strict');
const { test } = require('node:test');
const databasePath = require.resolve('../dist/config/database');
const db = {};
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: { __esModule: true, default: db } };
const { RiderApplicationController: controller } = require('../dist/controllers/rider-application.controller');

const applicant = () => ({ userId: 7, active: false, online: false, applicationStatus: 'Draft', registeredOwner: true,
  user: { name: 'Test Rider', phone: null, birthdate: null }, documents: [] });
async function invoke(method, body = {}) {
  let error;
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await controller[method]({ user: { userId: 7 }, body }, res, failure => { error = failure; });
  return { res, error };
}

test('saving contact details updates the user and resets document verification without granting access', async () => {
  let userUpdate, profileUpdate, documentsUpdate;
  db.$transaction = callback => callback(db);
  db.$queryRaw = async () => [];
  db.riderProfile = {
    findUnique: async () => applicant(),
    update: async args => { profileUpdate = args; },
  };
  db.user = { update: async args => { userUpdate = args; } };
  db.riderDocument = { updateMany: async args => { documentsUpdate = args; } };
  const saved = await invoke('save', { name: ' Updated Rider ', phone: '09123456789', active: true });
  assert.equal(saved.error, undefined);
  assert.equal(userUpdate.where.id, 7);
  assert.equal(userUpdate.data.name, 'Updated Rider');
  assert.equal(userUpdate.data.phone, '09123456789');
  assert.equal(profileUpdate.data.applicationStatus, 'Draft');
  assert.equal(profileUpdate.data.active, undefined);
  assert.equal(documentsUpdate.where.status, 'Verified');
  assert.equal(documentsUpdate.data.status, 'Pending');
  const invalid = await invoke('save', { phone: 'not a phone' });
  assert.ok(invalid.error);
});
