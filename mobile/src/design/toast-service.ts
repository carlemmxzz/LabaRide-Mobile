export type ToastVariant = "success" | "info" | "warning" | "error";
export type ToastOptions = {
  title: string; message?: string; action?: { label: string; onPress: () => void };
  onPress?: () => void; duration?: number; key?: string;
};
export type ToastItem = ToastOptions & {
  id: string; variant: ToastVariant; duration: number; remaining: number;
  expiresAt: number | null; paused: boolean; revision: number;
};
type Clock = { now: () => number; set: (callback: () => void, delay: number) => unknown; clear: (handle: unknown) => void };
const clock: Clock = { now: Date.now, set: (fn, ms) => setTimeout(fn, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) };

// Timers live with the queue, so route changes never restart a notification.
export function createToastStore(time: Clock = clock) {
  let items: ToastItem[] = [];
  let sequence = 0;
  const listeners = new Set<() => void>();
  const timers = new Map<string, unknown>();
  const blockers = new Set<string>();
  const publish = () => listeners.forEach(listener => listener());
  function cancel(id: string) { if (timers.has(id)) time.clear(timers.get(id)); timers.delete(id); }
  function schedule(item: ToastItem): ToastItem {
    cancel(item.id);
    if (blockers.size || item.paused) return { ...item, expiresAt: null };
    const next = { ...item, expiresAt: time.now() + item.remaining };
    timers.set(item.id, time.set(() => dismiss(item.id), item.remaining));
    return next;
  }
  function dismiss(key?: string) {
    const removed = items.filter(item => key === undefined || item.id === key || item.key === key);
    removed.forEach(item => cancel(item.id));
    if (!removed.length) return;
    items = items.filter(item => !removed.includes(item));
    publish();
  }
  function show(variant: ToastVariant, options: ToastOptions) {
    const existing = options.key ? items.find(item => item.key === options.key) : undefined;
    if (existing) cancel(existing.id);
    const requested = options.duration ?? (variant === "error" || options.action ? 6000 : 4000);
    const duration = Number.isFinite(requested) ? Math.max(1, requested) : 4000;
    const item = schedule({ ...options, id: existing?.id || `toast-${++sequence}`, variant, duration,
      remaining: duration, expiresAt: null, paused: existing?.paused || false, revision: (existing?.revision || 0) + 1 });
    items = [item, ...items.filter(current => current.id !== item.id)];
    items.slice(3).forEach(current => cancel(current.id));
    items = items.slice(0, 3);
    publish();
    return item.id;
  }
  function pause(id: string) {
    items = items.map(item => {
      if (item.id !== id || item.paused) return item;
      cancel(id);
      return { ...item, paused: true, remaining: item.expiresAt === null ? item.remaining : Math.max(0, item.expiresAt - time.now()), expiresAt: null };
    });
    publish();
  }
  function resume(id: string) {
    items = items.map(item => item.id === id && item.paused ? schedule({ ...item, paused: false }) : item);
    publish();
  }
  function block(reason: string, enabled: boolean) {
    const wasBlocked = blockers.size > 0;
    if (enabled) blockers.add(reason); else blockers.delete(reason);
    if (wasBlocked === (blockers.size > 0)) return;
    items = items.map(item => {
      cancel(item.id);
      const remaining = item.expiresAt === null ? item.remaining : Math.max(0, item.expiresAt - time.now());
      return schedule({ ...item, remaining, expiresAt: null });
    });
    publish();
  }
  return {
    success: (options: ToastOptions) => show("success", options),
    info: (options: ToastOptions) => show("info", options),
    warning: (options: ToastOptions) => show("warning", options),
    error: (options: ToastOptions) => show("error", options),
    dismiss, pause, resume, block,
    getSnapshot: () => items,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
export const toast = createToastStore();
