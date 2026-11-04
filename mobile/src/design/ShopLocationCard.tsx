import { useMemo } from 'react';
import { Linking, View, useWindowDimensions } from 'react-native';
import { MapPin } from 'lucide-react-native';
import type { Shop } from './data';
import { address } from './data';
import { coordinates } from './discovery';
import LaundryMap from './LaundryMap';
import { Button, Card, Txt, usePalette } from './ui';

export function ShopLocationCard({ shop }: { shop: Shop }) {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const point = coordinates(shop);
  const pins = useMemo(() => [shop], [shop]);
  return <Card testID="shop-location" style={{ padding: desktop ? 22 : 18, flexDirection: desktop ? 'row' : 'column', alignItems: 'stretch', gap: 20 }}>
    <View style={{ flex: desktop ? 1 : undefined, minWidth: 0, gap: 12, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MapPin size={20} color={palette.primary} /><Txt accessibilityRole="header" style={{ fontSize: 18, fontWeight: '600' }}>Shop location</Txt></View>
      <Txt selectable style={{ fontSize: 13, lineHeight: 22, color: palette.muted }}>{address(shop) || 'Address not provided'}</Txt>
      <Txt style={{ fontSize: 12, lineHeight: 19, color: palette.muted }}>{point ? 'The pin shows the location saved by this shop.' : 'This shop has not saved a map location yet. Contact the shop to confirm its location.'}</Txt>
      {point && <Button title="Open in maps" compact outline style={{ alignSelf: 'flex-start' }} onPress={() => { void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`); }} />}
    </View>
    {point && <View testID="shop-location-map" accessibilityLabel={`Map showing ${shop.shopName}'s saved location`} style={{ flex: desktop ? 2 : undefined, minWidth: 0, width: desktop ? undefined : '100%', height: desktop ? 300 : 240, borderRadius: 12, overflow: 'hidden', backgroundColor: palette.surface }}>
      <LaundryMap shops={pins} latitude={point.latitude} longitude={point.longitude} showExpand={false} />
    </View>}
  </Card>;
}
