import {
  formatAreaKm2,
  formatDuration,
  formatMeasure,
  formatMeters,
  formatNumber,
} from '../../../utils/format';
import type { WorldConfig } from '../../../utils/map-generator';
import type { StatisticsMetric, StatisticsViewModel } from '../types';

/**
 * Builds the presentation view model for the map statistics panel.
 * Technical units policy: Engineering units (m, km², ms, s) are SI invariant notation;
 * labels and descriptions are referenced via i18n MessageKey.
 */
export function buildMapStatisticsModel(
  world: WorldConfig,
  totalDurationMs: number
): StatisticsViewModel {
  const { widthMeters, heightMeters, sampleWidth, sampleHeight } = world.dimensions;
  const items: StatisticsMetric[] = [
    {
      key: 'seed',
      labelKey: 'statistics.map.seed',
      value: String(world.seed),
      descriptionKey: 'statistics.map.seedDescription',
    },
    {
      key: 'size',
      labelKey: 'statistics.map.size',
      value: `${formatMeasure(widthMeters)} × ${formatMeasure(heightMeters)} m`,
      descriptionKey: 'statistics.map.sizeDescription',
    },
    {
      key: 'terrainDetail',
      labelKey: 'statistics.map.terrainDetail',
      value: formatMeters(widthMeters / sampleWidth),
      descriptionKey: 'statistics.map.terrainDetailDescription',
    },
    {
      key: 'area',
      labelKey: 'statistics.map.area',
      value: formatAreaKm2(widthMeters * heightMeters),
      descriptionKey: 'statistics.map.areaDescription',
    },
    {
      key: 'shape',
      labelKey: 'statistics.map.shape',
      value: world.shape,
      descriptionKey: 'statistics.map.shapeDescription',
    },
    {
      key: 'cells',
      labelKey: 'statistics.map.cells',
      value: formatNumber(sampleWidth * sampleHeight),
      descriptionKey: 'statistics.map.cellsDescription',
    },
    {
      key: 'totalTime',
      labelKey: 'statistics.map.totalTime',
      value: formatDuration(totalDurationMs),
      descriptionKey: 'statistics.map.totalTimeDescription',
    },
  ];

  return {
    titleKey: 'statistics.map.title',
    summary: items,
    timing: [],
    sections: [],
  };
}
