export { DEFAULT_HEIGHTMAP_CONFIG, HEIGHTMAP_BANDS, OCEAN_DEPTH_METERS } from './defaults';
export { MAX_RELIEF, MIN_RELIEF } from './defaults';
export type { HeightmapBand, HeightmapBandName } from './defaults';
export { isHeightmapConfig } from './heightmap-check';
export { OUTSIDE_SHELF, buildHeightmap } from './build';
export type { HeightmapField, HeightmapFieldInput } from './build';
export { createHeightmapNoiseBands } from './bands';
export type { HeightmapNoiseBands } from './bands';
export { HeightmapStage } from './stage';
export {
  MAX_LAND_AMPLITUDE_METERS,
  MIN_LAND_AMPLITUDE_METERS,
  coastNoiseMeters,
  crossSection,
  landAmplitudeMeters,
  landShape,
  oceanHeightMeters,
  shelfDepthMeters,
  warpPoint,
} from './fields';
