import type { BottomTabNavigationOptions } from 'expo-router/tabs';
import { View } from 'react-native';
import { Brand, Txt } from '../design/ui';
import type { rolePalette } from '../design/theme-tokens';

// Keep every desktop workspace on the rider sidebar's dimensions and rhythm.
export function workspaceSidebar(palette: ReturnType<typeof rolePalette>, bottomInset: number, tagline: string): BottomTabNavigationOptions {
  return {
    tabBarPosition: 'left',
    tabBarLabelPosition: 'beside-icon',
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: palette.muted,
    tabBarActiveBackgroundColor: palette.soft,
    tabBarLabelStyle: { fontFamily: 'Inter-Medium', fontSize: 12 },
    tabBarIconStyle: { width: 24, height: 24 },
    tabBarItemStyle: { borderRadius: 12, marginHorizontal: 8, marginVertical: 4, height: 44, minHeight: 44, flexGrow: 0, flexShrink: 0 },
    tabBarBackground: () => <View pointerEvents="none" style={{ position: 'absolute', top: 24, left: 20 }}><Brand /><Txt style={{ color: palette.muted, marginTop: 8 }}>{tagline}</Txt></View>,
    tabBarStyle: { width: 224, minWidth: 224, maxWidth: 224, backgroundColor: 'white', borderTopWidth: 0, borderRightWidth: 1, borderColor: palette.line, paddingTop: 116, paddingBottom: Math.max(bottomInset, 8) },
  };
}
