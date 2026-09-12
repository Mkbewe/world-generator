import { BASIC_FORM_DEFAULTS, useBasicFormStore } from './basic-form-store';

describe('useBasicFormStore', () => {
  beforeEach(() => {
    useBasicFormStore.setState({ ...BASIC_FORM_DEFAULTS });
  });

  it('starts with the default seed', () => {
    expect(useBasicFormStore.getState().seed).toBe(BASIC_FORM_DEFAULTS.seed);
  });

  it('updates the seed', () => {
    useBasicFormStore.getState().setSeed('99');

    expect(useBasicFormStore.getState().seed).toBe('99');
  });
});
