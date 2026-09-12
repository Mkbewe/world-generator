import { formatBytes, formatDuration, formatNumber } from '../../utils/format';
import type { RenderStatistics } from '../../utils/map-renderer';
import {
  StatisticsPanel,
  type StatisticsSection,
  type StatisticsSummaryItem,
} from '../statistics-panel';
import type { TimingSegment } from '../timing-bar';

interface RenderStatisticsPanelProps {
  statistics: RenderStatistics;
}

export function RenderStatisticsPanel({ statistics }: RenderStatisticsPanelProps) {
  const { viewport } = statistics;

  const summary: StatisticsSummaryItem[] = [
    {
      label: 'Viewport',
      value: viewport ? `${Math.round(viewport.width)} × ${Math.round(viewport.height)}` : '—',
      description: 'Display size of the preview area in CSS pixels.',
    },
    {
      label: 'Pixel ratio',
      value: viewport ? String(viewport.devicePixelRatio) : '—',
      description: 'Device pixel ratio used for the overlay resolution.',
    },
    {
      label: 'Overlay',
      value: formatDuration(statistics.overlayDurationMs),
      description: 'Time spent drawing the world boundary overlay.',
    },
    {
      label: 'Total time',
      value: formatDuration(statistics.totalDurationMs),
      description: 'Wall-clock time from start to the last displayed layer.',
    },
  ];

  const timing: TimingSegment[] = [
    ...statistics.layers.map(layer => ({
      key: layer.id,
      label: layer.name,
      durationMs: layer.durationMs,
    })),
    { key: 'overlay', label: 'Overlay', durationMs: statistics.overlayDurationMs },
  ];

  const sections: StatisticsSection[] = statistics.layers.map(layer => ({
    key: layer.id,
    title: layer.name,
    trailing: formatDuration(layer.durationMs),
    metrics: [
      {
        label: 'Tiles',
        value: formatNumber(layer.tiles),
        description: 'Number of tiles drawn while rendering this layer.',
      },
      {
        label: 'Data',
        value: formatBytes(layer.bytes),
        description: 'Size of the rendered canvas buffer.',
      },
    ],
  }));

  return (
    <StatisticsPanel title='Rendering' summary={summary} timing={timing} sections={sections} />
  );
}
