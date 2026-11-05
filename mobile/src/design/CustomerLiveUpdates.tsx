import { useEffect, useState } from "react";
import { AppState, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { ChevronDown, ChevronUp, WashingMachine, Wind, Shirt, Bike, ArrowUpRight } from "lucide-react-native";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { useQueries } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { api, useOrders, type Order } from "./data";
import { activeMachinePhase, timerClock, timerPercent, type TimerPhase } from "./processing-timer";
import { Txt, usePalette } from "./ui";
import { returnDeliveryUpdate } from './return-delivery';

function ProgressRing({ phase }: { phase: TimerPhase }) {
  const palette = usePalette();
  const percent = timerPercent(phase);
  const circumference = 2 * Math.PI * 29;
  return <View testID="live-progress-ring" accessibilityRole="progressbar" accessibilityLabel={`${phase.name} timer progress`} accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ width: 72, height: 72, flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
    <Svg width={72} height={72} viewBox="0 0 72 72" style={{ position: "absolute" }}>
      <Circle cx={36} cy={36} r={29} fill="none" stroke={palette.line} strokeWidth={5} />
      <Circle cx={36} cy={36} r={29} fill="none" stroke={palette.primary} strokeWidth={5} strokeLinecap="round" strokeDasharray={[circumference, circumference]} strokeDashoffset={circumference * (1 - percent / 100)} rotation={-90} origin="36, 36" />
    </Svg>
    <Txt style={{ color: palette.primary, fontSize: 14, lineHeight: 20, textAlign: "center", fontWeight: "700", fontVariant: ["tabular-nums"] }}>{percent}%</Txt>
  </View>;
}

export function CustomerLiveUpdates() {
  const palette = usePalette();
  const { height } = useWindowDimensions();
  const orders = useOrders();
  const userId = useAuthStore(state => state.user?.id);
  // Arrival does not change DeliveryAccepted. Read the handover endpoint as well
  // so the card follows the same authoritative state as the shop order details.
  const returning = (orders.data || []).filter(order => order.workflowStatus === "DeliveryAccepted");
  const returnDetails = useQueries({ queries: returning.map(order => ({
    queryKey: ['delivery', 'order', order.id, userId],
    queryFn: () => api.get<Order>(`/delivery/orders/${order.id}`),
    enabled: !!userId, refetchInterval: 15000, refetchIntervalInBackground: false,
  })) });
  const liveOrders = (orders.data || []).map(order => {
    const index = returning.findIndex(item => item.id === order.id);
    const detail = index >= 0 ? returnDetails[index]?.data : undefined;
    return detail ? { ...order, status: detail.status ?? order.status, workflowStatus: detail.workflowStatus ?? order.workflowStatus, handoff: detail.handoff ?? order.handoff } : order;
  });
  const [expanded, setExpanded] = useState(true);
  const [now, setNow] = useState(Date.now());
  const active = liveOrders.flatMap<{ order: Order; phase: TimerPhase | null; title: string }>(order => {
    const delivery = returnDeliveryUpdate(order);
    if (delivery) return [{ order, phase: null, title: delivery.title }];
    if (!["Completed", "Cancelled"].includes(order.status) && order.workflowStatus === "Folding") {
      return [{ order, phase: null, title: "Your laundry is being folded" }];
    }
    const phase = activeMachinePhase(order, now);
    return phase ? [{ order, phase, title: phase.name === "Dry" ? "Drying your laundry" : "Washing your laundry" }] : [];
  });
  const hasActive = active.length > 0;
  const hasTimer = active.some(activity => !!activity.phase);
  useEffect(() => {
    if (!hasActive) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = hasTimer ? setInterval(tick, 1000) : undefined;
    const subscription = AppState.addEventListener("change", state => { if (state === "active") { tick(); void orders.refetch(); } });
    return () => { if (timer) clearInterval(timer); subscription.remove(); };
  }, [hasActive, hasTimer, orders.refetch]);
  if (!active.length || orders.isError) return null;
  const first = active[0];
  return <View testID="customer-live-updates" pointerEvents="box-none" style={{ position: "absolute", bottom: "100%", left: 0, right: 0, paddingHorizontal: 12, paddingBottom: 12 }}>
    <View style={{ backgroundColor: "white", borderWidth: 1.5, borderColor: palette.primary, borderRadius: 20, shadowColor: "#102A56", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.20, shadowRadius: 14, elevation: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Minimize live updates" : "Expand live updates"} accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ minHeight: 52, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", gap: 10, alignItems: "center" }}>
        {expanded ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary }} /> : first.phase ? <ProgressRing phase={first.phase} /> : <View testID={returnDeliveryUpdate(first.order) ? "live-return-icon" : "live-folding-icon"} style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 16, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center" }}>{returnDeliveryUpdate(first.order) ? <Bike size={28} color={palette.primary} /> : <Shirt size={28} color={palette.primary} />}</View>}
        <View style={{ flex: 1, gap: 4 }}><Txt style={{ fontSize: 15, fontWeight: "700", color: palette.ink }}>{expanded ? "Live laundry updates" : first.title}</Txt>
          {!expanded && <Txt style={{ fontSize: 13, color: palette.muted }}>Order #{first.order.id}{active.length > 1 ? ` · +${active.length - 1} more` : ""}</Txt>}
          {!expanded && first.phase && <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 6 }}><Txt style={{ fontSize: 24, color: palette.primary, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{timerClock(first.phase.seconds!)}</Txt><Txt style={{ fontSize: 12, color: palette.muted }}>{first.phase.state === "elapsed" ? "Time elapsed" : "remaining"}</Txt></View>}
        </View>
        {expanded && <Txt style={{ fontSize: 13, color: palette.muted }}>{active.length} active</Txt>}
        {expanded ? <ChevronDown size={20} color={palette.primary} /> : <ChevronUp size={20} color={palette.primary} />}
      </Pressable>
      {expanded && <ScrollView testID="live-updates-content" showsVerticalScrollIndicator={false} style={{ maxHeight: Math.min(280, height * 0.36) }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
        {active.map(({ order, title, phase }) => {
          const delivery = returnDeliveryUpdate(order);
          const Icon = delivery ? Bike : !phase ? Shirt : phase.name === "Dry" ? Wind : WashingMachine;
          return <Pressable key={order.id} accessibilityRole="button" accessibilityLabel={`View live order ${order.id}`} onPress={() => router.push({ pathname: "/(user)/order/tracking/[id]", params: { id: String(order.id) } })} style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "white", borderWidth: 1, borderColor: palette.line, alignItems: "flex-start" }}>
            <Icon size={26} color={palette.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <Txt style={{ fontSize: 16, fontWeight: "600", color: palette.ink }}>{title}</Txt>
              <Txt style={{ fontSize: 13, color: palette.muted }}>Order #{order.id} · {order.serviceName}</Txt>
              {delivery && <Txt style={{ fontSize: 13, color: palette.muted, lineHeight: 19 }}>{delivery.description}</Txt>}
              {phase && <>
                <View style={{ gap: 1, marginVertical: 2 }}>
                  <Txt testID={`live-countdown-${order.id}`} style={{ fontSize: 30, lineHeight: 36, fontWeight: "700", color: palette.primary, fontVariant: ["tabular-nums"] }}>{timerClock(phase.seconds!)}</Txt>
                  <Txt style={{ fontSize: 13, color: palette.muted }}>{phase.state === "elapsed" ? "Time elapsed · waiting for shop update" : "remaining"}</Txt>
                </View>
                <View style={{ height: 5, backgroundColor: palette.line, borderRadius: 4, overflow: "hidden" }}><View style={{ height: 5, width: `${phase.progress * 100}%`, backgroundColor: palette.primary }} /></View>
              </>}
            </View>
            <ArrowUpRight size={20} color={palette.primary} style={{ marginTop: 2 }} />
          </Pressable>;
        })}
      </ScrollView>}
    </View>
  </View>;
}
