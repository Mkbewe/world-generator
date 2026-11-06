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
  readonly label: string;
  readonly description: string;
  readonly layout: MacroRegionLayout;
  readonly createRegions: () => readonly MacroRegionConfig[];
}

export const MACRO_REGION_PRESETS: readonly MacroRegionPresetDefinition[] = [
  {
    id: 'rings-with-poles',
    label: 'Rings + poles',
    description: 'Four concentric regions crossed by dangerous bands at both poles.',
    layout: 'radial',
    createRegions: () => createRadialPolesLayout(6),
  },
  {
    id: 'rings',
    label: 'Rings',
    description: 'Four concentric regions with danger increasing towards the rim.',
    layout: 'radial',
    createRegions: () => createRadialLayout(4),
  },
  {
    id: 'horizontal',
    label: 'Horizontal',
    description: 'Five horizontal regions with a safer middle and dangerous edges.',
    layout: 'horizontal',
    createRegions: () => createHorizontalLayout(5),
  },
  {
    id: 'vertical',
    label: 'Vertical',
    description: 'Five vertical regions with a safer middle and dangerous edges.',
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
