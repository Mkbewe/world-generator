import { RenderMetrics } from './render-metrics';
import { CatalogLayer, LayerRegistry, layerRegistry } from '../layer';
import type { RenderTarget } from '../preview-targets';
import type { RenderStatistics } from '../types';

function targetFor(width: number, height: number): RenderTarget {
  return { width, height, projection: { cellSize: 1, left: 0, top: 0, width, height } };
}

function mockCanvasContext(): () => void {
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  return () => spy.mockRestore();
}

describe('RenderMetrics', () => {
  it('keeps the real cost of a layer replayed from the cache', async () => {
    const restore = mockCanvasContext();
    const registry = new LayerRegistry([layerRegistry.get('world-shape')]);
    const layer = new CatalogLayer(
      registry.get('world-shape'),
      { width: 2, height: 2 },
      new Uint8Array(4).fill(1)
    );
    const reports: RenderStatistics[] = [];

    try {
      const rendered = new RenderMetrics(registry, report => reports.push(report));
      rendered.start();
      await rendered.prepare(layer, new AbortController().signal, targetFor(2, 2));
      rendered.report([layer], 0, undefined);

      const replayed = new RenderMetrics(registry, report => reports.push(report));
      replayed.start();
      replayed.report([layer], 0, undefined);

      expect(reports[0].layers[0]).toMatchObject({ reused: false });
      expect(reports[1].layers[0]).toMatchObject({
        reused: true,
        durationMs: layer.statistics?.durationMs,
        tiles: layer.statistics?.tiles,
      });
    } finally {
      layer.dispose();
      restore();
    }
  });
});
