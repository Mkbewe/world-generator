import { MapPreviewRenderer } from './map-preview-renderer';
import { MapRasterRenderer } from '../map-raster-renderer';
import { PreviewSurfaceCache } from '../preview-surface-cache';
import { PreviewViewport } from '../preview-viewport';
import type { MapPreviewSource } from '../types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

function setup() {
  const canvas = document.createElement('canvas');
  const overlayCanvas = document.createElement('canvas');
  canvas.width = canvas.height = 2;
  const cache = new PreviewSurfaceCache();
  const onRenderingChange = vi.fn();
  const onStatistics = vi.fn();
  const renderer = new MapPreviewRenderer(
    { canvas, overlayCanvas, viewportElement: document.createElement('div') },
    { onRenderingChange, onStatistics },
    cache
  );
  const source: MapPreviewSource = {
    width: 2,
    height: 2,
    revision: 1,
    layers: { worldMask: new Uint8Array(4).fill(1) },
  };
  renderer.setSource(source);
  onStatistics.mockClear();
  onRenderingChange.mockClear();
  return { renderer, canvas, overlayCanvas, cache, source, onRenderingChange, onStatistics };
}

describe('MapPreviewRenderer', () => {
  beforeEach(() => {
    vi.spyOn(PreviewViewport.prototype, 'start').mockImplementation(() => {});
    vi.spyOn(PreviewViewport.prototype, 'measure').mockReturnValue({
      width: 2,
      height: 2,
      devicePixelRatio: 1,
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          createImageData: (width: number, height: number) => ({
            data: new Uint8ClampedArray(width * height * 4),
          }),
          putImageData: vi.fn(),
          clearRect: vi.fn(),
          drawImage: vi.fn(),
        }) as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores both canvases when the raster context is unavailable', async () => {
    const { renderer, canvas, overlayCanvas, onRenderingChange, onStatistics, cache } = setup();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    const result = await renderer.showLayer('world-shape');

    expect(result.status).toBe('failed');
    expect(result.statistics[0]).toMatchObject({
      status: 'failed',
      error: expect.stringContaining('context'),
    });
    expect(onStatistics).toHaveBeenCalledWith(result.statistics[0]);
    expect(onRenderingChange).toHaveBeenLastCalledWith(undefined);
    expect(canvas.style.visibility).toBe('visible');
    expect(overlayCanvas.style.visibility).toBe('visible');
    expect(cache.has('world-shape')).toBe(false);
  });

  it('returns allocation errors and allows retrying', async () => {
    const { renderer, canvas, onRenderingChange } = setup();
    vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
      throw new Error('Allocation failed');
    });

    const failed = await renderer.showLayer('world-shape');
    expect(failed.status).toBe('failed');
    expect(failed.statistics[0].error).toBe('Allocation failed');
    expect(canvas.style.visibility).toBe('visible');
    expect(onRenderingChange).toHaveBeenLastCalledWith(undefined);
    expect((await renderer.showLayer('world-shape')).status).toBe('completed');
  });

  it('reports exceptions during rasterization without leaving the loading state active', async () => {
    const { renderer, onRenderingChange } = setup();
    vi.spyOn(MapRasterRenderer.prototype, 'render').mockRejectedValue(
      new Error('ImageData failed')
    );
    const result = await renderer.showLayer('world-shape');
    expect(result.statistics[0]).toMatchObject({ status: 'failed', error: 'ImageData failed' });
    expect(onRenderingChange).toHaveBeenLastCalledWith(undefined);
  });

  it('reports failure to display a cached surface', async () => {
    const { renderer, canvas, cache } = setup();
    cache.set('world-shape', document.createElement('canvas'));
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    const result = await renderer.showLayer('world-shape');
    expect(result.status).toBe('failed');
    expect(result.statistics[0]).toMatchObject({
      details: { cacheHit: true },
      error: expect.stringContaining('display'),
    });
    expect(canvas.style.visibility).toBe('visible');
  });

  it('does not let a superseded render reset the newer loading state or populate cache', async () => {
    const { renderer, source, canvas, cache, onRenderingChange } = setup();
    const first = deferred<boolean>();
    const second = deferred<boolean>();
    vi.spyOn(MapRasterRenderer.prototype, 'render')
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const oldRender = renderer.showLayer('world-shape');
    renderer.setSource({ ...source, revision: 2 });
    const newRender = renderer.showLayer('world-shape');
    first.resolve(true);

    const cancelled = await oldRender;
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.statistics[0]).toMatchObject({ revision: 1, status: 'cancelled' });
    expect(canvas.style.visibility).toBe('hidden');
    expect(onRenderingChange).toHaveBeenLastCalledWith('world-shape');
    expect(cache.has('world-shape')).toBe(false);

    second.resolve(true);
    expect((await newRender).status).toBe('completed');
    expect(canvas.style.visibility).toBe('visible');
  });

  it.each(['clear', 'dispose', 'setSource'] as const)(
    'cleans up pending rendering on %s',
    async action => {
      const { renderer, source, canvas, cache, onRenderingChange } = setup();
      const pending = deferred<boolean>();
      vi.spyOn(MapRasterRenderer.prototype, 'render').mockReturnValue(pending.promise);
      const result = renderer.showLayer('world-shape');
      if (action === 'setSource') {
        renderer.setSource({ ...source, revision: 2 });
      } else {
        renderer[action]();
      }
      expect(canvas.style.visibility).toBe('visible');
      expect(onRenderingChange).toHaveBeenLastCalledWith(undefined);
      onRenderingChange.mockClear();
      pending.resolve(false);
      expect((await result).status).toBe('cancelled');
      expect(onRenderingChange).not.toHaveBeenCalled();
      expect(cache.has('world-shape')).toBe(false);
    }
  );

  it('skips an unavailable layer and cancels any pending render', async () => {
    const { renderer, canvas } = setup();
    const pending = deferred<boolean>();
    vi.spyOn(MapRasterRenderer.prototype, 'render').mockReturnValue(pending.promise);
    const oldRender = renderer.showLayer('world-shape');
    expect(await renderer.showLayer('noise')).toMatchObject({ status: 'skipped', statistics: [] });
    pending.resolve(true);
    expect((await oldRender).status).toBe('cancelled');
    expect(canvas.style.visibility).toBe('visible');
  });

  it('returns timings for display, overlay and background preparation, then reports a cache hit', async () => {
    const { renderer, source, onStatistics } = setup();
    renderer.setSource({
      ...source,
      layers: { ...source.layers, noiseMap: new Float32Array(4).fill(0.5) },
    });
    onStatistics.mockClear();
    const raster = vi.spyOn(MapRasterRenderer.prototype, 'render');
    let now = 10;
    vi.spyOn(performance, 'now').mockImplementation(() => now++);

    const result = await renderer.showLayer('world-shape');

    expect(result.status).toBe('completed');
    expect(result.statistics).toMatchObject([
      {
        stageId: 'base-layer',
        layer: 'world-shape',
        target: 'display',
        details: { cacheHit: false },
      },
      { stageId: 'world-boundary', target: 'display' },
      { stageId: 'base-layer', layer: 'noise', target: 'cache', details: { cacheHit: false } },
    ]);
    for (const item of result.statistics) {
      expect(item.durationMs).toBe(item.finishedAt - item.startedAt);
      expect(item.durationMs).toBeGreaterThan(0);
      expect(item.revision).toBe(1);
      expect(item.details).toMatchObject({ width: 2, height: 2 });
    }
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(
      result.statistics.reduce((sum, item) => sum + item.durationMs, 0)
    );
    expect(onStatistics.mock.calls.map(([item]) => item)).toEqual(result.statistics);

    const cached = await renderer.showLayer('noise');
    expect(cached.statistics[0]).toMatchObject({
      layer: 'noise',
      target: 'display',
      details: { cacheHit: true },
    });
    expect(raster).toHaveBeenCalledTimes(2);
  });

  it('reports background failure while leaving the displayed layer visible', async () => {
    const { renderer, source, canvas } = setup();
    renderer.setSource({ ...source, layers: { ...source.layers, noiseMap: new Float32Array(4) } });
    vi.spyOn(MapRasterRenderer.prototype, 'render')
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('Background failed'));
    const result = await renderer.showLayer('world-shape');
    expect(result.status).toBe('failed');
    expect(result.statistics.at(-1)).toMatchObject({
      target: 'cache',
      status: 'failed',
      error: 'Background failed',
    });
    expect(canvas.style.visibility).toBe('visible');
  });

  it('reports standalone overlay redraws and their failures through the callback', () => {
    const { renderer, overlayCanvas, onStatistics } = setup();
    renderer.setOverlays([]);
    expect(onStatistics).toHaveBeenLastCalledWith(
      expect.objectContaining({ stageId: 'world-boundary', status: 'completed' })
    );
    vi.spyOn(overlayCanvas, 'getContext').mockReturnValue(null);
    renderer.setOverlays(['world-boundary']);
    expect(onStatistics).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stageId: 'world-boundary',
        status: 'failed',
        error: expect.stringContaining('context'),
      })
    );
  });
});
