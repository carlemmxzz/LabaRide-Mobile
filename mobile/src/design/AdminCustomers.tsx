import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, message, useProfile } from './data';
import { useAuthStore } from '../store/authStore';
import { Button, Card, Empty, Field, Screen, SearchBox, TabsRow, Txt, styles, usePalette } from './ui';
import { QueryState } from './UserScreens';

type Customer = { id: number; name: string; email: string; phone: string | null; createdAt: string; isBlocked: boolean; blockReason: string | null; blockedAt: string | null; accessVersion: number };
type CustomerPage = { customers: Customer[]; total: number; page: number; pageSize: number };

export function AdminCustomersDesign() {
  const palette = usePalette();
  const userId = useAuthStore(state => state.user?.id);
  const profile = useProfile();
  const cache = useQueryClient();
  const [width, setWidth] = useState(0);
  const desktop = width >= 760;
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (search.trim() === query) return;
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search, query]);
  const customers = useQuery({
    queryKey: ['admin-customers', userId, query, filter, page], enabled: !!profile.data?.isAdmin,
    queryFn: async () => {
      try { return await api.get<CustomerPage>(`/admin/customers?search=${encodeURIComponent(query)}&status=${filter}&page=${page}`); }
      catch (failure) {
        if (typeof failure === 'string' && /Cannot GET \/api\/admin\/customers/.test(failure)) throw new Error('The connected backend needs the customer management update. Deploy the updated backend and apply its database migration, then retry.');
        throw failure;
      }
    },
    refetchInterval: 15000,
  });
  function choose(customer: Customer) { setSelected(customer); setReason(''); setError(''); setNotice(''); }
  async function save() {
    if (!selected || inFlight.current) return;
    if (reason.trim().length < 5) { setError('Enter a reason of at least 5 characters.'); return; }
    inFlight.current = true; setBusy(true); setError('');
    try {
      await api.put(`/admin/customers/${selected.id}/access`, { blocked: !selected.isBlocked, expectedVersion: selected.accessVersion, reason: reason.trim() });
      setNotice(`${selected.name} has been ${selected.isBlocked ? 'unblocked' : 'blocked'}.`);
      setSelected(null);
      await cache.invalidateQueries({ queryKey: ['admin-customers'] });
    } catch (failure) { setError(message(failure)); void customers.refetch(); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const data = customers.data;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : page;
  useEffect(() => { if (data && page > lastPage) setPage(lastPage); }, [data, page, lastPage]);
  return <Screen title="Customers" brandedHeader back={false} background={palette.surface}>
    <View onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)} style={[styles.stack, { width: '100%', maxWidth: 1200, alignSelf: 'center' }]}>
      <View style={{ gap: 6 }}><Txt style={styles.title}>Customer accounts</Txt><Txt style={styles.muted}>Review customers and manage access for policy violations.</Txt></View>
      <SearchBox placeholder="Search customers by name, email, or phone" value={search} onChangeText={setSearch} />
      <TabsRow items={['Active', 'Blocked', 'All']} value={filter} alignEndItem="All" onChange={value => { setFilter(value); setPage(1); }} />
      <View style={styles.between}><Txt accessibilityLiveRegion="polite" style={styles.muted}>{data ? `${data.total} ${data.total === 1 ? 'customer' : 'customers'}` : 'Customer list'}</Txt><Button title="Refresh" compact outline busy={customers.isFetching} onPress={() => { void customers.refetch(); }} /></View>
      {!!notice && <Txt accessibilityLiveRegion="polite" style={{ color: palette.primary }}>{notice}</Txt>}
      <QueryState loading={customers.isLoading} error={customers.error} retry={() => customers.refetch()} />
      {!!data?.customers.length && <Card style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
        {desktop && <View style={{ flexDirection: 'row', gap: 20, padding: 20, backgroundColor: palette.soft }}><Txt style={{ flex: 2, fontWeight: '600' }}>Customer</Txt><Txt style={{ flex: 2, fontWeight: '600' }}>Contact</Txt><Txt style={{ flex: 2, fontWeight: '600' }}>Access</Txt><Txt style={{ width: 120, fontWeight: '600' }}>Action</Txt></View>}
        {data.customers.map(customer => <View key={customer.id} testID={`admin-customer-${customer.id}`} style={{ flexDirection: desktop ? 'row' : 'column', alignItems: desktop ? 'center' : 'stretch', gap: desktop ? 20 : 12, padding: 20, borderTopWidth: 1, borderTopColor: palette.line }}>
          <View style={{ flex: desktop ? 2 : undefined, minWidth: 0, gap: 4 }}><Txt style={{ fontWeight: '600' }}>{customer.name}</Txt><Txt style={{ color: palette.muted, fontSize: 12 }}>#{customer.id} · Joined {new Date(customer.createdAt).toLocaleDateString()}</Txt></View>
          <View style={{ flex: desktop ? 2 : undefined, minWidth: 0, gap: 4 }}><Txt selectable>{customer.email}</Txt><Txt selectable style={styles.muted}>{customer.phone || 'No phone number'}</Txt></View>
          <View style={{ flex: desktop ? 2 : undefined, minWidth: 0, gap: 4 }}><Txt style={{ color: customer.isBlocked ? palette.danger : palette.primary, fontWeight: '600' }}>{customer.isBlocked ? 'Blocked' : 'Active'}</Txt>{!!customer.blockReason && <Txt style={{ color: palette.muted, fontSize: 12 }}>{customer.blockReason}</Txt>}{!!customer.blockedAt && <Txt style={{ color: palette.muted, fontSize: 12 }}>{new Date(customer.blockedAt).toLocaleDateString()}</Txt>}</View>
          <Button title={customer.isBlocked ? 'Unblock' : 'Block'} accessibilityLabel={`${customer.isBlocked ? 'Unblock' : 'Block'} ${customer.name}`} outline compact color={customer.isBlocked ? palette.primary : palette.danger} style={desktop ? { width: 120 } : { alignSelf: 'flex-start' }} onPress={() => choose(customer)} />
        </View>)}
      </Card>}
      {!customers.isLoading && !customers.error && !data?.customers.length && <Empty title="No matching customers" message="Try another search or access filter." />}
      {data && (lastPage > 1 || page > 1) && <View style={[styles.row, { justifyContent: 'flex-end', flexWrap: 'wrap' }]}><Button title="Previous" compact outline disabled={page <= 1 || customers.isFetching} onPress={() => setPage(value => value - 1)} /><Txt>Page {page} of {lastPage}</Txt><Button title="Next" compact outline disabled={page >= lastPage || customers.isFetching} onPress={() => setPage(value => value + 1)} /></View>}
    </View>
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => !busy && setSelected(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#00000066' }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <Card style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: 16 }}>
          <Txt accessibilityRole="header" style={styles.heading}>{selected?.isBlocked ? 'Unblock customer' : 'Block customer'}</Txt><Txt style={{ fontWeight: '600' }}>{selected?.name}</Txt><Txt selectable style={styles.muted}>{selected?.email}</Txt>
          <Txt>{selected?.isBlocked ? 'This customer will be able to sign in and use their account again.' : 'This customer will be unable to sign in or use their existing sessions. Existing orders and records will be kept.'}</Txt>
          <Field label={selected?.isBlocked ? 'Reason for unblocking' : 'Policy violation reason'} value={reason} onChangeText={setReason} multiline maxLength={1000} editable={!busy} />
          {!!error && <Txt accessibilityRole="alert" style={{ color: palette.danger }}>{error}</Txt>}
          <Button title={selected?.isBlocked ? 'Confirm unblock' : 'Confirm block'} color={selected?.isBlocked ? palette.primary : palette.danger} busy={busy} disabled={reason.trim().length < 5} onPress={() => { void save(); }} /><Button title="Cancel" outline disabled={busy} onPress={() => setSelected(null)} />
        </Card>
      </ScrollView></KeyboardAvoidingView>
    </Modal>
  </Screen>;
}
