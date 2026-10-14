import { RenderMetrics } from './render-metrics';
import type { GeologyPlan } from '../../map-generator/types';
import { CatalogLayer, GeologyPlanVectorLayer, LayerRegistry, layerRegistry } from '../layer';
import type { RenderTarget } from '../preview-targets';
import type { RenderStatistics } from '../types';

const PLAN: GeologyPlan = {
  regions: [
    {
      id: 'region-1',
      centre: { x: 0.25, y: 0.5 },
      weight: 1,
      type: 'ordinary',
      areaSquareMeters: 100,
    },
    {
      id: 'region-2',
      centre: { x: 0.75, y: 0.5 },
      weight: 1,
      type: 'volcanic',
      areaSquareMeters: 100,
    },
  ],
  regionRasterSize: { width: 4, height: 4 },
  regionOwnerMap: new Int16Array(16).fill(0),
  regionBorderDistanceMap: new Float32Array(16).fill(100),
  worldAreaSquareMeters: 400,
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
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
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
      layerRegistry.get('geology'),
    ]);
    const layer = new GeologyPlanVectorLayer('geology', { width: 4, height: 4 }, PLAN);
    const reports: RenderStatistics[] = [];

    try {
      const rendered = new RenderMetrics(registry, report => reports.push(report));
      rendered.start();
      await rendered.prepare(layer, new AbortController().signal, targetFor(4, 4));
      rendered.report([layer], 0, undefined);

      expect(reports[0].layers[0]).toMatchObject({
        kind: 'vector',
        elements: { label: 'Regions', count: 2 },
      });
      expect(reports[0].layers[0]).not.toHaveProperty('pixels');
      expect(reports[0].layers[0]).not.toHaveProperty('sourceWidth');
    } finally {
      layer.dispose();
      restore();
    }
  });
});
