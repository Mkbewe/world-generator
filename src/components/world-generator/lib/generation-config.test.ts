import { buildGenerationConfig, type GenerationConfigInput } from './generation-config';
import { DEFAULT_NOISE, MACRO_REGION_FORM_DEFAULTS } from '../../../stores';

function input(overrides: Partial<GenerationConfigInput> = {}): GenerationConfigInput {
  return {
    seed: '42',
    shape: 'disc',
    sizeMeters: 1000,
    metersPerSample: 1,
    noise: DEFAULT_NOISE,
    macroRegions: MACRO_REGION_FORM_DEFAULTS.regions,
    macroRegionDeformation: MACRO_REGION_FORM_DEFAULTS.deformation,
    ...overrides,
  };
}

describe('buildGenerationConfig', () => {
  it.each(['', 'abc', '1.5'])('reports an invalid seed: "%s"', seed => {
    expect(buildGenerationConfig(input({ seed }))).toEqual({
      error: 'Seed must be an integer.',
    });
  });

  it('builds the worker config from the form values', () => {
    const result = buildGenerationConfig(input({ shape: 'rectangle' }));

    expect(result).toEqual({
      config: {
        world: {
          dimensions: expect.objectContaining({ sampleWidth: 1000, sampleHeight: 1000 }),
          seed: 42,
          shape: 'rectangle',
        },
        noise: DEFAULT_NOISE,
        macroRegions: MACRO_REGION_FORM_DEFAULTS.regions,
        macroRegionDeformation: MACRO_REGION_FORM_DEFAULTS.deformation,
      },
    });
  });

  it('passes a selected region noise source into the worker config', () => {
    const result = buildGenerationConfig(
      input({ macroRegionDeformation: { amplitude: 0.1, source: 'noise-map' } })
    );

    expect(result).toMatchObject({
      config: { macroRegionDeformation: { amplitude: 0.1, source: 'noise-map' } },
    });
  });
});
