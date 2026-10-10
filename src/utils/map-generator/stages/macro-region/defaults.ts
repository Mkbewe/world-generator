import { createRadialLayout } from './editor/presets';
import type { MacroRegionConfig, MacroRegionDeformation } from '../../types';

/** Maximum number of editable macro regions in one world. */
export const MAX_MACRO_REGIONS = 10;

/** Visible-but-gentle border wobble so the default map is not a perfect target. */
export const DEFAULT_MACRO_DEFORMATION: MacroRegionDeformation = {
  amplitude: 0.08,
};

/** Four concentric base regions, ordered from the safe centre to the rim. */
export const DEFAULT_MACRO_REGIONS: readonly MacroRegionConfig[] = createRadialLayout(4);
