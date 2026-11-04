export type RiderProgressJob = {
  stage: string;
  status: string;
  order: { status: string; handoff?: { arrived: boolean; released: boolean } };
};

export function riderJobProgress(job: RiderProgressJob) {
  const pickup = job.stage === 'Pickup';
  const steps = pickup ? ['Assigned', 'En route', 'Pickup', 'To shop', 'Complete']
    : ['Assigned', 'Collection', 'En route', 'Handover', 'Complete'];
  const complete = job.status === 'Completed';
  const stopped = !['Offered', 'Accepted', 'Completed'].includes(job.status);
  const status = job.order.status;
  const handoff = job.order.handoff;
  let current = 0;
  let detail = job.status === 'Offered' ? 'Accept this offer to start the trip.' : 'Assignment accepted. Start the trip when ready.';
  if (pickup) {
    if (status === 'PickupEnRoute') {
      current = handoff?.arrived ? 2 : 1;
      detail = !handoff?.arrived ? 'Travel to the customer to collect the laundry.'
        : handoff.released ? 'The customer confirmed handover. Check the laundry and confirm receipt.'
        : 'You have arrived. Wait for the customer to confirm the laundry handover.';
    } else if (status === 'LaundryPickedUp' || status === 'AtPartner') {
      current = 3;
      detail = status === 'AtPartner' ? 'Laundry is at the shop.' : 'Laundry collected. Take it to the shop and confirm arrival.';
    } else if (status === 'PickupFailed') {
      current = 1;
      detail = 'Pickup was unsuccessful. Check the job outcome or contact support.';
    }
  } else {
    if (status === 'DeliveryAccepted') {
      current = handoff?.arrived ? 1 : 0;
      detail = !handoff?.arrived ? 'Travel to the laundry shop to collect the clean laundry.'
        : handoff.released ? 'The shop confirmed handover. Check the laundry and confirm receipt.'
        : 'You have arrived at the shop. Wait for the shop to confirm handover.';
    } else if (status === 'CleanLaundryCollected') {
      current = 2; detail = 'Clean laundry collected. Start the delivery trip to the customer.';
    } else if (status === 'OutForDelivery') {
      current = handoff?.arrived ? 3 : 2;
      detail = !handoff?.arrived ? 'Take the clean laundry to the customer.'
        : handoff.released ? 'The customer confirmed receipt. Finish the delivery step.'
        : 'You have arrived. Wait for the customer to confirm receipt of the clean laundry.';
    } else if (status === 'Delivered') {
      current = 3; detail = 'The clean laundry was delivered to the customer.';
    }
  }
  if (complete) { current = 4; detail = pickup ? 'Pickup complete. Laundry handed over to the shop.' : 'Delivery complete. Clean laundry handed over to the customer.'; }
  else if (stopped) detail = `Assignment ${job.status.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}.`;
  return { steps, current, detail, complete, stopped };
}
