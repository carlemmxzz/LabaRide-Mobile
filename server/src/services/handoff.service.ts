export type HandoffOrder = { workflowStatus: string | null; assignments: { id: number; riderId: number; stage: string; status: string }[] };
type HandoffEvent = { action: string; detail: string | null };
export const handoffListSelection = {
  assignments: { select: { id: true, riderId: true, stage: true, status: true } },
  events: {
    where: { action: { in: ['wash', 'dry', 'HandoffArrived', 'HandoffReleased'] } },
    orderBy: { createdAt: 'asc' as const },
    select: { action: true, detail: true, fromStatus: true, toStatus: true, createdAt: true },
  },
};
export function handoffSummary(order: { workflowStatus?: string | null; assignments?: HandoffOrder['assignments'] }, events: HandoffEvent[] = []) {
  const state = handoffState({ workflowStatus: order.workflowStatus || null, assignments: order.assignments || [] }, events);
  return state ? { kind: state.kind, arrived: state.arrived, released: state.released } : undefined;
}

export function handoffState(order: HandoffOrder, events: HandoffEvent[]) {
  const kind = order.workflowStatus === 'PickupEnRoute' ? 'pickup' : order.workflowStatus === 'DeliveryAccepted' ? 'collection' : order.workflowStatus === 'OutForDelivery' ? 'delivery' : undefined;
  const job = kind && order.assignments.find(job => job.status === 'Accepted' && job.stage === (kind === 'pickup' ? 'Pickup' : 'Delivery'));
  if (!job || !kind) return undefined;
  const marker = `Assignment #${job.id} · ${kind} handover`;
  const relevant = events.filter(event => event.detail === marker);
  return { kind, riderId: job.riderId, marker, arrived: relevant.some(event => event.action === 'HandoffArrived'), released: relevant.some(event => event.action === 'HandoffReleased') };
}
