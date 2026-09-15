import { formatDuration, formatNumber } from '../../utils/format';
import type { WorldConfig } from '../../utils/map-generator';
import { type StatisticsMetric, StatisticsPanel } from '../statistics-panel';

interface MapStatisticsPanelProps {
  world: WorldConfig;
  totalDurationMs: number;
}

export function MapStatisticsPanel({ world, totalDurationMs }: MapStatisticsPanelProps) {
  const { sampleWidth, sampleHeight } = world.dimensions;
  const items: StatisticsMetric[] = [
    {
      label: 'Seed',
      value: String(world.seed),
      description: 'Seed used for deterministic generation.',
    },
    {
      label: 'Size',
      value: `${sampleWidth} × ${sampleHeight}`,
      description: 'World grid size in cells.',
    },
    { label: 'Shape', value: world.shape ?? 'disc', description: 'World shape preset.' },
    {
      label: 'Cells',
      value: formatNumber(sampleWidth * sampleHeight),
      description: 'Total number of cells (width × height).',
    },
    {
      label: 'Total time',
      value: formatDuration(totalDurationMs),
      description: 'Elapsed time from starting generation to the latest rendered result.',
    },
  ];

  return <StatisticsPanel title='Map' summary={items} />;
}
