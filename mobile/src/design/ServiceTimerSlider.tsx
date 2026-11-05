import { createElement, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Txt, usePalette } from "./ui";

export function ServiceTimerSlider({ label, value, maximum, disabled, onChange }: {
  label: string; value: string; maximum: number; disabled?: boolean; onChange: (value: string) => void;
}) {
  const palette = usePalette();
  const [width, setWidth] = useState(200);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ start: 0, step: 0 });
  const steps = (maximum - 15) / 5 + 1;
  const selected = Number(value) > 0 ? Math.max(1, Math.min(steps, (Number(value) - 15) / 5 + 1)) : 0;
  const center = 14 + Math.max(0, width - 28) * selected / steps;
  const bubbleLeft = Math.max(0, Math.min(width - 84, center - 42));
  function change(position: number) {
    if (disabled) return;
    const step = Math.max(0, Math.min(steps, Math.round(position)));
    onChange(step === 0 ? "" : String(15 + (step - 1) * 5));
  }
  return <View style={{ gap: 4, opacity: disabled ? 0.55 : 1 }}>
    <Txt style={{ fontSize: 14, fontWeight: "600" }}>{label}</Txt>
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height: 84 }}
      accessible={Platform.OS !== "web"} accessibilityRole={Platform.OS !== "web" ? "adjustable" : undefined}
      accessibilityLabel={Platform.OS !== "web" ? label : undefined} accessibilityState={{ disabled: !!disabled }}
      accessibilityValue={Platform.OS !== "web" ? { min: 0, max: steps, now: selected, text: value ? `${value} minutes` : "No value, no timer" } : undefined}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={event => change(selected + (event.nativeEvent.actionName === "increment" ? 1 : -1))}
      onStartShouldSetResponder={() => Platform.OS !== "web" && !disabled}
      onMoveShouldSetResponder={() => Platform.OS !== "web" && !disabled}
      onResponderGrant={event => {
        const position = (event.nativeEvent.locationX - 14) / Math.max(1, width - 28) * steps;
        drag.current = { start: event.nativeEvent.pageX, step: position }; setDragging(true); change(position);
      }}
      onResponderMove={event => change(drag.current.step + (event.nativeEvent.pageX - drag.current.start) / Math.max(1, width - 28) * steps)}
      onResponderRelease={() => setDragging(false)} onResponderTerminate={() => setDragging(false)}>
      <View pointerEvents="none" style={{ position: "absolute", top: 8, left: bubbleLeft, width: 84, height: 32, borderRadius: 10, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" }}>
        <Txt style={{ color: "white", fontSize: 15, lineHeight: 20, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{Number(value) > 0 ? `${value} min` : "No value"}</Txt>
        <View style={{ position: "absolute", top: 31, left: center - bubbleLeft - 6, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: palette.primary }} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", left: 14, right: 14, top: 63, height: 6, backgroundColor: palette.line, borderRadius: 3 }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 14, width: Math.max(0, center - 14), top: 63, height: 6, backgroundColor: palette.primary, borderRadius: 3 }} />
      <View pointerEvents="none" style={{ position: "absolute", left: center - 14, top: 52, width: 28, height: 28, borderRadius: 14, backgroundColor: "white", borderWidth: focused ? 2 : 1, borderColor: focused ? palette.primary : palette.line, shadowColor: palette.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 4, transform: [{ scale: dragging ? 1.08 : 1 }] }} />
      {Platform.OS === "web" && <>{createElement("style", null, '.labaride-timer-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:28px;height:28px}.labaride-timer-range::-moz-range-thumb{width:28px;height:28px;border:0}')}{createElement("input", {
      className: "labaride-timer-range",
      type: "range", min: 0, max: steps, step: 1, value: selected, disabled,
      "aria-label": label, "aria-valuetext": Number(value) > 0 ? `${value} minutes` : "No value, no timer",
      onChange: (event: { target: { value: string } }) => change(Number(event.target.value)),
      onFocus: () => setFocused(true), onBlur: () => { setFocused(false); setDragging(false); },
      onPointerDown: () => setDragging(true), onPointerUp: () => setDragging(false), onPointerCancel: () => setDragging(false),
      style: { position: "absolute", top: 44, left: 0, width: "100%", height: 44, margin: 0, opacity: 0, appearance: "none", cursor: disabled ? "default" : "pointer" },
    })}</>}
    </View>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Txt style={{ fontSize: 12, color: palette.muted }}>No value</Txt><Txt style={{ fontSize: 12, color: palette.muted }}>15–{maximum} min</Txt></View>
  </View>;
}
