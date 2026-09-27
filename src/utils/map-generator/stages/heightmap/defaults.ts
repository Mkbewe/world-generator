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
