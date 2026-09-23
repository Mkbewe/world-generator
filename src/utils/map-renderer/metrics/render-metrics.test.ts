import { RenderMetrics } from './render-metrics';
import type { LandmassLayout } from '../../map-generator/types';
import { CatalogLayer, LandmassLayoutVectorLayer, LayerRegistry, layerRegistry } from '../layer';
import type { RenderTarget } from '../preview-targets';
import type { RenderStatistics } from '../types';

const LAYOUT: LandmassLayout = {
  structures: [
    {
      id: 'landmass-1',
      archetype: 'elongated',
      nodes: [
        { id: 'landmass-1-n1', position: { x: 0.4, y: 0.5 }, radius: 0.05 },
        { id: 'landmass-1-n2', position: { x: 0.6, y: 0.5 }, radius: 0.05 },
      ],
      edges: [{ id: 'landmass-1-e1', from: 'landmass-1-n1', to: 'landmass-1-n2' }],
      shelfId: 'shelf-1',
    },
  ],
  shelves: [{ id: 'shelf-1', width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 }],
};

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
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  return () => spy.mockRestore();
}

describe('RenderMetrics', () => {
  it('keeps the real cost of a layer replayed from the cache', async () => {
    const restore = mockCanvasContext();
    const registry = new LayerRegistry([layerRegistry.raster('world-shape')]);
    const layer = new CatalogLayer(
      registry.raster('world-shape'),
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

      expect(reports[0].layers[0]).toMatchObject({ kind: 'raster', reused: false });
      expect(reports[1].layers[0]).toMatchObject({
        kind: 'raster',
        reused: true,
        durationMs: layer.statistics?.durationMs,
        tiles: layer.statistics?.tiles,
      });
    } finally {
      layer.dispose();
      restore();
    }
  });

  it('reports vector layers by their elements, not raster pixels', async () => {
    const restore = mockCanvasContext();
    const registry = new LayerRegistry([
      layerRegistry.get('world-shape'),
      layerRegistry.get('landmass-layout'),
    ]);
    const layer = new LandmassLayoutVectorLayer('landmass-layout', { width: 4, height: 4 }, LAYOUT);
    const reports: RenderStatistics[] = [];

    try {
      const rendered = new RenderMetrics(registry, report => reports.push(report));
      rendered.start();
      await rendered.prepare(layer, new AbortController().signal, targetFor(4, 4));
      rendered.report([layer], 0, undefined);

      expect(reports[0].layers[0]).toMatchObject({ kind: 'vector', nodes: 2, edges: 1 });
      expect(reports[0].layers[0]).not.toHaveProperty('pixels');
      expect(reports[0].layers[0]).not.toHaveProperty('sourceWidth');
    } finally {
      layer.dispose();
      restore();
    }
  });
});
