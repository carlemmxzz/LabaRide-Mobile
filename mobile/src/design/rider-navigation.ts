import { directionsUrl, parseRoadRoute, type RoutePoint } from './job-route';
export type NavigationStop = { name?: string; latitude?: unknown; longitude?: unknown; address?: string };
export function navigationPoint(stop: NavigationStop): RoutePoint | null {
  function coordinate(value: unknown) {
    if (typeof value !== 'number' && typeof value !== 'string' || typeof value === 'string' && !value.trim()) return NaN;
    return Number(value);
  }
  const latitude = coordinate(stop.latitude), longitude = coordinate(stop.longitude);
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}
export function riderDirectionsUrl(origin: RoutePoint, destination: RoutePoint, token: string) {
  return directionsUrl(origin, destination, token).replace('steps=false', 'steps=true');
}
export function parseNavigationRoute(value: unknown) {
  const route = parseRoadRoute(value);
  const response = value as { routes: { legs?: { steps?: { distance?: number; maneuver?: { instruction?: string } }[] }[] }[] };
  const steps = (response.routes[0].legs || []).flatMap(leg => leg.steps || []).flatMap(step => {
    const instruction = step.maneuver?.instruction;
    return typeof instruction === 'string' && instruction.trim() && Number.isFinite(step.distance) && step.distance! >= 0
      ? [{ instruction: instruction.trim(), distanceMeters: step.distance! }] : [];
  });
  return { ...route, steps };
}
