import type { MessageKey } from '../../../../../../i18n';
import type { BaseClimateFormPreset } from '../../../../../../stores/form/base-climate-form';

export interface BaseClimatePresetOption {
  readonly id: BaseClimateFormPreset;
  readonly labelKey: MessageKey;
  readonly descriptionKey: MessageKey;
}

export const BASE_CLIMATE_PRESET_OPTIONS: readonly BaseClimatePresetOption[] = [
  {
    id: 'ring',
    labelKey: 'forms.baseClimate.presetRing',
    descriptionKey: 'forms.baseClimate.presetRingDescription',
  },
  {
    id: 'horizontal',
    labelKey: 'forms.baseClimate.presetHorizontal',
    descriptionKey: 'forms.baseClimate.presetHorizontalDescription',
  },
  {
    id: 'vertical',
    labelKey: 'forms.baseClimate.presetVertical',
    descriptionKey: 'forms.baseClimate.presetVerticalDescription',
  },
];
