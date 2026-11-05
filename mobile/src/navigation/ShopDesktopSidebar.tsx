import { useEffect, useState, type ComponentProps } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Tabs } from "expo-router";
import { ChevronDown, ClipboardList, LayoutDashboard, ListTree, UserRound, WashingMachine } from "lucide-react-native";
import { Brand, Txt, usePalette } from "../design/ui";

type Props = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export function ShopDesktopSidebar({ state, navigation }: Props) {
  const palette = usePalette();
  const current = state.routes[state.index].name;
  const [expanded, setExpanded] = useState(current === "transactions" || current === "operations");
  useEffect(() => {
    if (current === "transactions" || current === "operations") setExpanded(true);
  }, [current]);
  function open(name: string) {
    const route = state.routes.find(item => item.name === name);
    if (!route) return;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
  }
  function item(name: string, title: string, Icon: typeof LayoutDashboard, nested = false) {
    const selected = current === name;
    return <Pressable key={name} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ selected }} onPress={() => open(name)}
      style={({ pressed }) => ({ minHeight: 44, borderRadius: 12, marginVertical: 4, marginLeft: nested ? 36 : 8, marginRight: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: selected || pressed ? palette.soft : "transparent" })}>
      <Icon size={nested ? 18 : 24} color={selected ? palette.primary : palette.muted} />
      <Txt style={{ fontSize: 12, fontFamily: "Inter-Medium", color: selected ? palette.primary : palette.muted }}>{title}</Txt>
    </Pressable>;
  }
  const ordersSelected = current === "transactions";
  return <View style={{ width: 224, backgroundColor: "white", borderRightWidth: 1, borderColor: palette.line }}>
    <View style={{ position: "absolute", top: 24, left: 20 }}><Brand /><Txt style={{ color: palette.muted, marginTop: 8 }}>Shop management</Txt></View>
    <ScrollView contentContainerStyle={{ paddingTop: 116, paddingBottom: 16 }}>
      {item("home", "Dashboard", LayoutDashboard)}
      <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 8, marginVertical: 4, borderRadius: 12, backgroundColor: ordersSelected ? palette.soft : "transparent" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Orders" accessibilityState={{ selected: ordersSelected }} onPress={() => { setExpanded(true); open("transactions"); }} style={{ flex: 1, minHeight: 44, flexDirection: "row", gap: 16, alignItems: "center", paddingLeft: 12 }}>
          <ClipboardList size={24} color={ordersSelected ? palette.primary : palette.muted} /><Txt style={{ fontSize: 12, fontFamily: "Inter-Medium", color: ordersSelected ? palette.primary : palette.muted }}>Orders</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Collapse Orders" : "Expand Orders"} accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ width: 40, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <ChevronDown size={16} color={palette.muted} style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }} />
        </Pressable>
      </View>
      {expanded && <View testID="orders-submenu">{item("operations", "Live operations", ListTree, true)}</View>}
      {item("services", "Services", WashingMachine)}
      {item("profile", "Profile", UserRound)}
    </ScrollView>
  </View>;
}
