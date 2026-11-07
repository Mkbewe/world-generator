import { useTranslation } from 'react-i18next';

import { describeMetric } from './metric-descriptors';
import type { GenerationStatistics } from '../../stores';
import { formatBytes, formatDuration, formatMetric } from '../../utils/format';
import type { StageStatistics } from '../../utils/map-generator';
import { StatisticsPanel, type StatisticsSection } from '../statistics-panel';
import type { TimingSegment } from '../timing-bar';

interface GenerationStatisticsPanelProps {
  statistics: GenerationStatistics;
}

export function GenerationStatisticsPanel({ statistics }: GenerationStatisticsPanelProps) {
  const { t } = useTranslation();
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
      label: t(stage.stageNameKey),
      durationMs: stage.durationMs,
    })),
    ...(overhead > 0
      ? [
          {
            key: 'overhead',
            label: t('statistics.generation.overhead'),
            durationMs: overhead,
            muted: true,
          },
        ]
      : []),
  ];

  const sections: StatisticsSection[] = stages.map(stage => ({
    key: stage.stageId,
    title: t(stage.stageNameKey),
    trailing: stageTrailing(stage, t('common.reused')),
    metrics: Object.entries(stage.details ?? {}).map(([key, value]) => {
      const descriptor = describeMetric(key);
      const label = descriptor ? t(descriptor.labelKey) : key;
      const description = descriptor ? t(descriptor.descriptionKey) : '';
      return {
        label,
        value: formatMetric(
          value,
          descriptor
            ? {
                label,
                description,
                kind: descriptor.kind,
                precision: descriptor.precision,
              }
            : { label, description, kind: 'number', precision: 3 }
        ),
        description,
      };
    }),
  }));

  return (
    <StatisticsPanel
      title={t('statistics.generation.title')}
      summary={[
        {
          label: t('statistics.generation.totalTime'),
          value: formatDuration(total),
          description: t('statistics.generation.totalTimeDescription'),
        },
        {
          label: t('statistics.generation.totalData'),
          value: formatBytes(totalBytes),
          description: t('statistics.generation.totalDataDescription'),
        },
      ]}
      timing={timing}
      sections={sections}
    />
  );
}

/** Real duration of a stage, marked when the last run reused its data. */
function stageTrailing(stage: StageStatistics, reused: string): string {
  if (stage.status !== 'skipped') {
    return formatDuration(stage.durationMs);
  }
  return stage.durationMs > 0 ? `${formatDuration(stage.durationMs)} · ${reused}` : reused;
}
