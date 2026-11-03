const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const express = require('express');
const { Prisma } = require('@prisma/client');
const db = {};
const id = require.resolve('../dist/config/database');
require.cache[id] = { id, filename: id, loaded: true, exports: { __esModule: true, default: db } };
const { InvoiceController } = require('../dist/controllers/invoice.controller');
let order, server, root;
const app = express();
app.get('/invoice/:id', (req,res,next) => { req.user = { userId: Number(req.headers['x-user'] || 1), isShopOwner: req.headers['x-owner'] === 'true', isRider: req.headers['x-rider'] === 'true', isAdmin: false }; next(); }, InvoiceController.get);
app.use((error,req,res,next) => res.status(500).json({ message: error.message }));
before(async () => { server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening',resolve)); root = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
beforeEach(() => {
  order = { id: 42, userId: 1, userName: 'Customer', userEmail: 'private@example.test', access_code: 'SECRET', pickupCode: '123456', deliveryCode: '654321', collectionCode: '456789', status: 'Pending', workflowStatus: 'LaundryReceived', createdAt: new Date(), updatedAt: new Date(),
    serviceName: 'Wash', kiloAmount: new Prisma.Decimal('8.25'), subtotal: new Prisma.Decimal('215.10'), deliveryFee: new Prisma.Decimal('30.00'), voucherDiscount: new Prisma.Decimal('10.00'), totalAmount: new Prisma.Decimal('235.10'), paymentMethod: 'Cash on Delivery',
    items: [{ itemName: 'Shirt', quantity: 3 }], shop: { userId: 2, approvalStatus: 'Approved', shopName: 'Laundry', address: 'Naga', contactNumber: '09123456789' }, assignments: [{ riderId: 3, status: 'Accepted' }] };
  db.transaction = { findUnique: async ({ where }) => where.id === 42 ? order : null };
});
async function get(user = 1, roles = {}, invoiceId = 42, status = 200) {
  const res = await fetch(`${root}/invoice/${invoiceId}`, { headers: { 'x-user': String(user), 'x-owner': String(!!roles.owner), 'x-rider': String(!!roles.rider) } });
  const body = await res.json(); assert.equal(res.status, status, JSON.stringify(body)); return { body, res };
}
test('customer, approved owner and assigned rider receive the same saved amounts and stable invoice number', async () => {
  for(const [user,roles] of [[1,{}],[2,{owner:true}],[3,{rider:true}]]) {
    const { body: { data }, res } = await get(user, roles);
    assert.equal(data.number, 'LR-000042'); assert.equal(data.subtotal,'215.10'); assert.equal(data.total,'235.10'); assert.equal(data.kilos,'8.25');
    assert.equal(res.headers.get('cache-control'),'private, no-store');
    for(const field of ['userEmail','access_code','pickupCode','collectionCode','deliveryCode','assignments','userId']) assert.equal(data[field], undefined);
  }
});
test('unrelated users, unapproved owners and offered/reassigned riders cannot access invoices', async () => {
  await get(8,{},42,403); await get(8,{rider:true},42,403); await get(8,{owner:true},42,403);
  order.shop.approvalStatus='Suspended'; await get(2,{owner:true},42,403);
  for(const status of ['Offered','Rejected','Reassigned','Expired','Cancelled']) { order.assignments[0].status=status; await get(3,{rider:true},42,403); }
  order.assignments[0].status='Completed'; await get(3,{rider:true});
  await get(3,{},42,403);
});
test('invalid and missing orders fail clearly; current measured prices and cancelled state are preserved', async () => {
  await get(1,{},'invalid',400); await get(1,{},0,400); await get(1,{},999,404);
  order.workflowStatus='Cancelled'; order.totalAmount=new Prisma.Decimal('300.25');
  const {body:{data}}=await get(); assert.equal(data.total,'300.25'); assert.equal(data.status,'Cancelled'); assert.equal(data.paymentMethod,'Cash on Delivery');
  assert.equal(data.paid,undefined);
});
