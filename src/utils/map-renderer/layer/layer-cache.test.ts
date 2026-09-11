import { LayerCache } from './layer-cache';

describe('LayerCache', () => {
  it('reuses the rendered layer for the same data', () => {
    const cache = new LayerCache();
    const mask = new Uint8Array(16).fill(1);
    const noise = new Float32Array(16);
    const world = cache.world({ width: 4, height: 4 }, mask);
    expect(cache.world({ width: 4, height: 4 }, mask)).toBe(world);
    const noiseLayer = cache.noise(world, noise);
    expect(cache.noise(world, noise)).toBe(noiseLayer);
  });

  it('replaces and disposes the previous layer when the data changes', () => {
    const cache = new LayerCache();
    const size = { width: 4, height: 4 };
    const first = cache.world(size, new Uint8Array(16).fill(1));
    const dispose = vi.spyOn(first, 'dispose');
    const second = cache.world(size, new Uint8Array(16).fill(1));
    expect(second).not.toBe(first);
    expect(dispose).toHaveBeenCalledOnce();
  });
});
