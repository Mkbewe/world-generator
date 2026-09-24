export { MacroRegionStage } from './stage';
export { createMacroRegionSampler } from './stage';
export { createMacroRegionClassifier } from './sampler';
export type { MacroRegionClassifierInput } from './sampler';
export { createRegionDisplacement } from './border-displacement';
export type { CellDeformation, NoiseSampler, RegionDisplacement } from './border-displacement';
export {
  DEFAULT_MACRO_DEFORMATION,
  DEFAULT_MACRO_REGIONS,
  DEFAULT_REGION_NOISE_SOURCE,
  MAX_MACRO_REGIONS,
} from './defaults';
export {
  applyRegionBoundaries,
  baseRegions,
  boundariesToShares,
  clampBoundaries,
  MIN_MACRO_REGION_SHARE,
  overlayRegions,
  regionBoundaries,
  regionSegments,
  removeBaseRegion,
  splitLargestRegion,
} from './boundary-model';
export type { MacroRegionLayoutChange, MacroRegionSegment } from './boundary-model';
export {
  createBandOverlay,
  createHorizontalLayout,
  createMacroRegionLayout,
  createRadialLayout,
  createRadialPolesLayout,
  createVerticalLayout,
  MACRO_REGION_PRESETS,
  macroRegionPreset,
} from './presets';
export type {
  MacroRegionLayout,
  MacroRegionPresetDefinition,
  MacroRegionPresetId,
} from './presets';
