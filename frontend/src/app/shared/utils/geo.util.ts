/**
 * Great-circle distance in kilometers (haversine) — same formula as the backend's
 * PropertyMatchingService.distanceKm, so map display and matching never disagree.
 */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusKm = 6371.0;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function filterWithinRadius<T extends { latitude?: number; longitude?: number }>(
  items: T[],
  centerLat: number,
  centerLng: number,
  radiusKm: number
): T[] {
  return items.filter(
    item =>
      item.latitude != null &&
      item.longitude != null &&
      distanceKm(centerLat, centerLng, item.latitude, item.longitude) <= radiusKm
  );
}
