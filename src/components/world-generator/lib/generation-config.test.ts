import { buildGenerationConfig, type GenerationConfigInput } from './generation-config';
import {
  DEFAULT_NOISE,
  GEOLOGY_FORM_DEFAULTS,
  HEIGHTMAP_FORM_DEFAULTS,
  MACRO_REGION_FORM_DEFAULTS,
} from '../../../stores';

function input(overrides: Partial<GenerationConfigInput> = {}): GenerationConfigInput {
  return {
    seed: '42',
    shape: 'disc',
    sizeMeters: 1000,
    metersPerSample: 1,
    noise: DEFAULT_NOISE,
    macroRegions: MACRO_REGION_FORM_DEFAULTS.regions,
    macroRegionDeformation: MACRO_REGION_FORM_DEFAULTS.deformation,
    geology: GEOLOGY_FORM_DEFAULTS.geology,
    heightmap: HEIGHTMAP_FORM_DEFAULTS.heightmap,
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
        geology: GEOLOGY_FORM_DEFAULTS.geology,
        heightmap: HEIGHTMAP_FORM_DEFAULTS.heightmap,
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

  it('resolves an untouched geography recipe for the new map size', () => {
    const small = buildGenerationConfig(input({ geographyPreset: 'archipelago' }));
    const large = buildGenerationConfig(
      input({ geographyPreset: 'archipelago', sizeMeters: 4000 })
    );
    if (!('config' in small) || !('config' in large)) {
      throw new Error('Expected valid generated configurations.');
    }

    expect(large.config.geology?.areas.length).toBeGreaterThan(
      small.config.geology?.areas.length ?? 0
    );
    expect(large.config.geology?.areas.every(area => area.rimStrength === 0)).toBe(true);
  });
});
