import { LayerRegistry, layerRegistry } from './layer-registry';
import type { LayerSpec } from '../../map-layers';

const world = layerRegistry.get('world-shape');
const noise = layerRegistry.get('noise');

function solid(id: string, overrides: Partial<LayerSpec> = {}): LayerSpec {
  return {
    id,
    label: id,
    source: id + 'Map',
    dataType: 'uint8',
    palette: { kind: 'solid', color: [0, 0, 0] },
    ...overrides,
  };
}

describe('LayerRegistry', () => {
  it('keeps catalog order separate from dependency build order', () => {
    const registry = new LayerRegistry([noise, world]);

    expect(registry.order).toEqual(['noise', 'world-shape']);
    expect(registry.buildOrder).toEqual(['world-shape', 'noise']);
    expect(
      registry.presentIn({ noiseMap: new Float32Array(4), worldMask: new Uint8Array(4) })
    ).toEqual(['world-shape', 'noise']);
    expect(registry.presentIn({ noiseMap: undefined })).toEqual([]);
    expect(registry.has('toString')).toBe(false);
    expect(() => registry.get('missing')).toThrow('Unknown layer');
  });

  it('rejects unknown, non-mask and cyclic clipping dependencies', () => {
    expect(() => new LayerRegistry([{ ...noise, clipTo: 'missing' }])).toThrow('Unknown layer');
    expect(() => new LayerRegistry([solid('plain'), { ...noise, clipTo: 'plain' }])).toThrow(
      'non-mask layer'
    );

    const first = solid('first', {
      clipTo: 'second',
      providesMask: { insideValue: 1 },
    });
    const second = solid('second', {
      clipTo: 'first',
      providesMask: { insideValue: 1 },
    });
    expect(() => new LayerRegistry([first, second])).toThrow('Cyclic layer dependency');
  });

  it('rejects duplicate IDs and data sources', () => {
    expect(() => new LayerRegistry([world, world])).toThrow('Duplicate layer ID');
    expect(() => new LayerRegistry([world, { ...noise, source: world.source }])).toThrow(
      'Duplicate layer source'
    );
  });

  it('builds single-level groups in first-child catalog order', () => {
    const group = { id: 'climate', label: 'Climate' };
    const registry = new LayerRegistry([
      world,
      solid('winds', { group }),
      solid('terrain'),
      solid('rainfall', { group }),
    ]);

    expect(registry.order).toEqual(['world-shape', 'winds', 'terrain', 'rainfall']);
    expect(registry.tree).toMatchObject([
      { id: 'world-shape' },
      { id: 'climate', children: [{ id: 'winds' }, { id: 'rainfall' }] },
      { id: 'terrain' },
    ]);
    expect(registry.has('climate')).toBe(false);
  });

  it('rejects group ID collisions and inconsistent labels', () => {
    expect(
      () =>
        new LayerRegistry([
          solid('climate'),
          solid('winds', { group: { id: 'climate', label: 'Climate' } }),
        ])
    ).toThrow('collides with a layer ID');
    expect(
      () =>
        new LayerRegistry([
          solid('winds', { group: { id: 'climate', label: 'Climate' } }),
          solid('rainfall', { group: { id: 'climate', label: 'Weather' } }),
        ])
    ).toThrow('Inconsistent layer group label');
  });

  it('validates palettes while constructing the registry', () => {
    expect(
      () =>
        new LayerRegistry([
          solid('invalid', { palette: { kind: 'discrete', colors: [], overflow: 'cycle' } }),
        ])
    ).toThrow('at least one color');
  });

  it('validates layer identity and mask values', () => {
    expect(() => new LayerRegistry([solid('', { source: '' })])).toThrow('must not be empty');
    expect(
      () => new LayerRegistry([solid('mask', { providesMask: { insideValue: 1.5 } })])
    ).toThrow('invalid mask inside value');
  });
});
