import { NOISE_FORM_DEFAULTS, useNoiseFormStore } from './noise-form-store';

describe('useNoiseFormStore', () => {
  beforeEach(() => {
    useNoiseFormStore.setState({ ...NOISE_FORM_DEFAULTS });
  });

  it('starts with the default noise config', () => {
    expect(useNoiseFormStore.getState().noise).toEqual(NOISE_FORM_DEFAULTS.noise);
  });

  it('updates the noise config', () => {
    const noise = { frequency: 8, octaves: 2, persistence: 0.4, lacunarity: 3 };

    useNoiseFormStore.getState().setNoise(noise);

    expect(useNoiseFormStore.getState().noise).toBe(noise);
  });
});
