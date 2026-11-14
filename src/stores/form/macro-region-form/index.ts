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
} from './lib/boundary-model';
export type { BandOverlayRegion, MacroRegionLayoutChange } from './lib/boundary-model';
export { MACRO_REGION_PRESETS, macroRegionPreset } from './lib/presets';
export type { MacroRegionPresetDefinition, MacroRegionPresetId } from './lib/presets';
export { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from './macro-region-form-store';
