import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type Profile } from './data';
import { addressError, addressPayload } from './address';

export function sameSavedAddress(a?: Partial<Profile> | null, b?: Partial<Profile> | null) {
  return JSON.stringify(addressPayload(a || {})) === JSON.stringify(addressPayload(b || {}));
}

export async function saveDefaultAddress(userId: number, candidate: Partial<Profile>, previous?: Profile) {
  const error = addressError(candidate);
  if (error) throw new Error(error);
  const payload = addressPayload(candidate);
  if (payload.latitude == null || payload.longitude == null) throw new Error('Add a map pin to this address before setting it as default.');
  const key = `labaride-addresses:${userId}`;
  const entries: Partial<Profile>[] = JSON.parse(await AsyncStorage.getItem(key) || '[]');
  if (!Array.isArray(entries)) throw new Error('Saved addresses could not be read. Please try again.');
  const append = (entry: Partial<Profile>) => { if (!entries.some(existing => sameSavedAddress(existing, entry))) entries.push(addressPayload(entry)); };
  if (previous && !addressError(previous)) append(previous);
  append(payload);
  // Preserve the old default before replacing the server profile. A failed API
  // request leaves the old default selected and both saved addresses available.
  await AsyncStorage.setItem(key, JSON.stringify(entries));
  const profile = await api.put<Profile>(`/users/${userId}`, payload);
  return { profile, entries };
}
