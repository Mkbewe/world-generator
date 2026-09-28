import type { WorldNoiseBandSpec } from '../../random';
import type { HeightmapConfig } from '../../types';

/** Relief range: 0 is flat, 1 is very mountainous. */
export const MIN_RELIEF = 0;
export const MAX_RELIEF = 1;

/** Flat, fixed sea floor: the map is read top-down, so how deep the ocean is does not matter. */
export const OCEAN_DEPTH_METERS = 100;

/** Heightmap across worlds; the shared shelf shape stays in the landmass config. */
export const DEFAULT_HEIGHTMAP_CONFIG: HeightmapConfig = {
  relief: 0.5,
  featureScale: 0.5,
};

/** Names of the heightmap's own noise bands. */
export type HeightmapBandName = 'large' | 'medium' | 'fine';

/** One band: physical wavelength, octaves and the share of the field amplitude. */
export interface HeightmapBand extends WorldNoiseBandSpec {
  /** Wavelength of the base wave in metres. */
  readonly wavelengthMeters: number;
  /**
   * Share of the field amplitude this band may add, 0..1. The transitional
   * field keeps the global amplitude; the new field consumes it in GEO-04.
   */
  readonly amplitudeShare: number;
  readonly octaves: number;
  readonly persistence: number;
  readonly lacunarity: number;
}

/**
 * The heightmap's own bands, independent of the Noise stage raster and config.
 * The current transitional field warps with `medium` and jitters the coast with
 * `fine`; `large` is the relief band the new field consumes in GEO-04.
 */
export const HEIGHTMAP_BANDS: Readonly<Record<HeightmapBandName, HeightmapBand>> = {
  large: {
    wavelengthMeters: 3000,
    amplitudeShare: 0.5,
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2,
  },
  medium: {
    wavelengthMeters: 700,
    amplitudeShare: 0.3,
    octaves: 3,
    persistence: 0.5,
    lacunarity: 2,
  },
  fine: {
    wavelengthMeters: 150,
    amplitudeShare: 0.12,
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2,
  },
};
