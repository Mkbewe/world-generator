import { GENERAL_FORM_DEFAULTS, useGeneralFormStore } from './general-form-store';

describe('useGeneralFormStore', () => {
  beforeEach(() => {
    useGeneralFormStore.setState({ ...GENERAL_FORM_DEFAULTS });
  });

  it('starts with the default seed', () => {
    expect(useGeneralFormStore.getState().seed).toBe(GENERAL_FORM_DEFAULTS.seed);
  });

  it('updates the seed', () => {
    useGeneralFormStore.getState().setSeed('99');

    expect(useGeneralFormStore.getState().seed).toBe('99');
  });
});
