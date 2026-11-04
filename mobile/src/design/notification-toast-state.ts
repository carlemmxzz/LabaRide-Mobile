type Notice = { id: number; transactionId: number; readAt: string | null; createdAt: string };
type Suppression = { userId: number; orderId: number; floor: number; count: number; until: number };
export function createNotificationTracker(now = Date.now) {
  const seen = new Map<string, Set<number>>();
  const highest = new Map<number, number>();
  const views = new Map<object, { scope: string; ids: Set<number> }>();
  let suppressions: Suppression[] = [];
  let pending = 0;
  let revision = 0;
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = () => { revision++; listeners.forEach(fn => fn()); };
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => revision,
    hasPending: () => pending > 0,
    reset() { generation++; seen.clear(); highest.clear(); suppressions = []; pending = 0; publish(); },
    view(token: object, scope: string, ids: number[]) {
      views.set(token, { scope, ids: new Set(ids) });
      return () => { views.delete(token); };
    },
    begin(userId: number) {
      pending++;
      const floor = highest.get(userId) || 0;
      const startedGeneration = generation;
      let finished = false;
      return (orderId?: number, count = 1) => {
        if (finished || startedGeneration !== generation) return;
        finished = true;
        if (orderId) suppressions.push({ userId, orderId, floor, count, until: now() + 30000 });
        pending = Math.max(0, pending - 1);
        publish();
      };
    },
    receive<T extends Notice>(scope: string, userId: number, notices: T[], foreground: boolean, baseline = false): T[] {
      if (pending) return [];
      const previous = seen.get(scope);
      const ids = previous || new Set<number>();
      const fresh: T[] = [];
      suppressions = suppressions.filter(item => item.until > now() && item.count > 0);
      for (const item of [...notices].sort((a, b) => a.id - b.id)) {
        highest.set(userId, Math.max(highest.get(userId) || 0, item.id));
        if (ids.has(item.id)) continue;
        ids.add(item.id);
        const own = suppressions.find(entry => entry.userId === userId && entry.orderId === item.transactionId && item.id > entry.floor && entry.count > 0);
        if (own) own.count--;
        const visible = [...views.values()].some(view => view.scope === scope && view.ids.has(item.id));
        if (previous && !baseline && foreground && !item.readAt && !own && !visible) fresh.push(item);
      }
      seen.set(scope, ids);
      return fresh;
    },
  };
}
export const notificationTracker = createNotificationTracker();

// Only mutations known to create order notifications participate. Failed writes
// release the hold without suppressing another person's update.
export async function localNotificationMutation<T>(userId: number | undefined, path: string, body: unknown, run: () => Promise<T>, orderId?: number): Promise<T> {
  const match = path.match(/^\/(?:transactions|delivery\/orders)\/(\d+)\/(?:status|timer|cancel|action|claim|assign|weight)$/);
  if (!userId || (!match && path !== "/transactions" && !orderId)) return run();
  const finish = notificationTracker.begin(userId);
  try {
    const result = await run();
    const id = orderId || (match ? Number(match[1]) : Number((result as { id?: number })?.id));
    const count = path.endsWith("/assign") && !!(body as { reason?: string })?.reason ? 2 : 1;
    finish(id, count);
    return result;
  } catch (error) { finish(); throw error; }
}
