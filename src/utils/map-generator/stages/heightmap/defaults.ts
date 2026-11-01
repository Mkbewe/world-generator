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

/** Islets rise on shelf and bank water up to this depth; the abyss stays dark. */
export const ISLET_MAX_DEPTH_METERS = 50;

/** Skerries keep this share of the shore belt away from existing land. */
export const ISLET_MIN_SHORE_DISTANCE_SHARE = 0.35;

/** Islets only rise where the border gate has faded in past this share. */
export const ISLET_GATE_MIN = 0.25;

/** Depth over which an islet bump gathers its whole height, in metres. */
export const ISLET_BUMP_DEPTH_METERS = 10;

/** Lowest share of the region amplitude an islet keeps. */
export const ISLET_AMPLITUDE_FLOOR = 0.35;

/** Tallest islet bump on top of the local seabed, in metres. */
export const ISLET_BUMP_METERS = 60;

/** Islets stay low rocks with a varied height above the waterline. */
export const ISLET_EMERGENCE_MIN_METERS = 2;
export const ISLET_EMERGENCE_MAX_METERS = 5;

/**
 * The fine band picks individual rocks. The frequency opens its threshold, so
 * a low value stays sparse while the maximum scatters rocks across the shelf.
 * Fractal bands rarely reach their theoretical ±1, so the level is normalized
 * against a practical maximum.
 */
export const ISLET_MASK_MIN = 0.25;
export const ISLET_NOISE_CEILING = 0.5;
/** Narrow fade: a selected cell gets the full bump instead of a fraction. */
export const ISLET_MASK_FADE = 0.05;
/** Slider curve: above 1 keeps the low end sparse and the middle responsive. */
export const ISLET_FREQUENCY_EXPONENT = 1.5;

/**
 * Open-sea banks: the islet frequency also lifts scattered patches of deep
 * water toward the bank depth, so skerries can appear away from any island
 * shelf. The spread and the detail band vary each bank's top, and the depth
 * fade keeps the bank edge from stepping out of the abyss.
 */
export const BANK_DEPTH_METERS = 18;
export const BANK_DEPTH_SPREAD_METERS = 20;
export const BANK_DETAIL_SPREAD_METERS = 8;
export const BANK_START_DEPTH_METERS = 35;
export const BANK_DEPTH_FADE_METERS = 25;
export const BANK_MIN_LEVEL = 0.12;
export const BANK_LARGE_SHARE = 0.25;
export const BANK_FINE_SHARE = 0.1;

/** Provenance of a cell outside the world mask. */
export const PROVENANCE_OUTSIDE = -1;

/** Global heightmap values; per-region terrain metadata lives with the regions. */
export const DEFAULT_HEIGHTMAP_CONFIG: HeightmapConfig = {
  relief: 0.5,
  isletFrequency: 0.35,
};

/** Names of the heightmap's own noise bands. */
export type HeightmapBandName = 'large' | 'warpX' | 'warpY' | 'coast' | 'ridge' | 'fine' | 'bank';

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
 * channels, `fine` adds roughness, islets and reef detail, `bank` lifts
 * open-sea shoals for skerries away from the islands.
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
  bank: {
    wavelengthMeters: 1400,
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2,
  },
};
