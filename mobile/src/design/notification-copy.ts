type Scope = { shopMode?: boolean; audience?: 'rider' | 'admin' };
type Notice = { title: string; message: string; transactionId: number };
type Copy = [string, string];
const clean = (text: string) => text.replace(/Assignment\s*#\s*\d+\s*[·—-]?\s*(?:(?:pickup|collection|delivery)\s+handover)?\.?/gi, '').replace(/\s+/g, ' ').replace(/[ ·]+$/g, '').trim();

// Compatibility for cached responses and servers still returning generic events.
// Current role-specific copy passes through; IDs/read state always stay intact.
export function notificationCopy<T extends Notice>(item: T, scope: Scope): T {
  const role = scope.audience === 'rider' ? 2 : scope.audience === 'admin' ? 3 : scope.shopMode ? 1 : 0;
  let copies: Copy[] | undefined;
  const collection = /collection handover/i.test(item.message);
  const delivery = /delivery handover/i.test(item.message);
  if (/^Handover confirmed\s*[—-]/i.test(item.title)) {
    copies = collection ? [
      ['Laundry handed to rider', 'Your clean laundry is being collected for delivery.'],
      ['Shop handover confirmed', 'The rider will confirm collection of the laundry.'],
      ['Shop confirmed handover', 'Check the laundry, then confirm collection.'],
      ['Shop released laundry', 'Waiting for the rider to confirm collection.'],
    ] : delivery ? [
      ['Receipt confirmed', 'Your rider will finish the delivery.'],
      ['Customer confirmed receipt', 'The rider is completing the delivery.'],
      ['Customer confirmed receipt', 'Confirm delivery to finish your job.'],
      ['Customer handover confirmed', 'Waiting for the rider to complete delivery.'],
    ] : [
      ['Laundry handed over', 'Your rider will confirm collection.'],
      ['Customer handed over laundry', 'The rider is confirming the customer pickup.'],
      ['Customer confirmed handover', 'Check the laundry, then confirm collection.'],
      ['Customer released laundry', 'Waiting for the rider to confirm pickup.'],
    ];
  } else if (/^Rider arrived\s*[—-]/i.test(item.title)) {
    copies = collection ? [
      ['Rider arrived at laundry shop', 'Your rider is at the shop to collect your clean laundry.'],
      ['Rider arrived at the shop', 'Hand over the clean laundry and confirm the handover.'],
      ['Shop arrival recorded', 'Ask the shop to confirm the laundry handover.'],
      ['Rider reached laundry shop', 'The rider is waiting for the shop handover.'],
    ] : delivery ? [
      ['Your rider has arrived', 'Receive your clean laundry and confirm the handover.'],
      ['Rider reached the customer', 'The rider is handing over the clean laundry.'],
      ['Customer arrival recorded', 'Ask the customer to confirm receipt.'],
      ['Rider reached delivery address', 'The rider is waiting for customer handover.'],
    ] : [
      ['Your pickup rider has arrived', 'Hand your laundry to the rider and confirm the handover.'],
      ['Rider reached pickup address', 'The rider is collecting the customer’s laundry.'],
      ['Pickup arrival recorded', 'Ask the customer to confirm the laundry handover.'],
      ['Rider reached pickup address', 'The rider is waiting for customer handover.'],
    ];
  }
  const key = item.title.replace(/\s+/g, '').toLowerCase();
  if (['completed', 'ordercompleted'].includes(key)) copies = [
    ['Order complete', 'Your clean laundry has been received. Thank you!'],
    ['Order completed', 'The customer has received their clean laundry.'],
    ['Delivery complete', 'The customer handover is complete. Your job is finished.'],
    ['Order fulfilled', 'The laundry order has been completed.'],
  ];
  const stages: Record<string, [string, string, string, string, string]> = {
    washing: ['Washing', 'Your laundry is being washed.', 'Washing started. Continue to drying when finished.', 'The shop is washing this order.', 'The shop started washing.'],
    drying: ['Drying', 'Your laundry is being dried.', 'Drying started. Fold the laundry when finished.', 'The shop is drying this order.', 'The shop started drying.'],
    folding: ['Folding', 'Your laundry is being folded.', 'Mark the laundry ready once folding is finished.', 'The shop is folding this order.', 'The shop started folding.'],
    readyfordelivery: ['Laundry ready', 'Your clean laundry is waiting for a rider at the shop.', 'The laundry is ready for rider collection.', 'Clean laundry is ready to collect from the shop.', 'The order is waiting for a delivery rider.'],
    outfordelivery: ['Out for delivery', 'Your rider is bringing your clean laundry to you.', 'The rider is delivering the laundry to the customer.', 'Mark arrival when you reach the customer.', 'The rider is heading to the customer.'],
    delivered: ['Laundry delivered', 'Confirm receipt after receiving your clean laundry.', 'The rider delivered the laundry to the customer.', 'Complete the customer handover to finish the job.', 'The laundry is awaiting customer confirmation.'],
  };
  if (stages[key]) {
    const stage = stages[key];
    copies = stage.slice(1).map((body, index) => [index === 0 ? `Your laundry: ${stage[0].toLowerCase()}` : stage[0], body]);
  }
  if (copies) {
    const [title, body] = copies[role];
    return { ...item, title, message: `Order #${item.transactionId}: ${body}` };
  }
  return { ...item, title: clean(item.title), message: clean(item.message) };
}
