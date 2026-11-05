const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const compiled={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/design/notification-copy.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(compiled,compiled.exports);
const {notificationCopy}=compiled.exports;
const original={id:12,transactionId:66,readAt:null,title:'Completed',message:'Order #66: Completed. Assignment #56 · delivery handover'};
test('legacy completion and handovers are cleaned for all roles while retaining IDs and read state',()=>{
  const scopes=[{}, {shopMode:true}, {audience:'rider'}, {audience:'admin'}];
  const expected=['Order complete','Order completed','Delivery complete','Order fulfilled'];
  for(const [index,scope] of scopes.entries()) {
    const copy=notificationCopy(original,scope);
    assert.equal(copy.title,expected[index]);assert.equal(copy.id,12);assert.equal(copy.readAt,null);
    assert.ok(!copy.message.includes('Assignment'));
    const handover=notificationCopy({...original,title:'Handover confirmed — rider can confirm receipt'},scope);
    assert.ok(!handover.message.includes('Assignment'));
    assert.ok(handover.message.length<140);
  }
  assert.equal(notificationCopy({...original,title:'Handover confirmed — rider can confirm receipt'},{}).title,'Receipt confirmed');
  assert.ok(original.message.includes('Assignment #56'));
});
test('customer instructions differ from shop and rider instructions, with no internal markers',()=>{
  const arrival={...original,title:'Rider arrived — confirm the handover in order details'};
  const customer=notificationCopy(arrival,{}),shop=notificationCopy(arrival,{shopMode:true}),rider=notificationCopy(arrival,{audience:'rider'});
  assert.match(customer.message,/Receive your clean laundry/);
  assert.match(shop.message,/rider is handing over/);
  assert.match(rider.message,/Ask the customer/);
  assert.equal(new Set([customer.message,shop.message,rider.message]).size,3);
  const current={...original,title:'Rider arrived at laundry shop',message:'Order #66: Your rider is at the shop.'};
  assert.deepEqual(notificationCopy(current,{}),current,'Already cleaned copy stays intact');
});
