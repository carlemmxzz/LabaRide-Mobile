const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const compiled = { exports: {} };
new Function('module','exports',ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/design/invoice.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(compiled,compiled.exports);
const { invoiceText, invoiceHtml } = compiled.exports;
const invoice={number:'LR-000042',orderId:42,createdAt:'2026-11-04T00:00:00Z',updatedAt:'2026-11-04T01:00:00Z',status:'LaundryReceived',currency:'PHP',customer:{name:'<script>bad()</script>'},shop:{name:'Wash & Fold',address:'Naga',phone:'09123456789'},serviceName:'Full service',kilos:'8.25',items:[{itemName:'Shirt',quantity:3}],subtotal:'215.10',deliveryFee:'30.00',discount:'10.00',total:'235.10',paymentMethod:'Cash on Delivery'};
test('shared invoice contains saved totals, item quantities and explicit payment method',()=>{
 const text=invoiceText(invoice);assert.ok(text.includes('Total: PHP 235.10'));assert.ok(text.includes('Shirt × 3'));assert.ok(text.includes('Discount: -PHP 10.00'));assert.ok(text.includes('Cash on Delivery'));assert.ok(text.includes('PHT'));
});
test('printable invoice escapes customer content and has print styling',()=>{
 const html=invoiceHtml(invoice);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('Wash &amp; Fold'));assert.ok(html.includes('@media print'));assert.ok(html.includes('window.print()'));
});
