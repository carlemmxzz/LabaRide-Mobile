import { useState, type ReactNode } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { ClipboardList, Clock3, CreditCard, MapPin, ShieldAlert, type LucideIcon } from 'lucide-react-native';
import { Txt, usePalette } from './ui';

export function OrderBentoGrid({ children }: { children: ReactNode }) {
  return <View testID="order-bento-grid" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }}>{children}</View>;
}

export function OrderBentoCard({ title, subtitle, kind = 'details', children, expandable = false, actionLabel = 'Manage order' }: {
  title: string; subtitle: string; kind?: 'details' | 'location' | 'payment' | 'history' | 'issues'; children: ReactNode; expandable?: boolean; actionLabel?: string;
}) {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const icons: Record<string, LucideIcon> = { details: ClipboardList, location: MapPin, payment: CreditCard, history: Clock3, issues: ShieldAlert };
  const Icon = icons[kind];
  const accent = kind === 'issues' ? palette.danger : palette.primary;
  return <View style={{ flexBasis: width >= 768 ? '47%' : '100%', flexGrow: 1, minWidth: 0, maxWidth: '100%', borderWidth: 1, borderColor: palette.line, borderRadius: 20, backgroundColor: 'white', padding: 20, gap: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: kind === 'issues' ? '#FFF1F2' : palette.soft, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={accent} strokeWidth={1.8} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt accessibilityRole="header" style={{ fontSize: 15, fontWeight: '700', color: palette.ink }}>{title}</Txt>
        <Txt style={{ fontSize: 12, lineHeight: 18, color: palette.muted }}>{subtitle}</Txt>
      </View>
    </View>
    {(!expandable || visited) && <View style={{ gap: 12, display: !expandable || open ? 'flex' : 'none' }}>{children}</View>}
    {expandable && <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => { setVisited(true); setOpen(value => !value); }} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 8 }}>
      <Txt style={{ fontSize: 13, fontWeight: '600', color: accent }}>{open ? 'Close editor' : `${actionLabel} →`}</Txt>
    </Pressable>}
  </View>;
}

export function OrderFact({ label, children }: { label: string; children: ReactNode }) {
  const palette = usePalette();
  return <View style={{ gap: 3 }}><Txt style={{ fontSize: 11, lineHeight: 16, fontWeight: '600', color: palette.muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>{label}</Txt><View style={{ gap: 3 }}>{typeof children === 'string' ? <Txt selectable style={{ fontSize: 14, fontWeight: '500' }}>{children}</Txt> : children}</View></View>;
}

export function OrderActivity({ children, count, total }: { children: ReactNode; count: number; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const palette = usePalette();
  const items = Array.isArray(children) ? children : [children];
  return <View style={{ gap: 12 }}>
    {expanded ? items : items.slice(0, count)}
    {total > count && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}><Txt style={{ fontSize: 13, fontWeight: '600', color: palette.primary }}>{expanded ? 'Show recent updates' : `View all ${total} updates`}</Txt></Pressable>}
  </View>;
}
