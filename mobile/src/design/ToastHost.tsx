import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Animated, AppState, PanResponder, Platform, Pressable, View, useWindowDimensions, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleCheck, CircleAlert, Info, TriangleAlert, X } from "lucide-react-native";
import { Txt, usePalette } from "./ui";
import { toast, type ToastItem } from "./toast-service";
import { getDialog, showDialog, subscribeToDialogs } from "./dialog-service";
import { useNotificationToasts } from "./useNotificationToasts";

const nativeDriver = Platform.OS !== "web";
const gestureStyle = Platform.OS === "web" ? { touchAction: "none", overscrollBehavior: "contain" } as ViewStyle : undefined;
type Presented = { item: ToastItem; visible: boolean };

function ToastCard({ item, visible, reduceMotion, removed }: Presented & { reduceMotion: boolean; removed: (id: string) => void }) {
  const palette = usePalette();
  const { height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(reduceMotion ? 0 : -height)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const moved = useRef(false);
  const color = item.variant === "success" ? palette.success : item.variant === "warning" ? palette.warning : item.variant === "error" ? palette.danger : palette.primary;
  const tint = item.variant === "info" ? palette.soft : `${color}1F`;
  const Icon = item.variant === "success" ? CircleCheck : item.variant === "warning" ? TriangleAlert : item.variant === "error" ? CircleAlert : Info;
  const dismiss = () => toast.dismiss(item.id);
  const resume = () => toast.resume(item.id);
  const pause = () => toast.pause(item.id);

  useEffect(() => {
    if (visible && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility([item.title, item.message].filter(Boolean).join(". "));
  }, [visible, item.id, item.revision]);
  useEffect(() => {
    if (reduceMotion) slide.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: visible ? 200 : 250, useNativeDriver: nativeDriver }),
      ...(reduceMotion ? [] : [visible
        ? Animated.spring(slide, { toValue: 0, stiffness: 240, damping: 26, mass: 0.8, useNativeDriver: nativeDriver })
        : Animated.timing(slide, { toValue: -height, duration: 250, useNativeDriver: nativeDriver })]),
    ]);
    animation.start(({ finished }) => { if (finished && !visible) removed(item.id); });
    return () => animation.stop();
  }, [visible, reduceMotion, height, opacity, slide, item.id]);
  useEffect(() => {
    const remaining = item.expiresAt === null ? item.remaining : Math.max(0, item.expiresAt - Date.now());
    progress.setValue(remaining / item.duration);
    if (item.expiresAt === null || !visible) return;
    const animation = Animated.timing(progress, { toValue: 0, duration: remaining, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [item.expiresAt, item.remaining, item.duration, item.revision, visible, progress]);

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, state) => Math.abs(state.dy) > 5 && Math.abs(state.dy) > Math.abs(state.dx),
    onPanResponderGrant: () => { moved.current = true; toast.pause(item.id); },
    onPanResponderMove: (_, state) => { if (!reduceMotion) drag.setValue(state.dy < 0 ? state.dy : state.dy * 0.15); },
    onPanResponderRelease: (_, state) => {
      if (state.dy < -40 || state.vy < -0.5) toast.dismiss(item.id);
      else { Animated.spring(drag, { toValue: 0, stiffness: 240, damping: 26, useNativeDriver: nativeDriver }).start(); toast.resume(item.id); }
    },
    onPanResponderTerminate: () => { drag.setValue(0); toast.resume(item.id); },
    onPanResponderTerminationRequest: () => false,
  }), [item.id, drag, reduceMotion]);

  function activate(callback?: () => void) {
    if (!visible || moved.current || !callback) return;
    dismiss();
    callback();
  }
  return <Animated.View pointerEvents={visible ? "auto" : "none"} testID={`toast-${item.variant}`}
    style={{ opacity, transform: [{ translateY: Animated.add(slide, drag) }],
      shadowColor: palette.ink, shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8, borderRadius: 20 }}>
    <View {...pan.panHandlers} onTouchStart={() => { moved.current = false; pause(); }} onTouchEnd={resume} onTouchCancel={resume}
      onPointerDown={() => { moved.current = false; pause(); }} onPointerUp={resume} onPointerCancel={resume}
      onAccessibilityEscape={dismiss}
      style={[{ backgroundColor: palette.white, borderRadius: 20, borderWidth: 1, borderColor: palette.line, overflow: "hidden" }, gestureStyle]}>
      <View style={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 8 }}>
        <Pressable accessibilityRole={item.onPress ? "button" : undefined} accessible={!!item.onPress} disabled={!item.onPress}
          accessibilityLabel={[item.title, item.message].filter(Boolean).join(". ")} onPress={() => activate(item.onPress)}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
        <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View pointerEvents="none" style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: palette.line,
            backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
            <Icon size={20} color={color} />
          </View>
          <View pointerEvents="box-none" style={{ flex: 1, minWidth: 0 }}>
            <View pointerEvents="none" role={item.variant === "error" ? "alert" : "status"}
              accessibilityRole={item.variant === "error" ? "alert" : undefined}
              accessibilityLiveRegion={item.variant === "error" ? "assertive" : "polite"}>
              <Txt numberOfLines={1} ellipsizeMode="tail" style={{ fontWeight: "600", fontSize: 15, color: palette.ink }}>{item.title}</Txt>
              {!!item.message && <Txt numberOfLines={2} ellipsizeMode="tail" style={{ fontSize: 13, color: palette.muted, marginTop: 2 }}>{item.message}</Txt>}
            </View>
            {!!item.action && <Pressable accessibilityRole="button" accessibilityLabel={item.action.label} hitSlop={8}
              onPress={event => { event.stopPropagation(); activate(item.action?.onPress); }} style={{ paddingTop: 6, alignSelf: "flex-start" }}>
              <Txt style={{ fontWeight: "600", fontSize: 13, color: palette.primary }}>{item.action.label}</Txt>
            </Pressable>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" hitSlop={10}
            onPress={event => { event.stopPropagation(); dismiss(); }}
            style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
            <X size={18} color={palette.muted} />
          </Pressable>
        </View>
        <View pointerEvents="none" style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.line, alignSelf: "center", marginTop: 8 }} />
      </View>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, bottom: 0, height: 3, backgroundColor: color,
        width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
    </View>
  </Animated.View>;
}

