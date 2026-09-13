import { LAYER_DEFINITIONS, type LayerDefinition } from './layer-definition';
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

  it('supports one level of groups and orders their leaves by dependencies', () => {
    const registry = new LayerRegistry({
      'world-shape': LAYER_DEFINITIONS['world-shape'],
      climate: {
        label: 'Climate',
        children: {
          winds: { ...LAYER_DEFINITIONS.noise, source: 'windMap', requires: ['rainfall'] },
          rainfall: { ...LAYER_DEFINITIONS.noise, source: 'rainfallMap' },
        },
      },
    });

    expect(registry.ids).toEqual(['world-shape', 'rainfall', 'winds']);
    expect(registry.tree[1]).toMatchObject({
      id: 'climate',
      children: [{ id: 'winds' }, { id: 'rainfall' }],
    });
    expect(registry.has('climate')).toBe(false);
    expect(registry.presentIn({ windMap: new Float32Array(1) })).toEqual(['winds']);
  });

  it('rejects nested groups', () => {
    const definitions = {
      climate: {
        label: 'Climate',
        children: {
          winds: {
            label: 'Winds',
            children: { speed: { ...LAYER_DEFINITIONS.noise, source: 'windSpeed' } },
          },
        },
      },
    } as unknown as Readonly<Record<string, LayerDefinition>>;

    expect(() => new LayerRegistry(definitions)).toThrow('Nested layer groups are not supported');
  });

  it('rejects empty groups, duplicate IDs across branches and dependencies on groups', () => {
    expect(() => new LayerRegistry({ empty: { label: 'Empty', children: {} } })).toThrow(
      'Empty layer group'
    );
    expect(
      () =>
        new LayerRegistry({
          first: { label: 'First', children: { noise: LAYER_DEFINITIONS.noise } },
          second: { label: 'Second', children: { noise: LAYER_DEFINITIONS.noise } },
        })
    ).toThrow('Duplicate layer ID');
    expect(
      () =>
        new LayerRegistry({
          group: {
            label: 'Group',
            children: { noise: { ...LAYER_DEFINITIONS.noise, requires: ['group'] } },
          },
        })
    ).toThrow('Unknown layer: group');
  });
});
