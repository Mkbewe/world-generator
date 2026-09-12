import { describeMetric } from './metric-descriptors';
import type { GenerationStatistics } from '../../stores';
import { formatBytes, formatDuration, formatMetric } from '../../utils/format';
import type { StageStatistics } from '../../utils/map-generator';
import { StatisticsPanel, type StatisticsSection } from '../statistics-panel';
import type { TimingSegment } from '../timing-bar';

interface GenerationStatisticsPanelProps {
  statistics: GenerationStatistics;
}

function sumDataBytes(stages: readonly StageStatistics[]): number {
  return stages.reduce((total, stage) => {
    const stageBytes = Object.entries(stage.details ?? {}).reduce((sum, [key, value]) => {
      return typeof value === 'number' && describeMetric(key).kind === 'bytes' ? sum + value : sum;
    }, 0);
    return total + stageBytes;
  }, 0);
}

export function GenerationStatisticsPanel({ statistics }: GenerationStatisticsPanelProps) {
  const stages = statistics.statistics;
  const totalDurationMs = statistics.totalDurationMs;
  const totalBytes = sumDataBytes(stages);

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
