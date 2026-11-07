import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { formatBytes, formatDuration, formatNumber } from '../../utils/format';
import type { RenderLayerStatistics, RenderStatistics } from '../../utils/map-renderer';
import {
  type StatisticsMetric,
  StatisticsPanel,
  type StatisticsSection,
} from '../statistics-panel';
import type { TimingSegment } from '../timing-bar';

/** A vector layer reports elements; a raster layer reports its pixels and raster. */
function layerMetrics(layer: RenderLayerStatistics, t: TFunction): StatisticsMetric[] {
  const shared: StatisticsMetric[] = [
    {
      label: t('statistics.render.buffer'),
      value: `${layer.outputWidth} × ${layer.outputHeight}`,
      description: t('statistics.render.bufferDescription'),
    },
    {
      label: t('statistics.render.data'),
      value: formatBytes(layer.bytes),
      description: t('statistics.render.dataDescription'),
    },
  ];

  if (layer.kind === 'vector') {
    const elements: StatisticsMetric[] = layer.elements
      ? [
          {
            label: t(layer.elements.labelKey),
            value: formatNumber(layer.elements.count),
            description: t('statistics.render.elementsDescription'),
          },
        ]
      : [];
    return [...elements, ...shared];
  }

  return [
    {
      label: t('statistics.render.drawingPerformance'),
      value:
        layer.pixels > 0 && layer.durationMs > 0
          ? `${formatNumber((layer.durationMs * 1_000_000) / layer.pixels, 2)} ms/MPix`
          : '—',
      description: t('statistics.render.drawingPerformanceDescription'),
    },
    {
      label: t('statistics.render.tiles'),
      value: formatNumber(layer.tiles),
      description: t('statistics.render.tilesDescription'),
    },
    {
      label: t('statistics.render.source'),
      value: `${layer.sourceWidth} × ${layer.sourceHeight}`,
      description: t('statistics.render.sourceDescription'),
    },
    ...shared,
  ];
}

interface RenderStatisticsPanelProps {
  statistics: RenderStatistics;
}

export function RenderStatisticsPanel({ statistics }: RenderStatisticsPanelProps) {
  const { t } = useTranslation();
  const { viewport } = statistics;

  const summary: StatisticsMetric[] = [
    {
      label: t('statistics.render.viewport'),
      value: viewport ? `${Math.round(viewport.width)} × ${Math.round(viewport.height)}` : '—',
      description: t('statistics.render.viewportDescription'),
    },
    {
      label: t('statistics.render.pixelRatio'),
      value: viewport ? String(viewport.devicePixelRatio) : '—',
      description: t('statistics.render.pixelRatioDescription'),
    },
    {
      label: t('statistics.render.overlay'),
      value: formatDuration(statistics.overlayDurationMs),
      description: t('statistics.render.overlayDescription'),
    },
    {
      label: t('statistics.render.firstTile'),
      value: formatDuration(statistics.firstTileDurationMs),
      description: t('statistics.render.firstTileDescription'),
    },
    {
      label: t('statistics.render.buffers'),
      value: formatBytes(statistics.bufferBytes),
      description: t('statistics.render.buffersDescription'),
    },
  ];

  const timing: TimingSegment[] = [
    ...statistics.layers.map(layer => ({
      key: layer.id,
      label: t(layer.nameKey),
      durationMs: layer.durationMs,
    })),
    {
      key: 'overlay',
      label: t('statistics.render.overlay'),
      durationMs: statistics.overlayDurationMs,
    },
    {
      key: 'presentation',
      label: t('statistics.render.presentation'),
      durationMs: statistics.presentationDurationMs,
    },
  ];
  const measuredTime = timing.reduce((total, segment) => total + segment.durationMs, 0);
  const unmeasuredTime = Math.max(0, statistics.elapsedDurationMs - measuredTime);

  const sections: StatisticsSection[] = statistics.layers.map(layer => ({
    key: layer.id,
    title: t(layer.nameKey),
    trailing: layer.reused
      ? `${formatDuration(layer.durationMs)} · reused`
      : formatDuration(layer.durationMs),
    metrics: layerMetrics(layer, t),
  }));

  return (
    <StatisticsPanel
      title={t('statistics.render.title')}
      summary={summary}
      timing={timing}
      timingNote={
        unmeasuredTime > 0
          ? t('statistics.additionalTime', { duration: formatDuration(unmeasuredTime) })
          : undefined
      }
      sections={sections}
    />
  );
}
