import { formatBytes, formatDuration, formatNumber } from '../../utils/format';
import type { RenderStatistics } from '../../utils/map-renderer';
import {
  type StatisticsMetric,
  StatisticsPanel,
  type StatisticsSection,
} from '../statistics-panel';
import type { TimingSegment } from '../timing-bar';

interface RenderStatisticsPanelProps {
  statistics: RenderStatistics;
}

export function RenderStatisticsPanel({ statistics }: RenderStatisticsPanelProps) {
  const { viewport } = statistics;

  const summary: StatisticsMetric[] = [
    {
      label: 'Viewport',
      value: viewport ? `${Math.round(viewport.width)} × ${Math.round(viewport.height)}` : '—',
      description: 'Display size of the preview area in CSS pixels.',
    },
    {
      label: 'Pixel ratio',
      value: viewport ? String(viewport.devicePixelRatio) : '—',
      description: 'Device pixel ratio used for the preview buffers, capped at 2.',
    },
    {
      label: 'Overlay',
      value: formatDuration(statistics.overlayDurationMs),
      description: 'Total time spent updating the world boundary overlay during this run.',
    },
    {
      label: 'First tile',
      value: formatDuration(statistics.firstTileDurationMs),
      description: 'Time from starting generation to drawing the first buffer tile on the preview.',
    },
    {
      label: 'Buffers',
      value: formatBytes(statistics.bufferBytes),
      description:
        'Estimated RGBA buffers held at report time: layer frames and their whole-map overviews. Render stages are temporary and released after each frame.',
    },
  ];

  const timing: TimingSegment[] = [
    ...statistics.layers.map(layer => ({
      key: layer.id,
      label: layer.name,
      durationMs: layer.durationMs,
    })),
    { key: 'overlay', label: 'Overlay', durationMs: statistics.overlayDurationMs },
    { key: 'presentation', label: 'Presentation', durationMs: statistics.presentationDurationMs },
  ];
  const measuredTime = timing.reduce((total, segment) => total + segment.durationMs, 0);
  const unmeasuredTime = Math.max(0, statistics.elapsedDurationMs - measuredTime);

  const sections: StatisticsSection[] = statistics.layers.map(layer => ({
    key: layer.id,
    title: layer.name,
    trailing: formatDuration(layer.durationMs),
    metrics: [
      {
        label: 'Drawing performance',
        value:
          layer.pixels > 0 && layer.durationMs > 0
            ? `${formatNumber((layer.durationMs * 1_000_000) / layer.pixels, 2)} ms/MPix`
            : '—',
        description:
          'Preparation and drawing time per million pixels, excluding waiting. Lower is faster.',
      },
      {
        label: 'Tiles',
        value: formatNumber(layer.tiles),
        description: 'Number of tiles drawn while rendering this layer.',
      },
      {
        label: 'Source',
        value: `${layer.sourceWidth} × ${layer.sourceHeight}`,
        description: 'Resolution of the generator raster this layer samples.',
      },
      {
        label: 'Buffer',
        value: `${layer.outputWidth} × ${layer.outputHeight}`,
        description:
          'Resolution of the buffer drawn for this layer: viewport scale when minifying, one pixel per cell when magnified.',
      },
      {
        label: 'Data',
        value: formatBytes(layer.bytes),
        description: 'Estimated size of the surfaces held for this layer at rest.',
      },
    ],
  }));

  return (
    <StatisticsPanel
      title='Rendering'
      summary={summary}
      timing={timing}
      timingNote={
        unmeasuredTime > 0
          ? `Additional time outside measured rendering: ${formatDuration(unmeasuredTime)}.`
          : undefined
      }
      sections={sections}
    />
  );
}
