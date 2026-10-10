import { LayerRegistry, layerRegistry } from './layer-registry';
import type { RasterLayerSpec } from '../../map-layers';

const world = layerRegistry.raster('world-shape');
const regions = layerRegistry.raster('macro-region');

function solid(id: string, overrides: Partial<RasterLayerSpec> = {}): RasterLayerSpec {
  return {
    id,
    label: id,
    kind: 'raster',
    source: id + 'Map',
    dataType: 'uint8',
    palette: { kind: 'solid', color: [0, 0, 0] },
    ...overrides,
  };
}

describe('LayerRegistry', () => {
  it('keeps catalog order separate from dependency build order', () => {
    const registry = new LayerRegistry([regions, world]);

    expect(registry.order).toEqual(['macro-region', 'world-shape']);
    expect(registry.buildOrder).toEqual(['world-shape', 'macro-region']);
    expect(
      registry.presentIn({ macroRegionIdMap: new Uint8Array(4), worldMask: new Uint8Array(4) })
    ).toEqual(['world-shape', 'macro-region']);
    expect(registry.presentIn({ macroRegionIdMap: undefined })).toEqual([]);
    expect(registry.has('toString')).toBe(false);
    expect(() => registry.get('missing')).toThrow('Unknown layer');
  });

  it('rejects unknown, non-mask and cyclic clipping dependencies', () => {
    expect(() => new LayerRegistry([{ ...regions, clipTo: 'missing' }])).toThrow('Unknown layer');
    expect(() => new LayerRegistry([solid('plain'), { ...regions, clipTo: 'plain' }])).toThrow(
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
    expect(() => new LayerRegistry([world, { ...regions, source: world.source }])).toThrow(
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

  it('accepts a vector layer without a palette', () => {
    const registry = new LayerRegistry([
      world,
      {
        id: 'geology',
        label: 'Geology',
        kind: 'vector',
        source: 'geologyPlan',
        clipTo: 'world-shape',
      },
    ]);

    expect(registry.get('geology').kind).toBe('vector');
    expect(registry.order).toEqual(['world-shape', 'geology']);
    expect(() => registry.raster('geology')).toThrow('not a raster');
  });
});
