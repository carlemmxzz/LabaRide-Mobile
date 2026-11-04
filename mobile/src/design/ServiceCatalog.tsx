import { Pressable, View } from 'react-native';
import { Clock3, Pencil, Plus, Scale, Trash2 } from 'lucide-react-native';
import type { KiloPrice, Service } from './data';
import { Button, Card, Empty, Txt, money, usePalette } from './ui';
import { serviceCardColors } from './service-colors';

export function ServiceCatalog({ services, ranges, ready, busy, edit, remove, add, addRange }: {
  services: Service[]; ranges: KiloPrice[]; ready: boolean; busy: boolean;
  edit: (service: Service) => void; remove: (service: Service) => void; add: () => void; addRange: () => void;
}) {
  const palette = usePalette();
  const packages = services.filter(service => service.packageKilos != null).length;
  return <View testID="desktop-service-catalog" style={{ gap: 24 }}>
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Txt accessibilityRole="header" style={{ fontSize: 25, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 }}>Services & pricing</Txt><View style={{ backgroundColor: palette.soft, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 7 }}><Txt style={{ fontSize: 12, fontWeight: '600', color: palette.primary }}>{services.length} {services.length === 1 ? 'service' : 'services'}</Txt></View></View>
      <Txt style={{ fontSize: 13, color: palette.muted }}>Manage your service menu, prices, and standard processing times.</Txt>
    </View>
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Txt accessibilityRole="header" style={{ fontSize: 15, fontWeight: '600' }}>Your services</Txt><Txt style={{ fontSize: 12, color: palette.muted }}>{packages} per load · {services.length - packages} per kilogram</Txt></View>
      <View testID="service-catalog-grid" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {services.map(service => {
          const accent = serviceCardColors(service.color, palette.primary).background;
          const isPackage = service.packageKilos != null;
          return <View key={service.id} testID={`service-card-${service.id}`} style={{ flexBasis: '30%', flexGrow: 1, maxWidth: '33%', minWidth: 0, borderRadius: 16, borderWidth: 1, borderColor: palette.line, backgroundColor: 'white', overflow: 'hidden' }}>
            <View testID={`service-accent-${service.id}`} style={{ height: 4, backgroundColor: accent }} />
            <View style={{ padding: 18, gap: 14, flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: accent }} /><Txt style={{ fontSize: 11, color: palette.muted, fontWeight: '600' }}>{isPackage ? 'PER LOAD' : 'PER KILOGRAM'}</Txt></View>
                <Scale size={15} strokeWidth={1.6} color={palette.muted} />
              </View>
              <View style={{ gap: 5 }}><Txt accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', lineHeight: 24 }}>{service.serviceName}</Txt><View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}><Txt style={{ fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] }}>{money(service.price)}</Txt><Txt style={{ fontSize: 12, color: palette.muted }}>/ {isPackage ? 'load' : 'kg'}</Txt></View></View>
              <View style={{ backgroundColor: palette.surface, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 }}><Txt style={{ fontSize: 12, color: palette.muted }}>{isPackage ? `Up to ${Number(service.packageKilos)} kg per load` : 'Charged by laundry weight'}</Txt></View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1 }}><Clock3 size={14} color={palette.muted} style={{ marginTop: 2 }} /><Txt style={{ fontSize: 11, lineHeight: 18, color: palette.muted }}>{service.washingMinutes && service.dryingMinutes ? `Wash ${Number(service.washingMinutes)} min · Dry ${Number(service.dryingMinutes)} min` : 'Processing times not set'}</Txt></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.line }}>
                <Button title="Edit service" accessibilityLabel="Edit" compact outline disabled={busy} icon={<Pencil size={14} color={palette.primary} />} onPress={() => edit(service)} style={{ flex: 1, borderColor: palette.line }} />
                <Pressable accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint={`Delete ${service.serviceName}`} disabled={busy} onPress={() => remove(service)} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: pressed ? '#FFF1F2' : 'white', opacity: busy ? 0.5 : 1 })}><Trash2 size={16} color={palette.danger} /></Pressable>
              </View>
            </View>
          </View>;
        })}
      </View>
      {ready && !services.length && <Card><Empty title="No services added yet" message="Create your first service with a price per load or per kilogram." action="Add Service" onPress={add} /></Card>}
    </View>
    <Card testID="service-weight-pricing" style={{ padding: 20, gap: 16, borderRadius: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
        <View style={{ gap: 4, flex: 1 }}><Txt accessibilityRole="header" style={{ fontSize: 16, fontWeight: '600' }}>Weight-based pricing</Txt><Txt style={{ fontSize: 12, lineHeight: 19, color: palette.muted }}>Kilogram rates by weight range. Fixed-price loads use their service price.</Txt></View>
        <Button title="Add Price Range" compact outline disabled={busy} icon={<Plus size={15} color={palette.primary} />} onPress={addRange} />
      </View>
      {ranges.length ? <View style={{ borderWidth: 1, borderColor: palette.line, borderRadius: 10, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', backgroundColor: palette.surface, paddingHorizontal: 16, paddingVertical: 10 }}><Txt style={{ flex: 1, fontSize: 11, fontWeight: '600', color: palette.muted }}>WEIGHT RANGE</Txt><Txt style={{ flex: 1, textAlign: 'right', fontSize: 11, fontWeight: '600', color: palette.muted }}>RATE PER KILOGRAM</Txt></View>
        {ranges.map(range => <View key={range.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: palette.line }}><Txt style={{ flex: 1, fontSize: 13, fontWeight: '500' }}>{range.minKilo} kg – {range.maxKilo} kg</Txt><Txt style={{ flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{money(range.pricePerKilo)}<Txt style={{ fontSize: 12, color: palette.muted }}> / kg</Txt></Txt></View>)}
      </View> : <View style={{ padding: 18, borderRadius: 10, backgroundColor: palette.surface, gap: 4 }}><Txt style={{ fontSize: 13, fontWeight: '500' }}>No price ranges set</Txt><Txt style={{ fontSize: 12, color: palette.muted }}>Add a weight range and its kilogram rate to set up weight-based pricing.</Txt></View>}
      {!!ranges.length && <Txt style={{ fontSize: 11, color: palette.muted }}>{ranges.length} {ranges.length === 1 ? 'range' : 'ranges'} configured · Existing ranges are view-only.</Txt>}
    </Card>
  </View>;
}