export function ToastHost() {
  useNotificationToasts();
  const items = useSyncExternalStore(toast.subscribe, toast.getSnapshot, toast.getSnapshot);
  const [presented, setPresented] = useState<Presented[]>([]);
  const [blocked, setBlocked] = useState(!!getDialog());
  const [reduceMotion, setReduceMotion] = useState(false);
  const insets = useSafeAreaInsets();
  useLayoutEffect(() => {
    let release: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(release);
      if (getDialog()) { toast.block("dialog", true); setBlocked(true); }
      else release = setTimeout(() => { toast.block("dialog", false); setBlocked(false); }, 180);
    };
    update();
    const unsubscribe = subscribeToDialogs(update);
    return () => { clearTimeout(release); unsubscribe(); toast.block("dialog", false); };
  }, []);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduceMotion(value); });
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const update = () => toast.block("background", AppState.currentState !== "active" ||
      (Platform.OS === "web" && document.visibilityState === "hidden"));
    update();
    const appState = AppState.addEventListener("change", update);
    if (Platform.OS === "web") document.addEventListener("visibilitychange", update);
    return () => { live = false; listener.remove(); appState.remove(); toast.block("background", false);
      if (Platform.OS === "web") document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => {
    if (!__DEV__) return;
    const target = globalThis as unknown as { labarideToast?: typeof toast; labarideToastDialog?: typeof showDialog };
    target.labarideToast = toast;
    target.labarideToastDialog = showDialog;
    return () => { delete target.labarideToast; delete target.labarideToastDialog; };
  }, []);
  useLayoutEffect(() => {
    setPresented(previous => [...items.map(item => ({ item, visible: true })),
      ...previous.filter(row => !items.some(item => item.id === row.item.id)).map(row => ({ ...row, visible: false }))].slice(0, 3));
  }, [items]);
  function removed(id: string) { setPresented(rows => rows.filter(row => row.item.id !== id || row.visible)); }
  if (blocked) return null;
  return <View pointerEvents="box-none" testID="toast-host" style={{ position: "absolute", top: Math.max(0, insets.top) + 12,
    left: 12, right: 12, zIndex: 2147483647, elevation: 1000, gap: 8 }}>
    {presented.map(row => <ToastCard key={row.item.id} {...row} reduceMotion={reduceMotion} removed={removed} />)}
  </View>;
}
