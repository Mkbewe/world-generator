import type { WorldNoiseBandSpec } from '../../random';
import type { HeightmapConfig } from '../../types';

/** Relief range: 0 is flat, 1 is very mountainous. */
export const MIN_RELIEF = 0;
export const MAX_RELIEF = 1;

/** Islet frequency range: 0 hides every islet, 1 scatters rocks everywhere. */
export const MIN_ISLET_FREQUENCY = 0;
export const MAX_ISLET_FREQUENCY = 1;

/**
 * Base depth of the open ocean floor, in metres below the waterline. The
 * large band undulates the floor between roughly -84 m and -140 m, so the
 * deep ocean always stays well below the -20 m shelf. Working value.
 */
export const OCEAN_FLOOR_METERS = 140;

/** Depth at the shelf edge, where the island slope meets the open ocean. */
export const SHELF_DEPTH_METERS = 28;

/**
 * Border gate, in metres. Land dies out inside this margin from the region
 * border; the margin start is shifted by the large band, so the strait is
 * ragged instead of a fixed ring. Working values to calibrate.
 */
export const BORDER_GATE_METERS = 140;
export const BORDER_GATE_FADE_METERS = 260;

/** How strongly the large band shifts the gate threshold, 0..1. */
export const BORDER_GATE_WARP_SHARE = 0.6;

/** Domain-warp strength of the island contour, as a share of its radius. */
export const HILL_WARP_SHARE = 0.28;

/** Medium-band modulation of the land heights, as a share of the height. */
export const COAST_DETAIL_SHARE = 0.18;

/**
 * Smoothing of the stamped land: passes and the radius as a share of the
 * island radius, so islands stay smooth at any sampling density. Older
 * regions scale their radius up, which reads as erosion.
 */
export const FIELD_SMOOTH_PASSES = 2;
export const FIELD_SMOOTH_SHARE = 0.022;

/** Smallest island radius and the cap on distinct forms per region. */
export const MIN_ISLAND_RADIUS_METERS = 95;
export const MAX_FORMS_PER_REGION = 14;

/** Islets appear only on shelf water shallower than this, never in the ocean. */
export const ISLET_MAX_DEPTH_METERS = 24;

/** Tallest islet bump on top of the local seabed, in metres. */
export const ISLET_BUMP_METERS = 26;

/**
 * Islets come in clusters: the medium band picks the shoals (sometimes here,
 * sometimes not), the fine band picks the rocks inside a shoal. Fractal bands
 * rarely reach their theoretical ±1, so the levels and weights are normalized
 * against their practical maximum.
 */
export const ISLET_ZONE_LEVEL = 0.35;
export const ISLET_ZONE_MIN = 0.1;
export const ISLET_ROCK_LEVEL = 0.12;
export const ISLET_PRACTICAL_MAX = 0.6;

/** Provenance of a cell outside the world mask. */
export const PROVENANCE_OUTSIDE = -1;

/** Global heightmap values; per-region terrain metadata lives with the regions. */
export const DEFAULT_HEIGHTMAP_CONFIG: HeightmapConfig = {
  relief: 0.5,
  isletFrequency: 0.35,
};

/** Names of the heightmap's own noise bands. */
export type HeightmapBandName = 'large' | 'warpX' | 'warpY' | 'coast' | 'ridge' | 'fine';

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
 * Every mechanism draws from its own uncorrelated stream: `large` shapes the
 * ocean floor and the border gate, `warpX`/`warpY` displace sample points,
 * `coast` carves the coastline, `ridge` forms the interior ridges and the
 * channels, `fine` adds roughness, islets and reef detail.
 */
export const HEIGHTMAP_BANDS: Readonly<Record<HeightmapBandName, HeightmapBand>> = {
  large: {
    wavelengthMeters: 2800,
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2,
  },
  warpX: {
    wavelengthMeters: 420,
    octaves: 3,
    persistence: 0.55,
    lacunarity: 2.1,
  },
  warpY: {
    wavelengthMeters: 420,
    octaves: 3,
    persistence: 0.55,
    lacunarity: 2.1,
  },
  coast: {
    wavelengthMeters: 260,
    octaves: 3,
    persistence: 0.55,
    lacunarity: 2.2,
  },
  ridge: {
    wavelengthMeters: 650,
    octaves: 3,
    persistence: 0.5,
    lacunarity: 2,
  },
  fine: {
    wavelengthMeters: 120,
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2,
  },
};
