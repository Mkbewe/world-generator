import {
  CLIMATE_TEMPERATURE_LACUNARITY,
  CLIMATE_TEMPERATURE_OCTAVES,
  CLIMATE_TEMPERATURE_PERSISTENCE,
  CLIMATE_TEMPERATURE_STREAM,
  CLIMATE_TEMPERATURE_WAVELENGTH_SHARE,
  CLIMATE_WARP_OCTAVES,
  CLIMATE_WARP_WAVELENGTH_SHARE,
  CLIMATE_WARP_X_STREAM,
  CLIMATE_WARP_Y_STREAM,
} from './defaults';
import type { WorldDimensions } from '../../../world-dimensions';
import { NoiseSource, type RandomFactory, type WorldNoiseReader } from '../../random';

export interface TemperatureBands {
  /** Broad anomaly added to the final temperature. */
  readonly temperature: WorldNoiseReader;
  /** Horizontal displacement of the base-grid sample point, in normalized units. */
  readonly warpX: WorldNoiseReader;
  /** Vertical displacement of the base-grid sample point, in normalized units. */
  readonly warpY: WorldNoiseReader;
}

/** Seeded climate bands; they share the world seed but no stream with other stages. */
export function createTemperatureBands(
  random: RandomFactory,
  dimensions: WorldDimensions
): TemperatureBands {
  const spanMeters = Math.max(dimensions.widthMeters, dimensions.heightMeters);
  const temperatureWavelength = Math.max(1, spanMeters * CLIMATE_TEMPERATURE_WAVELENGTH_SHARE);
  const warpWavelength = Math.max(1, spanMeters * CLIMATE_WARP_WAVELENGTH_SHARE);

  return {
    temperature: new NoiseSource(random, CLIMATE_TEMPERATURE_STREAM).band(dimensions, {
      wavelengthMeters: temperatureWavelength,
      octaves: CLIMATE_TEMPERATURE_OCTAVES,
      persistence: CLIMATE_TEMPERATURE_PERSISTENCE,
      lacunarity: CLIMATE_TEMPERATURE_LACUNARITY,
    }),
    warpX: new NoiseSource(random, CLIMATE_WARP_X_STREAM).band(dimensions, {
      wavelengthMeters: warpWavelength,
      octaves: CLIMATE_WARP_OCTAVES,
    }),
    warpY: new NoiseSource(random, CLIMATE_WARP_Y_STREAM).band(dimensions, {
      wavelengthMeters: warpWavelength,
      octaves: CLIMATE_WARP_OCTAVES,
    }),
  };
}
