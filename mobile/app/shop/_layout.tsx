import { InterfaceTheme } from "../../src/design/theme";
import { View, useWindowDimensions } from "react-native";
import { useEffect } from "react";
import { Tabs, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Asset, Brand, Txt, Screen, usePalette } from "../../src/design/ui";
import { QueryState } from "../../src/design/UserScreens";
import { useAuthStore } from "../../src/store/authStore";
import { useOwnedShop } from "../../src/design/data";
import { socketService } from "../../src/services/socket.service";
import { workspaceSidebar } from '../../src/navigation/WorkspaceSidebar';
import { ShopDesktopSidebar } from '../../src/navigation/ShopDesktopSidebar';
import { ClipboardList, House, ListTree, UserRound, WashingMachine } from 'lucide-react-native';
export default function ShopTabs() {
  return <InterfaceTheme role="shop"><ShopTabsContent /></InterfaceTheme>;
}
function ShopTabsContent() {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const insets = useSafeAreaInsets();
  const owned = useOwnedShop();
  const user = useAuthStore(state => state.user);
  useEffect(() => {
    if (owned.data?.approvalStatus === "Approved") socketService.joinShopRoom(owned.data.id);
  }, [owned.data?.id]);
  if (!user) return <Redirect href="/(auth)/login" />;
  if (owned.isLoading || owned.isError) return <Screen><QueryState loading={owned.isLoading} error={owned.error} retry={() => owned.refetch()} /></Screen>;
  if (owned.data?.approvalStatus !== "Approved") return <Redirect href={{ pathname: "/(flows)/[flow]", params: { flow: "register-shop" } }} />;
  return (
    <Tabs
      initialRouteName="home"
      tabBar={desktop ? props => <ShopDesktopSidebar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarBackground: desktop ? () => <View pointerEvents="none" style={{ position: "absolute", top: 24, left: 20 }}><Brand /><Txt style={{ color: palette.muted, marginTop: 8 }}>Shop management</Txt></View> : undefined,
        tabBarPosition: desktop ? "left" : "bottom",
        tabBarLabelPosition: desktop ? "beside-icon" : "below-icon",
        tabBarActiveBackgroundColor: palette.soft,
        tabBarItemStyle: { borderRadius: 12, marginHorizontal: desktop ? 8 : 2, marginVertical: desktop ? 4 : 0 },
        tabBarHideOnKeyboard: false,
        tabBarActiveTintColor: palette.navy,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: { fontFamily: "Inter-Medium", fontSize: 11 },
        tabBarStyle: {

          backgroundColor: "white", borderTopWidth: 1, borderTopColor: palette.line,
          borderRightColor: palette.line, width: desktop ? 224 : undefined, maxWidth: desktop ? 224 : undefined, minWidth: desktop ? 224 : undefined,
          height: desktop ? undefined : 68 + insets.bottom,
          paddingTop: desktop ? 116 : 8, paddingBottom: desktop ? 16 : Math.max(insets.bottom, 8),
        },
        ...(desktop ? workspaceSidebar(palette, insets.bottom, 'Shop management') : {}),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            desktop ? <House size={24} color={color} /> : <Asset name="OrderScreenIcon/Home.png" tint={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => (
            desktop ? <ClipboardList size={24} color={color} /> : <Asset name="OrderScreenIcon/Orders.png" tint={color} />
          ),
        }}
      />
      <Tabs.Screen name="operations" options={{ title: "Live operations", href: desktop ? undefined : null, tabBarIcon: ({ color }) => <ListTree size={24} color={color} /> }} />
      <Tabs.Screen
        name="services"
        options={{
          title: "Services",
          tabBarIcon: ({ color }) => (
            desktop ? <WashingMachine size={24} color={color} /> : <Asset name="OrderScreenIcon/Services.png" tint={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            desktop ? <UserRound size={24} color={color} /> : <Asset name="OrderScreenIcon/Profile.png" tint={color} />
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
    </Tabs>
  );
}
