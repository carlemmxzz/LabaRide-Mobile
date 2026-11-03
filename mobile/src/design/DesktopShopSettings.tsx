import type { ReactNode } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { router, useSegments, type Href } from 'expo-router';
import { ArrowUpRight } from 'lucide-react-native';
import { Button, Card, Screen, Txt, usePalette } from './ui';

export function useDesktopShopSettings() {
  const { width } = useWindowDimensions();
  const segments = useSegments() as string[];
  return Platform.OS === 'web' && width >= 1100 && segments[0] === 'shop';
}

const destinations = [
  { id: 'overview', title: 'Overview', path: '/shop/profile' },
  { id: 'account', title: 'Account Information', path: '/shop/profile/account-information' },
  { id: 'shop', title: 'Shop Details', path: '/shop/profile/shop-details' },
  { id: 'security', title: 'Security', path: '/shop/profile/security' },
];

export function DesktopShopSettings({ title, description, active, children }: {
  title: string; description: string; active: 'overview' | 'account' | 'shop' | 'security'; children: ReactNode;
}) {
  const palette = usePalette();
  return <Screen title="Shop settings" dark={false} back={false} maxWidth={1500} background={palette.surface}>
    <View testID="desktop-shop-settings" style={{ gap: 18 }}>
      <View style={{ gap: 4 }}><Txt style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: '600', color: palette.primary }}>WORKSPACE / SETTINGS</Txt><Txt accessibilityRole="header" style={{ fontSize: 25, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6 }}>{title}</Txt><Txt style={{ color: palette.muted, fontSize: 13 }}>{description}</Txt></View>
        <View testID="shop-settings-tabs" accessibilityRole="tablist" accessibilityLabel="Shop settings navigation" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.line }}>
          {destinations.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={`Settings: ${item.title}`} aria-selected={active === item.id} accessibilityState={{ selected: active === item.id }} onPress={() => router.push(item.path as Href)}
            style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', minHeight: 50, borderBottomWidth: 3, borderBottomColor: active === item.id ? palette.primary : 'transparent', backgroundColor: pressed ? palette.soft : 'transparent' })}>
            <Txt style={{ fontSize: 14, fontWeight: active === item.id ? '700' : '500', color: active === item.id ? palette.primary : palette.muted }}>{item.title}</Txt>
          </Pressable>)}
        </View>
        <View style={{ minWidth: 0, gap: 14 }}>{children}</View>
    </View>
  </Screen>;
}

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const palette = usePalette();
  return <Card style={{ padding: 18, borderRadius: 14, gap: 12 }}>
    <View style={{ gap: 3 }}><Txt accessibilityRole="header" style={{ fontSize: 15, fontWeight: '700' }}>{title}</Txt>{!!description && <Txt style={{ fontSize: 12, lineHeight: 18, color: palette.muted }}>{description}</Txt>}</View>
    {children}
  </Card>;
}

export function SettingsLink({ title, description, onPress }: { title: string; description: string; onPress: () => void }) {
  const palette = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 20, borderRadius: 14, borderWidth: 1, borderColor: pressed ? palette.primary : palette.line, backgroundColor: pressed ? palette.soft : 'white', gap: 10 })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Txt style={{ flex: 1, fontSize: 15, fontWeight: '600' }}>{title}</Txt><ArrowUpRight size={17} color={palette.primary} /></View><Txt style={{ fontSize: 13, lineHeight: 21, color: palette.muted }}>{description}</Txt>
  </Pressable>;
}

export function SettingsSaveBar({ onSave, busy, title = 'Save Changes', children }: { onSave: () => void; busy: boolean; title?: string; children?: ReactNode }) {
  const palette = usePalette();
  return <View style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 12, gap: 8 }}>
    {children}
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}><Txt style={{ color: palette.muted, fontSize: 12, flex: 1 }}>Review your changes before saving.</Txt><Button title={title} busy={busy} onPress={onSave} compact style={{ minWidth: 150 }} /></View>
  </View>;
}
