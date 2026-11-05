const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compiled = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/design/return-delivery.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(compiled, compiled.exports);
const { returnDeliveryUpdate } = compiled.exports;
const order = { status: 'Ready', deliveryType: 'Deliver', workflowStatus: 'ReadyForDelivery' };
test('ready laundry is explicitly awaiting pickup for both audiences', () => {
  for(const workflowStatus of ['ReadyForDelivery','DeliveryAssigned']) {
    const customer = returnDeliveryUpdate({...order,workflowStatus});
    const shop = returnDeliveryUpdate({...order,workflowStatus},true);
    assert.match(customer.title,/awaiting.*pickup/i);
    assert.match(customer.description,/at the laundry shop.*pick it up.*deliver it to you/);
    assert.match(shop.description,/at your shop.*pick it up.*deliver it to the customer/);
  }
  assert.match(returnDeliveryUpdate({...order,workflowStatus:null}).title,/Awaiting rider pickup/);
});
test('claimed delivery shows rider heading to the shop, then arrival at handover', () => {
  for(const partner of [false,true]) {
    const claimed=returnDeliveryUpdate({...order,workflowStatus:'DeliveryAccepted'},partner);
    assert.equal(claimed.title,'Rider is on the way to the shop');
    assert.match(claimed.description,/claimed the delivery job/);
    assert.ok(claimed.description.includes(partner?'your shop':'the laundry shop'));
    const arrived=returnDeliveryUpdate({...order,workflowStatus:'DeliveryAccepted',handoff:{kind:'collection',arrived:true,released:false}},partner);
    assert.equal(arrived.title,'Rider arrived at the shop');
  }
});
test('collection and delivery have distinct messages; closed and pickup orders are excluded', () => {
  assert.match(returnDeliveryUpdate({...order,workflowStatus:'CleanLaundryCollected'}).title,/picked up/);
  assert.match(returnDeliveryUpdate({...order,workflowStatus:'OutForDelivery'}).title,/out for delivery/);
  assert.match(returnDeliveryUpdate({...order,workflowStatus:'Delivered'}).title,/delivered/);
  assert.equal(returnDeliveryUpdate({...order,deliveryType:'Pickup'}),null);
  assert.equal(returnDeliveryUpdate({...order,status:'Cancelled'}),null);
  assert.equal(returnDeliveryUpdate({...order,status:'Completed'}),null);
  assert.equal(returnDeliveryUpdate({...order,status:'Processing',workflowStatus:'Washing'}),null);
});
