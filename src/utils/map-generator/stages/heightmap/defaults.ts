import type { WorldNoiseBandSpec } from '../../random';
import type { HeightmapConfig } from '../../types';

/** Relief range: 0 is flat, 1 is very mountainous. */
export const MIN_RELIEF = 0;
export const MAX_RELIEF = 1;

/** Flat, fixed sea floor: the map is read top-down, so how deep the ocean is does not matter. */
export const OCEAN_DEPTH_METERS = 100;

/** Global heightmap values; local seabed, shelf and relief live in the geology plan. */
export const DEFAULT_HEIGHTMAP_CONFIG: HeightmapConfig = {
  relief: 0.5,
};

/** Names of the heightmap's own noise bands. */
export type HeightmapBandName = 'large' | 'medium' | 'fine';

/** One band: physical wavelength, octaves and the fractal shape of its stack. */
export interface HeightmapBand extends WorldNoiseBandSpec {
  /** Wavelength of the base wave in metres. */
  readonly wavelengthMeters: number;
  readonly octaves: number;
  readonly persistence: number;
  readonly lacunarity: number;
}

/**
 * The heightmap's own bands, independent of the Noise stage raster and config.
 * `large` groups the forms, `medium` splits land from water and `fine` carries
 * the detail the field gates below the sample scale.
 */
export const HEIGHTMAP_BANDS: Readonly<Record<HeightmapBandName, HeightmapBand>> = {
  large: {
    wavelengthMeters: 3000,
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2,
  },
  medium: {
    wavelengthMeters: 700,
    octaves: 3,
    persistence: 0.5,
    lacunarity: 2,
  },
  fine: {
    wavelengthMeters: 150,
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2,
  },
};
