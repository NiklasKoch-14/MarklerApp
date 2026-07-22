import { distanceKm, filterWithinRadius } from './geo.util';

describe('geo.util', () => {
  // Berlin Mitte und München Marienplatz — reale Koordinaten, ~504 km Distanz
  const BERLIN = { latitude: 52.52, longitude: 13.405 };
  const MUNICH = { latitude: 48.1351, longitude: 11.582 };

  it('computes the Berlin–Munich distance within 1% of 504 km', () => {
    const d = distanceKm(BERLIN.latitude, BERLIN.longitude, MUNICH.latitude, MUNICH.longitude);
    expect(d).toBeGreaterThan(499);
    expect(d).toBeLessThan(509);
  });

  it('returns 0 for identical coordinates', () => {
    expect(distanceKm(50.0, 8.0, 50.0, 8.0)).toBe(0);
  });

  it('keeps only items inside the radius and drops items without coordinates', () => {
    const nearBerlin = { latitude: 52.53, longitude: 13.41 };   // < 2 km
    const noCoords = { latitude: undefined, longitude: undefined };
    const result = filterWithinRadius(
      [nearBerlin, MUNICH, noCoords], BERLIN.latitude, BERLIN.longitude, 10);
    expect(result).toEqual([nearBerlin]);
  });

  it('includes items exactly on the radius boundary', () => {
    const items = [MUNICH];
    const d = distanceKm(BERLIN.latitude, BERLIN.longitude, MUNICH.latitude, MUNICH.longitude);
    expect(filterWithinRadius(items, BERLIN.latitude, BERLIN.longitude, Math.ceil(d)).length).toBe(1);
    expect(filterWithinRadius(items, BERLIN.latitude, BERLIN.longitude, Math.floor(d) - 1).length).toBe(0);
  });
});
