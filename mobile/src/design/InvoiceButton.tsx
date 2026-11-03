import { useState } from 'react';
import { Modal, Platform, ScrollView, Share, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { api, message } from './data';
import { Button, Card, PriceRow, Txt, styles, usePalette } from './ui';
import { QueryState } from './UserScreens';
import { invoiceDate, invoiceHtml, invoiceMoney, invoiceText, type Invoice } from './invoice';

export function InvoiceButton({ orderId }: { orderId: number }) {
  const palette = usePalette();
  const userId = useAuthStore(state => state.user?.id);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const invoice = useQuery({ queryKey: ['invoice', userId, orderId], enabled: visible && !!userId,
    queryFn: () => api.get<Invoice>(`/transactions/${orderId}/invoice`), staleTime: 0, gcTime: 0,
  });
  const data = invoice.data;
  async function exportInvoice() {
    if (!data) return;
    setError('');
    try {
      if (Platform.OS === 'web') {
        const tab = window.open('', '_blank');
        if (!tab) { setError('Allow popups to open the printable invoice.'); return; }
        tab.opener = null;
        tab.document.write(invoiceHtml(data)); tab.document.close();
      } else await Share.share({ title: `Invoice ${data.number}`, message: invoiceText(data) });
    } catch (failure) { setError(message(failure)); }
  }
  return <>
    <Button title="View invoice" compact outline onPress={() => { setError(''); setVisible(true); }} />
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, backgroundColor: '#00000066', padding: 20 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <Card testID="order-invoice" style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: 16 }}>
            <View style={styles.between}><Txt accessibilityRole="header" style={styles.title}>Invoice</Txt><Button title="Close invoice" compact outline onPress={() => setVisible(false)} /></View>
            <QueryState loading={invoice.isFetching} error={invoice.error} retry={() => invoice.refetch()} />
            {data && !invoice.isFetching && !invoice.error && <>
              <View style={{ gap: 4 }}><Txt style={styles.heading}>{data.number}</Txt><Txt style={styles.muted}>Order #{data.orderId} · {data.status.replace(/([a-z])([A-Z])/g, '$1 $2')}</Txt><Txt style={styles.muted}>{invoiceDate(data.createdAt)}</Txt></View>
              <View style={{ gap: 4 }}><Txt style={styles.heading}>{data.shop.name}</Txt>{!!data.shop.address && <Txt>{data.shop.address}</Txt>}{!!data.shop.phone && <Txt selectable>{data.shop.phone}</Txt>}</View>
              <Txt>Customer: {data.customer.name}</Txt>
              <View style={{ paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line, gap: 8 }}>
                <Txt style={{ fontWeight: '600' }}>{data.serviceName} · {data.kilos} kg</Txt>
                {data.items.map((item, index) => <PriceRow key={index} label={item.itemName} value={`× ${item.quantity}`} />)}
              </View>
              <View><PriceRow label="Service subtotal" value={invoiceMoney(data.subtotal)} /><PriceRow label="Delivery fee" value={invoiceMoney(data.deliveryFee)} /><PriceRow label="Discount" value={`−${invoiceMoney(data.discount)}`} /><PriceRow label="Total" value={invoiceMoney(data.total)} total /></View>
              <Txt>Payment method: {data.paymentMethod}</Txt>
              <Txt style={styles.muted}>Amounts as of {invoiceDate(data.updatedAt)}. Charges may change after measured weight is confirmed. Order status does not confirm payment.</Txt>
              {!!error && <Txt accessibilityRole="alert" style={{ color: palette.danger }}>{error}</Txt>}
              <Button title={Platform.OS === 'web' ? 'Print / Save PDF' : 'Share invoice'} onPress={() => { void exportInvoice(); }} />
            </>}
          </Card>
        </ScrollView>
      </View>
    </Modal>
  </>;
}
