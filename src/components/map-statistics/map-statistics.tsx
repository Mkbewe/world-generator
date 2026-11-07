import { useTranslation } from 'react-i18next';

import {
  formatAreaKm2,
  formatDuration,
  formatMeasure,
  formatMeters,
  formatNumber,
} from '../../utils/format';
import type { WorldConfig } from '../../utils/map-generator';
import { type StatisticsMetric, StatisticsPanel } from '../statistics-panel';

interface MapStatisticsPanelProps {
  world: WorldConfig;
  totalDurationMs: number;
}

export function MapStatisticsPanel({ world, totalDurationMs }: MapStatisticsPanelProps) {
  const { t } = useTranslation();
  const { widthMeters, heightMeters, sampleWidth, sampleHeight } = world.dimensions;
  const items: StatisticsMetric[] = [
    {
      label: t('statistics.map.seed'),
      value: String(world.seed),
      description: t('statistics.map.seedDescription'),
    },
    {
      label: t('statistics.map.size'),
      value: `${formatMeasure(widthMeters)} × ${formatMeasure(heightMeters)} m`,
      description: t('statistics.map.sizeDescription'),
    },
    {
      label: t('statistics.map.terrainDetail'),
      value: formatMeters(widthMeters / sampleWidth),
      description: t('statistics.map.terrainDetailDescription'),
    },
    {
      label: t('statistics.map.area'),
      value: formatAreaKm2(widthMeters * heightMeters),
      description: t('statistics.map.areaDescription'),
    },
    {
      label: t('statistics.map.shape'),
      value: world.shape,
      description: t('statistics.map.shapeDescription'),
    },
    {
      label: t('statistics.map.cells'),
      value: formatNumber(sampleWidth * sampleHeight),
      description: t('statistics.map.cellsDescription'),
    },
    {
      label: t('statistics.map.totalTime'),
      value: formatDuration(totalDurationMs),
      description: t('statistics.map.totalTimeDescription'),
    },
  ];

  return <StatisticsPanel title={t('statistics.map.title')} summary={items} />;
}
