import { Image, View } from 'react-native';
import { usePalette } from './theme';

const marks = {
  customer: require('../../assets/brand/customer.png'),
  shop: require('../../assets/brand/shop.png'),
  rider: require('../../assets/brand/rider.png'),
};

export function BrandMark({ size = 48, white = false }: { size?: number; white?: boolean }) {
  const { role } = usePalette();
  if (role === 'admin') return <Image source={white ? require('../../assets/flutter/whitelogo.png') : require('../../assets/flutter/blacklogo.png')} resizeMode="contain" style={{ width: size, height: size }} />;
  // Preserve the full source canvas and its transparent breathing room.
  // No crop coordinates: replacement artwork must never be cut off.
  return <View testID={`brand-mark-${role}`} pointerEvents="none" style={{ width: size, height: size, overflow: 'visible', flexShrink: 0, borderRadius: white ? 8 : 0, backgroundColor: white ? 'white' : 'transparent' }}>
    <Image source={marks[role]} resizeMode="contain" accessibilityLabel={`LabaRide ${role} logo`} style={{ width: '100%', height: '100%' }} />
  </View>;
}
