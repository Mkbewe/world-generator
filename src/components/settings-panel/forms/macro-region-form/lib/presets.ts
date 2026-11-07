import type { MessageKey } from '../../../../../i18n';
import {
  createHorizontalLayout,
  createRadialLayout,
  createRadialPolesLayout,
  createVerticalLayout,
  type MacroRegionLayout,
} from '../../../../../utils/map-generator/stages/macro-region/editor/presets';
import type { MacroRegionConfig } from '../../../../../utils/map-generator/types';

export type MacroRegionPresetId = 'rings' | 'horizontal' | 'vertical' | 'rings-with-poles';

export interface MacroRegionPresetDefinition {
  readonly id: MacroRegionPresetId;
  readonly labelKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly layout: MacroRegionLayout;
  readonly createRegions: () => readonly MacroRegionConfig[];
}

export const MACRO_REGION_PRESETS: readonly MacroRegionPresetDefinition[] = [
  {
    id: 'rings-with-poles',
    labelKey: 'forms.macroRegion.presetRingsPoles',
    descriptionKey: 'forms.macroRegion.presetRingsPolesDescription',
    layout: 'radial',
    createRegions: () => createRadialPolesLayout(6),
  },
  {
    id: 'rings',
    labelKey: 'forms.macroRegion.presetRings',
    descriptionKey: 'forms.macroRegion.presetRingsDescription',
    layout: 'radial',
    createRegions: () => createRadialLayout(4),
  },
  {
    id: 'horizontal',
    labelKey: 'forms.macroRegion.presetHorizontal',
    descriptionKey: 'forms.macroRegion.presetHorizontalDescription',
    layout: 'horizontal',
    createRegions: () => createHorizontalLayout(5),
  },
  {
    id: 'vertical',
    labelKey: 'forms.macroRegion.presetVertical',
    descriptionKey: 'forms.macroRegion.presetVerticalDescription',
    layout: 'vertical',
    createRegions: () => createVerticalLayout(5),
  },
];

export function macroRegionPreset(id: MacroRegionPresetId): MacroRegionPresetDefinition {
  const preset = MACRO_REGION_PRESETS.find(item => item.id === id);
  if (!preset) {
    throw new RangeError(`Unknown macro region preset: "${id}".`);
  }
  return preset;
}
