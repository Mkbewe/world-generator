import { GEOLOGY_PRESETS } from '@generator';

import { PRESET_OPTIONS } from './preset-options';

describe('geology preset options', () => {
  it('derives every option from the canonical GEOLOGY_PRESETS catalog', () => {
    expect(PRESET_OPTIONS.map(option => option.id)).toEqual(GEOLOGY_PRESETS);
  });

  it('assigns a valid translation key to each preset option', () => {
    for (const option of PRESET_OPTIONS) {
      expect(option.labelKey).toMatch(/^forms\.geology\.preset/);
    }
  });
});
