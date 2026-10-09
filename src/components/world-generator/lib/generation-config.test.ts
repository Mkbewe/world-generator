import { buildGenerationConfig, type GenerationConfigInput } from './generation-config';
import {
  DEFAULT_NOISE,
  GEOLOGY_FORM_DEFAULTS,
  geologyConfigOf,
  MACRO_REGION_FORM_DEFAULTS,
} from '../../../stores';

function input(overrides: Partial<GenerationConfigInput> = {}): GenerationConfigInput {
  return {
    seed: '42',
    shape: 'disc',
    sizeMeters: 3000,
    metersPerSample: 1,
    noise: DEFAULT_NOISE,
    macroRegions: MACRO_REGION_FORM_DEFAULTS.regions,
    macroRegionDeformation: MACRO_REGION_FORM_DEFAULTS.deformation,
    geology: geologyConfigOf(GEOLOGY_FORM_DEFAULTS),
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
          dimensions: expect.objectContaining({ sampleWidth: 3000, sampleHeight: 3000 }),
          seed: 42,
          shape: 'rectangle',
        },
        noise: DEFAULT_NOISE,
        macroRegions: MACRO_REGION_FORM_DEFAULTS.regions,
        macroRegionDeformation: MACRO_REGION_FORM_DEFAULTS.deformation,
        geology: geologyConfigOf(GEOLOGY_FORM_DEFAULTS),
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

  it('keeps the region composition independent of the world size', () => {
    const small = buildGenerationConfig(input());
    const large = buildGenerationConfig(input({ sizeMeters: 4000 }));
    if (!('config' in small) || !('config' in large)) {
      throw new Error('Expected valid generated configurations.');
    }

    expect(large.config.geology).toEqual(small.config.geology);
  });
});
