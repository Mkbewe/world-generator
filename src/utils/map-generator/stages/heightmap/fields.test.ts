import {
  landAmplitudeMeters,
  MAX_LAND_AMPLITUDE_METERS,
  MIN_LAND_AMPLITUDE_METERS,
} from './fields';

describe('landAmplitudeMeters', () => {
  it('grows with relief and world size within its range', () => {
    expect(landAmplitudeMeters(1000, 0)).toBeLessThan(landAmplitudeMeters(1000, 1));
    expect(landAmplitudeMeters(1000, 0.5)).toBeLessThan(landAmplitudeMeters(10_000, 0.5));
    expect(landAmplitudeMeters(1000, 0)).toBeGreaterThanOrEqual(MIN_LAND_AMPLITUDE_METERS);
    expect(landAmplitudeMeters(10_000, 1)).toBeLessThanOrEqual(MAX_LAND_AMPLITUDE_METERS);
  });
});
