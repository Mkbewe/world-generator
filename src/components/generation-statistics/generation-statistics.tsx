import { describeMetric } from './metric-descriptors';
import type { GenerationStatistics } from '../../stores';
import { formatBytes, formatDuration, formatMetric } from '../../utils/format';
import { StatisticsPanel, type StatisticsSection } from '../statistics-panel';
import type { TimingSegment } from '../timing-bar';

interface GenerationStatisticsPanelProps {
  statistics: GenerationStatistics;
}

export function GenerationStatisticsPanel({ statistics }: GenerationStatisticsPanelProps) {
  const stages = statistics.statistics;
  const totalDurationMs = statistics.totalDurationMs;
  const totalBytes = stages.reduce((total, stage) => total + (stage.details?.bytes ?? 0), 0);

  const stageTotal = stages.reduce((sum, stage) => sum + stage.durationMs, 0);
  const overhead = Math.max(0, totalDurationMs - stageTotal);
  const timing: TimingSegment[] = [
    ...stages.map(stage => ({
      key: stage.stageId,
      label: stage.stageName,
      durationMs: stage.durationMs,
    })),
    ...(overhead > 0
      ? [{ key: 'overhead', label: 'Overhead', durationMs: overhead, muted: true }]
      : []),
  ];

  const sections: StatisticsSection[] = stages.map(stage => ({
    key: stage.stageId,
    title: stage.stageName,
    trailing: formatDuration(stage.durationMs),
    metrics: Object.entries(stage.details ?? {}).map(([key, value]) => {
      const descriptor = describeMetric(key);
      return {
        label: descriptor.label,
        value: formatMetric(value, descriptor),
        description: descriptor.description,
      };
    }),
  }));

  return (
    <StatisticsPanel
      title='Generation'
      summary={[
        {
          label: 'Total time',
          value: formatDuration(totalDurationMs),
          description: 'Wall-clock time of the whole generation run.',
        },
        {
          label: 'Total data',
          value: formatBytes(totalBytes),
          description: 'Total size of the data produced by all stages.',
        },
      ]}
      timing={timing}
      sections={sections}
    />
  );
}
