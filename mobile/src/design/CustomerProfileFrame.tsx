import type { ReactNode } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useFlowNavigation } from './data';
import { Screen, Txt, usePalette } from './ui';

export function useDesktopCustomerProfile() {
  const { width } = useWindowDimensions();
  const palette = usePalette();
  return Platform.OS === 'web' && width >= 1100 && palette.role === 'customer';
}

export function CustomerProfileFrame({ active, title, description, children }: {
  active: 'overview' | 'edit'; title: string; description: string; children: ReactNode;
}) {
  const palette = usePalette();
  const { go } = useFlowNavigation();
  return <Screen title="Settings" back={false} dark={false} maxWidth={1440} background={palette.surface}>
    <View testID="customer-profile-desktop" style={{ gap: 18 }}>
      <View style={{ gap: 4 }}><Txt style={{ fontSize: 10, letterSpacing: 1.1, fontWeight: '600', color: palette.primary }}>ACCOUNT / SETTINGS</Txt><Txt accessibilityRole="header" style={{ fontSize: 25, lineHeight: 32, letterSpacing: -0.5, fontWeight: '700' }}>{title}</Txt><Txt style={{ fontSize: 13, color: palette.muted }}>{description}</Txt></View>
      <View accessibilityRole="tablist" accessibilityLabel="Customer profile settings" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.line }}>
        {[{ id: 'overview', title: 'Overview' }, { id: 'edit', title: 'Personal information' }].map(tab => <Pressable key={tab.id} accessibilityRole="tab" aria-selected={active === tab.id} accessibilityLabel={`Profile: ${tab.title}`} onPress={() => { if (active !== tab.id) { if (tab.id === 'overview') router.replace('/(user)/profile'); else go('edit-profile'); } }}
          style={({ pressed }) => ({ flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: active === tab.id ? palette.primary : 'transparent', backgroundColor: pressed ? palette.soft : 'transparent' })}>
          <Txt style={{ fontSize: 14, fontWeight: active === tab.id ? '600' : '500', color: active === tab.id ? palette.primary : palette.muted }}>{tab.title}</Txt>
        </Pressable>)}
      </View>
      {children}
    </View>
  </Screen>;
}

export function ProfileFact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  const palette = usePalette();
  return <View style={{ flexBasis: wide ? '100%' : '46%', flexGrow: 1, minWidth: 0, gap: 4 }}><Txt style={{ fontSize: 11, lineHeight: 17, color: palette.muted, fontWeight: '600' }}>{label}</Txt><Txt selectable style={{ fontSize: 14, lineHeight: 22 }}>{value}</Txt></View>;
}
