export { ARCHETYPE_RECIPES, isLandmassArchetype, LANDMASS_ARCHETYPES } from './shape/archetypes';
export { LandmassLayoutStage } from './stage';
export { isLandmassLayout, validateLayout, validatePlacement } from './layout-check';
export { interpolatedRadii, mainChainNodes, structureExtent, structureSegments } from './influence';
export type { Bounds, StructureSegment } from './influence';
export { segmentsDistance } from './search/collision';
export { createMarginSampler, marginInsets } from './mask-sampler';
export type { MarginInsets, WorldSampler } from './mask-sampler';
export { OCEAN_MARGIN_METERS } from './defaults';
export {
  DEFAULT_LANDMASS_CONFIG,
  MAX_LANDMASS_DIVERSITY,
  MAX_LANDMASS_SIZE,
  MAX_LANDMASSES,
  MIN_LANDMASS_DIVERSITY,
  MIN_LANDMASS_SIZE,
} from './defaults';
