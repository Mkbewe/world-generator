import { describeMetric } from './metric-descriptors';
import type { MessageKey } from '../../../i18n';
import type { GenerationStatistics } from '../../../stores';
import { formatBytes, formatDuration, formatMetric } from '../../../utils/format';
import type { TimingSegment } from '../../timing-bar';
import type { StatisticsSection, StatisticsViewModel } from '../types';

/**
 * Builds the presentation view model for the generation statistics panel.
 * Technical units policy: Engineering units (ms, s, B, KB, MB) are SI invariant notation;
 * labels, descriptions, and statuses are referenced via i18n MessageKey.
 */
export function buildGenerationStatisticsModel(
  statistics: GenerationStatistics
): StatisticsViewModel {
  const stages = statistics.statistics;
  const totalDurationMs = statistics.totalDurationMs;
  const totalBytes = stages.reduce((total, stage) => total + (stage.details?.bytes ?? 0), 0);

  // Reused stages report the cost of the run that produced their data, so the
  // displayed cost is the real generation cost of the map.
  const stageTotal = stages.reduce((sum, stage) => sum + stage.durationMs, 0);
  const total = Math.max(stageTotal, totalDurationMs);
  const overhead = total - stageTotal;
  const timing: TimingSegment[] = [
    ...stages.map(stage => ({
      key: stage.stageId,
      nameKey: stage.stageNameKey,
      durationMs: stage.durationMs,
    })),
    ...(overhead > 0
      ? [
          {
            key: 'overhead',
            nameKey: 'statistics.generation.overhead' as MessageKey,
            durationMs: overhead,
            muted: true,
          },
        ]
      : []),
  ];

  const sections: StatisticsSection[] = stages.map(stage => ({
    key: stage.stageId,
    titleKey: stage.stageNameKey,
    durationMs: stage.durationMs,
    reused: stage.status === 'skipped',
    metrics: Object.entries(stage.details ?? {}).map(([key, value]) => {
      const descriptor = describeMetric(key);
      if (!descriptor) {
        throw new Error(`Missing metric descriptor for generation statistic "${key}".`);
      }

      const formattedValue = formatMetric(value, {
        label: '',
        description: '',
        kind: descriptor.kind,
        precision: descriptor.precision,
      });

      return {
        key,
        labelKey: descriptor.labelKey,
        descriptionKey: descriptor.descriptionKey,
        value: formattedValue,
      };
    }),
  }));

  return {
    titleKey: 'statistics.generation.title',
    summary: [
      {
        key: 'totalTime',
        labelKey: 'statistics.generation.totalTime',
        value: formatDuration(total),
        descriptionKey: 'statistics.generation.totalTimeDescription',
      },
      {
        key: 'totalData',
        labelKey: 'statistics.generation.totalData',
        value: formatBytes(totalBytes),
        descriptionKey: 'statistics.generation.totalDataDescription',
      },
    ],
    timing,
    sections,
  };
}
