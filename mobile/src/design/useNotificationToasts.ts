import { useNotificationBadgeStore } from "./notification-badge-store";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useSegments, type Href } from "expo-router";
import { api, go } from "./data";
import { useAuthStore } from "../store/authStore";
import { notificationTracker } from "./notification-toast-state";
import { toast } from "./toast-service";
import { notificationCopy } from './notification-copy';

export interface Notification {
  id: number; transactionId: number; title: string; message: string;
  createdAt: string; readAt: string | null; handoff?: { label: string; code: string };
}
export type NotificationScope = { shopMode?: boolean; audience?: "rider" | "admin" };
export const notificationQueryKey = (userId: number | undefined, scope: NotificationScope) =>
  ["notifications", userId, !!scope.shopMode, scope.audience] as const;
const scopeId = (userId: number | undefined, scope: NotificationScope) => JSON.stringify(notificationQueryKey(userId, scope));
export const notificationScopeQuery = (scope: NotificationScope) => `shopMode=${!!scope.shopMode}${scope.audience ? `&audience=${scope.audience}` : ""}`;
export function useNotifications(scope: NotificationScope, poll = false) {
  const userId = useAuthStore(state => state.user?.id);
  return useQuery({
    queryKey: notificationQueryKey(userId, scope), enabled: !!userId,
    queryFn: () => api.get<Notification[]>(`/notifications?${notificationScopeQuery(scope)}`),
    select: items => items.map(item => notificationCopy(item, scope)),
    staleTime: 15000, refetchInterval: poll ? 15000 : false, refetchIntervalInBackground: false,
  });
}
export function useNotificationVisibility(scope: NotificationScope, items: Notification[] | undefined, visible = true) {
  const userId = useAuthStore(state => state.user?.id);
  const token = useRef({});
  const key = scopeId(userId, scope);
  useLayoutEffect(() => {
    if (visible) {
      if (userId && items) useNotificationBadgeStore.getState().view(key, items);
      for (const item of items || []) toast.dismiss(`notification:${userId}:${item.id}`);
      return notificationTracker.view(token.current, key, (items || []).map(item => item.id));
    }
  }, [key, items, visible]);
}
export function openNotificationOrder(item: Notification, scope: NotificationScope) {
  if (scope.audience === "rider") router.push({ pathname: "/rider/jobs", params: { orderId: String(item.transactionId) } });
  else if (scope.audience === "admin") router.push(`/admin/order?id=${item.transactionId}` as Href);
  else if (scope.shopMode) router.push({ pathname: "/shop/customers/orders/[id]", params: { id: String(item.transactionId) } });
  else go("transaction-details", { id: String(item.transactionId) });
}
export function useNotificationToasts() {
  const userId = useAuthStore(state => state.user?.id);
  const segments = useSegments() as string[];
  const scope: NotificationScope = segments[0] === "rider" ? { audience: "rider" }
    : segments[0] === "admin" ? { audience: "admin" } : { shopMode: segments[0] === "shop" };
  const key = scopeId(userId, scope);
  const [foreground, setForeground] = useState(() => AppState.currentState === "active" &&
    (Platform.OS !== "web" || typeof document === "undefined" || document.visibilityState !== "hidden"));
  const resumeBaseline = useRef(false);
  const resuming = useRef(false);
  const [resumeVersion, setResumeVersion] = useState(0);
  useLayoutEffect(() => {
    notificationTracker.reset();
    toast.dismiss();
  }, [userId]);
  useEffect(() => {
    const update = () => {
      const active = AppState.currentState === "active" && (Platform.OS !== "web" || document.visibilityState !== "hidden");
      if (!active) resumeBaseline.current = true;
      setForeground(active);
    };
    const subscription = AppState.addEventListener("change", update);
    if (Platform.OS === "web") document.addEventListener("visibilitychange", update);
    return () => { subscription.remove(); if (Platform.OS === "web") document.removeEventListener("visibilitychange", update); };
  }, []);
  // The only notifications interval in the app. Bell screens observe this cache.
  const query = useNotifications(scope, foreground);
  useEffect(() => {
    if (!foreground || !resumeBaseline.current) return;
    let live = true;
    resuming.current = true;
    void query.refetch().finally(() => {
      if (live) { resuming.current = false; setResumeVersion(value => value + 1); }
    });
    return () => { live = false; resuming.current = false; };
  }, [foreground, key]);
  const revision = useSyncExternalStore(notificationTracker.subscribe, notificationTracker.getSnapshot, notificationTracker.getSnapshot);
  useEffect(() => {
    if (!foreground || !userId || !query.data || query.isFetching || query.isError || resuming.current || notificationTracker.hasPending()) return;
    // Keep the existing baseline when returning to this tab: notifications that
    // arrived while the owner was looking at the rider app still need a toast.
    const fresh = notificationTracker.receive(key, userId, query.data, true);
    if (foreground) resumeBaseline.current = false;
    for (const item of fresh) {
      const open = () => openNotificationOrder(item, scope);
      toast.info({ key: `notification:${userId}:${item.id}`, title: item.title, message: item.message,
        onPress: open, action: { label: "View order", onPress: open } });
    }
  }, [key, userId, query.data, query.isFetching, query.isError, foreground, revision, resumeVersion]);
}
