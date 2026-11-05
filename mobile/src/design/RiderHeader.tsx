import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, LogOut, MapPin, UserRound } from 'lucide-react-native';
import { address, useProfile } from './data';
import { useAuthStore } from '../store/authStore';
import { NotificationBell } from './NotificationBell';
import { IconButton, Txt, usePalette } from './ui';

import { useLogout } from './useLogout';

export function RiderHeader() {
  const user = useAuthStore(state => state.user);
  const profile = useProfile();
  const { width, height } = useWindowDimensions();
  const palette = usePalette();
  const logout = useLogout();
  const desktop = Platform.OS === 'web' && width >= 1024;
  const trigger = useRef<View>(null);
  const firstItem = useRef<View>(null);
  const lastItem = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const open = desktop && !!anchor;
  useEffect(() => { setAnchor(null); }, [width, height]);
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setAnchor(null); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (document.activeElement === (firstItem.current as unknown)) lastItem.current?.focus();
        else firstItem.current?.focus();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [open]);
  function profileAction() {
    if (!desktop) { router.navigate('/rider/profile'); return; }
    if (open) { setAnchor(null); return; }
    trigger.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => setAnchor({ x, y, width: measuredWidth, height: measuredHeight }));
  }
  const menuWidth = 220;
  const name = (profile.data?.name || user?.name || 'rider').trim().split(/\s+/)[0];
  const location = address(profile.data) || 'No address saved';
  const blue = '#2457AD';
  return <>
    <View testID="rider-header" style={{ backgroundColor: '#F6F7FC' }}>
      <View style={{ width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: width >= 768 ? 32 : 20, paddingTop: width >= 768 ? 30 : 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Txt accessibilityRole="header" numberOfLines={1} style={{ fontSize: width >= 768 ? 32 : 25, lineHeight: width >= 768 ? 40 : 34, fontWeight: '700', color: '#252638', letterSpacing: -0.5 }}>Hello, {name}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel={`Your saved address: ${location}`} onPress={() => router.navigate('/rider/profile')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, alignSelf: 'flex-start', maxWidth: '100%', opacity: pressed ? 0.7 : 1 })}>
            <MapPin size={14} color={blue} style={{ flexShrink: 0 }} />
            <Txt numberOfLines={1} style={{ flexShrink: 1, minWidth: 0, fontSize: 12, lineHeight: 18, color: '#626B7D' }}>{location}</Txt>
            <ChevronRight size={15} color={blue} style={{ flexShrink: 0 }} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, paddingTop: 3 }}>
          <IconButton label="Rider notifications" onPress={() => router.push('/rider/notifications')}><NotificationBell audience="rider" size={22} color={blue} /></IconButton>
          <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel="Your rider profile" accessibilityState={desktop ? { expanded: open } : undefined} onPress={profileAction}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line, backgroundColor: pressed || open ? palette.soft : 'white' })}><UserRound size={22} color={blue} /></Pressable>
        </View>
      </View>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setAnchor(null)} onShow={() => firstItem.current?.focus()}>
      <View style={{ flex: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss rider account menu" tabIndex={-1} onPress={() => setAnchor(null)} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
        {anchor && <View accessibilityRole="menu" accessibilityLabel="Rider account menu" testID="rider-account-menu" style={{ position: 'absolute', width: menuWidth, top: Math.max(12, Math.min(anchor.y + anchor.height + 8, height - 132)), left: Math.max(12, Math.min(anchor.x + anchor.width - menuWidth, width - menuWidth - 12)), padding: 6, backgroundColor: 'white', borderWidth: 1, borderColor: palette.line, borderRadius: 14, boxShadow: '0 8px 30px rgba(25, 40, 70, 0.14)' }}>
          <Pressable ref={firstItem} accessibilityRole="menuitem" accessibilityLabel="View profile" onPress={() => { setAnchor(null); router.navigate('/rider/profile'); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, minHeight: 46, borderRadius: 9, backgroundColor: pressed ? palette.soft : 'white' })}><UserRound size={18} color={blue} /><Txt style={{ fontSize: 14, color: blue, fontWeight: '600' }}>View profile</Txt></Pressable>
          <View style={{ height: 1, backgroundColor: palette.line, marginVertical: 4 }} />
          <Pressable ref={lastItem} accessibilityRole="menuitem" accessibilityLabel="Log out" onPress={() => { setAnchor(null); void logout(); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, minHeight: 46, borderRadius: 9, backgroundColor: pressed ? '#FFF1F2' : 'white' })}><LogOut size={18} color={palette.danger} /><Txt style={{ fontSize: 14, color: palette.danger, fontWeight: '600' }}>Log out</Txt></Pressable>
        </View>}
      </View>
    </Modal>
  </>;
}
