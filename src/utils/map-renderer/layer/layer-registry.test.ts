import { LAYER_DEFINITIONS } from './layer-definition';
import { LayerRegistry } from './layer-registry';

describe('LayerRegistry', () => {
  it('orders definitions by dependencies and reads their registered source keys', () => {
    const registry = new LayerRegistry({
      noise: LAYER_DEFINITIONS.noise,
      'world-shape': LAYER_DEFINITIONS['world-shape'],
    });
    expect(registry.ids).toEqual(['world-shape', 'noise']);
    expect(
      registry.presentIn({ noiseMap: new Float32Array(4), worldMask: new Uint8Array(4) })
    ).toEqual(['world-shape', 'noise']);
    expect(registry.presentIn({ noiseMap: undefined })).toEqual([]);
    expect(registry.has('toString')).toBe(false);
    expect(() => registry.get('missing')).toThrow('Unknown layer');
  });

  it('rejects unknown dependencies, cycles and ambiguous data sources', () => {
    expect(() => new LayerRegistry({ noise: LAYER_DEFINITIONS.noise })).toThrow('Unknown layer');
    expect(
      () =>
        new LayerRegistry({
          ...LAYER_DEFINITIONS,
          'world-shape': { ...LAYER_DEFINITIONS['world-shape'], requires: ['noise'] },
        })
    ).toThrow('Cyclic layer dependency');
    expect(
      () =>
        new LayerRegistry({
          ...LAYER_DEFINITIONS,
          duplicate: LAYER_DEFINITIONS.noise,
        })
    ).toThrow('Duplicate layer source');
  });
});
