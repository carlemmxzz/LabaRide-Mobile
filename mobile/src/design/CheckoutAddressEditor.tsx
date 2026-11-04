import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { api, message, notify, type Profile } from './data';
import { addressError, addressPayload, addressValues } from './address';
import { AddressFields, FormError } from './AddressFields';
import { Button, Card, Txt, styles } from './ui';

export function CheckoutAddressEditor({ userId, value, selected, onSaved, onClose, onBusyChange }: {
  userId: number; value?: Partial<Profile> | null; selected?: Partial<Profile> | null;
  onSaved: () => void; onClose: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const cache = useQueryClient();
  const [values, setValues] = useState(() => addressValues(value));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const original = useRef(selected);
  async function save() {
    if (lock.current) return;
    const validation = addressError(values);
    if (validation) { setError(validation); return; }
    const payload = addressPayload(values);
    if (payload.latitude == null || payload.longitude == null) {
      setError('Place the map pin at this address before saving. Use current position only if you are there now.'); return;
    }
    lock.current = true; setBusy(true); onBusyChange(true); setError(null);
    try {
      await cache.cancelQueries({ queryKey: ['user', userId] });
      const profile = await api.put<Profile>(`/users/${userId}`, payload);
      cache.setQueryData(['user', userId], profile);
      onSaved();
      if (original.current) {
        try {
          const key = `labaride-addresses:${userId}`;
          const entries: Partial<Profile>[] = JSON.parse(await AsyncStorage.getItem(key) || '[]');
          if (!Array.isArray(entries)) throw new Error('Invalid saved addresses');
          const signature = JSON.stringify(addressPayload(original.current));
          const updated = entries.map(entry => JSON.stringify(addressPayload(entry)) === signature ? payload : entry);
          await AsyncStorage.setItem(key, JSON.stringify(updated));
          cache.setQueryData(['saved-addresses', userId], updated);
        } catch {
          notify('Address saved', 'Your Profile and checkout were updated, but the separate saved-address copy on this device could not be updated.');
        }
      }
      onClose();
    } catch (failure) { setError(message(failure)); }
    finally { lock.current = false; setBusy(false); onBusyChange(false); }
  }
  return <Card style={{ width: '100%', maxWidth: 540, maxHeight: '90%', padding: 24 }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
      <Txt style={styles.heading}>Edit address & map pin</Txt>
      <Txt style={styles.muted}>Save here to update your Profile address and this checkout together. If you are editing a saved address, its copy on this device is updated too.</Txt>
      <View pointerEvents={busy ? 'none' : 'auto'}><AddressFields values={values} setValues={setValues} requirePin /></View>
      <FormError error={error} />
      <Button title="Save address to checkout & profile" busy={busy} onPress={save} />
      <Button title="Cancel" outline disabled={busy} onPress={() => { if (!lock.current) onClose(); }} />
    </ScrollView>
  </Card>;
}
