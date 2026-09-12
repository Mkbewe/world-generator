import { WorldShapeLayer } from './layer';
import { LayerCache } from './layer-cache';

describe('LayerCache', () => {
  it('reuses a layer only when all inputs match', () => {
    const cache = new LayerCache();
    const mask = new Uint8Array(4);
    const definition = {};
    const dependency = {};
    const create = vi.fn(() => new WorldShapeLayer({ width: 2, height: 2 }, mask));
    const inputs = [definition, mask, 2, 2, dependency];
    const first = cache.getOrCreate('world-shape', inputs, create);
    expect(cache.getOrCreate('world-shape', [...inputs], create)).toBe(first);
    expect(create).toHaveBeenCalledOnce();

    const dispose = vi.spyOn(first, 'dispose');
    const next = cache.getOrCreate('world-shape', [definition, mask, 1, 4, dependency], create);
    expect(next).not.toBe(first);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('preserves the previous entry if creating the replacement fails', () => {
    const cache = new LayerCache();
    const create = () => new WorldShapeLayer({ width: 1, height: 1 }, new Uint8Array(1));
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
