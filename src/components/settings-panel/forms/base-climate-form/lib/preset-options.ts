import type { BaseClimateFormPreset } from '../../../../../stores/form/base-climate-form';

export interface BaseClimatePresetOption {
  readonly id: BaseClimateFormPreset;
  readonly label: string;
  readonly description: string;
}

export const BASE_CLIMATE_PRESET_OPTIONS: readonly BaseClimatePresetOption[] = [
  {
    id: 'horizontal',
    label: 'Horizontal',
    description: 'Cold poles, temperate belts and a warm equator.',
  },
  {
    id: 'vertical',
    label: 'Vertical',
    description: 'Cold edges, temperate belts and a warm centre.',
  },
  {
    id: 'ring',
    label: 'Ring',
    description: 'Temperate core, warm ring and a cold rim.',
  },
];
