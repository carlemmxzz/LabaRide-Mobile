export type Invoice = {
  number: string; orderId: number; createdAt: string; updatedAt: string; status: string; currency: string;
  customer: { name: string }; shop: { name: string; address: string; phone: string };
  serviceName: string; kilos: string; items: { itemName: string; quantity: number }[];
  subtotal: string; deliveryFee: string; discount: string; total: string; paymentMethod: string;
};
export const invoiceMoney = (value: string) => `PHP ${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const invoiceDate = (value: string) => new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' (PHT)';
export function invoiceText(invoice: Invoice) {
  return [
    'LabaRide · Invoice', invoice.number, `Order #${invoice.orderId}`, `Order date: ${invoiceDate(invoice.createdAt)}`,
    `Status: ${invoice.status.replace(/([a-z])([A-Z])/g, '$1 $2')}`, `Shop: ${invoice.shop.name}`, invoice.shop.address, invoice.shop.phone,
    `Customer: ${invoice.customer.name}`, `Service: ${invoice.serviceName} · ${invoice.kilos} kg`,
    ...invoice.items.map(item => `${item.itemName} × ${item.quantity}`),
    `Service subtotal: ${invoiceMoney(invoice.subtotal)}`, `Delivery fee: ${invoiceMoney(invoice.deliveryFee)}`,
    `Discount: -${invoiceMoney(invoice.discount)}`, `Total: ${invoiceMoney(invoice.total)}`, `Payment method: ${invoice.paymentMethod}`,
    `Amounts as of: ${invoiceDate(invoice.updatedAt)}`, 'Charges may change after measured weight is confirmed. Order status does not confirm payment.',
  ].filter(Boolean).join('\n');
}
export function invoiceHtml(invoice: Invoice) {
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(invoice.number)}</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#1e293b;max-width:720px;margin:48px auto;padding:24px}h1{color:#124d67}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}button{padding:12px 20px;cursor:pointer}@media print{button{display:none}body{margin:0}}</style></head><body><h1>Invoice ${escape(invoice.number)}</h1><pre>${escape(invoiceText(invoice))}</pre><button onclick="window.print()">Print / Save PDF</button></body></html>`;
}
