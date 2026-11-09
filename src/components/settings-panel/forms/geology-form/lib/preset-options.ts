import type { GeologyPreset } from '@generator';

import type { MessageKey } from '../../../../../i18n';

export interface PresetOption {
  readonly id: GeologyPreset;
  readonly labelKey: MessageKey;
}

/** Starter configurations shown at the top of the Geology form. */
export const PRESET_OPTIONS: readonly PresetOption[] = [
  { id: 'varied', labelKey: 'forms.geology.presetVaried' },
  { id: 'oceanic', labelKey: 'forms.geology.presetOceanic' },
  { id: 'vast', labelKey: 'forms.geology.presetVast' },
  { id: 'mosaic', labelKey: 'forms.geology.presetMosaic' },
];
