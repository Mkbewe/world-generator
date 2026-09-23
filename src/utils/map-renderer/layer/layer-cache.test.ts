import { CatalogLayer } from './catalog-layer';
import { LayerCache } from './layer-cache';
import { layerRegistry } from './layer-registry';

function world(data: Uint8Array, width = 2, height = 2): CatalogLayer {
  return new CatalogLayer(layerRegistry.raster('world-shape'), { width, height }, data);
}

describe('LayerCache', () => {
  it('reuses a layer only when all inputs match', () => {
    const cache = new LayerCache();
    const mask = new Uint8Array(4);
    const definition = {};
    const dependency = {};
    const create = vi.fn(() => world(mask));
    const inputs = [definition, mask, 2, 2, dependency];
    const first = cache.getOrCreate('world-shape', inputs, create);
    expect(cache.getOrCreate('world-shape', [...inputs], create)).toBe(first);
    expect(create).toHaveBeenCalledOnce();

    const dispose = vi.spyOn(first, 'dispose');
    const next = cache.getOrCreate('world-shape', [definition, mask, 1, 4, dependency], create);
    expect(next).not.toBe(first);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('evicts and disposes only the matching layer', () => {
    const cache = new LayerCache();
    const mask = new Uint8Array(4);
    const create = () => world(mask);
    const layer = cache.getOrCreate('world-shape', [mask], create);
    const dispose = vi.spyOn(layer, 'dispose');

    cache.evict(world(mask));
    expect(dispose).not.toHaveBeenCalled();
    expect(cache.getOrCreate('world-shape', [mask], create)).toBe(layer);

    cache.evict(layer);
    expect(dispose).toHaveBeenCalledOnce();
    expect(cache.getOrCreate('world-shape', [mask], create)).not.toBe(layer);
  });

  it('preserves the previous entry if creating the replacement fails', () => {
    const cache = new LayerCache();
    const create = () => world(new Uint8Array(1), 1, 1);
    const first = cache.getOrCreate('world-shape', [1], create);
    const dispose = vi.spyOn(first, 'dispose');
    expect(() =>
      cache.getOrCreate('world-shape', [2], () => {
        throw new Error('Invalid data');
      })
    ).toThrow('Invalid data');
    expect(cache.getOrCreate('world-shape', [1], create)).toBe(first);
    expect(dispose).not.toHaveBeenCalled();
  });
});
