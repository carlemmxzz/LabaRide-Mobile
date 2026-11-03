const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const express = require('express'), jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs');
const db = {}, secret = 'customer-access-isolated-test';
for (const [file, exports] of [['../dist/config/database', { __esModule: true, default: db }], ['../dist/config/env', { env: { JWT_SECRET: secret } }]]) {
  const id = require.resolve(file); require.cache[id] = { id, filename: id, loaded: true, exports };
}
const { authenticateToken } = require('../dist/middleware/auth.middleware');
const { AuthController } = require('../dist/controllers/auth.controller');
const app = express(); app.use(express.json());
app.use('/admin', require('../dist/routes/admin.routes').default);
app.post('/login', AuthController.login);
app.get('/session', authenticateToken, (req,res) => res.json({ ok:true }));
app.use(require('../dist/middleware/error.middleware').errorHandler);
let server, root, rows, audit, disconnected, failAudit;
const password = bcrypt.hashSync('test-password', 4);
function matches(row, where) {
  return Object.entries(where || {}).every(([key,value]) => {
    if (key === 'OR') return value.some(part => matches(row,part));
    if (key === 'riderProfile') return row.riderProfile === null;
    if (value && typeof value === 'object' && 'contains' in value) return String(row[key] || '').toLowerCase().includes(value.contains.toLowerCase());
    return row[key] === value;
  });
}
function select(row, fields) { return row && (fields ? Object.fromEntries(Object.keys(fields).map(key => [key,row[key]])) : {...row}); }
beforeEach(() => {
  const base = {name:'Customer',email:'customer@example.test',phone:'09123456789',password,createdAt:new Date(),isAdmin:false,isShopOwner:false,isRider:false,riderProfile:null,isBlocked:false,accessVersion:0,blockReason:null,blockedAt:null};
  rows = [{...base,id:1},{...base,id:2,isAdmin:true},{...base,id:3,isShopOwner:true},{...base,id:4,isRider:true},{...base,id:5,riderProfile:{applicationStatus:'Draft'}}];
  audit=[];disconnected=[];failAudit=false;
  db.user = {
    findUnique: async ({where,select:fields}) => select(rows.find(row=>matches(row,where)),fields),
    findUniqueOrThrow: async args => {const row=await db.user.findUnique(args);assert.ok(row);return row;},
    count: async ({where}) => rows.filter(row=>matches(row,where)).length,
    findMany: async ({where,select:fields,skip,take}) => rows.filter(row=>matches(row,where)).slice(skip,skip+take).map(row=>select(row,fields)),
    updateMany: async ({where,data}) => {const row=rows.find(row=>matches(row,where));if(!row)return{count:0};Object.assign(row,data,{accessVersion:row.accessVersion+1});return{count:1};},
  };
  db.customerAccessReview={create:async({data})=>{if(failAudit)throw Error('Audit failed');audit.push(data);return data;}};
  db.$transaction=async work=>{if(Array.isArray(work))return Promise.all(work);const snapshot=structuredClone(rows),previous=structuredClone(audit);try{return await work(db);}catch(error){rows=snapshot;audit=previous;throw error;}};
  app.set('io',{fetchSockets:async()=>[1,2].map(userId=>({data:{userId},disconnect:()=>disconnected.push(userId)}))});
});
before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));root=`http://127.0.0.1:${server.address().port}`;});
after(()=>server.close());
async function request(path,{actor=2,body,status=200}={}) {
  const res=await fetch(root+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(actor?{Authorization:`Bearer ${jwt.sign({userId:actor,isAdmin:true},secret)}`}:{})},body:body&&JSON.stringify(body)});
  const result=await res.json();assert.equal(res.status,status,JSON.stringify(result));return result;
}
async function access(id,blocked,version=0,status=200,reason='Repeated policy violations',actor=2) {
  const res=await fetch(`${root}/admin/customers/${id}/access`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${jwt.sign({userId:actor,isAdmin:true},secret)}`},body:JSON.stringify({blocked,expectedVersion:version,reason})});
  const result=await res.json();assert.equal(res.status,status,JSON.stringify(result));return result;
}
test('admin-only listing filters protected roles and never returns passwords',async()=>{
  await request('/admin/customers',{actor:null,status:401});await request('/admin/customers',{actor:1,status:403});
  const {data}=await request('/admin/customers');assert.equal(data.total,1);assert.equal(data.customers[0].password,undefined);
  assert.equal((await request('/admin/customers?search=missing')).data.total,0);
  await request('/admin/customers?page=-1',{status:400});
});
test('block/unblock enforces login and old sessions and records both admin decisions',async()=>{
  await access(1,true);assert.deepEqual(disconnected,[1]);assert.equal(audit[0].actorId,2);
  assert.equal((await request('/admin/customers?status=Blocked')).data.total,1);
  assert.equal((await request('/session',{actor:1,status:403})).error.code,'ACCOUNT_BLOCKED');
  await request('/login',{actor:null,body:{email:'customer@example.test',password:'test-password'},status:403});
  await access(1,false,1);await request('/session',{actor:1});
  assert.ok((await request('/login',{actor:null,body:{email:'customer@example.test',password:'test-password'}})).data.token);
  assert.equal(audit.length,2);assert.equal(rows[0].blockReason,null);
});
test('reasons, role checks and version checks protect against invalid and stale decisions',async()=>{
  await access(1,true,0,400,' ');await access(1,true,0,403,'Policy violation',1);
  await access(2,true,0,403);for(const id of [3,4,5,999])await access(id,true,0,409);
  await access(1,true);await access(1,false,0,409);assert.equal(rows[0].isBlocked,true);
});
test('audit failure rolls back blocking',async()=>{failAudit=true;await access(1,true,0,500);assert.equal(rows[0].isBlocked,false);assert.equal(audit.length,0);assert.deepEqual(disconnected,[]);});
