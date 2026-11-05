export function returnDeliveryUpdate(order: { status: string; workflowStatus?: string | null; deliveryType: string; handoff?: { kind: string; arrived: boolean; released: boolean } | null }, partner = false) {
  if (order.deliveryType !== "Deliver" || ["Completed", "Cancelled"].includes(order.status)) return null;
  const status = order.workflowStatus || (order.status === "Ready" ? "ReadyForDelivery" : "");
  const location = partner ? "your shop" : "the laundry shop";
  const destination = partner ? "the customer" : "you";
  if (status === "DeliveryAccepted") {
    if (order.handoff?.kind === "collection" && order.handoff.arrived) return {
      title: "Rider arrived at the shop",
      description: partner ? "The rider has arrived to collect the clean laundry. Confirm the handover after giving it to the rider." : "The rider is at the laundry shop to collect your clean laundry for delivery.",
    };
    return {
      title: "Rider is on the way to the shop",
      description: `The rider has claimed the delivery job and is on the way to ${location} to pick up the clean laundry and deliver it to ${destination}.`,
    };
  }
  if (["ReadyForDelivery", "DeliveryAssigned"].includes(status)) return {
    title: status === "DeliveryAssigned" ? "Rider assigned · awaiting pickup" : "Awaiting rider pickup",
    description: `The laundry is ready at ${location}, awaiting a rider to pick it up and deliver it to ${destination}.`,
  };
  if (status === "CleanLaundryCollected") return { title: "Laundry picked up by rider", description: `The rider has collected the clean laundry from ${location} for delivery to ${destination}.` };
  if (status === "OutForDelivery") return { title: "Laundry out for delivery", description: `The rider is on the way to deliver the clean laundry to ${destination}.` };
  if (status === "Delivered") return { title: "Laundry delivered", description: partner ? "The rider has delivered the clean laundry. Awaiting customer confirmation." : "Your clean laundry has arrived. Confirm receipt to complete the order." };
  return null;
}
