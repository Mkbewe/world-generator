import { PreviewSurfaceCache } from './preview-surface-cache';

describe('PreviewSurfaceCache', () => {
  it('keeps surfaces for one revision and clears them when the source changes', () => {
    const cache = new PreviewSurfaceCache();
    const surface = document.createElement('canvas');

    cache.useRevision(1);
    cache.set('world-shape', surface);
    cache.useRevision(1);
    expect(cache.get('world-shape')).toBe(surface);

    cache.useRevision(2);
    expect(cache.get('world-shape')).toBeUndefined();
  });
});
