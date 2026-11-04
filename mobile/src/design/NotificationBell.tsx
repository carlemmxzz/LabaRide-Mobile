import { useNotificationBadgeStore } from "./notification-badge-store";
import { View, type ColorValue } from "react-native";
import { Bell } from "lucide-react-native";
import { usePalette } from "./theme";
import { useNotifications, notificationQueryKey, type NotificationScope } from "./useNotificationToasts";
import { useAuthStore } from "../store/authStore";

export function NotificationBell({ size = 22, color, shopMode = false, audience }: NotificationScope & { size?: number; color?: ColorValue }) {
  const palette = usePalette();
  const user = useAuthStore(state => state.user);
  // Observe the shared cache; the root owns polling and socket refreshes.
  const notifications = useNotifications({ shopMode, audience });
  const scope = JSON.stringify(notificationQueryKey(user?.id, { shopMode, audience }));
  const viewedThrough = useNotificationBadgeStore(state => state.viewedThrough[scope] || 0);
  const hydrated = useNotificationBadgeStore(state => state.hydrated);
  const unread = !!user && hydrated && !!notifications.data?.some(item => !item.readAt && item.id > viewedThrough);
  return <View pointerEvents="none" accessibilityRole="image"
    accessibilityLabel={unread ? "Notifications, new notifications" : "Notifications"}
    style={{ width: size, height: size }}>
    <Bell size={size} color={color || palette.primary} />
    {unread && <View testID="notification-unread-dot" style={{
      position: "absolute", top: -1, right: -1, width: 10, height: 10,
      borderRadius: 5, backgroundColor: palette.danger, borderWidth: 2, borderColor: palette.white,
    }} />}
  </View>;
}
