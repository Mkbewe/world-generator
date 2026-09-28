export {
  DEFAULT_GEOLOGICAL_AREA,
  DEFAULT_GEOLOGICAL_AREA_VALUES,
  DEFAULT_GEOLOGY_CONFIG,
  GEOGRAPHY_PRESETS,
  GEOLOGICAL_AREA_PRESETS,
  createGeologicalArea,
  normalizeDirection,
} from './presets';
export type { GeologicalAreaPreset, GeologicalAreaPresetId, GeographyPresetId } from './presets';
export { GeologyStage } from './stage';
export {
  GeologyPlacementError,
  buildGeologyPlan,
  compareAreaIds,
  placementProblemAreaIds,
} from './plan';
export {
  isGeologicalAreaConfig,
  isGeologyConfig,
  isGeologyPlan,
  validateGeologyConfig,
  validateGeologyPlan,
} from './geology-check';
export { dominantAreaId, mergeContributions, unionHeight } from './merge';
export type { FieldContribution } from './merge';
export { createProvenanceIndex } from './provenance';
export {
  MAX_AREA_EXTENT,
  MAX_GEOLOGICAL_AREAS,
  MAX_SEABED_OFFSET_METERS,
  MAX_SHELF_WIDTH_METERS,
  MAX_UPLIFT_SCALE_METERS,
  MIN_AREA_EXTENT,
  MIN_SEABED_OFFSET_METERS,
  MIN_SHELF_WIDTH_METERS,
  MIN_UPLIFT_SCALE_METERS,
  PROVENANCE_OUTSIDE,
} from './defaults';
