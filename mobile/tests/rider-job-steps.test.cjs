const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const progressFile = fs.existsSync(path.join(__dirname, '../src/design/rider-job-steps.ts'))
  ? path.join(__dirname, '../src/design/rider-job-steps.ts') : path.join(__dirname, 'rider-job-steps.ts');
const moduleValue = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(progressFile, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleValue, moduleValue.exports);
const { riderJobProgress } = moduleValue.exports;
const job = (stage, status, handoff, assignment = 'Accepted') => ({ stage, status: assignment, order: { status, handoff } });

test('pickup progress matches arrival and confirmed physical handover, not just en-route status', () => {
  assert.equal(riderJobProgress(job('Pickup', 'PickupAccepted')).current, 0);
  assert.equal(riderJobProgress(job('Pickup', 'PickupEnRoute')).current, 1);
  for (const released of [false, true]) {
    const result = riderJobProgress(job('Pickup', 'PickupEnRoute', { arrived: true, released }));
    assert.equal(result.current, 2);
    assert.match(result.detail, released ? /customer confirmed/ : /Wait for the customer/);
  }
  assert.equal(riderJobProgress(job('Pickup', 'LaundryPickedUp')).current, 3);
  assert.equal(riderJobProgress(job('Pickup', 'AtPartner', undefined, 'Completed')).current, 4);
});
test('delivery progress follows shop collection, delivery journey and customer handover', () => {
  assert.equal(riderJobProgress(job('Delivery', 'DeliveryAccepted')).current, 0);
  assert.equal(riderJobProgress(job('Delivery', 'DeliveryAccepted', { arrived: true, released: false })).current, 1);
  assert.equal(riderJobProgress(job('Delivery', 'CleanLaundryCollected')).current, 2);
  assert.equal(riderJobProgress(job('Delivery', 'OutForDelivery')).current, 2);
  assert.equal(riderJobProgress(job('Delivery', 'OutForDelivery', { arrived: true, released: true })).current, 3);
  assert.equal(riderJobProgress(job('Delivery', 'Delivered', undefined, 'Completed')).current, 4);
});
test('expired, cancelled or reassigned jobs never show completed progress', () => {
  for (const status of ['Declined', 'Expired', 'Cancelled', 'Reassigned']) {
    const result = riderJobProgress(job('Pickup', 'PickupEnRoute', undefined, status));
    assert.equal(result.complete, false); assert.equal(result.stopped, true); assert.equal(result.current, 1);
  }
});
