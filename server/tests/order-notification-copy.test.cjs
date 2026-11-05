const assert = require('node:assert/strict');
const {test} = require('node:test');
const {orderNotificationCopy,readableNotification} = require('../dist/utils/order-notification-copy');
const roles=['customer','partner','rider','admin'];
test('every workflow stage uses concise recipient-specific wording without assignment markers',()=>{
  for(const status of ['BookingPending','PickupQueued','PickupAssigned','PickupAccepted','PickupEnRoute','LaundryPickedUp','AtPartner','LaundryReceived','Washing','Drying','Folding','ReadyForDelivery','ReadyForCollection','DeliveryAssigned','DeliveryAccepted','CleanLaundryCollected','OutForDelivery','Delivered','Completed','Cancelled','Accepted','Queued','Processing','Ready']) {
    const results=roles.map(audience=>orderNotificationCopy({audience,orderId:66,action:'',status,detail:'Assignment #56 · delivery handover'}));
    assert.equal(new Set(results.map(item=>item.message)).size,4,status);
    for(const item of results) {
      assert.ok(item.title.length<=45,`${status}: ${item.title}`);
      assert.ok(item.message.length<=160,`${status}: ${item.message}`);
      assert.ok(!/Assignment #|handover marker|workflowVersion/.test(JSON.stringify(item)));
    }
  }
});
test('handover notifications tell the correct person what to do',()=>{
  const copy=(audience,action,kind)=>orderNotificationCopy({audience,orderId:66,action,status:'',detail:`Assignment #56 · ${kind} handover`});
  assert.match(copy('customer','HandoffArrived','collection').message,/rider is at the shop/);
  assert.match(copy('partner','HandoffArrived','collection').message,/Hand over the clean laundry/);
  assert.match(copy('rider','HandoffReleased','collection').message,/confirm collection/);
  assert.match(copy('customer','HandoffReleased','delivery').message,/rider will finish/);
  assert.match(copy('rider','HandoffReleased','delivery').message,/finish your job/);
  assert.notEqual(copy('customer','HandoffReleased','delivery').message,copy('rider','HandoffReleased','delivery').message);
});
test('existing notifications are reworded without changing read status or stored events',()=>{
  const old={id:1,transactionId:66,audience:'customer',shopMode:false,title:'Handover confirmed — rider can confirm receipt',message:'Order #66: Handover confirmed. Assignment #56 · delivery handover',readAt:null};
  const result=readableNotification(old);
  assert.equal(result.title,'Receipt confirmed');
  assert.equal(result.message,'Order #66: Your rider will finish the delivery.');
  assert.equal(result.id,1);assert.equal(result.readAt,null);
  assert.ok(old.message.includes('Assignment #56'));
  const complete=readableNotification({...old,title:'Completed'});
  assert.equal(complete.title,'Order complete');
  assert.ok(!complete.message.includes('Assignment'));
});
