type NavigationStop = { latitude?: unknown; longitude?: unknown; address?: string };

export function riderNavigationUrl(stop: NavigationStop) {
  const latitude = coordinate(stop.latitude);
  const longitude = coordinate(stop.longitude);
  const pinned = latitude != null && longitude != null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const destination = pinned ? `${latitude},${longitude}` : stop.address?.trim();
  if (!destination) throw new Error('This stop has no saved location or address. Ask the customer or shop to update it.');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate`;
}

function coordinate(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
