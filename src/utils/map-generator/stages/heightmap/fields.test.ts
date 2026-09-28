import { OCEAN_DEPTH_METERS } from './defaults';
import {
  crossSection,
  landAmplitudeMeters,
  MAX_LAND_AMPLITUDE_METERS,
  MIN_LAND_AMPLITUDE_METERS,
  oceanHeightMeters,
  shelfDepthMeters,
} from './fields';
import type { TerrainProfile } from '../../types';

const PLAINS: TerrainProfile = {
  elevation: 0.5,
  roughness: 0.2,
  mountainStrength: 0.05,
  hillStrength: 0.1,
  plateauStrength: 0.05,
  lakePotential: 0.5,
  erosionStrength: 0.2,
  coastalCliffStrength: 0.1,
};

const HILLS: TerrainProfile = { ...PLAINS, elevation: 0.55, hillStrength: 0.7 };

const MOUNTAINS: TerrainProfile = {
  ...PLAINS,
  elevation: 0.75,
  mountainStrength: 0.9,
  hillStrength: 0.1,
};

describe('crossSection', () => {
  it('is highest on the axis and drops to the sea datum at the coast', () => {
    expect(crossSection(0, MOUNTAINS, false)).toBeGreaterThan(crossSection(0.5, MOUNTAINS, false));
    expect(crossSection(0.5, MOUNTAINS, false)).toBeGreaterThan(
      crossSection(0.9, MOUNTAINS, false)
    );
    expect(crossSection(1, MOUNTAINS, false)).toBe(0);
  });

  it('raises mountains above hills and plains on the axis', () => {
    const axis = (values: TerrainProfile) => crossSection(0, values, false);

    expect(axis(MOUNTAINS)).toBeGreaterThan(axis(HILLS));
    expect(axis(HILLS)).toBeGreaterThan(axis(PLAINS));
  });

  it('flips a rim zone to a low axis with higher edges', () => {
    expect(crossSection(0, HILLS, true)).toBeLessThan(crossSection(0, HILLS, false));
    expect(crossSection(0.5, HILLS, true)).toBeGreaterThan(crossSection(0.5, HILLS, false));
  });
});

describe('landAmplitudeMeters', () => {
  it('grows with relief and world size within its range', () => {
    expect(landAmplitudeMeters(1000, 0)).toBeLessThan(landAmplitudeMeters(1000, 1));
    expect(landAmplitudeMeters(1000, 0.5)).toBeLessThan(landAmplitudeMeters(10_000, 0.5));
    expect(landAmplitudeMeters(1000, 0)).toBeGreaterThanOrEqual(MIN_LAND_AMPLITUDE_METERS);
    expect(landAmplitudeMeters(10_000, 1)).toBeLessThanOrEqual(MAX_LAND_AMPLITUDE_METERS);
  });
});

describe('oceanHeightMeters', () => {
  it('is the flat sea floor below the datum', () => {
    expect(oceanHeightMeters(OCEAN_DEPTH_METERS)).toBe(-OCEAN_DEPTH_METERS);
  });
});

describe('shelfDepthMeters', () => {
  it('meets the deep-ocean floor continuously at the outer shelf edge', () => {
    const depth = shelfDepthMeters(0.2499999, 0.1, 0.15, 60, 0.5);

    expect(depth).toBeCloseTo(OCEAN_DEPTH_METERS, 2);
    expect(shelfDepthMeters(0.25, 0.1, 0.15, 60, 0.5)).toBeUndefined();
  });
});
