import { formatNumber } from '../../utils/format';
import type { WorldConfig } from '../../utils/map-generator';
import { StatisticsPanel, type StatisticsSummaryItem } from '../statistics-panel';

interface MapStatisticsPanelProps {
  world: WorldConfig;
}

export function MapStatisticsPanel({ world }: MapStatisticsPanelProps) {
  const items: StatisticsSummaryItem[] = [
    {
      label: 'Seed',
      value: String(world.seed),
      description: 'Seed used for deterministic generation.',
    },
    {
      label: 'Size',
      value: `${world.width} × ${world.height}`,
      description: 'World grid size in cells.',
    },
    { label: 'Shape', value: world.shape ?? 'disc', description: 'World shape preset.' },
    {
      label: 'Cells',
      value: formatNumber(world.width * world.height),
      description: 'Total number of cells (width × height).',
    },
  ];

  return <StatisticsPanel title='Map' summary={items} />;
}
