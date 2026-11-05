import {
  BASE_MOISTURE_LACUNARITY,
  BASE_MOISTURE_OCTAVES,
  BASE_MOISTURE_PERSISTENCE,
  BASE_MOISTURE_STREAM,
  BASE_MOISTURE_WAVELENGTH_SHARE,
} from './defaults';
import type { WorldDimensions } from '../../../world-dimensions';
import { NoiseSource, type RandomFactory, type WorldNoiseReader } from '../../random';
import type { WorldPoint } from '../../types';

/** Broad FBM band, independent of heat zones and every other field. */
export function createBaseMoistureBand(
  random: RandomFactory,
  dimensions: WorldDimensions
): WorldNoiseReader {
  const wavelengthMeters = Math.max(1, dimensions.widthMeters * BASE_MOISTURE_WAVELENGTH_SHARE);
  return new NoiseSource(random, BASE_MOISTURE_STREAM).band(dimensions, {
    wavelengthMeters,
    octaves: BASE_MOISTURE_OCTAVES,
    persistence: BASE_MOISTURE_PERSISTENCE,
    lacunarity: BASE_MOISTURE_LACUNARITY,
  });
}

/** Converts the signed band sample to the required 0..1 moisture range. */
export function moistureValue(band: WorldNoiseReader, point: WorldPoint): number {
  return clamp01((band(point) + 1) / 2);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
