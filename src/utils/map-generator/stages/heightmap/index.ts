export {
  DEFAULT_HEIGHTMAP_CONFIG,
  HEIGHTMAP_BANDS,
  MAX_ISLET_FREQUENCY,
  MAX_RELIEF,
  MIN_ISLET_FREQUENCY,
  MIN_RELIEF,
} from './defaults';
export type { HeightmapBand, HeightmapBandName } from './defaults';
export { REGION_SHAPES } from './config/region-shape';
export type { RegionShape } from './config/region-shape';
export {
  REGION_TERRAIN_SUPPORT,
  defaultRegionTerrain,
  defaultRegionTerrainSlots,
} from './config/region-terrain';
export { isHeightmapConfig } from './config/heightmap-check';
export { createHeightmapNoiseBands } from './bands';
export type { HeightmapNoiseBands } from './bands';
export { buildHeightField } from './field';
export type { HeightField, HeightFieldInput } from './field';
export { HeightmapStage } from './stage';
export {
  MAX_LAND_AMPLITUDE_METERS,
  MIN_LAND_AMPLITUDE_METERS,
  landAmplitudeMeters,
} from './fields';
