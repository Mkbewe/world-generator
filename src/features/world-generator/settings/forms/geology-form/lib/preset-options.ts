import { GEOLOGY_PRESETS, type GeologyPreset } from '@generator';

import type { MessageKey } from '../../../../../../i18n';

export interface PresetOption {
  readonly id: GeologyPreset;
  readonly labelKey: MessageKey;
}

const PRESET_LABEL_KEYS: Readonly<Record<GeologyPreset, MessageKey>> = {
  varied: 'forms.geology.presetVaried',
  oceanic: 'forms.geology.presetOceanic',
  vast: 'forms.geology.presetVast',
  mosaic: 'forms.geology.presetMosaic',
};

/** Starter configurations shown at the top of the Geology form. */
export const PRESET_OPTIONS: readonly PresetOption[] = GEOLOGY_PRESETS.map(id => ({
  id,
  labelKey: PRESET_LABEL_KEYS[id],
}));
