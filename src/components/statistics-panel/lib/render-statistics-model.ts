import { formatBytes, formatDuration, formatNumber } from '../../../utils/format';
import type {
  RasterRenderLayerStatistics,
  RenderLayerStatistics,
  RenderStatistics,
} from '../../../utils/map-renderer';
import type { TimingSegment } from '../../timing-bar';
import type { StatisticsMetric, StatisticsSection, StatisticsViewModel } from '../types';

/**
 * Builds the presentation view model for the render statistics panel.
 * Technical units policy: Engineering units (ms, s, B, KB, MB, ms/MPix) are SI invariant notation;
 * labels, descriptions, and statuses are referenced via i18n MessageKey.
 */
export function buildRenderStatisticsModel(
  statistics: RenderStatistics | null | undefined
): StatisticsViewModel | undefined {
  if (!statistics) {
    return undefined;
  }

  const { viewport } = statistics;

  const summary: StatisticsMetric[] = [
    {
      key: 'viewport',
      labelKey: 'statistics.render.viewport',
      value: viewport ? `${Math.round(viewport.width)} × ${Math.round(viewport.height)}` : '—',
      descriptionKey: 'statistics.render.viewportDescription',
    },
    {
      key: 'pixelRatio',
      labelKey: 'statistics.render.pixelRatio',
      value: viewport ? String(viewport.devicePixelRatio) : '—',
      descriptionKey: 'statistics.render.pixelRatioDescription',
    },
    {
      key: 'overlay',
      labelKey: 'statistics.render.overlay',
      value: formatDuration(statistics.overlayDurationMs),
      descriptionKey: 'statistics.render.overlayDescription',
    },
  ];

  if (statistics.firstTileDurationMs !== undefined) {
    summary.push({
      key: 'firstTile',
      labelKey: 'statistics.render.firstTile',
      value: formatDuration(statistics.firstTileDurationMs),
      descriptionKey: 'statistics.render.firstTileDescription',
    });
  }

  summary.push({
    key: 'buffers',
    labelKey: 'statistics.render.buffers',
    value: formatBytes(statistics.bufferBytes),
    descriptionKey: 'statistics.render.buffersDescription',
  });

  const timing: TimingSegment[] = [
    ...statistics.layers.map(layer => ({
      key: layer.id,
      nameKey: layer.nameKey,
      durationMs: layer.durationMs,
    })),
    {
      key: 'overlay',
      nameKey: 'statistics.render.overlay',
      durationMs: statistics.overlayDurationMs,
    },
    {
      key: 'presentation',
      nameKey: 'statistics.render.presentation',
      durationMs: statistics.presentationDurationMs,
    },
  ];

  const measuredTime = timing.reduce((total, segment) => total + segment.durationMs, 0);
  const unmeasuredTime = Math.max(0, statistics.elapsedDurationMs - measuredTime);

  const sections: StatisticsSection[] = statistics.layers.map(layer => ({
    key: layer.id,
    titleKey: layer.nameKey,
    durationMs: layer.durationMs,
    reused: layer.reused,
    metrics: buildLayerMetrics(layer),
  }));

  return {
    titleKey: 'statistics.render.title',
    summary,
    timing,
    unmeasuredDurationMs: unmeasuredTime > 0 ? unmeasuredTime : undefined,
    sections,
  };
}

export function formatDrawingPerformance(layer: RasterRenderLayerStatistics): string {
  if (layer.durationMs <= 0 || layer.pixels <= 0) {
    return '—';
  }
  // Engineering unit: ms per Megapixel
  return `${formatNumber((layer.durationMs * 1_000_000) / layer.pixels, 2)} ms/MPix`;
}

export function buildLayerMetrics(layer: RenderLayerStatistics): StatisticsMetric[] {
  const shared: StatisticsMetric[] = [
    {
      key: 'buffer',
      labelKey: 'statistics.render.buffer',
      value: `${layer.outputWidth} × ${layer.outputHeight}`,
      descriptionKey: 'statistics.render.bufferDescription',
    },
    {
      key: 'data',
      labelKey: 'statistics.render.data',
      value: formatBytes(layer.bytes),
      descriptionKey: 'statistics.render.dataDescription',
    },
  ];

  if (layer.kind === 'vector') {
    const elements: StatisticsMetric[] = layer.elements
      ? [
          {
            key: 'elements',
            labelKey: layer.elements.labelKey,
            value: formatNumber(layer.elements.count),
            descriptionKey: 'statistics.render.elementsDescription',
          },
        ]
      : [];
    return [...elements, ...shared];
  }

  return [
    {
      key: 'drawingPerformance',
      labelKey: 'statistics.render.drawingPerformance',
      value: formatDrawingPerformance(layer),
      descriptionKey: 'statistics.render.drawingPerformanceDescription',
    },
    {
      key: 'tiles',
      labelKey: 'statistics.render.tiles',
      value: formatNumber(layer.tiles),
      descriptionKey: 'statistics.render.tilesDescription',
    },
    {
      key: 'source',
      labelKey: 'statistics.render.source',
      value: `${layer.sourceWidth} × ${layer.sourceHeight}`,
      descriptionKey: 'statistics.render.sourceDescription',
    },
    ...shared,
  ];
}
