const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compiled = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/design/rider-job-updates.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(compiled, compiled.exports);
const { createRiderJobTracker, riderJobBadge, unseenRiderJobs, riderJobKey } = compiled.exports;

test('viewed jobs no longer count and delivery of the same order is separately unseen', () => {
  const pickup = { id: 1, stage: 'Pickup' }, another = { id: 2, stage: 'Pickup' }, delivery = { id: 1, stage: 'Delivery' };
  const seen = { [riderJobKey(pickup)]: true };
  assert.deepEqual(unseenRiderJobs([pickup, another, delivery], seen), [another, delivery]);
  assert.deepEqual(unseenRiderJobs([pickup], seen), []);
  assert.deepEqual(unseenRiderJobs([], seen), []);
  assert.deepEqual(unseenRiderJobs([pickup]), [pickup]);
});

test('first load is a baseline, new jobs alert once, and claims do not alert', () => {
  const tracker = createRiderJobTracker();
  const pickup = { id: 1, stage: 'Pickup' }, another = { id: 2, stage: 'Pickup' };
  assert.deepEqual(tracker.receive(true, [pickup]), []);
  assert.deepEqual(tracker.receive(true, [pickup, another]), [another]);
  assert.deepEqual(tracker.receive(true, [another, pickup]), []);
  assert.deepEqual(tracker.receive(true, [pickup]), []);
  const delivery = { id: 1, stage: 'Delivery' };
  assert.deepEqual(tracker.receive(true, [delivery]), [delivery]);
});
test('offline, account changes, and foreground resume reset the baseline', () => {
  const tracker = createRiderJobTracker();
  tracker.receive(true, []);
  assert.deepEqual(tracker.receive(false, [{ id: 1, stage: 'Pickup' }]), []);
  assert.deepEqual(tracker.receive(true, [{ id: 1, stage: 'Pickup' }]), []);
  tracker.reset();
  assert.deepEqual(tracker.receive(true, [{ id: 2, stage: 'Pickup' }]), []);
});
test('badge hides at zero and caps its display at 9+', () => {
  assert.equal(riderJobBadge(0), undefined);
  assert.equal(riderJobBadge(1), '1');
  assert.equal(riderJobBadge(9), '9');
  assert.equal(riderJobBadge(10), '9+');
  assert.equal(riderJobBadge(100), '9+');
});
