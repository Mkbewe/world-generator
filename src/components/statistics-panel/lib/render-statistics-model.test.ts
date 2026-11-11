import {
  buildLayerMetrics,
  buildRenderStatisticsModel,
  formatDrawingPerformance,
} from './render-statistics-model';
import type {
  RasterRenderLayerStatistics,
  RenderLayerStatistics,
  RenderStatistics,
} from '../../../utils/map-renderer';
import type { StatisticsViewModel } from '../types';

const BASE_RENDER_STATS: RenderStatistics = {
  elapsedDurationMs: 1200,
  firstTileDurationMs: 250,
  viewport: { width: 640, height: 480, devicePixelRatio: 2 },
  overlayDurationMs: 12.5,
  presentationDurationMs: 7.5,
  bufferBytes: 12_000_000,
  layers: [
    {
      kind: 'raster',
      id: 'world-shape',
      nameKey: 'layers.worldShape',
      durationMs: 100,
      pixels: 2_000_000,
      tiles: 8,
      sourceWidth: 100,
      sourceHeight: 100,
      outputWidth: 320,
      outputHeight: 240,
      bytes: 4_000_000,
    },
  ],
};

function buildModel(statistics: RenderStatistics): StatisticsViewModel {
  const model = buildRenderStatisticsModel(statistics);
  if (!model) {
    throw new Error('Expected render statistics to build a model');
  }
  return model;
}

describe('render-statistics-model', () => {
  it('returns no model when render statistics are unavailable', () => {
    expect(buildRenderStatisticsModel(undefined)).toBeUndefined();
  });

  describe('formatDrawingPerformance', () => {
    it('formats ms/MPix engineering unit', () => {
      const layer = {
        ...BASE_RENDER_STATS.layers[0],
        durationMs: 50,
        pixels: 2_000_000,
      } as RasterRenderLayerStatistics;

      expect(formatDrawingPerformance(layer)).toBe('25.00 ms/MPix');
    });
  });

  describe('buildLayerMetrics', () => {
    it('builds metrics for raster layers with drawing performance in ms/MPix', () => {
      const layer = BASE_RENDER_STATS.layers[0];
      const metrics = buildLayerMetrics(layer);

      expect(metrics).toEqual([
        {
          key: 'drawingPerformance',
          labelKey: 'statistics.render.drawingPerformance',
          value: '50.00 ms/MPix',
          descriptionKey: 'statistics.render.drawingPerformanceDescription',
        },
        {
          key: 'tiles',
          labelKey: 'statistics.render.tiles',
          value: '8',
          descriptionKey: 'statistics.render.tilesDescription',
        },
        {
          key: 'source',
          labelKey: 'statistics.render.source',
          value: '100 × 100',
          descriptionKey: 'statistics.render.sourceDescription',
        },
        {
          key: 'buffer',
          labelKey: 'statistics.render.buffer',
          value: '320 × 240',
          descriptionKey: 'statistics.render.bufferDescription',
        },
        {
          key: 'data',
          labelKey: 'statistics.render.data',
          value: '4 MB',
          descriptionKey: 'statistics.render.dataDescription',
        },
      ]);
    });

    it('returns a dash for drawing performance when duration or pixels are zero', () => {
      const baseRasterLayer = BASE_RENDER_STATS.layers[0];
      if (!baseRasterLayer || baseRasterLayer.kind !== 'raster') {
        throw new Error('Expected raster layer');
      }
      const layer: RasterRenderLayerStatistics = {
        ...baseRasterLayer,
        durationMs: 0,
        pixels: 0,
      };
      const metrics = buildLayerMetrics(layer);

      expect(metrics[0]?.value).toBe('—');
    });

    it('builds metrics for vector layers reporting element counts', () => {
      const vectorLayer: RenderLayerStatistics = {
        kind: 'vector',
        id: 'geology',
        nameKey: 'layers.geology',
        durationMs: 5,
        elements: { labelKey: 'statistics.render.elements', count: 120 },
        outputWidth: 320,
        outputHeight: 240,
        bytes: 1_000_000,
      };

      const metrics = buildLayerMetrics(vectorLayer);

      expect(metrics).toEqual([
        {
          key: 'elements',
          labelKey: 'statistics.render.elements',
          value: '120',
          descriptionKey: 'statistics.render.elementsDescription',
        },
        {
          key: 'buffer',
          labelKey: 'statistics.render.buffer',
          value: '320 × 240',
          descriptionKey: 'statistics.render.bufferDescription',
        },
        {
          key: 'data',
          labelKey: 'statistics.render.data',
          value: '1 MB',
          descriptionKey: 'statistics.render.dataDescription',
        },
      ]);
    });
  });

  describe('buildRenderStatisticsModel', () => {
    it('constructs summary, timing, and unmeasured duration', () => {
      const model = buildModel(BASE_RENDER_STATS);

      expect(model.titleKey).toBe('statistics.render.title');
      expect(model.summary).toHaveLength(5);
      expect(model.summary?.[0]?.value).toBe('640 × 480');
      expect(model.summary?.[1]?.value).toBe('2');
      expect(model.summary?.[2]?.value).toBe('12.5 ms');
      expect(model.summary?.[3]?.value).toBe('250.0 ms');
      expect(model.summary?.[4]?.value).toBe('12 MB');

      expect(model.timing).toEqual([
        {
          key: 'world-shape',
          nameKey: 'layers.worldShape',
          durationMs: 100,
        },
        {
          key: 'overlay',
          nameKey: 'statistics.render.overlay',
          durationMs: 12.5,
        },
        {
          key: 'presentation',
          nameKey: 'statistics.render.presentation',
          durationMs: 7.5,
        },
      ]);

      expect(model.unmeasuredDurationMs).toBe(1080);
      expect(model.sections).toHaveLength(1);
      expect(model.sections?.[0]?.titleKey).toBe('layers.worldShape');
      expect(model.sections?.[0]?.durationMs).toBe(100);
      expect(model.sections?.[0]?.reused).toBeUndefined();
    });

    it('handles undefined viewport and missing first tile measurement', () => {
      const stats: RenderStatistics = {
        ...BASE_RENDER_STATS,
        viewport: undefined,
        firstTileDurationMs: undefined,
        elapsedDurationMs: 120, // 120 ms vs measured 120 ms
      };

      const model = buildModel(stats);

      expect(model.summary?.[0]?.value).toBe('—');
      expect(model.summary?.[1]?.value).toBe('—');
      expect(model.summary?.[2]?.value).toBe('12.5 ms');
      expect(model.summary?.[3]?.value).toBe('12 MB');
      expect(model.summary).toHaveLength(4);
      expect(model.unmeasuredDurationMs).toBeUndefined();
    });

    it('marks reused layer with reused flag', () => {
      const stats: RenderStatistics = {
        ...BASE_RENDER_STATS,
        layers: [{ ...BASE_RENDER_STATS.layers[0], reused: true } as RenderLayerStatistics],
      };

      const model = buildModel(stats);

      expect(model.sections?.[0]?.reused).toBe(true);
      expect(model.sections?.[0]?.durationMs).toBe(100);
    });
  });
});
