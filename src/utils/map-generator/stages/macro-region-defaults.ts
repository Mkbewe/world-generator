import { createRadialLayout } from './macro-region-presets';
import type { MacroRegionConfig, MacroRegionDeformation } from '../types';

/** Maximum number of editable macro regions in one world. */
export const MAX_MACRO_REGIONS = 10;
export const DEFAULT_REGION_NOISE_SOURCE = 'dedicated' as const;

/** Visible-but-gentle border wobble so the default map is not a perfect target. */
export const DEFAULT_MACRO_DEFORMATION: MacroRegionDeformation = {
  amplitude: 0.08,
  source: DEFAULT_REGION_NOISE_SOURCE,
};

/** Four concentric base regions, ordered from the safe centre to the rim. */
export const DEFAULT_MACRO_REGIONS: readonly MacroRegionConfig[] = createRadialLayout(4);
